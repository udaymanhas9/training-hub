// Server-side only — never import this in client components
import { GarminConnect } from '@flow-js/garmin-connect';
import type { IActivity } from '@flow-js/garmin-connect/dist/garmin/types/activity';
import { createClient } from '@supabase/supabase-js';
import type { StravaActivity } from './types';

// Cache the authenticated client for 50 minutes so repeated API calls within
// the same warm serverless instance don't re-login and hit the SSO rate limit.
let _cachedClient: GarminConnect | null = null;
let _cacheExpiry = 0;

export async function createGarminClient(): Promise<GarminConnect> {
  if (!process.env.GARMIN_USERNAME || !process.env.GARMIN_PASSWORD) {
    throw new Error('GARMIN_USERNAME and GARMIN_PASSWORD env vars are required');
  }

  if (_cachedClient && Date.now() < _cacheExpiry) {
    return _cachedClient;
  }

  const client = new GarminConnect({
    username: process.env.GARMIN_USERNAME,
    password: process.env.GARMIN_PASSWORD,
  });
  await client.login();

  _cachedClient = client;
  _cacheExpiry  = Date.now() + 50 * 60 * 1000; // 50 min TTL
  return client;
}

export function mapGarminActivity(a: IActivity): StravaActivity {
  return {
    id:                  a.activityId,
    name:                a.activityName ?? 'Garmin Activity',
    type:                a.activityType?.typeKey ?? 'other',
    distance:            a.distance ?? 0,
    movingTime:          Math.round(a.movingDuration ?? a.duration ?? 0),
    elapsedTime:         Math.round(a.elapsedDuration ?? a.duration ?? 0),
    totalElevationGain:  a.elevationGain ?? 0,
    startDate:           a.startTimeGMT
                           ? new Date(a.startTimeGMT).toISOString()
                           : a.startTimeLocal,
    averageSpeed:        a.averageSpeed ?? 0,
    maxSpeed:            a.maxSpeed ?? 0,
    averageHeartrate:    a.averageHR || undefined,
    maxHeartrate:        a.maxHR || undefined,
    averageCadence:      a.averageRunningCadenceInStepsPerMinute || undefined,
    calories:            a.calories || undefined,
    mapPolyline:         undefined, // requires separate GPX download per activity
    startLatlng:         (a.startLatitude && a.startLongitude)
                           ? [a.startLatitude, a.startLongitude]
                           : undefined,
    splits:              undefined, // requires getActivity() detail call per activity
  };
}

// ── Shared sync ──────────────────────────────────────────────────────────────
// Pulls activities + VO2 max + daily health metrics into Supabase for HEALTH_USER_ID.
// Used by both the webhook route (/api/garmin/sync) and the in-app refresh route.
// Throws if Garmin login fails; per-section errors are reported in the result.

export type GarminSyncResult = Record<string, string>;

export async function runGarminSync(
  opts: { activityLimit?: number; healthDays?: number } = {},
): Promise<GarminSyncResult> {
  const activityLimit = opts.activityLimit ?? 50;
  const healthDays    = opts.healthDays    ?? 7;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const userId = process.env.HEALTH_USER_ID!;

  const client = await createGarminClient(); // throws on login failure
  const results: GarminSyncResult = {};

  // ── Activities + VO2 max ────────────────────────────────────────────────────
  try {
    const activities = await client.getActivities(0, activityLimit);
    const rows = activities.map(a => {
      const m = mapGarminActivity(a);
      return {
        id: m.id, user_id: userId, name: m.name, type: m.type,
        distance: m.distance, moving_time: m.movingTime, elapsed_time: m.elapsedTime,
        total_elevation_gain: m.totalElevationGain, start_date: m.startDate,
        average_speed: m.averageSpeed, max_speed: m.maxSpeed,
        average_heartrate: m.averageHeartrate ?? null, max_heartrate: m.maxHeartrate ?? null,
        average_cadence: m.averageCadence ?? null, calories: m.calories ?? null,
        map_polyline: null, splits: null, start_latlng: m.startLatlng ?? null,
      };
    });

    const { error } = await supabase.from('strava_activities').upsert(rows, { onConflict: 'id' });
    results.activities = error ? `error: ${error.message}` : `synced ${rows.length} activities`;

    // Each Garmin activity carries the estimated VO2 max at that time; keep the highest per day.
    const vo2ByDate = new Map<string, number>();
    for (const a of activities) {
      if (!a.vO2MaxValue || a.vO2MaxValue <= 0) continue;
      const date = a.startTimeLocal.slice(0, 10);
      if (!vo2ByDate.has(date) || a.vO2MaxValue > vo2ByDate.get(date)!) vo2ByDate.set(date, a.vO2MaxValue);
    }
    const vo2Rows = Array.from(vo2ByDate.entries()).map(([date, value]) => ({
      user_id: userId, type: 'vo2max', value, unit: 'mL/kg/min', date, timestamp: new Date(date).toISOString(),
    }));
    if (vo2Rows.length > 0) {
      const { error: vo2Err } = await supabase.from('health_metrics').upsert(vo2Rows, { onConflict: 'user_id,type,date' });
      results.vo2max = vo2Err ? `error: ${vo2Err.message}` : `synced ${vo2Rows.length} VO2 max readings`;
    } else {
      results.vo2max = 'no VO2 max data in activities';
    }
  } catch (err) {
    results.activities = `error: ${String(err)}`;
  }

  // ── Health metrics (last N days) ────────────────────────────────────────────
  const healthRows: { user_id: string; type: string; value: number; unit: string; date: string; timestamp: string }[] = [];
  for (let i = 0; i < healthDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const timestamp = date.toISOString();

    try {
      const steps = await client.getSteps(date);
      if (steps > 0) healthRows.push({ user_id: userId, type: 'steps', value: steps, unit: 'count', date: dateStr, timestamp });
    } catch { /* no step data */ }

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
    } catch { /* no sleep data */ }
  }

  if (healthRows.length > 0) {
    const { error } = await supabase.from('health_metrics').upsert(healthRows, { onConflict: 'user_id,type,date' });
    results.healthMetrics = error ? `error: ${error.message}` : `synced ${healthRows.length} metrics across ${healthDays} days`;
  } else {
    results.healthMetrics = 'no health data returned';
  }

  return results;
}
