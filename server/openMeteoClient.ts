import {
  AirQualityPoint,
  AirQualitySummary,
  RegionConfig,
  RuntimeContext,
} from '@nirvaat/contracts';
import { TELEMETRY_SPREAD_PRIORS } from '@nirvaat/engines';

export function roundCoarseCoord(coord: number): number {
  return Math.round(coord * 100) / 100;
}

interface CachedAQEntry {
  fetchedAtMs: number;
  summary: AirQualitySummary;
}

const aqCache = new Map<string, CachedAQEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_AQ_CACHE_SIZE = 120;

let aqHits = 0;
let aqMisses = 0;

export function getAqCacheSize(): number {
  return aqCache.size;
}

export function getAqMetrics() {
  const total = aqHits + aqMisses;
  return {
    hits: aqHits,
    misses: aqMisses,
    hit_rate_pct: total > 0 ? Math.round((aqHits / total) * 10000) / 100 : 0,
    cached_entries: aqCache.size,
  };
}

export function resetAqMetrics(): void {
  aqHits = 0;
  aqMisses = 0;
  aqCache.clear();
}

export function clearAqCache(): void {
  resetAqMetrics();
}

function pruneAqCache(): void {
  const now = Date.now();
  for (const [key, entry] of aqCache.entries()) {
    if (now - entry.fetchedAtMs > CACHE_TTL_MS) {
      aqCache.delete(key);
    }
  }
  while (aqCache.size >= MAX_AQ_CACHE_SIZE) {
    const oldestKey = aqCache.keys().next().value;
    if (oldestKey) aqCache.delete(oldestKey);
    else break;
  }
}

