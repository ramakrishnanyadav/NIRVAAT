import {
  AirQualityPoint,
  AirQualitySummary,
  ConfidenceLevel,
  GuidanceEntry,
  RegionConfig,
  RuntimeContext,
  ToolCallTrace,
} from '../src/shared/nirvaatTypes.ts';
import { reindexForecastByClockHour } from '../packages/engines/src/index.ts';

export { reindexForecastByClockHour };

export const PRESET_REGIONS: RegionConfig[] = [
  {
    city: 'Delhi NCR',
    neighborhood: 'Anand Vihar · East Grid',
    grid_id: '28.65_77.31',
    latitude: 28.65,
    longitude: 77.31,
    emergency_number: '112',
    official_source: 'CPCB Sameer / SAFAR India',
    active_policy: 'GRAP Stage IV Winter Emergency Measures',
  },
  {
    city: 'Delhi NCR',
    neighborhood: 'RK Puram · South Grid',
    grid_id: '28.56_77.18',
    latitude: 28.56,
    longitude: 77.18,
    emergency_number: '112',
    official_source: 'CPCB Sameer / SAFAR India',
    active_policy: 'GRAP Stage IV Winter Emergency Measures',
  },
  {
    city: 'Lahore',
    neighborhood: 'Gulberg · Central Grid',
    grid_id: '31.52_74.35',
    latitude: 31.52,
    longitude: 74.35,
    emergency_number: '1122',
    official_source: 'Punjab EPA Smog Monitoring',
    active_policy: 'Winter Smog School & Outdoor Restriction',
  },
  {
    city: 'Kathmandu',
    neighborhood: 'Lalitpur · Valley Basin',
    grid_id: '27.68_85.32',
    latitude: 27.68,
    longitude: 85.32,
    emergency_number: '102',
    official_source: 'Nepal DoE Air Quality Portal',
    active_policy: 'Morning Valley Inversion Advisory',
  },
  {
    city: 'Salt Lake City',
    neighborhood: 'Salt Lake Valley · UT',
    grid_id: '40.76_-111.89',
    latitude: 40.76,
    longitude: -111.89,
    emergency_number: '911',
    official_source: 'Utah DEQ / US EPA AirNow',
    active_policy: 'Mandatory Winter Inversion Action',
  },
  {
    city: 'Bakersfield',
    neighborhood: 'San Joaquin Valley · CA',
    grid_id: '35.37_-119.02',
    latitude: 35.37,
    longitude: -119.02,
    emergency_number: '911',
    official_source: 'Valley Air / US EPA AirNow',
    active_policy: 'Check Before You Burn Advisory',
  },
];

