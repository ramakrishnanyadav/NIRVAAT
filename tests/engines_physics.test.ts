import assert from 'node:assert/strict';
import test from 'node:test';
import { solveIndoorMassBalance } from '../packages/engines/src/indoor_model.ts';
import { computeInhaledDose, reindexForecastByClockHour } from '../packages/engines/src/dose_model.ts';
import { impactEstimate } from '../packages/engines/src/impact_estimate.ts';
import { DELHI_WINTER_24H_PM25, WORKED_SCENARIOS } from '../packages/engines/src/mockData.ts';

test('Physics Defect 7.1: seal_gaps must NEVER yield negative reduction on sealed flats (correlated draws)', () => {
  // Scenario 2 is already a sealed flat (mostly_closed)
  const sc2 = WORKED_SCENARIOS.sealed_flat_purifier;
  const imp = impactEstimate({
    profile: sc2.profile,
    target_member_age_band: 'adult',
    schedule: sc2.schedule,
    action: 'seal_gaps',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
    num_draws: 150,
  });

  // Dose with action should be <= dose without action in every quantile
  assert.ok(
    imp.value.daily_reduction_pct.q10 >= 0,
    `Q10 reduction was negative for sealed flat: ${imp.value.daily_reduction_pct.q10}%`
  );
  assert.ok(
    imp.value.dose_avoided_median_ug >= 0,
    `Avoided dose was negative: ${imp.value.dose_avoided_median_ug}`
  );
});

test('Physics Defect 7.2: ventilate_afternoon_window must NOT silently seal gaps for the other 23 hours', () => {
  const leakyProfile = WORKED_SCENARIOS.leaky_1bhk_toddler.profile;
  const imp = impactEstimate({
    profile: leakyProfile,
    target_member_age_band: 'adult',
    schedule: WORKED_SCENARIOS.leaky_1bhk_toddler.schedule,
    action: 'ventilate_afternoon_window',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
    num_draws: 60,
  });

  // It should NOT claim massive reduction equivalent to full home weatherstripping
  // If it silently sealed all 23 other hours, reduction would be inflated to ~35-45%
  // Pure ventilation flush typically produces small-to-moderate marginal reduction
  assert.ok(
    imp.value.daily_reduction_pct.median <= 22,
    `Ventilate afternoon claimed ${imp.value.daily_reduction_pct.median}% daily reduction, indicating silent full-day sealing artifact!`
  );
});

test('Physics Defect 7.3: close_windows_inversion must produce non-zero reduction when baseline keeps windows open', () => {
  const openWindowProfile = {
    ...WORKED_SCENARIOS.leaky_1bhk_toddler.profile,
    home: {
      ...WORKED_SCENARIOS.leaky_1bhk_toddler.profile.home,
      windows_habit: 'kept_open_night' as const,
    },
  };

  const imp = impactEstimate({
    profile: openWindowProfile,
    target_member_age_band: 'adult',
    schedule: WORKED_SCENARIOS.leaky_1bhk_toddler.schedule,
    action: 'close_windows_inversion',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
    num_draws: 60,
  });

  assert.ok(
    imp.value.dose_avoided_median_ug > 15,
    `close_windows_inversion produced near-zero avoidance (${imp.value.dose_avoided_median_ug} ug) on kept_open_night flat!`
  );
});

test('Physics Defect 7.4: time_shift_commute must conserve 24-hour schedule (vacated hour replaced with home)', () => {
  const sc1 = WORKED_SCENARIOS.leaky_1bhk_toddler;
  const imp = impactEstimate({
    profile: sc1.profile,
    target_member_age_band: 'adult',
    schedule: sc1.schedule,
    action: 'time_shift_commute',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
    num_draws: 60,
  });

  // Shifting commute from peak morning (hour 8) to cleanest afternoon (hour 14)
  // should yield realistic positive reduction without dropping an hour from the day
  assert.ok(
    imp.value.dose_avoided_median_ug > 0,
    `Expected positive avoided dose from time shift, got ${imp.value.dose_avoided_median_ug}`
  );
});

test('Physics Defect 7.5: overnight dose calculation reflects clock night hours (22:00–06:00), not fixed array indices 0..7', () => {
  // Schedule starting at 12:00 PM (hour 12) through 11:00 AM next day
  const shiftedSchedule = Array.from({ length: 24 }, (_, i) => {
    const clockHour = (12 + i) % 24;
    return {
      hour_index: clockHour,
      micro_env: 'home' as const,
      activity: (clockHour >= 22 || clockHour <= 6) ? ('rest' as const) : ('light' as const),
      mask: 'none' as const,
    };
  });

  // High PM2.5 at night (22:00 to 06:00), low PM2.5 in afternoon (12:00 to 18:00)
  const hourlyOutdoor = Array(24).fill(50);
  for (let h = 22; h < 24; h++) hourlyOutdoor[h] = 300;
  for (let h = 0; h <= 6; h++) hourlyOutdoor[h] = 300;

  const dose = computeInhaledDose({
    age_band: 'adult',
    schedule: shiftedSchedule,
    indoor_pm25_hourly: hourlyOutdoor,
    outdoor_pm25_hourly: hourlyOutdoor,
  });

  // Overnight dose should capture the high 300 ug/m3 hours (22:00 to 06:00), which are 9 hours
  // If it used fixed indices 0..7 (12:00 to 19:00), it would capture 50 ug/m3 and produce ~10x lower dose!
  assert.ok(
    dose.overnightDoseUg > 400,
    `Overnight dose was only ${dose.overnightDoseUg} ug! It likely used array slice 0..7 instead of clock night hours.`
  );
});

