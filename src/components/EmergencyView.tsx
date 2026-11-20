import { ArrowLeft, PhoneCall, ShieldAlert } from 'lucide-react';
import React from 'react';
import { RED_FLAG_LIST, UiLang, UiStrings } from '../i18n/strings';

interface EmergencyViewProps {
  emergencyNumber: string;
  lang: UiLang;
  strings: UiStrings;
  onBack: () => void;
}

export const EmergencyView: React.FC<EmergencyViewProps> = ({
  emergencyNumber,
  lang,
  strings,
  onBack,
}) => {
  const redFlags = RED_FLAG_LIST[lang];

  return (
    <section
      role="alert"
      aria-live="assertive"
      aria-labelledby="page-heading"
      className="mx-auto max-w-3xl rounded-2xl border-2 border-red-800 bg-white p-6 sm:p-8 text-slate-950 shadow-md space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-red-200 pb-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-700 text-white shadow-sm">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-800">
              {strings.emergency.callNow}
            </p>
            <h1
              id="page-heading"
              tabIndex={-1}
              className="mt-1 text-2xl font-extrabold text-slate-950 focus:outline-none"
            >
              {strings.emergency.title}
            </h1>
            <p className="mt-1 text-sm text-slate-800">{strings.emergency.subtitle}</p>
          </div>
        </div>

        <a
          href={`tel:${emergencyNumber}`}
          className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-xl bg-red-700 px-6 py-3 text-base font-bold text-white hover:bg-red-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-red-950 whitespace-nowrap shrink-0 shadow-sm"
        >
          <PhoneCall className="h-5 w-5" aria-hidden="true" />
          <span>Call {emergencyNumber}</span>
        </a>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-1.5">
        <h2 className="text-sm font-bold text-red-950">{strings.emergency.interimTitle}</h2>
        <p className="text-sm leading-relaxed text-red-900">{strings.emergency.interimBody}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-950">{strings.emergency.redFlagsTitle}</h2>
        <ul className="space-y-2 text-sm text-slate-900 list-disc pl-5">
          {redFlags.map((item, idx) => (
            <li key={idx} className="leading-snug">{item}</li>
          ))}
        </ul>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{strings.emergency.backToPlanner}</span>
        </button>
      </div>
    </section>
  );
};
