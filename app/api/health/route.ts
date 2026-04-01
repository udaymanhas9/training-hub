import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RawMetric {
  type: string;
  value: number;
  unit: string;
  timestamp: string;
}

// POST /api/health
// Header: X-API-Key: <HEALTH_WEBHOOK_SECRET>
// Body: { metrics: [{ type, value, unit, timestamp }] }
export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== process.env.HEALTH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { metrics: RawMetric[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const metrics = body?.metrics;
  if (!Array.isArray(metrics) || metrics.length === 0) {
    return NextResponse.json({ error: 'No metrics provided' }, { status: 400 });
  }

  const userId = process.env.HEALTH_USER_ID!;

  const rows = metrics.map(m => ({
    user_id:   userId,
    type:      m.type,
    value:     m.value,
    unit:      m.unit,
    date:      m.timestamp.slice(0, 10),  // extract yyyy-MM-dd
    timestamp: m.timestamp,
  }));

  const { error } = await supabaseAdmin
    .from('health_metrics')
    .upsert(rows, { onConflict: 'user_id,type,date' });

  if (error) {
    console.error('health_metrics upsert error:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ saved: rows.length });
}
