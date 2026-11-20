import { z } from 'zod';

export type ChannelType = 'APP' | 'WHATSAPP' | 'SMS' | 'VOICE';
export type AgeBand =
  | 'infant_under_2'
  | 'child_2_12'
  | 'teen'
  | 'adult'
  | 'older_adult_65_plus';

export type DataStatusTier = 'tier_A' | 'tier_B' | 'tier_C' | 'tier_D';
export type ResponseMode = 'plan' | 'answer' | 'clarify' | 'emergency' | 'out_of_scope';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type CostLevel = 'free' | 'low' | 'medium' | 'high';
export type EvidenceGrade = 'strong' | 'moderate' | 'emerging';
export type DegradationSimulation = 'none' | 'no_impact' | 'no_aq' | 'all_down';

export const HouseholdMemberSchema = z.object({
  label: z.string().trim().min(1).max(40),
  age_band: z.enum(['infant_under_2', 'child_2_12', 'teen', 'adult', 'older_adult_65_plus']),
  conditions: z.array(z.string().trim().max(40)).max(6),
});

export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;

export const HouseholdProfileSchema = z.object({
  members: z.array(HouseholdMemberSchema).min(1).max(8),
  home: z.object({
    type: z.enum(['apartment', 'independent_house', 'single_room', 'shared_flat']),
    size_band: z.enum(['small_under_40m2', 'medium_40_85m2', 'large_over_85m2']),
    windows_habit: z.enum(['kept_open_day', 'kept_open_night', 'mostly_closed', 'loose_frames_drafty']),
    ac_or_heater: z.enum(['none', 'split_ac', 'space_heater', 'central_hvac']),
    cooking_fuel: z.enum(['lpg_gas', 'piped_gas', 'induction_electric', 'biomass_solid']),
    purifier: z.object({
      has: z.boolean(),
      type: z.enum(['none', 'hepa', 'diy_cr_box']).optional(),
      cadr: z.number().min(0).max(1500).optional(),
    }),
    masks: z.array(z.enum(['none', 'cloth_surgical', 'n95_kn95_kf94', 'valved_n95'])).max(4),
  }),
  commute: z.object({
    mode: z.enum(['walking', 'two_wheeler', 'public_transit', 'car', 'work_from_home']),
    window: z.string().trim().max(40),
  }),
  constraints: z.object({
    budget_band: z.enum(['free_only', 'low_cost', 'moderate']),
    renter: z.boolean(),
    outdoor_work: z.boolean(),
  }),
  languages: z.array(z.string().trim().max(16)).min(1).max(4),
});

export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;

export const RegionConfigSchema = z.object({
  city: z.string().trim().min(1).max(60),
  neighborhood: z.string().trim().min(1).max(60),
  grid_id: z.string().trim().min(1).max(32),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  emergency_number: z.string().trim().min(2).max(16),
  official_source: z.string().trim().min(1).max(80),
  active_policy: z.string().trim().max(120),
});

export type RegionConfig = z.infer<typeof RegionConfigSchema>;

export const SessionMemorySchema = z.object({
  last_plan_summary: z.string().max(300).nullable(),
  user_feedback: z.string().max(300).nullable(),
  unresolved_question: z.string().max(200).nullable(),
});

export type SessionMemory = z.infer<typeof SessionMemorySchema>;

export const RuntimeContextSchema = z.object({
  locale: z.string().trim().min(2).max(16),
  channel: z.enum(['APP', 'WHATSAPP', 'SMS', 'VOICE']),
  max_data_age_min: z.number().int().min(15).max(180),
  region: RegionConfigSchema,
  profile: HouseholdProfileSchema,
  session_memory: SessionMemorySchema,
  simulated_degradation: z.enum(['none', 'no_impact', 'no_aq', 'all_down']).optional(),
});

export type RuntimeContext = z.infer<typeof RuntimeContextSchema>;

export const PlanRequestSchema = z.object({
  query: z.string().trim().min(1).max(1200),
  runtime: RuntimeContextSchema,
});

export type PlanRequest = z.infer<typeof PlanRequestSchema>;

export interface ActionEffect {
  metric: string;
  with: string | null;
  without: string | null;
  change_range: string;
  confidence: ConfidenceLevel;
  tool_ref: string;
}

export interface PlanAction {
  rank: number;
  title: string;
  when: string;
  how: string;
  why_it_works: string;
  effect: ActionEffect;
  cost: CostLevel;
  evidence: EvidenceGrade;
  protects: string[];
}

export interface NirvaatPlanResponse {
  language: string;
  mode: ResponseMode;
  data_status: DataStatusTier;
  situation: {
    summary: string;
    confidence: ConfidenceLevel;
    sources: string[];
    as_of: string;
  };
  assumptions: string[];
  actions: PlanAction[];
  if_you_can_do_more?: string[];
  myth_correction?: string;
  clarifying_question?: string;
  emergency?: {
    message: string;
    number: string;
  };
  safety_note?: string;
  follow_up_hook: string;
}

export interface ToolCallTrace {
  call_id: string;
  tool_name: 'get_air_quality' | 'get_forecast' | 'impact_estimate' | 'retrieve_guidance';
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  status: 'ok' | 'degraded' | 'failed';
  duration_ms: number;
  timestamp: string;
}

export interface AirQualityPoint {
  time: string;
  pm2_5: number | null;
  pm10: number | null;
  us_aqi: number | null;
}

export interface AirQualitySummary {
  tool_ref: string;
  grid_id: string;
  city: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  pm2_5: number | null;
  pm2_5_unit: 'µg/m³';
  pm2_5_range: string;
  pm10: number | null;
  us_aqi: number | null;
  european_aqi: number | null;
  no2: number | null;
  confidence: ConfidenceLevel;
  source: string;
  as_of: string;
  data_age_minutes: number;
  is_stale: boolean;
  hourly_forecast: AirQualityPoint[];
  cleanest_window: {
    start_iso: string;
    end_iso: string;
    label: string;
    avg_pm2_5: number | null;
  } | null;
  peak_window: {
    start_iso: string;
    end_iso: string;
    label: string;
    avg_pm2_5: number | null;
  } | null;
}

export interface GuidanceEntry {
  id: string;
  topic: string;
  title: string;
  evidence: EvidenceGrade;
  summary: string;
  do_this: string[];
  avoid_this: string[];
  source: string;
  sensitive_groups: string[];
}

export interface PlanApiResult {
  plan: NirvaatPlanResponse;
  tool_traces: ToolCallTrace[];
  model_used: string;
  created_at: string;
}

export interface SavedDecisionRecord {
  id: string;
  query: string;
  region_label: string;
  channel: ChannelType;
  plan: NirvaatPlanResponse;
  tool_traces: ToolCallTrace[];
  model_used: string;
  created_at: string;
}

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        cleaned[key] = stripUndefinedDeep(val);
      }
    }
    return cleaned as T;
  }
  return value;
}
