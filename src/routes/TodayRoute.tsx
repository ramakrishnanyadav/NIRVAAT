import React from 'react';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TodayBento } from '../components/TodayBento';
import { PlanQueryBar } from '../components/PlanQueryBar';
import { PlanRenderer } from '../features/today/PlanRenderer';
import { SustainableAlternativesSection } from '../features/today/SustainableAlternativesSection';
import { HonestySection } from '../shared/ui/HonestySection';
import { InversionTimeline } from '../components/InversionTimeline';
import { RouteErrorBoundary } from '../shared/ui/RouteErrorBoundary';
import {
  AirQualitySummary,
  ChannelType,
  HouseholdProfile,
  NirvaatPlanResponse,
  RegionConfig,
} from '../shared/nirvaatTypes';
import { UiLang, UiStrings } from '../i18n/strings';

interface QuickScenario {
  id: string;
  labelEn: string;
  labelHi: string;
  prompt: string;
}

interface TodayRouteProps {
  selectedRegion: RegionConfig;
  profile: HouseholdProfile;
  presets: Array<{ id: string; labelEn: string; labelHi: string; profile: HouseholdProfile }>;
  activePresetId: string;
  hasCustomQuery: boolean;
  onSelectPreset: (preset: { id: string; profile: HouseholdProfile }) => void;
  aqData: AirQualitySummary | null;
  aqError: string | null;
  onRetryAq: () => void;
  reduceMotion: boolean;
  activePlan: NirvaatPlanResponse | null;
  completedRanks: number[];
  lang: UiLang;
  strings: UiStrings;
  queryInput: string;
  onChangeQueryInput: (val: string) => void;
  onSubmitQuery: (prompt: string) => void;
  planLoading: boolean;
  planError: string | null;
  scenarios: QuickScenario[];
  auditResult: { pass: boolean; violations: Array<{ rule: string; field: string; fix: string }> } | null;
  modelUsed: string | null;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  saveError: string | null;
  onSavePlan: () => void;
  onToggleDone: (rank: number) => void;
  onInspectToolRef: (ref: string) => void;
  onResetToAutoPlan: () => void;
  onReplyClarify: (ans: string) => void;
  selectedHourIdx: number;
  onSelectHour: (idx: number) => void;
  channel: ChannelType;
}

export function TodayRoute(props: TodayRouteProps) {
  const navigate = useNavigate();

  return (
    <RouteErrorBoundary routeName="Today Action Plan">
      <div className="space-y-6">
        <TodayBento
          selectedRegion={props.selectedRegion}
          profile={props.profile}
          presets={props.presets}
          activePresetId={props.activePresetId}
          hasCustomQuery={props.hasCustomQuery}
          onSelectPreset={props.onSelectPreset}
          onNavigateHousehold={() => navigate('/household')}
          aqData={props.aqData}
          aqError={props.aqError}
          onRetryAq={props.onRetryAq}
          reduceMotion={props.reduceMotion}
          activePlan={props.activePlan}
          completedRanks={props.completedRanks}
          lang={props.lang}
          strings={props.strings}
        />

        <PlanQueryBar
          queryInput={props.queryInput}
          onChangeQueryInput={props.onChangeQueryInput}
          onSubmitQuery={props.onSubmitQuery}
          planLoading={props.planLoading}
          planError={props.planError}
          scenarios={props.scenarios}
          lang={props.lang}
          strings={props.strings}
        />

        {props.planLoading ? (
          <div className="aurora-surface rounded-2xl p-6 space-y-4" aria-live="polite">
            <div className="flex items-center gap-2 text-sm font-medium text-teal-800">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{props.strings.actions.generating}</span>
            </div>
            <div className="space-y-3">
              <div className="h-20 rounded-xl bg-slate-200/60" />
              <div className="h-28 rounded-xl bg-slate-200/60" />
              <div className="h-28 rounded-xl bg-slate-200/60" />
            </div>
          </div>
        ) : props.activePlan ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-mono tabular-nums">
                Mode: <strong className="text-slate-900">{props.activePlan.mode}</strong> · Tier:{' '}
                <strong className="text-slate-900">{props.activePlan.data_status}</strong>
                {props.auditResult?.pass ? ' · V1–V8 verified' : ''}
                {props.modelUsed ? ` · ${props.modelUsed}` : ''}
              </div>

              <div className="flex items-center gap-2">
                {props.hasCustomQuery && (
                  <button
                    type="button"
                    onClick={props.onResetToAutoPlan}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                    <span>Live Auto-Plan</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={props.onSavePlan}
                  disabled={props.saveState === 'saving' || props.saveState === 'saved'}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  <Save className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                  <span>
                    {props.saveState === 'saving'
                      ? 'Saving…'
                      : props.saveState === 'saved'
                        ? props.strings.actions.saved
                        : props.saveState === 'error'
                          ? props.strings.actions.retrySave
                          : props.strings.actions.savePlan}
                  </span>
                </button>
              </div>
            </div>

            {props.saveError && (
              <div role="alert" className="flex items-center justify-between rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs text-red-900">
                <span>{props.saveError}</span>
                <button type="button" onClick={props.onSavePlan} className="font-semibold underline">
                  {props.strings.actions.retrySave}
                </button>
              </div>
            )}

            <PlanRenderer
              plan={props.activePlan}
              channel={props.channel}
              strings={props.strings}
              completedActionRanks={props.completedRanks}
              onToggleDone={props.onToggleDone}
              onInspectToolRef={props.onInspectToolRef}
              onReplyClarify={props.onReplyClarify}
              onFollowUpClick={props.onSubmitQuery}
            />
          </div>
        ) : (
          <section className="aurora-surface rounded-2xl p-8 text-center space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{props.strings.today.emptyTitle}</h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600">
              {props.strings.today.emptyBody}
            </p>
          </section>
        )}

        {props.aqData && props.aqData.hourly_forecast.length > 0 && (
          <InversionTimeline
            points={props.aqData.hourly_forecast.slice(0, 12)}
            cleanestWindow={props.aqData.cleanest_window}
            peakWindow={props.aqData.peak_window}
            selectedHourIdx={props.selectedHourIdx}
            onSelectHour={props.onSelectHour}
            source={props.aqData.source}
            asOf={props.aqData.as_of}
          />
        )}

        <SustainableAlternativesSection lang={props.lang} strings={props.strings} />

        <HonestySection strings={props.strings} />
      </div>
    </RouteErrorBoundary>
  );
}
