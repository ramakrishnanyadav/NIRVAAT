import React from 'react';
import { LearnView } from '../components/LearnView';
import { RouteErrorBoundary } from '../shared/ui/RouteErrorBoundary';
import { GuidanceEntry } from '../shared/nirvaatTypes';

interface LearnRouteProps {
  entries: GuidanceEntry[];
}

export function LearnRoute({ entries }: LearnRouteProps) {
  return (
    <RouteErrorBoundary routeName="Science Library">
      <LearnView entries={entries} />
    </RouteErrorBoundary>
  );
}
