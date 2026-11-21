import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  RuntimeContextSchema,
  PlanRequestSchema,
} from '@nirvaat/contracts';
import {
  reindexForecastByClockHour,
  scoreAndRankActions,
  pickPriorityMember,
  DELHI_WINTER_24H_PM25,
} from '@nirvaat/engines';
import { auditDraftPlan } from '@nirvaat/verifier';
import { runNirvaatCopilot } from '../nirvaatEngine.ts';
import { fetchLiveAirQualitySummary, roundCoarseCoord } from '../openMeteoClient.ts';
import { ValidationError } from '../errors/NirvaatError.ts';
import { assembleDeterministicPlan } from './planResponseFormatters.ts';

const router = Router();

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) cleaned[key] = stripUndefinedDeep(val);
    }
    return cleaned as T;
  }
  return value;
}

// POST /api/plan - Full LLM copilot plan generation with auditor & red-flag triage
router.post('/plan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = PlanRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError('Invalid plan request payload.', {
        issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
    }

    const cleanInput = stripUndefinedDeep(parsed.data);
    const rt = cleanInput.runtime as any;
    if (rt?.region?.latitude) {
      rt.region.latitude = roundCoarseCoord(rt.region.latitude);
      rt.region.longitude = roundCoarseCoord(rt.region.longitude);
      rt.region.grid_id = `${rt.region.latitude.toFixed(2)}_${rt.region.longitude.toFixed(2)}`;
    }

    const result = await runNirvaatCopilot(cleanInput.query, rt);
    const createdAt = new Date().toISOString();

    res.json(
      stripUndefinedDeep({
        plan: result.plan,
        tool_traces: result.tool_traces,
        audit: result.audit,
        model_used: result.model_used,
        created_at: createdAt,
      })
    );
  } catch (err) {
    next(err);
  }
});

const EnginePlanBodySchema = z.object({
  runtime: RuntimeContextSchema,
}).strict();

