import assert from 'node:assert/strict';
import test from 'node:test';
import { ToolEnvelopeBaseSchema } from '../../contracts/src/toolEnvelope.ts';
import { computeInhaledDose, runDoseModelTool } from '../src/dose_model.ts';
import { impactEstimate } from '../src/impact_estimate.ts';
import { runIndoorModelTool, solveIndoorMassBalance } from '../src/indoor_model.ts';
import { DELHI_WINTER_24H_PM25, WORKED_SCENARIOS } from '../src/mockData.ts';
import { PARAMETER_PRIORS } from '../src/priors.ts';
import { scoreAndRankActions } from '../src/scoring.ts';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('Analytical steady-state convergence: S=0 and CADR=0 converges to P*lambda*C_out/(lambda+k)', () => {
  const cOut = 200;
  const P = 0.72;
  const lambda = 1.2;
  const k = 0.39;
  const expectedSteadyState = (P * lambda * cOut) / (lambda + k);

  const sim = solveIndoorMassBalance({
    outdoor_pm25_hourly: Array(48).fill(cOut),
    room_volume_m3: 80,
    penetration_p: P,
    lambda_ach: lambda,
    deposition_k: k,
    source_ug_per_hr: 0,
    cadr_eff_m3_hr: 0,
    initial_indoor_pm25: 0,
  });

  const finalVal = sim.hourly[sim.hourly.length - 1];
  assert.ok(
    Math.abs(finalVal - expectedSteadyState) < 0.05,
    `Expected convergence to ${expectedSteadyState}, got ${finalVal}`
  );
});

test('Property tests (100 seeded random configurations): CADR monotonicity, C_out monotonicity, sealing never raises lambda, finite bounds', () => {
  const rng = mulberry32(987654321);

  for (let i = 0; i < 100; i++) {
    const cOutBase = 20 + rng() * 450;
    const outdoor = Array.from({ length: 24 }, () => cOutBase * (0.7 + rng() * 0.6));
    const V = 20 + rng() * 140;
    const P = 0.3 + rng() * 0.65;
    const lam = 0.25 + rng() * 3.5;
    const k = 0.15 + rng() * 0.5;
    const S = rng() * 8000;
    const cadrLow = rng() * 150;
    const cadrHigh = cadrLow + 20 + rng() * 300;

    const baseSim = solveIndoorMassBalance({
      outdoor_pm25_hourly: outdoor,
      room_volume_m3: V,
      penetration_p: P,
      lambda_ach: lam,
      deposition_k: k,
      source_ug_per_hr: S,
      cadr_eff_m3_hr: cadrLow,
    });

    const moreCadrSim = solveIndoorMassBalance({
      outdoor_pm25_hourly: outdoor,
      room_volume_m3: V,
      penetration_p: P,
      lambda_ach: lam,
      deposition_k: k,
      source_ug_per_hr: S,
      cadr_eff_m3_hr: cadrHigh,
    });

    const higherOutSim = solveIndoorMassBalance({
      outdoor_pm25_hourly: outdoor.map((v) => v + 25),
      room_volume_m3: V,
      penetration_p: P,
      lambda_ach: lam,
      deposition_k: k,
      source_ug_per_hr: S,
      cadr_eff_m3_hr: cadrLow,
    });

    for (let h = 0; h < 24; h++) {
      assert.ok(Number.isFinite(baseSim.hourly[h]) && baseSim.hourly[h] >= 0);
      assert.ok(
        moreCadrSim.hourly[h] <= baseSim.hourly[h] + 1e-6,
        `More CADR raised C_in at hour ${h}: ${moreCadrSim.hourly[h]} > ${baseSim.hourly[h]}`
      );
      assert.ok(
        higherOutSim.hourly[h] >= baseSim.hourly[h] - 1e-6,
        `Higher C_out lowered C_in at hour ${h}: ${higherOutSim.hourly[h]} < ${baseSim.hourly[h]}`
      );
    }
  }

  assert.ok(
    PARAMETER_PRIORS.ach_sealed.median < PARAMETER_PRIORS.ach_drafty_closed.median,
    'Sealing gaps must lower median air exchange rate lambda'
  );
});

