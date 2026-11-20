import {
  AlertCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Save,
  ShieldAlert,
  Undo2,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuditAndSettingsView } from './components/AuditAndSettingsView';
import { BreathOrb } from './components/BreathOrb';
import { CommandItem, CommandPalette } from './components/CommandPalette';
import { EmergencyView } from './components/EmergencyView';
import { HouseholdTwin } from './components/HouseholdTwin';
import { InversionTimeline } from './components/InversionTimeline';
import { LearnView } from './components/LearnView';
import { PlanQueryBar } from './components/PlanQueryBar';
import { PlanRenderer } from './components/PlanRenderer';
import { TodayBento } from './components/TodayBento';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { STRINGS, UiLang } from './i18n/strings';
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
} from './shared/nirvaatTypes';

type ActiveRoute = 'today' | 'forecast' | 'household' | 'learn' | 'audit' | 'emergency';

const DEFAULT_REGION: RegionConfig = {
  city: 'Delhi NCR',
  neighborhood: 'Anand Vihar · East Grid',
  grid_id: '28.65_77.31',
  latitude: 28.65,
  longitude: 77.31,
  emergency_number: '112',
  official_source: 'CPCB Sameer / SAFAR India',
  active_policy: 'GRAP Stage IV Winter Emergency Measures',
};

const DEFAULT_PROFILE: HouseholdProfile = {
  members: [
    { label: 'Toddler (18m)', age_band: 'infant_under_2', conditions: [] },
    { label: 'Grandparent', age_band: 'older_adult_65_plus', conditions: ['asthma'] },
    { label: 'Commuter', age_band: 'adult', conditions: [] },
  ],
  home: {
    type: 'apartment',
    size_band: 'medium_40_85m2',
    windows_habit: 'loose_frames_drafty',
    ac_or_heater: 'none',
    cooking_fuel: 'lpg_gas',
    purifier: { has: false, type: 'none', cadr: 0 },
    masks: ['n95_kn95_kf94'],
  },
  commute: {
    mode: 'public_transit',
    window: '08:00–09:00',
  },
  constraints: {
    budget_band: 'low_cost',
    renter: true,
    outdoor_work: false,
  },
  languages: ['en-IN', 'hi-IN'],
};

const HOUSEHOLD_PRESETS: Array<{
  id: string;
  labelEn: string;
  labelHi: string;
  profile: HouseholdProfile;
}> = [
  {
    id: 'leaky_1bhk_toddler',
    labelEn: 'Leaky 1BHK + Toddler',
    labelHi: 'किराए का 1BHK + शिशु',
    profile: {
      members: [
        { label: 'Toddler (18m)', age_band: 'infant_under_2', conditions: [] },
        { label: 'Caregiver', age_band: 'adult', conditions: [] },
      ],
      home: {
        type: 'single_room',
        size_band: 'small_under_40m2',
        windows_habit: 'loose_frames_drafty',
        ac_or_heater: 'none',
        cooking_fuel: 'lpg_gas',
        purifier: { has: false, type: 'none', cadr: 0 },
        masks: ['none'],
      },
      commute: { mode: 'walking', window: '08:00–09:00' },
      constraints: { budget_band: 'low_cost', renter: true, outdoor_work: false },
      languages: ['hi-IN', 'en-IN'],
    },
  },
  {
    id: 'sealed_flat_purifier',
    labelEn: 'Sealed Flat + Pregnant + HEPA',
    labelHi: 'बंद फ्लैट + गर्भवती + HEPA',
    profile: {
      members: [
        { label: 'Pregnant parent', age_band: 'adult', conditions: ['pregnancy'] },
        { label: 'Spouse', age_band: 'adult', conditions: [] },
      ],
      home: {
        type: 'apartment',
        size_band: 'medium_40_85m2',
        windows_habit: 'mostly_closed',
        ac_or_heater: 'split_ac',
        cooking_fuel: 'piped_gas',
        purifier: { has: true, type: 'hepa', cadr: 320 },
        masks: ['n95_kn95_kf94'],
      },
      commute: { mode: 'car', window: '09:00–10:00' },
      constraints: { budget_band: 'moderate', renter: false, outdoor_work: false },
      languages: ['en-IN'],
    },
  },
  {
    id: 'outdoor_worker',
    labelEn: 'Outdoor Rider (6h Shift)',
    labelHi: 'आउटडोर राइडर (6 घंटे)',
    profile: {
      members: [{ label: 'Outdoor worker', age_band: 'adult', conditions: [] }],
      home: {
        type: 'shared_flat',
        size_band: 'small_under_40m2',
        windows_habit: 'loose_frames_drafty',
        ac_or_heater: 'none',
        cooking_fuel: 'lpg_gas',
        purifier: { has: false, type: 'none', cadr: 0 },
        masks: ['cloth_surgical'],
      },
      commute: { mode: 'two_wheeler', window: '09:00–15:00' },
      constraints: { budget_band: 'low_cost', renter: true, outdoor_work: true },
      languages: ['hi-IN', 'en-IN'],
    },
  },
];

