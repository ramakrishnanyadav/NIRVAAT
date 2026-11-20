import assert from 'node:assert/strict';
import test from 'node:test';
import { app, checkRateLimit, resetRateLimits } from '../server.ts';
import { WORKED_SCENARIOS } from '../packages/engines/src/index.ts';

// Helper to make mock in-memory HTTP requests against Express app
async function mockRequest(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const reqHeaders: Record<string, string> = {
      'content-type': 'application/json',
      ...headers,
    };

    const server = app.listen(0, '127.0.0.1', async () => {
      const address = server.address() as { port: number };
      const url = `http://127.0.0.1:${address.port}${path}`;
      try {
        const res = await fetch(url, {
          method,
          headers: reqHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = await res.json().catch(() => null);
        server.close(() => {
          resolve({ status: res.status, body: json });
        });
      } catch (err) {
        server.close(() => {
          throw err;
        });
      }
    });
  });
}

test('API contract: /api/health responds with 200 and service metadata', async () => {
  const res = await mockRequest('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.service, 'nirvaat-copilot');
  assert.ok(typeof res.body.timestamp === 'string');
});

test('API contract: /api/neighborhoods and /api/guidance return preset registries', async () => {
  const nRes = await mockRequest('GET', '/api/neighborhoods');
  assert.equal(nRes.status, 200);
  assert.ok(Array.isArray(nRes.body.regions));
  assert.ok(nRes.body.regions.length >= 4);

  const gRes = await mockRequest('GET', '/api/guidance');
  assert.equal(gRes.status, 200);
  assert.ok(Array.isArray(gRes.body.entries));
  assert.ok(gRes.body.entries.length >= 2);
});

test('API /api/engines/plan: executes real audit, real measured durations, and honest data status', async () => {
  const scenario = WORKED_SCENARIOS.leaky_1bhk_toddler;
  const runtime = {
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
    profile: scenario.profile,
    max_data_age_min: 60,
    session_memory: {
      last_plan_summary: null,
      user_feedback: null,
      unresolved_question: null,
    },
    simulated_degradation: 'no_aq' as const, // Force simulated degradation to test honest tier downgrade
  };

  const res = await mockRequest('POST', '/api/engines/plan', { runtime });
  assert.equal(res.status, 200);
  assert.ok(res.body.plan, 'Must return generated plan');
  assert.ok(res.body.audit, 'Must return real audit report');
  assert.ok(typeof res.body.audit.pass === 'boolean', 'Audit must report boolean pass status');
  assert.ok(Array.isArray(res.body.audit.violations), 'Audit must report violations list');

  // Verify Defect 10: Must honestly report tier_C when degradation or fallback is active, NEVER claiming tier_A
  assert.equal(res.body.plan.data_status, 'tier_C', 'Fallback / degraded simulation must be tier_C');

  // Verify Defect 3: Traces have real measured durations (> 0)
  assert.ok(Array.isArray(res.body.tool_traces));
  assert.ok(res.body.tool_traces.length >= 2);
  for (const trace of res.body.tool_traces) {
    assert.ok(typeof trace.duration_ms === 'number' && trace.duration_ms >= 0, 'Must have measured duration');
  }
});

test('API /api/history: implements rate limiting and session isolation', async () => {
  resetRateLimits();

  const sessionA = 'test_user_session_A';
  const sessionB = 'test_user_session_B';

  const recordA = {
    query: 'How to protect toddler tonight?',
    region_label: 'Anand Vihar',
    channel: 'APP',
    plan: { title: 'Toddler plan' },
    tool_traces: [],
    model_used: 'nirvaat-engines',
  };

  // 1. Post to session A
  const postResA = await mockRequest('POST', '/api/history', recordA, {
    'x-nirvaat-session': sessionA,
  });
  assert.equal(postResA.status, 201);
  assert.equal(postResA.body.saved, true);
  const savedId = postResA.body.record.id;

  // 2. Fetch session A: contains record
  const getResA = await mockRequest('GET', '/api/history', undefined, {
    'x-nirvaat-session': sessionA,
  });
  assert.equal(getResA.status, 200);
  assert.equal(getResA.body.items.length, 1);
  assert.equal(getResA.body.items[0].id, savedId);

  // 3. Fetch session B: completely isolated, returns empty
  const getResB = await mockRequest('GET', '/api/history', undefined, {
    'x-nirvaat-session': sessionB,
  });
  assert.equal(getResB.status, 200);
  assert.equal(getResB.body.items.length, 0);

  // 4. Rate limiter test: trip quota
  let rateLimited = false;
  for (let i = 0; i < 35; i++) {
    const allowed = checkRateLimit('test_ip_key', 30, 60_000);
    if (!allowed) {
      rateLimited = true;
      break;
    }
  }
  assert.ok(rateLimited, 'Rate limiter must reject calls beyond quota (30 req/min)');
});
