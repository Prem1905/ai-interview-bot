import { NextResponse } from 'next/server';

// Dev-only model availability endpoint
export async function GET(req: Request) {
  // Only allow in non-production to avoid exposing information unintentionally
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const key = process.env.GOOGLE_API_KEY;
  const configured = process.env.GOOGLE_MODEL || 'models/gemini-2.0-flash';
  if (!key) {
    return NextResponse.json({ configured, ok: false, error: 'Missing GOOGLE_API_KEY' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`);
    if (!res.ok) {
      const txt = await res.text().catch(() => '<no body>');
      return NextResponse.json({ configured, ok: false, error: `Model list fetch failed: ${res.status} ${res.statusText} - ${txt}` }, { status: 502 });
    }

    const data = await res.json();
    // Return model names array if available
    const models = Array.isArray(data?.models) ? data.models.map((m: any) => m.name) : [];
    const hasConfigured = models.includes(configured);

    return NextResponse.json({ configured, ok: true, availableModels: models, hasConfigured });
  } catch (err: any) {
    return NextResponse.json({ configured, ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
