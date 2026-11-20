import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  PlanRequestSchema,
  RuntimeContextSchema,
  SavedDecisionRecord,
  stripUndefinedDeep,
} from './src/shared/nirvaatTypes.ts';
import {
  ACTION_LIBRARY,
  DELHI_WINTER_24H_PM25,
  WORKED_SCENARIOS,
  computeInhaledDose,
  pickPriorityMember,
  scoreAndRankActions,
  solveIndoorMassBalance,
} from './packages/engines/src/index.ts';
import { auditDraftPlan, runNirvaatCopilot } from './server/nirvaatEngine.ts';
import {
  GUIDANCE_LIBRARY,
  PRESET_REGIONS,
  fetchLiveAirQualitySummary,
  roundCoarseCoord,
} from './server/nirvaatTools.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// 1. Top-level request deserialization mounted strictly before any route handlers
app.use(express.json({ limit: '64kb' }));

// In-memory store for saved decisions with session isolation and rate limiting
interface RateLimitBucket {
  count: number;
  resetAtMs: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

export function checkRateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);
  if (!bucket || now >= bucket.resetAtMs) {
    rateLimitMap.set(key, { count: 1, resetAtMs: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) {
    return false;
  }
  bucket.count++;
  return true;
}

export function resetRateLimits(): void {
  rateLimitMap.clear();
}

// Session-scoped storage for saved decisions (max 25 per session, bounded session map)
const sessionHistory = new Map<string, SavedDecisionRecord[]>();

export function getSessionHistoryMap(): Map<string, SavedDecisionRecord[]> {
  return sessionHistory;
}

function getSessionId(req: Request): string {
  const header = req.headers['x-nirvaat-session'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim().slice(0, 64);
  }
  const query = req.query.session_id;
  if (typeof query === 'string' && query.trim().length > 0) {
    return query.trim().slice(0, 64);
  }
  return 'default';
}

const SaveHistorySchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  query: z.string().trim().min(1).max(1200),
  region_label: z.string().trim().min(1).max(120),
  channel: z.enum(['APP', 'WHATSAPP', 'SMS', 'VOICE']),
  plan: z.record(z.string(), z.unknown()),
  tool_traces: z.array(z.record(z.string(), z.unknown())),
  model_used: z.string().trim().min(1).max(80),
  created_at: z.string().trim().min(1).max(64).optional(),
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'nirvaat-copilot',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/neighborhoods', (_req: Request, res: Response) => {
  res.json({ regions: PRESET_REGIONS });
});

app.get('/api/guidance', (_req: Request, res: Response) => {
  res.json({ entries: GUIDANCE_LIBRARY });
});

app.get('/api/air-quality', async (req: Request, res: Response) => {
  const latRaw = Number(req.query.lat ?? PRESET_REGIONS[0].latitude);
  const lonRaw = Number(req.query.lon ?? PRESET_REGIONS[0].longitude);
  const maxAgeRaw = Number(req.query.maxAge ?? 60);
  const simRaw = String(req.query.sim ?? 'none');

  if (!Number.isFinite(latRaw) || !Number.isFinite(lonRaw) || latRaw < -90 || latRaw > 90 || lonRaw < -180 || lonRaw > 180) {
    res.status(400).json({ error: 'Invalid coarse latitude or longitude coordinates.' });
    return;
  }

  const lat = roundCoarseCoord(latRaw);
  const lon = roundCoarseCoord(lonRaw);
  const city = typeof req.query.city === 'string' ? req.query.city.slice(0, 60) : 'Custom Grid';
  const neighborhood =
    typeof req.query.neighborhood === 'string'
      ? req.query.neighborhood.slice(0, 60)
      : `Grid ${lat.toFixed(2)}, ${lon.toFixed(2)}`;

  const sim =
    simRaw === 'no_impact' || simRaw === 'no_aq' || simRaw === 'all_down' ? simRaw : 'none';

  const region = {
    city,
    neighborhood,
    grid_id: `${lat.toFixed(2)}_${lon.toFixed(2)}`,
    latitude: lat,
    longitude: lon,
    emergency_number: '112',
    official_source: 'CPCB / Open-Meteo',
    active_policy: 'Winter Smog Advisory',
  };

  const result = await fetchLiveAirQualitySummary(
    region,
    Number.isFinite(maxAgeRaw) ? Math.min(180, Math.max(15, maxAgeRaw)) : 60,
    sim
  );

  if (!result.ok) {
    res.status(503).json({
      ok: false,
      error: result.error,
      grid_id: region.grid_id,
    });
    return;
  }

  res.json({ ok: true, data: result.data });
});

