import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { PlanAction, ToolCallTrace } from '../../shared/nirvaatTypes';
import { UiStrings } from '../../i18n/strings';
import { CounterfactualSlider } from '../../components/CounterfactualSlider';
import { WhyThisAdvicePanel } from './WhyThisAdvicePanel';

interface ActionCardProps {
  action: PlanAction;
  isDone: boolean;
  isExpanded: boolean;
  strings: UiStrings;
  trace?: ToolCallTrace;
  onToggleDone: (rank: number) => void;
  onToggleExpand: (rank: number) => void;
  onInspectToolRef: (toolRef: string) => void;
}

export function ActionCard({
  action,
  isDone,
  isExpanded,
  strings,
  trace,
  onToggleDone,
  onToggleExpand,
  onInspectToolRef,
}: ActionCardProps) {
  const [showWhyPanel, setShowWhyPanel] = useState(false);
  const isFree = action.cost === 'free';

  return (
    <article
      className={`aurora-surface rounded-2xl p-5 transition-colors ${
        isDone ? 'opacity-80 bg-emerald-50/40' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-mono font-semibold text-teal-800 tabular-nums">
              0{action.rank}
            </span>
            <span aria-hidden="true">·</span>
            <span className={isFree ? 'font-semibold text-emerald-800' : 'capitalize'}>
              {isFree ? strings.today.freeLabel : `${action.cost} cost`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="uppercase tracking-wide font-medium text-slate-700">
              {action.evidence} evidence
            </span>
            {action.protects.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>Protects: {action.protects.join(', ')}</span>
              </>
            )}
          </div>
          <h4
            className={`text-lg font-semibold text-slate-900 ${
              isDone ? 'line-through text-slate-500' : ''
            }`}
          >
            {action.title}
          </h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleDone(action.rank)}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              isDone
                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isDone ? 'Done' : 'Mark Done'}</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleExpand(action.rank)}
            className="inline-flex min-h-[38px] items-center rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white whitespace-nowrap shrink-0"
          >
            {isExpanded ? 'Hide Effect' : 'Compare Effect'}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
        <div>
          <span className="text-xs font-semibold text-slate-500">When: </span>
          <span>{action.when}</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500">How: </span>
          <span>{action.how}</span>
        </div>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
        <strong className="font-semibold text-slate-700">Why it works: </strong>
        {action.why_it_works}
      </p>

      {/* Inline summary of counterfactual effect even when collapsed */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-3 text-xs">
        <div className="font-mono tabular-nums text-slate-800">
          {action.effect.with && action.effect.without ? (
            <span>
              {action.effect.without} → <strong className="text-teal-800">{action.effect.with}</strong>{' '}
              <span className="text-slate-600">({action.effect.change_range})</span>
            </span>
          ) : (
            <span>
              Expected shift: <strong className="text-teal-800">{action.effect.change_range}</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowWhyPanel(!showWhyPanel)}
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 hover:underline"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{showWhyPanel ? 'Hide Why this advice?' : 'Why this advice?'}</span>
            {showWhyPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onInspectToolRef(action.effect.tool_ref)}
            className="text-xs font-medium text-indigo-700 hover:underline whitespace-nowrap shrink-0"
          >
            {strings.today.howCalculated} ({action.effect.tool_ref})
          </button>
        </div>
      </div>

      {/* Task 2: "Why this advice?" Comprehensive Panel */}
      {showWhyPanel && <WhyThisAdvicePanel action={action} trace={trace} />}

      {isExpanded && (
        <div className="mt-3">
          <CounterfactualSlider action={action} />
        </div>
      )}
    </article>
  );
}