const QUICK_SCENARIOS: Array<{ id: string; labelEn: string; labelHi: string; prompt: string }> = [
  {
    id: 'routine',
    labelEn: 'Plan tonight & morning',
    labelHi: 'आज रात और कल सुबह की योजना',
    prompt:
      'What should our household do tonight and tomorrow morning to cut smog exposure on a tight budget?',
  },
  {
    id: 'school',
    labelEn: 'School walk & infant',
    labelHi: 'स्कूल जाने का समय और शिशु सुरक्षा',
    prompt:
      'We have a toddler under 2 and need to do an outdoor morning errand. When is safest and what protection works?',
  },
  {
    id: 'ventilate',
    labelEn: 'Should we open windows?',
    labelHi: 'क्या अभी खिड़कियां खोलें?',
    prompt: 'Should we open windows to air out the flat right now, or keep them sealed until afternoon?',
  },
  {
    id: 'outdoor',
    labelEn: 'Outdoor work shift',
    labelHi: 'बाहर काम करने की शिफ्ट',
    prompt:
      'One family member works outdoors for 6 hours today. What practical protection works within their shift?',
  },
  {
    id: 'cooking',
    labelEn: 'Cooking smoke in small flat',
    labelHi: 'छोटे घर में खाना पकाने का धुआं',
    prompt:
      'We cook with LPG in a closed rented flat during winter smog. How do we prevent indoor spikes?',
  },
  {
    id: 'redflag',
    labelEn: 'Test red-flag triage',
    labelHi: 'आपातकालीन लक्षण जांच',
    prompt:
      'My grandparent has chest tightness and wheezing that is not settling after using their prescribed reliever.',
  },
];

