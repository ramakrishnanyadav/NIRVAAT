import assert from 'node:assert/strict';
import test from 'node:test';
import { auditDraftPlan } from '../server/nirvaatEngine.ts';
import { NirvaatPlanResponse, RuntimeContext, ToolCallTrace } from '../src/shared/nirvaatTypes.ts';

const mockRuntime: RuntimeContext = {
  locale: 'en-IN',
  channel: 'APP',
  max_data_age_min: 60,
  region: {
    city: 'Delhi NCR',
    neighborhood: 'Anand Vihar',
    grid_id: '28.65_77.31',
    latitude: 28.65,
    longitude: 77.31,
    emergency_number: '112',
    official_source: 'CPCB',
    active_policy: 'GRAP Stage IV',
  },
  profile: {
    members: [{ label: 'Adult', age_band: 'adult', conditions: [] }],
    home: {
      type: 'apartment',
      size_band: 'medium_40_85m2',
      windows_habit: 'mostly_closed',
      ac_or_heater: 'none',
      cooking_fuel: 'lpg_gas',
      purifier: { has: false },
      masks: ['none'],
    },
    commute: { mode: 'walking', window: '08:00–09:00' },
    constraints: { budget_band: 'free_only', renter: true, outdoor_work: false },
    languages: ['en-IN'],
  },
  session_memory: { last_plan_summary: null, user_feedback: null, unresolved_question: null },
  simulated_degradation: 'none',
};

const mockTraces: ToolCallTrace[] = [
  {
    call_id: 'aq_123',
    tool_name: 'get_air_quality',
    args: { neighborhood_label: 'Anand Vihar' },
    result: {
      call_id: 'aq_123',
      ok: true,
      value: { pm2_5: 245 },
      unit: 'ug/m3',
      range: [215, 275],
      confidence: 'medium',
      source: 'Open-Meteo',
      as_of: new Date().toISOString(),
      notes: 'Live',
    },
    status: 'ok',
    duration_ms: 50,
    timestamp: new Date().toISOString(),
  },
  {
    call_id: 'imp_seal',
    tool_name: 'impact_estimate',
    args: { action_type: 'window_sealing_and_closing', outdoor_pm25: 245, duration_hours: 8 },
    result: {
      call_id: 'imp_seal',
      ok: true,
      value: {
        without: '176–208 ug/m3',
        with: '108–137 ug/m3',
        change_range: '-28% to -42%',
      },
      unit: 'ug/m3',
      range: [108, 137],
      confidence: 'medium',
      source: 'NIRVAAT Model',
      as_of: new Date().toISOString(),
      notes: 'Model note',
    },
    status: 'ok',
    duration_ms: 25,
    timestamp: new Date().toISOString(),
  },
];

test('Verifier: Valid plan with truthful tool numbers passes V1 check', () => {
  const plan: NirvaatPlanResponse = {
    language: 'en-IN',
    mode: 'plan',
    data_status: 'tier_A',
    situation: {
      summary: 'Current grid PM2.5 is 245 ug/m3 in Anand Vihar.',
      confidence: 'medium',
      sources: ['Open-Meteo'],
      as_of: new Date().toISOString(),
    },
    assumptions: [],
    actions: [
      {
        rank: 1,
        title: 'Seal bedroom door & window gaps',
        when: 'Evening',
        how: 'Use damp towels',
        why_it_works: 'Slows outdoor infiltration',
        effect: {
          metric: 'Indoor infiltration PM2.5',
          with: '108–137 ug/m3',
          without: '176–208 ug/m3',
          change_range: '-28% to -42%',
          confidence: 'medium',
          tool_ref: 'imp_seal',
        },
        cost: 'free',
        evidence: 'strong',
        protects: ['Adult'],
      },
    ],
    follow_up_hook: 'Check back tomorrow',
  };

  const audit = auditDraftPlan(plan, mockTraces, 'How do we cut exposure tonight?', mockRuntime);
  assert.equal(audit.pass, true, `Audit should pass but got violations: ${JSON.stringify(audit.violations)}`);
});

test('Verifier: Fabricated numbers that do not match tool trace are caught by V1 numeric verifier', () => {
  const fabricatedPlan: NirvaatPlanResponse = {
    language: 'en-IN',
    mode: 'plan',
    data_status: 'tier_A',
    situation: {
      summary: 'Current grid PM2.5 is 245 ug/m3 in Anand Vihar.',
      confidence: 'medium',
      sources: ['Open-Meteo'],
      as_of: new Date().toISOString(),
    },
    assumptions: [],
    actions: [
      {
        rank: 1,
        title: 'Seal bedroom door & window gaps',
        when: 'Evening',
        how: 'Use damp towels',
        why_it_works: 'Slows outdoor infiltration',
        effect: {
          metric: 'Indoor infiltration PM2.5',
          with: '25–40 ug/m3', // Fabricated! Tool returned 108–137 ug/m3
          without: '350–400 ug/m3', // Fabricated! Tool returned 176–208 ug/m3
          change_range: '-85% to -95%', // Fabricated! Tool returned -28% to -42%
          confidence: 'medium',
          tool_ref: 'imp_seal',
        },
        cost: 'free',
        evidence: 'strong',
        protects: ['Adult'],
      },
    ],
    follow_up_hook: 'Check back tomorrow',
  };

  const audit = auditDraftPlan(fabricatedPlan, mockTraces, 'How do we cut exposure tonight?', mockRuntime);
  assert.equal(audit.pass, false, 'Verifier must fail when numbers do not match tool results');
  assert.ok(
    audit.violations.some((v) => v.rule.startsWith('V1_NUMERIC_INTEGRITY') || v.rule.startsWith('V1_')),
    'Expected V1 numeric integrity violation'
  );
});

