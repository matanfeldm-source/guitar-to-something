import { GoogleGenerativeAI, type GenerationConfig, type Part } from "@google/generative-ai";

/** Ordered list: env GEMINI_MODEL first (if set), then newer defaults for new API projects. */
function modelCandidates(explicit?: string): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const seed = [
    explicit,
    fromEnv,
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ].filter((m): m is string => Boolean(m && m.length > 0));
  return [...new Set(seed)];
}

function isModelUnavailable(msg: string): boolean {
  return /404|not found|no longer available|is not found|NOT_FOUND/i.test(msg);
}

async function generateOnce(
  apiKey: string,
  modelName: string,
  systemInstruction: string,
  userParts: Part[],
  generationConfig: GenerationConfig,
): Promise<string> {
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig,
  });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: userParts }],
  });
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}

export function getGeminiModelName(): string {
  return modelCandidates()[0] ?? "gemini-2.5-flash";
}

/**
 * Prefer Gemini JSON MIME mode. Retries without JSON mode on API complaints.
 * Tries newer model IDs in order if Google returns 404 (retired model for new keys).
 */
export async function generateGeminiJson(params: {
  apiKey: string;
  systemInstruction: string;
  userParts: Part[];
  maxOutputTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<string> {
  const maxOut = params.maxOutputTokens ?? 8192;
  const temp = params.temperature ?? 0.25;

  const jsonConfig: GenerationConfig = {
    responseMimeType: "application/json",
    maxOutputTokens: maxOut,
    temperature: temp,
  };

  const textConfig: GenerationConfig = {
    maxOutputTokens: maxOut,
    temperature: temp,
  };

  const candidates = modelCandidates(params.model);
  let lastError: unknown;

  for (const modelName of candidates) {
    try {
      return await generateOnce(
        params.apiKey,
        modelName,
        params.systemInstruction,
        params.userParts,
        jsonConfig,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (isModelUnavailable(msg)) {
        lastError = err;
        continue;
      }

      if (/JSON|mime|responseMimeType|unsupported|400|invalid/i.test(msg)) {
        try {
          return await generateOnce(
            params.apiKey,
            modelName,
            params.systemInstruction,
            params.userParts,
            textConfig,
          );
        } catch (err2) {
          const msg2 = err2 instanceof Error ? err2.message : String(err2);
          if (isModelUnavailable(msg2)) {
            lastError = err2;
            continue;
          }
          throw err2;
        }
      }

      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        `Gemini: no working model in list [${candidates.join(", ")}]. Set GEMINI_MODEL in .env.local to a model shown in Google AI Studio.`,
      );
}
