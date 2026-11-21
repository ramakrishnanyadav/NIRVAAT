import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getMonteCarloMetrics } from '@nirvaat/engines';
import { PRESET_REGIONS, GUIDANCE_LIBRARY } from '../guidanceRegistry.ts';
import {
  fetchLiveAirQualitySummary,
  getAqMetrics,
  roundCoarseCoord,
} from '../openMeteoClient.ts';
import { checkRateLimit, getRateLimitRetryAfter, getSessionId } from '../middleware/security.ts';
import { getSessionHistoryMap } from './apiHistory.ts';
import { ValidationError } from '../errors/NirvaatError.ts';

const router = Router();

// GET /api/health - Service health & cache performance metrics
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'nirvaat-copilot',
    timestamp: new Date().toISOString(),
    cache_metrics: {
      monte_carlo: getMonteCarloMetrics(),
      air_quality: getAqMetrics(),
    },
  });
});

// GET /api/neighborhoods - Preset region registry
router.get('/neighborhoods', (_req: Request, res: Response) => {
  res.json({ regions: PRESET_REGIONS });
});

// GET /api/guidance - Public health guidance registry
router.get('/guidance', (_req: Request, res: Response) => {
  res.json({ entries: GUIDANCE_LIBRARY });
});

const AirQualityQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  maxAge: z.coerce.number().min(15).max(180).optional(),
  sim: z.enum(['none', 'no_impact', 'no_aq', 'all_down']).optional(),
  city: z.string().max(60).optional(),
  neighborhood: z.string().max(60).optional(),
}).strict();

// GET /api/air-quality - Live coarse-rounded air quality telemetry
router.get('/air-quality', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    if (!checkRateLimit(`aq_${clientIp}`, 60, 60_000)) {
      const retryAfter = getRateLimitRetryAfter(`aq_${clientIp}`);
      res.setHeader('Retry-After', retryAfter.toString());
      res.status(429).json({ error: 'Rate limit exceeded for air quality requests.', retry_after: retryAfter });
      return;
    }

    const parsed = AirQualityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid coarse coordinates or query parameters.', {
        issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
    }

    const lat = roundCoarseCoord(parsed.data.lat ?? PRESET_REGIONS[0].latitude);
    const lon = roundCoarseCoord(parsed.data.lon ?? PRESET_REGIONS[0].longitude);
    const maxAgeRaw = parsed.data.maxAge ?? 60;
    const sim = parsed.data.sim ?? 'none';
    const city = parsed.data.city ?? 'Custom Grid';
    const neighborhood = parsed.data.neighborhood ?? `Grid ${lat.toFixed(2)}, ${lon.toFixed(2)}`;

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
      res.status(503).json({ ok: false, error: result.error, grid_id: region.grid_id });
      return;
    }

    res.json({ ok: true, data: result.data });
  } catch (err) {
    next(err);
  }
});

// GET /api/privacy/policy
router.get('/privacy/policy', (_req: Request, res: Response) => {
  res.json({
    retention_policy: 'In-memory session storage only. Records expire when session cookie expires (7 days) or upon FIFO limit eviction.',
    coarse_location_notice: 'Coordinates are rounded to 2 decimal places (~1.1 km coarse spatial grid). Note: coordinate rounding provides spatial aggregation to protect exact household location, but does not constitute differential privacy.',
    pii_policy: 'Zero personal names, telephone numbers, IP addresses, or street addresses are logged or persisted.',
    purge_endpoint: 'DELETE /api/privacy/purge-data or DELETE /api/history',
  });
});

// DELETE /api/privacy/purge-data
router.delete('/privacy/purge-data', (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const historyMap = getSessionHistoryMap();
  historyMap.delete(sessionId);
  res.json({ ok: true, message: 'All session telemetry and saved decisions purged.' });
});

export default router;