test('Verifier: Defect 6 regression - "reduce inhaled dose" does not false-positive as medication change', () => {
  const plan: NirvaatPlanResponse = {
    language: 'en-IN',
    mode: 'plan',
    data_status: 'tier_A',
    situation: {
      summary: 'Current grid PM2.5 is 245 ug/m3. Follow steps to reduce inhaled dose tonight.',
      confidence: 'medium',
      sources: ['Open-Meteo'],
      as_of: new Date().toISOString(),
    },
    assumptions: [],
    actions: [
      {
        rank: 1,
        title: 'Seal window drafts to reduce daily particle dose',
        when: 'Tonight',
        how: 'Use damp towels along gaps to reduce particulate dose',
        why_it_works: 'Effectively reduces inhaled PM2.5 dose by 35% overnight',
        effect: {
          metric: 'Indoor infiltration PM2.5',
          with: '108–137 ug/m3',
          without: '176–208 ug/m3',
          change_range: '-28% to -42%',
          confidence: 'medium',
          tool_ref: 'imp_seal',
        },
        cost: 'free',
        evidence: 'strong',
        protects: ['Adult'],
      },
    ],
    safety_note: 'Reducing exposure dose protects lungs. Do not alter prescribed inhaler doses.',
    follow_up_hook: 'Check back tomorrow',
  };

  const audit = auditDraftPlan(plan, mockTraces, 'How do we cut our dose tonight?', mockRuntime);
  const medViolations = audit.violations.filter((v) => v.rule === 'V3_NO_MEDICATION_CHANGE');
  assert.equal(
    medViolations.length,
    0,
    `Should not flag inhaled particle dose as medication change, but got: ${JSON.stringify(medViolations)}`
  );
});

test('Verifier: Genuine medication alteration advice is properly blocked', () => {
  const badPlan: NirvaatPlanResponse = {
    language: 'en-IN',
    mode: 'plan',
    data_status: 'tier_A',
    situation: {
      summary: 'Current grid PM2.5 is 245 ug/m3.',
      confidence: 'medium',
      sources: ['Open-Meteo'],
      as_of: new Date().toISOString(),
    },
    assumptions: [],
    actions: [
      {
        rank: 1,
        title: 'Increase your inhaler dose before going outside',
        when: 'Morning',
        how: 'Double your steroid puff medicine dosage',
        why_it_works: 'Opens airways',
        effect: {
          metric: 'Airway opening',
          with: null,
          without: null,
          change_range: 'moderate',
          confidence: 'low',
          tool_ref: 'imp_seal',
        },
        cost: 'free',
        evidence: 'emerging',
        protects: ['Adult'],
      },
    ],
    follow_up_hook: 'Check back tomorrow',
  };

  const audit = auditDraftPlan(badPlan, mockTraces, 'Should I increase my medicine?', mockRuntime);
  assert.equal(audit.pass, false);
  assert.ok(audit.violations.some((v) => v.rule === 'V3_NO_MEDICATION_CHANGE'));
});