test('Dimensional analysis & ToolEnvelope validation across all engines', () => {
  const indEnv = runIndoorModelTool({
    outdoor_pm25_hourly: DELHI_WINTER_24H_PM25,
    room_volume_m3: 65,
    penetration_p: 0.82,
    lambda_ach: 1.35,
    deposition_k: 0.39,
    source_ug_per_hr: 0,
    cadr_eff_m3_hr: 0,
  });
  assert.equal(ToolEnvelopeBaseSchema.safeParse(indEnv).success, true);
  assert.equal(indEnv.unit, 'ug/m3');
  assert.ok(indEnv.range[0] <= indEnv.range[1]);

  const sc1 = WORKED_SCENARIOS.leaky_1bhk_toddler;
  const doseEnv = runDoseModelTool({
    age_band: 'infant_under_2',
    schedule: sc1.schedule,
    indoor_pm25_hourly: indEnv.value.hourly_indoor_pm25,
    outdoor_pm25_hourly: DELHI_WINTER_24H_PM25,
  });
  assert.equal(ToolEnvelopeBaseSchema.safeParse(doseEnv).success, true);
  assert.equal(doseEnv.unit, 'ug');
  assert.ok(doseEnv.range[0] <= doseEnv.range[1]);
});

test('H4 Safety: infant_under_2 strictly blocks mask filtration credit and flags pediatric_mask_blocked', () => {
  const sc1 = WORKED_SCENARIOS.leaky_1bhk_toddler;
  const maskedSchedule = sc1.schedule.map((slot) => ({
    ...slot,
    mask: 'n95_kn95_kf94' as const,
  }));

  const res = computeInhaledDose({
    age_band: 'infant_under_2',
    schedule: maskedSchedule,
    indoor_pm25_hourly: Array(24).fill(150),
    outdoor_pm25_hourly: Array(24).fill(250),
  });

  const unmaskedRes = computeInhaledDose({
    age_band: 'infant_under_2',
    schedule: sc1.schedule,
    indoor_pm25_hourly: Array(24).fill(150),
    outdoor_pm25_hourly: Array(24).fill(250),
  });

  assert.equal(res.pediatricMaskBlocked, true);
  assert.equal(res.dailyDoseUg, unmaskedRes.dailyDoseUg);
});

test('Monte Carlo impact_estimate returns q10 <= median <= q90 and sensitivity drivers', () => {
  const sc2 = WORKED_SCENARIOS.sealed_flat_purifier;
  const imp = impactEstimate({
    profile: sc2.profile,
    target_member_age_band: 'adult',
    schedule: sc2.schedule,
    action: 'run_purifier_presleep',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
  });

  assert.equal(ToolEnvelopeBaseSchema.safeParse(imp).success, true);
  assert.ok(imp.value.daily_with_ug.q10 <= imp.value.daily_with_ug.median);
  assert.ok(imp.value.daily_with_ug.median <= imp.value.daily_with_ug.q90);
  assert.ok(imp.value.top_uncertainties.length >= 1);
  assert.ok(imp.value.dose_avoided_median_ug > 0);
});

test('Scoring engine handles all 3 worked scenarios with <= 3 actions and H5 free-option guarantee', () => {
  for (const scenario of Object.values(WORKED_SCENARIOS)) {
    const scored = scoreAndRankActions(
      scenario.profile,
      scenario.schedule,
      DELHI_WINTER_24H_PM25
    );
    assert.equal(ToolEnvelopeBaseSchema.safeParse(scored).success, true);
    assert.ok(scored.value.top_actions.length >= 1 && scored.value.top_actions.length <= 3);
    assert.equal(scored.value.equity_free_guaranteed, true);
    assert.ok(
      scored.value.top_actions.some((a) => a.cost === 'free'),
      `Scenario ${scenario.id} missed free action`
    );
  }
});
