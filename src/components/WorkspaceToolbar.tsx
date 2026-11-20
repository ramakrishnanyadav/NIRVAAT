import React from 'react';
import { Compass, MapPin, RefreshCw, Search } from 'lucide-react';
import { ChannelType, RegionConfig } from '../shared/nirvaatTypes.ts';
import { STRINGS, UiLang } from '../i18n/strings.ts';

interface WorkspaceToolbarProps {
  regions: RegionConfig[];
  selectedRegion: RegionConfig;
  onSelectRegion: (r: RegionConfig) => void;
  onUseBrowserGeolocation: () => void;
  geoLoading: boolean;
  onRefreshAirQuality: () => void;
  aqLoading: boolean;
  channel: ChannelType;
  onChangeChannel: (ch: ChannelType) => void;
  lang: UiLang;
  onChangeLang: (l: UiLang) => void;
  onOpenCmd: () => void;
  strings: typeof STRINGS['en'];
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  regions,
  selectedRegion,
  onSelectRegion,
  onUseBrowserGeolocation,
  geoLoading,
  onRefreshAirQuality,
  aqLoading,
  channel,
  onChangeChannel,
  lang,
  onChangeLang,
  onOpenCmd,
  strings,
}) => {
  return (
    <div className="border-b border-slate-200/70 bg-white/60">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="region-select" className="sr-only">
            Select neighborhood grid
          </label>
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
            <MapPin className="h-3.5 w-3.5 text-teal-700 shrink-0" aria-hidden="true" />
            <select
              id="region-select"
              value={selectedRegion.grid_id}
              onChange={(e) => {
                const found = regions.find((r) => r.grid_id === e.target.value);
                if (found) onSelectRegion(found);
              }}
              className="bg-transparent font-medium text-slate-900 focus:outline-none"
            >
              {regions.map((r) => (
                <option key={r.grid_id} value={r.grid_id}>
                  {r.city} · {r.neighborhood}
                </option>
              ))}
              {!regions.some((r) => r.grid_id === selectedRegion.grid_id) && (
                <option value={selectedRegion.grid_id}>
                  {selectedRegion.city} · {selectedRegion.neighborhood}
                </option>
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={onUseBrowserGeolocation}
            disabled={geoLoading}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Compass className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            <span>{geoLoading ? 'Locating grid…' : 'Use Coarse Location'}</span>
          </button>

          <button
            type="button"
            onClick={onRefreshAirQuality}
            disabled={aqLoading}
            aria-label="Refresh live air quality"
            className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${aqLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Channel selector */}
          <div
            role="group"
            aria-label="Output channel format"
            className="flex items-center gap-0.5 rounded-xl bg-slate-200/75 p-0.5"
          >
            {(['APP', 'WHATSAPP', 'SMS', 'VOICE'] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => onChangeChannel(ch)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  channel === ch ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          {/* Language toggle */}
          <div className="flex items-center gap-0.5 rounded-xl bg-slate-200/75 p-0.5">
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                lang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('hi')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                lang === 'hi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              हिन्दी
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenCmd}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{strings.actions.commandPalette}</span>
            <kbd className="hidden sm:inline rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
