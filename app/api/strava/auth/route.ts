import { NextResponse } from 'next/server';

// GET /api/strava/auth  → redirects to Strava OAuth
export async function GET() {
  const clientId   = process.env.STRAVA_CLIENT_ID!;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${appUrl}/api/strava/callback`;

  const url = new URL('https://www.strava.com/oauth/authorize');
  url.searchParams.set('client_id',      clientId);
  url.searchParams.set('response_type',  'code');
  url.searchParams.set('redirect_uri',   redirectUri);
  url.searchParams.set('approval_prompt','auto');
  url.searchParams.set('scope',          'read,activity:read_all');

  return NextResponse.redirect(url.toString());
}