test('Physics Defect 4: variance_share_pct is dynamically computed and sums to 100%', () => {
  const sc1 = WORKED_SCENARIOS.leaky_1bhk_toddler;
  const imp = impactEstimate({
    profile: sc1.profile,
    target_member_age_band: 'adult',
    schedule: sc1.schedule,
    action: 'seal_gaps',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
    num_draws: 80,
  });

  const drivers = imp.value.top_uncertainties;
  assert.ok(drivers.length >= 1, 'Expected at least 1 uncertainty driver');
  const sumVariance = drivers.reduce((acc: number, d) => acc + d.variance_share_pct, 0);
  assert.ok(
    Math.abs(sumVariance - 100) <= 2,
    `Variance shares must sum to ~100%, but summed to ${sumVariance}%`
  );
});

test('Physics Defect 7.6: avoid_incense yields 0 avoided dose when profile has no incense source, and >0 when incense is present', () => {
  const baseProfile = WORKED_SCENARIOS.leaky_1bhk_toddler.profile;
  const noIncenseProfile = {
    ...baseProfile,
    home: {
      ...baseProfile.home,
      incense_or_dhoop: false,
    },
  };

  const impNoIncense = impactEstimate({
    profile: noIncenseProfile,
    target_member_age_band: 'adult',
    schedule: WORKED_SCENARIOS.leaky_1bhk_toddler.schedule,
    action: 'avoid_incense',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
    seed: 42,
    num_draws: 80,
  });

  assert.equal(
    impNoIncense.value.dose_avoided_median_ug,
    0,
    `Homes with no incense source must evaluate avoid_incense to 0 avoided dose, got ${impNoIncense.value.dose_avoided_median_ug}`
  );
  assert.equal(impNoIncense.value.daily_reduction_pct.median, 0);

  const incenseProfile = {
    ...baseProfile,
    home: {
      ...baseProfile.home,
      incense_or_dhoop: true,
    },
  };

  const impWithIncense = impactEstimate({
    profile: incenseProfile,
    target_member_age_band: 'adult',
    schedule: WORKED_SCENARIOS.leaky_1bhk_toddler.schedule,
    action: 'avoid_incense',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
    seed: 42,
    num_draws: 80,
  });

  assert.ok(
    impWithIncense.value.dose_avoided_median_ug > 50,
    `Homes with incense source must receive non-zero avoided dose, got ${impWithIncense.value.dose_avoided_median_ug}`
  );
  assert.ok(impWithIncense.value.daily_reduction_pct.median > 0);
});

test('Physics Defect 8.1: confidence drops when priors are assumed or data is incomplete', () => {
  const baseProfile = WORKED_SCENARIOS.sealed_flat_purifier.profile;
  const sealedProfile = {
    ...baseProfile,
    home: {
      ...baseProfile.home,
      windows_habit: 'mostly_closed' as const,
    },
  };

  // Action using assumed prior (ach_drafty_closed has status="assumed")
  const impAssumed = impactEstimate({
    profile: sealedProfile,
    target_member_age_band: 'adult',
    schedule: WORKED_SCENARIOS.sealed_flat_purifier.schedule,
    action: 'seal_gaps',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
    seed: 42,
    num_draws: 100,
  });

  assert.notEqual(
    impAssumed.confidence,
    'high',
    `Actions relying on assumed priors must never report high confidence! Got: ${impAssumed.confidence}`
  );

  // Incomplete forecast (< 24 hours) must also downgrade confidence
  const impIncomplete = impactEstimate({
    profile: sealedProfile,
    target_member_age_band: 'adult',
    schedule: WORKED_SCENARIOS.sealed_flat_purifier.schedule,
    action: 'run_purifier_presleep',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25.slice(0, 12),
    seed: 42,
    num_draws: 100,
  });

  assert.notEqual(
    impIncomplete.confidence,
    'high',
    `Incomplete forecast inputs (< 24h) must drop confidence! Got: ${impIncomplete.confidence}`
  );
});

test('Physics Defect 8.2: determinism: identical seed produces identical output byte-for-byte', () => {
  const sc = WORKED_SCENARIOS.leaky_1bhk_toddler;
  const run1 = impactEstimate({
    profile: sc.profile,
    target_member_age_band: 'adult',
    schedule: sc.schedule,
    action: 'diy_filter',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
    seed: 12345,
    num_draws: 150,
  });

  const run2 = impactEstimate({
    profile: sc.profile,
    target_member_age_band: 'adult',
    schedule: sc.schedule,
    action: 'diy_filter',
    forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
    seed: 12345,
    num_draws: 150,
  });

  assert.deepEqual(run1.value, run2.value, 'Same seed must yield identical Monte Carlo results');
});

