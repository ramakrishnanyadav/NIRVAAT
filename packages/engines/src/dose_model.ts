import { AgeBand } from '../../contracts/src/profile.ts';
import { ToolEnvelope } from '../../contracts/src/toolEnvelope.ts';
import { PARAMETER_PRIORS, PRIORS_VERSION, VENTILATION_RATE_M3_HR } from './priors.ts';

export type MicroEnvironment = 'home' | 'commute' | 'school' | 'outdoors';
export type ActivityLevel = 'rest' | 'light' | 'moderate';
export type MaskType = 'none' | 'cloth_surgical' | 'n95_kn95_kf94' | 'valved_n95';

export interface HourlyScheduleSlot {
  hour_index: number;
  micro_env: MicroEnvironment;
  activity: ActivityLevel;
  mask: MaskType;
  commute_mode?: 'walking' | 'two_wheeler' | 'public_transit' | 'car' | 'work_from_home';
}

export interface DoseCalculationInput {
  age_band: AgeBand;
  schedule: HourlyScheduleSlot[];
  indoor_pm25_hourly: number[];
  outdoor_pm25_hourly: number[];
  /** Optional override for mask filtration * fit efficiency (0..1) */
  mask_efficiency_override?: number;
  /** Optional ventilation multiplier for Monte Carlo sampling */
  ventilation_multiplier?: number;
}

export interface DoseValue extends Record<string, unknown> {
  daily_inhaled_dose_ug: number;
  overnight_inhaled_dose_ug: number;
  time_weighted_conc_ug_m3: number;
  pediatric_mask_blocked: boolean;
  priors_version: string;
}

const COMMUTE_IO_FACTOR: Record<NonNullable<HourlyScheduleSlot['commute_mode']>, number> = {
  walking: 1.0,
  two_wheeler: 1.12,
  public_transit: 0.68,
  car: 0.45,
  work_from_home: 0.65,
};

export function getEffectiveMaskReduction(
  mask: MaskType,
  ageBand: AgeBand,
  override?: number
): { reduction: number; blockedUnder2: boolean } {
  // H4 hard rule: NEVER recommend or credit masks for infants/toddlers under age 2
  if (ageBand === 'infant_under_2') {
    return { reduction: 0, blockedUnder2: mask !== 'none' };
  }
  if (mask === 'none') {
    return { reduction: 0, blockedUnder2: false };
  }
  if (override !== undefined) {
    return { reduction: Math.min(0.95, Math.max(0, override)), blockedUnder2: false };
  }
  if (mask === 'cloth_surgical') {
    return { reduction: PARAMETER_PRIORS.mask_cloth_surgical.median, blockedUnder2: false };
  }
  if (ageBand === 'child_2_12') {
    return { reduction: PARAMETER_PRIORS.mask_n95_fit_child.median, blockedUnder2: false };
  }
  return { reduction: PARAMETER_PRIORS.mask_n95_fit_adult.median, blockedUnder2: false };
}

/**
 * Pure deterministic inhaled PM2.5 dose accumulator:
 *   Dose = sum_t [ C_micro(t) * (1 - mask_reduction) * V_E(age_band, activity) * dt ]
 */
export function computeInhaledDose(input: DoseCalculationInput): {
  dailyDoseUg: number;
  overnightDoseUg: number;
  timeWeightedConc: number;
  pediatricMaskBlocked: boolean;
} {
  const ventMult = input.ventilation_multiplier ?? 1.0;
  let totalDose = 0;
  let overnightDose = 0;
  let totalEffectiveConc = 0;
  let pediatricMaskBlocked = false;

  const slots = input.schedule;
  if (slots.length === 0) {
    return { dailyDoseUg: 0, overnightDoseUg: 0, timeWeightedConc: 0, pediatricMaskBlocked: false };
  }

  for (const slot of slots) {
    const hIdx = slot.hour_index;
    const cIn = Math.max(0, input.indoor_pm25_hourly[hIdx] ?? input.indoor_pm25_hourly[0] ?? 0);
    const cOut = Math.max(0, input.outdoor_pm25_hourly[hIdx] ?? input.outdoor_pm25_hourly[0] ?? 0);

    let cMicro = cIn;
    if (slot.micro_env === 'outdoors') {
      cMicro = cOut;
    } else if (slot.micro_env === 'school') {
      // Unfiltered school classroom typically tracks ~0.75 * outdoor
      cMicro = cOut * 0.75;
    } else if (slot.micro_env === 'commute') {
      const mode = slot.commute_mode ?? 'walking';
      cMicro = cOut * COMMUTE_IO_FACTOR[mode];
    }

    const maskRes =
      slot.micro_env === 'home'
        ? { reduction: 0, blockedUnder2: false }
        : getEffectiveMaskReduction(slot.mask, input.age_band, input.mask_efficiency_override);

    if (maskRes.blockedUnder2) pediatricMaskBlocked = true;

    const cInhaled = cMicro * (1 - maskRes.reduction);
    const ve = VENTILATION_RATE_M3_HR[input.age_band][slot.activity].median * ventMult;
    const hourDose = cInhaled * ve * 1; // dt = 1 hour -> ug

    totalDose += hourDose;
    totalEffectiveConc += cInhaled;
    // Clock overnight hours: 22:00 to 06:00 (9 hours total)
    const isNightHour = hIdx >= 22 || hIdx <= 6;
    if (isNightHour) {
      overnightDose += hourDose;
    }
  }

  return {
    dailyDoseUg: Math.round(totalDose * 10) / 10,
    overnightDoseUg: Math.round(overnightDose * 10) / 10,
    timeWeightedConc: Math.round((totalEffectiveConc / slots.length) * 10) / 10,
    pediatricMaskBlocked,
  };
}

