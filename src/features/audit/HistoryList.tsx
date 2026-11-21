import React from 'react';
import { History, Trash2 } from 'lucide-react';
import { SavedDecisionRecord } from '../../shared/nirvaatTypes';

interface HistoryListProps {
  history: SavedDecisionRecord[];
  onLoadHistory: (record: SavedDecisionRecord) => void;
  onDeleteHistory: (id: string) => void;
}

export function HistoryList({ history, onLoadHistory, onDeleteHistory }: HistoryListProps) {
  return (
    <section className="aurora-surface rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <History className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>Saved Household Decision History</span>
          </h2>
          <p className="text-xs text-slate-600">
            Sessions are anonymous and scoped to your browser session (per-session isolation).
          </p>
        </div>
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          {history.length} record{history.length === 1 ? '' : 's'}
        </span>
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-slate-600">
          No saved decisions yet. Click "Save Action Plan" on the Today workspace to snapshot a plan.
        </p>
      ) : (
        <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200 bg-white">
          {history.map((rec) => (
            <div
              key={rec.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 truncate">{rec.query}</p>
                <p className="text-slate-500 font-mono tabular-nums">
                  {rec.region_label} · {rec.channel} · {rec.plan.data_status} ·{' '}
                  {new Date(rec.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onLoadHistory(rec)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Open Plan
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteHistory(rec.id)}
                  aria-label="Delete saved plan"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
