import { z } from 'zod';
import { ConfidenceLevelSchema } from './toolEnvelope.ts';
import { EvidenceGradeSchema } from './plan.ts';

export const AirQualityPointSchema = z.object({
  time: z.string().min(1),
  pm2_5: z.number().nullable(),
  pm10: z.number().nullable(),
  us_aqi: z.number().nullable(),
}).strict();

export type AirQualityPoint = z.infer<typeof AirQualityPointSchema>;

export const WindowSummarySchema = z.object({
  start_iso: z.string(),
  end_iso: z.string(),
  label: z.string(),
  avg_pm2_5: z.number().nullable(),
}).strict();

export type WindowSummary = z.infer<typeof WindowSummarySchema>;

export const AirQualitySummarySchema = z.object({
  tool_ref: z.string().min(1),
  grid_id: z.string().min(1),
  city: z.string().min(1),
  neighborhood: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  pm2_5: z.number().nullable(),
  pm2_5_unit: z.literal('µg/m³'),
  pm2_5_range: z.string(),
  pm10: z.number().nullable(),
  us_aqi: z.number().nullable(),
  european_aqi: z.number().nullable(),
  no2: z.number().nullable(),
  confidence: ConfidenceLevelSchema,
  source: z.string(),
  as_of: z.string(),
  data_age_minutes: z.number(),
  is_stale: z.boolean(),
  hourly_forecast: z.array(AirQualityPointSchema),
  cleanest_window: WindowSummarySchema.nullable(),
  peak_window: WindowSummarySchema.nullable(),
}).strict();

export type AirQualitySummary = z.infer<typeof AirQualitySummarySchema>;

export const GuidanceEntrySchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  title: z.string().min(1),
  evidence: EvidenceGradeSchema,
  summary: z.string().min(1),
  do_this: z.array(z.string()),
  avoid_this: z.array(z.string()),
  source: z.string(),
  sensitive_groups: z.array(z.string()),
}).strict();

export type GuidanceEntry = z.infer<typeof GuidanceEntrySchema>;

export const ToolCallTraceSchema = z.object({
  call_id: z.string().min(1),
  tool_name: z.enum(['get_air_quality', 'get_forecast', 'impact_estimate', 'retrieve_guidance']),
  args: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()),
  status: z.enum(['ok', 'degraded', 'failed']),
  duration_ms: z.number().min(0),
  timestamp: z.string().min(10),
}).strict();

export type ToolCallTrace = z.infer<typeof ToolCallTraceSchema>;
