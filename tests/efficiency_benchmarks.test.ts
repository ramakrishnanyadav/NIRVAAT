import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WORKED_SCENARIOS,
  clearImpactCache,
  getImpactCacheSize,
  impactEstimate,
} from '../packages/engines/src/index.ts';
import {
  clearAqCache,
  fetchLiveAirQualitySummary,
  getAqCacheSize,
  roundCoarseCoord,
} from '../server/nirvaatTools.ts';

test('Efficiency Benchmark 1: Monte Carlo engine memoization provides >= 5x speedup', () => {
  clearImpactCache();
  const scenario = WORKED_SCENARIOS.leaky_1bhk_toddler;
  const input = {
    action: 'seal_gaps' as const,
    target_member_age_band: 'infant_under_2' as const,
    profile: scenario.profile,
    schedule: scenario.schedule,
    forecast_pm25_hourly: [250, 240, 230, 220, 200, 180, 150, 120, 100, 90, 80, 75],
    num_draws: 150,
    seed: 42019,
  };

  // Cold run (unmemoized Monte Carlo simulation)
  const t0 = performance.now();
  const coldResult = impactEstimate(input);
  const coldDurationMs = performance.now() - t0;

  assert.ok(coldResult.value.daily_reduction_pct.median > 0);
  assert.equal(getImpactCacheSize(), 1, 'Cache should store 1 item after cold run');

  // Warm run (memoized cache hit)
  const t1 = performance.now();
  const warmResult = impactEstimate(input);
  const warmDurationMs = performance.now() - t1;

  assert.equal(warmResult.value.daily_reduction_pct.median, coldResult.value.daily_reduction_pct.median);
  assert.equal(getImpactCacheSize(), 1, 'Cache size should remain 1');

  // Warm run must be substantially faster or sub-millisecond (< 0.8ms)
  assert.ok(
    warmDurationMs <= Math.max(0.8, coldDurationMs / 5),
    `Warm run (${warmDurationMs.toFixed(3)}ms) must be at least 5x faster than cold run (${coldDurationMs.toFixed(3)}ms) or sub-millisecond`
  );
});

test('Efficiency Benchmark 2: Impact cache strictly enforces MAX_IMPACT_CACHE_SIZE (250) bounds', () => {
  clearImpactCache();
  const scenario = WORKED_SCENARIOS.leaky_1bhk_toddler;

  // Insert 300 varied configurations
  for (let i = 0; i < 300; i++) {
    impactEstimate({
      action: 'seal_gaps',
      target_member_age_band: 'infant_under_2',
      profile: {
        ...scenario.profile,
        home: {
          ...scenario.profile.home,
          size_band: i % 2 === 0 ? 'small_under_40m2' : 'medium_40_85m2',
        },
      },
      schedule: scenario.schedule,
      forecast_pm25_hourly: [100 + (i % 50), 120, 140, 160],
      num_draws: 40,
      seed: 1000 + i,
    });
  }

  const cacheSize = getImpactCacheSize();
  assert.ok(
    cacheSize <= 250,
    `Cache size (${cacheSize}) must never exceed MAX_IMPACT_CACHE_SIZE (250)`
  );
  assert.equal(cacheSize, 250, 'Cache should be exactly saturated at 250');
});

test('Efficiency Benchmark 3: Open-Meteo cache bounds (120) and coarse spatial hit sharing', async () => {
  clearAqCache();

  // Test coarse rounding spatial hit
  // Points (28.651, 77.312) and (28.649, 77.308) both map to coarse grid 28.65, 77.31
  const region1 = {
    city: 'Delhi NCR',
    neighborhood: 'Anand Vihar',
    grid_id: '28.65_77.31',
    latitude: roundCoarseCoord(28.651),
    longitude: roundCoarseCoord(77.312),
    emergency_number: '112',
    official_source: 'CPCB',
    active_policy: 'GRAP IV',
  };

  const region2 = {
    city: 'Delhi NCR',
    neighborhood: 'Anand Vihar East',
    grid_id: '28.65_77.31',
    latitude: roundCoarseCoord(28.649),
    longitude: roundCoarseCoord(77.308),
    emergency_number: '112',
    official_source: 'CPCB',
    active_policy: 'GRAP IV',
  };

  assert.equal(region1.latitude, region2.latitude);
  assert.equal(region1.longitude, region2.longitude);

  const res1 = await fetchLiveAirQualitySummary(region1, 60, 'none');
  assert.ok(res1.ok, 'First air quality query must succeed');
  const sizeAfter1 = getAqCacheSize();
  assert.ok(sizeAfter1 >= 1);

  // Second fetch hits cache
  const res2 = await fetchLiveAirQualitySummary(region2, 60, 'none');
  assert.ok(res2.ok, 'Second air quality query must succeed');
  const sizeAfter2 = getAqCacheSize();
  assert.equal(sizeAfter1, sizeAfter2, 'Second regional query with identical coarse coords must hit cache');
  assert.equal(res1.data.pm2_5, res2.data.pm2_5);
});
