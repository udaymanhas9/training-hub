import { NextRequest, NextResponse } from 'next/server';

const LC_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://leetcode.com',
};

async function gql(query: string, variables: Record<string, unknown>, session?: string) {
  const headers: Record<string, string> = { ...LC_HEADERS };
  if (session) headers['Cookie'] = `LEETCODE_SESSION=${session}`;
  return fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
}

// GET /api/leetcode?num=1        → lookup by problem number
// GET /api/leetcode?slug=two-sum → lookup by slug
export async function GET(request: NextRequest) {
  const num  = request.nextUrl.searchParams.get('num');
  const slug = request.nextUrl.searchParams.get('slug');

  if (!num && !slug) {
    return NextResponse.json({ error: 'num or slug required' }, { status: 400 });
  }

  try {
    if (slug) {
      const query = `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionFrontendId
            title
            difficulty
            topicTags { name }
          }
        }
      `;
      const res  = await gql(query, { titleSlug: slug });
      const json = await res.json();
      const q    = json?.data?.question;
      if (!q) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({
        number:     q.questionFrontendId,
        name:       q.title,
        difficulty: q.difficulty,
        topics:     q.topicTags.map((t: { name: string }) => t.name),
      });
    }

    // Number-based search
    const query = `
      query problemsetQuestionList($filters: QuestionListFilterInput) {
        problemsetQuestionList: questionList(
          categorySlug: ""
          limit: 10
          skip: 0
          filters: $filters
        ) {
          questions: data {
            difficulty
            frontendQuestionId: questionFrontendId
            title
            titleSlug
            topicTags { name }
          }
        }
      }
    `;
    const res   = await gql(query, { filters: { searchKeywords: num } });
    const json  = await res.json();
    const qs    = json?.data?.problemsetQuestionList?.questions || [];
    const match = qs.find((q: { frontendQuestionId: string }) => q.frontendQuestionId === num);
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      number:     match.frontendQuestionId,
      name:       match.title,
      difficulty: match.difficulty,
      topics:     match.topicTags.map((t: { name: string }) => t.name),
    });

  } catch {
    return NextResponse.json({ error: 'LeetCode API unavailable' }, { status: 502 });
  }
}
