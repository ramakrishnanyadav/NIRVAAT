import React, { useState } from 'react';
import { PlanAction } from '../shared/nirvaatTypes';

interface CounterfactualSliderProps {
  action: PlanAction;
}

export const CounterfactualSlider: React.FC<CounterfactualSliderProps> = ({ action }) => {
  const [splitPct, setSplitPct] = useState(50);
  const hasNumbers = action.effect.with !== null && action.effect.without !== null;

  return (
    <div className="aurora-inset rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-800">
          Counterfactual comparison: {action.effect.metric}
        </span>
        <span className="text-xs font-mono text-slate-500 tabular-nums">
          Ref: {action.effect.tool_ref}
        </span>
      </div>

      {hasNumbers ? (
        <>
          <div className="relative h-24 overflow-hidden rounded-xl border border-slate-200 bg-amber-50/70">
            {/* Left / Underlying: Without action */}
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <div>
                <p className="text-[11px] font-medium text-amber-900">Without this action</p>
                <p className="mt-0.5 font-mono text-lg font-semibold text-amber-950 tabular-nums">
                  {action.effect.without}
                </p>
              </div>
              <span className="text-xs text-amber-800/80 font-medium">Unmitigated dose</span>
            </div>

            {/* Right / Clipped overlay: With action */}
            <div
              className="absolute inset-0 flex items-center justify-between bg-teal-50 px-4 border-l-2 border-teal-700"
              style={{ clipPath: `inset(0 0 0 ${splitPct}%)` }}
            >
              <div className="ml-auto text-right">
                <p className="text-[11px] font-medium text-teal-900">With this action</p>
                <p className="mt-0.5 font-mono text-lg font-semibold text-teal-950 tabular-nums">
                  {action.effect.with}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor={`cf-slider-${action.rank}`} className="sr-only">
              Compare without vs with action exposure
            </label>
            <input
              id={`cf-slider-${action.rank}`}
              type="range"
              min={10}
              max={90}
              value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))}
              className="w-full accent-teal-700 cursor-ew-resize"
            />
            <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
              <span>Slide to compare baseline vs protected</span>
              <span className="font-mono font-semibold text-teal-800">
                Change: {action.effect.change_range} · {action.effect.confidence} confidence
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-700">
          Qualitative expected impact:{' '}
          <strong className="font-semibold text-teal-800">{action.effect.change_range}</strong> (
          {action.effect.confidence} confidence · live quantitative model unavailable).
        </div>
      )}
    </div>
  );
};
