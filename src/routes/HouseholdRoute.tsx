import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HouseholdTwin } from '../features/household/HouseholdTwin';
import { RouteErrorBoundary } from '../shared/ui/RouteErrorBoundary';
import { AirQualitySummary, HouseholdProfile } from '../shared/nirvaatTypes';

interface HouseholdRouteProps {
  profile: HouseholdProfile;
  aqData: AirQualitySummary | null;
  setProfile: React.Dispatch<React.SetStateAction<HouseholdProfile>>;
  setActivePresetId: (id: string) => void;
  setHasCustomQuery: (val: boolean) => void;
}

export function HouseholdRoute({
  profile,
  aqData,
  setProfile,
  setActivePresetId,
  setHasCustomQuery,
}: HouseholdRouteProps) {
  const navigate = useNavigate();

  return (
    <RouteErrorBoundary routeName="Household Twin">
      <HouseholdTwin
        profile={profile}
        outdoorPm25={aqData?.pm2_5 ?? undefined}
        hourlyOutdoorPm25={aqData?.hourly_forecast.map((p) => p.pm2_5 ?? 140) ?? []}
        onChangeProfile={(next) => {
          setActivePresetId('custom');
          setHasCustomQuery(false);
          setProfile(next);
        }}
        onApplyAndRefreshPlan={() => {
          setHasCustomQuery(false);
          navigate('/today');
        }}
      />
    </RouteErrorBoundary>
  );
}
