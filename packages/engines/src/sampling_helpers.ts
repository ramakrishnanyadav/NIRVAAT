import crypto from 'node:crypto';
import { HouseholdProfile, ToolEnvelope, ConfidenceLevel, AgeBand } from '@nirvaat/contracts';
import { ROOM_VOLUME_PRIORS, PRIORS_VERSION } from './priors.ts';
import { ActionId } from './action_library.ts';
import { quantile, SensitivityDriver } from './sensitivity.ts';
import { HourlyScheduleSlot } from './dose_model.ts';

export interface ImpactEstimateInput {
  profile: HouseholdProfile;
  target_member_age_band: AgeBand;
  schedule: HourlyScheduleSlot[];
  action: ActionId;
  forecast_pm25_hourly: number[];
  start_clock_hour?: number;
  seed?: number;
  num_draws?: number;
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

export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = Math.trunc(state);
    state = Math.trunc(state + 0x6d2b79f5);
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleTriangular(rng: () => number, q10: number, med: number, q90: number): number {
  const u = rng();
  const minVal = Math.max(0.001, med - 1.35 * (med - q10));
  const maxVal = med + 1.35 * (q90 - med);
  const fc = (med - minVal) / Math.max(1e-6, maxVal - minVal);
  if (u < fc) {
    return minVal + Math.sqrt(u * (maxVal - minVal) * (med - minVal));
  }
  return maxVal - Math.sqrt((1 - u) * (maxVal - minVal) * (maxVal - med));
}

export function samplePrior(rng: () => number, prior: { q10: number; median: number; q90: number }): number {
  return sampleTriangular(rng, prior.q10, prior.median, prior.q90);
}

export function getRoomVolumeM3(sizeBand: HouseholdProfile['home']['size_band']): number {
  return ROOM_VOLUME_PRIORS[sizeBand]?.volume_m3 ?? 115;
}

export interface CachedImpactEntry {
  envelope: ToolEnvelope<ImpactEstimateValue>;
  timestampMs: number;
}

export const impactCache = new Map<string, CachedImpactEntry>();
export const MAX_IMPACT_CACHE_SIZE = 250;
export const IMPACT_CACHE_TTL_MS = 15 * 60 * 1000;

let mcHits = 0;
let mcMisses = 0;

export function recordMcHit(): void { mcHits++; }
export function recordMcMiss(): void { mcMisses++; }

export function getImpactCacheSize(): number {
  return impactCache.size;
}

export function getMonteCarloMetrics() {
  const total = mcHits + mcMisses;
  return {
    hits: mcHits,
    misses: mcMisses,
    hit_rate_pct: total > 0 ? Math.round((mcHits / total) * 10000) / 100 : 0,
    cached_entries: impactCache.size,
  };
}

export function resetMonteCarloMetrics(): void {
  mcHits = 0;
  mcMisses = 0;
  impactCache.clear();
}

export function clearImpactCache(): void {
  resetMonteCarloMetrics();
}

export function computeImpactCacheKey(input: ImpactEstimateInput): string {
  const profileFeatures = [
    input.profile?.home?.size_band,
    input.profile?.home?.windows_habit,
    input.profile?.home?.cooking_fuel,
    input.profile?.home?.purifier?.has,
    input.profile?.home?.purifier?.cadr_m3_hr ?? 0,
    Boolean((input.profile?.home as any)?.incense_or_dhoop),
    input.target_member_age_band,
    input.action,
    (input.profile?.constraints as any)?.budget_band,
    (input.profile?.constraints as any)?.renter,
    input.start_clock_hour ?? 0,
  ].join('|');
  const forecastVersion = (input.forecast_pm25_hourly ?? []).slice(0, 24).join(',');
  const rawKey = `${profileFeatures}#${forecastVersion}#${PRIORS_VERSION}#${input.seed ?? 42019}#${input.num_draws ?? 300}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export interface CrnAccumulator {
  dailyWithArr: number[];
  dailyPctArr: number[];
  nightWithArr: number[];
  nightPctArr: number[];
}

export function buildCrnActionEnvelope(
  act: ActionId,
  dOutS: number[],
  nOutS: number[],
  medWithout: number,
  acc: CrnAccumulator,
  confidence: ConfidenceLevel,
  asOf: string,
  draws: number
): ToolEnvelope<ImpactEstimateValue> {
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

  return {
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
}

export function buildSingleImpactEnvelope(
  callId: string,
  action: ActionId,
  dOutS: number[],
  dInS: number[],
  dPctS: number[],
  nOutS: number[],
  nInS: number[],
  nPctS: number[],
  medWithout: number,
  medWith: number,
  topUncertainties: SensitivityDriver[],
  confidence: ConfidenceLevel,
  asOf: string,
  draws: number
): ToolEnvelope<ImpactEstimateValue> {
  const pctQ10 = quantile(dPctS, 0.1);
  const pctMed = quantile(dPctS, 0.5);
  const pctQ90 = quantile(dPctS, 0.9);

  return {
    call_id: callId,
    ok: true,
    value: {
      action,
      daily_without_ug: { q10: quantile(dOutS, 0.1), median: medWithout, q90: quantile(dOutS, 0.9) },
      daily_with_ug: { q10: quantile(dInS, 0.1), median: medWith, q90: quantile(dInS, 0.9) },
      daily_reduction_pct: { q10: pctQ10, median: pctMed, q90: pctQ90 },
      overnight_without_ug: { q10: quantile(nOutS, 0.1), median: quantile(nOutS, 0.5), q90: quantile(nOutS, 0.9) },
      overnight_with_ug: { q10: quantile(nInS, 0.1), median: quantile(nInS, 0.5), q90: quantile(nInS, 0.9) },
      overnight_reduction_pct: { q10: quantile(nPctS, 0.1), median: quantile(nPctS, 0.5), q90: quantile(nPctS, 0.9) },
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
}
