import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Info,
  PhoneCall,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import React, { useState } from 'react';
import { UiStrings } from '../i18n/strings';
import { ChannelType, ConfidenceLevel, NirvaatPlanResponse, PlanAction } from '../shared/nirvaatTypes';
import { CounterfactualSlider } from './CounterfactualSlider';

interface PlanRendererProps {
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

function ConfidenceMeter({ level }: { level: ConfidenceLevel }) {
  const dots = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((idx) => (
          <span
            key={idx}
            className={`h-1.5 w-1.5 rounded-full ${
              idx <= dots ? 'bg-teal-700' : 'bg-slate-300'
            }`}
          />
        ))}
      </span>
      <span className="capitalize">{level} confidence</span>
    </span>
  );
}

function formatChannelPlainText(plan: NirvaatPlanResponse, channel: ChannelType): string {
  if (plan.mode === 'emergency' && plan.emergency) {
    return `${plan.emergency.message}\nEmergency number: ${plan.emergency.number}`;
  }
  if (plan.mode === 'clarify' && plan.clarifying_question) {
    return `${plan.situation.summary}\n\nQuestion: ${plan.clarifying_question}`;
  }
  if (channel === 'VOICE') {
    const steps = plan.actions
      .slice(0, 3)
      .map((a) => `Step ${a.rank}. ${a.title}. ${a.when}. ${a.how}`)
      .join(' ');
    return `${plan.situation.summary}. ${steps} ${plan.safety_note ?? ''} ${plan.follow_up_hook}`.replace(
      /[#*_|`]/g,
      ''
    );
  }

  const lines: string[] = [
    plan.situation.summary,
    `Data: ${plan.data_status.replace('_', ' ')} (${plan.situation.confidence} confidence)`,
    '',
  ];

  for (const a of plan.actions.slice(0, 3)) {
    const costLabel = a.cost === 'free' ? 'Free' : `${a.cost} cost`;
    const effectText =
      a.effect.with && a.effect.without
        ? `Effect: ${a.effect.without} -> ${a.effect.with} (${a.effect.change_range})`
        : `Effect: ${a.effect.change_range}`;
    lines.push(`${a.rank}) ${a.title} [${costLabel}, ${a.evidence} evidence]`);
    lines.push(`When: ${a.when}`);
    lines.push(`How: ${a.how}`);
    lines.push(effectText);
    lines.push('');
  }

  if (plan.myth_correction) {
    lines.push(`Note: ${plan.myth_correction}`);
  }
  if (plan.safety_note) {
    lines.push(`Safety: ${plan.safety_note}`);
  }
  lines.push(plan.follow_up_hook);
  return lines.join('\n').trim();
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
  const [copiedText, setCopiedText] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // H3: Emergency Override Mode
  if (plan.mode === 'emergency' && plan.emergency) {
    return (
      <section
        role="alert"
        aria-live="assertive"
        className="rounded-2xl border-2 border-red-700 bg-red-50 p-6 text-slate-900 shadow-sm"
      >
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
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"
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

  // WHATSAPP / SMS / VOICE channel preview rendering
  if (channel === 'WHATSAPP' || channel === 'SMS' || channel === 'VOICE') {
    const plainText = formatChannelPlainText(plan, channel);
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(plainText);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      } catch {
        // Ignore clipboard denial
      }
    };

    const handleSpeak = () => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang = plan.language || 'en-IN';
      utterance.rate = 0.96;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    };

    return (
      <section className="aurora-surface rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {channel} Channel Output Preview
            </h3>
            <p className="text-xs text-slate-600">
              {channel === 'VOICE'
                ? 'Short spoken sentences with zero markdown or symbols.'
                : 'Compact plain-text format ready to forward on low-bandwidth connections.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {channel === 'VOICE' && (
              <button
                type="button"
                onClick={handleSpeak}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
              >
                {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span>{speaking ? 'Stop Audio' : 'Play Spoken Plan'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {copiedText ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
              <span>{copiedText ? 'Copied' : 'Copy Message'}</span>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-slate-100/90 p-4 space-y-3">
          <div
            className={`rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
              channel === 'WHATSAPP'
                ? 'bg-emerald-50 border border-emerald-200 text-slate-900'
                : 'bg-white border border-slate-200 text-slate-900'
            }`}
          >
            {plainText}
          </div>
          {channel === 'WHATSAPP' && (
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Ventilate now?', prompt: 'Should we open windows to air out the flat right now?' },
                { label: 'School walk timing', prompt: 'When is the safest 3-hour window for an outdoor walk today?' },
                { label: 'Cooking tips', prompt: 'How do we reduce LPG cooking smoke inside a closed flat?' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => onFollowUpClick(btn.prompt)}
                  className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // APP Structured Decision Cards
  const isLimitedData = plan.data_status !== 'tier_A';

  return (
    <div className="space-y-5">
      {/* Honest Degradation Banner if not Tier A */}
      {isLimitedData && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <span className="font-semibold uppercase tracking-wide">{plan.data_status.replace('_', ' ')}: </span>
            <span>{strings.degradation[plan.data_status]}</span>
          </div>
        </div>
      )}

      {/* Situation Summary Strip */}
      <section className="aurora-surface rounded-2xl p-5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{strings.today.situationHeading}</span>
          <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
            <ConfidenceMeter level={plan.situation.confidence} />
            <span aria-hidden="true">·</span>
            <span>{plan.situation.sources.join(' / ')}</span>
            <span aria-hidden="true">·</span>
            <span>
              As of {new Date(plan.situation.as_of).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <p className="text-base font-medium leading-relaxed text-slate-900">{plan.situation.summary}</p>
        {plan.assumptions.length > 0 && (
          <p className="text-xs text-slate-600">
            Assumed: {plan.assumptions.join(' · ')}
          </p>
        )}
      </section>

      {/* Top 1-3 Ranked Action Cards */}
      <section className="space-y-3" aria-label={strings.today.planHeading}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{strings.today.planHeading}</h3>
          <span className="text-xs text-slate-500">
            Ordered by exposure avoided × feasibility / cost
          </span>
        </div>

        <div className="space-y-3">
          {plan.actions.slice(0, 3).map((action: PlanAction) => {
            const isDone = completedActionRanks.includes(action.rank);
            const isExpanded = expandedRank === action.rank;
            const isFree = action.cost === 'free';

            return (
              <article
                key={action.rank}
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
                      onClick={() => setExpandedRank(isExpanded ? null : action.rank)}
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
                  <button
                    type="button"
                    onClick={() => onInspectToolRef(action.effect.tool_ref)}
                    className="text-xs font-medium text-indigo-700 hover:underline whitespace-nowrap shrink-0"
                  >
                    {strings.today.howCalculated} ({action.effect.tool_ref})
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3">
                    <CounterfactualSlider action={action} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Secondary options + Myth correction + Safety note */}
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

      {/* Follow-up Hook */}
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