app.post('/api/plan', async (req: Request, res: Response) => {
  const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
  const parsed = PlanRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid plan request payload.',
      details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
    return;
  }

  try {
    const cleanInput = stripUndefinedDeep(parsed.data);
    // Enforce coarse coordinate rounding (H6 Privacy)
    cleanInput.runtime.region.latitude = roundCoarseCoord(cleanInput.runtime.region.latitude);
    cleanInput.runtime.region.longitude = roundCoarseCoord(cleanInput.runtime.region.longitude);
    cleanInput.runtime.region.grid_id = `${cleanInput.runtime.region.latitude.toFixed(2)}_${cleanInput.runtime.region.longitude.toFixed(2)}`;

    const result = await runNirvaatCopilot(cleanInput.query, cleanInput.runtime);
    const createdAt = new Date().toISOString();

    const responsePayload = stripUndefinedDeep({
      plan: result.plan,
      tool_traces: result.tool_traces,
      audit: result.audit,
      model_used: result.model_used,
      created_at: createdAt,
    });

    res.json(responsePayload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to generate exposure plan.';
    const statusCode = /API_KEY|GEMINI_API_KEY|PERMISSION_DENIED/i.test(message) ? 500 : 502;
    res.status(statusCode).json({
      error: message,
      hint: /GEMINI_API_KEY/i.test(message)
        ? 'Check your GEMINI_API_KEY in Settings > Secrets.'
        : 'Retry the request or switch to offline general safety guidance.',
    });
  }
});

const EnginePlanBodySchema = z.object({
  runtime: RuntimeContextSchema,
});

