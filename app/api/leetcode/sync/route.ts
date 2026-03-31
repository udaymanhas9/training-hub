import { NextRequest, NextResponse } from 'next/server';

const LC_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://leetcode.com',
};

function makeHeaders(session?: string) {
  const h: Record<string, string> = { ...LC_HEADERS };
  if (session) h['Cookie'] = `LEETCODE_SESSION=${session}`;
  return h;
}

export interface SyncSubmission {
  titleSlug: string;
  title: string;
  timestamp: number;  // unix seconds
  lang: string;
  statusDisplay: string;
}

// POST /api/leetcode/sync
// Body: { username: string, session?: string, offset?: number }
// Returns: { submissions: SyncSubmission[], hasMore: boolean }
export async function POST(request: NextRequest) {
  let body: { username?: string; session?: string; offset?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { username, session, offset = 0 } = body;
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const limit = 50;

  try {
    if (session) {
      // Full paginated history (authenticated)
      const query = `
        query submissionList($offset: Int!, $limit: Int!) {
          submissionList(offset: $offset, limit: $limit) {
            lastKey
            hasNext
            submissions {
              id
              title
              titleSlug
              timestamp
              lang
              statusDisplay
            }
          }
        }
      `;
      const res  = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: makeHeaders(session),
        body: JSON.stringify({ query, variables: { offset, limit } }),
      });
      const json = await res.json();
      const list = json?.data?.submissionList;
      if (!list) return NextResponse.json({ error: 'No data — session may be invalid' }, { status: 502 });

      const submissions: SyncSubmission[] = (list.submissions || []).map(
        (s: { titleSlug: string; title: string; timestamp: string; lang: string; statusDisplay: string }) => ({
          titleSlug:     s.titleSlug,
          title:         s.title,
          timestamp:     parseInt(s.timestamp),
          lang:          s.lang,
          statusDisplay: s.statusDisplay,
        })
      );

      return NextResponse.json({ submissions, hasMore: list.hasNext ?? false });
    } else {
      // Public recent AC submissions only
      const query = `
        query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            id
            title
            titleSlug
            timestamp
            lang
          }
        }
      `;
      const res  = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: makeHeaders(),
        body: JSON.stringify({ query, variables: { username, limit } }),
      });
      const json = await res.json();
      const list: { titleSlug: string; title: string; timestamp: string; lang: string }[] =
        json?.data?.recentAcSubmissionList || [];

      const submissions: SyncSubmission[] = list.map(s => ({
        titleSlug:     s.titleSlug,
        title:         s.title,
        timestamp:     parseInt(s.timestamp),
        lang:          s.lang,
        statusDisplay: 'Accepted',
      }));

      return NextResponse.json({ submissions, hasMore: false });
    }
  } catch {
    return NextResponse.json({ error: 'LeetCode API unavailable' }, { status: 502 });
  }
}
