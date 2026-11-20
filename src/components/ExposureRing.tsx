import React, { useState } from 'react';
import { Table as TableIcon, PieChart } from 'lucide-react';
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
  const [showTable, setShowTable] = useState(false);
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

  const accessibleSummary = `Exposure reduction summary: Baseline is ${baselineVal ?? 'unknown'} ${unitLabel}. With active plan steps, modeled exposure drops by ${activeDropPct}% to ${activeVal ?? fullPlanVal ?? 'modeled'} ${unitLabel}.`;

  return (
    <div className="w-full space-y-2">
      <div className="sr-only" aria-live="polite">
        {accessibleSummary}
      </div>

      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800">{title}</span>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
          aria-expanded={showTable}
        >
          {showTable ? <PieChart className="h-3 w-3" /> : <TableIcon className="h-3 w-3" />}
          <span>{showTable ? 'Chart view' : 'Data table'}</span>
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">
          <table className="w-full text-left text-xs" aria-label="Exposure reduction table">
            <caption className="sr-only">Modeled exposure comparison table</caption>
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th scope="col" className="py-1.5 px-2 font-semibold">Scenario</th>
                <th scope="col" className="py-1.5 px-2 text-right font-semibold">Estimated ({unitLabel})</th>
                <th scope="col" className="py-1.5 px-2 text-right font-semibold">Avoided</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              <tr>
                <td className="py-1 px-2 text-slate-800">{withoutPlanLabel}</td>
                <td className="py-1 px-2 text-right text-slate-900">{baselineVal ?? '—'}</td>
                <td className="py-1 px-2 text-right text-slate-500">Baseline</td>
              </tr>
              <tr className="font-semibold text-teal-900 bg-teal-50/50">
                <td className="py-1 px-2">{withPlanLabel}</td>
                <td className="py-1 px-2 text-right">{activeVal ?? fullPlanVal ?? '—'}</td>
                <td className="py-1 px-2 text-right">-{activeDropPct}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex w-full items-center gap-4">
          <div
            className="relative h-24 w-24 shrink-0"
            role="progressbar"
            aria-valuenow={activeDropPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title}: ${activeDropPct}% exposure reduction progress`}
          >
            <svg viewBox="0 0 110 110" className="h-24 w-24 -rotate-90" aria-hidden="true">
              <circle cx="55" cy="55" r={rOuter} fill="none" stroke="#CBD5E1" strokeWidth="7" />
              <circle
                cx="55"
                cy="55"
                r={rOuter}
                fill="none"
                stroke="#B45309"
                strokeOpacity="0.8"
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
              <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                {activeVal !== null ? activeVal : baselineVal ?? '—'}
              </span>
              <span className="text-[10px] font-semibold text-slate-700">{unitLabel}</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">Estimated dose</span>
              {activeDropPct > 0 && (
                <span className="font-mono text-[11px] font-bold text-teal-800 tabular-nums">
                  -{activeDropPct}%
                </span>
              )}
            </div>
            <div className="space-y-1 text-xs text-slate-700 tabular-nums">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-xs bg-amber-600" aria-hidden="true" />
                  {withoutPlanLabel}
                </span>
                <span className="font-mono font-medium text-slate-900">
                  {baselineVal !== null ? `${baselineVal} ${unitLabel}` : 'Loading…'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-xs bg-teal-800" aria-hidden="true" />
                  {completedRanks.length > 0 ? `Done (${completedRanks.length})` : withPlanLabel}
                </span>
                <span className="font-mono font-bold text-teal-800">
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
      )}
    </div>
  );
};