app.post('/api/engines/plan', async (req: Request, res: Response) => {
  const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
  const parsed = EnginePlanBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid runtime payload for deterministic plan.' });
    return;
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
      const parsedHour = parseInt(aqRes.data.hourly_forecast[0].time.split('T')[1]?.split(':')[0] ?? '', 10);
      if (!Number.isNaN(parsedHour)) {
        startHour = parsedHour;
      }
    }
    forecastHourly = aqRes.data.hourly_forecast.map((p) => {
      if (typeof p.pm2_5 === 'number') {
        return p.pm2_5;
      }
      hasImputation = true;
      return aqRes.data.pm2_5 ?? 120;
    });
  } else {
    forecastHourly = DELHI_WINTER_24H_PM25;
    hasImputation = true;
  }

  const isSimulatedDegradation = (rt.simulated_degradation ?? 'none') !== 'none';
  const isUsingFallback = !aqRes.ok || !aqRes.data.hourly_forecast || aqRes.data.hourly_forecast.length < 12;
  const dataStatus: 'tier_A' | 'tier_B' | 'tier_C' =
    isSimulatedDegradation || isUsingFallback
      ? 'tier_C'
      : hasImputation
        ? 'tier_B'
        : 'tier_A';

  const isLive = dataStatus === 'tier_A';
  const engineProfile = {
    ...rt.profile,
    home: {
      ...rt.profile.home,
      purifier: {
        has: rt.profile.home.purifier.has,
        type: rt.profile.home.purifier.type,
        cadr_m3_hr: rt.profile.home.purifier.cadr ?? 0,
      },
    },
  };

  const baseSchedule = Array.from({ length: forecastHourly.length }, (_, i) => {
    const clockHour = (startHour + i) % 24;
    if (rt.profile.constraints.outdoor_work && clockHour >= 9 && clockHour <= 14) {
      return { hour_index: clockHour, micro_env: 'outdoors' as const, activity: 'moderate' as const, mask: 'none' as const };
    }
    if (clockHour === 8 || clockHour === 18) {
      return {
        hour_index: clockHour,
        micro_env: 'commute' as const,
        activity: 'light' as const,
        mask: 'none' as const,
        commute_mode: rt.profile.commute.mode,
      };
    }
    return {
      hour_index: clockHour,
      micro_env: 'home' as const,
      activity: clockHour >= 22 || clockHour <= 6 ? ('rest' as const) : ('light' as const),
      mask: 'none' as const,
    };
  });

  const t1 = performance.now();
  const scoredEnv = scoreAndRankActions(
    engineProfile,
    baseSchedule,
    forecastHourly,
    undefined,
    `score_${Date.now().toString(36)}`
  );
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

  const plan = {
    language: isHindi ? 'hi-IN' : 'en-IN',
    mode: 'plan' as const,
    data_status: dataStatus,
    situation: {
      summary: isLive
        ? isHindi
          ? `${rt.region.neighborhood} में वर्तमान PM2.5 ${currentPm} µg/m³ है। सबसे साफ समय ${cleanestLabel} रहेगा।`
          : `Current grid PM2.5 is ${currentPm} µg/m³ in ${rt.region.neighborhood}; cleanest dispersion window is ${cleanestLabel}.`
        : hasImputation && !isUsingFallback
          ? isHindi
            ? `${rt.region.neighborhood} में लाइव डेटा में कुछ अनुमानित मान शामिल हैं (वर्तमान PM2.5: ${currentPm} µg/m³)।`
            : `Live grid feed with partial hour interpolation for ${rt.region.neighborhood} (Current PM2.5: ${currentPm} µg/m³).`
          : isHindi
            ? `सामान्य मार्गदर्शन, लाइव डेटा उपलब्ध नहीं है। ${rt.region.official_source} देखें।`
            : `General guidance, fallback reference data. Check ${rt.region.official_source} for live readings.`,
      confidence: dataStatus === 'tier_A' ? ('high' as const) : dataStatus === 'tier_B' ? ('medium' as const) : ('low' as const),
      sources: isLive && aqRes.ok
        ? [aqRes.data.source, scoredEnv.source]
        : [rt.region.official_source, scoredEnv.source],
      as_of: aqRes.ok ? aqRes.data.as_of : new Date().toISOString(),
    },
    assumptions: [
      isHindi
        ? `${priorityMember.label} को प्राथमिकता देते हुए आपके घर के आकार (${rt.profile.home.size_band}) के लिए गणना की गई।`
        : `Prioritized ${priorityMember.label}; modeled for ${rt.profile.home.size_band.replace(/_/g, ' ')} dwelling.`,
    ],
    actions: scoredEnv.value.top_actions.map((item) => ({
      rank: item.rank,
      title: item.title,
      when: whenMap[item.action_id] ?? 'Today',
      how: ACTION_LIBRARY[item.action_id].description,
      why_it_works: item.top_uncertainty || 'Lowers inhaled PM2.5 concentration during highest-dose hours.',
      effect: {
        metric: '24h inhaled PM2.5 dose',
        with: isLive || dataStatus === 'tier_B' ? `${item.daily_with_ug.q10}–${item.daily_with_ug.q90} µg/day` : null,
        without: isLive || dataStatus === 'tier_B' ? `${item.daily_without_ug.q10}–${item.daily_without_ug.q90} µg/day` : null,
        change_range: isLive || dataStatus === 'tier_B'
          ? `-${item.daily_reduction_pct.q10}% to -${item.daily_reduction_pct.q90}%`
          : item.dose_avoided_ug > 150
            ? 'large'
            : 'moderate',
        confidence: scoredEnv.confidence,
        tool_ref: item.impact_call_id,
      },
      cost: item.cost,
      evidence: item.evidence,
      protects: item.protects,
    })),
    if_you_can_do_more: scoredEnv.value.extra_actions.map(
      (e) => `${e.title} (${e.cost} cost · ${e.evidence} evidence)`
    ),
    myth_correction: isHindi
      ? 'घर के पौधे कमरे के PM2.5 को सार्थक रूप से साफ नहीं करते; हवा बंद करना और फ़िल्टर चलाना अधिक प्रभावी है।'
      : 'Indoor houseplants do not meaningfully remove PM2.5 smog; sealing gaps and particle filtration do.',
    safety_note: rt.profile.members.some((m) => m.age_band === 'infant_under_2')
      ? 'Never place masks on children under age 2; protect them via clean-air sleeping rooms and timing.'
      : 'Avoid ozone generators, ionizers, or burning camphor/incense indoors.',
    follow_up_hook: isHindi
      ? 'अपने घर की किसी खास योजना (जैसे स्कूल का समय या खाना पकाना) के बारे में पूछें।'
      : 'Ask about a specific routine (school run, cooking smoke, or night ventilation) for tailored Copilot advice.',
  };

  const traces = [
    {
      call_id: aqRes.ok ? aqRes.data.tool_ref : 'aq_unavailable',
      tool_name: 'get_air_quality' as const,
      args: { grid_id: `${lat.toFixed(2)}_${lon.toFixed(2)}` },
      result: aqRes.ok
        ? {
            call_id: aqRes.data.tool_ref,
            ok: true,
            value: { pm2_5: aqRes.data.pm2_5, cleanest_window: aqRes.data.cleanest_window },
            unit: 'ug/m3',
            range: [Math.round((aqRes.data.pm2_5 ?? 0) * 0.88), Math.round((aqRes.data.pm2_5 ?? 0) * 1.12)],
            confidence: aqRes.data.confidence,
            source: aqRes.data.source,
            as_of: aqRes.data.as_of,
            notes: isLive ? 'Live Open-Meteo grid feed' : hasImputation ? 'Partially imputed grid feed' : 'Fallback seasonal reference',
          }
        : { ok: false, error: aqRes.error },
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

  // Perform rigorous verifier audit on the generated deterministic plan
  const audit = auditDraftPlan(
    plan as any,
    traces as any,
    `Deterministic engine plan for ${priorityMember.label}`,
    rt
  );

  res.json(
    stripUndefinedDeep({
      plan,
      tool_traces: traces,
      audit,
      model_used: 'nirvaat-deterministic-engines-v1',
      created_at: new Date().toISOString(),
      worked_presets: Object.values(WORKED_SCENARIOS).map((w) => ({ id: w.id, label: w.label })),
    })
  );
});

