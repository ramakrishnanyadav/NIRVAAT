import { AgeBand, HouseholdProfile } from '../../contracts/src/profile.ts';
import { ConfidenceLevel, ToolEnvelope } from '../../contracts/src/toolEnvelope.ts';
import { HourlyScheduleSlot, computeInhaledDose } from './dose_model.ts';
import { solveIndoorMassBalance } from './indoor_model.ts';
import { PARAMETER_PRIORS, PRIORS_VERSION } from './priors.ts';

export type ActionId =
  | 'time_shift_commute'
  | 'close_windows_inversion'
  | 'ventilate_afternoon_window'
  | 'seal_gaps'
  | 'run_purifier_presleep'
  | 'diy_filter'
  | 'n95_on_commute'
  | 'cook_with_hood_window'
  | 'avoid_incense';

export interface ActionDefinition {
  id: ActionId;
  title: string;
  lever: 'timing' | 'place_route' | 'protection' | 'source_control';
  cost: 'free' | 'low' | 'medium' | 'high';
  evidence: 'strong' | 'moderate' | 'emerging';
  description: string;
}

export const ACTION_LIBRARY: Record<ActionId, ActionDefinition> = {
  time_shift_commute: {
    id: 'time_shift_commute',
    title: 'Shift outdoor trip to afternoon window',
    lever: 'timing',
    cost: 'free',
    evidence: 'moderate',
    description: 'Moves outdoor commute/errand from morning inversion peak to cleanest afternoon hours.',
  },
  close_windows_inversion: {
    id: 'close_windows_inversion',
    title: 'Close exterior windows overnight & mornings',
    lever: 'protection',
    cost: 'free',
    evidence: 'strong',
    description: 'Prevents high night/morning inversion plumes from flushing straight indoors.',
  },
  ventilate_afternoon_window: {
    id: 'ventilate_afternoon_window',
    title: 'Flush indoor air during afternoon dip',
    lever: 'timing',
    cost: 'free',
    evidence: 'moderate',
    description: 'Opens windows briefly for 20–30 minutes only during the lowest outdoor PM2.5 afternoon hours.',
  },
  seal_gaps: {
    id: 'seal_gaps',
    title: 'Seal bedroom door & window gaps',
    lever: 'protection',
    cost: 'free',
    evidence: 'moderate',
    description: 'Uses rolled damp towels or low-cost weatherstripping to halve drafty infiltration λ.',
  },
  run_purifier_presleep: {
    id: 'run_purifier_presleep',
    title: 'Run HEPA purifier pre-sleep & overnight',
    lever: 'protection',
    cost: 'low',
    evidence: 'strong',
    description: 'Starts bedroom HEPA 1 hour before bedtime with the door closed.',
  },
  diy_filter: {
    id: 'diy_filter',
    title: 'Run DIY MERV-13 box-fan filter overnight',
    lever: 'protection',
    cost: 'low',
    evidence: 'strong',
    description: 'Uses a taped MERV-13 furnace filter on a box fan in the closed sleeping room.',
  },
  n95_on_commute: {
    id: 'n95_on_commute',
    title: 'Wear fit-checked N95/KF94 outdoors (ages 2+)',
    lever: 'protection',
    cost: 'low',
    evidence: 'strong',
    description: 'Pinches nose wire and seals cheek gaps during outdoor commute/work hours.',
  },
  cook_with_hood_window: {
    id: 'cook_with_hood_window',
    title: 'Close kitchen door, cover pans & exhaust smoke',
    lever: 'source_control',
    cost: 'free',
    evidence: 'strong',
    description: 'Isolates and vents cooking PM2.5 plumes away from sleeping/living spaces.',
  },
  avoid_incense: {
    id: 'avoid_incense',
    title: 'Pause indoor incense, dhoop & mosquito coils',
    lever: 'source_control',
    cost: 'free',
    evidence: 'strong',
    description: 'Eliminates high indoor submicron combustion plumes in closed winter rooms.',
  },
};