const VALID_ROUTES: ActiveRoute[] = ['today', 'forecast', 'household', 'learn', 'audit', 'emergency'];

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = location.pathname.replace(/^\//, '').toLowerCase() as ActiveRoute;
  const route: ActiveRoute = VALID_ROUTES.includes(activePath) ? activePath : 'today';

  const [lang, setLang] = useState<UiLang>('en');
  const [channel, setChannel] = useState<ChannelType>('APP');
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [highContrast, setHighContrast] = useState(false);
  const [routeAnnouncement, setRouteAnnouncement] = useState('');

  const navigateTo = useCallback((newRoute: ActiveRoute) => {
    navigate(`/${newRoute}`);
  }, [navigate]);

  // Route change focus management and screen reader live announcement
  useEffect(() => {
    window.scrollTo(0, 0);
    const heading = document.getElementById('page-heading');
    if (heading) {
      heading.focus();
    }
    const routeNames: Record<string, { en: string; hi: string }> = {
      '/today': { en: 'Today Action Plan', hi: 'आज की कार्य योजना' },
      '/forecast': { en: '24-Hour Forecast & Inversion Timeline', hi: '24 घंटे का पूर्वानुमान' },
      '/household': { en: 'Household Twin & Exposure Profile', hi: 'पारिवारिक प्रोफ़ाइल' },
      '/learn': { en: 'Smog Science Library', hi: 'स्मॉग विज्ञान पुस्तकालय' },
      '/audit': { en: 'Audit & System Settings', hi: 'ऑडिट और सिस्टम सेटिंग्स' },
      '/emergency': { en: 'Emergency Medical & SOS Support', hi: 'आपातकालीन चिकित्सा सहायता' },
    };
    const current = routeNames[location.pathname] || { en: 'Page Loaded', hi: 'पेज लोड हुआ' };
    setRouteAnnouncement(lang === 'hi' ? current.hi : current.en);
  }, [location.pathname, lang]);

  // Dynamic language attribute synchronization
  useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  }, [lang]);

  // Listen to OS prefers-reduced-motion live changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

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
  const [auditResult, setAuditResult] = useState<{
    pass: boolean;
    violations: Array<{ rule: string; field: string; fix: string }>;
  } | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [highlightedToolRef, setHighlightedToolRef] = useState<string | null>(null);

  const [completedRanks, setCompletedRanks] = useState<number[]>([]);
  const [undoToast, setUndoToast] = useState<{ rank: number; title: string } | null>(null);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [cmdOpen, setCmdOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const strings = STRINGS[lang];

  // Sync body accessibility classes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', reduceMotion);
    root.classList.toggle('high-contrast', highContrast);
  }, [reduceMotion, highContrast]);

  // Keyboard Cmd/Ctrl+K for Command Palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load initial regions, guidance library, and saved history
  useEffect(() => {
    fetch('/api/neighborhoods')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.regions?.length) {
          setRegions(data.regions);
        }
      })
      .catch(() => {});

    fetch('/api/guidance')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.entries?.length) {
          setGuidanceEntries(data.entries);
        }
      })
      .catch(() => {});

    fetch('/api/history')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.items)) {
          setHistory(data.items);
        }
      })
      .catch(() => {});
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

  const buildRuntimeContext = useCallback((): RuntimeContext => {
    return {
      locale: lang === 'hi' ? 'hi-IN' : 'en-IN',
      channel,
      max_data_age_min: maxDataAgeMin,
      region: selectedRegion,
      profile,
      session_memory: {
        last_plan_summary: null,
        user_feedback: null,
        unresolved_question: null,
      },
      simulated_degradation: simDegradation,
    };
  }, [lang, channel, maxDataAgeMin, selectedRegion, profile, simDegradation]);

  const loadDeterministicPlan = useCallback(async () => {
    setPlanLoading(true);
    setPlanError(null);
    setSaveState('idle');
    setSaveError(null);

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
    } catch {
      // Keep previous plan if transient network blip occurs
    } finally {
      setPlanLoading(false);
    }
  }, [buildRuntimeContext]);

  // Auto-load quantified live plan from @nirvaat/engines whenever region/household/lang/tier changes
  useEffect(() => {
    if (!hasCustomQuery) {
      loadDeterministicPlan();
    }
  }, [hasCustomQuery, loadDeterministicPlan]);

  const submitPlanQuery = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setPlanLoading(true);
    setPlanError(null);
    setSaveState('idle');
    setSaveError(null);
    setLastSubmittedQuery(trimmed);

    try {
      const runtimeWithMemory: RuntimeContext = {
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
        body: JSON.stringify({
          query: trimmed,
          runtime: runtimeWithMemory,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlanError(data.error || 'Could not generate plan. Your input was preserved.');
        return;
      }

      setHasCustomQuery(true);
      setActivePlan(data.plan);
      setToolTraces(data.tool_traces ?? []);
      setAuditResult(data.audit ?? null);
      setModelUsed(data.model_used ?? null);
      setCompletedRanks([]);
      navigateTo('today');
    } catch {
      setPlanError('Network error while contacting NIRVAAT engine. Your prompt was kept intact.');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleSaveCurrentPlan = async () => {
    if (!activePlan) return;
    setSaveState('saving');
    setSaveError(null);

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
        setSaveError(data.error || 'Could not save plan. Please retry.');
        return;
      }
      setSaveState('saved');
      setHistory((prev) => [data.record, ...prev.filter((i) => i.id !== data.record.id)]);
    } catch {
      setSaveState('error');
      setSaveError('Connection interrupted while saving. Click Retry Save.');
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      // Ignore transient delete error
    }
  };

  const handleUseBrowserGeolocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // H6 Privacy: immediately round to 2 decimal places (~1.1 km coarse grid)
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lon = Math.round(pos.coords.longitude * 100) / 100;
        setSelectedRegion({
          city: 'Local Coarse Grid',
          neighborhood: `Cell ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
          grid_id: `${lat.toFixed(2)}_${lon.toFixed(2)}`,
          latitude: lat,
          longitude: lon,
          emergency_number: selectedRegion.emergency_number,
          official_source: 'Local AQ Portal / Open-Meteo',
          active_policy: 'Custom Coarse Location',
        });
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  };

  const handleToggleDone = (rank: number) => {
    const action = activePlan?.actions.find((a) => a.rank === rank);
    const alreadyDone = completedRanks.includes(rank);
    setCompletedRanks((prev) =>
      alreadyDone ? prev.filter((r) => r !== rank) : [...prev, rank]
    );
    if (!alreadyDone && action) {
      setUndoToast({ rank, title: action.title });
      setTimeout(() => {
        setUndoToast((curr) => (curr?.rank === rank ? null : curr));
      }, 4500);
    }
  };

  // Current or scrubbed PM2.5 for BreathOrb
  const scrubbedPoint =
    aqData?.hourly_forecast && aqData.hourly_forecast[selectedHourIdx]
      ? aqData.hourly_forecast[selectedHourIdx]
      : null;
  const displayPm25 =
    route === 'forecast' && scrubbedPoint
      ? scrubbedPoint.pm2_5
      : aqData?.pm2_5 ?? null;

  // Dynamic subtle Aurora backdrop tint (cooler teal/sky when cleaner, warmer amber/peach when hazy, never dark/ominous)
  const auroraTint = useMemo(() => {
    const val = displayPm25 ?? 60;
    if (val <= 45) return 'from-teal-200/45 via-sky-200/40 to-emerald-100/40';
    if (val <= 110) return 'from-sky-200/40 via-indigo-100/35 to-amber-100/40';
    return 'from-amber-200/45 via-orange-100/35 to-indigo-100/35';
  }, [displayPm25]);

  const commandItems: CommandItem[] = [
    { id: 'nav-today', label: strings.nav.today, section: 'Navigate', onSelect: () => navigateTo('today') },
    { id: 'nav-forecast', label: strings.nav.forecast, section: 'Navigate', onSelect: () => navigateTo('forecast') },
    { id: 'nav-household', label: strings.nav.household, section: 'Navigate', onSelect: () => navigateTo('household') },
    { id: 'nav-learn', label: strings.nav.learn, section: 'Navigate', onSelect: () => navigateTo('learn') },
    { id: 'nav-audit', label: strings.nav.audit, section: 'Navigate', onSelect: () => navigateTo('audit') },
    {
      id: 'nav-emergency',
      label: strings.nav.emergency,
      section: 'Urgent',
      onSelect: () => navigateTo('emergency'),
    },
    {
      id: 'toggle-lang',
      label: lang === 'en' ? 'Switch to Hindi (हिन्दी)' : 'Switch to English',
      section: 'Settings',
      onSelect: () => setLang((l) => (l === 'en' ? 'hi' : 'en')),
    },
    ...QUICK_SCENARIOS.slice(0, 4).map((sc) => ({
      id: `sc-${sc.id}`,
      label: lang === 'hi' ? sc.labelHi : sc.labelEn,
      section: 'Run Decision',
      onSelect: () => {
        setQueryInput(sc.prompt);
        submitPlanQuery(sc.prompt);
      },
    })),
  ];

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <div className="relative min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#0B1B2B]">
        {/* Skip to content link for keyboard/screen-reader accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-teal-800 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>

        {/* Live route announcement for screen readers */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {routeAnnouncement}
        </div>

      {/* Aurora Air luminous backdrop */}
      {!highContrast && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br ${auroraTint} transition-colors duration-700`}
        >
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#7FD8D0]/35 blur-3xl" />
          <div className="absolute right-0 top-12 h-96 w-96 rounded-full bg-[#9CC9FF]/35 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-[#C7B8FF]/25 blur-3xl" />
          <div className="absolute -bottom-16 right-16 h-80 w-80 rounded-full bg-[#FFD9C2]/35 blur-3xl" />
        </div>
      )}

      {/* Top Bar Contract: Strict 3-zone header */}
      <header role="banner" className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Zone 1: Single text element wordmark */}
          <Link
            to="/today"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-indigo-600 rounded-md"
          >
            {strings.brand}
          </Link>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav aria-label="Primary" role="navigation" className="hidden md:flex items-center gap-6 text-sm font-medium">
            {(
              [
                ['today', strings.nav.today],
                ['forecast', strings.nav.forecast],
                ['household', strings.nav.household],
                ['learn', strings.nav.learn],
                ['audit', strings.nav.audit],
              ] as const
            ).map(([key, label]) => (
              <NavLink
                key={key}
                to={`/${key}`}
                aria-current={route === key ? 'page' : undefined}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  route === key
                    ? 'border-teal-700 text-teal-900 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <Link
              to="/emergency"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-900 hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-red-700" aria-hidden="true" />
              <span>{strings.actions.urgentHelp}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Workspace Context Toolbar (Below Top Bar) */}
      {route !== 'emergency' && (
        <WorkspaceToolbar
          regions={regions}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
          onUseBrowserGeolocation={handleUseBrowserGeolocation}
          geoLoading={geoLoading}
          onRefreshAirQuality={loadAirQuality}
          aqLoading={aqLoading}
          channel={channel}
          onChangeChannel={setChannel}
          lang={lang}
          onChangeLang={setLang}
          onOpenCmd={() => setCmdOpen(true)}
          strings={strings}
        />
      )}

      {/* Main Content Viewport */}
      <main id="main-content" role="main" tabIndex={-1} className="mx-auto max-w-[1280px] px-4 py-6 pb-24 sm:px-6 md:pb-12 outline-none">
        {route === 'emergency' ? (
          <EmergencyView
            emergencyNumber={selectedRegion.emergency_number}
            lang={lang}
            strings={strings}
            onBack={() => navigateTo('today')}
          />
        ) : route === 'forecast' ? (
          <div className="space-y-6">
            {/* Quick city switch bar for Forecast exploration */}
            {regions.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-slate-500">Compare grid:</span>
                {regions.map((r) => (
                  <button
                    key={r.grid_id}
                    type="button"
                    onClick={() => setSelectedRegion(r)}
                    className={`rounded-xl border px-3 py-1.5 font-medium transition-colors ${
                      selectedRegion.grid_id === r.grid_id
                        ? 'border-teal-700 bg-teal-50 text-teal-950 font-semibold'
                        : 'border-slate-200 bg-white/85 text-slate-700 hover:border-teal-600'
                    }`}
                  >
                    {r.city}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="aurora-surface rounded-2xl p-5 flex items-center">
                <BreathOrb
                  pm25={displayPm25}
                  pm25Range={aqData?.pm2_5_range}
                  asOf={aqData?.as_of}
                  label={scrubbedPoint ? `Forecast ${scrubbedPoint.time.slice(11, 16)}` : selectedRegion.city}
                  reduceMotion={reduceMotion}
                  isStale={aqData?.is_stale}
                />
              </div>
              <div className="aurora-surface rounded-2xl p-5 lg:col-span-2 flex flex-col justify-between space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Coarse Grid: {selectedRegion.grid_id}</span>
                  <span>Official Portal: {selectedRegion.official_source}</span>
                </div>
                <h1 id="page-heading" tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none">
                  {selectedRegion.city} · {selectedRegion.neighborhood}
                </h1>
                {scrubbedPoint ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-900 font-mono tabular-nums">
                        {scrubbedPoint.time.slice(11, 16)} Window · {scrubbedPoint.pm2_5 ?? '—'} µg/m³
                      </p>
                      <p className="text-slate-600">
                        {(scrubbedPoint.pm2_5 ?? 150) <= ((aqData?.cleanest_window?.avg_pm2_5 ?? 80) + 18)
                          ? 'Relatively clear dispersion window: best slot for brief cross-ventilation or essential errands.'
                          : (scrubbedPoint.pm2_5 ?? 0) >= 140
                            ? 'Winter inversion trap hour: keep exterior windows sealed, avoid indoor burning, and wear fitted N95 (ages 2+) outdoors.'
                            : 'Transitional haze hour: limit brisk outdoor exertion and shift errands toward the cleanest afternoon slot.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const hourStr = scrubbedPoint.time.slice(11, 16);
                        const prompt = `At ${hourStr}, forecast PM2.5 in ${selectedRegion.city} is ${scrubbedPoint.pm2_5 ?? 'elevated'} µg/m³. Should our household open windows, commute, or keep rooms sealed?`;
                        setQueryInput(prompt);
                        submitPlanQuery(prompt);
                      }}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
                    >
                      <span>Plan for {scrubbedPoint.time.slice(11, 16)}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    Active advisory: {selectedRegion.active_policy || 'Standard winter monitoring'} · Scrub the timeline below to inspect hourly winter inversion dispersion.
                  </p>
                )}
              </div>
            </div>

            <InversionTimeline
              points={aqData?.hourly_forecast ?? []}
              cleanestWindow={aqData?.cleanest_window ?? null}
              peakWindow={aqData?.peak_window ?? null}
              selectedHourIdx={selectedHourIdx}
              onSelectHour={setSelectedHourIdx}
              source={aqData?.source ?? selectedRegion.official_source}
              asOf={aqData?.as_of ?? new Date().toISOString()}
            />
          </div>
        ) : route === 'household' ? (
          <HouseholdTwin
            profile={profile}
            outdoorPm25={aqData?.pm2_5 ?? null}
            hourlyOutdoorPm25={aqData?.hourly_forecast.map((p) => p.pm2_5 ?? 140) ?? []}
            onChangeProfile={(next) => {
              setActivePresetId('custom');
              setHasCustomQuery(false);
              setProfile(next);
            }}
            onApplyAndRefreshPlan={() => {
              setHasCustomQuery(false);
              navigateTo('today');
            }}
          />
        ) : route === 'learn' ? (
          <LearnView entries={guidanceEntries} />
        ) : route === 'audit' ? (
          <AuditAndSettingsView
            traces={toolTraces}
            highlightedToolRef={highlightedToolRef}
            auditResult={auditResult}
            modelUsed={modelUsed}
            simDegradation={simDegradation}
            onChangeSimDegradation={setSimDegradation}
            maxDataAgeMin={maxDataAgeMin}
            onChangeMaxDataAgeMin={setMaxDataAgeMin}
            lang={lang}
            onChangeLang={setLang}
            reduceMotion={reduceMotion}
            onToggleReduceMotion={() => setReduceMotion((v) => !v)}
            highContrast={highContrast}
            onToggleHighContrast={() => setHighContrast((v) => !v)}
            history={history}
            onLoadHistory={(rec) => {
              setActivePlan(rec.plan);
              setToolTraces(rec.tool_traces);
              setModelUsed(rec.model_used);
              setChannel(rec.channel);
              setLastSubmittedQuery(rec.query);
              navigateTo('today');
            }}
            onDeleteHistory={handleDeleteHistory}
          />
        ) : (
          /* TODAY FLAGSHIP WORKSPACE */
          <div className="space-y-6">
            {/* Top Bento: Headline + Breath Orb + Exposure Ring */}
            <TodayBento
              selectedRegion={selectedRegion}
              profile={profile}
              presets={HOUSEHOLD_PRESETS}
              activePresetId={activePresetId}
              hasCustomQuery={hasCustomQuery}
              onSelectPreset={(preset) => {
                setActivePresetId(preset.id);
                setHasCustomQuery(false);
                setProfile(preset.profile);
              }}
              onNavigateHousehold={() => navigateTo('household')}
              aqData={aqData}
              aqError={aqError}
              onRetryAq={loadAirQuality}
              reduceMotion={reduceMotion}
              activePlan={activePlan}
              completedRanks={completedRanks}
              lang={lang}
              strings={strings}
            />

            {/* Copilot Prompt Dock */}
            <PlanQueryBar
              queryInput={queryInput}
              onChangeQueryInput={setQueryInput}
              onSubmitQuery={(prompt) => submitPlanQuery(prompt)}
              planLoading={planLoading}
              planError={planError}
              scenarios={QUICK_SCENARIOS}
              lang={lang}
              strings={strings}
            />

            {/* Plan Output + Save Bar */}
            {planLoading ? (
              <div className="aurora-surface rounded-2xl p-6 space-y-4" aria-live="polite">
                <div className="flex items-center gap-2 text-sm font-medium text-teal-800">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{strings.actions.generating}</span>
                </div>
                <div className="space-y-3">
                  <div className="h-20 rounded-xl bg-slate-200/60" />
                  <div className="h-28 rounded-xl bg-slate-200/60" />
                  <div className="h-28 rounded-xl bg-slate-200/60" />
                </div>
              </div>
            ) : activePlan ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 font-mono tabular-nums">
                    Mode: <strong className="text-slate-900">{activePlan.mode}</strong> · Tier:{' '}
                    <strong className="text-slate-900">{activePlan.data_status}</strong>
                    {auditResult?.pass ? ' · V1–V8 verified' : ''}
                    {modelUsed ? ` · ${modelUsed}` : ''}
                  </div>

                  <div className="flex items-center gap-2">
                    {hasCustomQuery && (
                      <button
                        type="button"
                        onClick={() => setHasCustomQuery(false)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                        <span>Live Auto-Plan</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveCurrentPlan}
                      disabled={saveState === 'saving' || saveState === 'saved'}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <Save className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                      <span>
                        {saveState === 'saving'
                          ? 'Saving…'
                          : saveState === 'saved'
                            ? strings.actions.saved
                            : saveState === 'error'
                              ? strings.actions.retrySave
                              : strings.actions.savePlan}
                      </span>
                    </button>
                  </div>
                </div>

                {saveError && (
                  <div
                    role="alert"
                    className="flex items-center justify-between rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs text-red-900"
                  >
                    <span>{saveError}</span>
                    <button
                      type="button"
                      onClick={handleSaveCurrentPlan}
                      className="font-semibold underline"
                    >
                      {strings.actions.retrySave}
                    </button>
                  </div>
                )}

                <PlanRenderer
                  plan={activePlan}
                  channel={channel}
                  strings={strings}
                  completedActionRanks={completedRanks}
                  onToggleDone={handleToggleDone}
                  onInspectToolRef={(ref) => {
                    setHighlightedToolRef(ref);
                    navigateTo('audit');
                  }}
                  onReplyClarify={(ans) => {
                    const combined = `${lastSubmittedQuery}\nAdditional detail: ${ans}`;
                    setQueryInput(combined);
                    submitPlanQuery(combined);
                  }}
                  onFollowUpClick={(hook) => {
                    setQueryInput(hook);
                    submitPlanQuery(hook);
                  }}
                />
              </div>
            ) : (
              <section className="aurora-surface rounded-2xl p-8 text-center space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">{strings.today.emptyTitle}</h2>
                <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600">
                  {strings.today.emptyBody}
                </p>
              </section>
            )}

            {/* Next 12h Compact Timeline Preview on Today View */}
            {aqData && aqData.hourly_forecast.length > 0 && (
              <InversionTimeline
                points={aqData.hourly_forecast.slice(0, 12)}
                cleanestWindow={aqData.cleanest_window}
                peakWindow={aqData.peak_window}
                selectedHourIdx={selectedHourIdx}
                onSelectHour={setSelectedHourIdx}
                source={aqData.source}
                asOf={aqData.as_of}
              />
            )}
          </div>
        )}
      </main>

      {/* Optimistic Mark-Done Undo Toast */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-4 z-40 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-xs text-white shadow-lg md:bottom-6"
        >
          <span>Marked done: {undoToast.title}</span>
          <button
            type="button"
            onClick={() => {
              setCompletedRanks((prev) => prev.filter((r) => r !== undoToast.rank));
              setUndoToast(null);
            }}
            className="inline-flex items-center gap-1 font-semibold text-teal-300 hover:underline"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Tab Bar (<=15% viewport height) */}
      <nav
        aria-label="Mobile Navigation"
        role="navigation"
        className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur-md md:hidden"
      >
        {(
          [
            ['today', strings.nav.today],
            ['forecast', strings.nav.forecast],
            ['household', strings.nav.household],
            ['learn', strings.nav.learn],
            ['audit', 'Audit'],
          ] as const
        ).map(([key, label]) => (
          <NavLink
            key={key}
            to={`/${key}`}
            className={`min-h-[44px] rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
              route === key ? 'text-teal-800 bg-teal-50' : 'text-slate-600'
            }`}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} items={commandItems} />
    </div>
    </MotionConfig>
  );
}
