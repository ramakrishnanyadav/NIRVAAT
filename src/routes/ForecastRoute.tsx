import React from 'react';
import { ArrowRight } from 'lucide-react';
import { BreathOrb } from '../components/BreathOrb';
import { InversionTimeline } from '../components/InversionTimeline';
import { RouteErrorBoundary } from '../shared/ui/RouteErrorBoundary';
import { AirQualitySummary, RegionConfig } from '../shared/nirvaatTypes';

interface ForecastRouteProps {
  regions: RegionConfig[];
  selectedRegion: RegionConfig;
  setSelectedRegion: (r: RegionConfig) => void;
  aqData: AirQualitySummary | null;
  selectedHourIdx: number;
  setSelectedHourIdx: (idx: number) => void;
  reduceMotion: boolean;
  onPlanForHour: (prompt: string) => void;
}

export function ForecastRoute({
  regions,
  selectedRegion,
  setSelectedRegion,
  aqData,
  selectedHourIdx,
  setSelectedHourIdx,
  reduceMotion,
  onPlanForHour,
}: ForecastRouteProps) {
  const scrubbedPoint =
    aqData?.hourly_forecast && aqData.hourly_forecast[selectedHourIdx]
      ? aqData.hourly_forecast[selectedHourIdx]
      : null;
  const displayPm25 = scrubbedPoint ? scrubbedPoint.pm2_5 : aqData?.pm2_5 ?? null;

  return (
    <RouteErrorBoundary routeName="24h Forecast & Inversion">
      <div className="space-y-6">
        {regions.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-slate-500">Compare grid:</span>
            {regions.map((r) => (
              <button
                key={r.grid_id}
                type="button"
                onClick={() => setSelectedRegion(r)}
                className={`rounded-xl border px-3 py-1.5 font-medium transition-colors ${
                  selectedRegion.grid_id === r.grid_id
                    ? 'border-teal-700 bg-teal-50 text-teal-950 font-semibold'
                    : 'border-slate-200 bg-white/85 text-slate-700 hover:border-teal-600'
                }`}
              >
                {r.city}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="aurora-surface rounded-2xl p-5 flex items-center">
            <BreathOrb
              pm25={displayPm25}
              pm25Range={aqData?.pm2_5_range}
              asOf={aqData?.as_of}
              label={scrubbedPoint ? `Forecast ${scrubbedPoint.time.slice(11, 16)}` : selectedRegion.city}
              reduceMotion={reduceMotion}
              isStale={aqData?.is_stale}
            />
          </div>
          <div className="aurora-surface rounded-2xl p-5 lg:col-span-2 flex flex-col justify-between space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Coarse Grid: {selectedRegion.grid_id}</span>
              <span>Official Portal: {selectedRegion.official_source}</span>
            </div>
            <h1 id="page-heading" tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none">
              {selectedRegion.city} · {selectedRegion.neighborhood}
            </h1>
            {scrubbedPoint ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900 font-mono tabular-nums">
                    {scrubbedPoint.time.slice(11, 16)} Window · {scrubbedPoint.pm2_5 ?? '—'} µg/m³
                  </p>
                  <p className="text-slate-600">
                    {(scrubbedPoint.pm2_5 ?? 150) <= ((aqData?.cleanest_window?.avg_pm2_5 ?? 80) + 18)
                      ? 'Relatively clear dispersion window: best slot for brief cross-ventilation or essential errands.'
                      : (scrubbedPoint.pm2_5 ?? 0) >= 140
                        ? 'Winter inversion trap hour: keep exterior windows sealed, avoid indoor burning, and wear fitted N95 (ages 2+) outdoors.'
                        : 'Transitional haze hour: limit brisk outdoor exertion and shift errands toward the cleanest afternoon slot.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const hourStr = scrubbedPoint.time.slice(11, 16);
                    onPlanForHour(
                      `At ${hourStr}, forecast PM2.5 in ${selectedRegion.city} is ${scrubbedPoint.pm2_5 ?? 'elevated'} µg/m³. Should our household open windows, commute, or keep rooms sealed?`
                    );
                  }}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
                >
                  <span>Plan for {scrubbedPoint.time.slice(11, 16)}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Active advisory: {selectedRegion.active_policy || 'Standard winter monitoring'} · Scrub the timeline below to inspect hourly winter inversion dispersion.
              </p>
            )}
          </div>
        </div>

        <InversionTimeline
          points={aqData?.hourly_forecast ?? []}
          cleanestWindow={aqData?.cleanest_window ?? null}
          peakWindow={aqData?.peak_window ?? null}
          selectedHourIdx={selectedHourIdx}
          onSelectHour={setSelectedHourIdx}
          source={aqData?.source ?? selectedRegion.official_source}
          asOf={aqData?.as_of ?? new Date().toISOString()}
        />
      </div>
    </RouteErrorBoundary>
  );
}
