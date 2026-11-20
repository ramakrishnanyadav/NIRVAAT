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
        <span className="text-xs font-bold text-slate-900">
          Counterfactual comparison: {action.effect.metric}
        </span>
        <span className="text-xs font-mono font-medium text-slate-700 tabular-nums">
          Trace: {action.effect.tool_ref}
        </span>
      </div>

      {hasNumbers ? (
        <>
          <div className="relative h-24 overflow-hidden rounded-xl border border-slate-300 bg-amber-50">
            {/* Left / Underlying: Without action */}
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <div>
                <p className="text-xs font-bold text-amber-950">Without this action</p>
                <p className="mt-0.5 font-mono text-lg font-bold text-amber-950 tabular-nums">
                  {action.effect.without}
                </p>
              </div>
              <span className="text-xs text-amber-900 font-semibold">Unmitigated baseline</span>
            </div>

            {/* Right / Clipped overlay: With action */}
            <div
              className="absolute inset-0 flex items-center justify-between bg-teal-50 px-4 border-l-2 border-teal-800"
              style={{ clipPath: `inset(0 0 0 ${splitPct}%)` }}
            >
              <div className="ml-auto text-right">
                <p className="text-xs font-bold text-teal-950">With this action</p>
                <p className="mt-0.5 font-mono text-lg font-bold text-teal-950 tabular-nums">
                  {action.effect.with}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor={`cf-slider-${action.rank}`} className="sr-only">
              Compare without action ({action.effect.without}) versus with action ({action.effect.with})
            </label>
            <input
              id={`cf-slider-${action.rank}`}
              type="range"
              min={10}
              max={90}
              value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))}
              aria-valuemin={10}
              aria-valuemax={90}
              aria-valuenow={splitPct}
              aria-valuetext={`Split comparison at ${splitPct}%: Without is ${action.effect.without}, with is ${action.effect.with}`}
              className="w-full accent-teal-700 cursor-ew-resize min-h-[36px]"
            />
            <div className="flex items-center justify-between text-xs text-slate-700 tabular-nums font-medium">
              <span>Drag to visually inspect baseline vs protected</span>
              <span className="font-mono font-bold text-teal-900">
                Shift: {action.effect.change_range} ({action.effect.confidence} confidence)
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800">
          Qualitative modeled shift:{' '}
          <strong className="font-bold text-teal-900">{action.effect.change_range}</strong> (
          {action.effect.confidence} confidence · live quantitative model unavailable).
        </div>
      )}
    </div>
  );
};
