import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createGarminClient } from '@/lib/garmin';

export const runtime = 'nodejs';
export const maxDuration = 60; // Garmin login + calendar fetches can exceed the default limit

export interface UpcomingWorkout {
  id: number;
  date: string;         // 'YYYY-MM-DD'
  title: string;
  sportTypeKey: string | null;
  duration: number | null;  // seconds
  distance: number | null;  // metres
}

// GET /api/garmin/upcoming
// Header: Authorization: Bearer <supabase_access_token>
export async function GET(request: NextRequest) {
  // Verify Supabase session
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await createGarminClient();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Fetch this month + next month calendar items
    const thisMonth = today.getMonth();
    const thisYear  = today.getFullYear();
    const nextMonth = (thisMonth + 1) % 12;
    const nextYear  = thisMonth === 11 ? thisYear + 1 : thisYear;

    const [calThis, calNext] = await Promise.all([
      client.getMonthCalendarEvents(thisYear, thisMonth),
      client.getMonthCalendarEvents(nextYear, nextMonth),
    ]);

    const allItems = [
      ...(calThis.calendarItems ?? []),
      ...(calNext.calendarItems ?? []),
    ];

    // Filter: anything scheduled on or after today that isn't a completed activity.
    // Garmin uses several itemType values for scheduled items:
    // 'workout', 'scheduledWorkout', 'event', 'note', 'goal' etc.
    // We exclude 'activity' (already done) and blank titles only.
    const EXCLUDED_TYPES = new Set(['activity']);

    // Deduplicate by date+title — Garmin often returns the same scheduled
    // workout twice (once as a training plan entry, once as a workout entry).
    const seen = new Set<string>();
    const upcoming: UpcomingWorkout[] = allItems
      .filter(item =>
        !EXCLUDED_TYPES.has(item.itemType) &&
        item.date >= todayStr &&
        (item.title || item.workoutId)
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter(item => {
        const key = `${item.date}|${(item.title ?? item.workoutId ?? item.id).toString().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10)
      .map(item => ({
        id:           item.id,
        date:         item.date,
        title:        item.title!,
        sportTypeKey: item.sportTypeKey,
        duration:     item.duration,
        distance:     item.distance,
      }));

    return NextResponse.json({ upcoming });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
