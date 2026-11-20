import { z } from 'zod';
import { ConfidenceLevelSchema } from './toolEnvelope.ts';

export const DataStatusTierSchema = z.enum(['tier_A', 'tier_B', 'tier_C', 'tier_D']);
export type DataStatusTier = z.infer<typeof DataStatusTierSchema>;

export const ResponseModeSchema = z.enum(['plan', 'answer', 'clarify', 'emergency', 'out_of_scope']);
export type ResponseMode = z.infer<typeof ResponseModeSchema>;

export const CostLevelSchema = z.enum(['free', 'low', 'medium', 'high']);
export type CostLevel = z.infer<typeof CostLevelSchema>;

export const EvidenceGradeSchema = z.enum(['strong', 'moderate', 'emerging']);
export type EvidenceGrade = z.infer<typeof EvidenceGradeSchema>;

export const ActionEffectSchema = z.object({
  metric: z.string().min(1),
  with: z.string().nullable(),
  without: z.string().nullable(),
  change_range: z.string().min(1),
  confidence: ConfidenceLevelSchema,
  tool_ref: z.string().min(1),
});
export type ActionEffect = z.infer<typeof ActionEffectSchema>;

export const PlanActionSchema = z.object({
  rank: z.number().int().min(1).max(3),
  title: z.string().min(1),
  when: z.string().min(1),
  how: z.string().min(1),
  why_it_works: z.string().min(1),
  effect: ActionEffectSchema,
  cost: CostLevelSchema,
  evidence: EvidenceGradeSchema,
  protects: z.array(z.string().min(1)),
});
export type PlanAction = z.infer<typeof PlanActionSchema>;

export const NirvaatPlanSchema = z.object({
  language: z.string().min(2),
  mode: ResponseModeSchema,
  data_status: DataStatusTierSchema,
  situation: z.object({
    summary: z.string().min(1),
    confidence: ConfidenceLevelSchema,
    sources: z.array(z.string().min(1)),
    as_of: z.string().min(10),
  }),
  assumptions: z.array(z.string()),
  actions: z.array(PlanActionSchema).max(3),
  if_you_can_do_more: z.array(z.string()).max(2).optional(),
  myth_correction: z.string().optional(),
  clarifying_question: z.string().optional(),
  emergency: z
    .object({
      message: z.string().min(1),
      number: z.string().min(2),
    })
    .optional(),
  safety_note: z.string().optional(),
  follow_up_hook: z.string().min(1),
});
export type NirvaatPlan = z.infer<typeof NirvaatPlanSchema>;