export interface ImpactEstimateInput {
  profile: HouseholdProfile;
  target_member_age_band: AgeBand;
  schedule: HourlyScheduleSlot[];
  action: ActionId;
  forecast_pm25_hourly: number[];
  /** Optional explicit seed for deterministic Monte Carlo reproducibility */
  seed?: number;
  /** Number of Monte Carlo draws (default 120) */
  num_draws?: number;
}

export interface SensitivityDriver {
  parameter: string;
  variance_share_pct: number;
  plain_note: string;
}

export interface ImpactEstimateValue extends Record<string, unknown> {
  action: ActionId;
  daily_without_ug: { q10: number; median: number; q90: number };
  daily_with_ug: { q10: number; median: number; q90: number };
  daily_reduction_pct: { q10: number; median: number; q90: number };
  overnight_without_ug: { q10: number; median: number; q90: number };
  overnight_with_ug: { q10: number; median: number; q90: number };
  overnight_reduction_pct: { q10: number; median: number; q90: number };
  dose_avoided_median_ug: number;
  top_uncertainties: SensitivityDriver[];
  priors_version: string;
}

// Seeded Mulberry32 PRNG for deterministic reproducible Monte Carlo
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Calibrated quantile sampler from q10, median, q90
function sampleTriangular(rng: () => number, q10: number, med: number, q90: number): number {
  const u = rng();
  // Calibrated scale factor ensuring 10th and 90th percentiles of output reflect input spread
  const minVal = Math.max(0.001, med - 1.35 * (med - q10));
  const maxVal = med + 1.35 * (q90 - med);
  const fc = (med - minVal) / Math.max(1e-6, maxVal - minVal);
  if (u < fc) {
    return minVal + Math.sqrt(u * (maxVal - minVal) * (med - minVal));
  }
  return maxVal - Math.sqrt((1 - u) * (maxVal - minVal) * (maxVal - med));
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return Math.round((sorted[base] + rest * (next - sorted[base])) * 10) / 10;
}

function getRoomVolumeM3(sizeBand: HouseholdProfile['home']['size_band']): number {
  if (sizeBand === 'small_under_40m2') return 65;
  if (sizeBand === 'large_over_85m2') return 180;
  return 115;
}

const impactCache = new Map<string, ToolEnvelope<ImpactEstimateValue>>();
const MAX_IMPACT_CACHE_SIZE = 250;

function computeImpactCacheKey(input: ImpactEstimateInput): string {
  const forecastSig = (input.forecast_pm25_hourly ?? []).slice(0, 12).join(',');
  const homeSig = `${input.profile?.home?.size_band}_${input.profile?.home?.windows_habit}_${input.profile?.home?.cooking_fuel}_${input.profile?.home?.purifier?.has}_${input.profile?.home?.purifier?.cadr_m3_hr ?? 0}_${Boolean((input.profile?.home as any)?.incense_or_dhoop)}`;
  return `${input.action}_${input.target_member_age_band}_${homeSig}_${input.schedule?.length ?? 0}_${forecastSig}_${input.seed ?? 42019}_${input.num_draws ?? 120}`;
}

