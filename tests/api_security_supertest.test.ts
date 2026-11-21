import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { app } from '../server.ts';
import { WORKED_SCENARIOS } from '../packages/engines/src/index.ts';

// Deterministic mock for Open-Meteo to isolate tests from live external networks
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = String(input);
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
        pm2_5: Array.from({ length: 24 }, () => 280),
        pm10: Array.from({ length: 24 }, () => 420),
        us_aqi: Array.from({ length: 24 }, () => 340),
      },
    };
    return new Response(JSON.stringify(mockPayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return originalFetch(input, init);
}) as typeof fetch;

const baseRuntime = {
  locale: 'en-IN',
  channel: 'APP' as const,
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
  profile: WORKED_SCENARIOS.leaky_1bhk_toddler.profile,
  max_data_age_min: 60,
  session_memory: {
    last_plan_summary: null,
    user_feedback: null,
    unresolved_question: null,
  },
  simulated_degradation: 'none' as const,
};

test('Supertest API: Schema validation returns 400 on malformed payloads', async () => {
  // 1. Missing runtime object
  const res1 = await request(app)
    .post('/api/engines/plan')
    .send({ invalid_payload: true });
  assert.equal(res1.status, 400);
  assert.ok(res1.body.error, 'Must contain error message');

  // 2. Corrupt runtime with invalid enum values
  const res2 = await request(app)
    .post('/api/engines/plan')
    .send({
      runtime: {
        ...baseRuntime,
        locale: 12345, // invalid type
      },
    });
  assert.equal(res2.status, 400);

  // 3. /api/plan with empty object
  const res3 = await request(app)
    .post('/api/plan')
    .send({});
  assert.equal(res3.status, 400);
  assert.ok(res3.body.details, 'Must list field validation details');
});

test('Supertest API: Body parser enforces 64kb payload limit', async () => {
  const hugeString = 'A'.repeat(70 * 1024); // 70 KB
  const res = await request(app)
    .post('/api/engines/plan')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ runtime: baseRuntime, extra: hugeString }));

  // Express json parser with limit: '64kb' returns 413 Payload Too Large
  assert.equal(res.status, 413, 'Expected 413 Payload Too Large for body > 64kb');
});

test('Supertest API: Red-flag short-circuit triage makes ZERO LLM calls', async () => {
  const redFlagQueries = [
    'Help, my lips turned blue and I cannot breathe!',
    'bachcha saans nahi le pa raha hai',
    'सीने में तेज दर्द और जकड़न है',
  ];

  for (const q of redFlagQueries) {
    const res = await request(app)
      .post('/api/plan')
      .send({
        query: q,
        runtime: baseRuntime,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.plan.mode, 'emergency');
    assert.equal(res.body.plan.actions.length, 0, 'Emergency plan must have zero actions');
    assert.equal(res.body.model_used, 'deterministic-red-flag-triage');
    assert.equal(res.body.tool_traces.length, 0, 'Must have 0 tool traces (short-circuited)');
    assert.ok(res.body.plan.emergency.message.includes('112'), 'Must include emergency phone number');
  }
});

test('Supertest API: Deterministic degradation tiers A-D', async () => {
  // Tier C degradation (no_aq)
  const resDegraded = await request(app)
    .post('/api/engines/plan')
    .send({
      runtime: {
        ...baseRuntime,
        simulated_degradation: 'no_aq',
      },
    });

  assert.equal(resDegraded.status, 200);
  assert.equal(resDegraded.body.plan.data_status, 'tier_C');

  // Tier D degradation (all_down) via copilot safe fallback
  const resTierD = await request(app)
    .post('/api/plan')
    .send({
      query: 'What should we do tonight?',
      runtime: {
        ...baseRuntime,
        simulated_degradation: 'all_down',
      },
    });

  assert.equal(resTierD.status, 200);
  assert.equal(resTierD.body.plan.data_status, 'tier_D');
  assert.equal(resTierD.body.model_used, 'tier-d-safety-fallback');
});

test('Supertest API: /api/engines/plan runs deterministic audit and returns measured durations', async () => {
  const res = await request(app)
    .post('/api/engines/plan')
    .send({ runtime: baseRuntime });

  assert.equal(res.status, 200);
  assert.ok(res.body.plan);
  assert.ok(res.body.audit);
  assert.equal(typeof res.body.audit.pass, 'boolean');
  assert.ok(Array.isArray(res.body.tool_traces));
  assert.ok(res.body.tool_traces.length >= 2);

  // Each trace must have a real duration >= 0 ms
  for (const trace of res.body.tool_traces) {
    assert.equal(typeof trace.duration_ms, 'number');
    assert.ok(trace.duration_ms >= 0);
  }
});
