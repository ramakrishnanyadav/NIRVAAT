import React, { useState } from 'react';
import { Check, Copy, Volume2, VolumeX } from 'lucide-react';
import { ChannelType, NirvaatPlanResponse } from '../../shared/nirvaatTypes';

export interface ChannelPreviewProps {
  plan: NirvaatPlanResponse;
  channel: ChannelType;
}

export function formatChannelPlainText(plan: NirvaatPlanResponse, channel: ChannelType): string {
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

  if (plan.myth_correction) lines.push(`Note: ${plan.myth_correction}`);
  if (plan.safety_note) lines.push(`Safety: ${plan.safety_note}`);
  lines.push(plan.follow_up_hook);
  return lines.join('\n').trim();
}

export const ChannelPreview: React.FC<ChannelPreviewProps> = ({ plan, channel }) => {
  const [copiedText, setCopiedText] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const plainText = formatChannelPlainText(plan, channel);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {}
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
          <h3 className="text-sm font-semibold text-slate-900">{channel} Channel Output Preview</h3>
          <p className="text-xs text-slate-600">
            {channel === 'VOICE' ? 'Short spoken sentences without markdown.' : 'Compact plain-text format for messaging.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {channel === 'VOICE' && (
            <button
              type="button"
              onClick={handleSpeak}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span>{speaking ? 'Stop Audio' : 'Play Spoken Plan'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
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
      </div>
    </section>
  );
};