const SimulateTwinSchema = z.object({
  outdoor_pm25_hourly: z.array(z.number().min(0).max(1200)).min(12).max(24),
  size_band: z.enum(['small_under_40m2', 'medium_40_85m2', 'large_over_85m2']),
  age_band: z.enum(['infant_under_2', 'child_2_12', 'teen', 'adult', 'older_adult_65_plus']),
  seal_gaps: z.boolean(),
  clean_cooking: z.boolean(),
  filter_mode: z.enum(['none', 'diy_cr_box', 'hepa']),
});

app.post('/api/engines/simulate', (req: Request, res: Response) => {
  const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
  const parsed = SimulateTwinSchema.safeParse(rawBody);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid simulation parameters.' });
    return;
  }

  const { outdoor_pm25_hourly, size_band, age_band, seal_gaps, clean_cooking, filter_mode } = parsed.data;
  const volume = size_band === 'small_under_40m2' ? 65 : size_band === 'large_over_85m2' ? 180 : 115;

  const baselineIndoor = solveIndoorMassBalance({
    outdoor_pm25_hourly,
    room_volume_m3: volume,
    penetration_p: 0.82,
    lambda_ach: 1.35,
    deposition_k: 0.39,
    source_ug_per_hr: outdoor_pm25_hourly.map((_, h) => (h === 8 || h === 13 || h === 20 ? 4800 : 0)),
    cadr_eff_m3_hr: 0,
  });

  const cadrEff = filter_mode === 'hepa' ? 320 * 0.72 : filter_mode === 'diy_cr_box' ? 280 * 0.65 : 0;
  const simulatedIndoor = solveIndoorMassBalance({
    outdoor_pm25_hourly,
    room_volume_m3: volume,
    penetration_p: seal_gaps ? 0.65 : 0.82,
    lambda_ach: seal_gaps ? 0.55 : 1.35,
    deposition_k: 0.39,
    source_ug_per_hr: outdoor_pm25_hourly.map((_, h) =>
      h === 8 || h === 13 || h === 20 ? (clean_cooking ? 1100 : 4800) : 0
    ),
    cadr_eff_m3_hr: cadrEff,
  });

  const schedule = outdoor_pm25_hourly.map((_, h) => ({
    hour_index: h,
    micro_env: 'home' as const,
    activity: h >= 22 || h <= 6 ? ('rest' as const) : ('light' as const),
    mask: 'none' as const,
  }));

  const doseBase = computeInhaledDose({
    age_band,
    schedule,
    indoor_pm25_hourly: baselineIndoor.hourly,
    outdoor_pm25_hourly,
  });

  const doseSim = computeInhaledDose({
    age_band,
    schedule,
    indoor_pm25_hourly: simulatedIndoor.hourly,
    outdoor_pm25_hourly,
  });

  res.json({
    ok: true,
    baseline_hourly: baselineIndoor.hourly,
    simulated_hourly: simulatedIndoor.hourly,
    baseline_mean_pm25: baselineIndoor.mean,
    simulated_mean_pm25: simulatedIndoor.mean,
    baseline_dose_ug: doseBase.dailyDoseUg,
    simulated_dose_ug: doseSim.dailyDoseUg,
    reduction_pct:
      doseBase.dailyDoseUg > 0
        ? Math.round(((doseBase.dailyDoseUg - doseSim.dailyDoseUg) / doseBase.dailyDoseUg) * 100)
        : 0,
  });
});

