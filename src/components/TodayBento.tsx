import React from 'react';
import { BreathOrb } from './BreathOrb.tsx';
import { ExposureRing } from './ExposureRing.tsx';
import { AirQualitySummary, HouseholdProfile, NirvaatPlanResponse, RegionConfig } from '../shared/nirvaatTypes.ts';
import { STRINGS, UiLang } from '../i18n/strings.ts';

interface HouseholdPreset {
  id: string;
  labelEn: string;
  labelHi: string;
  profile: HouseholdProfile;
}

interface TodayBentoProps {
  selectedRegion: RegionConfig;
  profile: HouseholdProfile;
  presets: HouseholdPreset[];
  activePresetId: string;
  hasCustomQuery: boolean;
  onSelectPreset: (preset: HouseholdPreset) => void;
  onNavigateHousehold: () => void;
  aqData: AirQualitySummary | null;
  aqError: string | null;
  onRetryAq: () => void;
  reduceMotion: boolean;
  activePlan: NirvaatPlanResponse | null;
  completedRanks: number[];
  lang: UiLang;
  strings: typeof STRINGS['en'];
}

export const TodayBento: React.FC<TodayBentoProps> = ({
  selectedRegion,
  profile,
  presets,
  activePresetId,
  hasCustomQuery,
  onSelectPreset,
  onNavigateHousehold,
  aqData,
  aqError,
  onRetryAq,
  reduceMotion,
  activePlan,
  completedRanks,
  lang,
  strings,
}) => {
  return (
    <section className="grid gap-4 lg:grid-cols-12 items-stretch">
      <div className="aurora-surface rounded-2xl p-6 lg:col-span-5 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-teal-800">
            {selectedRegion.city} · {selectedRegion.neighborhood} · {profile.members.length} household members
          </p>
          <h1
            id="page-heading"
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-slate-950 [text-wrap:balance] outline-none"
          >
            {strings.today.headline}
          </h1>
          <p className="text-xs leading-relaxed text-slate-600">{strings.today.subtitle}</p>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  activePresetId === preset.id && !hasCustomQuery
                    ? 'border-teal-700 bg-teal-50 text-teal-950 font-semibold'
                    : 'border-slate-200 bg-white/80 text-slate-700 hover:border-teal-600'
                }`}
              >
                {lang === 'hi' ? preset.labelHi : preset.labelEn}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>Priority: {profile.members[0]?.label}</span>
            <span aria-hidden="true">·</span>
            <span>Budget: {profile.constraints.budget_band.replace('_', ' ')}</span>
            <button
              type="button"
              onClick={onNavigateHousehold}
              className="font-semibold text-teal-800 hover:underline"
            >
              Edit household
            </button>
          </div>
        </div>
      </div>

      <div className="aurora-surface rounded-2xl p-5 lg:col-span-3 flex items-center">
        {aqError ? (
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-amber-900">No live reading</p>
            <p className="text-slate-600">{aqError}</p>
            <button
              type="button"
              onClick={onRetryAq}
              className="font-semibold text-teal-800 hover:underline"
            >
              Retry telemetry
            </button>
          </div>
        ) : (
          <BreathOrb
            pm25={aqData?.pm2_5 ?? null}
            pm25Range={aqData?.pm2_5_range}
            asOf={aqData?.as_of}
            label="Grid PM2.5"
            reduceMotion={reduceMotion}
            isStale={aqData?.is_stale}
          />
        )}
      </div>

      <div className="aurora-surface rounded-2xl p-5 lg:col-span-4 flex items-center">
        <ExposureRing
          baselinePm25={aqData?.pm2_5 ?? null}
          plan={activePlan}
          completedRanks={completedRanks}
          title={strings.today.exposureBudgetTitle}
          withPlanLabel={strings.today.withPlanLabel}
          withoutPlanLabel={strings.today.withoutPlanLabel}
        />
      </div>
    </section>
  );
};
