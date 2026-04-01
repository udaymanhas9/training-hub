import { NextRequest, NextResponse } from 'next/server';

// GET /api/strava/callback?code=...
// Exchanges the code for tokens then hands off to the client page to save them.
export async function GET(request: NextRequest) {
  const code  = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/runs?strava=denied`);
  }

  try {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type:    'authorization_code',
      }),
    });

    const data = await res.json();
    if (!data.access_token) {
      return NextResponse.redirect(`${appUrl}/runs?strava=error`);
    }

    // Hand off tokens to the client — the runs page saves them via the
    // browser Supabase session (which has the user's auth cookie).
    const params = new URLSearchParams({
      strava:    'save',
      at:        data.access_token,
      rt:        data.refresh_token,
      exp:       String(data.expires_at),
      athlete:   String(data.athlete?.id ?? ''),
    });

    return NextResponse.redirect(`${appUrl}/runs?${params}`);
  } catch {
    return NextResponse.redirect(`${appUrl}/runs?strava=error`);
  }
}
