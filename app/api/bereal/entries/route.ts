import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/bereal/entries
export async function GET() {
  const userId = process.env.HEALTH_USER_ID!;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await db
    .from('bereal_entries')
    .select('id, back_photo_url, front_photo_url, captured_at')
    .eq('user_id', userId)
    .order('captured_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}
