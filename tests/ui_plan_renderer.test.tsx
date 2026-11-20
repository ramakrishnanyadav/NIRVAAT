import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlanRenderer } from '../src/components/PlanRenderer.tsx';
import { PlanQueryBar } from '../src/components/PlanQueryBar.tsx';
import { STRINGS } from '../src/i18n/strings.ts';
import { NirvaatPlanResponse } from '../src/shared/nirvaatTypes.ts';

// Setup JSDOM browser environment for Node.js test runner
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:3000',
});
Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true, writable: true });
Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
Object.defineProperty(globalThis, 'HTMLElement', { value: dom.window.HTMLElement, configurable: true, writable: true });

test('UI Component Test: PlanRenderer renders Tier B/C limited-data ribbon', () => {
  const tierCPlan: NirvaatPlanResponse = {
    language: 'en-IN',
    mode: 'plan',
    data_status: 'tier_C',
    situation: {
      summary: 'Outdoor station offline. General regional fallback guidance.',
      confidence: 'low',
      sources: ['CPCB Sameer'],
      as_of: new Date().toISOString(),
    },
    assumptions: ['Using regional default priors'],
    actions: [
      {
        rank: 1,
        title: 'Seal bedroom door and window frames',
        when: 'Evening',
        how: 'Use damp towels',
        why_it_works: 'Reduces draft rate',
        effect: {
          metric: 'Infiltration rate',
          with: null,
          without: null,
          change_range: 'moderate reduction',
          confidence: 'low',
          tool_ref: 'none',
        },
        cost: 'free',
        evidence: 'strong',
        protects: ['Adult'],
      },
    ],
    follow_up_hook: 'Check back tomorrow',
  };

  const { container } = render(
    <PlanRenderer
      plan={tierCPlan}
      channel="APP"
      strings={STRINGS.en}
      completedActionRanks={[]}
      onToggleDone={() => {}}
      onInspectToolRef={() => {}}
      onReplyClarify={() => {}}
      onFollowUpClick={() => {}}
    />
  );

  // 1. Verify limited-data ribbon is displayed for Tier C
  const ribbon = container.querySelector('[role="status"]');
  assert.ok(ribbon, 'Must render status ribbon when data_status is tier_C');
  assert.ok(ribbon.textContent?.toLowerCase().includes('tier c'), 'Ribbon must mention tier c');

  // 2. Verify qualitative display when with/without are null
  assert.ok(
    container.textContent?.includes('Expected shift: moderate reduction'),
    'Null numbers must be rendered qualitatively as Expected shift'
  );
});

test('UI Component Test: PlanRenderer renders Tier A with numeric before/after values', () => {
  const tierAPlan: NirvaatPlanResponse = {
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
        when: 'Tonight',
        how: 'Damp towels along frame cracks',
        why_it_works: 'Halves infiltration',
        effect: {
          metric: 'Overnight indoor PM2.5',
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

  const { container } = render(
    <PlanRenderer
      plan={tierAPlan}
      channel="APP"
      strings={STRINGS.en}
      completedActionRanks={[]}
      onToggleDone={() => {}}
      onInspectToolRef={() => {}}
      onReplyClarify={() => {}}
      onFollowUpClick={() => {}}
    />
  );

  // Tier A should NOT render degradation status ribbon
  const ribbon = container.querySelector('[role="status"]');
  assert.equal(ribbon, null, 'Tier A must not render degradation ribbon');

  // Check numeric before/after values
  assert.ok(container.textContent?.includes('176–208 ug/m3'));
  assert.ok(container.textContent?.includes('108–137 ug/m3'));
  assert.ok(container.textContent?.includes('-28% to -42%'));
});

test('UI Component Test: PlanQueryBar handles loading and error states correctly', () => {
  // 1. Loading state test
  const { container: loadingContainer } = render(
    <PlanQueryBar
      queryInput="How do we seal windows?"
      onChangeQueryInput={() => {}}
      onSubmitQuery={() => {}}
      planLoading={true}
      planError={null}
      scenarios={[]}
      lang="en"
      strings={STRINGS.en}
    />
  );

  const submitButton = loadingContainer.querySelector('button[type="submit"]') as HTMLButtonElement;
  assert.ok(submitButton.disabled, 'Submit button must be disabled when loading');
  assert.ok(loadingContainer.textContent?.includes('Working…'), 'Must show Working… spinner text');

  // 2. Error state test
  const { container: errorContainer } = render(
    <PlanQueryBar
      queryInput="Test query"
      onChangeQueryInput={() => {}}
      onSubmitQuery={() => {}}
      planLoading={false}
      planError="Network timeout fetching live telemetry"
      scenarios={[]}
      lang="en"
      strings={STRINGS.en}
    />
  );

  const alert = errorContainer.querySelector('[role="alert"]');
  assert.ok(alert, 'Must render role="alert" container on plan error');
  assert.ok(alert.textContent?.includes('Network timeout fetching live telemetry'));
  assert.ok(alert.textContent?.includes('Retry'));
});
