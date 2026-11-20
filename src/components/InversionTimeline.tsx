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
      <div className="aurora-surface rounded-2xl p-5 text-sm text-slate-600">
        Hourly forecast points are currently unavailable. Check your local official portal for scheduled alerts.
      </div>
    );
  }

  const maxPm = Math.max(100, ...points.map((p) => p.pm2_5 ?? 0));
  const safeIdx = Math.min(Math.max(0, selectedHourIdx), points.length - 1);
  const activePoint = points[safeIdx];

  return (
    <section className="aurora-surface rounded-2xl p-5" aria-label="24-hour winter inversion forecast">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            24-Hour Dispersion &amp; Inversion Timeline
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
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
                <strong className="font-mono text-amber-800 tabular-nums">
                  {peakWindow.label} (~{peakWindow.avg_pm2_5} µg/m³)
                </strong>
              </span>
            ) : null}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0"
        >
          {showTable ? <BarChart3 className="h-3.5 w-3.5" /> : <TableIcon className="h-3.5 w-3.5" />}
          <span>{showTable ? 'Show Timeline' : 'Accessible Table'}</span>
        </button>
      </div>

      {showTable ? (
        <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Hour</th>
                <th className="px-3 py-2 font-medium text-right">PM2.5 (µg/m³)</th>
                <th className="px-3 py-2 font-medium text-right">PM10 (µg/m³)</th>
                <th className="px-3 py-2 font-medium text-right">US AQI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums font-mono">
              {points.map((pt, idx) => (
                <tr
                  key={pt.time}
                  onClick={() => onSelectHour(idx)}
                  className={`cursor-pointer transition-colors ${
                    idx === safeIdx ? 'bg-teal-50 text-teal-950 font-semibold' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-3 py-2">{formatHourShort(pt.time)}</td>
                  <td className="px-3 py-2 text-right">{pt.pm2_5 ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{pt.pm10 ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{pt.us_aqi ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/80 px-3.5 py-2.5 border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Clock className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
              <span>Inspected hour:</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatHourShort(activePoint.time)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <span className="text-slate-900">
                PM2.5: <strong>{activePoint.pm2_5 ?? '—'}</strong> µg/m³
              </span>
              <span className="text-slate-600">
                US AQI: <strong>{activePoint.us_aqi ?? '—'}</strong>
              </span>
            </div>
          </div>

          <div
            className="grid items-end gap-1 pt-2"
            style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
          >
            {points.map((pt, idx) => {
              const val = pt.pm2_5 ?? 0;
              const heightPct = Math.max(10, Math.round((val / maxPm) * 100));
              const isSelected = idx === safeIdx;
              const isLow = val <= 45;
              const isHigh = val > 120;
              const barColor = isSelected
                ? 'bg-teal-700'
                : isLow
                  ? 'bg-emerald-500/75 hover:bg-emerald-600'
                  : isHigh
                    ? 'bg-amber-600/80 hover:bg-amber-700'
                    : 'bg-sky-500/70 hover:bg-sky-600';

              return (
                <button
                  key={pt.time}
                  type="button"
                  onClick={() => onSelectHour(idx)}
                  title={`${formatHourShort(pt.time)}: ${pt.pm2_5 ?? '—'} µg/m³`}
                  aria-label={`Hour ${formatHourShort(pt.time)}, PM2.5 ${pt.pm2_5 ?? 'unknown'} micrograms per cubic meter`}
                  className="group flex h-28 flex-col items-center justify-end focus-visible:outline-2 focus-visible:outline-indigo-600 rounded-sm"
                >
                  <div
                    className={`w-full rounded-t-sm transition-transform ${barColor}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </button>
              );
            })}
          </div>

          <div>
            <label htmlFor="inversion-scrubber" className="sr-only">
              Scrub forecast hour
            </label>
            <input
              id="inversion-scrubber"
              type="range"
              min={0}
              max={Math.max(0, points.length - 1)}
              value={safeIdx}
              onChange={(e) => onSelectHour(Number(e.target.value))}
              className="w-full accent-teal-700 cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-[11px] font-mono text-slate-500 tabular-nums">
              <span>{formatHourShort(points[0].time)}</span>
              <span>{formatHourShort(points[Math.floor(points.length / 2)].time)}</span>
              <span>{formatHourShort(points[points.length - 1].time)}</span>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-500">
        Source: {source} · Updated {new Date(asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </section>
  );
};