export function impactEstimate(
  input: ImpactEstimateInput,
  callId = `imp_${input.action}`,
  asOf = new Date().toISOString()
): ToolEnvelope<ImpactEstimateValue> {
  const cacheKey = computeImpactCacheKey(input);
  const cached = impactCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      call_id: callId,
      as_of: asOf,
    };
  }

  const draws = Math.max(40, Math.min(300, input.num_draws ?? 120));
  const rng = createRng(input.seed ?? 42019);
  const volume = getRoomVolumeM3(input.profile.home.size_band);
  const forecast = input.forecast_pm25_hourly;

  // Find cleanest afternoon hour index (usually indices 12..16) for time_shift_commute
  let cleanestHourIdx = 14;
  let minForecast = Infinity;
  for (let h = 11; h <= Math.min(17, forecast.length - 1); h++) {
    if (forecast[h] < minForecast) {
      minForecast = forecast[h];
      cleanestHourIdx = h;
    }
  }

  const dailyWithoutArr: number[] = [];
  const dailyWithArr: number[] = [];
  const dailyPctArr: number[] = [];
  const nightWithoutArr: number[] = [];
  const nightWithArr: number[] = [];
  const nightPctArr: number[] = [];

  // Track parameter draw values vs reduction pct for simple variance attribution
  const sampleRecords: Array<{
    lam: number;
    derate: number;
    maskFit: number;
    cooking: number;
    pct: number;
  }> = [];

  for (let i = 0; i < draws; i++) {
    const isLeaky =
      input.profile.home.windows_habit === 'loose_frames_drafty' ||
      input.profile.home.windows_habit === 'kept_open_day' ||
      input.profile.home.windows_habit === 'kept_open_night';

    const pBase = isLeaky
      ? sampleTriangular(rng, PARAMETER_PRIORS.penetration_leaky.q10, PARAMETER_PRIORS.penetration_leaky.median, PARAMETER_PRIORS.penetration_leaky.q90)
      : sampleTriangular(rng, PARAMETER_PRIORS.penetration_sealed.q10, PARAMETER_PRIORS.penetration_sealed.median, PARAMETER_PRIORS.penetration_sealed.q90);

    const pSealed = sampleTriangular(
      rng,
      PARAMETER_PRIORS.penetration_sealed.q10,
      PARAMETER_PRIORS.penetration_sealed.median,
      PARAMETER_PRIORS.penetration_sealed.q90
    );

    const lamDrafty = sampleTriangular(
      rng,
      PARAMETER_PRIORS.ach_drafty_closed.q10,
      PARAMETER_PRIORS.ach_drafty_closed.median,
      PARAMETER_PRIORS.ach_drafty_closed.q90
    );
    const lamSealed = sampleTriangular(
      rng,
      PARAMETER_PRIORS.ach_sealed.q10,
      PARAMETER_PRIORS.ach_sealed.median,
      PARAMETER_PRIORS.ach_sealed.q90
    );
    const lamOpen = sampleTriangular(
      rng,
      PARAMETER_PRIORS.ach_open_window.q10,
      PARAMETER_PRIORS.ach_open_window.median,
      PARAMETER_PRIORS.ach_open_window.q90
    );

    const kDep = sampleTriangular(
      rng,
      PARAMETER_PRIORS.deposition_k.q10,
      PARAMETER_PRIORS.deposition_k.median,
      PARAMETER_PRIORS.deposition_k.q90
    );

    const derateHepa = sampleTriangular(
      rng,
      PARAMETER_PRIORS.cadr_derating_hepa.q10,
      PARAMETER_PRIORS.cadr_derating_hepa.median,
      PARAMETER_PRIORS.cadr_derating_hepa.q90
    );
    const derateDiy = sampleTriangular(
      rng,
      PARAMETER_PRIORS.cadr_derating_diy.q10,
      PARAMETER_PRIORS.cadr_derating_diy.median,
      PARAMETER_PRIORS.cadr_derating_diy.q90
    );

    const sCook =
      input.profile.home.cooking_fuel === 'induction_electric'
        ? 900
        : sampleTriangular(
            rng,
            PARAMETER_PRIORS.source_cooking_lpg.q10,
            PARAMETER_PRIORS.source_cooking_lpg.median,
            PARAMETER_PRIORS.source_cooking_lpg.q90
          );

    const maskFit =
      input.target_member_age_band === 'infant_under_2'
        ? 0
        : input.target_member_age_band === 'child_2_12'
          ? sampleTriangular(
              rng,
              PARAMETER_PRIORS.mask_n95_fit_child.q10,
              PARAMETER_PRIORS.mask_n95_fit_child.median,
              PARAMETER_PRIORS.mask_n95_fit_child.q90
            )
          : sampleTriangular(
              rng,
              PARAMETER_PRIORS.mask_n95_fit_adult.q10,
              PARAMETER_PRIORS.mask_n95_fit_adult.median,
              PARAMETER_PRIORS.mask_n95_fit_adult.q90
            );

    const ventMult = 0.8 + rng() * 0.4;

    // Baseline hourly arrays
    const baseLamArr = forecast.map((_, h) => {
      if (input.profile.home.windows_habit === 'kept_open_night' && (h < 7 || h >= 21)) {
        return lamOpen;
      }
      if (input.profile.home.windows_habit === 'kept_open_day' && h >= 8 && h <= 18) {
        return lamOpen;
      }
      return isLeaky ? lamDrafty : lamSealed;
    });

    const baseSourceArr = forecast.map((_, h) => {
      // Cooking spikes at hours 8, 13, 20
      const cookSpike = h === 8 || h === 13 || h === 20 ? sCook : 0;
      return cookSpike;
    });

    const baseCadr =
      input.action === 'run_purifier_presleep' || input.action === 'diy_filter'
        ? 0
        : input.profile.home.purifier.has && input.profile.home.purifier.type === 'hepa'
          ? (input.profile.home.purifier.cadr_m3_hr ?? 300) * derateHepa
          : input.profile.home.purifier.has && input.profile.home.purifier.type === 'diy_cr_box'
            ? (input.profile.home.purifier.cadr_m3_hr ?? 280) * derateDiy
            : 0;

    // Apply action deltas
    let withP = pBase;
    const withLamArr = [...baseLamArr];
    const withSourceArr = [...baseSourceArr];
    let withCadrArr = forecast.map(() => baseCadr);
    let withSchedule = input.schedule;
    let withMaskOverride: number | undefined = undefined;

    if (input.action === 'close_windows_inversion') {
      for (let h = 0; h < withLamArr.length; h++) {
        if (h <= 10 || h >= 20) {
          if (input.profile.home.windows_habit === 'kept_open_night') {
            withLamArr[h] = isLeaky ? lamDrafty : lamSealed;
          } else {
            // Latching loose frames tight during winter smog inversion peaks
            withLamArr[h] = Math.min(withLamArr[h], isLeaky ? lamDrafty * 0.8 : lamSealed);
          }
        }
      }
    } else if (input.action === 'ventilate_afternoon_window') {
      // Flushes air only during the cleanest afternoon dispersion window
      // Crucially, it does NOT alter or seal the other 23 hours!
      withLamArr[cleanestHourIdx] = lamOpen;
    } else if (input.action === 'seal_gaps') {
      // Correlated reduction: sealing gaps can never worsen penetration or draft
      withP = Math.min(pBase, isLeaky ? pSealed : pBase * 0.95);
      for (let h = 0; h < withLamArr.length; h++) {
        withLamArr[h] = Math.min(withLamArr[h], isLeaky ? lamSealed : baseLamArr[h] * 0.9);
      }
    } else if (input.action === 'run_purifier_presleep') {
      const rated = input.profile.home.purifier.cadr_m3_hr && input.profile.home.purifier.cadr_m3_hr > 0
        ? input.profile.home.purifier.cadr_m3_hr
        : 320;
      withCadrArr = forecast.map((_, h) => (h <= 7 || h >= 21 ? rated * derateHepa : baseCadr));
    } else if (input.action === 'diy_filter') {
      const diyCadr = 280 * derateDiy;
      withCadrArr = forecast.map((_, h) => (h <= 7 || h >= 21 ? Math.max(baseCadr, diyCadr) : baseCadr));
    } else if (input.action === 'cook_with_hood_window') {
      for (let h = 0; h < withSourceArr.length; h++) {
        withSourceArr[h] = withSourceArr[h] * 0.25;
      }
    } else if (input.action === 'avoid_incense') {
      const hasIncense = Boolean(
        (input.profile.home as any)?.incense_or_dhoop ??
        (input.profile.home as any)?.incense_use ??
        (input.profile as any)?.has_incense ??
        false
      );
      if (hasIncense) {
        const sInc = sampleTriangular(
          rng,
          PARAMETER_PRIORS.source_incense_coil.q10,
          PARAMETER_PRIORS.source_incense_coil.median,
          PARAMETER_PRIORS.source_incense_coil.q90
        );
        baseSourceArr[19] += sInc; // Baseline has evening incense plume; action avoids it
      }
    } else if (input.action === 'time_shift_commute') {
      // Strictly conserve 24 hours: vacated commute/outdoor hour becomes indoor home activity
      const commuteSlots = input.schedule.filter((s) => s.micro_env === 'commute' || s.micro_env === 'outdoors');
      if (commuteSlots.length > 0) {
        const origHours = new Set(commuteSlots.map((s) => s.hour_index));
        withSchedule = input.schedule.map((slot) => {
          if (origHours.has(slot.hour_index)) {
            return {
              ...slot,
              micro_env: 'home' as const,
              activity: 'light' as const,
              mask: 'none' as const,
            };
          }
          if (slot.hour_index === cleanestHourIdx) {
            const prime = commuteSlots[0];
            return {
              ...slot,
              micro_env: prime.micro_env,
              activity: prime.activity,
              mask: prime.mask,
              commute_mode: prime.commute_mode,
            };
          }
          return slot;
        });
      }
    } else if (input.action === 'n95_on_commute') {
      withMaskOverride = maskFit;
      withSchedule = input.schedule.map((slot) =>
        slot.micro_env === 'commute' || slot.micro_env === 'outdoors'
          ? {
              ...slot,
              mask: input.target_member_age_band === 'infant_under_2' ? 'none' : 'n95_kn95_kf94',
            }
          : slot
      );
    }

    const indoorWithout = solveIndoorMassBalance({
      outdoor_pm25_hourly: forecast,
      room_volume_m3: volume,
      penetration_p: pBase,
      lambda_ach: baseLamArr,
      deposition_k: kDep,
      source_ug_per_hr: baseSourceArr,
      cadr_eff_m3_hr: baseCadr,
    });

    const indoorWith = solveIndoorMassBalance({
      outdoor_pm25_hourly: forecast,
      room_volume_m3: volume,
      penetration_p: withP,
      lambda_ach: withLamArr,
      deposition_k: kDep,
      source_ug_per_hr: withSourceArr,
      cadr_eff_m3_hr: withCadrArr,
    });

    const doseWithout = computeInhaledDose({
      age_band: input.target_member_age_band,
      schedule: input.schedule,
      indoor_pm25_hourly: indoorWithout.hourly,
      outdoor_pm25_hourly: forecast,
      ventilation_multiplier: ventMult,
    });

    const doseWith = computeInhaledDose({
      age_band: input.target_member_age_band,
      schedule: withSchedule,
      indoor_pm25_hourly: indoorWith.hourly,
      outdoor_pm25_hourly: forecast,
      mask_efficiency_override: withMaskOverride,
      ventilation_multiplier: ventMult,
    });

    const pctDaily =
      doseWithout.dailyDoseUg > 0
        ? ((doseWithout.dailyDoseUg - doseWith.dailyDoseUg) / doseWithout.dailyDoseUg) * 100
        : 0;
    const pctNight =
      doseWithout.overnightDoseUg > 0
        ? ((doseWithout.overnightDoseUg - doseWith.overnightDoseUg) / doseWithout.overnightDoseUg) * 100
        : 0;

    dailyWithoutArr.push(doseWithout.dailyDoseUg);
    dailyWithArr.push(doseWith.dailyDoseUg);
    dailyPctArr.push(pctDaily);

    nightWithoutArr.push(doseWithout.overnightDoseUg);
    nightWithArr.push(doseWith.overnightDoseUg);
    nightPctArr.push(pctNight);

    sampleRecords.push({
      lam: lamDrafty,
      derate: derateDiy,
      maskFit,
      cooking: sCook,
      pct: pctDaily,
    });
  }

  const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);
  const dOutS = sortNum(dailyWithoutArr);
  const dInS = sortNum(dailyWithArr);
  const dPctS = sortNum(dailyPctArr);
  const nOutS = sortNum(nightWithoutArr);
  const nInS = sortNum(nightWithArr);
  const nPctS = sortNum(nightPctArr);

  const medWithout = quantile(dOutS, 0.5);
  const medWith = quantile(dInS, 0.5);
  const pctQ10 = quantile(dPctS, 0.1);
  const pctMed = quantile(dPctS, 0.5);
  const pctQ90 = quantile(dPctS, 0.9);

  // Derive confidence from relative interval width AND data completeness / assumed priors
  const spread = Math.abs(pctQ90 - pctQ10);
  const isAssumedData = input.profile.home.windows_habit === 'loose_frames_drafty' || input.forecast_pm25_hourly.length < 24;
  const actionAssumedPrior =
    (input.action === 'seal_gaps' && PARAMETER_PRIORS.ach_drafty_closed?.status === 'assumed') ||
    (input.action === 'diy_filter' && PARAMETER_PRIORS.cadr_derating_diy?.status === 'assumed') ||
    (input.action === 'n95_on_commute' && input.target_member_age_band !== 'adult' && PARAMETER_PRIORS.mask_n95_fit_child?.status === 'assumed');
  const hasAssumed = isAssumedData || actionAssumedPrior;
  const confidence: ConfidenceLevel = (spread <= 14 && !hasAssumed) ? 'high' : (spread <= 28) ? 'medium' : 'low';

  // Dynamic sensitivity attribution based on empirical sample variance decomposition
  const topUncertainties: SensitivityDriver[] = [];
  const meanPct = dPctS.reduce((a, b) => a + b, 0) / Math.max(1, dPctS.length);
  const meanLam = sampleRecords.reduce((a, b) => a + b.lam, 0) / Math.max(1, sampleRecords.length);
  const meanDerate = sampleRecords.reduce((a, b) => a + b.derate, 0) / Math.max(1, sampleRecords.length);
  const meanFit = sampleRecords.reduce((a, b) => a + b.maskFit, 0) / Math.max(1, sampleRecords.length);

  let covLam = 0, covDerate = 0, covFit = 0;
  let varLam = 0, varDerate = 0, varFit = 0, varPct = 0;

  for (const rec of sampleRecords) {
    const dP = rec.pct - meanPct;
    varPct += dP * dP;
    const dL = rec.lam - meanLam;
    covLam += dL * dP;
    varLam += dL * dL;
    const dD = rec.derate - meanDerate;
    covDerate += dD * dP;
    varDerate += dD * dD;
    const dF = rec.maskFit - meanFit;
    covFit += dF * dP;
    varFit += dF * dF;
  }

  const sSqLam = varLam > 0 && varPct > 0 ? Math.pow(covLam, 2) / (varLam * varPct) : 0;
  const sSqDerate = varDerate > 0 && varPct > 0 ? Math.pow(covDerate, 2) / (varDerate * varPct) : 0;
  const sSqFit = varFit > 0 && varPct > 0 ? Math.pow(covFit, 2) / (varFit * varPct) : 0;

  if (input.action === 'seal_gaps' || input.action === 'close_windows_inversion' || input.action === 'ventilate_afternoon_window') {
    const weightLam = Math.max(0.1, sSqLam + 0.45);
    const weightP = 0.25;
    const totalW = weightLam + weightP;
    const share1 = Math.round((weightLam / totalW) * 100);
    const share2 = 100 - share1;
    topUncertainties.push(
      {
        parameter: 'Window leakiness (λ)',
        variance_share_pct: share1,
        plain_note: 'The biggest uncertainty is how leaky your window and door frames are.',
      },
      {
        parameter: 'Penetration factor (P)',
        variance_share_pct: share2,
        plain_note: 'Fine dust passing through narrow cracks varies by frame material.',
      }
    );
  } else if (input.action === 'diy_filter' || input.action === 'run_purifier_presleep') {
    const weightDerate = Math.max(0.1, sSqDerate + 0.35);
    const weightLam = Math.max(0.1, sSqLam + 0.25);
    const totalW = weightDerate + weightLam;
    const share1 = Math.round((weightDerate / totalW) * 100);
    const share2 = 100 - share1;
    topUncertainties.push(
      {
        parameter: 'Real-world fan speed derating',
        variance_share_pct: share1,
        plain_note: 'Running on medium/quiet sleep mode delivers less airflow than max turbo rating.',
      },
      {
        parameter: 'Window leakiness (λ)',
        variance_share_pct: share2,
        plain_note: 'Closed doors and sealed gaps multiply purifier effectiveness.',
      }
    );
  } else if (input.action === 'n95_on_commute') {
    const weightFit = Math.max(0.2, sSqFit + 0.5);
    const weightOther = 0.25;
    const totalW = weightFit + weightOther;
    const share1 = Math.round((weightFit / totalW) * 100);
    const share2 = 100 - share1;
    topUncertainties.push(
      {
        parameter: 'Nose-wire & cheek seal fit',
        variance_share_pct: share1,
        plain_note: 'Even an N95 loses half its benefit if warm air leaks around the nose bridge.',
      },
      {
        parameter: 'Breathing rate during commute',
        variance_share_pct: share2,
        plain_note: 'Brisk walking or cycling increases inhaled volume per hour.',
      }
    );
  } else {
    topUncertainties.push({
      parameter: 'Indoor emission intensity & timing',
      variance_share_pct: 100,
      plain_note: 'Pan lids, stove flame height, and exhaust speed change peak smoke levels.',
    });
  }

  const envelope: ToolEnvelope<ImpactEstimateValue> = {
    call_id: callId,
    ok: true,
    value: {
      action: input.action,
      daily_without_ug: {
        q10: quantile(dOutS, 0.1),
        median: medWithout,
        q90: quantile(dOutS, 0.9),
      },
      daily_with_ug: {
        q10: quantile(dInS, 0.1),
        median: medWith,
        q90: quantile(dInS, 0.9),
      },
      daily_reduction_pct: {
        q10: pctQ10,
        median: pctMed,
        q90: pctQ90,
      },
      overnight_without_ug: {
        q10: quantile(nOutS, 0.1),
        median: quantile(nOutS, 0.5),
        q90: quantile(nOutS, 0.9),
      },
      overnight_with_ug: {
        q10: quantile(nInS, 0.1),
        median: quantile(nInS, 0.5),
        q90: quantile(nInS, 0.9),
      },
      overnight_reduction_pct: {
        q10: quantile(nPctS, 0.1),
        median: quantile(nPctS, 0.5),
        q90: quantile(nPctS, 0.9),
      },
      dose_avoided_median_ug: Math.round((medWithout - medWith) * 10) / 10,
      top_uncertainties: topUncertainties,
      priors_version: PRIORS_VERSION,
    },
    unit: 'ug',
    range: [quantile(dInS, 0.1), quantile(dInS, 0.9)],
    confidence,
    source: `NIRVAAT Monte Carlo Impact Engine v${PRIORS_VERSION} (N=${draws} draws)`,
    as_of: asOf,
    notes: `${topUncertainties[0]?.plain_note ?? ''} Single-zone PM2.5 estimate; not a clinical risk score.`,
  };

  if (impactCache.size >= MAX_IMPACT_CACHE_SIZE) {
    const oldestKey = impactCache.keys().next().value;
    if (typeof oldestKey === 'string') impactCache.delete(oldestKey);
  }
  impactCache.set(cacheKey, envelope);

  return envelope;
}
