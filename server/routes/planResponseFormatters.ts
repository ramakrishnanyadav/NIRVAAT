import {
  NirvaatPlan,
  RuntimeContext,
  DataStatusTier,
  ToolEnvelope,
  ToolCallTrace,
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

export function buildEmergencyResponse(runtime: RuntimeContext): NirvaatPlan {
  const isHindi = runtime.locale.toLowerCase().startsWith('hi');
  return {
    language: isHindi ? 'hi-IN' : 'en-IN',
    mode: 'emergency',
    data_status: 'tier_D',
    situation: {
      summary: isHindi
        ? 'गंभीर श्वास लक्षणों की सूचना मिली है। तुरंत आपातकालीन चिकित्सा सहायता लें।'
        : 'Potential urgent respiratory warning signs reported. Immediate medical care takes priority.',
      confidence: 'high',
      sources: ['NIRVAAT Red-Flag Safety Triage (H3)'],
      as_of: new Date().toISOString(),
    },
    assumptions: [],
    actions: [],
    emergency: {
      message: isHindi
        ? `यह गंभीर लक्षण हो सकता है। अभी आपातकालीन चिकित्सा सहायता लें (${runtime.region.emergency_number} पर कॉल करें)। जब तक मदद न आए, व्यक्ति को घर के सबसे साफ कमरे में ले जाएं और उनके साथ रहें।`
        : `I hear how worrying these symptoms are. Seek urgent medical care now by calling ${runtime.region.emergency_number}. While waiting, move to the cleanest available indoor room and stay with the person.`,
      number: runtime.region.emergency_number,
    },
    safety_note: isHindi
      ? 'यदि व्यक्ति पहले से निर्धारित रिलीवर इनहेलर का उपयोग कर रहा है, तो उसे पास रखें और तुरंत डॉक्टर या आपातकालीन सेवा से संपर्क करें।'
      : 'Do not wait for air-quality advice when urgent breathing or chest symptoms are present.',
    follow_up_hook: isHindi
      ? 'व्यक्ति के सुरक्षित होने के बाद यदि आप चाहें तो हम घर की हवा को साफ रखने की योजना बना सकते हैं।'
      : 'Once everyone is medically safe, reach back out if you want help reducing indoor smoke and smog.',
  };
}

export function buildSafeTemplateFallback(
  runtime: RuntimeContext,
  traces: ToolCallTrace[],
  expectedStatus: DataStatusTier
): NirvaatPlan {
  const isHindi = runtime.locale.toLowerCase().startsWith('hi');
  const aqTrace = traces.find((t) => t.tool_name === 'get_air_quality' && t.status === 'ok');
  const aqVal = aqTrace?.result.value as Record<string, unknown> | undefined;
  const pm25 = typeof aqVal?.pm2_5 === 'number' ? aqVal.pm2_5 : null;

  let summaryText = '';
  if (isHindi) {
    summaryText = pm25 !== null
      ? `वर्तमान PM2.5 ${pm25} ug/m3 है। कम लागत वाले सुरक्षित कदम अपनाएं।`
      : `सामान्य मार्गदर्शन, लाइव डेटा उपलब्ध नहीं है। ${runtime.region.official_source} देखें।`;
  } else {
    summaryText = pm25 !== null
      ? `Current grid PM2.5 is ${pm25} ug/m3. Focus on indoor clean air and timing.`
      : `General guidance, no live data. Check ${runtime.region.official_source} for local updates.`;
  }

  return {
    language: isHindi ? 'hi-IN' : 'en-IN',
    mode: 'plan',
    data_status: expectedStatus,
    situation: {
      summary: summaryText,
      confidence: aqTrace ? 'medium' : 'low',
      sources: aqTrace ? [String(aqTrace.result.source ?? 'Open-Meteo')] : [runtime.region.official_source],
      as_of: new Date().toISOString(),
    },
    assumptions: [
      isHindi
        ? 'सुरक्षित टेम्पलेट योजना: घर के सबसे बंद कमरे को प्राथमिकता दी गई है।'
        : 'Using safe baseline indoor protection assumptions for your household profile.',
    ],
    actions: [
      {
        rank: 1,
        title: isHindi ? 'एक साफ कमरा बंद और सील रखें' : 'Keep one sleeping room closed and sealed',
        when: isHindi ? 'शाम से सुबह 10 बजे तक' : 'Evening through 10:00 AM peak',
        how: isHindi
          ? 'बाहरी खिड़कियां बंद रखें और दरवाजे के नीचे की दरार को गीले तौलिये से ढक दें।'
          : 'Keep exterior windows shut and place a rolled damp towel along bottom door gaps.',
        why_it_works: isHindi
          ? 'इससे बाहर का धुआं कमरे में धीरे प्रवेश करता है।'
          : 'Cutting drafts slows smoky outdoor air from entering where your family sleeps.',
        effect: {
          metric: isHindi ? 'कमरे के अंदर PM2.5 प्रवेश' : 'Indoor PM2.5 infiltration',
          with: null,
          without: null,
          change_range: 'moderate',
          confidence: 'medium',
          tool_ref: aqTrace?.call_id ?? 'safe_template',
        },
        cost: 'free',
        evidence: 'moderate',
        protects: ['general_household'],
      },
    ],
    if_you_can_do_more: [
      isHindi
        ? 'यदि बजट हो तो सोने के कमरे में DIY या HEPA फिल्टर चलाएं।'
        : 'Add DIY or HEPA filtration in the sealed room if budget allows.',
    ],
    myth_correction: isHindi
      ? 'धुआं साफ करने के लिए कपूर या अगरबत्ती न जलाएं, इससे बारीक कण बढ़ते हैं।'
      : 'Do not burn camphor or incense to cleanse air; combustion creates hazardous fine particles.',
    safety_note: isHindi
      ? 'यदि सांस फूलने या सीने में जकड़न के लक्षण हों, तो तुरंत आपातकालीन सहायता लें।'
      : 'Seek immediate medical care if severe breathing distress occurs.',
    follow_up_hook: isHindi
      ? 'क्या आप दोपहर में खिड़कियां खोलने का सुरक्षित समय जानना चाहते हैं?'
      : 'Would you like to check the cleanest afternoon window to ventilate your home?',
  };
}
