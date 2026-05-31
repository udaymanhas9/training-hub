// Server-side only — never import this in client components
import { GarminConnect } from '@flow-js/garmin-connect';
import type { IActivity } from '@flow-js/garmin-connect/dist/garmin/types/activity';
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
