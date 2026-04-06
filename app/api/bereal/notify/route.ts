import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const PAYLOAD = JSON.stringify({
  title: '📸 Time to BeReal!',
  body:  'What are you up to right now?',
});

async function sendToAll(db: ReturnType<typeof createClient>, userId: string) {
  const { data } = await db
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  const subs = (data ?? []) as { subscription: webpush.PushSubscription }[];
  if (!subs.length) return 0;

  await Promise.allSettled(
    subs.map(row => webpush.sendNotification(row.subscription, PAYLOAD)),
  );

  return subs.length;
}

// GET /api/bereal/notify  (Vercel cron: */30 * * * *)
// Checks if a scheduled notification falls in the current 30-min window and sends it
export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === 'true';
  const userId = process.env.HEALTH_USER_ID!;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  if (force) {
    const sent = await sendToAll(db, userId);
    return NextResponse.json({ ok: true, force: true, sent });
  }

  const now         = new Date();
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 15 * 60 * 1000);

  const { data: pending } = await db
    .from('bereal_schedule')
    .select('id')
    .eq('user_id', userId)
    .eq('sent', false)
    .gte('notify_at', windowStart.toISOString())
    .lte('notify_at', windowEnd.toISOString());

  if (!pending?.length) return NextResponse.json({ ok: true, sent: false });

  const sent = await sendToAll(db, userId);

  await db
    .from('bereal_schedule')
    .update({ sent: true })
    .in('id', pending.map(r => r.id));

  return NextResponse.json({ ok: true, sent });
}
