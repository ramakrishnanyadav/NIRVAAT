import { Request, Response, NextFunction } from 'express';
import { NirvaatError } from '../errors/NirvaatError.ts';
import { logger } from './logger.ts';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  
  if (err instanceof NirvaatError) {
    logger.warn(`API Error [${err.code}]: ${err.message}`, {
      event: 'api_handled_error',
      route: req.path,
      method: req.method,
      statusCode: err.statusCode,
      error: err.message,
    });

    res.status(err.statusCode).json({
      ok: false,
      error: err.message,
      code: err.code,
      details: err.details,
      timestamp,
    });
    return;
  }

  // Handle SyntaxError from malformed JSON body
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json({
      ok: false,
      error: 'Malformed JSON payload.',
      code: 'VALIDATION_ERROR',
      timestamp,
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  logger.error(`Unhandled Exception on ${req.method} ${req.path}: ${message}`, {
    event: 'api_unhandled_error',
    route: req.path,
    method: req.method,
    statusCode: 500,
    error: message,
  });

  res.status(500).json({
    ok: false,
    error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : message,
    code: 'INTERNAL_ERROR',
    timestamp,
  });
}
