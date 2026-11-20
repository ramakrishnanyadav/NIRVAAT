import { Search, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Store trigger element when opening for focus restoration
  useEffect(() => {
    if (open) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      setQuery('');
      // Auto-focus input after render
      setTimeout(() => inputRef.current?.focus(), 10);
    } else if (previousActiveElementRef.current) {
      // Restore focus on close
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [open]);

  // Keyboard navigation & Focus Trap inside dialog
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Trap Tab key navigation
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled'));

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-20 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Search className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <label htmlFor="command-search-input" className="sr-only">
            Search commands, views, and decisions
          </label>
          <input
            id="command-search-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to view, run a quick decision, or switch language…"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none min-h-[40px]"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette (Escape)"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-1 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto py-1" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-slate-600" role="option" aria-selected="false">
              No matching commands.
            </li>
          ) : (
            filtered.map((item) => (
              <li key={item.id} role="option" aria-selected="false">
                <button
                  type="button"
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className="flex min-h-[44px] w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-900 hover:bg-teal-50/70 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-teal-700"
                >
                  <span className="font-semibold text-slate-900">{item.label}</span>
                  <span className="text-xs text-slate-600 font-medium">{item.section}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
