import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapePrice } from '@/lib/priceScrape';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST /api/finance/scrape
// Header: Authorization: Bearer <supabase access token>
// Body: { url: string, selector?: string }
// Returns: { price: number | null, source: string | null }
//
// Server-side so it isn't blocked by browser CORS, and gated to logged-in
// users so it can't be abused as an open fetch proxy.
export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { url?: string; selector?: string | null };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad body' }, { status: 400 }); }
  if (!body.url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const { price, source } = await scrapePrice(body.url, body.selector ?? null);
  return NextResponse.json({ price, source });
}
