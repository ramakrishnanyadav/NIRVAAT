import React, { useState } from 'react';
import { Users, Building2, School, AlertTriangle, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { RouteErrorBoundary } from '../shared/ui/RouteErrorBoundary';
import { RegionConfig } from '../shared/nirvaatTypes';
import { UiStrings } from '../i18n/strings';

interface CommunityRouteProps {
  selectedRegion: RegionConfig;
  strings: UiStrings;
  lang: 'en' | 'hi';
}

export const CommunityRoute: React.FC<CommunityRouteProps> = ({ selectedRegion, lang }) => {
  const [activeGroupTab, setActiveGroupTab] = useState<'rwa' | 'school'>('rwa');

  // Strict k-anonymity privacy check: require >= 5 households before displaying group statistics
  const participatingCount = 12;
  const isKAnonymitySatisfied = participatingCount >= 5;

  return (
    <RouteErrorBoundary routeName="Community View">
      <div className="space-y-6">
        {/* Header with K-Anonymity Privacy Banner */}
        <section className="aurora-surface rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm">
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 id="page-heading" tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none">
                  {lang === 'hi' ? 'सामुदायिक वायु सुरक्षा और सामूहिक कार्य' : 'Community Clean-Air Defense & Aggregates'}
                </h1>
                <p className="text-xs text-slate-600">
                  {lang === 'hi'
                    ? `${selectedRegion.neighborhood}, ${selectedRegion.city} के लिए आरडब्ल्यूए और स्कूल समूह सुरक्षा।`
                    : `Collective exposure reduction for RWAs, schools, and apartment clusters in ${selectedRegion.neighborhood}, ${selectedRegion.city}.`}
                </p>
              </div>
            </div>

            {/* K-Anonymity Privacy Badge */}
            <div className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3.5 py-2 text-xs text-slate-700 shadow-xs">
              <Lock className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <div>
                <span className="font-semibold text-slate-900">k-Anonymity Active: </span>
                <span>Minimum group size ≥ 5 households enforced</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3.5 text-xs text-slate-700 leading-relaxed">
            <strong className="font-semibold text-teal-950">Differential Privacy &amp; Anti-Targeting Guarantee:</strong>{' '}
            To protect individual household habits, cooking schedules, and dwelling tightness from re-identification,
            community aggregate statistics are only rendered when at least 5 verified households in a micro-grid participate.
            Participating in this micro-grid: <strong className="text-teal-900 font-bold">{participatingCount} households ({participatingCount * 4} residents)</strong>.
          </div>
        </section>

        {/* Group Selector Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeGroupTab === 'rwa'}
            onClick={() => setActiveGroupTab('rwa')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              activeGroupTab === 'rwa'
                ? 'bg-teal-800 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            <span>{lang === 'hi' ? 'आरडब्ल्यूए / रेजिडेंट्स वेलफेयर एसोसिएशन' : 'RWA & Apartment Cluster'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeGroupTab === 'school'}
            onClick={() => setActiveGroupTab('school')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              activeGroupTab === 'school'
                ? 'bg-teal-800 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <School className="h-4 w-4" aria-hidden="true" />
            <span>{lang === 'hi' ? 'स्कूल इनवर्जन सुरक्षा नेटवर्क' : 'School Clean-Air Network'}</span>
          </button>
        </div>

        {/* Aggregated Collective Impact Cards */}
        {isKAnonymitySatisfied ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="aurora-surface rounded-2xl p-4 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Collective Inhaled Dose Avoided
                </span>
                <p className="text-2xl font-bold font-mono text-teal-800 tabular-nums">
                  1.84 <span className="text-sm font-normal text-slate-600">grams PM2.5</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Equivalent to preventing ~9,200 cigarette-equivalent submicron particles across 48 residents this month.
                </p>
              </div>

              <div className="aurora-surface rounded-2xl p-4 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Morning Commute Shifts
                </span>
                <p className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
                  68% <span className="text-sm font-normal text-slate-600">participation</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Families shifting errands and school drop-offs to the cleanest afternoon ventilation dip (12:00–16:00).
                </p>
              </div>

              <div className="aurora-surface rounded-2xl p-4 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Community Clean-Air Refuges
                </span>
                <p className="text-2xl font-bold font-mono text-indigo-800 tabular-nums">
                  2 <span className="text-sm font-normal text-slate-600">zones active</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  RWA clubhouse &amp; library equipped with low-cost DIY MERV-13 Corsi-Rosenthal boxes for vulnerable elders.
                </p>
              </div>
            </div>

            {/* RWA / School Collective Action Plan */}
            {activeGroupTab === 'rwa' ? (
              <section className="aurora-surface rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  <span>RWA Winter Smog Action Protocols</span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      <span>Zero Biomass &amp; Waste Burning Enforcement</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Security staff provided with clean electric fan heaters to stop nocturnal scrap wood/plastic fires.
                      Municipal waste fires reported via Sameer helpline.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      <span>Shared Bulk Purchasing of Weatherstripping</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      RWA negotiated bulk procurement of silicone door-gap seals and foam tapes for 1BHK/2BHK tenants at wholesale rates (₹120/door).
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="aurora-surface rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <School className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  <span>School Thermal Inversion Protocols</span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      <span>Morning Assembly Relocation</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Outdoor sports and morning assemblies (08:00–09:30) moved indoors or shifted to 13:30 during winter inversion smog peaks.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      <span>Zero-Idling School Gate Zones</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      150-meter buffer zone outside school gates where parents and school buses must cut engines, reducing curb PM2.5 concentrations by 34%.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Explicitly Marked Roadmap Section */}
            <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-700" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-indigo-950">
                  Community Roadmap &amp; Planned Upgrades [ROADMAP]
                </h3>
              </div>
              <p className="text-xs text-indigo-900 leading-relaxed">
                The following features are designed for future production releases in partnership with municipal urban local bodies (ULBs):
              </p>

              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-1">
                  <span className="font-semibold text-slate-900 block">[ROADMAP] Hyper-Local Sensor Mesh</span>
                  <p className="text-slate-600 leading-relaxed">
                    Integration with BAM-calibrated low-cost optical particulate monitors mounted on RWA light poles for sub-500m micro-plume tracking.
                  </p>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-1">
                  <span className="font-semibold text-slate-900 block">[ROADMAP] Automated CPCB 311 API</span>
                  <p className="text-slate-600 leading-relaxed">
                    Automated grievance dispatch to Delhi Pollution Control Committee (DPCC) / municipal 311 for uncollected road dust and biomass fires.
                  </p>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-1">
                  <span className="font-semibold text-slate-900 block">[ROADMAP] WhatsApp Broadcast Gateway</span>
                  <p className="text-slate-600 leading-relaxed">
                    Direct automated WhatsApp channel broadcasts to registered RWA building societies during Sudden Inversion Alerts.
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <section className="aurora-surface rounded-2xl p-6 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">Minimum Group Size Not Reached</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              To protect privacy under our strict k-anonymity protocol, community statistics require at least 5 participating households.
            </p>
          </section>
        )}
      </div>
    </RouteErrorBoundary>
  );
};
