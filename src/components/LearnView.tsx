import { BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import React, { useState } from 'react';
import { GuidanceEntry } from '../shared/nirvaatTypes';

interface LearnViewProps {
  entries: GuidanceEntry[];
}

const MYTHS = [
  {
    myth: '“Indoor houseplants clean room smog like a purifier.”',
    fact: 'Chamber and home studies show typical houseplants remove negligible PM2.5 compared to natural air exchange. Use source control, sealing, or HEPA/MERV-13 filtration instead.',
    evidence: 'STRONG',
  },
  {
    myth: '“Burning camphor, dhoop, or sage purifies polluted indoor air.”',
    fact: 'Combustion of any solid or resin adds high concentrations of fine particles and VOCs directly into closed winter rooms. Never burn anything to clean air.',
    evidence: 'STRONG',
  },
  {
    myth: '“An ozone generator or ionizer is a cheap substitute for HEPA.”',
    fact: 'Ozone generators and many ionizers release ozone, a reactive lung irritant that worsens asthma and forms secondary ultrafine particles.',
    evidence: 'STRONG',
  },
  {
    myth: '“Breathing this smog equals smoking X cigarettes today.”',
    fact: 'Cigarette equivalence is only a rough communication metaphor, not a clinical dose metric. Focus on actionable peak avoidance and clean sleeping hours.',
    evidence: 'MODERATE',
  },
];

export const LearnView: React.FC<LearnViewProps> = ({ entries }) => {
  const [filter, setFilter] = useState<'all' | 'strong' | 'moderate'>('all');
  const filtered = entries.filter((e) => (filter === 'all' ? true : e.evidence === filter));

  return (
    <div className="space-y-6">
      {/* DIY Box Fan Schematic + Mask Fit Guide */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="aurora-surface rounded-2xl p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Low-Cost DIY Box-Fan Filter (Corsi-Rosenthal Principle)
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            When commercial HEPA purifiers are out of budget, taping a single MERV-13 pleated furnace filter to the intake side of a standard box fan delivers comparable clean-air delivery in a closed bedroom.
          </p>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <svg viewBox="0 0 380 145" className="w-full h-36" role="img" aria-label="Diagram showing a MERV-13 filter taped to the intake back of a box fan pushing clean air into a closed bedroom">
              {/* Dirty Air Arrows */}
              <path d="M22 45 L68 45 M60 40 L68 45 L60 50" stroke="#B45309" strokeWidth="2" fill="none" />
              <path d="M22 72 L68 72 M60 67 L68 72 L60 77" stroke="#B45309" strokeWidth="2" fill="none" />
              <path d="M22 99 L68 99 M60 94 L68 99 L60 104" stroke="#B45309" strokeWidth="2" fill="none" />
              <text x="12" y="24" fontSize="10" fill="#92400E" fontWeight="600">Smoky room air</text>

              {/* MERV-13 Filter */}
              <rect x="78" y="30" width="24" height="84" rx="3" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" />
              <path d="M84 34 L84 110 M90 34 L90 110 M96 34 L96 110" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 2" />
              <text x="58" y="132" fontSize="10" fill="#0369A1" fontWeight="600">MERV-13 Filter</text>

              {/* Cardboard Shroud / Tape Seal */}
              <rect x="102" y="30" width="20" height="84" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
              <text x="106" y="75" fontSize="9" fill="#92400E" transform="rotate(-90 112 75)" textAnchor="middle">Tape seal</text>

              {/* Box Fan */}
              <rect x="122" y="26" width="84" height="92" rx="6" fill="#F1F5F9" stroke="#334155" strokeWidth="1.8" />
              <circle cx="164" cy="72" r="28" fill="#FFFFFF" stroke="#475569" strokeWidth="1.5" />
              <circle cx="164" cy="72" r="6" fill="#0E7C86" />
              <path d="M164 46 Q178 58 164 72 Q150 86 164 98" stroke="#0E7C86" strokeWidth="2" fill="none" />
              <path d="M138 72 Q150 58 164 72 Q178 86 190 72" stroke="#0E7C86" strokeWidth="2" fill="none" />
              <text x="140" y="132" fontSize="10" fill="#1E293B" fontWeight="600">Box Fan</text>

              {/* Clean Air Arrows */}
              <path d="M218 45 L292 45 M284 40 L292 45 L284 50" stroke="#0E7C86" strokeWidth="2.2" fill="none" />
              <path d="M218 72 L305 72 M297 67 L305 72 L297 77" stroke="#0E7C86" strokeWidth="2.2" fill="none" />
              <path d="M218 99 L292 99 M284 94 L292 99 L284 104" stroke="#0E7C86" strokeWidth="2.2" fill="none" />
              <text x="235" y="24" fontSize="10" fill="#0F766E" fontWeight="600">Filtered air (-58% to -72%)</text>
              <text x="235" y="132" fontSize="9.5" fill="#475569">Keep bedroom door closed</text>
            </svg>
          </div>
        </section>

        <section className="aurora-surface rounded-2xl p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Mask Fit &amp; Pediatric Safety Rules
          </h2>
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <p className="font-semibold text-emerald-950">Ages 2+ outdoors in heavy smog</p>
              <p className="mt-1 leading-relaxed">
                Choose child- or adult-sized N95, KN95, or KF94 masks with a moldable nose wire. Pinch the nose bridge firmly and verify no warm air leaks up toward the eyes when exhaling.
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-3">
              <p className="font-semibold text-red-950">Infants &amp; toddlers under age 2</p>
              <p className="mt-1 leading-relaxed">
                NEVER place any mask or cloth covering over an infant or toddler under 2 years old due to airway resistance and suffocation risk. Protect them through timing shifts and clean indoor rooms.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Myth-Busting Evidence Cards */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Common Winter Smog Myths Corrected</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {MYTHS.map((m, i) => (
            <article key={i} className="aurora-surface rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-amber-800">Myth check</span>
                <span className="font-mono">{m.evidence} EVIDENCE</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{m.myth}</p>
              <p className="text-xs leading-relaxed text-slate-700">{m.fact}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Vetted Public Health Guidance Library */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BookOpen className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>Evidence-Graded Guidance Library ({filtered.length})</span>
          </h3>
          <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-1 text-xs">
            {(['all', 'strong', 'moderate'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1 font-medium capitalize transition-colors ${
                  filter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((entry) => (
            <article key={entry.id} className="aurora-surface rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="uppercase tracking-wide font-semibold text-teal-800">
                  {entry.evidence} evidence
                </span>
                <span>{entry.source}</span>
              </div>
              <h4 className="text-base font-semibold text-slate-900">{entry.title}</h4>
              <p className="text-xs leading-relaxed text-slate-700">{entry.summary}</p>
              <div className="grid gap-2 pt-1 text-xs">
                {entry.do_this.map((d, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>{d}</span>
                  </div>
                ))}
                {entry.avoid_this.map((a, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-red-900">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-700" aria-hidden="true" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
