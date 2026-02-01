import { NextResponse } from 'next/server';
import { validateMessage } from '../../../lib/validators';
import { SYSTEM_PROMPT } from '../../../lib/systemPrompt';
import { generateText } from '../../../lib/geminiClient';

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_LIMIT = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '30', 10);
const store: Map<string, { count: number; start: number }> = new Map();

function getIP(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

export async function POST(req: Request) {
  try {
    const ip = getIP(req);

    // rate limit
    const now = Date.now();
    const entry = store.get(ip);
    if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
      store.set(ip, { count: 1, start: now });
    } else {
      entry.count += 1;
      if (entry.count > DEFAULT_LIMIT) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
    }

    const body = await req.json();
    const v = validateMessage(body);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const userMsg = v.message;

    // Prevent prompt injection by composing full prompt server-side
    const finalPrompt = `${SYSTEM_PROMPT}\n\nUser: ${userMsg}\n\nPrem:`;

    const result = await generateText(finalPrompt);
    const lmReply = (result as any)?.text ?? String(result);
    const usage = (result as any)?.usage ?? null;

    // Keep replies short - enforce 4-6 sentences via prompt, but double-check
    const truncated = lmReply.split(/(?<=[.!?])\s+/).slice(0, 6).join(' ');

    // Log token usage for debugging
    if (usage) {
      console.info('LM usage:', { model: process.env.GOOGLE_MODEL || 'models/gemini-2.0-flash', usage });
    }

    // store last usage in-memory for dev diagnostics
    (globalThis as any).__LAST_LM_USAGE = usage || null;

    const responsePayload: any = { reply: truncated };
    // Expose usage info only in non-production for debugging
    if (process.env.NODE_ENV !== 'production') responsePayload.usage = usage;

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    // Log details server-side for debugging (do not leak stack traces to clients)
    console.error('chat route error:', err?.message || err);
    // If we can detect a config issue, return a helpful safe message
    if (String(err?.message || '').toLowerCase().includes('missing google_api_key')) {
      return NextResponse.json(
        { error: 'Server misconfigured. Please set the GOOGLE_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Failed to generate response' }, { status: 502 });
  }
}
