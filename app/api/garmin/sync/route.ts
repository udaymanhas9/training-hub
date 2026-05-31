import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createGarminClient, mapGarminActivity } from '@/lib/garmin';

// POST /api/garmin/sync
// Header: X-API-Key: <HEALTH_WEBHOOK_SECRET>
// Body (optional): { activityLimit?: number; healthDays?: number }
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== process.env.HEALTH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { activityLimit?: number; healthDays?: number } = {};
  try { body = await request.json(); } catch { /* no body — use defaults */ }

  const activityLimit = body.activityLimit ?? 50;
  const healthDays    = body.healthDays    ?? 7;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const userId = process.env.HEALTH_USER_ID!;

  let client;
  try {
    client = await createGarminClient();
  } catch (err) {
    return NextResponse.json({ error: `Garmin login failed: ${String(err)}` }, { status: 502 });
  }

  const results: Record<string, string> = {};

  // ── Activities ──────────────────────────────────────────────────────────────
  try {
    const activities = await client.getActivities(0, activityLimit);
    const rows = activities.map(a => {
      const mapped = mapGarminActivity(a);
      return {
        id:                   mapped.id,
        user_id:              userId,
        name:                 mapped.name,
        type:                 mapped.type,
        distance:             mapped.distance,
        moving_time:          mapped.movingTime,
        elapsed_time:         mapped.elapsedTime,
        total_elevation_gain: mapped.totalElevationGain,
        start_date:           mapped.startDate,
        average_speed:        mapped.averageSpeed,
        max_speed:            mapped.maxSpeed,
        average_heartrate:    mapped.averageHeartrate ?? null,
        max_heartrate:        mapped.maxHeartrate ?? null,
        average_cadence:      mapped.averageCadence ?? null,
        calories:             mapped.calories ?? null,
        map_polyline:         null,
        splits:               null,
        start_latlng:         mapped.startLatlng ?? null,
      };
    });

    const { error } = await supabase
      .from('strava_activities')
      .upsert(rows, { onConflict: 'id' });

    results.activities = error
      ? `error: ${error.message}`
      : `synced ${rows.length} activities`;

    // Extract VO2 max readings from activities — each Garmin activity carries
    // the estimated vO2MaxValue at the time of that activity.
    // Deduplicate by date — keep highest VO2 max reading per day
    const vo2ByDate = new Map<string, number>();
    for (const a of activities) {
      if (!a.vO2MaxValue || a.vO2MaxValue <= 0) continue;
      const date = a.startTimeLocal.slice(0, 10);
      if (!vo2ByDate.has(date) || a.vO2MaxValue > vo2ByDate.get(date)!) {
        vo2ByDate.set(date, a.vO2MaxValue);
      }
    }
    const vo2Rows = Array.from(vo2ByDate.entries()).map(([date, value]) => ({
      user_id:   userId,
      type:      'vo2max',
      value,
      unit:      'mL/kg/min',
      date,
      timestamp: new Date(date).toISOString(),
    }));

    if (vo2Rows.length > 0) {
      const { error: vo2Err } = await supabase
        .from('health_metrics')
        .upsert(vo2Rows, { onConflict: 'user_id,type,date' });
      results.vo2max = vo2Err
        ? `error: ${vo2Err.message}`
        : `synced ${vo2Rows.length} VO2 max readings`;
    } else {
      results.vo2max = 'no VO2 max data in activities';
    }
  } catch (err) {
    results.activities = `error: ${String(err)}`;
  }

  // ── Health metrics (last N days) ────────────────────────────────────────────
  const healthRows: {
    user_id: string;
    type: string;
    value: number;
    unit: string;
    date: string;
    timestamp: string;
  }[] = [];

  for (let i = 0; i < healthDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr    = date.toISOString().slice(0, 10);
    const timestamp  = date.toISOString();

    // Steps
    try {
      const steps = await client.getSteps(date);
      if (steps > 0) {
        healthRows.push({ user_id: userId, type: 'steps', value: steps, unit: 'count', date: dateStr, timestamp });
      }
    } catch { /* no step data for this date */ }

    // Sleep duration + resting HR (both from sleep data in one call)
    try {
      const sleepData = await client.getSleepData(date);
      const dto = sleepData?.dailySleepDTO;
      if (dto?.sleepTimeSeconds > 0) {
        const hours = Math.round((dto.sleepTimeSeconds / 3600) * 100) / 100;
        healthRows.push({ user_id: userId, type: 'sleep_duration', value: hours, unit: 'hours', date: dateStr, timestamp });
      }
      if (sleepData.restingHeartRate > 0) {
        healthRows.push({ user_id: userId, type: 'resting_heart_rate', value: sleepData.restingHeartRate, unit: 'bpm', date: dateStr, timestamp });
      }
    } catch { /* no sleep data for this date */ }
  }

  if (healthRows.length > 0) {
    const { error } = await supabase
      .from('health_metrics')
      .upsert(healthRows, { onConflict: 'user_id,type,date' });

    results.healthMetrics = error
      ? `error: ${error.message}`
      : `synced ${healthRows.length} metrics across ${healthDays} days`;
  } else {
    results.healthMetrics = 'no health data returned';
  }

  return NextResponse.json({ success: true, ...results });
}