export const GUIDANCE_LIBRARY: GuidanceEntry[] = [
  {
    id: 'guide_masks_pediatric',
    topic: 'masks_children_and_fit',
    title: 'Mask Selection, Fit & Pediatric Age Limits',
    evidence: 'strong',
    summary:
      'Well-fitted N95/KN95/KF94 respirators cut inhaled PM2.5 by roughly 80–92% when sealed around the nose and cheeks. Loose cloth or gapping surgical masks provide far lower filtration (often 25–45%). Children under age 2 must NEVER wear any mask due to suffocation risk.',
    do_this: [
      'Use child-sized KF94 or KN95 respirators with nose-bridge wire and snug ear/head straps only for children aged 2+ who can remove them independently.',
      'Check for air leaks around the nose and chin before stepping into heavy traffic or morning smog.',
    ],
    avoid_this: [
      'Never put a mask or face covering on infants or toddlers under 2 years old.',
      'Do not rely on loose cloth scarves or dupattas for fine PM2.5 smog protection.',
    ],
    source: 'US EPA / CDC / AAP Pediatric Air Pollution Guidance',
    sensitive_groups: ['infant_under_2', 'child_2_12', 'asthma', 'pregnancy', 'outdoor_worker'],
  },
  {
    id: 'guide_purifier_diy',
    topic: 'purifier_and_diy_cr_box',
    title: 'Clean-Air Room & DIY Corsi-Rosenthal Box Fans',
    evidence: 'strong',
    summary:
      'Running a true HEPA purifier or a low-cost DIY box-fan filter (MERV-13 filter taped to a standard box fan) in a closed sleeping room reduces indoor PM2.5 by 50–75% within 45–60 minutes.',
    do_this: [
      'Create one "cleanest room" (usually the bedroom where infants, pregnant family members, or older adults sleep) and keep its door closed.',
      'If commercial HEPA purifiers are unaffordable, tape a MERV-13 furnace filter securely to the intake side of a standard box fan with cardboard shroud.',
    ],
    avoid_this: [
      'Never use ozone generators or ionizers/plasma "purifiers" that emit lung-irritating ozone.',
      'Do not expect indoor houseplants to clean room PM2.5; peer-reviewed studies show negligible effect.',
    ],
    source: 'US EPA Indoor Air / ASHRAE Filtration Studies',
    sensitive_groups: ['infant_under_2', 'pregnancy', 'older_adult_65_plus', 'asthma', 'copd'],
  },
  {
    id: 'guide_ventilation_timing',
    topic: 'ventilation_and_timing',
    title: 'Winter Inversion Timing & Window Management',
    evidence: 'moderate',
    summary:
      'During winter thermal inversions, PM2.5 typically spikes overnight and in early morning hours (06:00–10:00) and dips in early-to-mid afternoon (13:00–16:00) when solar warming lifts the boundary layer.',
    do_this: [
      'Keep exterior windows and door gaps sealed during evening/morning peaks using rolled damp towels or low-cost foam weatherstripping.',
      'Flush indoor CO2 and cooking moisture by briefly cross-ventilating only during the lowest-PM2.5 afternoon window identified in the live forecast.',
    ],
    avoid_this: [
      'Avoid sleeping with windows cracked open during winter inversion nights when outdoor PM2.5 exceeds indoor levels.',
      'Avoid outdoor brisk exercise or school walks during morning rush-hour inversion peaks.',
    ],
    source: 'WHO Global Air Quality Guidelines / Boundary Layer Exposure Studies',
    sensitive_groups: ['infant_under_2', 'child_2_12', 'pregnancy', 'older_adult_65_plus', 'outdoor_worker'],
  },
  {
    id: 'guide_source_control',
    topic: 'indoor_source_control',
    title: 'Cooking, Heating & Indoor Combustion Control',
    evidence: 'strong',
    summary:
      'Indoor combustion (frying/tadka on gas stoves, incense, mosquito coils, biomass/charcoal heating) can raise room PM2.5 above severe outdoor smog levels in minutes, especially in closed winter rooms.',
    do_this: [
      'Always use an exhaust fan, kitchen hood, or brief window crack strictly in the kitchen with the kitchen door closed to the rest of the flat.',
      'Cover pans with lids, switch high-smoke tempering/frying to pressure-cooking or boiling during smog peaks, and pause incense/dhoop/mosquito coils.',
    ],
    avoid_this: [
      'Never burn camphor, dhoop, herbs, or coal/wood indoors to "purify" or warm a closed room.',
      'Do not use unvented kerosene or charcoal space heaters indoors.',
    ],
    source: 'WHO Indoor Air Quality Guidelines: Household Fuel Combustion',
    sensitive_groups: ['infant_under_2', 'pregnancy', 'asthma', 'copd', 'older_adult_65_plus'],
  },
  {
    id: 'guide_outdoor_workers',
    topic: 'outdoor_worker_safety',
    title: 'Outdoor Worker & Commuter Protection Within Job Constraints',
    evidence: 'moderate',
    summary:
      'Workers who cannot stay indoors can cut inhaled fine-particle dose by switching to lower-exertion pacing, avoiding high-traffic curb lanes, and wearing a tight-sealing N95/KN95 (non-valved or valved for heavy labor).',
    do_this: [
      'Take rest breaks indoors or inside enclosed cabs/shops rather than roadside curbs.',
      'Shift physically heaviest lifting or brisk movement away from peak morning/evening traffic hours when schedule permits.',
    ],
    avoid_this: [
      'Do not advise outdoor workers to simply "stay home" without addressing shift realities.',
      'Avoid loose surgical masks for full-shift roadside exposure; replace damp or clogged N95s.',
    ],
    source: 'NIOSH / ILO Occupational Ambient PM2.5 Guidance',
    sensitive_groups: ['outdoor_worker', 'asthma', 'heart_disease'],
  },
  {
    id: 'guide_pregnancy_elderly',
    topic: 'pregnancy_elderly_cardiopulmonary',
    title: 'Protecting Pregnancy, Older Adults & Cardiopulmonary Conditions',
    evidence: 'strong',
    summary:
      'Fine particles (PM2.5) cross into the bloodstream and increase inflammatory stress during pregnancy and in adults with asthma, COPD, or cardiovascular disease.',
    do_this: [
      'Prioritize clean sleeping air (closed bedroom + HEPA or DIY filter) since 8–10 hours of overnight protection removes ~35–45% of daily total dose.',
      'Keep prescribed reliever inhalers or regular medications accessible and follow your clinician’s existing action plan without altering doses.',
    ],
    avoid_this: [
      'Never stop, start, or adjust prescribed medications based on air-quality alerts without a clinician.',
      'Do not delay emergency medical care if chest tightness, severe breathlessness, confusion, or unrelieved wheeze occurs.',
    ],
    source: 'AHA / ACOG / GOLD COPD Environmental Exposure Guidance',
    sensitive_groups: ['pregnancy', 'older_adult_65_plus', 'asthma', 'copd', 'heart_disease'],
  },
];

