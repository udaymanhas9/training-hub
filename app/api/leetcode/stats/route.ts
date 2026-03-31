import { NextRequest, NextResponse } from 'next/server';

const LC_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://leetcode.com',
};

// GET /api/leetcode/stats?username=uday1903
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  try {
    const query = `
      query userStats($username: String!) {
        matchedUser(username: $username) {
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
          profile {
            ranking
          }
          userCalendar {
            activeYears
            streak
            totalActiveDays
            submissionCalendar
          }
        }
        allQuestionsCount {
          difficulty
          count
        }
      }
    `;

    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: LC_HEADERS,
      body: JSON.stringify({ query, variables: { username } }),
    });
    const json = await res.json();
    const user = json?.data?.matchedUser;
    const allQ = json?.data?.allQuestionsCount;

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const acNums: { difficulty: string; count: number }[] = user.submitStatsGlobal?.acSubmissionNum || [];
    const solved = {
      All:    acNums.find(x => x.difficulty === 'All')?.count    ?? 0,
      Easy:   acNums.find(x => x.difficulty === 'Easy')?.count   ?? 0,
      Medium: acNums.find(x => x.difficulty === 'Medium')?.count ?? 0,
      Hard:   acNums.find(x => x.difficulty === 'Hard')?.count   ?? 0,
    };
    const total = {
      All:    allQ?.find((x: { difficulty: string }) => x.difficulty === 'All')?.count    ?? 0,
      Easy:   allQ?.find((x: { difficulty: string }) => x.difficulty === 'Easy')?.count   ?? 0,
      Medium: allQ?.find((x: { difficulty: string }) => x.difficulty === 'Medium')?.count ?? 0,
      Hard:   allQ?.find((x: { difficulty: string }) => x.difficulty === 'Hard')?.count   ?? 0,
    };

    const calendar = user.userCalendar;

    return NextResponse.json({
      solved,
      total,
      ranking:          user.profile?.ranking ?? 0,
      streak:           calendar?.streak ?? 0,
      totalActiveDays:  calendar?.totalActiveDays ?? 0,
      submissionCalendar: calendar?.submissionCalendar ?? '{}',
    });
  } catch {
    return NextResponse.json({ error: 'LeetCode API unavailable' }, { status: 502 });
  }
}
