import {
  DataStatusTier,
  NirvaatPlan,
  RuntimeContext,
  ToolCallTrace,
} from '@nirvaat/contracts';
import { BANNED_ADVICE_REGEXES, extractNumbers } from './rules.ts';

export interface AuditViolation {
  rule: string;
  field: string;
  fix: string;
}

export interface AuditResult {
  pass: boolean;
  violations: AuditViolation[];
}

export function auditDraftPlan(
  draft: NirvaatPlan,
  arg2?: RuntimeContext | ToolCallTrace[],
  arg3?: ToolCallTrace[] | string,
  arg4?: DataStatusTier | RuntimeContext,
  arg5?: DataStatusTier
): AuditResult {
  let runtime: RuntimeContext | undefined;
  let traces: ToolCallTrace[] = [];
  let expectedStatus: DataStatusTier = draft.data_status ?? 'tier_A';

  if (Array.isArray(arg2)) {
    traces = arg2;
    if (typeof arg4 === 'object' && arg4 !== null && 'region' in arg4) {
      runtime = arg4 as RuntimeContext;
    } else if (typeof arg3 === 'object' && arg3 !== null && 'region' in (arg3 as any)) {
      runtime = arg3 as unknown as RuntimeContext;
    }
    if (typeof arg5 === 'string') {
      expectedStatus = arg5 as DataStatusTier;
    } else if (typeof arg4 === 'string') {
      expectedStatus = arg4 as DataStatusTier;
    }
  } else {
    runtime = arg2 as RuntimeContext;
    traces = Array.isArray(arg3) ? arg3 : [];
    if (typeof arg4 === 'string') {
      expectedStatus = arg4 as DataStatusTier;
    }
  }

  const violations: AuditViolation[] = [];

  // V4: Tier alignment check
  if (draft.data_status !== expectedStatus) {
    violations.push({
      rule: 'V4_DATA_STATUS_TIER',
      field: 'data_status',
      fix: `Expected data_status=${expectedStatus} based on tool availability, but got ${draft.data_status}.`,
    });
  }

  // V2: Action count, cost equity, and evidence validation
  if (draft.mode === 'plan') {
    if (draft.actions.length === 0 || draft.actions.length > 3) {
      violations.push({
        rule: 'V2_ACTION_COUNT',
        field: 'actions',
        fix: 'Return exactly 1 to 3 actions in plan mode.',
      });
    }
    const hasFree = draft.actions.some((a) => a.cost === 'free');
    if (!hasFree) {
      violations.push({
        rule: 'V2_FREE_OPTION',
        field: 'actions[].cost',
        fix: 'Include at least one action with cost="free".',
      });
    }
    for (const action of draft.actions) {
      if (!['strong', 'moderate', 'emerging'].includes(action.evidence)) {
        violations.push({
          rule: 'V2_EVIDENCE_GRADE',
          field: `actions[${action.rank}].evidence`,
          fix: 'Use evidence grade strong, moderate, or emerging.',
        });
      }
    }
  }

  // V1: Tool reference provenance & numeric integrity check when in tier_A
  const validRefs = new Set(traces.map((t) => t.call_id));
  if (expectedStatus === 'tier_A') {
    for (const action of draft.actions) {
      if (action.effect.tool_ref && !validRefs.has(action.effect.tool_ref)) {
        violations.push({
          rule: 'V1_TOOL_REF',
          field: `actions[${action.rank}].effect.tool_ref`,
          fix: `tool_ref "${action.effect.tool_ref}" must match a real call_id from TOOL_RESULTS.`,
        });
      } else if (action.effect.tool_ref) {
        const trace = traces.find((t) => t.call_id === action.effect.tool_ref);
        const val = trace?.result && typeof trace.result === 'object'
          ? ((trace.result as Record<string, unknown>).value as Record<string, unknown> | undefined)
          : undefined;

        if (val && typeof val === 'object') {
          const expectedWith = typeof val.with === 'string' ? val.with : null;
          const expectedWithout = typeof val.without === 'string' ? val.without : null;
          const expectedChange = typeof val.change_range === 'string' ? val.change_range : null;

          if (action.effect.with && expectedWith) {
            const draftNums = extractNumbers(action.effect.with);
            const expectedNums = extractNumbers(expectedWith);
            if (draftNums.length > 0 && expectedNums.length > 0) {
              const minExp = Math.min(...expectedNums) * 0.8;
              const maxExp = Math.max(...expectedNums) * 1.2;
              const hasMatch = draftNums.some((n) => n >= minExp && n <= maxExp);
              if (!hasMatch) {
                violations.push({
                  rule: 'V1_NUMERIC_INTEGRITY_MISMATCH',
                  field: `actions[${action.rank}].effect.with`,
                  fix: `Numeric value "${action.effect.with}" contradicts tool result "${expectedWith}".`,
                });
              }
            }
          }

          if (action.effect.without && expectedWithout) {
            const draftNums = extractNumbers(action.effect.without);
            const expectedNums = extractNumbers(expectedWithout);
            if (draftNums.length > 0 && expectedNums.length > 0) {
              const minExp = Math.min(...expectedNums) * 0.8;
              const maxExp = Math.max(...expectedNums) * 1.2;
              const hasMatch = draftNums.some((n) => n >= minExp && n <= maxExp);
              if (!hasMatch) {
                violations.push({
                  rule: 'V1_NUMERIC_INTEGRITY_MISMATCH',
                  field: `actions[${action.rank}].effect.without`,
                  fix: `Numeric value "${action.effect.without}" contradicts tool result "${expectedWithout}".`,
                });
              }
            }
          }

          if (action.effect.change_range && expectedChange) {
            const draftNums = extractNumbers(action.effect.change_range).map(Math.abs);
            const expectedNums = extractNumbers(expectedChange).map(Math.abs);
            if (draftNums.length > 0 && expectedNums.length > 0) {
              const minExp = Math.min(...expectedNums) * 0.75;
              const maxExp = Math.max(...expectedNums) * 1.25;
              const hasMatch = draftNums.some((n) => n >= minExp && n <= maxExp);
              if (!hasMatch) {
                violations.push({
                  rule: 'V1_NUMERIC_INTEGRITY_MISMATCH',
                  field: `actions[${action.rank}].effect.change_range`,
                  fix: `Percentage change "${action.effect.change_range}" contradicts tool result "${expectedChange}".`,
                });
              }
            }
          }
        }
      }
    }
  } else if (expectedStatus === 'tier_C' || expectedStatus === 'tier_D') {
    for (const action of draft.actions) {
      if (action.effect.with !== null || action.effect.without !== null || /%/.test(action.effect.change_range)) {
        violations.push({
          rule: 'V1_NO_FABRICATED_NUMBERS',
          field: `actions[${action.rank}].effect`,
          fix: 'In tier_C/tier_D without live data or impact tool, set with=null, without=null, and use qualitative change_range.',
        });
      }
    }
  }

  // V3: Banned advice check across serialized text fields
  const serializedText = JSON.stringify({
    summary: draft.situation.summary,
    actions: draft.actions,
    more: draft.if_you_can_do_more,
    safety: draft.safety_note,
  });
  for (const ban of BANNED_ADVICE_REGEXES) {
    const isViolated = ban.test ? ban.test(serializedText) : ban.rx.test(serializedText);
    if (isViolated) {
      violations.push({
        rule: ban.rule,
        field: 'actions / safety_note',
        fix: ban.fix,
      });
    }
  }

  // V7: Check Hindi locale script if hi-IN selected
  if (runtime?.locale?.toLowerCase().startsWith('hi')) {
    const hasDevanagari = /[\u0900-\u097F]/.test(draft.situation.summary);
    if (!hasDevanagari) {
      violations.push({
        rule: 'V7_LOCALE_SCRIPT',
        field: 'situation.summary',
        fix: 'Write user-facing prose in Hindi (Devanagari script) matching locale hi-IN.',
      });
    }
  }

  return { pass: violations.length === 0, violations };
}
