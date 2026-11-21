import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConfidenceLevel, DataStatusTier } from '../../shared/nirvaatTypes';
import { UiStrings } from '../../i18n/strings';

export function ConfidenceMeter({ level }: { level: ConfidenceLevel }) {
  const dots = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((idx) => (
          <span
            key={idx}
            className={`h-1.5 w-1.5 rounded-full ${
              idx <= dots ? 'bg-teal-700' : 'bg-slate-300'
            }`}
          />
        ))}
      </span>
      <span className="capitalize">{level} confidence</span>
    </span>
  );
}

interface PlanAuditBadgeProps {
  dataStatus: DataStatusTier;
  strings: UiStrings;
}

export function PlanAuditBadge({ dataStatus, strings }: PlanAuditBadgeProps) {
  if (dataStatus === 'tier_A') return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
      <div>
        <span className="font-semibold uppercase tracking-wide">{dataStatus.replace('_', ' ')}: </span>
        <span>{strings.degradation[dataStatus]}</span>
      </div>
    </div>
  );
}
