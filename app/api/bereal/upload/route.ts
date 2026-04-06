import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/bereal/upload
// FormData: backPhoto (File), frontPhoto (File), capturedAt (string ISO)
export async function POST(req: NextRequest) {
  const userId = process.env.HEALTH_USER_ID!;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const form = await req.formData();
  const backFile  = form.get('backPhoto')  as File | null;
  const frontFile = form.get('frontPhoto') as File | null;
  const capturedAt = (form.get('capturedAt') as string | null) ?? new Date().toISOString();

  if (!backFile || !frontFile) {
    return NextResponse.json({ error: 'Both photos required' }, { status: 400 });
  }

  // Ensure bucket exists (auto-creates on first upload)
  const { data: buckets } = await db.storage.listBuckets();
  if (!buckets?.find(b => b.name === 'bereal')) {
    await db.storage.createBucket('bereal', { public: true });
  }

  const ts = Date.now();
  const backPath  = `${userId}/${ts}_back.jpg`;
  const frontPath = `${userId}/${ts}_front.jpg`;

  const [backBuf, frontBuf] = await Promise.all([
    backFile.arrayBuffer().then(b => Buffer.from(b)),
    frontFile.arrayBuffer().then(b => Buffer.from(b)),
  ]);

  const [backUp, frontUp] = await Promise.all([
    db.storage.from('bereal').upload(backPath,  backBuf,  { contentType: 'image/jpeg', upsert: true }),
    db.storage.from('bereal').upload(frontPath, frontBuf, { contentType: 'image/jpeg', upsert: true }),
  ]);

  if (backUp.error)  return NextResponse.json({ error: backUp.error.message },  { status: 500 });
  if (frontUp.error) return NextResponse.json({ error: frontUp.error.message }, { status: 500 });

  const backUrl  = db.storage.from('bereal').getPublicUrl(backPath).data.publicUrl;
  const frontUrl = db.storage.from('bereal').getPublicUrl(frontPath).data.publicUrl;

  const { data, error } = await db
    .from('bereal_entries')
    .insert({ user_id: userId, back_photo_url: backUrl, front_photo_url: frontUrl, captured_at: capturedAt })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
