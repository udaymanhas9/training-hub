import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/bereal/schedule  (Vercel cron: 0 0 * * *)
// Picks a random notification time for today and stores it
export async function GET() {
  const userId = process.env.HEALTH_USER_ID!;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now   = new Date();
  const today = now.toISOString().slice(0, 10);

  // Random time between 09:00 and 21:00 UTC
  const hour = 9 + Math.floor(Math.random() * 12);
  const min  = Math.floor(Math.random() * 60);
  const notifyAt = new Date(`${today}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`);

  const { error } = await db
    .from('bereal_schedule')
    .upsert(
      { user_id: userId, notify_at: notifyAt.toISOString(), sent: false, date: today },
      { onConflict: 'user_id,date' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, scheduledFor: notifyAt.toISOString() });
}
