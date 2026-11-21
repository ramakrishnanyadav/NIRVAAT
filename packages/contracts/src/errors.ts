import { z } from 'zod';

export const NirvaatErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UPSTREAM_SERVICE_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'SECURITY_VIOLATION',
  'AUDIT_FAILURE',
  'INTERNAL_ERROR',
  'NOT_FOUND',
]);

export type NirvaatErrorCode = z.infer<typeof NirvaatErrorCodeSchema>;

export const NirvaatErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string().min(1),
  code: NirvaatErrorCodeSchema,
  details: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().min(10),
}).strict();

export type NirvaatErrorResponse = z.infer<typeof NirvaatErrorResponseSchema>;
