import http from 'node:http';
import { app } from '../server.ts';
import { WORKED_SCENARIOS, batchEvaluateActionsCRN, clearImpactCache, impactEstimate } from '../packages/engines/src/index.ts';

interface BenchmarkStats {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  reqPerSec: number;
}

function computeStats(latencies: number[], totalWallMs: number): BenchmarkStats {
  const sorted = [...latencies].sort((a, b) => a - b);
  const n = sorted.length;
  const p = (pct: number) => {
    const idx = Math.min(n - 1, Math.floor(n * pct));
    return sorted[idx];
  };

  const total = sorted.reduce((sum, v) => sum + v, 0);
  return {
    count: n,
    totalMs: total,
    minMs: sorted[0] ?? 0,
    maxMs: sorted[n - 1] ?? 0,
    p50Ms: p(0.50),
    p90Ms: p(0.90),
    p95Ms: p(0.95),
    p99Ms: p(0.99),
    reqPerSec: totalWallMs > 0 ? Math.round((n / (totalWallMs / 1000)) * 10) / 10 : 0,
  };
}

async function runBenchmarks() {
  console.log('='.repeat(70));
  console.log(' NIRVAAT PERFORMANCE & LATENCY BENCHMARK SUITE');
  console.log('='.repeat(70));

  // 1. In-process Monte Carlo Engine Benchmark
  console.log('\n[1/3] Benchmarking Physics Monte Carlo Engine (300 draws)...');
  clearImpactCache();
  const scenario = WORKED_SCENARIOS.leaky_1bhk_toddler;
  const forecast = [
    320, 310, 290, 260, 220, 180, 160, 140, 120, 110, 105, 100,
    110, 130, 170, 210, 250, 280, 300, 320, 330, 340, 350, 330,
  ];

  // Cold single action
  const mcColdStart = performance.now();
  impactEstimate({
    action: 'seal_gaps',
    target_member_age_band: 'infant_under_2',
    profile: scenario.profile,
    schedule: scenario.schedule,
    forecast_pm25_hourly: forecast,
    num_draws: 300,
  });
  const mcColdDuration = performance.now() - mcColdStart;

  // Warm single action
  const mcWarmStart = performance.now();
  impactEstimate({
    action: 'seal_gaps',
    target_member_age_band: 'infant_under_2',
    profile: scenario.profile,
    schedule: scenario.schedule,
    forecast_pm25_hourly: forecast,
    num_draws: 300,
  });
  const mcWarmDuration = performance.now() - mcWarmStart;

  // CRN Batch across all 8 actions
  clearImpactCache();
  const crnColdStart = performance.now();
  batchEvaluateActionsCRN({
    profile: scenario.profile,
    target_member_age_band: 'infant_under_2',
    schedule: scenario.schedule,
    forecast_pm25_hourly: forecast,
    actions: [
      'seal_gaps',
      'close_windows_inversion',
      'ventilate_afternoon_window',
      'run_purifier_presleep',
      'diy_filter',
      'n95_on_commute',
      'cook_with_hood_window',
      'avoid_incense',
    ],
    num_draws: 300,
  });
  const crnColdDuration = performance.now() - crnColdStart;

  // CRN Batch Warm
  const crnWarmStart = performance.now();
  batchEvaluateActionsCRN({
    profile: scenario.profile,
    target_member_age_band: 'infant_under_2',
    schedule: scenario.schedule,
    forecast_pm25_hourly: forecast,
    actions: [
      'seal_gaps',
      'close_windows_inversion',
      'ventilate_afternoon_window',
      'run_purifier_presleep',
      'diy_filter',
      'n95_on_commute',
      'cook_with_hood_window',
      'avoid_incense',
    ],
    num_draws: 300,
  });
  const crnWarmDuration = performance.now() - crnWarmStart;

  console.log(`  - Single Action (Cold, 300 draws): ${mcColdDuration.toFixed(2)} ms`);
  console.log(`  - Single Action (Warm cache hit):   ${mcWarmDuration.toFixed(3)} ms (${(mcColdDuration / Math.max(0.001, mcWarmDuration)).toFixed(1)}x speedup)`);
  console.log(`  - CRN 8-Action Batch (Cold):       ${crnColdDuration.toFixed(2)} ms`);
  console.log(`  - CRN 8-Action Batch (Warm hit):   ${crnWarmDuration.toFixed(3)} ms (${(crnColdDuration / Math.max(0.001, crnWarmDuration)).toFixed(1)}x speedup)`);

  // 2. HTTP Server Benchmarking
  console.log('\n[2/3] Starting in-memory test HTTP server for /api/engines/plan...');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const payload = JSON.stringify({
    runtime: {
      locale: 'en-IN',
      channel: 'APP',
      region: {
        city: 'Delhi NCR',
        neighborhood: 'Anand Vihar · East Grid',
        grid_id: '28.65_77.31',
        latitude: 28.65,
        longitude: 77.31,
        emergency_number: '112',
        official_source: 'CPCB Sameer',
        active_policy: 'GRAP Stage IV',
      },
      profile: scenario.profile,
      max_data_age_min: 60,
      session_memory: {
        last_plan_summary: null,
        user_feedback: null,
        unresolved_question: null,
      },
      simulated_degradation: 'none',
    },
  });

  // Mock Open-Meteo upstream during benchmark
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    if (urlStr.includes('open-meteo.com')) {
      const mockPayload = {
        current: {
          time: '2026-11-21T05:00',
          pm2_5: 280.5,
          pm10: 420.0,
          us_aqi: 340,
          european_aqi: 90,
          nitrogen_dioxide: 65.2,
        },
        hourly: {
          time: Array.from({ length: 24 }, (_, i) => `2026-11-21T${String(i).padStart(2, '0')}:00`),
          pm2_5: forecast,
          pm10: forecast.map((v) => v * 1.5),
          us_aqi: forecast.map((v) => Math.min(500, v * 1.2)),
        },
      };
      return new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  // Cold Request
  const coldHttpStart = performance.now();
  const coldRes = await fetch(`${baseUrl}/api/engines/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  const coldHttpDuration = performance.now() - coldHttpStart;
  const coldJson = await coldRes.json();

  const sanitizedStatus = String(coldJson.plan?.data_status ?? '').replace(/[\r\n]/g, '');
  console.log(`  - Cold /api/engines/plan latency: ${coldHttpDuration.toFixed(2)} ms (HTTP ${coldRes.status}, data_status=${sanitizedStatus})`);

  // 100 Warm Requests
  console.log('\n  Sending 100 sequential warm requests to measure distribution...');
  const latencies: number[] = [];
  const testSuiteStart = performance.now();

  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    const res = await fetch(`${baseUrl}/api/engines/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    const d = performance.now() - t0;
    if (res.status === 200) {
      latencies.push(d);
    }
  }
  const testSuiteWall = performance.now() - testSuiteStart;
  const stats = computeStats(latencies, testSuiteWall);

  console.log('\n  Results for /api/engines/plan (100 runs):');
  console.log(`    Total Wall Time:  ${testSuiteWall.toFixed(1)} ms`);
  console.log(`    Throughput:       ${stats.reqPerSec} req/sec`);
  console.log(`    p50 (Median):     ${stats.p50Ms.toFixed(2)} ms`);
  console.log(`    p90:              ${stats.p90Ms.toFixed(2)} ms`);
  console.log(`    p95:              ${stats.p95Ms.toFixed(2)} ms`);
  console.log(`    p99:              ${stats.p99Ms.toFixed(2)} ms`);
  console.log(`    Min / Max:        ${stats.minMs.toFixed(2)} ms / ${stats.maxMs.toFixed(2)} ms`);

  // 3. Health & Cache Verification
  console.log('\n[3/3] Querying /api/health for live cache metrics...');
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthJson = await healthRes.json();
  console.log('  Cache Metrics from /api/health:');
  console.log(JSON.stringify(healthJson.cache_metrics, null, 2));

  // Teardown
  globalThis.fetch = originalFetch;
  server.close();
  console.log('\n' + '='.repeat(70));
  console.log(' BENCHMARK COMPLETED SUCCESSFULLY');
  console.log('='.repeat(70));
}

try {
  await runBenchmarks();
} catch (err) {
  console.error('Benchmark failed:', err);
  process.exit(1);
}
