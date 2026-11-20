import { Search, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface CommandItem {
  id: string;
  label: string;
  section: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, items }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = items.filter((item) =>
    `${item.label} ${item.section}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/35 px-4 pt-20 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to view, run a quick decision, or switch language…"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-slate-500">
              No matching commands.
            </li>
          ) : (
            filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-teal-50/70"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-slate-500">{item.section}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
