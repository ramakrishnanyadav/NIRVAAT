import React, { useState, useEffect, useMemo } from 'react';
import { HouseholdProfile } from '@/shared/nirvaatTypes';
import { VulnerabilitySelector } from './VulnerabilitySelector';
import { DwellingForm } from './DwellingForm';
import { TwinSimulatorCurve, TwinSimResult } from './TwinSimulatorCurve';

export interface HouseholdTwinProps {
  profile: HouseholdProfile;
  outdoorPm25?: number;
  hourlyOutdoorPm25?: number[];
  onChangeProfile: (profile: HouseholdProfile) => void;
  onApplyAndRefreshPlan?: () => void;
}

export const HouseholdTwin: React.FC<HouseholdTwinProps> = ({
  profile,
  outdoorPm25,
  hourlyOutdoorPm25,
  onChangeProfile,
  onApplyAndRefreshPlan,
}) => {
  const [sealGapsSim, setSealGapsSim] = useState(false);
  const [cleanCookingSim, setCleanCookingSim] = useState(false);
  const [purifierSim, setPurifierSim] = useState<'none' | 'diy_cr_box' | 'hepa'>(
    profile.home.purifier.has ? (profile.home.purifier.type ?? 'none') : 'none'
  );

  const [simResult, setSimResult] = useState<TwinSimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const effectiveHourlyOutdoor = useMemo(() => {
    if (hourlyOutdoorPm25 && hourlyOutdoorPm25.length >= 12) {
      return hourlyOutdoorPm25.slice(0, 24);
    }
    const base = outdoorPm25 ?? 150;
    return Array.from({ length: 24 }, (_, h) => {
      if (h >= 12 && h <= 16) return Math.round(base * 0.55);
      if (h >= 22 || h <= 6) return Math.round(base * 1.35);
      return Math.round(base);
    });
  }, [hourlyOutdoorPm25, outdoorPm25]);

  useEffect(() => {
    let cancelled = false;
    setSimLoading(true);

    fetch('/api/engines/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        outdoor_pm25: outdoorPm25 ?? 150,
        hourly_outdoor_pm25: effectiveHourlyOutdoor,
        counterfactual: {
          seal_gaps: sealGapsSim,
          clean_cooking: cleanCookingSim,
          purifier_mode: purifierSim,
        },
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Simulation failed');
        return res.json();
      })
      .then((data: TwinSimResult) => {
        if (!cancelled) {
          setSimResult(data);
          setSimLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setSimLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile, outdoorPm25, effectiveHourlyOutdoor, sealGapsSim, cleanCookingSim, purifierSim]);

  const handleApplySimulation = () => {
    const updated: HouseholdProfile = {
      ...profile,
      home: {
        ...profile.home,
        windows_habit: sealGapsSim ? 'mostly_closed' : profile.home.windows_habit,
        cooking_fuel: cleanCookingSim ? 'induction_electric' : profile.home.cooking_fuel,
        purifier:
          purifierSim === 'none'
            ? { has: false, type: 'none', cadr_m3_hr: 0 }
            : {
                has: true,
                type: purifierSim,
                cadr_m3_hr: purifierSim === 'hepa' ? 300 : 220,
              },
      },
    };
    onChangeProfile(updated);
    if (onApplyAndRefreshPlan) onApplyAndRefreshPlan();
  };

  return (
    <div className="space-y-6">
      {/* Household Vulnerability Profile */}
      <VulnerabilitySelector profile={profile} onChangeProfile={onChangeProfile} />

      {/* Home & Dwelling Physical Characteristics */}
      <DwellingForm
        profile={profile}
        onChangeProfile={onChangeProfile}
        onFilterModeChange={setPurifierSim}
      />

      {/* Counterfactual Twin Simulator Curve */}
      <TwinSimulatorCurve
        simSealGaps={sealGapsSim}
        setSimSealGaps={setSealGapsSim}
        simFilterMode={purifierSim}
        setSimFilterMode={setPurifierSim}
        simCleanCooking={cleanCookingSim}
        setSimCleanCooking={setCleanCookingSim}
        simData={simResult}
        simLoading={simLoading}
        effectiveHourly={effectiveHourlyOutdoor}
        onApply={handleApplySimulation}
      />
    </div>
  );
};
