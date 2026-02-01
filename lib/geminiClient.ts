// lib/geminiClient.ts

const MODEL = process.env.GOOGLE_MODEL || "gemini-2.0-flash";
const FALLBACK_MODEL =
  process.env.GOOGLE_MODEL_FALLBACK ||
  process.env.FALLBACK_MODEL ||
  null;

const BASE_URL = "https://generativelanguage.googleapis.com/v1/models";

/**
 * Main text generation function using Gemini REST API.
 * Supports fallback model + human-like generation config.
 */
export async function generateText(prompt: string) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_API_KEY");

  // Request payload (Gemini generateContent format)
  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.75,
      topP: 0.9,
      maxOutputTokens: 220,
    },
  };

  /**
   * Calls Gemini model endpoint and returns parsed JSON.
   */
  async function callModel(modelName: string) {
    const endpoint = `${BASE_URL}/${modelName}:generateContent?key=${key}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: raw,
      };
    }

    try {
      return {
        ok: true,
        data: JSON.parse(raw),
      };
    } catch {
      throw new Error("Failed to parse Gemini response JSON");
    }
  }

  /**
   * Extract assistant text safely from Gemini response.
   */
  function extractText(data: any): string {
    const candidate = data?.candidates?.[0];
    if (!candidate?.content?.parts) return "";

    return candidate.content.parts
      .map((p: any) => p.text || "")
      .join("")
      .trim();
  }

  // ==============================
  // Primary attempt
  // ==============================
  let response = await callModel(MODEL);

  // ==============================
  // Fallback attempt if model fails
  // ==============================
  if (!response.ok) {
    console.warn(
      `Gemini model failed (${MODEL}) → ${response.status}`
    );

    // Retry with fallback model if configured
    if (FALLBACK_MODEL && FALLBACK_MODEL !== MODEL) {
      console.warn(`Retrying with fallback: ${FALLBACK_MODEL}`);
      response = await callModel(FALLBACK_MODEL);
    }
  }

  // If still failing → throw clean error
  if (!response.ok) {
    throw new Error(
      `Gemini request failed: HTTP ${response.status}`
    );
  }

  // Extract usable text
  const text = extractText(response.data);

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  // Usage metadata (debug only)
  const usage =
    response.data?.usageMetadata ||
    response.data?.usage ||
    null;

  return { text, usage };
}