function makeToolRef(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function formatHourLabel(iso: string): string {
  const parts = iso.split('T');
  if (parts.length < 2) return iso;
  return parts[1].slice(0, 5);
}

function findWindow(
  points: AirQualityPoint[],
  mode: 'min' | 'max',
  windowSize = 3
): { start_iso: string; end_iso: string; label: string; avg_pm2_5: number | null } | null {
  const valid = points.filter((p) => typeof p.pm2_5 === 'number');
  if (valid.length < windowSize) return null;

  let bestAvg = mode === 'min' ? Infinity : -Infinity;
  let bestIdx = 0;

  for (let i = 0; i <= valid.length - windowSize; i++) {
    const slice = valid.slice(i, i + windowSize);
    const avg = slice.reduce((acc, item) => acc + (item.pm2_5 ?? 0), 0) / windowSize;
    if ((mode === 'min' && avg < bestAvg) || (mode === 'max' && avg > bestAvg)) {
      bestAvg = avg;
      bestIdx = i;
    }
  }

  const start = valid[bestIdx];
  const end = valid[bestIdx + windowSize - 1];
  return {
    start_iso: start.time,
    end_iso: end.time,
    label: `${formatHourLabel(start.time)}–${formatHourLabel(end.time)}`,
    avg_pm2_5: Math.round(bestAvg * 10) / 10,
  };
}

export async function fetchLiveAirQualitySummary(
  region: RegionConfig,
  maxDataAgeMin: number,
  simulatedDegradation: RuntimeContext['simulated_degradation'] = 'none'
): Promise<{ ok: true; data: AirQualitySummary } | { ok: false; error: string }> {
  if (simulatedDegradation === 'no_aq' || simulatedDegradation === 'all_down') {
    return {
      ok: false,
      error: 'Live air-quality telemetry is currently unavailable (simulated outage).',
    };
  }

  const lat = roundCoarseCoord(region.latitude);
  const lon = roundCoarseCoord(region.longitude);
  const gridId = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const currentHourKey = new Date().toISOString().slice(0, 13);
  const cacheKey = `${gridId}_${currentHourKey}`;
  const cached = aqCache.get(cacheKey) || aqCache.get(gridId);

  if (cached && Date.now() - cached.fetchedAtMs < CACHE_TTL_MS) {
    aqHits++;
    const ageMin = Math.max(0, Math.round((Date.now() - new Date(cached.summary.as_of).getTime()) / 60000));
    return {
      ok: true,
      data: {
        ...cached.summary,
        tool_ref: makeToolRef('aq'),
        data_age_minutes: ageMin,
        is_stale: ageMin > maxDataAgeMin,
      },
    };
  }

  aqMisses++;

  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'pm2_5,pm10,us_aqi,european_aqi,nitrogen_dioxide');
  url.searchParams.set('hourly', 'pm2_5,pm10,us_aqi');
  url.searchParams.set('forecast_hours', '24');
  url.searchParams.set('timezone', 'auto');

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Air-quality upstream returned HTTP ${response.status}`,
      };
    }

    const raw = (await response.json()) as any;
    const current = raw.current;
    if (!current || typeof current.pm2_5 !== 'number') {
      return {
        ok: false,
        error: 'Air-quality upstream returned incomplete PM2.5 readings.',
      };
    }

    const pm25Val = Math.round(current.pm2_5 * 10) / 10;
    const spreadFrac = TELEMETRY_SPREAD_PRIORS.spread_fraction;
    const lowSpread = Math.max(0, Math.round(pm25Val * (1 - spreadFrac) * 10) / 10);
    const highSpread = Math.round(pm25Val * (1 + spreadFrac) * 10) / 10;

    const asOfIso = new Date().toISOString();
    const ageMin = 0;
    const times = raw.hourly?.time ?? [];
    if (times.length > 0) {
      const sanitizedTime = String(times[0]).replace(/[\r\n]/g, '');
      console.log('[Open-Meteo Telemetry] hourly.time[0]:', sanitizedTime);
    }
    const hourlyPm25 = raw.hourly?.pm2_5 ?? [];
    const hourlyPm10 = raw.hourly?.pm10 ?? [];
    const hourlyUsAqi = raw.hourly?.us_aqi ?? [];

    const hourlyForecast: AirQualityPoint[] = times.slice(0, 24).map((t: string, idx: number) => ({
      time: t,
      pm2_5: typeof hourlyPm25[idx] === 'number' ? Math.round((hourlyPm25[idx] as number) * 10) / 10 : null,
      pm10: typeof hourlyPm10[idx] === 'number' ? Math.round((hourlyPm10[idx] as number) * 10) / 10 : null,
      us_aqi: typeof hourlyUsAqi[idx] === 'number' ? Math.round(hourlyUsAqi[idx] as number) : null,
    }));

    const summary: AirQualitySummary = {
      tool_ref: makeToolRef('aq'),
      grid_id: gridId,
      city: region.city,
      neighborhood: region.neighborhood,
      latitude: lat,
      longitude: lon,
      pm2_5: pm25Val,
      pm2_5_unit: 'µg/m³',
      pm2_5_range: `${lowSpread}–${highSpread} µg/m³ (±12% grid spread)`,
      pm10: typeof current.pm10 === 'number' ? Math.round(current.pm10 * 10) / 10 : null,
      us_aqi: typeof current.us_aqi === 'number' ? Math.round(current.us_aqi) : null,
      european_aqi: typeof current.european_aqi === 'number' ? Math.round(current.european_aqi) : null,
      no2: typeof current.nitrogen_dioxide === 'number' ? Math.round(current.nitrogen_dioxide * 10) / 10 : null,
      confidence: 'medium',
      source: 'Open-Meteo / CAMS Global Atmospheric Composition Grid',
      as_of: asOfIso,
      data_age_minutes: ageMin,
      is_stale: ageMin > maxDataAgeMin,
      hourly_forecast: hourlyForecast,
      cleanest_window: findWindow(hourlyForecast, 'min', 3),
      peak_window: findWindow(hourlyForecast, 'max', 3),
    };

    pruneAqCache();
    aqCache.set(cacheKey, { fetchedAtMs: Date.now(), summary });
    aqCache.set(gridId, { fetchedAtMs: Date.now(), summary });
    return { ok: true, data: summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    return {
      ok: false,
      error: `Failed to fetch live air quality: ${message}`,
    };
  }
}
