import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TodayRoute } from './TodayRoute';
import { ForecastRoute } from './ForecastRoute';
import { HouseholdRoute } from './HouseholdRoute';
import { LearnRoute } from './LearnRoute';
import { CommunityRoute } from './CommunityRoute';
import { AuditRoute } from './AuditRoute';
import { EmergencyRoute } from './EmergencyRoute';
import {
  AirQualitySummary,
  ChannelType,
  GuidanceEntry,
  HouseholdProfile,
  NirvaatPlanResponse,
  RegionConfig,
  SavedDecisionRecord,
  ToolCallTrace,
  DegradationSimulation,
} from '../shared/nirvaatTypes';
import { UiLang, UiStrings } from '../i18n/strings';

export interface AppRoutesProps {
  selectedRegion: RegionConfig;
  setSelectedRegion: (r: RegionConfig) => void;
  regions: RegionConfig[];
  profile: HouseholdProfile;
  setProfile: React.Dispatch<React.SetStateAction<HouseholdProfile>>;
  presets: Array<{ id: string; labelEn: string; labelHi: string; profile: HouseholdProfile }>;
  activePresetId: string;
  setActivePresetId: (id: string) => void;
  hasCustomQuery: boolean;
  setHasCustomQuery: (val: boolean) => void;
  aqData: AirQualitySummary | null;
  aqError: string | null;
  onRetryAq: () => void;
  selectedHourIdx: number;
  setSelectedHourIdx: (idx: number) => void;
  reduceMotion: boolean;
  onToggleReduceMotion: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  activePlan: NirvaatPlanResponse | null;
  completedRanks: number[];
  lang: UiLang;
  onChangeLang: (l: UiLang) => void;
  strings: UiStrings;
  channel: ChannelType;
  queryInput: string;
  onChangeQueryInput: (val: string) => void;
  onSubmitQuery: (prompt: string) => void;
  planLoading: boolean;
  planError: string | null;
  scenarios: Array<{ id: string; labelEn: string; labelHi: string; prompt: string }>;
  auditResult: { pass: boolean; violations: Array<{ rule: string; field: string; fix: string }> } | null;
  modelUsed: string | null;
  toolTraces: ToolCallTrace[];
  highlightedToolRef: string | null;
  simDegradation: DegradationSimulation;
  onChangeSimDegradation: (d: DegradationSimulation) => void;
  maxDataAgeMin: number;
  onChangeMaxDataAgeMin: (m: number) => void;
  history: SavedDecisionRecord[];
  onLoadHistory: (rec: SavedDecisionRecord) => void;
  onDeleteHistory: (id: string) => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  saveError: string | null;
  onSavePlan: () => void;
  onToggleDone: (rank: number) => void;
  onInspectToolRef: (ref: string) => void;
  onResetToAutoPlan: () => void;
  onReplyClarify: (ans: string) => void;
  guidanceEntries: GuidanceEntry[];
}

export function AppRoutes(props: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/today" replace />} />
      <Route
        path="/today"
        element={
          <TodayRoute
            selectedRegion={props.selectedRegion}
            profile={props.profile}
            presets={props.presets}
            activePresetId={props.activePresetId}
            hasCustomQuery={props.hasCustomQuery}
            onSelectPreset={(preset) => {
              props.setActivePresetId(preset.id);
              props.setHasCustomQuery(false);
              props.setProfile(preset.profile);
            }}
            aqData={props.aqData}
            aqError={props.aqError}
            onRetryAq={props.onRetryAq}
            reduceMotion={props.reduceMotion}
            activePlan={props.activePlan}
            completedRanks={props.completedRanks}
            lang={props.lang}
            strings={props.strings}
            queryInput={props.queryInput}
            onChangeQueryInput={props.onChangeQueryInput}
            onSubmitQuery={props.onSubmitQuery}
            planLoading={props.planLoading}
            planError={props.planError}
            scenarios={props.scenarios}
            auditResult={props.auditResult}
            modelUsed={props.modelUsed}
            saveState={props.saveState}
            saveError={props.saveError}
            onSavePlan={props.onSavePlan}
            onToggleDone={props.onToggleDone}
            onInspectToolRef={props.onInspectToolRef}
            onResetToAutoPlan={props.onResetToAutoPlan}
            onReplyClarify={props.onReplyClarify}
            selectedHourIdx={props.selectedHourIdx}
            onSelectHour={props.setSelectedHourIdx}
            channel={props.channel}
          />
        }
      />
      <Route
        path="/forecast"
        element={
          <ForecastRoute
            regions={props.regions}
            selectedRegion={props.selectedRegion}
            setSelectedRegion={props.setSelectedRegion}
            aqData={props.aqData}
            selectedHourIdx={props.selectedHourIdx}
            setSelectedHourIdx={props.setSelectedHourIdx}
            reduceMotion={props.reduceMotion}
            onPlanForHour={(prompt) => {
              props.onChangeQueryInput(prompt);
              props.onSubmitQuery(prompt);
            }}
          />
        }
      />
      <Route
        path="/household"
        element={
          <HouseholdRoute
            profile={props.profile}
            aqData={props.aqData}
            setProfile={props.setProfile}
            setActivePresetId={props.setActivePresetId}
            setHasCustomQuery={props.setHasCustomQuery}
          />
        }
      />
      <Route path="/learn" element={<LearnRoute entries={props.guidanceEntries} />} />
      <Route
        path="/community"
        element={
          <CommunityRoute
            selectedRegion={props.selectedRegion}
            strings={props.strings}
            lang={props.lang}
          />
        }
      />
      <Route
        path="/audit"
        element={
          <AuditRoute
            traces={props.toolTraces}
            highlightedToolRef={props.highlightedToolRef}
            auditResult={props.auditResult}
            modelUsed={props.modelUsed}
            simDegradation={props.simDegradation}
            onChangeSimDegradation={props.onChangeSimDegradation}
            maxDataAgeMin={props.maxDataAgeMin}
            onChangeMaxDataAgeMin={props.onChangeMaxDataAgeMin}
            lang={props.lang}
            onChangeLang={props.onChangeLang}
            reduceMotion={props.reduceMotion}
            onToggleReduceMotion={props.onToggleReduceMotion}
            highContrast={props.highContrast}
            onToggleHighContrast={props.onToggleHighContrast}
            history={props.history}
            onLoadHistory={props.onLoadHistory}
            onDeleteHistory={props.onDeleteHistory}
          />
        }
      />
      <Route
        path="/emergency"
        element={
          <EmergencyRoute
            emergencyNumber={props.selectedRegion.emergency_number}
            lang={props.lang}
            strings={props.strings}
          />
        }
      />
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  );
}
