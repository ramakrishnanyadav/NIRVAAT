import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

// Helmet Security Headers with Content Security Policy (OWASP ASVS L1-L2)
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https://air-quality-api.open-meteo.com', 'https://generativelanguage.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// Explicit CORS Allowlist
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []),
]);

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const rawOrigin = req.headers.origin;
  const origin = typeof rawOrigin === 'string' ? rawOrigin.trim() : undefined;
  if (origin && /^https?:\/\/[a-zA-Z0-9.\-_:]+$/.test(origin) && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-nirvaat-session');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

// Request Timeout Ceiling (15s)
export function timeoutMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Gateway timeout: request took longer than 15 seconds.' });
    }
  }, 15_000);
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));
  next();
}

// Signed Anonymous Session Middleware
export const SESSION_COOKIE_NAME = 'nirvaat_session';

export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  let sessionId = req.signedCookies?.[SESSION_COOKIE_NAME] || req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionId) {
    const header = req.headers['x-nirvaat-session'];
    if (typeof header === 'string' && header.trim().length > 0) {
      sessionId = header.trim().slice(0, 64);
    }
  }

  if (!sessionId || typeof sessionId !== 'string' || !/^[0-9a-zA-Z_-]{8,64}$/.test(sessionId)) {
    sessionId = crypto.randomUUID();
  }

  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  (req as any).sessionId = sessionId;
  next();
}

export function getSessionId(req: Request): string {
  return (req as any).sessionId || 'default';
}

// Rate Limiter
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

export function getRateLimitRetryAfter(key: string): number {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);
  if (!bucket || now >= bucket.resetAtMs) return 1;
  return Math.max(1, Math.ceil((bucket.resetAtMs - now) / 1000));
}

export function resetRateLimits(): void {
  rateLimitMap.clear();
}
