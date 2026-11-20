import { AlertTriangle, CheckCircle2, CloudFog, Wind, HelpCircle } from 'lucide-react';
import React from 'react';

interface BreathOrbProps {
  pm25: number | null;
  pm25Range?: string;
  asOf?: string;
  label?: string;
  reduceMotion?: boolean;
  isStale?: boolean;
}

interface PmCategoryState {
  band: string;
  patternLabel: string;
  dashArray: string;
  textColor: string;
  ringStroke: string;
  coreGradient: string;
  hazeOpacity: number;
  particleCount: number;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

function classifyPm25(pm25: number | null): PmCategoryState {
  if (pm25 === null) {
    return {
      band: 'No live reading',
      patternLabel: 'Dotted perimeter',
      dashArray: '3 3',
      textColor: 'text-slate-700',
      ringStroke: '#64748B',
      coreGradient: 'from-slate-200/70 via-white/80 to-slate-100/60',
      hazeOpacity: 0.18,
      particleCount: 0,
      Icon: HelpCircle,
    };
  }
  if (pm25 <= 35) {
    return {
      band: 'Clearer window (0–35 µg/m³)',
      patternLabel: 'Solid perimeter (Safe)',
      dashArray: 'none',
      textColor: 'text-emerald-800',
      ringStroke: '#15803D',
      coreGradient: 'from-teal-200/75 via-emerald-100/80 to-sky-100/75',
      hazeOpacity: 0.12,
      particleCount: reduceMotionAware(2),
      Icon: CheckCircle2,
    };
  }
  if (pm25 <= 75) {
    return {
      band: 'Moderate haze (36–75 µg/m³)',
      patternLabel: 'Short-dashed perimeter',
      dashArray: '4 4',
      textColor: 'text-amber-800',
      ringStroke: '#B45309',
      coreGradient: 'from-sky-200/70 via-amber-100/65 to-teal-100/70',
      hazeOpacity: 0.28,
      particleCount: reduceMotionAware(6),
      Icon: Wind,
    };
  }
  if (pm25 <= 150) {
    return {
      band: 'High winter smog (76–150 µg/m³)',
      patternLabel: 'Long-dashed perimeter (Caution)',
      dashArray: '8 4',
      textColor: 'text-amber-900',
      ringStroke: '#B45309',
      coreGradient: 'from-amber-200/75 via-orange-100/65 to-slate-200/75',
      hazeOpacity: 0.45,
      particleCount: reduceMotionAware(10),
      Icon: CloudFog,
    };
  }
  return {
    band: 'Severe smog (>150 µg/m³)',
    patternLabel: 'Alternating Dash-Dot perimeter (Hazard)',
    dashArray: '12 4 3 4',
    textColor: 'text-red-900',
    ringStroke: '#B91C1C',
    coreGradient: 'from-rose-200/75 via-amber-200/65 to-slate-300/75',
    hazeOpacity: 0.62,
    particleCount: reduceMotionAware(16),
    Icon: AlertTriangle,
  };
}

function reduceMotionAware(count: number): number {
  return count;
}

export const BreathOrb: React.FC<BreathOrbProps> = ({
  pm25,
  pm25Range,
  asOf,
  label,
  reduceMotion = false,
  isStale = false,
}) => {
  const state = classifyPm25(pm25);
  const StatusIcon = state.Icon;

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${state.coreGradient} border border-white/80 shadow-inner ${
            reduceMotion ? '' : 'animate-orb-breathe'
          }`}
        />
        <svg viewBox="0 0 120 120" className="relative h-28 w-28" aria-hidden="true">
          {/* Distinct pattern ring ensuring non-color category identification */}
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={state.ringStroke}
            strokeOpacity="0.8"
            strokeWidth="2.5"
            strokeDasharray={state.dashArray}
          />
          <circle
            cx="60"
            cy="60"
            r="42"
            fill="none"
            stroke={state.ringStroke}
            strokeOpacity={0.35 + state.hazeOpacity * 0.4}
            strokeWidth="1.5"
          />
          {!reduceMotion &&
            Array.from({ length: state.particleCount }).map((_, idx) => {
              const angle = (idx / Math.max(1, state.particleCount)) * Math.PI * 2;
              const radius = 16 + ((idx * 11) % 24);
              const cx = 60 + Math.cos(angle) * radius;
              const cy = 60 + Math.sin(angle) * radius;
              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={idx % 3 === 0 ? 1.8 : 1.2}
                  fill="#334155"
                  fillOpacity={0.22 + state.hazeOpacity * 0.35}
                />
              );
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-xl font-bold tracking-tight text-slate-900 tabular-nums">
            {pm25 !== null ? pm25 : '—'}
          </span>
          <span className="text-[11px] font-semibold text-slate-700">µg/m³</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className={`flex items-center gap-1.5 text-sm font-bold ${state.textColor}`}>
          <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{isStale ? 'Stale reading · verify locally' : state.band}</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-700">
          <span className="sr-only">Category indicator: {state.patternLabel}. </span>
          {label ? `${label} · ` : ''}
          {pm25Range ? (
            <span className="font-mono tabular-nums">{pm25Range}</span>
          ) : (
            <span>No live grid reading available</span>
          )}
        </p>
        {asOf && (
          <p className="text-[11px] text-slate-600 font-mono tabular-nums">
            Updated {new Date(asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
};
