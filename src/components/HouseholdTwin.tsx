import { ArrowRight, Home, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { AgeBand, HouseholdMember, HouseholdProfile } from '../shared/nirvaatTypes';

interface HouseholdTwinProps {
  profile: HouseholdProfile;
  outdoorPm25: number | null;
  hourlyOutdoorPm25: number[];
  onChangeProfile: (next: HouseholdProfile) => void;
  onApplyAndRefreshPlan: () => void;
}

const AGE_BAND_PRIORITY: Record<AgeBand, number> = {
  infant_under_2: 1,
  child_2_12: 2,
  older_adult_65_plus: 3,
  teen: 4,
  adult: 5,
};

const AGE_LABELS: Record<AgeBand, string> = {
  infant_under_2: 'Infant / Toddler (< 2 yrs · no mask allowed)',
  child_2_12: 'Child (2–12 yrs)',
  teen: 'Teen (13–17 yrs)',
  adult: 'Adult (18–64 yrs)',
  older_adult_65_plus: 'Older Adult (65+ yrs)',
};

interface TwinSimResult {
  baseline_hourly: number[];
  simulated_hourly: number[];
  baseline_mean_pm25: number;
  simulated_mean_pm25: number;
  baseline_dose_ug: number;
  simulated_dose_ug: number;
  reduction_pct: number;
}

export const HouseholdTwin: React.FC<HouseholdTwinProps> = ({
  profile,
  outdoorPm25,
  hourlyOutdoorPm25,
  onChangeProfile,
  onApplyAndRefreshPlan,
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newAgeBand, setNewAgeBand] = useState<AgeBand>('child_2_12');
  const [newCondition, setNewCondition] = useState('');

  const [simSealGaps, setSimSealGaps] = useState(
    profile.home.windows_habit === 'mostly_closed'
  );
  const [simFilterMode, setSimFilterMode] = useState<'none' | 'diy_cr_box' | 'hepa'>(
    profile.home.purifier.type ?? (profile.home.purifier.has ? 'hepa' : 'none')
  );
  const [simCleanCooking, setSimCleanCooking] = useState(
    profile.home.cooking_fuel === 'induction_electric'
  );
  const [simData, setSimData] = useState<TwinSimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Sync interactive twin simulator toggles when a household preset updates the profile
  useEffect(() => {
    setSimSealGaps(profile.home.windows_habit === 'mostly_closed');
    setSimFilterMode(profile.home.purifier.type ?? (profile.home.purifier.has ? 'hepa' : 'none'));
    setSimCleanCooking(profile.home.cooking_fuel === 'induction_electric');
  }, [
    profile.home.windows_habit,
    profile.home.purifier.has,
    profile.home.purifier.type,
    profile.home.cooking_fuel,
  ]);

  const sortedMembers = [...profile.members].sort((a, b) => {
    const pA =
      a.conditions.some((c) => /pregnan/i.test(c))
        ? 1.5
        : a.conditions.some((c) => /asthma|copd|heart/i.test(c))
          ? 2.5
          : AGE_BAND_PRIORITY[a.age_band];
    const pB =
      b.conditions.some((c) => /pregnan/i.test(c))
        ? 1.5
        : b.conditions.some((c) => /asthma|copd|heart/i.test(c))
          ? 2.5
          : AGE_BAND_PRIORITY[b.age_band];
    return pA - pB;
  });

  const priorityAgeBand = sortedMembers[0]?.age_band ?? 'adult';
  const hourlyKey =
    hourlyOutdoorPm25.length >= 12
      ? hourlyOutdoorPm25.slice(0, 24).join(',')
      : `flat:${outdoorPm25 ?? 160}`;

  const effectiveHourly = useMemo(() => {
    if (hourlyOutdoorPm25.length >= 12) return hourlyOutdoorPm25.slice(0, 24);
    return Array<number>(24).fill(outdoorPm25 ?? 160);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hourlyKey]);

  // Live backend physics mass-balance simulation via @nirvaat/engines
  useEffect(() => {
    let cancelled = false;
    setSimLoading(true);

    fetch('/api/engines/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outdoor_pm25_hourly: effectiveHourly,
        size_band: profile.home.size_band,
        age_band: priorityAgeBand,
        seal_gaps: simSealGaps,
        clean_cooking: simCleanCooking,
        filter_mode: simFilterMode,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok) {
          setSimData(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSimLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    hourlyKey,
    effectiveHourly,
    profile.home.size_band,
    priorityAgeBand,
    simSealGaps,
    simCleanCooking,
    simFilterMode,
  ]);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label || profile.members.length >= 8) return;
    const member: HouseholdMember = {
      label,
      age_band: newAgeBand,
      conditions: newCondition.trim() ? [newCondition.trim()] : [],
    };
    onChangeProfile({
      ...profile,
      members: [...profile.members, member],
    });
    setNewLabel('');
    setNewCondition('');
  };

  const handleRemoveMember = (idx: number) => {
    if (profile.members.length <= 1) return;
    onChangeProfile({
      ...profile,
      members: profile.members.filter((_, i) => i !== idx),
    });
  };

  const applySimToProfileAndPlan = () => {
    onChangeProfile({
      ...profile,
      home: {
        ...profile.home,
        windows_habit: simSealGaps ? 'mostly_closed' : 'loose_frames_drafty',
        purifier: {
          has: simFilterMode !== 'none',
          type: simFilterMode,
          cadr: simFilterMode === 'hepa' ? 320 : simFilterMode === 'diy_cr_box' ? 280 : 0,
        },
      },
    });
    onApplyAndRefreshPlan();
  };

  // Build SVG polyline points for 24h indoor twin curve
  const buildPolyline = (vals: number[], maxY: number) => {
    if (vals.length === 0) return '';
    return vals
      .map((v, i) => {
        const x = (i / Math.max(1, vals.length - 1)) * 560;
        const y = 110 - (Math.min(maxY, v) / Math.max(1, maxY)) * 96;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const maxCurve = Math.max(
    120,
    ...effectiveHourly,
    ...(simData?.baseline_hourly ?? [0]),
    ...(simData?.simulated_hourly ?? [0])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1
          id="page-heading"
          tabIndex={-1}
          className="text-2xl font-bold tracking-tight text-slate-900 outline-none"
        >
          Household Digital Twin & Exposure Simulator
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Model infiltration, air purification, and clinical exposure priority for every family member.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Family & Priority Protection Order */}
        <section className="aurora-surface rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Users className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>Household Members (Labels Only)</span>
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Privacy-first (H6): Generic labels only, automatically ordered by clinical priority (`infant_under_2 &gt; pregnancy &gt; asthma/COPD &gt; older adult &gt; adult`).
            </p>
          </div>

          <ul className="divide-y divide-slate-200/80 rounded-xl border border-slate-200 bg-white/80">
            {sortedMembers.map((member, idx) => {
              const origIdx = profile.members.indexOf(member);
              return (
                <li
                  key={`${member.label}-${idx}`}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-teal-800 tabular-nums">
                        P{idx + 1}
                      </span>
                      <span className="font-medium text-slate-900">{member.label}</span>
                      {member.age_band === 'infant_under_2' && (
                        <span className="text-[11px] font-medium text-amber-800">
                          · No masks under 2
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      {AGE_LABELS[member.age_band]}
                      {member.conditions.length > 0 ? ` · ${member.conditions.join(', ')}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(origIdx)}
                    disabled={profile.members.length <= 1}
                    aria-label={`Remove ${member.label}`}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-700 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>

          <form onSubmit={handleAddMember} className="space-y-2.5 border-t border-slate-200/70 pt-3">
            <p className="text-xs font-semibold text-slate-800">Add household member</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (e.g. Pregnant parent)"
                maxLength={40}
                className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
              <select
                value={newAgeBand}
                onChange={(e) => setNewAgeBand(e.target.value as AgeBand)}
                className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              >
                {Object.entries(AGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="Condition (e.g. asthma)"
                maxLength={40}
                className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Member</span>
            </button>
          </form>
        </section>

        {/* Home & Constraints Twin */}
        <section className="aurora-surface rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Home className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>Home Setup &amp; Constraints</span>
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Changes immediately update the live deterministic plan on the Today tab.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <label className="space-y-1">
              <span className="font-medium text-slate-700">Dwelling type</span>
              <select
                value={profile.home.type}
                onChange={(e) =>
                  onChangeProfile({
                    ...profile,
                    home: { ...profile.home, type: e.target.value as HouseholdProfile['home']['type'] },
                  })
                }
                className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
              >
                <option value="apartment">Apartment / Flat</option>
                <option value="independent_house">Independent House</option>
                <option value="single_room">Single-Room Dwelling</option>
                <option value="shared_flat">Shared Flat</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-medium text-slate-700">Size band</span>
              <select
                value={profile.home.size_band}
                onChange={(e) =>
                  onChangeProfile({
                    ...profile,
                    home: {
                      ...profile.home,
                      size_band: e.target.value as HouseholdProfile['home']['size_band'],
                    },
                  })
                }
                className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
              >
                <option value="small_under_40m2">Small (&lt; 40 m²)</option>
                <option value="medium_40_85m2">Medium (40–85 m²)</option>
                <option value="large_over_85m2">Large (&gt; 85 m²)</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-medium text-slate-700">Cooking fuel</span>
              <select
                value={profile.home.cooking_fuel}
                onChange={(e) =>
                  onChangeProfile({
                    ...profile,
                    home: {
                      ...profile.home,
                      cooking_fuel: e.target.value as HouseholdProfile['home']['cooking_fuel'],
                    },
                  })
                }
                className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
              >
                <option value="lpg_gas">LPG Cylinder</option>
                <option value="piped_gas">Piped Gas</option>
                <option value="induction_electric">Induction / Electric</option>
                <option value="biomass_solid">Solid Fuel / Biomass</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-medium text-slate-700">Budget band</span>
              <select
                value={profile.constraints.budget_band}
                onChange={(e) =>
                  onChangeProfile({
                    ...profile,
                    constraints: {
                      ...profile.constraints,
                      budget_band: e.target.value as HouseholdProfile['constraints']['budget_band'],
                    },
                  })
                }
                className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
              >
                <option value="free_only">Free actions only</option>
                <option value="low_cost">Low-cost (DIY / tape / masks)</option>
                <option value="moderate">Moderate (Purifier feasible)</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-medium text-slate-700">Air cleaner at home</span>
              <select
                value={profile.home.purifier.type ?? (profile.home.purifier.has ? 'hepa' : 'none')}
                onChange={(e) => {
                  const val = e.target.value as 'none' | 'hepa' | 'diy_cr_box';
                  setSimFilterMode(val);
                  onChangeProfile({
                    ...profile,
                    home: {
                      ...profile.home,
                      purifier: {
                        has: val !== 'none',
                        type: val,
                        cadr: val === 'hepa' ? 320 : val === 'diy_cr_box' ? 280 : 0,
                      },
                    },
                  });
                }}
                className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
              >
                <option value="none">None</option>
                <option value="diy_cr_box">DIY Box Fan + MERV-13</option>
                <option value="hepa">Commercial HEPA Purifier</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-medium text-slate-700">Commute mode</span>
              <select
                value={profile.commute.mode}
                onChange={(e) =>
                  onChangeProfile({
                    ...profile,
                    commute: {
                      ...profile.commute,
                      mode: e.target.value as HouseholdProfile['commute']['mode'],
                    },
                  })
                }
                className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900"
              >
                <option value="walking">Walking</option>
                <option value="two_wheeler">Two-wheeler / Scooter</option>
                <option value="public_transit">Bus / Metro</option>
                <option value="car">Closed Car</option>
                <option value="work_from_home">Mostly at Home</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-700">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.constraints.renter}
                onChange={(e) =>
                  onChangeProfile({
                    ...profile,
                    constraints: { ...profile.constraints, renter: e.target.checked },
                  })
                }
                className="h-4 w-4 accent-teal-700"
              />
              <span>Rented home (no permanent fixtures)</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.constraints.outdoor_work}
                onChange={(e) =>
                  onChangeProfile({
                    ...profile,
                    constraints: { ...profile.constraints, outdoor_work: e.target.checked },
                  })
                }
                className="h-4 w-4 accent-teal-700"
              />
              <span>Household includes outdoor worker</span>
            </label>
          </div>
        </section>
      </div>

      {/* Live Physics Mass-Balance Indoor Twin Simulator */}
      <section className="aurora-surface rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>Live Mass-Balance Bedroom Twin (24h Physics Simulation)</span>
            </h3>
            <p className="text-xs text-slate-600">
              Powered by `@nirvaat/engines` analytical ODE solver (`dC_in/dt = P·λ·C_out + S/V − (λ+k+CADR/V)·C_in`) for {sortedMembers[0]?.label}.
            </p>
          </div>
          <div className="text-right font-mono tabular-nums">
            <p className="text-xs text-slate-500">
              24h Indoor Mean {simLoading ? '· updating…' : ''}
            </p>
            <p className="text-lg font-semibold text-teal-800">
              {simData
                ? `${simData.baseline_mean_pm25} → ${simData.simulated_mean_pm25} µg/m³ (-${simData.reduction_pct}% dose)`
                : 'Calculating…'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          <button
            type="button"
            onClick={() => setSimSealGaps((v) => !v)}
            className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
              simSealGaps
                ? 'border-teal-700 bg-teal-50 text-teal-950 font-semibold'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <div>1. Seal door &amp; window gaps</div>
            <div className="mt-0.5 text-[11px] font-normal text-slate-600">
              Free (towels/tape) · λ 1.35 → 0.55 /h
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSimCleanCooking((v) => !v)}
            className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
              simCleanCooking
                ? 'border-teal-700 bg-teal-50 text-teal-950 font-semibold'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <div>2. Close kitchen door + exhaust</div>
            <div className="mt-0.5 text-[11px] font-normal text-slate-600">
              Free · cuts cooking spikes ~75%
            </div>
          </button>

          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="font-medium text-slate-700 mb-1.5">3. Room air cleaner</div>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ['none', 'None'],
                  ['diy_cr_box', 'DIY Fan'],
                  ['hepa', 'HEPA'],
                ] as const
              ).map(([mode, lbl]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSimFilterMode(mode)}
                  className={`rounded-lg py-1 text-[11px] font-semibold transition-colors ${
                    simFilterMode === mode
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time 24h Indoor vs Outdoor Curve */}
        {simData && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="inline-block h-0.5 w-4 bg-slate-400" /> Outdoor PM2.5
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-800">
                  <span className="inline-block h-0.5 w-4 bg-amber-600" /> Baseline indoor
                </span>
                <span className="inline-flex items-center gap-1.5 text-teal-800 font-semibold">
                  <span className="inline-block h-0.5 w-4 bg-teal-700" /> Protected bedroom
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                Daily dose: {simData.baseline_dose_ug} → {simData.simulated_dose_ug} µg
              </span>
            </div>

            <svg viewBox="0 0 560 120" className="w-full h-32" role="img" aria-label="24-hour outdoor versus simulated indoor PM2.5 curves">
              <line x1="0" y1="110" x2="560" y2="110" stroke="#E2E8F0" strokeWidth="1" />
              <polyline
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                points={buildPolyline(effectiveHourly.slice(0, 24), maxCurve)}
              />
              <polyline
                fill="none"
                stroke="#D97706"
                strokeWidth="2"
                points={buildPolyline(simData.baseline_hourly, maxCurve)}
              />
              <polyline
                fill="none"
                stroke="#0E7C86"
                strokeWidth="2.5"
                points={buildPolyline(simData.simulated_hourly, maxCurve)}
              />
            </svg>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={applySimToProfileAndPlan}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <span>Apply Setup &amp; Open Today&apos;s Plan</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
