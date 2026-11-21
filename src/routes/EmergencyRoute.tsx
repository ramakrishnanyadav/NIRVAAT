import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EmergencyView } from '../components/EmergencyView';
import { RouteErrorBoundary } from '../shared/ui/RouteErrorBoundary';
import { UiLang, UiStrings } from '../i18n/strings';

interface EmergencyRouteProps {
  emergencyNumber: string;
  lang: UiLang;
  strings: UiStrings;
}

export function EmergencyRoute({ emergencyNumber, lang, strings }: EmergencyRouteProps) {
  const navigate = useNavigate();

  return (
    <RouteErrorBoundary routeName="Emergency">
      <EmergencyView
        emergencyNumber={emergencyNumber}
        lang={lang}
        strings={strings}
        onBack={() => navigate('/today')}
      />
    </RouteErrorBoundary>
  );
}
