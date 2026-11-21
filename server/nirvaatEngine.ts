import { FunctionDeclaration, Type } from '@google/genai';
import {
  DataStatusTier,
  NirvaatPlan,
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
import { generateContentWithFallback } from './modelConfig.ts';

export { MODEL_CONFIG, getHealthyModel } from './modelConfig.ts';
export {
  sanitizeUserQuery,
  auditDraftPlan,
  checkRedFlags,
};

export function detectRedFlagSymptom(query: string): boolean {
  return checkRedFlags(query).isRedFlag;
}

import {
  buildEmergencyResponse,
  buildSafeTemplateFallback,
} from './routes/planResponseFormatters.ts';

export { buildEmergencyResponse, buildSafeTemplateFallback };

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

export async function runNirvaatCopilot(
  userQuery: string,
  runtime: RuntimeContext
): Promise<{
  plan: NirvaatPlan;
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
  let expectedStatus: DataStatusTier = 'tier_C';
  if (hasAq && hasFc) {
    expectedStatus = 'tier_A';
  } else if (hasFc) {
    expectedStatus = 'tier_B';
  }

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
