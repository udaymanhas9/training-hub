import { NextRequest, NextResponse } from 'next/server';
import { StravaActivity, StravaSplit } from '@/lib/types';

async function refreshToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number;
} | null> {
  try {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    });
    const data = await res.json();
    if (!data.access_token) return null;
    return { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
  } catch {
    return null;
  }
}

function mapActivity(raw: Record<string, unknown>): StravaActivity {
  const map = raw.map as Record<string, unknown> | undefined;
  const splits = (raw.splits_metric as Record<string, unknown>[] | undefined) ?? [];
  return {
    id:                  raw.id as number,
    name:                raw.name as string,
    type:                raw.type as string,
    distance:            raw.distance as number,
    movingTime:          raw.moving_time as number,
    elapsedTime:         raw.elapsed_time as number,
    totalElevationGain:  raw.total_elevation_gain as number,
    startDate:           raw.start_date as string,
    averageSpeed:        raw.average_speed as number,
    maxSpeed:            raw.max_speed as number,
    averageHeartrate:    raw.average_heartrate as number | undefined,
    maxHeartrate:        raw.max_heartrate as number | undefined,
    averageCadence:      raw.average_cadence as number | undefined,
    calories:            raw.calories as number | undefined,
    mapPolyline:         map?.summary_polyline as string | undefined,
    startLatlng:         raw.start_latlng as [number, number] | undefined,
    splits: splits.map((s): StravaSplit => ({
      splitIndex:          s.split as number,
      distance:            s.distance as number,
      movingTime:          s.moving_time as number,
      elevationDifference: s.elevation_difference as number,
      averageSpeed:        s.average_speed as number,
      averageHeartrate:    s.average_heartrate as number | undefined,
    })),
  };
}

// POST /api/strava/sync
// Body: { accessToken, refreshToken, expiresAt, after?: number (unix timestamp) }
// Returns: { activities, newAccessToken?, newRefreshToken?, newExpiresAt? }
export async function POST(request: NextRequest) {
  let body: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    after?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let { accessToken, after } = body;
  let tokenUpdate: { newAccessToken: string; newRefreshToken: string; newExpiresAt: number } | undefined;

  // Refresh token if expired
  const nowSecs = Math.floor(Date.now() / 1000);
  if (body.expiresAt < nowSecs + 60) {
    const refreshed = await refreshToken(body.refreshToken);
    if (!refreshed) return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    accessToken  = refreshed.access_token;
    tokenUpdate  = {
      newAccessToken:  refreshed.access_token,
      newRefreshToken: refreshed.refresh_token,
      newExpiresAt:    refreshed.expires_at,
    };
  }

  // Fetch activities — paginate up to 200
  const allActivities: StravaActivity[] = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page:     String(page),
    });
    if (after) params.set('after', String(after));

    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) break;
    const batch = await res.json() as Record<string, unknown>[];
    if (!Array.isArray(batch) || batch.length === 0) break;

    // For each activity, fetch detailed version to get splits
    for (const summary of batch) {
      try {
        const detailRes = await fetch(`https://www.strava.com/api/v3/activities/${summary.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (detailRes.ok) {
          const detail = await detailRes.json();
          allActivities.push(mapActivity(detail));
        } else {
          allActivities.push(mapActivity(summary));
        }
      } catch {
        allActivities.push(mapActivity(summary));
      }
    }

    if (batch.length < perPage) break;
    page++;
    if (page > 4) break; // max 200 on first sync; subsequent syncs use `after`
  }

  return NextResponse.json({ activities: allActivities, ...tokenUpdate });
}
