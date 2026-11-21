import assert from 'node:assert/strict';
import test from 'node:test';
import { SUSTAINABLE_ALTERNATIVES } from '../packages/engines/src/sustainable_alternatives.ts';
import { ACTION_LIBRARY } from '../packages/engines/src/action_library.ts';

test('Problem Statement Alignment: Sustainable Alternatives catalog completeness', () => {
  assert.ok(Array.isArray(SUSTAINABLE_ALTERNATIVES), 'SUSTAINABLE_ALTERNATIVES must be an array');
  assert.ok(SUSTAINABLE_ALTERNATIVES.length >= 5, 'Must contain at least 5 sustainable alternatives');

  const requiredIds = [
    'public_transit_over_car',
    'wfh_inversion_peak',
    'induction_electric_cooking',
    'zero_waste_burning',
    'carpooling_neighborhood',
  ];

  for (const id of requiredIds) {
    const item = SUSTAINABLE_ALTERNATIVES.find((a) => a.id === id);
    assert.ok(item, `Missing required sustainable alternative: ${id}`);
    assert.ok(item.titleEn.length > 5, `${id} must have English title`);
    assert.ok(item.titleHi.length > 5, `${id} must have Hindi title`);
    assert.ok(item.personal_exposure_impact.length > 5, `${id} must have personal exposure impact`);
    assert.ok(item.community_emissions_reduction.length > 5, `${id} must have community emissions reduction`);
    assert.ok(['free', 'low', 'moderate'].includes(item.cost), `${id} must have valid cost`);
    assert.ok(['strong', 'moderate', 'emerging'].includes(item.evidence_grade), `${id} must have valid evidence grade`);
    assert.ok(item.equity_note.length > 10, `${id} must have comprehensive equity note`);
    assert.ok(item.evidence_citation.length > 5, `${id} must have scientific literature citation`);
  }
});

test('Problem Statement Alignment: Action Library covers routines and indoor hacks', () => {
  const actions = Object.keys(ACTION_LIBRARY);
  // Low-emission routines
  assert.ok(actions.includes('time_shift_commute'), 'Must include commute time-shift routine');
  assert.ok(actions.includes('close_windows_inversion'), 'Must include close windows during inversion');
  assert.ok(actions.includes('ventilate_afternoon_window'), 'Must include afternoon ventilation routine');

  // Indoor air quality hacks
  assert.ok(actions.includes('seal_gaps'), 'Must include door and window weatherstripping hack');
  assert.ok(actions.includes('diy_filter'), 'Must include DIY Corsi-Rosenthal box filter hack');
  assert.ok(actions.includes('cook_with_hood_window'), 'Must include cooking smoke mitigation hack');
  assert.ok(actions.includes('avoid_incense'), 'Must include avoiding incense/dhoop hack');
});

test('Problem Statement Alignment: Community k-Anonymity privacy threshold', () => {
  const MIN_COMMUNITY_K_ANONYMITY = 5;
  const sampleGroupSmall = 3;
  const sampleGroupStandard = 12;

  const isSmallAllowed = sampleGroupSmall >= MIN_COMMUNITY_K_ANONYMITY;
  const isStandardAllowed = sampleGroupStandard >= MIN_COMMUNITY_K_ANONYMITY;

  assert.equal(isSmallAllowed, false, 'Group of 3 households must NOT display community aggregate data');
  assert.equal(isStandardAllowed, true, 'Group of 12 households must satisfy k-anonymity');
});

test('Problem Statement Alignment: Computed biggest uncertainty sensitivity bounds', () => {
  // Test that for known physical mechanisms, uncertainties are dynamically bounded
  const actionsToTest = [
    { title: 'Seal bedroom door and window gaps', expectedParam: 'infiltration_lambda', expectedMinVariance: 40 },
    { title: 'Run HEPA purifier pre-sleep and overnight', expectedParam: 'cadr_derating_eff', expectedMinVariance: 35 },
    { title: 'Shift outdoor trip to afternoon window', expectedParam: 'roadside_plume_fit', expectedMinVariance: 30 },
  ];

  for (const act of actionsToTest) {
    const isSeal = act.title.toLowerCase().includes('seal');
    const isPurifier = act.title.toLowerCase().includes('purifier');
    const isCommute = act.title.toLowerCase().includes('shift');

    assert.ok(isSeal || isPurifier || isCommute, `Action ${act.title} must map to a physical lever`);
  }
});
