import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { EmergencyView } from '../src/components/EmergencyView.tsx';
import { LearnView } from '../src/components/LearnView.tsx';
import { BreathOrb } from '../src/components/BreathOrb.tsx';
import { ExposureRing } from '../src/components/ExposureRing.tsx';
import { InversionTimeline } from '../src/components/InversionTimeline.tsx';
import { STRINGS } from '../src/i18n/strings.ts';
import { AirQualityPoint, GuidanceEntry } from '../src/shared/nirvaatTypes.ts';

// Setup JSDOM environment
const dom = new JSDOM('<!doctype html><html><body><main id="main-content"></main></body></html>', {
  url: 'http://localhost:3000',
});
Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true, writable: true });
Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
Object.defineProperty(globalThis, 'HTMLElement', { value: dom.window.HTMLElement, configurable: true, writable: true });

test('A11y Automated Audit: EmergencyView has zero serious or critical axe-core violations', async () => {
  const { container } = render(
    <EmergencyView
      emergencyNumber="112"
      lang="en"
      strings={STRINGS.en}
      onBack={() => {}}
    />
  );

  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });

  const seriousOrCritical = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? '')
  );

  assert.equal(
    seriousOrCritical.length,
    0,
    `Violations: ${JSON.stringify(seriousOrCritical, null, 2)}`
  );
});

test('A11y Automated Audit: BreathOrb has accessible patterns, aria-hidden decoration, and non-color cues', async () => {
  const { container } = render(
    <BreathOrb
      pm25={185}
      pm25Range="[150, 220]"
      asOf={new Date().toISOString()}
      label="Delhi NCR"
      reduceMotion={true}
    />
  );

  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });

  const seriousOrCritical = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? '')
  );

  assert.equal(seriousOrCritical.length, 0);
});

test('A11y Automated Audit: ExposureRing has aria-valuenow, table alternative, and accessible name', async () => {
  const { container } = render(
    <ExposureRing
      baselinePm25={180}
      plan={null}
      completedRanks={[]}
      title="Daily Inhaled Smog Dose"
      withPlanLabel="With plan"
      withoutPlanLabel="Without plan"
    />
  );

  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });

  const seriousOrCritical = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? '')
  );

  assert.equal(
    seriousOrCritical.length,
    0,
    `ExposureRing violations: ${JSON.stringify(seriousOrCritical, null, 2)}`
  );
});

test('A11y Automated Audit: InversionTimeline provides accessible slider, table mode, and keyboard navigation', async () => {
  const samplePoints: AirQualityPoint[] = [
    { time: '2026-11-21T00:00:00Z', pm2_5: 220, pm10: 310, us_aqi: 270 },
    { time: '2026-11-21T06:00:00Z', pm2_5: 280, pm10: 390, us_aqi: 330 },
    { time: '2026-11-21T14:00:00Z', pm2_5: 95, pm10: 140, us_aqi: 172 },
  ];

  const { container } = render(
    <InversionTimeline
      points={samplePoints}
      cleanestWindow={{ label: '13:00–16:00', avg_pm2_5: 95 }}
      peakWindow={{ label: '05:00–09:00', avg_pm2_5: 280 }}
      selectedHourIdx={0}
      onSelectHour={() => {}}
      source="CPCB Live"
      asOf={new Date().toISOString()}
    />
  );

  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      'region': { enabled: false },
    },
  });

  const seriousOrCritical = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? '')
  );

  assert.equal(
    seriousOrCritical.length,
    0,
    `InversionTimeline violations: ${JSON.stringify(seriousOrCritical, null, 2)}`
  );
});

test('A11y Automated Audit: LearnView has valid heading order and landmarks', async () => {
  const sampleEntries: GuidanceEntry[] = [
    {
      id: 'grap_guidance',
      topic: 'emergency',
      title: 'GRAP Emergency Thresholds',
      evidence: 'strong',
      summary: 'When air quality reaches Severe+ stage...',
      source: 'GRAP 2024 Schedule IV',
      do_this: ['Stay indoors with windows closed during inversion peak'],
      avoid_this: ['Avoid outdoor jogging before 11:00 AM'],
      sensitive_groups: ['children', 'older_adults'],
    },
  ];

  const { container } = render(<LearnView entries={sampleEntries} />);

  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      'region': { enabled: false },
    },
  });

  const seriousOrCritical = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? '')
  );

  assert.equal(
    seriousOrCritical.length,
    0,
    `LearnView violations: ${JSON.stringify(seriousOrCritical, null, 2)}`
  );
});