// Simple 5-minute in-memory cache keyed by coarse 2-decimal grid cell (privacy-preserving)
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

export function roundCoarseCoord(coord: number): number {
  return Math.round(coord * 100) / 100;
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

    const raw = (await response.json()) as {
      current?: {
        time?: string;
        pm2_5?: number | null;
        pm10?: number | null;
        us_aqi?: number | null;
        european_aqi?: number | null;
        nitrogen_dioxide?: number | null;
      };
      hourly?: {
        time?: string[];
        pm2_5?: (number | null)[];
        pm10?: (number | null)[];
        us_aqi?: (number | null)[];
      };
    };

    const current = raw.current;
    if (!current || typeof current.pm2_5 !== 'number') {
      return {
        ok: false,
        error: 'Air-quality upstream returned incomplete PM2.5 readings.',
      };
    }

    const pm25Val = Math.round(current.pm2_5 * 10) / 10;
    const lowSpread = Math.max(0, Math.round(pm25Val * 0.88 * 10) / 10);
    const highSpread = Math.round(pm25Val * 1.12 * 10) / 10;

    // Open-Meteo `current.time` is local wall time without offset when timezone=auto; record exact ISO UTC fetch timestamp if offset missing
    const asOfIso = new Date().toISOString();
    const ageMin = 0;

    const times = raw.hourly?.time ?? [];
    if (times.length > 0) {
      console.log('[Open-Meteo Telemetry] hourly.time[0]:', times[0]);
    }
    const hourlyPm25 = raw.hourly?.pm2_5 ?? [];
    const hourlyPm10 = raw.hourly?.pm10 ?? [];
    const hourlyUsAqi = raw.hourly?.us_aqi ?? [];

    const hourlyForecast: AirQualityPoint[] = times.slice(0, 24).map((t, idx) => ({
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

export async function executeNirvaatTool(
  toolName: 'get_air_quality' | 'get_forecast' | 'impact_estimate' | 'retrieve_guidance',
  rawArgs: Record<string, unknown>,
  runtime: RuntimeContext
): Promise<{ trace: ToolCallTrace; responseObj: Record<string, unknown> }> {
  const started = Date.now();
  const timestamp = new Date().toISOString();
  const sim = runtime.simulated_degradation ?? 'none';

  if (toolName === 'get_air_quality') {
    const callId = makeToolRef('aq');
    const res = await fetchLiveAirQualitySummary(runtime.region, runtime.max_data_age_min, sim);
    if (!res.ok) {
      const errResult = {
        call_id: callId,
        ok: false,
        value: {},
        unit: 'ug/m3',
        range: [0, 0],
        confidence: 'low',
        source: runtime.region.official_source,
        as_of: timestamp,
        notes: `${res.error} Switch to tier_C general guidance labeled "general guidance, no live data".`,
      };
      return {
        trace: {
          call_id: callId,
          tool_name: 'get_air_quality',
          args: { grid_id: runtime.region.grid_id, city: runtime.region.city },
          result: errResult,
          status: 'failed',
          duration_ms: Date.now() - started,
          timestamp,
        },
        responseObj: errResult,
      };
    }

    const d = res.data;
    const pm25 = d.pm2_5 ?? 0;
    const low = Math.max(0, Math.round(pm25 * 0.88 * 10) / 10);
    const high = Math.round(pm25 * 1.12 * 10) / 10;
    const okResult = {
      call_id: callId,
      ok: true,
      value: {
        grid_id: d.grid_id,
        city: d.city,
        neighborhood: d.neighborhood,
        pm2_5: d.pm2_5,
        pm10: d.pm10,
        us_aqi: d.us_aqi,
        european_aqi: d.european_aqi,
        no2: d.no2,
        data_age_minutes: d.data_age_minutes,
        is_stale: d.is_stale,
      },
      unit: 'ug/m3',
      range: [low, high],
      confidence: d.confidence,
      source: d.source,
      as_of: d.as_of,
      notes: d.is_stale
        ? `Data age ${d.data_age_minutes}m exceeds max ${runtime.max_data_age_min}m; degrade to general guidance.`
        : `Live grid reading (±12% spatial spread) for ${d.neighborhood}.`,
    };

    return {
      trace: {
        call_id: callId,
        tool_name: 'get_air_quality',
        args: { grid_id: runtime.region.grid_id, city: runtime.region.city },
        result: okResult,
        status: d.is_stale ? 'degraded' : 'ok',
        duration_ms: Date.now() - started,
        timestamp,
      },
      responseObj: okResult,
    };
  }

  if (toolName === 'get_forecast') {
    const callId = makeToolRef('fc');
    const hoursRaw = typeof rawArgs.hours === 'number' ? rawArgs.hours : 12;
    const hours = Math.min(24, Math.max(6, Math.round(hoursRaw)));
    const res = await fetchLiveAirQualitySummary(runtime.region, runtime.max_data_age_min, sim);

    if (!res.ok) {
      const errResult = {
        call_id: callId,
        ok: false,
        value: {},
        unit: 'ug/m3',
        range: [0, 0],
        confidence: 'low',
        source: runtime.region.official_source,
        as_of: timestamp,
        notes: res.error,
      };
      return {
        trace: {
          call_id: callId,
          tool_name: 'get_forecast',
          args: { grid_id: runtime.region.grid_id, hours },
          result: errResult,
          status: 'failed',
          duration_ms: Date.now() - started,
          timestamp,
        },
        responseObj: errResult,
      };
    }

    const slice = res.data.hourly_forecast.slice(0, hours);
    const pmVals = slice.map((p) => p.pm2_5).filter((v): v is number => typeof v === 'number');
    const minVal = pmVals.length ? Math.min(...pmVals) : 0;
    const maxVal = pmVals.length ? Math.max(...pmVals) : 0;

    const okResult = {
      call_id: callId,
      ok: true,
      value: {
        grid_id: res.data.grid_id,
        horizon_hours: slice.length,
        cleanest_window: res.data.cleanest_window,
        peak_window: res.data.peak_window,
        next_12h_points: slice.slice(0, 12).map((p) => ({
          time: p.time,
          pm2_5: p.pm2_5,
          us_aqi: p.us_aqi,
        })),
      },
      unit: 'ug/m3',
      range: [minVal, maxVal],
      confidence: 'medium',
      source: res.data.source,
      as_of: res.data.as_of,
      notes: res.data.cleanest_window
        ? `Lowest 3h window ${res.data.cleanest_window.label} (~${res.data.cleanest_window.avg_pm2_5} ug/m3).`
        : 'Hourly atmospheric dispersion forecast.',
    };

    return {
      trace: {
        call_id: callId,
        tool_name: 'get_forecast',
        args: { grid_id: runtime.region.grid_id, hours },
        result: okResult,
        status: 'ok',
        duration_ms: Date.now() - started,
        timestamp,
      },
      responseObj: okResult,
    };
  }

  if (toolName === 'impact_estimate') {
    const callId = makeToolRef('imp');
    if (sim === 'no_impact' || sim === 'all_down') {
      const errResult = {
        call_id: callId,
        ok: false,
        value: {},
        unit: 'ug/m3',
        range: [0, 0],
        confidence: 'low',
        source: 'NIRVAAT Single-Zone PM2.5 Mass-Balance Model',
        as_of: timestamp,
        notes:
          'Impact estimator unavailable. Switch to tier_B: rank actions with qualitative effect ("large", "moderate", "small") and omit percentages.',
      };
      return {
        trace: {
          call_id: callId,
          tool_name: 'impact_estimate',
          args: rawArgs,
          result: errResult,
          status: 'failed',
          duration_ms: Date.now() - started,
          timestamp,
        },
        responseObj: errResult,
      };
    }

    const actionType = String(rawArgs.action_type ?? 'diy_corsi_rosenthal');
    const outdoorPm25 =
      typeof rawArgs.outdoor_pm25 === 'number' && rawArgs.outdoor_pm25 > 0
        ? rawArgs.outdoor_pm25
        : 120;
    const durationHours =
      typeof rawArgs.duration_hours === 'number' && rawArgs.duration_hours > 0
        ? Math.min(24, rawArgs.duration_hours)
        : 8;
    const altOutdoorPm25 =
      typeof rawArgs.alternative_outdoor_pm25 === 'number' && rawArgs.alternative_outdoor_pm25 > 0
        ? rawArgs.alternative_outdoor_pm25
        : Math.round(outdoorPm25 * 0.62 * 10) / 10;

    let metric = `PM2.5 exposure over ${durationHours}h`;
    let withoutLow = 0;
    let withoutHigh = 0;
    let withLow = 0;
    let withHigh = 0;
    let pctMin = 0;
    let pctMax = 0;
    let confidence: ConfidenceLevel = 'medium';
    let modelNote = '';

    if (actionType === 'hepa_purifier' || actionType === 'diy_corsi_rosenthal') {
      metric = `Indoor bedroom PM2.5 (${durationHours}h stay)`;
      withoutLow = Math.round(outdoorPm25 * 0.58);
      withoutHigh = Math.round(outdoorPm25 * 0.72);
      const factorLow = actionType === 'hepa_purifier' ? 0.24 : 0.28;
      const factorHigh = actionType === 'hepa_purifier' ? 0.38 : 0.42;
      withLow = Math.round(withoutLow * factorLow);
      withHigh = Math.round(withoutHigh * factorHigh);
      pctMin = Math.round((1 - factorHigh) * 100);
      pctMax = Math.round((1 - factorLow) * 100);
      confidence = 'medium';
      modelNote = 'Single-zone mass balance for closed bedroom (~35 m3), steady CADR 260-340 m3/h.';
    } else if (actionType === 'window_sealing_and_closing') {
      metric = `Indoor infiltration PM2.5 (${durationHours}h peak)`;
      withoutLow = Math.round(outdoorPm25 * 0.72);
      withoutHigh = Math.round(outdoorPm25 * 0.85);
      withLow = Math.round(outdoorPm25 * 0.44);
      withHigh = Math.round(outdoorPm25 * 0.56);
      pctMin = 28;
      pctMax = 42;
      confidence = 'medium';
      modelNote = 'Closing windows + towel/weatherstrip sealing halves air exchange rate (ACH 1.4 -> 0.6/h).';
    } else if (actionType === 'timing_shift') {
      metric = `Outdoor activity PM2.5 (${durationHours}h window)`;
      withoutLow = Math.round(outdoorPm25 * 0.9);
      withoutHigh = Math.round(outdoorPm25 * 1.1);
      withLow = Math.round(altOutdoorPm25 * 0.9);
      withHigh = Math.round(altOutdoorPm25 * 1.1);
      const rawDrop =
        outdoorPm25 > 0 ? Math.max(5, Math.round(((outdoorPm25 - altOutdoorPm25) / outdoorPm25) * 100)) : 25;
      pctMin = Math.max(5, rawDrop - 8);
      pctMax = Math.min(80, rawDrop + 8);
      confidence = 'medium';
      modelNote = 'Compares live forecast selected hour against cleanest afternoon dispersion window.';
    } else if (actionType === 'well_fitted_n95_mask') {
      metric = `Inhaled PM2.5 concentration (${durationHours}h outdoor)`;
      withoutLow = Math.round(outdoorPm25 * 0.88);
      withoutHigh = Math.round(outdoorPm25 * 1.12);
      withLow = Math.round(outdoorPm25 * 0.08);
      withHigh = Math.round(outdoorPm25 * 0.22);
      pctMin = 78;
      pctMax = 92;
      confidence = 'high';
      modelNote = 'Assigned real-world N95/KF94 protection with nose-wire seal check (ages 2+ only).';
    } else if (actionType === 'cooking_source_control') {
      metric = `Peak indoor cooking PM2.5 (${durationHours}h)`;
      const baseIn = Math.round(outdoorPm25 * 0.6);
      withoutLow = baseIn + 75;
      withoutHigh = baseIn + 155;
      withLow = baseIn + 15;
      withHigh = baseIn + 35;
      pctMin = 50;
      pctMax = 72;
      confidence = 'medium';
      modelNote = 'Exhaust fan + pan lid + closed kitchen door prevents indoor combustion plume spread.';
    } else {
      metric = `Personal PM2.5 exposure (${durationHours}h)`;
      withoutLow = Math.round(outdoorPm25 * 0.75);
      withoutHigh = Math.round(outdoorPm25 * 0.95);
      withLow = Math.round(outdoorPm25 * 0.45);
      withHigh = Math.round(outdoorPm25 * 0.62);
      pctMin = 25;
      pctMax = 45;
      confidence = 'low';
      modelNote = 'Conservative mass-balance estimate; personal habits vary.';
    }

    const okResult = {
      call_id: callId,
      ok: true,
      value: {
        action_type: actionType,
        metric,
        without: `${withoutLow}–${withoutHigh} ug/m3`,
        with: `${withLow}–${withHigh} ug/m3`,
        change_range: `-${pctMin}% to -${pctMax}%`,
      },
      unit: 'ug/m3',
      range: [withLow, withHigh],
      confidence,
      source: 'NIRVAAT Single-Zone PM2.5 Mass-Balance Model',
      as_of: timestamp,
      notes: modelNote,
    };

    return {
      trace: {
        call_id: callId,
        tool_name: 'impact_estimate',
        args: rawArgs,
        result: okResult,
        status: 'ok',
        duration_ms: Date.now() - started,
        timestamp,
      },
      responseObj: okResult,
    };
  }

  // retrieve_guidance
  const callId = makeToolRef('gd');
  if (sim === 'all_down') {
    const errResult = {
      call_id: callId,
      ok: false,
      value: {},
      unit: 'evidence_grade',
      range: [0, 0],
      confidence: 'low',
      source: 'NIRVAAT Public Health Evidence Store',
      as_of: timestamp,
      notes: 'Guidance retrieval store unavailable.',
    };
    return {
      trace: {
        call_id: callId,
        tool_name: 'retrieve_guidance',
        args: rawArgs,
        result: errResult,
        status: 'failed',
        duration_ms: Date.now() - started,
        timestamp,
      },
      responseObj: errResult,
    };
  }

  const topicQuery = String(rawArgs.topic ?? '').toLowerCase();
  const groupQuery = String(rawArgs.sensitive_group ?? '').toLowerCase();

  const matches = GUIDANCE_LIBRARY.filter((entry) => {
    const hay = `${entry.topic} ${entry.title} ${entry.summary} ${entry.sensitive_groups.join(' ')}`.toLowerCase();
    return (
      (!topicQuery ||
        hay.includes(topicQuery) ||
        topicQuery.split(/\s+/).some((w) => w.length > 2 && hay.includes(w))) &&
      (!groupQuery || entry.sensitive_groups.some((g) => g.includes(groupQuery)) || hay.includes(groupQuery))
    );
  });

  const selected = (matches.length > 0 ? matches : GUIDANCE_LIBRARY.slice(0, 3)).slice(0, 3);
  const okResult = {
    call_id: callId,
    ok: true,
    value: {
      entries: selected.map((e) => ({
        id: e.id,
        title: e.title,
        evidence: e.evidence,
        summary: e.summary,
        do_this: e.do_this,
        avoid_this: e.avoid_this,
        source: e.source,
      })),
    },
    unit: 'evidence_grade',
    range: [1, selected.length],
    confidence: 'high',
    source: 'WHO / US EPA / ASHRAE / AAP Curated Guidance',
    as_of: timestamp,
    notes: `Returned ${selected.length} vetted guidance records.`,
  };

  return {
    trace: {
      call_id: callId,
      tool_name: 'retrieve_guidance',
      args: rawArgs,
      result: okResult,
      status: 'ok',
      duration_ms: Date.now() - started,
      timestamp,
    },
    responseObj: okResult,
  };
}
