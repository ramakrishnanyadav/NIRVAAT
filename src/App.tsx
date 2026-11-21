import { ShieldAlert } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { CommandItem, CommandPalette } from './components/CommandPalette';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { AppRoutes } from './routes/AppRoutes';
import { STRINGS } from './i18n/strings';
import { HOUSEHOLD_PRESETS, QUICK_SCENARIOS } from './shared/defaults';
import { useNirvaatState } from './shared/useNirvaatState';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = location.pathname.replace(/^\//, '').toLowerCase() || 'today';
  const state = useNirvaatState();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [routeAnnouncement, setRouteAnnouncement] = useState('');
  const strings = STRINGS[state.lang];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('page-heading')?.focus();
    const names: Record<string, { en: string; hi: string }> = {
      '/today': { en: 'Today Action Plan', hi: 'आज की कार्य योजना' },
      '/forecast': { en: '24-Hour Forecast & Inversion Timeline', hi: '24 घंटे का पूर्वानुमान' },
      '/household': { en: 'Household Twin & Exposure Profile', hi: 'पारिवारिक प्रोफ़ाइल' },
      '/community': { en: 'Community Exposure Defense', hi: 'सामुदायिक सुरक्षा' },
      '/learn': { en: 'Smog Science Library', hi: 'स्मॉग विज्ञान पुस्तकालय' },
      '/audit': { en: 'Audit & System Settings', hi: 'ऑडिट और सिस्टम सेटिंग्स' },
      '/emergency': { en: 'Emergency Medical & SOS Support', hi: 'आपातकालीन चिकित्सा सहायता' },
    };
    const cur = names[location.pathname] || { en: 'Page Loaded', hi: 'पेज लोड हुआ' };
    setRouteAnnouncement(state.lang === 'hi' ? cur.hi : cur.en);
  }, [location.pathname, state.lang]);

  useEffect(() => {
    document.documentElement.lang = state.lang === 'hi' ? 'hi-IN' : 'en-IN';
  }, [state.lang]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', Boolean(state.reduceMotion));
    document.documentElement.classList.toggle('high-contrast', state.highContrast);
  }, [state.reduceMotion, state.highContrast]);

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

  const commandItems: CommandItem[] = [
    { id: 'nav-today', label: strings.nav.today, section: 'Navigate', onSelect: () => navigate('/today') },
    { id: 'nav-forecast', label: strings.nav.forecast, section: 'Navigate', onSelect: () => navigate('/forecast') },
    { id: 'nav-household', label: strings.nav.household, section: 'Navigate', onSelect: () => navigate('/household') },
    { id: 'nav-community', label: strings.nav.community, section: 'Navigate', onSelect: () => navigate('/community') },
    { id: 'nav-learn', label: strings.nav.learn, section: 'Navigate', onSelect: () => navigate('/learn') },
    { id: 'nav-audit', label: strings.nav.audit, section: 'Navigate', onSelect: () => navigate('/audit') },
    { id: 'nav-emergency', label: strings.nav.emergency, section: 'Urgent', onSelect: () => navigate('/emergency') },
    { id: 'toggle-lang', label: state.lang === 'en' ? 'Switch to Hindi (हिन्दी)' : 'Switch to English', section: 'Settings', onSelect: () => state.setLang((l) => (l === 'en' ? 'hi' : 'en')) },
    ...QUICK_SCENARIOS.slice(0, 4).map((sc) => ({
      id: `sc-${sc.id}`,
      label: state.lang === 'hi' ? sc.labelHi : sc.labelEn,
      section: 'Run Decision',
      onSelect: () => {
        state.setQueryInput(sc.prompt);
        state.submitPlanQuery(sc.prompt);
      },
    })),
  ];

  return (
    <MotionConfig reducedMotion={state.reduceMotion ? 'always' : 'user'}>
      <div className="relative min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#0B1B2B]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-teal-800 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
          Skip to main content
        </a>
        <div className="sr-only" aria-live="polite" aria-atomic="true">{routeAnnouncement}</div>

        <header role="banner" className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
            <Link to="/today" className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              {strings.brand}
            </Link>
            <nav aria-label="Primary" role="navigation" className="hidden md:flex items-center gap-6 text-sm font-medium">
              {[
                ['today', strings.nav.today],
                ['forecast', strings.nav.forecast],
                ['household', strings.nav.household],
                ['community', strings.nav.community],
                ['learn', strings.nav.learn],
                ['audit', strings.nav.audit],
              ].map(([key, label]) => (
                <NavLink
                  key={key}
                  to={`/${key}`}
                  className={`py-1 transition-colors border-b-2 ${route === key ? 'border-teal-700 text-teal-900 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center shrink-0">
              <Link to="/emergency" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-900 hover:bg-red-100 transition-colors">
                <ShieldAlert className="h-3.5 w-3.5 text-red-700" aria-hidden="true" />
                <span>{strings.actions.urgentHelp}</span>
              </Link>
            </div>
          </div>
        </header>

        {route !== 'emergency' && (
          <WorkspaceToolbar
            regions={state.regions}
            selectedRegion={state.selectedRegion}
            onSelectRegion={state.setSelectedRegion}
            onUseBrowserGeolocation={() => {
              if (!navigator.geolocation) return;
              state.setGeoLoading(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const lat = Math.round(pos.coords.latitude * 100) / 100;
                  const lon = Math.round(pos.coords.longitude * 100) / 100;
                  state.setSelectedRegion({
                    city: 'Local Coarse Grid',
                    neighborhood: `Cell ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
                    grid_id: `${lat.toFixed(2)}_${lon.toFixed(2)}`,
                    latitude: lat,
                    longitude: lon,
                    emergency_number: state.selectedRegion.emergency_number,
                    official_source: 'Local AQ Portal / Open-Meteo',
                    active_policy: 'Custom Coarse Location',
                  });
                  state.setGeoLoading(false);
                },
                () => state.setGeoLoading(false),
                { enableHighAccuracy: false, timeout: 6000 }
              );
            }}
            geoLoading={state.geoLoading}
            onRefreshAirQuality={state.loadAirQuality}
            aqLoading={state.aqLoading}
            channel={state.channel}
            onChangeChannel={state.setChannel}
            lang={state.lang}
            onChangeLang={state.setLang}
            onOpenCmd={() => setCmdOpen(true)}
            strings={strings}
          />
        )}

        <main id="main-content" role="main" tabIndex={-1} className="mx-auto max-w-[1280px] px-4 py-6 pb-24 sm:px-6 md:pb-12 outline-none">
          <AppRoutes
            selectedRegion={state.selectedRegion}
            setSelectedRegion={state.setSelectedRegion}
            regions={state.regions}
            profile={state.profile}
            setProfile={state.setProfile}
            presets={HOUSEHOLD_PRESETS}
            activePresetId={state.activePresetId}
            setActivePresetId={state.setActivePresetId}
            hasCustomQuery={state.hasCustomQuery}
            setHasCustomQuery={state.setHasCustomQuery}
            aqData={state.aqData}
            aqError={state.aqError}
            onRetryAq={state.loadAirQuality}
            selectedHourIdx={state.selectedHourIdx}
            setSelectedHourIdx={state.setSelectedHourIdx}
            reduceMotion={Boolean(state.reduceMotion)}
            onToggleReduceMotion={() => state.setReduceMotion((v) => !v)}
            highContrast={state.highContrast}
            onToggleHighContrast={() => state.setHighContrast((v) => !v)}
            activePlan={state.activePlan}
            completedRanks={state.completedRanks}
            lang={state.lang}
            onChangeLang={state.setLang}
            strings={strings}
            channel={state.channel}
            queryInput={state.queryInput}
            onChangeQueryInput={state.setQueryInput}
            onSubmitQuery={state.submitPlanQuery}
            planLoading={state.planLoading}
            planError={state.planError}
            scenarios={QUICK_SCENARIOS}
            auditResult={state.auditResult}
            modelUsed={state.modelUsed}
            toolTraces={state.toolTraces}
            highlightedToolRef={state.highlightedToolRef}
            simDegradation={state.simDegradation}
            onChangeSimDegradation={state.setSimDegradation}
            maxDataAgeMin={state.maxDataAgeMin}
            onChangeMaxDataAgeMin={state.setMaxDataAgeMin}
            history={state.history}
            onLoadHistory={(rec) => {
              navigate('/today');
            }}
            onDeleteHistory={async (id) => {
              const res = await fetch(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
              if (res.ok) state.setHistory((prev) => prev.filter((i) => i.id !== id));
            }}
            saveState={state.saveState}
            saveError={state.saveError}
            onSavePlan={state.saveCurrentPlan}
            onToggleDone={(rank) => {
              state.setCompletedRanks((prev) => (prev.includes(rank) ? prev.filter((r) => r !== rank) : [...prev, rank]));
            }}
            onInspectToolRef={(ref) => {
              state.setHighlightedToolRef(ref);
              navigate('/audit');
            }}
            onResetToAutoPlan={() => state.setHasCustomQuery(false)}
            onReplyClarify={(ans) => {
              const combined = `${state.lastSubmittedQuery}\nAdditional detail: ${ans}`;
              state.setQueryInput(combined);
              state.submitPlanQuery(combined);
            }}
            guidanceEntries={state.guidanceEntries}
          />
        </main>

        <nav aria-label="Mobile Navigation" role="navigation" className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur-md md:hidden">
          {[
            ['today', strings.nav.today],
            ['forecast', strings.nav.forecast],
            ['household', strings.nav.household],
            ['learn', strings.nav.learn],
            ['audit', 'Audit'],
          ].map(([key, label]) => (
            <NavLink
              key={key}
              to={`/${key}`}
              className={`min-h-[44px] rounded-lg px-2.5 py-1 text-[11px] font-semibold ${route === key ? 'text-teal-800 bg-teal-50' : 'text-slate-600'}`}
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
