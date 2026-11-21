import { useCallback, useEffect, useState } from 'react';
import {
  AirQualitySummary,
  ChannelType,
  DegradationSimulation,
  GuidanceEntry,
  HouseholdProfile,
  NirvaatPlanResponse,
  RegionConfig,
  RuntimeContext,
  SavedDecisionRecord,
  ToolCallTrace,
} from './nirvaatTypes';
import { UiLang } from '../i18n/strings';
import { DEFAULT_PROFILE, DEFAULT_REGION } from './defaults';

export function useNirvaatState() {
  const [lang, setLang] = useState<UiLang>('en');
  const [channel, setChannel] = useState<ChannelType>('APP');
  const [reduceMotion, setReduceMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [highContrast, setHighContrast] = useState(false);

  const [regions, setRegions] = useState<RegionConfig[]>([DEFAULT_REGION]);
  const [selectedRegion, setSelectedRegion] = useState<RegionConfig>(DEFAULT_REGION);
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [maxDataAgeMin, setMaxDataAgeMin] = useState(60);
  const [simDegradation, setSimDegradation] = useState<DegradationSimulation>('none');

  const [aqData, setAqData] = useState<AirQualitySummary | null>(null);
  const [aqLoading, setAqLoading] = useState(false);
  const [aqError, setAqError] = useState<string | null>(null);
  const [selectedHourIdx, setSelectedHourIdx] = useState(0);

  const [guidanceEntries, setGuidanceEntries] = useState<GuidanceEntry[]>([]);
  const [history, setHistory] = useState<SavedDecisionRecord[]>([]);
  const [activePresetId, setActivePresetId] = useState<string>('custom');
  const [hasCustomQuery, setHasCustomQuery] = useState(false);

  const [queryInput, setQueryInput] = useState('');
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [activePlan, setActivePlan] = useState<NirvaatPlanResponse | null>(null);
  const [toolTraces, setToolTraces] = useState<ToolCallTrace[]>([]);
  const [auditResult, setAuditResult] = useState<{ pass: boolean; violations: Array<{ rule: string; field: string; fix: string }> } | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [highlightedToolRef, setHighlightedToolRef] = useState<string | null>(null);
  const [completedRanks, setCompletedRanks] = useState<number[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    fetch('/api/neighborhoods').then((r) => r.ok && r.json()).then((d) => d?.regions?.length && setRegions(d.regions)).catch(() => {});
    fetch('/api/guidance').then((r) => r.ok && r.json()).then((d) => d?.entries?.length && setGuidanceEntries(d.entries)).catch(() => {});
    fetch('/api/history').then((r) => r.ok && r.json()).then((d) => Array.isArray(d?.items) && setHistory(d.items)).catch(() => {});
  }, []);

  const loadAirQuality = useCallback(async () => {
    setAqLoading(true);
    setAqError(null);
    try {
      const qs = new URLSearchParams({
        lat: String(selectedRegion.latitude),
        lon: String(selectedRegion.longitude),
        city: selectedRegion.city,
        neighborhood: selectedRegion.neighborhood,
        maxAge: String(maxDataAgeMin),
        sim: simDegradation,
      });
      const res = await fetch(`/api/air-quality?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAqData(null);
        setAqError(data.error || 'Live telemetry temporarily unavailable.');
      } else {
        setAqData(data.data);
        setSelectedHourIdx(0);
      }
    } catch {
      setAqData(null);
      setAqError('Network unreachable while refreshing air-quality grid.');
    } finally {
      setAqLoading(false);
    }
  }, [selectedRegion, maxDataAgeMin, simDegradation]);

  useEffect(() => {
    loadAirQuality();
  }, [loadAirQuality]);

  const buildRuntimeContext = useCallback((): RuntimeContext => ({
    locale: lang === 'hi' ? 'hi-IN' : 'en-IN',
    channel,
    max_data_age_min: maxDataAgeMin,
    region: selectedRegion,
    profile,
    session_memory: { last_plan_summary: null, user_feedback: null, unresolved_question: null },
    simulated_degradation: simDegradation,
  }), [lang, channel, maxDataAgeMin, selectedRegion, profile, simDegradation]);

  const loadDeterministicPlan = useCallback(async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await fetch('/api/engines/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtime: buildRuntimeContext() }),
      });
      const data = await res.json();
      if (res.ok && data?.plan) {
        setActivePlan(data.plan);
        setToolTraces(data.tool_traces ?? []);
        setAuditResult(data.audit ?? { pass: true, violations: [] });
        setModelUsed(data.model_used ?? 'nirvaat-deterministic-engines-v1');
        setCompletedRanks([]);
      }
    } catch {} finally {
      setPlanLoading(false);
    }
  }, [buildRuntimeContext]);

  useEffect(() => {
    if (!hasCustomQuery) loadDeterministicPlan();
  }, [hasCustomQuery, loadDeterministicPlan]);

  const submitPlanQuery = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPlanLoading(true);
    setPlanError(null);
    setLastSubmittedQuery(trimmed);

    try {
      const rt: RuntimeContext = {
        ...buildRuntimeContext(),
        session_memory: {
          last_plan_summary: activePlan?.situation.summary ?? null,
          user_feedback: null,
          unresolved_question: activePlan?.clarifying_question ?? null,
        },
      };
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, runtime: rt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlanError(data.error || 'Could not generate plan.');
        return;
      }
      setHasCustomQuery(true);
      setActivePlan(data.plan);
      setToolTraces(data.tool_traces ?? []);
      setAuditResult(data.audit ?? null);
      setModelUsed(data.model_used ?? null);
      setCompletedRanks([]);
    } catch {
      setPlanError('Network error while contacting NIRVAAT engine.');
    } finally {
      setPlanLoading(false);
    }
  };

  const saveCurrentPlan = async () => {
    if (!activePlan) return;
    setSaveState('saving');
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: lastSubmittedQuery || activePlan.situation.summary,
          region_label: `${selectedRegion.city} · ${selectedRegion.neighborhood}`,
          channel,
          plan: activePlan,
          tool_traces: toolTraces,
          model_used: modelUsed ?? 'gemini-4-hydrogen',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.saved) {
        setSaveState('error');
        setSaveError(data.error || 'Could not save plan.');
        return;
      }
      setSaveState('saved');
      setHistory((prev) => [data.record, ...prev.filter((i) => i.id !== data.record.id)]);
    } catch {
      setSaveState('error');
      setSaveError('Connection interrupted while saving.');
    }
  };

  return {
    lang, setLang, channel, setChannel, reduceMotion, setReduceMotion,
    highContrast, setHighContrast, regions, setRegions, selectedRegion, setSelectedRegion,
    profile, setProfile, maxDataAgeMin, setMaxDataAgeMin, simDegradation, setSimDegradation,
    aqData, aqLoading, aqError, selectedHourIdx, setSelectedHourIdx, guidanceEntries,
    history, setHistory, activePresetId, setActivePresetId, hasCustomQuery, setHasCustomQuery,
    queryInput, setQueryInput, lastSubmittedQuery, planLoading, planError, activePlan,
    toolTraces, auditResult, modelUsed, highlightedToolRef, setHighlightedToolRef,
    completedRanks, setCompletedRanks, saveState, saveError, geoLoading, setGeoLoading,
    loadAirQuality, submitPlanQuery, saveCurrentPlan,
  };
}
