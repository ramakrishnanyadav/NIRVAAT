import crypto from 'node:crypto';
import { AgeBand, HouseholdProfile, ToolEnvelope, ConfidenceLevel } from '@nirvaat/contracts';
import { ActionId } from './action_library.ts';
import { HourlyScheduleSlot, computeInhaledDose, reindexForecastByClockHour } from './dose_model.ts';
import { solveIndoorMassBalance } from './indoor_model.ts';
import { PARAMETER_PRIORS, PRIORS_VERSION, ROOM_VOLUME_PRIORS, COOKING_SCHEDULE_PRIORS } from './priors.ts';
import { SensitivityDriver, quantile, deriveSensitivityDrivers, SampleRecord } from './sensitivity.ts';

export * from './action_library.ts';
export * from './sensitivity.ts';
export { batchEvaluateActionsCRN } from './impact_crn.ts';
export type { BatchImpactInput } from './impact_crn.ts';

import {
  createRng,
  sampleTriangular,
  samplePrior,
  getRoomVolumeM3,
  impactCache,
  MAX_IMPACT_CACHE_SIZE,
  IMPACT_CACHE_TTL_MS,
  recordMcHit,
  recordMcMiss,
  getImpactCacheSize,
  getMonteCarloMetrics,
  resetMonteCarloMetrics,
  clearImpactCache,
  computeImpactCacheKey,
  buildSingleImpactEnvelope,
  CachedImpactEntry,
  ImpactEstimateInput,
  ImpactEstimateValue,
} from './sampling_helpers.ts';

export * from './sampling_helpers.ts';

