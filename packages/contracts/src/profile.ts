import { z } from 'zod';

export const AgeBandSchema = z.enum([
  'infant_under_2',
  'child_2_12',
  'teen',
  'adult',
  'older_adult_65_plus',
]);
export type AgeBand = z.infer<typeof AgeBandSchema>;

export const HouseholdMemberSchema = z.object({
  label: z.string().trim().min(1).max(40),
  age_band: AgeBandSchema,
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
      cadr_m3_hr: z.number().min(0).max(1500).optional(),
    }),
    masks: z.array(z.enum(['none', 'cloth_surgical', 'n95_kn95_kf94', 'valved_n95'])).max(4),
    incense_or_dhoop: z.boolean().optional(),
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

export const ChannelSchema = z.enum(['WHATSAPP', 'SMS', 'APP', 'VOICE']);
export type Channel = z.infer<typeof ChannelSchema>;
export type ChannelType = Channel;

export const DegradationSimulationSchema = z.enum([
  'none',
  'no_aq',
  'stale_aq',
  'bad_coords',
  'unsupported_region',
  'no_impact',
  'all_down',
]);
export type DegradationSimulation = z.infer<typeof DegradationSimulationSchema>;

export const RuntimeContextSchema = z.object({
  now: z.string().min(10).optional(),
  locale: z.string().trim().min(2).max(16),
  channel: ChannelSchema,
  region: RegionConfigSchema,
  max_data_age_min: z.number().int().min(15).max(180),
  profile: HouseholdProfileSchema,
  session_memory: z.object({
    last_plan_summary: z.string().max(300).nullable(),
    user_feedback: z.string().max(300).nullable(),
    unresolved_question: z.string().max(200).nullable(),
  }),
  simulated_degradation: DegradationSimulationSchema.optional(),
});
export type RuntimeContext = z.infer<typeof RuntimeContextSchema>;
