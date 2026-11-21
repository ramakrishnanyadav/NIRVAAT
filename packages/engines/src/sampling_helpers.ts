import crypto from 'node:crypto';
import { HouseholdProfile, ToolEnvelope } from '@nirvaat/contracts';
import { ROOM_VOLUME_PRIORS, PRIORS_VERSION } from './priors.ts';
import { ImpactEstimateInput, ImpactEstimateValue } from './impact_estimate.ts';

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
