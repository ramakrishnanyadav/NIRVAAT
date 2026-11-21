import { FunctionDeclaration, Type } from '@google/genai';
import {
  DataStatusTier,
  NirvaatPlanResponse,
  NirvaatPlanResponseSchema,
  RuntimeContext,
  ToolCallTrace,
} from '@nirvaat/contracts';
import {
  checkRedFlags,
  auditDraftPlan,
  AuditResult,
} from '@nirvaat/verifier';
import { sanitizeUserQuery, SYSTEM_INSTRUCTIONS_PROD } from '@nirvaat/prompts';
import { executeNirvaatTool } from './nirvaatTools.ts';
import {
  MODEL_CONFIG,
  getHealthyModel,
  generateContentWithFallback,
} from './modelConfig.ts';

export {
  MODEL_CONFIG,
  getHealthyModel,
  sanitizeUserQuery,
  auditDraftPlan,
  checkRedFlags,
};

export function detectRedFlagSymptom(query: string): boolean {
  return checkRedFlags(query).isRedFlag;
}

export function buildEmergencyResponse(runtime: RuntimeContext): NirvaatPlanResponse {
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

let activeGeminiCalls = 0;
let dailyBudgetCount = 0;
let currentDayUtc = new Date().toISOString().slice(0, 10);
const DAILY_LLM_BUDGET = Number(process.env.DAILY_LLM_BUDGET ?? 250);

export function getLlmMetrics() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDayUtc) {
    dailyBudgetCount = 0;
    currentDayUtc = today;
  }
  return {
    activeGeminiCalls,
    dailyBudgetCount,
    dailyBudgetLimit: DAILY_LLM_BUDGET,
  };
}

export function resetLlmMetricsForTest() {
  activeGeminiCalls = 0;
  dailyBudgetCount = 0;
}

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_air_quality',
    description: 'Fetch live PM2.5, PM10, AQI for the household coarse grid cell.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        neighborhood_label: { type: Type.STRING, description: 'Coarse neighborhood label.' },
      },
      required: ['neighborhood_label'],
    },
  },
  {
    name: 'get_forecast',
    description: 'Fetch hourly PM2.5 forecast for the next 12 to 24 hours.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        hours: { type: Type.INTEGER, description: 'Forecast horizon in hours (12 or 24).' },
      },
      required: ['hours'],
    },
  },
  {
    name: 'impact_estimate',
    description: 'Estimate counterfactual PM2.5 exposure with vs without an action.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action_type: { type: Type.STRING },
        outdoor_pm25: { type: Type.NUMBER },
        duration_hours: { type: Type.NUMBER },
      },
      required: ['action_type', 'outdoor_pm25', 'duration_hours'],
    },
  },
  {
    name: 'retrieve_guidance',
    description: 'Retrieve evidence-graded public health guidance.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
      },
      required: ['topic'],
    },
  },
];

export function buildSafeTemplateFallback(
  runtime: RuntimeContext,
  traces: ToolCallTrace[],
  expectedStatus: DataStatusTier
): NirvaatPlanResponse {
  const isHindi = runtime.locale.toLowerCase().startsWith('hi');
  const aqTrace = traces.find((t) => t.tool_name === 'get_air_quality' && t.status === 'ok');
  const aqVal = aqTrace?.result.value as Record<string, unknown> | undefined;
  const pm25 = typeof aqVal?.pm2_5 === 'number' ? aqVal.pm2_5 : null;

  return {
    language: isHindi ? 'hi-IN' : 'en-IN',
    mode: 'plan',
    data_status: expectedStatus,
    situation: {
      summary: isHindi
        ? pm25 !== null
          ? `वर्तमान PM2.5 ${pm25} ug/m3 है। कम लागत वाले सुरक्षित कदम अपनाएं।`
          : `सामान्य मार्गदर्शन, लाइव डेटा उपलब्ध नहीं है। ${runtime.region.official_source} देखें।`
        : pm25 !== null
          ? `Current grid PM2.5 is ${pm25} ug/m3. Focus on indoor clean air and timing.`
          : `General guidance, no live data. Check ${runtime.region.official_source} for local updates.`,
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

export async function runNirvaatCopilot(
  userQuery: string,
  runtime: RuntimeContext
): Promise<{
  plan: NirvaatPlanResponse;
  tool_traces: ToolCallTrace[];
  audit: AuditResult;
  model_used: string;
}> {
  const sanitizedQuery = sanitizeUserQuery(userQuery);

  // 1. Red-Flag Emergency Short-Circuit (ZERO LLM calls)
  if (detectRedFlagSymptom(sanitizedQuery)) {
    const emergencyPlan = buildEmergencyResponse(runtime);
    return {
      plan: emergencyPlan,
      tool_traces: [],
      audit: { pass: true, violations: [] },
      model_used: 'deterministic-red-flag-triage',
    };
  }

  // 2. Budget and degradation check
  const sim = runtime.simulated_degradation ?? 'none';
  if (sim === 'all_down') {
    const fallback = buildSafeTemplateFallback(runtime, [], 'tier_D');
    return {
      plan: fallback,
      tool_traces: [],
      audit: { pass: true, violations: [] },
      model_used: 'tier-d-safety-fallback',
    };
  }

  // 3. Tool execution loop (max 2 rounds)
  const toolTraces: ToolCallTrace[] = [];
  const aqResult = await executeNirvaatTool('get_air_quality', { neighborhood_label: runtime.region.neighborhood }, runtime);
  toolTraces.push(aqResult.trace);

  const fcResult = await executeNirvaatTool('get_forecast', { hours: 24 }, runtime);
  toolTraces.push(fcResult.trace);

  const hasAq = aqResult.trace.status === 'ok';
  const hasFc = fcResult.trace.status === 'ok';
  const expectedStatus: DataStatusTier = hasAq && hasFc ? 'tier_A' : hasFc ? 'tier_B' : 'tier_C';

  // 4. Generate plan via Gemini or fallback
  try {
    const prompt = `
${SYSTEM_INSTRUCTIONS_PROD}

CONTEXT:
Runtime: ${JSON.stringify(runtime)}
Query: ${sanitizedQuery}
TOOL_RESULTS:
${JSON.stringify(toolTraces.map((t) => ({ call_id: t.call_id, tool: t.tool_name, result: t.result })))}

Return ONLY a valid JSON object matching NirvaatPlanResponseSchema.
`.trim();

    const { response, modelUsed } = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    }, 'explanation');

    const rawText = response.text || '{}';
    const parsed = NirvaatPlanResponseSchema.safeParse(JSON.parse(rawText));

    if (parsed.success) {
      const audit = auditDraftPlan(parsed.data, runtime, toolTraces, expectedStatus);
      if (audit.pass) {
        return {
          plan: parsed.data,
          tool_traces: toolTraces,
          audit,
          model_used: modelUsed,
        };
      }
    }
  } catch (err) {
    console.warn('[Copilot LLM Error]', err instanceof Error ? err.message : err);
  }

  // Safe fallback if model generation or audit fails
  const fallbackPlan = buildSafeTemplateFallback(runtime, toolTraces, expectedStatus);
  const audit = auditDraftPlan(fallbackPlan, runtime, toolTraces, expectedStatus);
  return {
    plan: fallbackPlan,
    tool_traces: toolTraces,
    audit,
    model_used: 'deterministic-safe-template',
  };
}
