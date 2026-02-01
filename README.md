# Prem | 100x AI Candidate — Voice Interview Demo

Run locally:

1. copy `.env.local.example` to `.env.local` and set `GOOGLE_API_KEY`
2. npm install
3. npm run dev

Notes
- Uses Google Generative Language REST endpoint. Ensure your API key has access to Gemini models.
- Default model is set to `models/gemini-2.0-flash`. You can override with the `GOOGLE_MODEL` env var (e.g. `models/text-bison-001`).
- Dev-only model check endpoint: `GET /api/dev/model` returns available model names and whether the configured model (from `GOOGLE_MODEL`) is present.
- This demo keeps the persona (system prompt) server-side to prevent prompt injection.
- Rate limiting is in-memory and intended for demo/dev usage.