export function impactEstimate(
  input: ImpactEstimateInput,
  callId = `imp_${input.action}`,
  asOf = new Date().toISOString()
): ToolEnvelope<ImpactEstimateValue> {
  const cacheKey = computeImpactCacheKey(input);
  const cached = impactCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestampMs) < IMPACT_CACHE_TTL_MS) {
    recordMcHit();
    return {
      ...cached.envelope,
      call_id: callId,
      as_of: asOf,
    };
  }

  recordMcMiss();
  const draws = Math.max(40, Math.min(300, input.num_draws ?? 300));
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

  const dailyWithoutArr: number[] = [];
  const dailyWithArr: number[] = [];
  const dailyPctArr: number[] = [];
  const nightWithoutArr: number[] = [];
  const nightWithArr: number[] = [];
  const nightPctArr: number[] = [];
  const sampleRecords: SampleRecord[] = [];

  for (let i = 0; i < draws; i++) {
    const pBase = isLeaky ? samplePrior(rng, PARAMETER_PRIORS.penetration_leaky) : samplePrior(rng, PARAMETER_PRIORS.penetration_sealed);
    const pSealed = samplePrior(rng, PARAMETER_PRIORS.penetration_sealed);
    const lamDrafty = samplePrior(rng, PARAMETER_PRIORS.ach_drafty_closed);
    const lamSealed = samplePrior(rng, PARAMETER_PRIORS.ach_sealed);
    const lamOpen = samplePrior(rng, PARAMETER_PRIORS.ach_open_window);
    const kDep = samplePrior(rng, PARAMETER_PRIORS.deposition_k);
    const derateHepa = samplePrior(rng, PARAMETER_PRIORS.cadr_derating_hepa);
    const derateDiy = samplePrior(rng, PARAMETER_PRIORS.cadr_derating_diy);
    const sCook = input.profile.home.cooking_fuel === 'induction_electric'
      ? 900
      : samplePrior(rng, PARAMETER_PRIORS.source_cooking_lpg);
    const maskFit = input.target_member_age_band === 'adult'
      ? samplePrior(rng, PARAMETER_PRIORS.mask_n95_fit_adult)
      : samplePrior(rng, PARAMETER_PRIORS.mask_n95_fit_child);

    const baseLamArr = forecast.map((_, h) => {
      if (input.profile.home.windows_habit === 'kept_open_night' && (h < 7 || h >= 21)) return lamOpen;
      if (input.profile.home.windows_habit === 'kept_open_day' && h >= 8 && h <= 18) return lamOpen;
      return isLeaky ? lamDrafty : lamSealed;
    });

    const baseSourceArr = forecast.map((_, h) => (COOKING_SCHEDULE_PRIORS.peak_hours.includes(h) ? sCook : 0));
    let baseCadr = 0;
    if (input.action !== 'run_purifier_presleep' && input.action !== 'diy_filter' && input.profile.home.purifier.has) {
      if (input.profile.home.purifier.type === 'hepa') {
        baseCadr = (input.profile.home.purifier.cadr_m3_hr ?? (input.profile.home.purifier as any).cadr ?? 300) * derateHepa;
      } else if (input.profile.home.purifier.type === 'diy_cr_box') {
        baseCadr = (input.profile.home.purifier.cadr_m3_hr ?? (input.profile.home.purifier as any).cadr ?? 280) * derateDiy;
      }
    }

    let withP = pBase;
    const withLamArr = [...baseLamArr];
    const withSourceArr = [...baseSourceArr];
    let withCadrArr = forecast.map(() => baseCadr);
    let withSchedule = input.schedule;
    let withMaskOverride: number | undefined = undefined;

    if (input.action === 'close_windows_inversion') {
      for (let h = 0; h < withLamArr.length; h++) {
        if (h <= 10 || h >= 20) withLamArr[h] = Math.min(withLamArr[h], isLeaky ? lamDrafty * 0.8 : lamSealed);
      }
    } else if (input.action === 'ventilate_afternoon_window') {
      withLamArr[cleanestHourIdx] = lamOpen;
    } else if (input.action === 'seal_gaps') {
      withP = Math.min(pBase, isLeaky ? pSealed : pBase * 0.95);
      for (let h = 0; h < withLamArr.length; h++) {
        withLamArr[h] = Math.min(withLamArr[h], isLeaky ? lamSealed : baseLamArr[h] * 0.9);
      }
    } else if (input.action === 'run_purifier_presleep') {
      const rated = ((input.profile.home.purifier as any).cadr_m3_hr ?? (input.profile.home.purifier as any).cadr ?? 320) > 0
        ? ((input.profile.home.purifier as any).cadr_m3_hr ?? (input.profile.home.purifier as any).cadr ?? 320)
        : 320;
      withCadrArr = forecast.map((_, h) => (h <= 7 || h >= 21 ? rated * derateHepa : baseCadr));
    } else if (input.action === 'diy_filter') {
      const diyCadr = 280 * derateDiy;
      withCadrArr = forecast.map((_, h) => (h <= 7 || h >= 21 ? Math.max(baseCadr, diyCadr) : baseCadr));
    } else if (input.action === 'cook_with_hood_window') {
      for (let h = 0; h < withSourceArr.length; h++) withSourceArr[h] *= 0.25;
    } else if (input.action === 'avoid_incense') {
      const hasIncense = Boolean(
        (input.profile.home as any)?.incense_or_dhoop ??
        (input.profile.home as any)?.incense_use ??
        (input.profile as any)?.has_incense
      );
      if (hasIncense) {
        const sInc = sampleTriangular(rng, PARAMETER_PRIORS.source_incense_coil.q10, PARAMETER_PRIORS.source_incense_coil.median, PARAMETER_PRIORS.source_incense_coil.q90);
        baseSourceArr[19] += sInc;
      }
    } else if (input.action === 'time_shift_commute') {
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
    } else if (input.action === 'n95_on_commute') {
      if (input.target_member_age_band !== 'infant_under_2') withMaskOverride = maskFit;
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

    const withIndoor = solveIndoorMassBalance({
      volume_m3: volume,
      penetration_factor: withP,
      ach_hourly: withLamArr,
      deposition_rate_hourly: kDep,
      cadr_hourly: withCadrArr,
      indoor_source_hourly: withSourceArr,
      outdoor_pm25_hourly: forecast,
    });

    const doseWithout = computeInhaledDose({
      age_band: input.target_member_age_band,
      schedule: input.schedule,
      indoor_pm25_hourly: baseIndoor.hourly,
      outdoor_pm25_hourly: forecast,
    });

    const doseWith = computeInhaledDose({
      age_band: input.target_member_age_band,
      schedule: withSchedule,
      indoor_pm25_hourly: withIndoor.hourly,
      outdoor_pm25_hourly: forecast,
      mask_efficiency_override: withMaskOverride,
    });

    const pctDaily = doseWithout.dailyDoseUg > 0
      ? ((doseWithout.dailyDoseUg - doseWith.dailyDoseUg) / doseWithout.dailyDoseUg) * 100
      : 0;
    const pctNight = doseWithout.overnightDoseUg > 0
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

  const spread = Math.abs(pctQ90 - pctQ10);
  const isAssumedData = input.profile.home.windows_habit === 'loose_frames_drafty' || input.forecast_pm25_hourly.length < 24;
  const actionAssumedPrior =
    (input.action === 'seal_gaps' && PARAMETER_PRIORS.ach_drafty_closed?.status === 'assumed') ||
    (input.action === 'diy_filter' && PARAMETER_PRIORS.cadr_derating_diy?.status === 'assumed') ||
    (input.action === 'n95_on_commute' && input.target_member_age_band !== 'adult' && PARAMETER_PRIORS.mask_n95_fit_child?.status === 'assumed');
  const hasAssumed = isAssumedData || actionAssumedPrior;
  let confidence: ConfidenceLevel = 'low';
  if (spread <= 14 && !hasAssumed) {
    confidence = 'high';
  } else if (spread <= 28) {
    confidence = 'medium';
  }

  const topUncertainties = deriveSensitivityDrivers(input.action, sampleRecords, dPctS);
  const envelope = buildSingleImpactEnvelope(
    callId,
    input.action,
    dOutS,
    dInS,
    dPctS,
    nOutS,
    nInS,
    nPctS,
    medWithout,
    medWith,
    topUncertainties,
    confidence,
    asOf,
    draws
  );

  if (impactCache.size >= MAX_IMPACT_CACHE_SIZE) {
    const oldestKey = impactCache.keys().next().value;
    if (typeof oldestKey === 'string') impactCache.delete(oldestKey);
  }
  impactCache.set(cacheKey, { envelope, timestampMs: Date.now() });

  return envelope;
}