app.get('/api/history', (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`hist_get_${clientIp}`, 60, 60_000)) {
    res.status(429).json({ error: 'Rate limit exceeded for history queries.' });
    return;
  }
  const sessionId = getSessionId(req);
  const items = sessionHistory.get(sessionId) ?? [];
  res.json({ items });
});

app.post('/api/history', (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`hist_post_${clientIp}`, 30, 60_000)) {
    res.status(429).json({ error: 'Rate limit exceeded for history saves.' });
    return;
  }

  const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
  const parsed = SaveHistorySchema.safeParse(rawBody);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid decision record payload.',
      details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
    return;
  }

  const sanitized = stripUndefinedDeep({
    id: parsed.data.id ?? `dec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    query: parsed.data.query,
    region_label: parsed.data.region_label,
    channel: parsed.data.channel,
    plan: parsed.data.plan,
    tool_traces: parsed.data.tool_traces,
    model_used: parsed.data.model_used,
    created_at: parsed.data.created_at ?? new Date().toISOString(),
  }) as unknown as SavedDecisionRecord;

  const sessionId = getSessionId(req);
  let records = sessionHistory.get(sessionId);
  if (!records) {
    records = [];
    if (sessionHistory.size >= 200) {
      const firstKey = sessionHistory.keys().next().value;
      if (firstKey) sessionHistory.delete(firstKey);
    }
    sessionHistory.set(sessionId, records);
  }

  const existingIdx = records.findIndex((d) => d.id === sanitized.id);
  if (existingIdx >= 0) {
    records[existingIdx] = sanitized;
  } else {
    records.unshift(sanitized);
    if (records.length > 25) records.pop();
  }

  res.status(201).json({ saved: true, record: sanitized });
});

app.delete('/api/history/:id', (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const records = sessionHistory.get(sessionId);
  if (!records) {
    res.status(404).json({ error: 'Saved decision not found.' });
    return;
  }
  const id = String(req.params.id ?? '');
  const idx = records.findIndex((d) => d.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Saved decision not found.' });
    return;
  }
  records.splice(idx, 1);
  res.json({ deleted: true, id });
});

export async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app.listen(PORT, '0.0.0.0', () => {
    console.log(`NIRVAAT server listening on http://0.0.0.0:${PORT}`);
  });
}

export { app };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && process.env.NODE_ENV !== 'test') {
  startServer();
}
