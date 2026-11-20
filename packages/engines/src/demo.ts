import { DELHI_WINTER_24H_PM25, WORKED_SCENARIOS } from './mockData.ts';
import { scoreAndRankActions } from './scoring.ts';

console.log('=== NIRVAAT M1 Deterministic Engines Demo (Delhi NCR Winter Inversion) ===\n');

for (const scenario of Object.values(WORKED_SCENARIOS)) {
  const result = scoreAndRankActions(
    scenario.profile,
    scenario.schedule,
    DELHI_WINTER_24H_PM25,
    undefined,
    `score_${scenario.id}`
  );

  console.log(`Scenario: ${scenario.label}`);
  console.log(`Envelope call_id=${result.call_id} ok=${result.ok} priority=${result.value.priority_member_label} equity_free=${result.value.equity_free_guaranteed}`);
  for (const act of result.value.top_actions) {
    console.log(
      `  #${act.rank} [${act.cost.toUpperCase()} | ${act.evidence}] ${act.title}` +
        ` -> ${act.daily_without_ug.median} -> ${act.daily_with_ug.median} ug/day` +
        ` (${act.daily_reduction_pct.q10}% to ${act.daily_reduction_pct.q90}%, ref=${act.impact_call_id})`
    );
  }
  console.log('');
}
