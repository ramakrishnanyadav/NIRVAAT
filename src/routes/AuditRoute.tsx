import React from 'react';
import { AuditAndSettingsView } from '../components/AuditAndSettingsView';
import { RouteErrorBoundary } from '../shared/ui/RouteErrorBoundary';
import {
  DegradationSimulation,
  SavedDecisionRecord,
  ToolCallTrace,
} from '../shared/nirvaatTypes';
import { UiLang } from '../i18n/strings';

interface AuditRouteProps {
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
  onLoadHistory: (rec: SavedDecisionRecord) => void;
  onDeleteHistory: (id: string) => void;
}

export function AuditRoute(props: AuditRouteProps) {
  return (
    <RouteErrorBoundary routeName="Audit & Verification">
      <AuditAndSettingsView {...props} />
    </RouteErrorBoundary>
  );
}
