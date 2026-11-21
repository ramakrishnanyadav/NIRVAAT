import React, { useState } from 'react';
import {
  ChevronRight,
  Info,
  PhoneCall,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { UiStrings } from '../../i18n/strings';
import { ChannelType, NirvaatPlanResponse, PlanAction } from '../../shared/nirvaatTypes';
import { ConfidenceMeter, PlanAuditBadge } from './PlanAuditBadge';
import { ActionCard } from './ActionCard';
import { ChannelPreview } from './ChannelPreview';

export interface PlanRendererProps {
  plan: NirvaatPlanResponse;
  channel: ChannelType;
  strings: UiStrings;
  completedActionRanks: number[];
  onToggleDone: (rank: number) => void;
  onInspectToolRef: (toolRef: string) => void;
  onReplyClarify: (answer: string) => void;
  onFollowUpClick: (prompt: string) => void;
  onSwitchToPlanner?: () => void;
}

export const PlanRenderer: React.FC<PlanRendererProps> = ({
  plan,
  channel,
  strings,
  completedActionRanks,
  onToggleDone,
  onInspectToolRef,
  onReplyClarify,
  onFollowUpClick,
}) => {
  const [expandedRank, setExpandedRank] = useState<number | null>(1);
  const [clarifyInput, setClarifyInput] = useState('');

  // H3: Emergency Override Mode
  if (plan.mode === 'emergency' && plan.emergency) {
    return (
      <section role="alert" aria-live="assertive" className="rounded-2xl border-2 border-red-700 bg-red-50 p-6 text-slate-900 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-700 text-white">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
              Urgent Care Priority · Red-Flag Override
            </p>
            <h2 className="text-xl font-bold text-slate-950">{strings.emergency.callNow}</h2>
            <p className="text-base leading-relaxed text-slate-900">{plan.emergency.message}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={`tel:${plan.emergency.number}`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
              >
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                <span>Call {plan.emergency.number}</span>
              </a>
            </div>
            {plan.safety_note && (
              <p className="pt-2 text-xs text-slate-700 border-t border-red-200">{plan.safety_note}</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Out of scope mode
  if (plan.mode === 'out_of_scope') {
    return (
      <section className="aurora-surface rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Info className="h-4 w-4 text-teal-700" aria-hidden="true" />
          <span>Outside exposure-reduction scope</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">{plan.situation.summary}</p>
        {plan.safety_note && <p className="text-xs text-slate-600">{plan.safety_note}</p>}
        <button
          type="button"
          onClick={() => onFollowUpClick(plan.follow_up_hook)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:underline"
        >
          <span>{plan.follow_up_hook}</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </section>
    );
  }

  // Clarify mode
  if (plan.mode === 'clarify' && plan.clarifying_question) {
    return (
      <section className="aurora-surface rounded-2xl p-6 space-y-4">
        <p className="text-xs font-medium text-slate-500">{plan.situation.summary}</p>
        <h3 className="text-lg font-semibold text-slate-900">{plan.clarifying_question}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!clarifyInput.trim()) return;
            onReplyClarify(clarifyInput.trim());
            setClarifyInput('');
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={clarifyInput}
            onChange={(e) => setClarifyInput(e.target.value)}
            placeholder="Share that detail so we can tailor your plan…"
            className="min-h-[44px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-[44px] rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
          >
            Update Plan
          </button>
        </form>
      </section>
    );
  }

  // Non-app previews (WhatsApp, SMS, Voice)
  if (channel === 'WHATSAPP' || channel === 'SMS' || channel === 'VOICE') {
    return <ChannelPreview plan={plan} channel={channel} />;
  }

  // App Structured Decision Cards
  return (
    <div className="space-y-5">
      <PlanAuditBadge dataStatus={plan.data_status} strings={strings} />

      <section className="aurora-surface rounded-2xl p-5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{strings.today.situationHeading}</span>
          <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
            <ConfidenceMeter level={plan.situation.confidence} />
            <span aria-hidden="true">·</span>
            <span>{plan.situation.sources.join(' / ')}</span>
            <span aria-hidden="true">·</span>
            <span>As of {new Date(plan.situation.as_of).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <p className="text-base font-medium leading-relaxed text-slate-900">{plan.situation.summary}</p>
        {plan.assumptions.length > 0 && (
          <p className="text-xs text-slate-600">Assumed: {plan.assumptions.join(' · ')}</p>
        )}
      </section>

      <section className="space-y-3" aria-label={strings.today.planHeading}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{strings.today.planHeading}</h3>
          <span className="text-xs text-slate-500">Ordered by exposure avoided × feasibility / cost</span>
        </div>

        <div className="space-y-3">
          {plan.actions.slice(0, 3).map((action: PlanAction) => (
            <ActionCard
              key={action.rank}
              action={action}
              isDone={completedActionRanks.includes(action.rank)}
              isExpanded={expandedRank === action.rank}
              strings={strings}
              onToggleDone={onToggleDone}
              onToggleExpand={(rank) => setExpandedRank(expandedRank === rank ? null : rank)}
              onInspectToolRef={onInspectToolRef}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {plan.if_you_can_do_more && plan.if_you_can_do_more.length > 0 && (
          <section className="aurora-surface rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-800">{strings.today.moreOptionsHeading}</h4>
            <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
              {plan.if_you_can_do_more.slice(0, 2).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {(plan.myth_correction || plan.safety_note) && (
          <section className="aurora-surface rounded-2xl p-4 space-y-2">
            {plan.myth_correction && (
              <div>
                <h4 className="text-xs font-semibold text-slate-800">{strings.today.mythHeading}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">{plan.myth_correction}</p>
              </div>
            )}
            {plan.safety_note && (
              <div className={plan.myth_correction ? 'pt-2 border-t border-slate-200/70' : ''}>
                <h4 className="text-xs font-semibold text-amber-900">{strings.today.safetyHeading}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">{plan.safety_note}</p>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200/80 bg-teal-50/70 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-teal-950">
          <Sparkles className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
          <span>{plan.follow_up_hook}</span>
        </div>
        <button
          type="button"
          onClick={() => onFollowUpClick(plan.follow_up_hook)}
          className="text-xs font-semibold text-teal-800 hover:underline whitespace-nowrap shrink-0"
        >
          Use as next question
        </button>
      </div>
    </div>
  );
};
