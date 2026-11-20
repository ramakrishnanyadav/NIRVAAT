import { Clock, Table as TableIcon, BarChart3 } from 'lucide-react';
import React, { useState } from 'react';
import { AirQualityPoint } from '../shared/nirvaatTypes';

interface InversionTimelineProps {
  points: AirQualityPoint[];
  cleanestWindow: { label: string; avg_pm2_5: number | null } | null;
  peakWindow: { label: string; avg_pm2_5: number | null } | null;
  selectedHourIdx: number;
  onSelectHour: (index: number) => void;
  source: string;
  asOf: string;
}

function formatHourShort(iso: string): string {
  const parts = iso.split('T');
  return parts.length >= 2 ? parts[1].slice(0, 5) : iso;
}

export const InversionTimeline: React.FC<InversionTimelineProps> = ({
  points,
  cleanestWindow,
  peakWindow,
  selectedHourIdx,
  onSelectHour,
  source,
  asOf,
}) => {
  const [showTable, setShowTable] = useState(false);

  if (points.length === 0) {
    return (
      <div className="aurora-surface rounded-2xl p-5 text-sm text-slate-700" role="status">
        Hourly forecast points are currently unavailable. Check your local official portal for scheduled alerts.
      </div>
    );
  }

  const maxPm = Math.max(100, ...points.map((p) => p.pm2_5 ?? 0));
  const safeIdx = Math.min(Math.max(0, selectedHourIdx), points.length - 1);
  const activePoint = points[safeIdx];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSelectHour(Math.min(points.length - 1, safeIdx + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSelectHour(Math.max(0, safeIdx - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSelectHour(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSelectHour(points.length - 1);
    }
  };

  const chartSummary = `24-Hour Inversion Timeline Summary: Current inspected hour is ${formatHourShort(activePoint.time)} with PM2.5 of ${activePoint.pm2_5 ?? 'unknown'} micrograms per cubic meter. ${cleanestWindow ? `Cleanest dispersion window is ${cleanestWindow.label} averaging ${cleanestWindow.avg_pm2_5} micrograms per cubic meter.` : ''} ${peakWindow ? `Peak smog inversion window is ${peakWindow.label} averaging ${peakWindow.avg_pm2_5} micrograms per cubic meter.` : ''}`;

  return (
    <section className="aurora-surface rounded-2xl p-5 space-y-4" aria-label="24-hour winter inversion forecast">
      <div className="sr-only" aria-live="polite">
        {chartSummary}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            24-Hour Dispersion &amp; Inversion Timeline
          </h2>
          <p className="mt-0.5 text-xs text-slate-700">
            {cleanestWindow ? (
              <span>
                Cleanest window:{' '}
                <strong className="font-mono text-emerald-800 tabular-nums">
                  {cleanestWindow.label} (~{cleanestWindow.avg_pm2_5} µg/m³)
                </strong>
              </span>
            ) : (
              'Hourly outlook'
            )}
            {peakWindow ? (
              <span className="ml-3">
                · Peak inversion:{' '}
                <strong className="font-mono text-amber-900 tabular-nums">
                  {peakWindow.label} (~{peakWindow.avg_pm2_5} µg/m³)
                </strong>
              </span>
            ) : null}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
          aria-expanded={showTable}
          aria-controls="timeline-data-table"
        >
          {showTable ? <BarChart3 className="h-4 w-4" aria-hidden="true" /> : <TableIcon className="h-4 w-4" aria-hidden="true" />}
          <span>{showTable ? 'Show Interactive Timeline' : 'Accessible Data Table'}</span>
        </button>
      </div>

      {showTable ? (
        <div id="timeline-data-table" className="max-h-72 overflow-y-auto rounded-xl border border-slate-300 bg-white">
          <table className="w-full text-left text-xs" aria-label="Hourly air quality forecast data">
            <caption className="sr-only">Detailed 24-hour hourly PM2.5, PM10, and US AQI forecast</caption>
            <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th scope="col" className="px-3 py-2.5">Hour</th>
                <th scope="col" className="px-3 py-2.5 text-right">PM2.5 (µg/m³)</th>
                <th scope="col" className="px-3 py-2.5 text-right">PM10 (µg/m³)</th>
                <th scope="col" className="px-3 py-2.5 text-right">US AQI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums font-mono">
              {points.map((pt, idx) => (
                <tr
                  key={pt.time}
                  onClick={() => onSelectHour(idx)}
                  className={`cursor-pointer transition-colors ${
                    idx === safeIdx ? 'bg-teal-50 text-teal-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <td className="px-3 py-2 font-medium">{formatHourShort(pt.time)}</td>
                  <td className="px-3 py-2 text-right">{pt.pm2_5 ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{pt.pm10 ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{pt.us_aqi ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/90 px-3.5 py-2.5 border border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-800">
              <Clock className="h-4 w-4 text-teal-800" aria-hidden="true" />
              <span>Inspected hour:</span>
              <span className="font-mono font-bold text-slate-950 tabular-nums">
                {formatHourShort(activePoint.time)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <span className="text-slate-900">
                PM2.5: <strong className="text-teal-900">{activePoint.pm2_5 ?? '—'}</strong> µg/m³
              </span>
              <span className="text-slate-700">
                US AQI: <strong>{activePoint.us_aqi ?? '—'}</strong>
              </span>
            </div>
          </div>

          <div
            role="slider"
            aria-label="24-hour PM2.5 hourly timeline scrubber"
            aria-valuemin={0}
            aria-valuemax={points.length - 1}
            aria-valuenow={safeIdx}
            aria-valuetext={`${formatHourShort(activePoint.time)}: ${activePoint.pm2_5 ?? 'unknown'} µg/m³`}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="grid items-end gap-1 pt-2 focus-visible:outline-2 focus-visible:outline-teal-700 rounded-lg p-1"
            style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
          >
            {points.map((pt, idx) => {
              const val = pt.pm2_5 ?? 0;
              const heightPct = Math.max(12, Math.round((val / maxPm) * 100));
              const isSelected = idx === safeIdx;
              const isLow = val <= 45;
              const isHigh = val > 120;
              const barColor = isSelected
                ? 'bg-teal-700 ring-2 ring-teal-900'
                : isLow
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : isHigh
                    ? 'bg-amber-700 hover:bg-amber-800'
                    : 'bg-sky-600 hover:bg-sky-700';

              return (
                <div
                  key={pt.time}
                  onClick={() => onSelectHour(idx)}
                  title={`${formatHourShort(pt.time)}: ${pt.pm2_5 ?? '—'} µg/m³`}
                  className="group flex h-28 cursor-pointer flex-col items-center justify-end"
                >
                  <div
                    className={`w-full rounded-t-sm transition-transform ${barColor}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div>
            <label htmlFor="inversion-scrubber" className="sr-only">
              Scrub forecast hour (use arrow keys to adjust)
            </label>
            <input
              id="inversion-scrubber"
              type="range"
              min={0}
              max={Math.max(0, points.length - 1)}
              value={safeIdx}
              onChange={(e) => onSelectHour(Number(e.target.value))}
              aria-valuemin={0}
              aria-valuemax={points.length - 1}
              aria-valuenow={safeIdx}
              aria-valuetext={`${formatHourShort(activePoint.time)}: ${activePoint.pm2_5 ?? 'unknown'} µg/m³`}
              className="w-full accent-teal-700 cursor-pointer min-h-[32px]"
            />
            <div className="mt-1 flex justify-between text-[11px] font-mono text-slate-600 tabular-nums">
              <span>{formatHourShort(points[0].time)}</span>
              <span>{formatHourShort(points[Math.floor(points.length / 2)].time)}</span>
              <span>{formatHourShort(points[points.length - 1].time)}</span>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-600">
        Source: {source} · Updated {new Date(asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </section>
  );
};
