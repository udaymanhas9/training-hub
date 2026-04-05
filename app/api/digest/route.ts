import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function toMonday(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

// GET /api/digest?week=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });

  const userId = process.env.HEALTH_USER_ID;
  if (!userId) return NextResponse.json({ error: 'HEALTH_USER_ID not configured' }, { status: 500 });

  const weekParam = req.nextUrl.searchParams.get('week') ?? new Date().toISOString().slice(0, 10);
  const weekStart = toMonday(weekParam);

  // weekEnd = Sunday (weekStart + 6 days); nextMonday = weekStart + 7 (for lt filter)
  const weekEndDate = new Date(weekStart + 'T00:00:00Z');
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
  const weekEnd = weekEndDate.toISOString().slice(0, 10);

  const nextMondayDate = new Date(weekStart + 'T00:00:00Z');
  nextMondayDate.setUTCDate(nextMondayDate.getUTCDate() + 7);
  const nextMonday = nextMondayDate.toISOString().slice(0, 10);

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [sessRes, runsRes, lcRes, quantRes, sleepRes, profileRes] = await Promise.all([
    db.from('session_log')
      .select('date, workout_id, duration_minutes')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd),

    db.from('strava_activities')
      .select('start_date, distance, moving_time')
      .eq('user_id', userId)
      .gte('start_date', weekStart)
      .lt('start_date', nextMonday),

    db.from('leetcode_log')
      .select('date, difficulty, status')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd),

    db.from('quant_log')
      .select('date, topic, difficulty')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd),

    db.from('health_metrics')
      .select('value, date')
      .eq('user_id', userId)
      .eq('type', 'HKCategoryTypeIdentifierSleepAnalysis')
      .gte('date', weekStart)
      .lte('date', weekEnd),

    db.from('user_profile')
      .select('github_username, github_token')
      .eq('user_id', userId)
      .single(),
  ]);

  const sessions = sessRes.data ?? [];
  const runs     = runsRes.data ?? [];
  const lc       = lcRes.data ?? [];
  const quant    = quantRes.data ?? [];
  const sleep    = sleepRes.data ?? [];
  const profile  = profileRes.data;

  // ── compute objective metrics ────────────────────────────────────────────────

  const workouts  = sessions.length;
  const runCount  = runs.length;
  const totalKm   = runs.reduce((s: number, r: { distance: number }) => s + r.distance / 1000, 0);
  const lcSolved  = lc.filter((e: { status: string }) => e.status === 'Solved').length;
  const quantDone = quant.length;
  const sleepAvg  = sleep.length > 0
    ? sleep.reduce((s: number, r: { value: number }) => s + r.value, 0) / sleep.length
    : null;
  const avgPaceMinKm = runCount > 0
    ? runs.reduce((s: number, r: { moving_time: number; distance: number }) =>
        s + (r.moving_time / 60) / (r.distance / 1000), 0) / runCount
    : null;

  // ── GitHub commits ───────────────────────────────────────────────────────────

  let commits = 0;
  if (profile?.github_username) {
    try {
      const ghHeaders: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };
      if (profile.github_token) ghHeaders.Authorization = `Bearer ${profile.github_token}`;
      const url = profile.github_token
        ? `https://api.github.com/users/${profile.github_username}/events?per_page=100`
        : `https://api.github.com/users/${profile.github_username}/events/public?per_page=100`;
      const ghRes = await fetch(url, { headers: ghHeaders });
      if (ghRes.ok) {
        const events: Array<{ type: string; created_at: string; payload: { commits?: unknown[] } }> = await ghRes.json();
        commits = events
          .filter(e => e.type === 'PushEvent'
            && e.created_at.slice(0, 10) >= weekStart
            && e.created_at.slice(0, 10) <= weekEnd)
          .reduce((s, e) => s + (e.payload.commits?.length ?? 1), 0);
      }
    } catch { /* non-fatal */ }
  }

  // ── Gemini prompt ─────────────────────────────────────────────────────────────

  const paceStr = avgPaceMinKm
    ? `${Math.floor(avgPaceMinKm)}:${String(Math.round((avgPaceMinKm % 1) * 60)).padStart(2, '0')} min/km`
    : 'N/A';

  const prompt = `You are an elite performance coach reviewing a person's week. Based on the data below, generate an honest, specific weekly review.

Week: ${weekStart} to ${weekEnd}

OBJECTIVE DATA:
- Gym workouts completed: ${workouts}
- Runs: ${runCount} (total: ${totalKm.toFixed(1)} km, avg pace: ${paceStr})
- LeetCode problems solved: ${lcSolved}
- Quant/math problems: ${quantDone}
- GitHub commits: ${commits}
- Avg sleep: ${sleepAvg !== null ? sleepAvg.toFixed(1) + ' hrs/night' : 'no data'}

GOOD WEEK BENCHMARKS:
Workouts ≥ 5 | Runs ≥ 3 | LeetCode ≥ 5 | Quant ≥ 3 | Commits ≥ 10 | Sleep ≥ 7.5 hrs

Score the week honestly (1-10). Reference actual numbers in your bullets. Keep each bullet under 8 words.

Return ONLY valid JSON with this exact structure:
{
  "score": <integer 1-10>,
  "wins": [<3-5 specific wins>],
  "didntGoWell": [<2-4 shortfalls>],
  "keyLessons": [<2-3 actionable insights>],
  "progressOnGoals": {
    "quant_ml": "<Poor|Okay|Good|Great>",
    "coding_dsa": "<Poor|Okay|Good|Great>",
    "fitness": "<Poor|Okay|Good|Great>",
    "other": "<Poor|Okay|Good|Great>"
  },
  "bottlenecks": [<2-3 bottlenecks>],
  "nextWeekPriorities": ["<priority 1>", "<priority 2>", "<priority 3>"],
  "systemAdjustments": [<1-3 concrete changes>],
  "oneFocus": "<single most important focus, max 6 words>"
}`;

  try {
    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6 },
        }),
      },
    );

    if (!gemRes.ok) {
      return NextResponse.json({ error: `Gemini error: ${await gemRes.text()}` }, { status: 502 });
    }

    const gemJson = await gemRes.json();
    const raw = gemJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    // Extract the JSON object — handles markdown fences and any surrounding text
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'Could not parse Gemini response' }, { status: 502 });
    const ai = JSON.parse(match[0]);

    return NextResponse.json({
      weekStart,
      weekEnd,
      metrics: {
        workouts,
        runs: runCount,
        totalKm:       parseFloat(totalKm.toFixed(1)),
        lcSolved,
        quantDone,
        commits,
        sleepAvgHrs:   sleepAvg !== null ? parseFloat(sleepAvg.toFixed(1)) : null,
        avgPaceMinKm:  avgPaceMinKm !== null ? parseFloat(avgPaceMinKm.toFixed(2)) : null,
      },
      score:               ai.score,
      wins:                ai.wins,
      didntGoWell:         ai.didntGoWell,
      keyLessons:          ai.keyLessons,
      progressOnGoals:     ai.progressOnGoals,
      bottlenecks:         ai.bottlenecks,
      nextWeekPriorities:  ai.nextWeekPriorities,
      systemAdjustments:   ai.systemAdjustments,
      oneFocus:            ai.oneFocus,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
