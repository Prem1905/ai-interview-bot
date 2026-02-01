const MODEL = process.env.GOOGLE_MODEL || "gemini-2.0-flash";
const CONTENT_BASE = (model: string) => `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
const FALLBACK = process.env.GOOGLE_MODEL_FALLBACK || process.env.FALLBACK_MODEL || null;

export async function generateText(prompt: string) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('Missing GOOGLE_API_KEY');

  // Build request body compatible with generateContent (no unsupported fields)
  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  // Helper to POST and return parsed JSON or throw an Error with details
  async function postToContentEndpoint(model: string) {
    const endpoint = `${CONTENT_BASE(model)}?key=${encodeURIComponent(key)}`;
    console.info('LM request', { model, endpoint: CONTENT_BASE(model).replace(/(\?key=).*$/, '?<key>') });
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await res.text().catch(() => '<no body>');
    if (!res.ok) {
      return { ok: false, status: res.status, statusText: res.statusText, body: text };
    }
    try {
      const data = JSON.parse(text);
      return { ok: true, data };
    } catch (e) {
      throw new Error('Failed to parse language model response');
    }
  }

  // First attempt using configured model
  const primary = await postToContentEndpoint(MODEL);
  if (!primary.ok) {
    // If 403/404, provide actionable message and try fallback if available
    if (primary.status === 404) {
      const msg = `Model not found or not accessible: ${MODEL} (HTTP 404). Ensure your API key has access to this model or set GOOGLE_MODEL to a model you can access.`;
      if (FALLBACK && FALLBACK !== MODEL) {
        console.warn(msg + ` Attempting fallback model: ${FALLBACK}`);
        const fallbackRes = await postToContentEndpoint(FALLBACK);
        if (fallbackRes.ok) {
          const data = fallbackRes.data;
          const candidate = data?.candidates?.[0];
          let textResult = '';
          if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) textResult = candidate.content.parts.map((p: any) => p.text || '').join('');
          const usage = data?.usageMetadata || data?.usage || null;
          return { text: String(textResult).trim(), usage };
        }
        throw new Error(`Model not found: ${MODEL} and fallback failed: ${FALLBACK} (${fallbackRes.status})`);
      }
      throw new Error(msg);
    }

    // For other errors return the body text for debugging
    throw new Error(`Language model request failed: ${primary.status} ${primary.statusText} - ${primary.body}`);
  }

  const data = primary.data;
  const candidate = data?.candidates?.[0];
  let text = '';
  if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
    text = candidate.content.parts.map((p: any) => p.text || '').join('');
  } else if (typeof candidate?.content === 'string') {
    text = candidate.content;
  } else if (data?.generations?.[0]?.text) {
    text = data.generations[0].text;
  } else {
    text = JSON.stringify(data);
  }

  const usage = data?.usageMetadata || data?.usage || null;
  return { text: String(text).trim(), usage };
}
