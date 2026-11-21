import {
  NirvaatPlan,
  RuntimeContext,
  DataStatusTier,
  ToolEnvelope,
} from '@nirvaat/contracts';
import { ACTION_LIBRARY } from '@nirvaat/engines';

export interface AssemblePlanOptions {
  rt: RuntimeContext;
  isHindi: boolean;
  dataStatus: DataStatusTier;
  isLive: boolean;
  currentPm: number;
  priorityMember: { label: string };
  scoredEnv: ToolEnvelope<{
    top_actions: Array<any>;
    extra_actions: Array<any>;
  }>;
  aqRes: { ok: boolean; data?: any; error?: string };
  whenMap: Record<string, string>;
}

export function assembleDeterministicPlan(opts: AssemblePlanOptions): NirvaatPlan {
  const {
    rt,
    isHindi,
    dataStatus,
    isLive,
    currentPm,
    priorityMember,
    scoredEnv,
    aqRes,
    whenMap,
  } = opts;

  let summaryText = '';
  if (dataStatus === 'tier_A') {
    summaryText = isHindi
      ? `${rt.region.neighborhood} में वर्तमान PM2.5 स्तर ${currentPm} µg/m³ है। हवा गंभीर श्रेणी में है।`
      : `Current ambient PM2.5 in ${rt.region.neighborhood} is ${currentPm} µg/m³ (Severe inversion episode).`;
  } else if (dataStatus === 'tier_B') {
    summaryText = isHindi
      ? `${rt.region.neighborhood} में लाइव डेटा में कुछ अनुमानित मान शामिल हैं (वर्तमान PM2.5: ${currentPm} µg/m³)।`
      : `Live grid feed with partial hour interpolation for ${rt.region.neighborhood} (Current PM2.5: ${currentPm} µg/m³).`;
  } else {
    summaryText = isHindi
      ? `सामान्य मार्गदर्शन, लाइव डेटा उपलब्ध नहीं है। ${rt.region.official_source} देखें।`
      : `General guidance, fallback reference data. Check ${rt.region.official_source} for live readings.`;
  }

  const confidence = dataStatus === 'tier_A' ? ('high' as const) : dataStatus === 'tier_B' ? ('medium' as const) : ('low' as const);

  return {
    language: isHindi ? 'hi-IN' : 'en-IN',
    mode: 'plan',
    data_status: dataStatus,
    situation: {
      summary: summaryText,
      confidence,
      sources: isLive && aqRes.ok ? [aqRes.data.source, scoredEnv.source] : [rt.region.official_source, scoredEnv.source],
      as_of: aqRes.ok ? aqRes.data.as_of : new Date().toISOString(),
    },
    assumptions: [
      isHindi
        ? `${priorityMember.label} को प्राथमिकता देते हुए आपके घर के आकार (${rt.profile.home.size_band}) के लिए गणना की गई।`
        : `Prioritized ${priorityMember.label}; modeled for ${rt.profile.home.size_band.replaceAll('_', ' ')} dwelling.`,
    ],
    actions: scoredEnv.value.top_actions.map((item) => ({
      rank: item.rank,
      title: item.title,
      when: whenMap[item.action_id] ?? 'Today',
      how: (ACTION_LIBRARY as Record<string, { description?: string }>)[item.action_id]?.description ?? '',
      why_it_works: item.top_uncertainty || 'Lowers inhaled PM2.5 concentration during highest-dose hours.',
      effect: {
        metric: '24h inhaled PM2.5 dose',
        with: isLive || dataStatus === 'tier_B' ? `${item.daily_with_ug.q10}–${item.daily_with_ug.q90} µg/day` : null,
        without: isLive || dataStatus === 'tier_B' ? `${item.daily_without_ug.q10}–${item.daily_without_ug.q90} µg/day` : null,
        change_range: isLive || dataStatus === 'tier_B'
          ? `-${item.daily_reduction_pct.q10}% to -${item.daily_reduction_pct.q90}%`
          : item.dose_avoided_ug > 150 ? 'large' : 'moderate',
        confidence: scoredEnv.confidence,
        tool_ref: item.impact_call_id,
      },
      cost: item.cost,
      evidence: item.evidence,
      protects: item.protects,
    })),
    if_you_can_do_more: scoredEnv.value.extra_actions.map((e) => `${e.title} (${e.cost} cost · ${e.evidence} evidence)`),
    myth_correction: isHindi
      ? 'घर के पौधे कमरे के PM2.5 को सार्थक रूप से साफ नहीं करते; हवा बंद करना और फ़िल्टर चलाना अधिक प्रभावी है।'
      : 'Indoor houseplants do not meaningfully remove PM2.5 smog; sealing gaps and particle filtration do.',
    safety_note: rt.profile.members.some((m) => m.age_band === 'infant_under_2')
      ? 'Never place masks on children under age 2; protect them via clean-air sleeping rooms and timing.'
      : 'Avoid ozone generators, ionizers, or burning camphor/incense indoors.',
    follow_up_hook: isHindi
      ? 'अपने घर की किसी खास योजना (जैसे स्कूल का समय या खाना पकाना) के बारे में पूछें।'
      : 'Ask about a specific routine (school run, cooking smoke, or night ventilation) for tailored Copilot advice.',
  };
}
