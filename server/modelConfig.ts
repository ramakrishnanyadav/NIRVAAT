import { GoogleGenAI } from '@google/genai';

export const MODEL_CONFIG = {
  extraction: process.env.GEMINI_EXTRACTION_MODEL || 'gemini-2.5-flash',
  explanation: process.env.GEMINI_EXPLANATION_MODEL || 'gemini-2.5-flash',
  fallbackCandidates: [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-flash-latest',
  ],
};

let activeVerifiedModel: string = MODEL_CONFIG.explanation;
let lastModelHealthCheckMs = 0;
const HEALTH_CHECK_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cachedAiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in server environment secrets.');
  }
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAiClient;
}

export async function getHealthyModel(): Promise<string> {
  const now = Date.now();
  if (activeVerifiedModel && (now - lastModelHealthCheckMs) < HEALTH_CHECK_TTL_MS) {
    return activeVerifiedModel;
  }

  const ai = getAiClient();
  for (const candidate of MODEL_CONFIG.fallbackCandidates) {
    try {
      await ai.models.generateContent({
        model: candidate,
        contents: [{ role: 'user', parts: [{ text: 'healthcheck' }] }],
      });
      activeVerifiedModel = candidate;
      lastModelHealthCheckMs = now;
      console.log(`[LLM Model Health] Pinned active healthy model: ${candidate}`);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  activeVerifiedModel = 'gemini-2.5-flash';
  lastModelHealthCheckMs = now;
  return activeVerifiedModel;
}

export function isRecoverableModelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : 0;
  if ([503, 429, 404, 500].includes(status)) return true;
  return /\b(503|429|404|500|UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND|INTERNAL)\b/i.test(msg);
}

export async function generateContentWithFallback(
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>,
  purpose: 'extraction' | 'explanation' = 'explanation'
): Promise<{ response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>; modelUsed: string }> {
  const ai = getAiClient();
  const targetModel = purpose === 'extraction' ? MODEL_CONFIG.extraction : activeVerifiedModel;

  try {
    const response = await ai.models.generateContent({
      model: targetModel,
      ...params,
    });
    return { response, modelUsed: targetModel };
  } catch (err) {
    if (isRecoverableModelError(err)) {
      for (const fallback of MODEL_CONFIG.fallbackCandidates) {
        if (fallback === targetModel) continue;
        try {
          const response = await ai.models.generateContent({
            model: fallback,
            ...params,
          });
          activeVerifiedModel = fallback;
          lastModelHealthCheckMs = Date.now();
          return { response, modelUsed: fallback };
        } catch {
          // continue fallback
        }
      }
    }
    throw err;
  }
}