test('Physics Defect 8.3: stability across 5 seeds at N=300 draws remains within ±5% tolerance', () => {
  const sc = WORKED_SCENARIOS.leaky_1bhk_toddler;
  const seeds = [101, 202, 303, 404, 505];
  const medians: number[] = [];

  for (const s of seeds) {
    const res = impactEstimate({
      profile: sc.profile,
      target_member_age_band: 'adult',
      schedule: sc.schedule,
      action: 'run_purifier_presleep',
      forecast_pm25_hourly: DELHI_WINTER_24H_PM25,
      seed: s,
      num_draws: 300,
    });
    medians.push(res.value.daily_reduction_pct.median);
  }

  const avg = medians.reduce((a, b) => a + b, 0) / medians.length;
  for (const m of medians) {
    const diffPct = Math.abs(m - avg);
    assert.ok(
      diffPct <= 5,
      `Seed variation ${diffPct.toFixed(2)}% exceeded ±5% tolerance around average ${avg.toFixed(2)}% (value: ${m}%)`
    );
  }
});

test('Time Alignment (Task 1): forecast starting at 14:00 correctly maps clock hours to cooking, overnight, and time-shift commute', () => {
  // Construct a realistic 24-hour Open-Meteo telemetry curve starting at 14:00 (hour 14)
  // Afternoon hours (14:00 to 17:00) are lowest PM2.5 (~65 ug/m3)
  // Night inversion hours (22:00 to 06:00) are severe (~340 ug/m3)
  // Morning commute hour (08:00) is peak inversion (~295 ug/m3)
  const rawOpenMeteoForecast: Array<{ time: string; pm2_5: number }> = [];
  for (let i = 0; i < 24; i++) {
    const clockHour = (14 + i) % 24;
    const day = 14 + i >= 24 ? '2026-11-22' : '2026-11-21';
    const hourStr = clockHour.toString().padStart(2, '0');
    const time = `${day}T${hourStr}:00`;

    let pm25 = 120;
    if (clockHour >= 13 && clockHour <= 16) {
      pm25 = 65; // Cleanest afternoon window
    } else if (clockHour >= 22 || clockHour <= 6) {
      pm25 = 340; // Inversion night
    } else if (clockHour === 8 || clockHour === 9) {
      pm25 = 295; // Morning commute spike
    }
    rawOpenMeteoForecast.push({ time, pm2_5: pm25 });
  }

  assert.equal(rawOpenMeteoForecast[0].time, '2026-11-21T14:00');
  assert.equal(rawOpenMeteoForecast[0].pm2_5, 65);

  // 1. Verify reindexing by LOCAL CLOCK HOUR
  const clockAligned = reindexForecastByClockHour(rawOpenMeteoForecast, 14);
  assert.equal(clockAligned.length, 24, 'Reindexed forecast must contain exactly 24 clock hours');
  assert.equal(clockAligned[14], 65, 'Clock hour 14 (14:00) must be 65 ug/m3');
  assert.equal(clockAligned[23], 340, 'Clock hour 23 (23:00) must be 340 ug/m3');
  assert.equal(clockAligned[0], 340, 'Clock hour 0 (00:00 midnight) must be 340 ug/m3');
  assert.equal(clockAligned[8], 295, 'Clock hour 8 (08:00 morning commute) must be 295 ug/m3');

  // 2. Schedule with commute at clock hour 8 and night rest at clock hours 22..6
  const schedule = Array.from({ length: 24 }, (_, h) => ({
    hour_index: h,
    micro_env: h === 8 ? ('commute' as const) : ('home' as const),
    activity: (h >= 22 || h <= 6) ? ('rest' as const) : ('light' as const),
    mask: 'none' as const,
  }));

  const doseAligned = computeInhaledDose({
    age_band: 'adult',
    schedule,
    indoor_pm25_hourly: clockAligned,
    outdoor_pm25_hourly: clockAligned,
  });

  // Overnight dose covers 9 night hours (22:00–06:00) at 340 ug/m3 -> expected ~450+ ug
  assert.ok(
    doseAligned.overnightDoseUg > 400,
    `Overnight dose should capture night hours (expected > 400, got ${doseAligned.overnightDoseUg})`
  );

  // 3. Impact estimate with time_shift_commute shifts morning commute from hour 8 (295 ug) to hour 14 (65 ug)
  const sc = WORKED_SCENARIOS.leaky_1bhk_toddler;
  const imp = impactEstimate({
    profile: sc.profile,
    target_member_age_band: 'adult',
    schedule,
    action: 'time_shift_commute',
    forecast_pm25_hourly: clockAligned,
    num_draws: 80,
  });

  assert.ok(
    imp.value.dose_avoided_median_ug > 0,
    `Expected positive dose avoided from shifting commute to 14:00 dip, got ${imp.value.dose_avoided_median_ug}`
  );
});
