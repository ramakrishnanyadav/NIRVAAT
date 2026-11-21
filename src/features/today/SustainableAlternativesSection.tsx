import React, { useState } from 'react';
import { Leaf, Users, ShieldAlert, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { SUSTAINABLE_ALTERNATIVES, SustainableAlternative } from '../../shared/nirvaatTypes';
import { UiStrings } from '../../i18n/strings';

interface SustainableAlternativesSectionProps {
  strings?: UiStrings;
  lang?: 'en' | 'hi';
}

export const SustainableAlternativesSection: React.FC<SustainableAlternativesSectionProps> = ({
  lang = 'en',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', labelEn: 'All Alternatives', labelHi: 'सभी विकल्प' },
    { id: 'mobility', labelEn: 'Clean Mobility', labelHi: 'स्वच्छ आवागमन' },
    { id: 'cooking_energy', labelEn: 'Clean Cooking Energy', labelHi: 'स्वच्छ रसोई ऊर्जा' },
    { id: 'waste_reduction', labelEn: 'Zero Waste Burning', labelHi: 'कचरा दहन रोकथाम' },
    { id: 'work_lifestyle', labelEn: 'WFH & Work Shift', labelHi: 'वर्क फ्रॉम होम' },
  ];

  const filtered = selectedCategory === 'all'
    ? SUSTAINABLE_ALTERNATIVES
    : SUSTAINABLE_ALTERNATIVES.filter((a) => a.category === selectedCategory);

  return (
    <section
      aria-label="Sustainable Low-Emission Alternatives"
      className="rounded-2xl border border-teal-200/90 bg-emerald-50/40 p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-200/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-white shadow-sm">
            <Leaf className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {lang === 'hi' ? 'टिकाऊ और कम उत्सर्जन वाले विकल्प' : 'Sustainable & Low-Emission Alternatives'}
            </h3>
            <p className="text-xs text-slate-600">
              {lang === 'hi'
                ? 'व्यक्तिगत जोखिम और सामुदायिक वायु प्रदूषण दोनों को कम करने वाले सिद्ध उपाय।'
                : 'Long-term solutions reducing personal exposure and collective urban smog.'}
            </p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-teal-800 text-white'
                  : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200'
              }`}
            >
              {lang === 'hi' ? cat.labelHi : cat.labelEn}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        {filtered.map((item: SustainableAlternative) => {
          const isExpanded = expandedId === item.id;
          return (
            <article
              key={item.id}
              className="rounded-xl border border-teal-100 bg-white/95 p-4 shadow-xs space-y-2.5 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                  {lang === 'hi' ? item.titleHi : item.titleEn}
                </h4>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    item.cost === 'free'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.cost === 'low'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {item.cost} cost
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                    {item.evidence_grade} evidence
                  </span>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-600">
                {lang === 'hi' ? item.descriptionHi : item.descriptionEn}
              </p>

              <div className="space-y-1.5 rounded-lg bg-teal-50/70 p-2.5 text-xs">
                <div className="text-teal-950 font-medium">
                  <strong className="text-teal-900">Personal Dose Impact:</strong> {item.personal_exposure_impact}
                </div>
                <div className="text-teal-950 font-medium">
                  <strong className="text-teal-900">Community Emission Shift:</strong> {item.community_emissions_reduction}
                </div>
              </div>

              {/* Collapsible Details: Citation & Equity Note */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline"
                >
                  <span>{isExpanded ? 'Hide Equity & Science Note' : 'View Equity Note & Science Citation'}</span>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {isExpanded && (
                  <div className="mt-2.5 space-y-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
                    <div className="flex items-start gap-1.5">
                      <Users className="h-3.5 w-3.5 text-indigo-700 shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <strong className="text-slate-800">Equity Consideration: </strong>
                        {item.equity_note}
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Award className="h-3.5 w-3.5 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <strong className="text-slate-800">Scientific Reference: </strong>
                        <span className="italic">{item.evidence_citation}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
