import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  helmetMiddleware,
  corsMiddleware,
  timeoutMiddleware,
  sessionMiddleware,
} from './server/middleware/security.ts';
import { errorHandler } from './server/middleware/errorHandler.ts';
import planRoutes from './server/routes/apiPlan.ts';
import simulateRoutes from './server/routes/apiSimulate.ts';
import historyRoutes from './server/routes/apiHistory.ts';
import telemetryRoutes from './server/routes/apiTelemetry.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
app.disable('x-powered-by');
export const PORT = Number(process.env.PORT ?? 3000);

// Re-export helpers for test harness compatibility
export { checkRateLimit, resetRateLimits, getRateLimitRetryAfter } from './server/middleware/security.ts';
export { getSessionHistoryMap } from './server/routes/apiHistory.ts';

// 1. Request body deserialization with strict 64kb limit
app.use(express.json({ limit: '64kb' }));

// 2. Cookie parser with signed session entropy
const SESSION_SECRET = process.env.SESSION_SECRET || 'nirvaat_sec_token_994828182_entropy';
app.use(cookieParser(SESSION_SECRET));

// 3. Security Middlewares (Helmet CSP, CORS, Timeout, Signed Session)
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(timeoutMiddleware);
app.use(sessionMiddleware);

// 4. API Routes
app.use('/api', planRoutes);
app.use('/api', simulateRoutes);
app.use('/api', telemetryRoutes);
app.use('/api/history', historyRoutes);

// 5. Centralized Typed Error Handler
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err && typeof err === 'object' && 'type' in err && (err as any).type === 'entity.too.large') {
    res.status(413).json({ error: 'Payload Too Large: request body exceeds 64kb limit.' });
    return;
  }
  errorHandler(err, req, res, next);
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
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  return app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NIRVAAT Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

// Auto-start server in direct execution
const isTestRun = process.env.NODE_ENV === 'test';
const isDirectRun = Boolean(
  process.argv[1] &&
    (process.argv[1].endsWith('server.ts') ||
      process.argv[1].endsWith('server.js') ||
      process.argv[1].endsWith('server'))
);

if (!isTestRun && isDirectRun) {
  try {
    await startServer();
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}
