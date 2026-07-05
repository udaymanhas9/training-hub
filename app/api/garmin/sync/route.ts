import { NextRequest, NextResponse } from 'next/server';
import { runGarminSync } from '@/lib/garmin';

export const runtime = 'nodejs';
export const maxDuration = 60; // Garmin login + a week of daily calls can be slow

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

  try {
    const results = await runGarminSync({ activityLimit: body.activityLimit, healthDays: body.healthDays });
    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    return NextResponse.json({ error: `Garmin sync failed: ${String(err)}` }, { status: 502 });
  }
}
