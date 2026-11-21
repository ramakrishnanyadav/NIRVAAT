import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export interface TwinSimResult {
  baseline_hourly: number[];
  simulated_hourly: number[];
  baseline_mean_pm25: number;
  simulated_mean_pm25: number;
  baseline_dose_ug: number;
  simulated_dose_ug: number;
  reduction_pct: number;
}

interface Props {
  simSealGaps: boolean;
  setSimSealGaps: (val: boolean) => void;
  simFilterMode: 'none' | 'diy_cr_box' | 'hepa';
  setSimFilterMode: (val: 'none' | 'diy_cr_box' | 'hepa') => void;
  simCleanCooking: boolean;
  setSimCleanCooking: (val: boolean) => void;
  simData: TwinSimResult | null;
  simLoading: boolean;
  effectiveHourly: number[];
  onApply: () => void;
}

export const TwinSimulatorCurve: React.FC<Props> = ({
  simSealGaps,
  setSimSealGaps,
  simFilterMode,
  setSimFilterMode,
  simCleanCooking,
  setSimCleanCooking,
  simData,
  simLoading,
  effectiveHourly,
  onApply,
}) => {
  const maxCurve = Math.max(
    120,
    ...effectiveHourly,
    ...(simData?.baseline_hourly ?? [0]),
    ...(simData?.simulated_hourly ?? [0])
  );

  const buildPolyline = (vals: number[], maxY: number) => {
    if (vals.length === 0) return '';
    return vals
      .map((v, i) => {
        const x = (i / Math.max(1, vals.length - 1)) * 560;
        const y = 110 - (Math.min(maxY, v) / Math.max(1, maxY)) * 96;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <section className="aurora-surface rounded-2xl p-5 space-y-4 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <span>24-Hour Counterfactual Mass-Balance Simulator</span>
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Simulates dynamic single-zone infiltration, indoor cooking spikes, and filtration against the ambient forecast.
          </p>
        </div>
        <button
          type="button"
          onClick={onApply}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-900"
        >
          <span>Apply to My Profile &amp; Refresh Plan</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Simulator Toggles */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/70 p-3 text-xs">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
          <input
            type="checkbox"
            checked={simSealGaps}
            onChange={(e) => setSimSealGaps(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-700"
          />
          <span>Seal door &amp; window drafts</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
          <input
            type="checkbox"
            checked={simCleanCooking}
            onChange={(e) => setSimCleanCooking(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-700"
          />
          <span>Cover pans &amp; isolate cooking</span>
        </label>
        <label className="flex items-center gap-2 font-medium text-slate-800">
          <span>Air filter:</span>
          <select
            value={simFilterMode}
            onChange={(e) => setSimFilterMode(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
          >
            <option value="none">None</option>
            <option value="diy_cr_box">DIY MERV-13 Box Fan</option>
            <option value="hepa">Commercial HEPA</option>
          </select>
        </label>
        {simLoading && <span className="text-xs text-slate-500 animate-pulse">Calculating...</span>}
      </div>

      {/* Curve Visualizer */}
      <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
          <span>00:00 (Night)</span>
          <span>08:00 (Cooking / Rush)</span>
          <span>14:00 (Afternoon window)</span>
          <span>20:00 (Dinner)</span>
          <span>23:00</span>
        </div>
        <svg viewBox="0 0 560 120" className="w-full h-28 overflow-visible" role="img" aria-label="24h mass balance simulation curve">
          {/* Outdoor Ambient Forecast */}
          <polyline
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            points={buildPolyline(effectiveHourly, maxCurve)}
          />
          {/* Baseline Unmitigated Indoor */}
          {simData?.baseline_hourly && (
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              points={buildPolyline(simData.baseline_hourly, maxCurve)}
            />
          )}
          {/* Mitigated Simulated Indoor */}
          {simData?.simulated_hourly && (
            <polyline
              fill="none"
              stroke="#0f766e"
              strokeWidth="2.5"
              points={buildPolyline(simData.simulated_hourly, maxCurve)}
            />
          )}
        </svg>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100 pt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-0.5 w-4 border-b border-dashed border-slate-400" />
              <span>Outdoor Ambient</span>
            </span>
            <span className="flex items-center gap-1.5 text-red-700">
              <span className="h-0.5 w-4 bg-red-500" />
              <span>Baseline Indoor</span>
            </span>
            <span className="flex items-center gap-1.5 text-teal-800 font-semibold">
              <span className="h-0.5 w-4 bg-teal-700" />
              <span>Simulated Twin</span>
            </span>
          </div>
          {simData && (
            <div className="font-semibold text-teal-900 tabular-nums">
              Avoided Dose: {simData.reduction_pct}% reduction ({Math.round(simData.baseline_dose_ug - simData.simulated_dose_ug)} µg avoided)
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
