import React from 'react';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { STRINGS, UiLang } from '../i18n/strings.ts';

interface QuickScenario {
  id: string;
  labelEn: string;
  labelHi: string;
  prompt: string;
}

interface PlanQueryBarProps {
  queryInput: string;
  onChangeQueryInput: (v: string) => void;
  onSubmitQuery: (prompt: string) => void;
  planLoading: boolean;
  planError: string | null;
  scenarios: QuickScenario[];
  lang: UiLang;
  strings: typeof STRINGS['en'];
}

export const PlanQueryBar: React.FC<PlanQueryBarProps> = ({
  queryInput,
  onChangeQueryInput,
  onSubmitQuery,
  planLoading,
  planError,
  scenarios,
  lang,
  strings,
}) => {
  return (
    <section className="aurora-surface rounded-2xl p-5 space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmitQuery(queryInput);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="copilot-query" className="sr-only">
          Describe your household situation or decision
        </label>
        <input
          id="copilot-query"
          type="text"
          value={queryInput}
          onChange={(e) => onChangeQueryInput(e.target.value)}
          placeholder={strings.today.promptPlaceholder}
          maxLength={1200}
          className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:outline-none"
        />
        <button
          type="submit"
          disabled={planLoading || !queryInput.trim()}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {planLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Working…</span>
            </>
          ) : (
            <>
              <span>{strings.actions.getPlan}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">
          {strings.today.quickScenariosLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              type="button"
              disabled={planLoading}
              onClick={() => {
                onChangeQueryInput(sc.prompt);
                onSubmitQuery(sc.prompt);
              }}
              className={`min-h-[36px] rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                sc.id === 'redflag'
                  ? 'border-red-200 bg-red-50/70 text-red-900 hover:bg-red-100'
                  : 'border-slate-200 bg-white/85 text-slate-700 hover:border-teal-600 hover:text-teal-900'
              }`}
            >
              {lang === 'hi' ? sc.labelHi : sc.labelEn}
            </button>
          ))}
        </div>
      </div>

      {planError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-950"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
            <span>{planError}</span>
          </div>
          <button
            type="button"
            onClick={() => onSubmitQuery(queryInput)}
            className="font-semibold text-red-800 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
};
