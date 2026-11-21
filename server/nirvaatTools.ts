import {
  RuntimeContext,
  ToolCallTrace,
} from '@nirvaat/contracts';
import {
  impactEstimate,
  WORKED_SCENARIOS,
  ImpactEstimateInput,
} from '@nirvaat/engines';
import {
  fetchLiveAirQualitySummary,
} from './openMeteoClient.ts';
import { GUIDANCE_LIBRARY } from './guidanceRegistry.ts';

export {
  fetchLiveAirQualitySummary,
  getAqCacheSize,
  getAqMetrics,
  resetAqMetrics,
  clearAqCache,
  roundCoarseCoord,
} from './openMeteoClient.ts';

export { PRESET_REGIONS, GUIDANCE_LIBRARY } from './guidanceRegistry.ts';
export { reindexForecastByClockHour } from '@nirvaat/engines';

function makeToolRef(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
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
          args: rawArgs,
          result: errResult,
          status: 'degraded',
          duration_ms: Math.max(1, Date.now() - started),
          timestamp,
        },
        responseObj: errResult,
      };
    }

    const payload = {
      call_id: callId,
      ok: true,
      value: {
        pm2_5: res.data.pm2_5,
        pm10: res.data.pm10,
        us_aqi: res.data.us_aqi,
        european_aqi: res.data.european_aqi,
        no2: res.data.no2,
        grid_id: res.data.grid_id,
        as_of: res.data.as_of,
        data_age_minutes: res.data.data_age_minutes,
        is_stale: res.data.is_stale,
      },
      unit: 'ug/m3',
      range: [Math.round((res.data.pm2_5 ?? 100) * 0.88), Math.round((res.data.pm2_5 ?? 100) * 1.12)],
      confidence: res.data.confidence,
      source: res.data.source,
      as_of: res.data.as_of,
      notes: res.data.pm2_5_range,
    };

    return {
      trace: {
        call_id: callId,
        tool_name: 'get_air_quality',
        args: rawArgs,
        result: payload,
        status: 'ok',
        duration_ms: Math.max(1, Date.now() - started),
        timestamp,
      },
      responseObj: payload,
    };
  }

  if (toolName === 'get_forecast') {
    const callId = makeToolRef('fc');
    const res = await fetchLiveAirQualitySummary(runtime.region, runtime.max_data_age_min, sim);
    if (!res.ok) {
      const errPayload = {
        call_id: callId,
        ok: false,
        value: {},
        unit: 'ug/m3',
        range: [0, 0],
        confidence: 'low',
        source: runtime.region.official_source,
        as_of: timestamp,
        notes: `${res.error} Switch to tier_C general guidance.`,
      };
      return {
        trace: {
          call_id: callId,
          tool_name: 'get_forecast',
          args: rawArgs,
          result: errPayload,
          status: 'degraded',
          duration_ms: Math.max(1, Date.now() - started),
          timestamp,
        },
        responseObj: errPayload,
      };
    }

    const payload = {
      call_id: callId,
      ok: true,
      value: {
        hourly_pm25: res.data.hourly_forecast.map((p) => p.pm2_5),
        cleanest_window: res.data.cleanest_window,
        peak_window: res.data.peak_window,
      },
      unit: 'ug/m3',
      range: [
        Math.min(...res.data.hourly_forecast.map((p) => p.pm2_5 ?? 120)),
        Math.max(...res.data.hourly_forecast.map((p) => p.pm2_5 ?? 120)),
      ],
      confidence: res.data.confidence,
      source: res.data.source,
      as_of: res.data.as_of,
      notes: '24-hour Open-Meteo atmospheric forecast.',
    };

    return {
      trace: {
        call_id: callId,
        tool_name: 'get_forecast',
        args: rawArgs,
        result: payload,
        status: 'ok',
        duration_ms: Math.max(1, Date.now() - started),
        timestamp,
      },
      responseObj: payload,
    };
  }

  if (toolName === 'impact_estimate') {
    const callId = makeToolRef('imp');
    if (sim === 'no_impact' || sim === 'all_down') {
      const errPayload = {
        call_id: callId,
        ok: false,
        value: {},
        unit: 'ug',
        range: [0, 0],
        confidence: 'low',
        source: 'NIRVAAT Physics Simulation (offline/degraded)',
        as_of: timestamp,
        notes: 'Impact calculation unavailable. Downgrade to tier_B/tier_C qualitative recommendations.',
      };
      return {
        trace: {
          call_id: callId,
          tool_name: 'impact_estimate',
          args: rawArgs,
          result: errPayload,
          status: 'degraded',
          duration_ms: Math.max(1, Date.now() - started),
          timestamp,
        },
        responseObj: errPayload,
      };
    }

    const action = (typeof rawArgs.action_type === 'string' ? rawArgs.action_type : 'seal_gaps') as any;
    const outdoorPm25 = Number(rawArgs.outdoor_pm25 || 250);
    const hourlyForecast = Array.from({ length: 24 }, () => outdoorPm25);

    const input: ImpactEstimateInput = {
      profile: runtime.profile,
      target_member_age_band: runtime.profile.members[0]?.age_band ?? 'adult',
      schedule: WORKED_SCENARIOS.leaky_1bhk_toddler.schedule,
      action,
      forecast_pm25_hourly: hourlyForecast,
      num_draws: 150,
    };

    const envelope = impactEstimate(input, callId, timestamp);
    const val = envelope.value;

    const payload = {
      call_id: callId,
      ok: true,
      value: {
        action: val.action,
        with: `${val.daily_with_ug.median} ug/day`,
        without: `${val.daily_without_ug.median} ug/day`,
        change_range: `-${val.daily_reduction_pct.q10}% to -${val.daily_reduction_pct.q90}% (median -${val.daily_reduction_pct.median}%)`,
        dose_avoided_median_ug: val.dose_avoided_median_ug,
        top_uncertainties: val.top_uncertainties,
      },
      unit: 'ug',
      range: envelope.range,
      confidence: envelope.confidence,
      source: envelope.source,
      as_of: envelope.as_of,
      notes: envelope.notes,
    };

    return {
      trace: {
        call_id: callId,
        tool_name: 'impact_estimate',
        args: rawArgs,
        result: payload,
        status: 'ok',
        duration_ms: Math.max(1, Date.now() - started),
        timestamp,
      },
      responseObj: payload,
    };
  }

  // retrieve_guidance
  const callId = makeToolRef('gui');
  const topic = (typeof rawArgs.topic === 'string' ? rawArgs.topic : '').toLowerCase();
  const matched = GUIDANCE_LIBRARY.filter(
    (g) => g.topic.toLowerCase().includes(topic) || g.sensitive_groups.some((sg) => topic.includes(sg))
  );
  const selected = matched.length > 0 ? matched : [GUIDANCE_LIBRARY[0]];

  const payload = {
    call_id: callId,
    ok: true,
    value: {
      records: selected,
    },
    unit: 'guidance',
    range: [0, selected.length],
    confidence: selected[0]?.evidence === 'strong' ? 'high' : 'medium',
    source: selected[0]?.source ?? 'Public Health Evidence Base',
    as_of: timestamp,
    notes: selected[0]?.summary ?? '',
  };

  return {
    trace: {
      call_id: callId,
      tool_name: 'retrieve_guidance',
      args: rawArgs,
      result: payload,
      status: 'ok',
      duration_ms: Math.max(1, Date.now() - started),
      timestamp,
    },
    responseObj: payload,
  };
}
