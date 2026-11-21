import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ROOM_VOLUME_PRIORS,
  COOKING_SCHEDULE_PRIORS,
  solveIndoorMassBalance,
  computeInhaledDose,
} from '@nirvaat/engines';
import { ValidationError } from '../errors/NirvaatError.ts';

const router = Router();

export const SimulateTwinSchema = z.object({
  outdoor_pm25_hourly: z.array(z.number().min(0).max(1200)).min(12).max(24),
  size_band: z.enum(['small_under_40m2', 'medium_40_85m2', 'large_over_85m2']),
  age_band: z.enum(['infant_under_2', 'child_2_12', 'teen', 'adult', 'older_adult_65_plus']),
  seal_gaps: z.boolean(),
  clean_cooking: z.boolean(),
  filter_mode: z.enum(['none', 'diy_cr_box', 'hepa']),
}).strict();

// POST /api/engines/simulate - Interactive counterfactual twin simulator
router.post('/engines/simulate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = SimulateTwinSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError('Invalid simulation parameters.', { issues: parsed.error.issues });
    }

    const { outdoor_pm25_hourly, size_band, age_band, seal_gaps, clean_cooking, filter_mode } = parsed.data;
    const volume = ROOM_VOLUME_PRIORS[size_band]?.volume_m3 ?? 115;
    const cookingHours = COOKING_SCHEDULE_PRIORS.peak_hours;

    const baselineIndoor = solveIndoorMassBalance({
      outdoor_pm25_hourly,
      room_volume_m3: volume,
      penetration_p: 0.82,
      lambda_ach: 1.35,
      deposition_k: 0.39,
      source_ug_per_hr: outdoor_pm25_hourly.map((_, h) => (cookingHours.includes(h) ? 4800 : 0)),
      cadr_eff_m3_hr: 0,
    });

    const cadrEff = filter_mode === 'hepa' ? 320 * 0.72 : filter_mode === 'diy_cr_box' ? 280 * 0.65 : 0;
    const simulatedIndoor = solveIndoorMassBalance({
      outdoor_pm25_hourly,
      room_volume_m3: volume,
      penetration_p: seal_gaps ? 0.65 : 0.82,
      lambda_ach: seal_gaps ? 0.55 : 1.35,
      deposition_k: 0.39,
      source_ug_per_hr: outdoor_pm25_hourly.map((_, h) =>
        cookingHours.includes(h) ? (clean_cooking ? 1100 : 4800) : 0
      ),
      cadr_eff_m3_hr: cadrEff,
    });

    const schedule = outdoor_pm25_hourly.map((_, h) => ({
      hour_index: h,
      micro_env: 'home' as const,
      activity: h >= 22 || h <= 6 ? ('rest' as const) : ('light' as const),
      mask: 'none' as const,
    }));

    const doseBase = computeInhaledDose({
      age_band,
      schedule,
      indoor_pm25_hourly: baselineIndoor.hourly,
      outdoor_pm25_hourly,
    });

    const doseSim = computeInhaledDose({
      age_band,
      schedule,
      indoor_pm25_hourly: simulatedIndoor.hourly,
      outdoor_pm25_hourly,
    });

    res.json({
      ok: true,
      baseline_hourly: baselineIndoor.hourly,
      simulated_hourly: simulatedIndoor.hourly,
      baseline_mean_pm25: baselineIndoor.mean,
      simulated_mean_pm25: simulatedIndoor.mean,
      baseline_dose_ug: doseBase.dailyDoseUg,
      simulated_dose_ug: doseSim.dailyDoseUg,
      reduction_pct:
        doseBase.dailyDoseUg > 0
          ? Math.round(((doseBase.dailyDoseUg - doseSim.dailyDoseUg) / doseBase.dailyDoseUg) * 100)
          : 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