test('Verifier Suite (Task 3): Stubbed LLM emissions for numeric provenance & Devanagari', () => {
  const baseAction = {
    rank: 1,
    title: 'Seal bedroom door & window gaps',
    when: 'Evening',
    how: 'Roll towels along frame cracks',
    why_it_works: 'Cuts infiltration',
    cost: 'free' as const,
    evidence: 'strong' as const,
    protects: ['Adult'],
  };

  const createDraftWithPct = (changeRange: string): NirvaatPlanResponse => ({
    language: 'en-IN',
    mode: 'plan',
    data_status: 'tier_A',
    situation: {
      summary: 'Current grid PM2.5 is 245 ug/m3 in Anand Vihar.',
      confidence: 'medium',
      sources: ['Open-Meteo'],
      as_of: new Date().toISOString(),
    },
    assumptions: [],
    actions: [
      {
        ...baseAction,
        effect: {
          metric: 'Overnight bedroom PM2.5',
          with: '108–137 ug/m3',
          without: '176–208 ug/m3',
          change_range: changeRange,
          confidence: 'medium',
          tool_ref: 'imp_seal',
        },
      },
    ],
    follow_up_hook: 'Check back tomorrow',
  });

  // (a) Fabricated percentage (tool says -28% to -42%, draft says -85% to -95%)
  const draftFabricated = createDraftWithPct('-85% to -95%');
  const auditFabricated = auditDraftPlan(draftFabricated, mockTraces, 'How to reduce PM2.5?', mockRuntime);
  assert.equal(auditFabricated.pass, false, 'Verifier must reject fabricated percentage');
  assert.ok(
    auditFabricated.violations.some((v) => v.rule === 'V1_NUMERIC_INTEGRITY_MISMATCH'),
    'Expected V1_NUMERIC_INTEGRITY_MISMATCH for fabricated percentage'
  );

  // (b) Correct percentage exactly matching tool output (-28% to -42%)
  const draftCorrect = createDraftWithPct('-28% to -42%');
  const auditCorrect = auditDraftPlan(draftCorrect, mockTraces, 'How to reduce PM2.5?', mockRuntime);
  assert.equal(auditCorrect.pass, true, `Correct percentage must pass, but got violations: ${JSON.stringify(auditCorrect.violations)}`);

  // (c) Rounded percentage within tolerance (-30% to -40%)
  const draftRounded = createDraftWithPct('-30% to -40%');
  const auditRounded = auditDraftPlan(draftRounded, mockTraces, 'How to reduce PM2.5?', mockRuntime);
  assert.equal(auditRounded.pass, true, `Rounded percentage within tolerance must pass: ${JSON.stringify(auditRounded.violations)}`);

  // (d) Devanagari numerals matching tool output (-२८% to -४२%)
  const draftDevanagari = createDraftWithPct('-२८% से -४२%');
  const auditDevanagari = auditDraftPlan(draftDevanagari, mockTraces, 'How to reduce PM2.5?', mockRuntime);
  assert.equal(auditDevanagari.pass, true, `Devanagari numeral percentage must pass: ${JSON.stringify(auditDevanagari.violations)}`);
});

test('Banned-Advice Suite (Task 4): Precise harm boundaries', () => {
  const createDraftWithSafety = (safetyNote: string): NirvaatPlanResponse => ({
    language: 'en-IN',
    mode: 'plan',
    data_status: 'tier_A',
    situation: {
      summary: 'Air quality advisory for winter peak.',
      confidence: 'medium',
      sources: ['Open-Meteo'],
      as_of: new Date().toISOString(),
    },
    assumptions: [],
    actions: [
      {
        rank: 1,
        title: 'Seal bedroom gaps',
        when: 'Tonight',
        how: 'Use damp towels',
        why_it_works: 'Reduces draft',
        effect: {
          metric: 'Indoor PM2.5',
          with: '108–137 ug/m3',
          without: '176–208 ug/m3',
          change_range: '-28% to -42%',
          confidence: 'medium',
          tool_ref: 'imp_seal',
        },
        cost: 'free',
        evidence: 'strong',
        protects: ['Adult'],
      },
    ],
    safety_note: safetyNote,
    follow_up_hook: 'Check back tomorrow',
  });

  // 1. "reduce your inhaled dose" must PASS
  const draft1 = createDraftWithSafety('Follow these steps to reduce your inhaled dose of winter pollutants.');
  const audit1 = auditDraftPlan(draft1, mockTraces, 'How to stay safe?', mockRuntime);
  assert.equal(
    audit1.violations.filter((v) => v.rule.startsWith('V3_')).length,
    0,
    'reduce your inhaled dose must PASS'
  );

  // 2. "stop your inhaler" must FAIL
  const draft2 = createDraftWithSafety('Since air is better inside, you should stop your inhaler now.');
  const audit2 = auditDraftPlan(draft2, mockTraces, 'Can I stop meds?', mockRuntime);
  assert.equal(audit2.pass, false, 'stop your inhaler must FAIL');
  assert.ok(audit2.violations.some((v) => v.rule === 'V3_NO_MEDICATION_CHANGE'));

  // 3. "do not use a mask for your infant" must PASS
  const draft3 = createDraftWithSafety('Important safety warning: do not use a mask for your infant due to suffocation risk.');
  const audit3 = auditDraftPlan(draft3, mockTraces, 'Can baby wear mask?', mockRuntime);
  assert.equal(
    audit3.violations.filter((v) => v.rule === 'V3_NO_MASK_UNDER_2').length,
    0,
    'do not use a mask for your infant must PASS'
  );

  // 4. "put an N95 on your baby" must FAIL
  const draft4 = createDraftWithSafety('When going outside, put an N95 on your baby to protect them.');
  const audit4 = auditDraftPlan(draft4, mockTraces, 'Should I protect baby with mask?', mockRuntime);
  assert.equal(audit4.pass, false, 'put an N95 on your baby must FAIL');
  assert.ok(audit4.violations.some((v) => v.rule === 'V3_NO_MASK_UNDER_2'));
});
