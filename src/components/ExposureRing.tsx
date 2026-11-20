import React from 'react';
import { NirvaatPlanResponse } from '../shared/nirvaatTypes';

interface ExposureRingProps {
  baselinePm25: number | null;
  plan: NirvaatPlanResponse | null;
  completedRanks: number[];
  title: string;
  withPlanLabel: string;
  withoutPlanLabel: string;
}

function parseMidNumber(str: string | null | undefined): number | null {
  if (!str) return null;
  const matches = str.match(/\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  if (matches.length >= 2) {
    return (Number(matches[0]) + Number(matches[1])) / 2;
  }
  return Number(matches[0]);
}

function parsePctMid(str: string | null | undefined): number {
  if (!str) return 0;
  const matches = str.match(/\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return 0;
  if (matches.length >= 2) {
    return (Number(matches[0]) + Number(matches[1])) / 2;
  }
  return Number(matches[0]);
}

export const ExposureRing: React.FC<ExposureRingProps> = ({
  baselinePm25,
  plan,
  completedRanks,
  title,
  withPlanLabel,
  withoutPlanLabel,
}) => {
  const actions = plan?.actions ?? [];
  const isDoseUnit = actions.some((a) => (a.effect.without ?? '').includes('µg/day'));
  const unitLabel = isDoseUnit ? 'µg/day' : 'µg/m³';

  const quantified = actions.filter((a) => a.effect.with !== null && a.effect.without !== null);

  let baselineVal: number | null =
    baselinePm25 !== null ? Math.round(baselinePm25 * 0.68) : null;
  let fullPlanVal: number | null = null;
  let activeVal: number | null = null;
  let activeDropPct = 0;

  if (quantified.length > 0) {
    const withoutMids = quantified
      .map((a) => parseMidNumber(a.effect.without))
      .filter((n): n is number => n !== null);
    const withMids = quantified
      .map((a) => parseMidNumber(a.effect.with))
      .filter((n): n is number => n !== null);

    if (withoutMids.length > 0 && withMids.length > 0) {
      baselineVal = Math.round(Math.max(...withoutMids));
      // Compound marginal reductions across actions cleanly (capped at 78% realistic max)
      const totalPotentialFrac = Math.min(
        0.78,
        quantified.reduce((acc, a) => {
          const pct = parsePctMid(a.effect.change_range) / 100;
          return acc + pct * (1 - acc) * 0.85;
        }, 0)
      );
      fullPlanVal = Math.round(baselineVal * (1 - totalPotentialFrac));

      const doneActions = quantified.filter((a) => completedRanks.includes(a.rank));
      const doneFrac =
        doneActions.length > 0
          ? Math.min(
              0.78,
              doneActions.reduce((acc, a) => {
                const pct = parsePctMid(a.effect.change_range) / 100;
                return acc + pct * (1 - acc) * 0.85;
              }, 0)
            )
          : totalPotentialFrac;

      activeVal = Math.round(baselineVal * (1 - doneFrac));
      activeDropPct = Math.round(doneFrac * 100);
    }
  }

  const maxScale = Math.max(isDoseUnit ? 1200 : 150, baselineVal ?? 150);
  const outerPct =
    baselineVal !== null ? Math.min(100, Math.round((baselineVal / maxScale) * 100)) : 55;
  const innerPct =
    activeVal !== null
      ? Math.min(100, Math.round((activeVal / maxScale) * 100))
      : baselineVal !== null
        ? Math.round(outerPct * 0.6)
        : 30;

  const rOuter = 44;
  const rInner = 33;
  const cOuter = 2 * Math.PI * rOuter;
  const cInner = 2 * Math.PI * rInner;

  return (
    <div className="flex w-full items-center gap-4">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 110 110" className="h-24 w-24 -rotate-90" aria-hidden="true">
          <circle cx="55" cy="55" r={rOuter} fill="none" stroke="#E2E8F0" strokeWidth="7" />
          <circle
            cx="55"
            cy="55"
            r={rOuter}
            fill="none"
            stroke="#D97706"
            strokeOpacity="0.65"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={cOuter}
            strokeDashoffset={cOuter * (1 - outerPct / 100)}
          />
          <circle cx="55" cy="55" r={rInner} fill="none" stroke="#E2E8F0" strokeWidth="7" />
          <circle
            cx="55"
            cy="55"
            r={rInner}
            fill="none"
            stroke="#0E7C86"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={cInner}
            strokeDashoffset={cInner * (1 - innerPct / 100)}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
            {activeVal !== null ? activeVal : baselineVal ?? '—'}
          </span>
          <span className="text-[10px] text-slate-500">{unitLabel}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-800">{title}</p>
          {activeDropPct > 0 && (
            <span className="font-mono text-[11px] font-semibold text-teal-800 tabular-nums">
              -{activeDropPct}%
            </span>
          )}
        </div>
        <div className="space-y-1 text-xs text-slate-600 tabular-nums">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-xs bg-amber-500/80" aria-hidden="true" />
              {withoutPlanLabel}
            </span>
            <span className="font-mono font-medium text-slate-800">
              {baselineVal !== null ? `${baselineVal} ${unitLabel}` : 'Loading…'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-xs bg-teal-700" aria-hidden="true" />
              {completedRanks.length > 0 ? `Done (${completedRanks.length})` : withPlanLabel}
            </span>
            <span className="font-mono font-semibold text-teal-800">
              {activeVal !== null
                ? `${activeVal} ${unitLabel}`
                : fullPlanVal !== null
                  ? `${fullPlanVal} ${unitLabel}`
                  : plan?.data_status === 'tier_B'
                    ? 'Qualitative drop'
                    : 'Modeled on load'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
