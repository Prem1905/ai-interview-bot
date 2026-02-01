import { NextResponse } from "next/server";
import { validateMessage } from "../../../lib/validators";
import { SYSTEM_PROMPT } from "../../../lib/systemPrompt";
import { generateText } from "../../../lib/geminiClient";

// ==============================
// Simple in-memory rate limiter
// ==============================
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_LIMIT = parseInt(
  process.env.RATE_LIMIT_PER_MINUTE || "30",
  10
);

const store: Map<string, { count: number; start: number }> = new Map();

function getIP(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const real = req.headers.get("x-real-ip");
  if (real) return real;

  return "unknown";
}

// ==============================
// POST Handler
// ==============================
export async function POST(req: Request) {
  try {
    const ip = getIP(req);

    // ---- Rate limiting ----
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
      store.set(ip, { count: 1, start: now });
    } else {
      entry.count += 1;
      if (entry.count > DEFAULT_LIMIT) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      }
    }

    // ---- Parse request ----
    const body = await req.json();

    // Validate input message
    const v = validateMessage(body);
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const userMsg = v.message;

    // ✅ Optional conversation history from frontend
    const history = Array.isArray(body.history) ? body.history : [];

    // ---- Convert history into readable conversation context ----
    const historyText = history
      .slice(-6)
      .map((h: any) => {
        const role = h.role === "user" ? "User" : "Prem";
        const text = h.parts?.[0]?.text || "";
        return `${role}: ${text}`;
      })
      .join("\n");

    // ---- Final prompt (System + Memory + New Question) ----
    const finalPrompt = `
${SYSTEM_PROMPT}

===========================
Conversation so far:
${historyText}
===========================

User: ${userMsg}

Prem:
`;

    // ---- Call Gemini ----
    const result = await generateText(finalPrompt);

    const replyText =
      (result as any)?.text?.trim() ||
      "Sorry, I couldn’t generate a response.";

    const usage = (result as any)?.usage ?? null;

    // ---- Return response (no harsh truncation) ----
    const responsePayload: any = {
      reply: replyText,
    };

    // Debug usage only in development
    if (process.env.NODE_ENV !== "production") {
      responsePayload.usage = usage;
    }

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error("chat route error:", err?.message || err);

    if (
      String(err?.message || "")
        .toLowerCase()
        .includes("missing google_api_key")
    ) {
      return NextResponse.json(
        {
          error:
            "Server misconfigured. Please set GOOGLE_API_KEY in environment variables.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 502 }
    );
  }
}
