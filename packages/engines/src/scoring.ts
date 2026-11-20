import { AgeBand, HouseholdProfile } from '../../contracts/src/profile.ts';
import { ToolEnvelope } from '../../contracts/src/toolEnvelope.ts';
import { HourlyScheduleSlot } from './dose_model.ts';
import { ACTION_LIBRARY, ActionId, impactEstimate } from './impact_estimate.ts';
import { PRIORS_VERSION } from './priors.ts';

export interface ScoredActionItem {
  rank: number;
  action_id: ActionId;
  title: string;
  cost: 'free' | 'low' | 'medium' | 'high';
  evidence: 'strong' | 'moderate' | 'emerging';
  dose_avoided_ug: number;
  feasibility: number;
  score: number;
  daily_without_ug: { q10: number; median: number; q90: number };
  daily_with_ug: { q10: number; median: number; q90: number };
  daily_reduction_pct: { q10: number; median: number; q90: number };
  top_uncertainty: string;
  protects: string[];
  impact_call_id: string;
}

export interface ScoringResultValue extends Record<string, unknown> {
  top_actions: ScoredActionItem[];
  extra_actions: ScoredActionItem[];
  priority_member_label: string;
  equity_free_guaranteed: boolean;
  priors_version: string;
}

const COST_WEIGHT: Record<'free' | 'low' | 'medium' | 'high', number> = {
  free: 1.0,
  low: 1.6,
  medium: 2.5,
  high: 4.0,
};

const AGE_PRIORITY: Record<AgeBand, number> = {
  infant_under_2: 1,
  child_2_12: 2,
  older_adult_65_plus: 3,
  teen: 4,
  adult: 5,
};

export function pickPriorityMember(profile: HouseholdProfile) {
  return [...profile.members].sort((a, b) => {
    const scoreMember = (m: typeof a) => {
      if (m.age_band === 'infant_under_2') return 1;
      if (m.conditions.some((c) => /pregnan/i.test(c))) return 1.5;
      if (m.conditions.some((c) => /asthma|copd|heart/i.test(c))) return 2.2;
      return AGE_PRIORITY[m.age_band];
    };
    return scoreMember(a) - scoreMember(b);
  })[0];
}

function computeFeasibility(actionId: ActionId, profile: HouseholdProfile, targetAge: AgeBand): number {
  // H4: Never score masks for children under 2
  if (actionId === 'n95_on_commute' && targetAge === 'infant_under_2') {
    const anyOlder = profile.members.some((m) => m.age_band !== 'infant_under_2');
    if (!anyOlder) return 0;
  }

  // Budget constraints
  const def = ACTION_LIBRARY[actionId];
  if (profile.constraints.budget_band === 'free_only' && def.cost !== 'free') {
    return 0.15;
  }

  if (actionId === 'run_purifier_presleep' && !profile.home.purifier.has) {
    return profile.constraints.budget_band === 'moderate' ? 0.55 : 0.1;
  }

  if (actionId === 'cook_with_hood_window' && profile.home.cooking_fuel === 'induction_electric') {
    return 0.45;
  }

  if (actionId === 'time_shift_commute' && profile.constraints.outdoor_work) {
    // Outdoor workers have rigid shift timing -> lower feasibility for shifting entire shift
    return 0.35;
  }

  if (actionId === 'n95_on_commute' && profile.constraints.outdoor_work) {
    return 0.92;
  }

  return 0.88;
}

export function scoreAndRankActions(
  profile: HouseholdProfile,
  schedule: HourlyScheduleSlot[],
  forecastPm25Hourly: number[],
  candidateIds?: ActionId[],
  callId = 'score_1',
  asOf = new Date().toISOString()
): ToolEnvelope<ScoringResultValue> {
  const priorityMember = pickPriorityMember(profile);
  const candidates: ActionId[] = candidateIds ?? [
    'seal_gaps',
    'close_windows_inversion',
    'cook_with_hood_window',
    'diy_filter',
    'run_purifier_presleep',
    'time_shift_commute',
    'n95_on_commute',
    'avoid_incense',
  ];

  const evaluated: ScoredActionItem[] = [];

  for (const id of candidates) {
    const def = ACTION_LIBRARY[id];
    const targetAgeForAction: AgeBand =
      id === 'n95_on_commute' && priorityMember.age_band === 'infant_under_2'
        ? profile.members.find((m) => m.age_band !== 'infant_under_2')?.age_band ?? 'infant_under_2'
        : priorityMember.age_band;

    const feasibility = computeFeasibility(id, profile, targetAgeForAction);
    if (feasibility <= 0) continue;

    const imp = impactEstimate(
      {
        profile,
        target_member_age_band: targetAgeForAction,
        schedule,
        action: id,
        forecast_pm25_hourly: forecastPm25Hourly,
      },
      `imp_${id}`,
      asOf
    );

    const avoided = Math.max(0, imp.value.dose_avoided_median_ug);
    const score = Math.round(((avoided * feasibility) / COST_WEIGHT[def.cost]) * 100) / 100;

    const protects =
      id === 'n95_on_commute'
        ? profile.members.filter((m) => m.age_band !== 'infant_under_2').map((m) => m.label)
        : [priorityMember.label];

    evaluated.push({
      rank: 0,
      action_id: id,
      title: def.title,
      cost: def.cost,
      evidence: def.evidence,
      dose_avoided_ug: avoided,
      feasibility,
      score,
      daily_without_ug: imp.value.daily_without_ug,
      daily_with_ug: imp.value.daily_with_ug,
      daily_reduction_pct: imp.value.daily_reduction_pct,
      top_uncertainty: imp.value.top_uncertainties[0]?.plain_note ?? '',
      protects: protects.length > 0 ? protects : [priorityMember.label],
      impact_call_id: imp.call_id,
    });
  }

  evaluated.sort((a, b) => b.score - a.score);

  // H5 Equity guarantee: top 3 must include at least one cost='free' action
  let top3 = evaluated.slice(0, 3);
  if (top3.length > 0 && !top3.some((a) => a.cost === 'free')) {
    const bestFree = evaluated.find((a) => a.cost === 'free');
    if (bestFree) {
      top3 = [...top3.slice(0, 2), bestFree];
    }
  }

  const topIds = new Set(top3.map((a) => a.action_id));
  const extras = evaluated.filter((a) => !topIds.has(a.action_id)).slice(0, 2);

  const rankedTop = top3.map((item, idx) => ({ ...item, rank: idx + 1 }));
  const rankedExtras = extras.map((item, idx) => ({ ...item, rank: idx + 4 }));

  const totalAvoided = rankedTop.reduce((acc, a) => acc + a.dose_avoided_ug, 0);

  return {
    call_id: callId,
    ok: true,
    value: {
      top_actions: rankedTop,
      extra_actions: rankedExtras,
      priority_member_label: priorityMember.label,
      equity_free_guaranteed: rankedTop.some((a) => a.cost === 'free'),
      priors_version: PRIORS_VERSION,
    },
    unit: 'ug',
    range: [
      Math.round(totalAvoided * 0.7 * 10) / 10,
      Math.round(totalAvoided * 1.3 * 10) / 10,
    ],
    confidence: 'medium',
    source: `NIRVAAT Decision Scoring Engine v${PRIORS_VERSION}`,
    as_of: asOf,
    notes: `Ranked top ${rankedTop.length} actions for ${priorityMember.label} with H5 free-option guarantee.`,
  };
}
