import { CheckCircle2, Eye, History, ShieldCheck, Sliders, Trash2, Wrench } from 'lucide-react';
import React from 'react';
import { UiLang } from '../i18n/strings';
import {
  DegradationSimulation,
  SavedDecisionRecord,
  ToolCallTrace,
} from '../shared/nirvaatTypes';

interface AuditAndSettingsViewProps {
  traces: ToolCallTrace[];
  highlightedToolRef: string | null;
  auditResult: { pass: boolean; violations: Array<{ rule: string; field: string; fix: string }> } | null;
  modelUsed: string | null;
  simDegradation: DegradationSimulation;
  onChangeSimDegradation: (val: DegradationSimulation) => void;
  maxDataAgeMin: number;
  onChangeMaxDataAgeMin: (val: number) => void;
  lang: UiLang;
  onChangeLang: (val: UiLang) => void;
  reduceMotion: boolean;
  onToggleReduceMotion: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  history: SavedDecisionRecord[];
  onLoadHistory: (record: SavedDecisionRecord) => void;
  onDeleteHistory: (id: string) => void;
}

export const AuditAndSettingsView: React.FC<AuditAndSettingsViewProps> = ({
  traces,
  highlightedToolRef,
  auditResult,
  modelUsed,
  simDegradation,
  onChangeSimDegradation,
  maxDataAgeMin,
  onChangeMaxDataAgeMin,
  lang,
  onChangeLang,
  reduceMotion,
  onToggleReduceMotion,
  highContrast,
  onToggleHighContrast,
  history,
  onLoadHistory,
  onDeleteHistory,
}) => {
  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200/80 pb-3">
        <h1 id="page-heading" tabIndex={-1} className="text-xl font-bold text-slate-900 focus:outline-none">
          Audit &amp; Verification Workbench
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Trace tool provenance, verify numeric verifier outcomes, inspect rate limiting, and configure accessibility.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accessibility, Language & Privacy Settings */}
        <section className="aurora-surface rounded-2xl p-5 space-y-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Eye className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>Language, Accessibility &amp; Freshness Threshold</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800">Display &amp; Copilot Language</p>
                <p className="text-slate-600">Switches UI labels and instructs NIRVAAT response language.</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-1">
                <button
                  type="button"
                  onClick={() => onChangeLang('en')}
                  className={`rounded-lg px-3 py-1.5 font-semibold ${
                    lang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLang('hi')}
                  className={`rounded-lg px-3 py-1.5 font-semibold ${
                    lang === 'hi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 border-t border-slate-200/70 pt-3 cursor-pointer">
              <div>
                <p className="font-semibold text-slate-800">Reduce Motion</p>
                <p className="text-slate-600">Pauses breathing orb and smooth transitions.</p>
              </div>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={onToggleReduceMotion}
                className="h-4 w-4 accent-teal-700"
              />
            </label>

            <label className="flex items-center justify-between gap-4 border-t border-slate-200/70 pt-3 cursor-pointer">
              <div>
                <p className="font-semibold text-slate-800">High Contrast Surfaces</p>
                <p className="text-slate-600">Replaces translucent glass with crisp solid borders.</p>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={onToggleHighContrast}
                className="h-4 w-4 accent-teal-700"
              />
            </label>

            <div className="border-t border-slate-200/70 pt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Max Telemetry Age (H1)</span>
                <span className="font-mono font-semibold text-teal-800 tabular-nums">
                  {maxDataAgeMin} min
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={180}
                step={15}
                value={maxDataAgeMin}
                onChange={(e) => onChangeMaxDataAgeMin(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>
          </div>
        </section>

        {/* Resilience & Degradation Tier Simulator */}
        <section className="aurora-surface rounded-2xl p-5 space-y-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sliders className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>Graceful Degradation Test Mode</span>
          </h2>
          <p className="text-xs text-slate-600">
            Verify how NIRVAAT enforces H1 Numeric Integrity and Tier A–D fallback behavior when upstream tools fail.
          </p>

          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            {(
              [
                { id: 'none', title: 'Tier A · All Live Tools', desc: 'Open-Meteo AQ + Forecast + Impact' },
                { id: 'no_impact', title: 'Tier B · No Impact Tool', desc: 'Qualitative effect sizes only' },
                { id: 'no_aq', title: 'Tier C · No Live AQ', desc: 'General winter-smog routine' },
                { id: 'all_down', title: 'Tier D · All Tools Down', desc: 'Safety-only template fallback' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeSimDegradation(opt.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  simDegradation === opt.id
                    ? 'border-teal-700 bg-teal-50 text-teal-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>{opt.title}</div>
                <div className="mt-0.5 text-[11px] font-normal text-slate-600">{opt.desc}</div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Saved Decisions History */}
      <section className="aurora-surface rounded-2xl p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <History className="h-4 w-4 text-teal-700" aria-hidden="true" />
          <span>Saved Decision History ({history.length})</span>
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-slate-600">
            No saved plans yet. Generate a plan on the Today tab and click &ldquo;Save Plan&rdquo; to store it here.
          </p>
        ) : (
          <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200 bg-white">
            {history.map((rec) => (
              <div
                key={rec.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">{rec.query}</p>
                  <p className="text-slate-500 font-mono tabular-nums">
                    {rec.region_label} · {rec.channel} · {rec.plan.data_status} ·{' '}
                    {new Date(rec.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onLoadHistory(rec)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Open Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteHistory(rec.id)}
                    aria-label="Delete saved plan"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Strict Auditor V1-V8 & Tool Provenance Trace */}
      <section className="aurora-surface rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Wrench className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>Numeric Integrity &amp; Tool Call Audit Trail (H1 / V1–V8)</span>
            </h3>
            <p className="text-xs text-slate-600">
              Every figure in the active plan traces back to these verified server-side tool envelopes.
              {modelUsed ? ` · Model: ${modelUsed}` : ''}
            </p>
          </div>
          {auditResult && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>
                {auditResult.pass
                  ? 'Auditor V1–V8: Passed'
                  : `Recovered (${auditResult.violations.length} rule check)`}
              </span>
            </div>
          )}
        </div>

        {traces.length === 0 ? (
          <p className="text-xs text-slate-600">
            Generate a plan to inspect live tool call envelopes (`get_air_quality`, `get_forecast`, `impact_estimate`, `retrieve_guidance`).
          </p>
        ) : (
          <div className="space-y-3">
            {traces.map((t) => {
              const isHighlighted = highlightedToolRef === t.call_id;
              return (
                <div
                  key={t.call_id}
                  className={`rounded-xl border p-3.5 text-xs ${
                    isHighlighted
                      ? 'border-indigo-600 bg-indigo-50/70'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono tabular-nums">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 ${
                          t.status === 'ok' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-slate-900">{t.tool_name}</span>
                      <span className="text-slate-500">id: {t.call_id}</span>
                    </div>
                    <span className="text-slate-500">
                      {t.status.toUpperCase()} · {t.duration_ms}ms
                    </span>
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-2.5 text-[11px] font-mono text-slate-800">
                    {JSON.stringify(t.result, null, 2)}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
