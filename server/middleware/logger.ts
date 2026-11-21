export interface LogMetadata {
  event: string;
  statusCode?: number;
  durationMs?: number;
  route?: string;
  method?: string;
  error?: string;
  [key: string]: unknown;
}

export const logger = {
  info(message: string, meta?: LogMetadata) {
    const timestamp = new Date().toISOString();
    const entry = {
      level: 'INFO',
      timestamp,
      message,
      ...sanitizeLogMeta(meta),
    };
    console.log(JSON.stringify(entry));
  },
  warn(message: string, meta?: LogMetadata) {
    const timestamp = new Date().toISOString();
    const entry = {
      level: 'WARN',
      timestamp,
      message,
      ...sanitizeLogMeta(meta),
    };
    console.warn(JSON.stringify(entry));
  },
  error(message: string, meta?: LogMetadata) {
    const timestamp = new Date().toISOString();
    const entry = {
      level: 'ERROR',
      timestamp,
      message,
      ...sanitizeLogMeta(meta),
    };
    console.error(JSON.stringify(entry));
  },
};

function sanitizeLogMeta(meta?: LogMetadata): Record<string, unknown> {
  if (!meta) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(meta)) {
    // Redact potential PII
    if (['ip', 'email', 'phone', 'token', 'authorization', 'cookie', 'secret', 'key'].includes(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else {
      clean[key] = val;
    }
  }
  return clean;
}
