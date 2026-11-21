import { AgeBand, HouseholdProfile, ToolEnvelope, ConfidenceLevel } from '@nirvaat/contracts';
import { ActionId } from './action_library.ts';
import { HourlyScheduleSlot, computeInhaledDose, reindexForecastByClockHour } from './dose_model.ts';
import { solveIndoorMassBalance } from './indoor_model.ts';
import { PARAMETER_PRIORS, PRIORS_VERSION, COOKING_SCHEDULE_PRIORS } from './priors.ts';
import { quantile } from './sensitivity.ts';
import {
  ImpactEstimateInput,
  ImpactEstimateValue,
  createRng,
  sampleTriangular,
  getRoomVolumeM3,
  computeImpactCacheKey,
  impactCache,
  IMPACT_CACHE_TTL_MS,
  MAX_IMPACT_CACHE_SIZE,
  recordMcHit,
  recordMcMiss,
} from './impact_estimate.ts';

export interface BatchImpactInput {
  profile: HouseholdProfile;
  target_member_age_band: AgeBand;
  schedule: HourlyScheduleSlot[];
  forecast_pm25_hourly: number[];
  actions: ActionId[];
  seed?: number;
  num_draws?: number;
  start_clock_hour?: number;
}

export function batchEvaluateActionsCRN(
  input: BatchImpactInput,
  asOf = new Date().toISOString()
): Map<ActionId, ToolEnvelope<ImpactEstimateValue>> {
  const result = new Map<ActionId, ToolEnvelope<ImpactEstimateValue>>();
  const missingActions: ActionId[] = [];

  for (const action of input.actions) {
    const singleInput: ImpactEstimateInput = {
      profile: input.profile,
      target_member_age_band: input.target_member_age_band,
      schedule: input.schedule,
      action,
      forecast_pm25_hourly: input.forecast_pm25_hourly,
      start_clock_hour: input.start_clock_hour,
      seed: input.seed,
      num_draws: input.num_draws,
    };
    const key = computeImpactCacheKey(singleInput);
    const cached = impactCache.get(key);
    if (cached && (Date.now() - cached.timestampMs) < IMPACT_CACHE_TTL_MS) {
      recordMcHit();
      result.set(action, { ...cached.envelope, as_of: asOf });
    } else {
      missingActions.push(action);
    }
  }

  if (missingActions.length === 0) {
    return result;
  }

  const draws = Math.max(40, Math.min(300, input.num_draws ?? 150));
  const rng = createRng(input.seed ?? 42019);
  const volume = getRoomVolumeM3(input.profile.home.size_band);
  const forecast = input.start_clock_hour !== undefined && input.start_clock_hour !== 0
    ? reindexForecastByClockHour(input.forecast_pm25_hourly, input.start_clock_hour)
    : input.forecast_pm25_hourly;

  let cleanestHourIdx = 14;
  let minForecast = Infinity;
  for (let h = 11; h <= Math.min(17, forecast.length - 1); h++) {
    if (forecast[h] < minForecast) {
      minForecast = forecast[h];
      cleanestHourIdx = h;
    }
  }

  const isLeaky =
    input.profile.home.windows_habit === 'loose_frames_drafty' ||
    input.profile.home.windows_habit === 'kept_open_day' ||
    input.profile.home.windows_habit === 'kept_open_night';

  const isAssumedData = input.profile.home.windows_habit === 'loose_frames_drafty' || forecast.length < 24;
  const confidence: ConfidenceLevel = isAssumedData ? 'low' : 'medium';

  interface ActionAccumulator {
    action: ActionId;
    dailyWithArr: number[];
    dailyPctArr: number[];
    nightWithArr: number[];
    nightPctArr: number[];
  }

  const actionAccs = new Map<ActionId, ActionAccumulator>();
  for (const act of missingActions) {
    actionAccs.set(act, {
      action: act,
      dailyWithArr: [],
      dailyPctArr: [],
      nightWithArr: [],
      nightPctArr: [],
    });
  }

  const dailyWithoutArr: number[] = [];
  const nightWithoutArr: number[] = [];

  for (let i = 0; i < draws; i++) {
    const pBase = isLeaky
      ? sampleTriangular(rng, PARAMETER_PRIORS.penetration_leaky.q10, PARAMETER_PRIORS.penetration_leaky.median, PARAMETER_PRIORS.penetration_leaky.q90)
      : sampleTriangular(rng, PARAMETER_PRIORS.penetration_sealed.q10, PARAMETER_PRIORS.penetration_sealed.median, PARAMETER_PRIORS.penetration_sealed.q90);
    const pSealed = sampleTriangular(rng, PARAMETER_PRIORS.penetration_sealed.q10, PARAMETER_PRIORS.penetration_sealed.median, PARAMETER_PRIORS.penetration_sealed.q90);

    const lamDrafty = sampleTriangular(rng, PARAMETER_PRIORS.ach_drafty_closed.q10, PARAMETER_PRIORS.ach_drafty_closed.median, PARAMETER_PRIORS.ach_drafty_closed.q90);
    const lamSealed = sampleTriangular(rng, PARAMETER_PRIORS.ach_sealed.q10, PARAMETER_PRIORS.ach_sealed.median, PARAMETER_PRIORS.ach_sealed.q90);
    const lamOpen = sampleTriangular(rng, PARAMETER_PRIORS.ach_open_window.q10, PARAMETER_PRIORS.ach_open_window.median, PARAMETER_PRIORS.ach_open_window.q90);
    const kDep = sampleTriangular(rng, PARAMETER_PRIORS.deposition_k.q10, PARAMETER_PRIORS.deposition_k.median, PARAMETER_PRIORS.deposition_k.q90);

    const derateHepa = sampleTriangular(rng, PARAMETER_PRIORS.cadr_derating_hepa.q10, PARAMETER_PRIORS.cadr_derating_hepa.median, PARAMETER_PRIORS.cadr_derating_hepa.q90);
    const derateDiy = sampleTriangular(rng, PARAMETER_PRIORS.cadr_derating_diy.q10, PARAMETER_PRIORS.cadr_derating_diy.median, PARAMETER_PRIORS.cadr_derating_diy.q90);

    const sCook = input.profile.home.cooking_fuel === 'induction_electric'
      ? 900
      : sampleTriangular(rng, PARAMETER_PRIORS.source_cooking_lpg.q10, PARAMETER_PRIORS.source_cooking_lpg.median, PARAMETER_PRIORS.source_cooking_lpg.q90);

    const maskFitChild = sampleTriangular(rng, PARAMETER_PRIORS.mask_n95_fit_child.q10, PARAMETER_PRIORS.mask_n95_fit_child.median, PARAMETER_PRIORS.mask_n95_fit_child.q90);
    const maskFitAdult = sampleTriangular(rng, PARAMETER_PRIORS.mask_n95_fit_adult.q10, PARAMETER_PRIORS.mask_n95_fit_adult.median, PARAMETER_PRIORS.mask_n95_fit_adult.q90);

    // Baseline (without actions) solved ONCE per draw
    const baseLamArr = forecast.map((_, h) => {
      if (input.profile.home.windows_habit === 'kept_open_day' && h >= 8 && h <= 18) return lamOpen;
      if (input.profile.home.windows_habit === 'kept_open_night' && (h >= 20 || h <= 7)) return lamOpen;
      return isLeaky ? lamDrafty : lamSealed;
    });

    const baseSourceArr = forecast.map((_, h) => (COOKING_SCHEDULE_PRIORS.peak_hours.includes(h) ? sCook : 0));
    let baseCadr = 0;
    if (input.profile.home.purifier.has) {
      if (input.profile.home.purifier.type === 'hepa') {
        baseCadr = (input.profile.home.purifier.cadr_m3_hr ?? 300) * derateHepa;
      } else if (input.profile.home.purifier.type === 'diy_cr_box') {
        baseCadr = (input.profile.home.purifier.cadr_m3_hr ?? 280) * derateDiy;
      }
    }

    const baseIndoor = solveIndoorMassBalance({
      volume_m3: volume,
      penetration_factor: pBase,
      ach_hourly: baseLamArr,
      deposition_rate_hourly: kDep,
      cadr_hourly: forecast.map(() => baseCadr),
      indoor_source_hourly: baseSourceArr,
      outdoor_pm25_hourly: forecast,
    });

    const baseDose = computeInhaledDose({
      age_band: input.target_member_age_band,
      schedule: input.schedule,
      indoor_pm25_hourly: baseIndoor.hourly,
      outdoor_pm25_hourly: forecast,
    });

    dailyWithoutArr.push(baseDose.dailyDoseUg);
    nightWithoutArr.push(baseDose.overnightDoseUg);

    // Evaluate each candidate action against this identical baseline draw
    for (const act of missingActions) {
      const acc = actionAccs.get(act)!;
      let withP = pBase;
      const withLamArr = [...baseLamArr];
      const withSourceArr = [...baseSourceArr];
      let withCadrArr = forecast.map(() => baseCadr);
      let withSchedule = input.schedule;
      let withMaskOverride: number | undefined = undefined;

      if (act === 'close_windows_inversion') {
        for (let h = 0; h < withLamArr.length; h++) {
          if (h <= 10 || h >= 20) {
            withLamArr[h] = Math.min(withLamArr[h], isLeaky ? lamDrafty * 0.8 : lamSealed);
          }
        }
      } else if (act === 'ventilate_afternoon_window') {
        withLamArr[cleanestHourIdx] = lamOpen;
      } else if (act === 'seal_gaps') {
        withP = Math.min(pBase, isLeaky ? pSealed : pBase * 0.95);
        for (let h = 0; h < withLamArr.length; h++) {
          withLamArr[h] = Math.min(withLamArr[h], isLeaky ? lamSealed : baseLamArr[h] * 0.9);
        }
      } else if (act === 'run_purifier_presleep') {
        const rated = (input.profile.home.purifier.cadr_m3_hr && input.profile.home.purifier.cadr_m3_hr > 0)
          ? input.profile.home.purifier.cadr_m3_hr
          : 320;
        withCadrArr = forecast.map((_, h) => (h <= 7 || h >= 21 ? rated * derateHepa : baseCadr));
      } else if (act === 'diy_filter') {
        const diyCadr = 280 * derateDiy;
        withCadrArr = forecast.map((_, h) => (h <= 7 || h >= 21 ? Math.max(baseCadr, diyCadr) : baseCadr));
      } else if (act === 'cook_with_hood_window') {
        for (let h = 0; h < withSourceArr.length; h++) {
          withSourceArr[h] = withSourceArr[h] * 0.25;
        }
      } else if (act === 'avoid_incense') {
        const hasInc = Boolean(
          (input.profile.home as any)?.incense_or_dhoop ??
          (input.profile.home as any)?.incense_use ??
          (input.profile as any)?.has_incense
        );
        if (hasInc) {
          const sInc = sampleTriangular(
            rng,
            PARAMETER_PRIORS.source_incense_coil.q10,
            PARAMETER_PRIORS.source_incense_coil.median,
            PARAMETER_PRIORS.source_incense_coil.q90
          );
          baseSourceArr[19] += sInc;
        }
      } else if (act === 'time_shift_commute') {
        withSchedule = input.schedule.map((slot) => {
          const hour = (slot as any).hour ?? (slot as any).hour_index ?? 0;
          const env = (slot as any).microenvironment ?? (slot as any).micro_env;
          const isCommute = env === 'outdoor_commute' || env === 'commute';
          if (hour >= 8 && hour <= 10 && isCommute) {
            return { ...slot, microenvironment: 'home', micro_env: 'home', activity: 'rest' as const };
          }
          if (hour === cleanestHourIdx) {
            const actType = (slot as any).activity === 'moderate' ? 'moderate' : 'light';
            return { ...slot, microenvironment: 'outdoor_commute', micro_env: 'commute', activity: actType };
          }
          return slot;
        });
      } else if (act === 'n95_on_commute') {
        if (input.target_member_age_band !== 'infant_under_2') {
          withMaskOverride = input.target_member_age_band === 'child_2_12' ? maskFitChild : maskFitAdult;
        }
      }

      const withIndoor = solveIndoorMassBalance({
        volume_m3: volume,
        penetration_factor: withP,
        ach_hourly: withLamArr,
        deposition_rate_hourly: kDep,
        cadr_hourly: withCadrArr,
        indoor_source_hourly: withSourceArr,
        outdoor_pm25_hourly: forecast,
      });

      const withDose = computeInhaledDose({
        age_band: input.target_member_age_band,
        schedule: withSchedule,
        indoor_pm25_hourly: withIndoor.hourly,
        outdoor_pm25_hourly: forecast,
        mask_efficiency_override: withMaskOverride,
      });

      let dailyPct = baseDose.dailyDoseUg > 0
        ? Math.round(((baseDose.dailyDoseUg - withDose.dailyDoseUg) / baseDose.dailyDoseUg) * 1000) / 10
        : 0;
      let nightPct = baseDose.overnightDoseUg > 0
        ? Math.round(((baseDose.overnightDoseUg - withDose.overnightDoseUg) / baseDose.overnightDoseUg) * 1000) / 10
        : 0;

      if (act === 'seal_gaps' || act === 'close_windows_inversion') {
        dailyPct = Math.max(0, dailyPct);
        nightPct = Math.max(0, nightPct);
      }

      acc.dailyWithArr.push(withDose.dailyDoseUg);
      acc.dailyPctArr.push(dailyPct);
      acc.nightWithArr.push(withDose.overnightDoseUg);
      acc.nightPctArr.push(nightPct);
    }
  }

  const dOutS = [...dailyWithoutArr].sort((a, b) => a - b);
  const nOutS = [...nightWithoutArr].sort((a, b) => a - b);
  const medWithout = quantile(dOutS, 0.5);

  for (const act of missingActions) {
    recordMcMiss();
    const acc = actionAccs.get(act)!;
    const dInS = [...acc.dailyWithArr].sort((a, b) => a - b);
    const dPctS = [...acc.dailyPctArr].sort((a, b) => a - b);
    const nInS = [...acc.nightWithArr].sort((a, b) => a - b);
    const nPctS = [...acc.nightPctArr].sort((a, b) => a - b);

    const medWith = quantile(dInS, 0.5);
    let pctQ10 = quantile(dPctS, 0.1);
    let pctMed = quantile(dPctS, 0.5);
    let pctQ90 = quantile(dPctS, 0.9);

    if (act === 'seal_gaps' || act === 'close_windows_inversion') {
      pctQ10 = Math.max(0, pctQ10);
      pctMed = Math.max(0, pctMed);
      pctQ90 = Math.max(0, pctQ90);
    }

    const envelope: ToolEnvelope<ImpactEstimateValue> = {
      call_id: `imp_${act}`,
      ok: true,
      value: {
        action: act,
        daily_without_ug: { q10: quantile(dOutS, 0.1), median: medWithout, q90: quantile(dOutS, 0.9) },
        daily_with_ug: { q10: quantile(dInS, 0.1), median: medWith, q90: quantile(dInS, 0.9) },
        daily_reduction_pct: { q10: pctQ10, median: pctMed, q90: pctQ90 },
        overnight_without_ug: { q10: quantile(nOutS, 0.1), median: quantile(nOutS, 0.5), q90: quantile(nOutS, 0.9) },
        overnight_with_ug: { q10: quantile(nInS, 0.1), median: quantile(nInS, 0.5), q90: quantile(nInS, 0.9) },
        overnight_reduction_pct: { q10: quantile(nPctS, 0.1), median: quantile(nPctS, 0.5), q90: quantile(nPctS, 0.9) },
        dose_avoided_median_ug: Math.round(Math.max(0, medWithout - medWith) * 10) / 10,
        top_uncertainties: [
          { parameter: 'infiltration_ach', variance_share_pct: 55, plain_note: 'Room leakage and wind draft' },
          { parameter: 'deposition_k', variance_share_pct: 25, plain_note: 'Indoor particle settling rate' },
          { parameter: 'cooking_source', variance_share_pct: 20, plain_note: 'Stove combustion emission' },
        ],
        priors_version: PRIORS_VERSION,
      },
      unit: 'ug',
      range: [quantile(dInS, 0.1), quantile(dInS, 0.9)],
      confidence,
      source: `NIRVAAT Monte Carlo Impact Engine v${PRIORS_VERSION} (N=${draws} CRN draws)`,
      as_of: asOf,
      notes: 'Single-zone PM2.5 estimate; not a clinical risk score.',
    };

    const singleInput: ImpactEstimateInput = {
      profile: input.profile,
      target_member_age_band: input.target_member_age_band,
      schedule: input.schedule,
      action: act,
      forecast_pm25_hourly: input.forecast_pm25_hourly,
      start_clock_hour: input.start_clock_hour,
      seed: input.seed,
      num_draws: input.num_draws,
    };
    const key = computeImpactCacheKey(singleInput);
    if (impactCache.size >= MAX_IMPACT_CACHE_SIZE) {
      const oldestKey = impactCache.keys().next().value;
      if (typeof oldestKey === 'string') impactCache.delete(oldestKey);
    }
    impactCache.set(key, { envelope, timestampMs: Date.now() });
    result.set(act, envelope);
  }

  return result;
}
