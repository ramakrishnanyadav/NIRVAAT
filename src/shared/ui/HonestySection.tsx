import React from 'react';
import { ShieldCheck, AlertCircle, FileText, Activity } from 'lucide-react';
import { UiStrings } from '../../i18n/strings';

interface HonestySectionProps {
  strings?: UiStrings;
  compact?: boolean;
}

export const HonestySection: React.FC<HonestySectionProps> = ({ compact = false }) => {
  return (
    <section
      aria-label="Scientific Grounding & Model Honesty"
      className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <ShieldCheck className="h-5 w-5 text-teal-700" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Scientific Grounding &amp; Model Limitations
          </h3>
          <p className="text-xs text-slate-500">
            Transparent disclosure of physical assumptions, model scope, and evidence boundaries.
          </p>
        </div>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'} text-xs text-slate-700`}>
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Activity className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            <span>Modelled Physics, Not Physical Sensors</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Indoor concentrations and inhaled doses are simulated using analytical mass-balance equations, not physical indoor hardware sensors.
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <FileText className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
            <span>Single-Zone Mass-Balance Model</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Assumes a well-mixed uniform zone volume (V·dC/dt = P·λ·V·C_out + S - (λ+k)·V·C). Does not model multi-room pressure gradients or localized micro-plumes.
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <AlertCircle className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
            <span>Fine Particulate (PM2.5) Scope Only</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Quantifies submicron combustion particles (PM2.5). Does not measure or simulate Ozone (O3), Carbon Monoxide (CO), or Nitrogen Oxides (NOx).
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-rose-700" aria-hidden="true" />
            <span>Not a Certified Medical Device</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Provides computational exposure-reduction engineering guidance. Does not diagnose clinical conditions, prescribe medications, or replace pulmonology care.
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Activity className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            <span>Pilot-Stage Computational Validation</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Physical equations derived from published aerosol literature (Singer et al., EPA, WHO). Real-world pilot deployment and calibration ongoing.
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <FileText className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            <span>Zero Invented Statistics</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Every numeric range, percentage, and reduction claim originates directly from deterministic Monte Carlo tool execution envelopes (V1–V8 auditor verified).
          </p>
        </div>
      </div>
    </section>
  );
};
