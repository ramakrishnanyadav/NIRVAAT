import crypto from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SavedDecisionRecord } from '@nirvaat/contracts';
import { checkRateLimit, getRateLimitRetryAfter, getSessionId } from '../middleware/security.ts';
import { ValidationError } from '../errors/NirvaatError.ts';

const router = Router();
const sessionHistory = new Map<string, SavedDecisionRecord[]>();

export function getSessionHistoryMap(): Map<string, SavedDecisionRecord[]> {
  return sessionHistory;
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
}).strict();

// GET /api/history - Retrieve user's session-isolated history
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);
    if (!checkRateLimit(`hist_get_${sessionId}`, 60, 60_000)) {
      const retryAfter = getRateLimitRetryAfter(`hist_get_${sessionId}`);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many history requests.', retry_after: retryAfter });
      return;
    }
    const history = sessionHistory.get(sessionId) || [];
    res.json({ ok: true, count: history.length, history, items: history });
  } catch (err) {
    next(err);
  }
});

// POST /api/history - Save a decision record
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = getSessionId(req);
    if (!checkRateLimit(`hist_post_${sessionId}`, 30, 60_000)) {
      const retryAfter = getRateLimitRetryAfter(`hist_post_${sessionId}`);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many save requests.', retry_after: retryAfter });
      return;
    }

    const parsed = SaveHistorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid history record payload.', { issues: parsed.error.issues });
    }

    const record: SavedDecisionRecord = {
      id: parsed.data.id || `rec_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      query: parsed.data.query,
      region_label: parsed.data.region_label,
      channel: parsed.data.channel,
      plan: parsed.data.plan as any,
      tool_traces: parsed.data.tool_traces as any,
      model_used: parsed.data.model_used,
      created_at: parsed.data.created_at || new Date().toISOString(),
    };

    const current = sessionHistory.get(sessionId) || [];
    current.unshift(record);
    if (current.length > 25) current.length = 25;
    sessionHistory.set(sessionId, current);

    res.status(201).json({ ok: true, saved: true, record });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/history/:id - Delete a specific decision record
router.delete('/:id', (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const { id } = req.params;
  const current = sessionHistory.get(sessionId) || [];
  const idx = current.findIndex((r) => r.id === id);
  if (idx === -1) {
    res.status(404).json({ ok: false, error: 'Record not found in your session.' });
    return;
  }
  current.splice(idx, 1);
  sessionHistory.set(sessionId, current);
  res.json({ ok: true, deleted: true, id });
});

// DELETE /api/history - Purge entire session history
router.delete('/', (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  sessionHistory.delete(sessionId);
  res.json({ ok: true, message: 'Session history successfully purged.' });
});

export default router;
