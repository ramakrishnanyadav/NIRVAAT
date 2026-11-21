import { HouseholdProfile, RegionConfig } from './nirvaatTypes';

export const DEFAULT_REGION: RegionConfig = {
  city: 'Delhi NCR',
  neighborhood: 'Anand Vihar · East Grid',
  grid_id: '28.65_77.31',
  latitude: 28.65,
  longitude: 77.31,
  emergency_number: '112',
  official_source: 'CPCB Sameer / SAFAR India',
  active_policy: 'GRAP Stage IV Winter Emergency Measures',
};

export const DEFAULT_PROFILE: HouseholdProfile = {
  members: [
    { label: 'Toddler (18m)', age_band: 'infant_under_2', conditions: [] },
    { label: 'Grandparent', age_band: 'older_adult_65_plus', conditions: ['asthma'] },
    { label: 'Commuter', age_band: 'adult', conditions: [] },
  ],
  home: {
    type: 'apartment',
    size_band: 'medium_40_85m2',
    windows_habit: 'loose_frames_drafty',
    ac_or_heater: 'none',
    cooking_fuel: 'lpg_gas',
    purifier: { has: false, type: 'none', cadr_m3_hr: 0 },
    masks: ['n95_kn95_kf94'],
  },
  commute: { mode: 'public_transit', window: '08:00–09:00' },
  constraints: { budget_band: 'low_cost', renter: true, outdoor_work: false },
  languages: ['en-IN', 'hi-IN'],
};

export const HOUSEHOLD_PRESETS = [
  {
    id: 'leaky_1bhk_toddler',
    labelEn: 'Leaky 1BHK + Toddler',
    labelHi: 'किराए का 1BHK + शिशु',
    profile: {
      members: [
        { label: 'Toddler (18m)', age_band: 'infant_under_2' as const, conditions: [] },
        { label: 'Caregiver', age_band: 'adult' as const, conditions: [] },
      ],
      home: {
        type: 'single_room' as const,
        size_band: 'small_under_40m2' as const,
        windows_habit: 'loose_frames_drafty' as const,
        ac_or_heater: 'none' as const,
        cooking_fuel: 'lpg_gas' as const,
        purifier: { has: false, type: 'none' as const, cadr: 0 },
        masks: ['none' as const],
      },
      commute: { mode: 'walking' as const, window: '08:00–09:00' },
      constraints: { budget_band: 'low_cost' as const, renter: true, outdoor_work: false },
      languages: ['hi-IN', 'en-IN'],
    },
  },
  {
    id: 'sealed_flat_purifier',
    labelEn: 'Sealed Flat + Pregnant + HEPA',
    labelHi: 'बंद फ्लैट + गर्भवती + HEPA',
    profile: {
      members: [
        { label: 'Pregnant parent', age_band: 'adult' as const, conditions: ['pregnancy'] },
        { label: 'Spouse', age_band: 'adult' as const, conditions: [] },
      ],
      home: {
        type: 'apartment' as const,
        size_band: 'medium_40_85m2' as const,
        windows_habit: 'mostly_closed' as const,
        ac_or_heater: 'split_ac' as const,
        cooking_fuel: 'piped_gas' as const,
        purifier: { has: true, type: 'hepa' as const, cadr_m3_hr: 320 },
        masks: ['n95_kn95_kf94' as const],
      },
      commute: { mode: 'car' as const, window: '09:00–10:00' },
      constraints: { budget_band: 'moderate' as const, renter: false, outdoor_work: false },
      languages: ['en-IN'],
    },
  },
  {
    id: 'outdoor_worker',
    labelEn: 'Outdoor Rider (6h Shift)',
    labelHi: 'आउटडोर राइडर (6 घंटे)',
    profile: {
      members: [{ label: 'Outdoor worker', age_band: 'adult' as const, conditions: [] }],
      home: {
        type: 'shared_flat' as const,
        size_band: 'small_under_40m2' as const,
        windows_habit: 'loose_frames_drafty' as const,
        ac_or_heater: 'none' as const,
        cooking_fuel: 'lpg_gas' as const,
        purifier: { has: false, type: 'none' as const, cadr: 0 },
        masks: ['cloth_surgical' as const],
      },
      commute: { mode: 'two_wheeler' as const, window: '09:00–15:00' },
      constraints: { budget_band: 'low_cost' as const, renter: true, outdoor_work: true },
      languages: ['hi-IN', 'en-IN'],
    },
  },
];

export const QUICK_SCENARIOS = [
  { id: 'routine', labelEn: 'Plan tonight & morning', labelHi: 'आज रात और कल सुबह की योजना', prompt: 'What should our household do tonight and tomorrow morning to cut smog exposure on a tight budget?' },
  { id: 'school', labelEn: 'School walk & infant', labelHi: 'स्कूल जाने का समय और शिशु सुरक्षा', prompt: 'We have a toddler under 2 and need to do an outdoor morning errand. When is safest and what protection works?' },
  { id: 'ventilate', labelEn: 'Should we open windows?', labelHi: 'क्या अभी खिड़कियां खोलें?', prompt: 'Should we open windows to air out the flat right now, or keep them sealed until afternoon?' },
  { id: 'outdoor', labelEn: 'Outdoor work shift', labelHi: 'बाहर काम करने की शिफ्ट', prompt: 'One family member works outdoors for 6 hours today. What practical protection works within their shift?' },
  { id: 'cooking', labelEn: 'Cooking smoke in small flat', labelHi: 'छोटे घर में खाना पकाने का धुआं', prompt: 'We cook with LPG in a closed rented flat during winter smog. How do we prevent indoor spikes?' },
  { id: 'redflag', labelEn: 'Test red-flag triage', labelHi: 'आपातकालीन लक्षण जांच', prompt: 'My grandparent has chest tightness and wheezing that is not settling after using their prescribed reliever.' },
];
