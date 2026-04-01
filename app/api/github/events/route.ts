import { NextRequest, NextResponse } from 'next/server';

// GET /api/github/events?username=foo&token=ghp_...
// Proxies GitHub Events API server-side so the PAT is never exposed to the client.
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  const token    = request.nextUrl.searchParams.get('token');

  if (!username) {
    return NextResponse.json({ error: 'username required' }, { status: 400 });
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Authenticated endpoint returns both public and private events
  const endpoint = token
    ? `https://api.github.com/users/${username}/events?per_page=100`
    : `https://api.github.com/users/${username}/events/public?per_page=100`;

  const res = await fetch(endpoint, { headers, next: { revalidate: 60 } });

  if (!res.ok) {
    return NextResponse.json(
      { error: `GitHub API error: ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
