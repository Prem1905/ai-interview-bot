import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const last = (globalThis as any).__LAST_LM_USAGE || null;
  return NextResponse.json({ last });
}
