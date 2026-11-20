import { HouseholdProfile, RegionConfig } from '../../contracts/src/profile.ts';
import { HourlyScheduleSlot } from './dose_model.ts';

// Realistic 24h Delhi NCR winter-inversion hourly PM2.5 curve (hour 0 = 00:00 .. hour 23 = 23:00)
export const DELHI_WINTER_24H_PM25: number[] = [
  245, 258, 265, 272, 278, 285, 295, 310, 290, 240, 185, 145,
  115, 98, 92, 95, 118, 155, 195, 225, 248, 260, 268, 262,
];

export const DELHI_MOCK_REGION: RegionConfig = {
  city: 'Delhi NCR',
  neighborhood: 'Anand Vihar · East Grid',
  grid_id: '28.65_77.31',
  latitude: 28.65,
  longitude: 77.31,
  emergency_number: '112',
  official_source: 'CPCB Sameer / SAFAR India',
  active_policy: 'GRAP Stage IV Winter Emergency Measures',
};

export interface WorkedScenario {
  id: 'leaky_1bhk_toddler' | 'sealed_flat_purifier' | 'outdoor_worker';
  label: string;
  profile: HouseholdProfile;
  schedule: HourlyScheduleSlot[];
}

function buildStandardHomeSchedule(
  commuteHours: number[],
  commuteMode: HouseholdProfile['commute']['mode'],
  outdoorWorkHours: number[] = []
): HourlyScheduleSlot[] {
  const slots: HourlyScheduleSlot[] = [];
  for (let h = 0; h < 24; h++) {
    if (outdoorWorkHours.includes(h)) {
      slots.push({
        hour_index: h,
        micro_env: 'outdoors',
        activity: 'moderate',
        mask: 'none',
      });
    } else if (commuteHours.includes(h)) {
      slots.push({
        hour_index: h,
        micro_env: 'commute',
        activity: 'light',
        mask: 'none',
        commute_mode: commuteMode,
      });
    } else if (h >= 22 || h <= 6) {
      slots.push({
        hour_index: h,
        micro_env: 'home',
        activity: 'rest',
        mask: 'none',
      });
    } else {
      slots.push({
        hour_index: h,
        micro_env: 'home',
        activity: 'light',
        mask: 'none',
      });
    }
  }
  return slots;
}

export const WORKED_SCENARIOS: Record<WorkedScenario['id'], WorkedScenario> = {
  leaky_1bhk_toddler: {
    id: 'leaky_1bhk_toddler',
    label: 'Scenario 1: Leaky rented 1BHK with 18m toddler & LPG cooking',
    profile: {
      members: [
        { label: 'Toddler (18m)', age_band: 'infant_under_2', conditions: [] },
        { label: 'Caregiver', age_band: 'adult', conditions: [] },
      ],
      home: {
        type: 'single_room',
        size_band: 'small_under_40m2',
        windows_habit: 'loose_frames_drafty',
        ac_or_heater: 'none',
        cooking_fuel: 'lpg_gas',
        purifier: { has: false, type: 'none', cadr_m3_hr: 0 },
        masks: ['none'],
      },
      commute: { mode: 'walking', window: '08:00–09:00' },
      constraints: { budget_band: 'low_cost', renter: true, outdoor_work: false },
      languages: ['hi-IN', 'en-IN'],
    },
    schedule: buildStandardHomeSchedule([8], 'walking'),
  },

  sealed_flat_purifier: {
    id: 'sealed_flat_purifier',
    label: 'Scenario 2: Sealed 2BHK flat with pregnant parent & HEPA purifier',
    profile: {
      members: [
        { label: 'Pregnant parent', age_band: 'adult', conditions: ['pregnancy'] },
        { label: 'Spouse', age_band: 'adult', conditions: [] },
      ],
      home: {
        type: 'apartment',
        size_band: 'medium_40_85m2',
        windows_habit: 'mostly_closed',
        ac_or_heater: 'split_ac',
        cooking_fuel: 'piped_gas',
        purifier: { has: true, type: 'hepa', cadr_m3_hr: 320 },
        masks: ['n95_kn95_kf94'],
      },
      commute: { mode: 'car', window: '09:00–10:00' },
      constraints: { budget_band: 'moderate', renter: false, outdoor_work: false },
      languages: ['en-IN'],
    },
    schedule: buildStandardHomeSchedule([9, 18], 'car'),
  },

  outdoor_worker: {
    id: 'outdoor_worker',
    label: 'Scenario 3: Outdoor two-wheeler delivery worker (6h shift)',
    profile: {
      members: [
        { label: 'Outdoor worker', age_band: 'adult', conditions: [] },
      ],
      home: {
        type: 'shared_flat',
        size_band: 'small_under_40m2',
        windows_habit: 'loose_frames_drafty',
        ac_or_heater: 'none',
        cooking_fuel: 'lpg_gas',
        purifier: { has: false, type: 'none', cadr_m3_hr: 0 },
        masks: ['cloth_surgical'],
      },
      commute: { mode: 'two_wheeler', window: '09:00–15:00' },
      constraints: { budget_band: 'low_cost', renter: true, outdoor_work: true },
      languages: ['hi-IN', 'en-IN'],
    },
    schedule: buildStandardHomeSchedule([], 'two_wheeler', [9, 10, 11, 12, 13, 14]),
  },
};