/**
 * Re-indexes a 24-hour forecast array by LOCAL CLOCK HOUR (0..23).
 * When Open-Meteo returns hourly predictions starting at a mid-day hour (e.g. 14:00),
 * index 0 represents 14:00, index 10 represents 00:00 (midnight next day), etc.
 * This function places each hour's PM2.5 at its corresponding clock hour index (0..23)
 * so that cooking (8, 13, 20), commute (8, 9, 18), pre-sleep (21, 22), and overnight (22..6)
 * reference actual clock hours rather than arbitrary array positions.
 */
export function reindexForecastByClockHour(
  pointsOrNumbers: Array<{ time?: string; pm2_5?: number | null }> | number[],
  startClockHour?: number,
  fallbackVal = 120
): number[] {
  const aligned: number[] = new Array(24).fill(fallbackVal);
  const filled = new Array(24).fill(false);

  if (!Array.isArray(pointsOrNumbers) || pointsOrNumbers.length === 0) {
    return aligned;
  }

  if (typeof pointsOrNumbers[0] === 'number') {
    const nums = pointsOrNumbers as number[];
    const start = startClockHour ?? 0;
    for (let i = 0; i < Math.min(24, nums.length); i++) {
      const clockH = (start + i) % 24;
      aligned[clockH] = nums[i];
      filled[clockH] = true;
    }
  } else {
    const pts = pointsOrNumbers as Array<{ time?: string; pm2_5?: number | null }>;
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      let clockH = -1;
      if (pt.time) {
        const timePart = pt.time.split('T')[1];
        if (timePart) {
          const h = Number.parseInt(timePart.split(':')[0], 10);
          if (!Number.isNaN(h) && h >= 0 && h < 24) {
            clockH = h;
          }
        }
      }
      if (clockH < 0) {
        clockH = ((startClockHour ?? 0) + i) % 24;
      }
      if (typeof pt.pm2_5 === 'number' && Number.isFinite(pt.pm2_5)) {
        aligned[clockH] = pt.pm2_5;
        filled[clockH] = true;
      }
    }
  }

  // Fill any gaps by circular search from nearest valid reading
  for (let h = 0; h < 24; h++) {
    if (!filled[h]) {
      let fallback = fallbackVal;
      for (let offset = 1; offset <= 12; offset++) {
        const prev = (h - offset + 24) % 24;
        if (filled[prev]) {
          fallback = aligned[prev];
          break;
        }
        const next = (h + offset) % 24;
        if (filled[next]) {
          fallback = aligned[next];
          break;
        }
      }
      aligned[h] = fallback;
    }
  }

  return aligned;
}

export function runDoseModelTool(
  input: DoseCalculationInput,
  callId = 'dose_1',
  asOf = new Date().toISOString()
): ToolEnvelope<DoseValue> {
  const res = computeInhaledDose(input);
  const low = Math.round(res.dailyDoseUg * 0.78 * 10) / 10;
  const high = Math.round(res.dailyDoseUg * 1.24 * 10) / 10;

  return {
    call_id: callId,
    ok: true,
    value: {
      daily_inhaled_dose_ug: res.dailyDoseUg,
      overnight_inhaled_dose_ug: res.overnightDoseUg,
      time_weighted_conc_ug_m3: res.timeWeightedConc,
      pediatric_mask_blocked: res.pediatricMaskBlocked,
      priors_version: PRIORS_VERSION,
    },
    unit: 'ug',
    range: [low, high],
    confidence: 'medium',
    source: 'NIRVAAT Dose Engine (EPA Exposure Factors Handbook Table 6-1)',
    as_of: asOf,
    notes: res.pediatricMaskBlocked
      ? 'Masks automatically excluded for infant_under_2 safety.'
      : 'Population-average ventilation rates applied.',
  };
}
