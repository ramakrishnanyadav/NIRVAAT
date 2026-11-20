import { z } from 'zod';

export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const ToolEnvelopeBaseSchema = z.object({
  call_id: z.string().trim().min(1),
  ok: z.boolean(),
  value: z.record(z.string(), z.unknown()),
  unit: z.string().trim().min(1),
  range: z.tuple([z.number().finite(), z.number().finite()]),
  confidence: ConfidenceLevelSchema,
  source: z.string().trim().min(1),
  as_of: z.string().datetime({ offset: true }).or(z.string().min(10)),
  notes: z.string(),
});

export interface ToolEnvelope<TValue extends Record<string, unknown> = Record<string, unknown>> {
  call_id: string;
  ok: boolean;
  value: TValue;
  unit: string;
  range: [number, number];
  confidence: ConfidenceLevel;
  source: string;
  as_of: string;
  notes: string;
}

export function createToolEnvelopeSchema<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    call_id: z.string().trim().min(1),
    ok: z.boolean(),
    value: valueSchema,
    unit: z.string().trim().min(1),
    range: z.tuple([z.number().finite(), z.number().finite()]),
    confidence: ConfidenceLevelSchema,
    source: z.string().trim().min(1),
    as_of: z.string().min(10),
    notes: z.string(),
  });
}

export const TOOL_ENVELOPE_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'NirvaatToolEnvelope',
  type: 'object',
  required: ['call_id', 'ok', 'value', 'unit', 'range', 'confidence', 'source', 'as_of', 'notes'],
  properties: {
    call_id: { type: 'string', minLength: 1 },
    ok: { type: 'boolean' },
    value: { type: 'object' },
    unit: { type: 'string', minLength: 1 },
    range: {
      type: 'array',
      prefixItems: [{ type: 'number' }, { type: 'number' }],
      minItems: 2,
      maxItems: 2,
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    source: { type: 'string', minLength: 1 },
    as_of: { type: 'string', format: 'date-time' },
    notes: { type: 'string' },
  },
} as const;
