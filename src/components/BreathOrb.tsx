import { AlertTriangle, CheckCircle2, CloudFog, Wind } from 'lucide-react';
import React from 'react';

interface BreathOrbProps {
  pm25: number | null;
  pm25Range?: string;
  asOf?: string;
  label?: string;
  reduceMotion?: boolean;
  isStale?: boolean;
}

function classifyPm25(pm25: number | null) {
  if (pm25 === null) {
    return {
      band: 'No live reading',
      textColor: 'text-slate-700',
      ringStroke: '#94A3B8',
      coreGradient: 'from-slate-200/70 via-white/80 to-slate-100/60',
      hazeOpacity: 0.18,
      particleCount: 4,
      Icon: CloudFog,
    };
  }
  if (pm25 <= 35) {
    return {
      band: 'Clearer window',
      textColor: 'text-emerald-800',
      ringStroke: '#15803D',
      coreGradient: 'from-teal-200/75 via-emerald-100/80 to-sky-100/75',
      hazeOpacity: 0.12,
      particleCount: 4,
      Icon: CheckCircle2,
    };
  }
  if (pm25 <= 75) {
    return {
      band: 'Moderate haze',
      textColor: 'text-amber-800',
      ringStroke: '#B45309',
      coreGradient: 'from-sky-200/70 via-amber-100/65 to-teal-100/70',
      hazeOpacity: 0.28,
      particleCount: 9,
      Icon: Wind,
    };
  }
  if (pm25 <= 150) {
    return {
      band: 'High winter smog',
      textColor: 'text-amber-900',
      ringStroke: '#B45309',
      coreGradient: 'from-amber-200/75 via-orange-100/65 to-slate-200/75',
      hazeOpacity: 0.45,
      particleCount: 14,
      Icon: CloudFog,
    };
  }
  return {
    band: 'Severe smog',
    textColor: 'text-red-900',
    ringStroke: '#B91C1C',
    coreGradient: 'from-rose-200/75 via-amber-200/65 to-slate-300/75',
    hazeOpacity: 0.62,
    particleCount: 20,
    Icon: AlertTriangle,
  };
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
        <svg viewBox="0 0 120 120" className="relative h-28 w-28">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={state.ringStroke}
            strokeOpacity="0.22"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle
            cx="60"
            cy="60"
            r="42"
            fill="none"
            stroke={state.ringStroke}
            strokeOpacity={0.35 + state.hazeOpacity * 0.4}
            strokeWidth="2.5"
          />
          {Array.from({ length: state.particleCount }).map((_, idx) => {
            const angle = (idx / state.particleCount) * Math.PI * 2;
            const radius = 16 + ((idx * 11) % 24);
            const cx = 60 + Math.cos(angle) * radius;
            const cy = 60 + Math.sin(angle) * radius;
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={idx % 3 === 0 ? 1.9 : 1.3}
                fill="#334155"
                fillOpacity={0.22 + state.hazeOpacity * 0.35}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {pm25 !== null ? pm25 : '—'}
          </span>
          <span className="text-[11px] font-medium text-slate-600">µg/m³</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${state.textColor}`}>
          <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{isStale ? 'Stale reading · verify locally' : state.band}</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          {label ? `${label} · ` : ''}
          {pm25Range ? (
            <span className="font-mono tabular-nums">{pm25Range}</span>
          ) : (
            <span>No live grid reading available</span>
          )}
        </p>
        {asOf && (
          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
            Updated {new Date(asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
};
