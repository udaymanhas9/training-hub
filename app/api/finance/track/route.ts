import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { scrapePrice } from '@/lib/priceScrape';
import { sendPushToUser } from '@/lib/push';

export const runtime = 'nodejs';
export const maxDuration = 60; // scraping several links can be slow

interface ItemRow {
  id: string;
  user_id: string;
  name: string;
  link: string;
  current_cost: number | null;
  price_selector: string | null;
  lowest_price: number | null;
  last_notified_price: number | null;
}

// Auth: either the Vercel cron secret (process everyone) or a logged-in user's
// token (process only their own items). Returns the user id to scope to, or
// 'all' for cron, or null when unauthorized.
async function authorize(req: NextRequest): Promise<string | 'all' | null> {
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return null;

  if (process.env.CRON_SECRET && auth === process.env.CRON_SECRET) return 'all';

  // Otherwise treat it as a Supabase access token.
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user } } = await anon.auth.getUser(auth);
  return user?.id ?? null;
}

async function trackOne(db: SupabaseClient, item: ItemRow) {
  const { price } = await scrapePrice(item.link, item.price_selector);
  if (price === null) return { id: item.id, name: item.name, price: null, newLow: false };

  await db.from('price_history').insert({ item_id: item.id, price });

  const prevLow = item.lowest_price;
  const newLow = prevLow === null ? price : Math.min(prevLow, price);
  const isNewLow = prevLow !== null && price < prevLow;
  const shouldNotify = isNewLow
    && (item.last_notified_price === null || price < item.last_notified_price);

  const update: Record<string, unknown> = {
    current_cost: price,
    lowest_price: newLow,
    updated_at: new Date().toISOString(),
  };
  if (shouldNotify) update.last_notified_price = price;

  await db.from('finance_items').update(update).eq('id', item.id);

  if (shouldNotify) {
    const money = '£' + price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    await sendPushToUser(db, item.user_id, {
      title: `New low: ${item.name}`,
      body: `Now ${money} — the lowest price yet.`,
      url: '/wishlist',
      tag: `wishlist-${item.id}`,
    });
  }

  return { id: item.id, name: item.name, price, newLow: isNewLow };
}

// POST /api/finance/track
// Header: Authorization: Bearer <CRON_SECRET | supabase access token>
export async function POST(req: NextRequest) {
  const scope = await authorize(req);
  if (scope === null) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let q = db
    .from('finance_items')
    .select('id, user_id, name, link, current_cost, price_selector, lowest_price, last_notified_price')
    .eq('kind', 'wishlist')
    .eq('track_enabled', true)
    .neq('link', '');
  if (scope !== 'all') q = q.eq('user_id', scope);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data as ItemRow[]) ?? [];
  const results = [];
  for (const item of items) {
    try {
      results.push(await trackOne(db, item));
    } catch (err) {
      console.error('track failed for', item.id, err);
      results.push({ id: item.id, name: item.name, price: null, newLow: false, error: String(err) });
    }
  }

  return NextResponse.json({
    checked: items.length,
    found: results.filter(r => r.price !== null).length,
    newLows: results.filter(r => r.newLow).length,
    results,
  });
}

// GET support so Vercel Cron (which issues GET) can trigger it too.
export async function GET(req: NextRequest) {
  return POST(req);
}
