import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runGarminSync } from '@/lib/garmin';
import { isAdmin } from '@/lib/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

// POST /api/garmin/refresh
// Header: Authorization: Bearer <supabase_access_token>
// In-app manual sync — verifies the logged-in user is the admin, then pulls
// a lighter, faster window than the full webhook sync.
export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const results = await runGarminSync({ activityLimit: 30, healthDays: 4 });
    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    return NextResponse.json({ error: `Garmin sync failed: ${String(err)}` }, { status: 502 });
  }
}