// POST /api/engines/plan - High-speed deterministic plan calculation (0 LLM calls)
router.post('/engines/plan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = EnginePlanBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError('Invalid runtime payload for deterministic plan.', { issues: parsed.error.issues });
    }

  const rt = stripUndefinedDeep(parsed.data.runtime);
  const lat = roundCoarseCoord(rt.region.latitude);
  const lon = roundCoarseCoord(rt.region.longitude);

  const t0 = performance.now();
  const aqRes = await fetchLiveAirQualitySummary(
    { ...rt.region, latitude: lat, longitude: lon, grid_id: `${lat.toFixed(2)}_${lon.toFixed(2)}` },
    rt.max_data_age_min,
    rt.simulated_degradation ?? 'none'
  );
  const aqDurationMs = Math.max(1, Math.round(performance.now() - t0));

  let startHour = 0;
  let hasImputation = false;
  let forecastHourly: number[] = [];

  if (aqRes.ok && aqRes.data.hourly_forecast && aqRes.data.hourly_forecast.length >= 12) {
    if (aqRes.data.hourly_forecast[0]?.time) {
      const parsedHour = Number.parseInt(aqRes.data.hourly_forecast[0].time.split('T')[1]?.split(':')[0] ?? '', 10);
      if (!Number.isNaN(parsedHour)) startHour = parsedHour;
    }
    const rawHourly = aqRes.data.hourly_forecast.map((p) => p.pm2_5 ?? aqRes.data.pm2_5 ?? 120);
    forecastHourly = reindexForecastByClockHour(rawHourly, startHour);
    hasImputation = aqRes.data.hourly_forecast.some((p) => typeof p.pm2_5 !== 'number');
  } else {
    forecastHourly = DELHI_WINTER_24H_PM25;
    hasImputation = true;
  }

  const isSimulatedDegradation = (rt.simulated_degradation ?? 'none') !== 'none';
  const isUsingFallback = !aqRes.ok || !aqRes.data.hourly_forecast || aqRes.data.hourly_forecast.length < 12;
  const dataStatus: 'tier_A' | 'tier_B' | 'tier_C' =
    isSimulatedDegradation || isUsingFallback ? 'tier_C' : hasImputation ? 'tier_B' : 'tier_A';
  const isLive = dataStatus === 'tier_A';

  const engineProfile = {
    ...rt.profile,
    home: {
      ...rt.profile.home,
      purifier: {
        has: rt.profile.home.purifier.has,
        type: rt.profile.home.purifier.type,
        cadr_m3_hr: rt.profile.home.purifier.cadr_m3_hr ?? (rt.profile.home.purifier as any).cadr ?? 0,
      },
    },
  };

  const baseSchedule = Array.from({ length: forecastHourly.length }, (_, i) => {
    const clockHour = (startHour + i) % 24;
    if (rt.profile.constraints.outdoor_work && clockHour >= 9 && clockHour <= 14) {
      return { hour_index: clockHour, micro_env: 'outdoors' as const, activity: 'moderate' as const, mask: 'none' as const };
    }
    if (clockHour === 8 || clockHour === 18) {
      return { hour_index: clockHour, micro_env: 'commute' as const, activity: 'light' as const, mask: 'none' as const, commute_mode: rt.profile.commute.mode };
    }
    return {
      hour_index: clockHour,
      micro_env: 'home' as const,
      activity: clockHour >= 22 || clockHour <= 6 ? ('rest' as const) : ('light' as const),
      mask: 'none' as const,
    };
  });

  const t1 = performance.now();
  const scoredEnv = scoreAndRankActions(engineProfile, baseSchedule, forecastHourly, undefined, `score_${Date.now().toString(36)}`);
  const scoreDurationMs = Math.max(1, Math.round(performance.now() - t1));

  const isHindi = rt.locale.toLowerCase().startsWith('hi');
  const priorityMember = pickPriorityMember(engineProfile);
  const cleanestLabel = aqRes.ok && aqRes.data.cleanest_window ? aqRes.data.cleanest_window.label : '13:00–16:00';
  const currentPm = aqRes.ok ? aqRes.data.pm2_5 : null;

  const whenMap: Record<string, string> = {
    seal_gaps: isHindi ? 'शाम 7 बजे से सुबह 10 बजे तक' : 'Evening 19:00 through 10:00 AM peak',
    close_windows_inversion: isHindi ? 'रात और सुबह की स्मॉग अवधि में' : 'Overnight & morning inversion hours',
    diy_filter: isHindi ? 'सोने से 1 घंटा पहले और पूरी रात' : '1h pre-sleep & all night (door closed)',
    run_purifier_presleep: isHindi ? 'सोने से 1 घंटा पहले और पूरी रात' : '1h pre-sleep & overnight',
    cook_with_hood_window: isHindi ? 'हर बार खाना पकाते समय' : 'During every cooking session',
    time_shift_commute: isHindi ? `सबसे साफ समय (${cleanestLabel})` : `Cleanest dispersion window (${cleanestLabel})`,
    n95_on_commute: isHindi ? 'बाहर निकलते समय (2+ वर्ष)' : 'During outdoor commute/shift (ages 2+)',
    avoid_incense: isHindi ? 'बंद कमरों में पूरे दिन' : 'Whenever exterior windows are closed',
    ventilate_afternoon_window: isHindi ? `दोपहर की साफ खिड़की (${cleanestLabel})` : `Brief 20m flush at ${cleanestLabel}`,
  };

  const plan = assembleDeterministicPlan({
    rt,
    isHindi,
    dataStatus,
    isLive,
    currentPm: currentPm ?? 120,
    priorityMember,
    scoredEnv,
    aqRes,
    whenMap,
  });

  const traces = [
    {
      call_id: aqRes.ok ? aqRes.data.tool_ref : 'aq_unavailable',
      tool_name: 'get_air_quality' as const,
      args: { grid_id: `${lat.toFixed(2)}_${lon.toFixed(2)}` },
      result: aqRes.ok ? { call_id: aqRes.data.tool_ref, ok: true, value: { pm2_5: aqRes.data.pm2_5, cleanest_window: aqRes.data.cleanest_window } } : { ok: false, error: aqRes.error },
      status: aqRes.ok ? ('ok' as const) : ('failed' as const),
      duration_ms: aqDurationMs,
      timestamp: new Date().toISOString(),
    },
    {
      call_id: scoredEnv.call_id,
      tool_name: 'impact_estimate' as const,
      args: { priority_member: priorityMember.label, preset_count: scoredEnv.value.top_actions.length },
      result: scoredEnv as unknown as Record<string, unknown>,
      status: 'ok' as const,
      duration_ms: scoreDurationMs,
      timestamp: new Date().toISOString(),
    },
  ];

  const audit = auditDraftPlan(plan as any, rt, traces as any, dataStatus);

  res.json(
    stripUndefinedDeep({
      plan,
      audit,
      tool_traces: traces,
      model_used: 'deterministic-physics-engine',
      created_at: new Date().toISOString(),
    })
  );
  } catch (err) {
    next(err);
  }
});

export default router;
