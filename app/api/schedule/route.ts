import { NextRequest, NextResponse } from 'next/server';

interface Commitment {
  id: string;
  label: string;
  days: string[];
  durationMins: number;
}

interface ScheduleConfig {
  workDays: string[];
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  gymTime: 'early' | 'evening';
  commitments: Commitment[];
  notes: string;
}

interface ReviewSummary {
  oneFocus: string;
  nextWeekPriorities: string[];
  bottlenecks: string[];
  progressOnGoals: { quant_ml: string; coding_dsa: string; fitness: string; other: string };
  didntGoWell: string[];
}

// POST /api/schedule
// Body: { week: string, config: ScheduleConfig, reviewData?: ReviewSummary }
export async function POST(req: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });

  const body = await req.json();
  const { week, config, reviewData }: { week: string; config: ScheduleConfig; reviewData?: ReviewSummary } = body;

  // Pre-compute all 7 dates for the week
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekDates = DAY_NAMES.map((_, i) => {
    const d = new Date(week + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const gymNote = config.gymTime === 'early'
    ? `Gym workouts go BEFORE the morning session (e.g. 06:00–07:15)`
    : `Gym workouts go AFTER the afternoon session (e.g. 18:30–20:00)`;

  const commitmentsStr = config.commitments.length > 0
    ? config.commitments
        .map(c => `  - "${c.label}" on ${c.days.join('/')} — ${c.durationMins} min (place within work window)`)
        .join('\n')
    : '  None';

  const reviewStr = reviewData
    ? `
REVIEW DATA FOR NEXT WEEK:
  One Focus: ${reviewData.oneFocus}
  Priorities: ${reviewData.nextWeekPriorities.map((p, i) => `${i + 1}. ${p}`).join(', ')}
  Bottlenecks to fix: ${reviewData.bottlenecks.join(', ')}
  What didn't go well: ${reviewData.didntGoWell.join(', ')}
  Goal progress → Quant/ML: ${reviewData.progressOnGoals.quant_ml}, Coding/DSA: ${reviewData.progressOnGoals.coding_dsa}, Fitness: ${reviewData.progressOnGoals.fitness}
`
    : '';

  const prompt = `You are an elite personal scheduler. Create a realistic, time-blocked weekly schedule.

WEEK: ${week} (Mon) → ${weekDates[6]} (Sun)
AVAILABLE DAYS: ${config.workDays.join(', ')}
WORK WINDOW: Morning ${config.morningStart}–${config.morningEnd} | Afternoon ${config.afternoonStart}–${config.afternoonEnd}
GYM RULE: ${gymNote}
${reviewStr}
RECURRING COMMITMENTS (must be placed on specified days, within work window):
${commitmentsStr}
${config.notes ? `EXTRA NOTES: ${config.notes}` : ''}

ACTIVITIES TO SCHEDULE (fill remaining work-window time with these):
- Gym: rotate Legs / Push / Pull — no same type two days running (types: workout_legs, workout_push, workout_pull)
- Runs: 2–3× per week if not already a recurring commitment (type: run)
- LeetCode deep practice (type: leetcode)
- Quant / math problems (type: quant)
- GitHub project work / deep coding (type: github)
- Study / reading blocks (type: study)
- 15-min breaks after every 90 min block (type: break)

RULES:
1. AVAILABLE DAYS apply only to work/study blocks (LeetCode, Quant, GitHub, study, recurring commitments). Non-available days have isWorkDay: false and no study/work blocks.
2. Gym workouts (workout_legs, workout_push, workout_pull) and runs CAN appear on ANY day of the week, including non-available (rest) days — exercise is not restricted by the work schedule.
3. Gym and runs are OUTSIDE the work window per the gym rule above — place them before morning or after afternoon regardless of which day they fall on.
4. NEVER put a Legs workout (workout_legs) and a Run on the same day.
5. Total gym sessions (workout_legs + workout_push + workout_pull) must not exceed 4 per week.
6. Max 5.5 hrs productive work per day inside the window (not counting gym, runs, or breaks).
7. Do not repeat the same activity in consecutive blocks without a break.
8. All times in HH:MM 24h format.

Return ONLY valid JSON:
{
  "schedule": [
    {
      "day": "Monday",
      "date": "${weekDates[0]}",
      "isWorkDay": true,
      "blocks": [
        { "start": "HH:MM", "end": "HH:MM", "label": "Description", "type": "type_string" }
      ]
    }
  ]
}

Include all 7 days. Non-work days have isWorkDay: false and empty blocks array.
Valid types: workout_legs | workout_push | workout_pull | run | leetcode | quant | github | study | break | fixed`;

  try {
    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 },
        }),
      },
    );

    if (!gemRes.ok) {
      return NextResponse.json({ error: `Gemini error: ${await gemRes.text()}` }, { status: 502 });
    }

    const gemJson = await gemRes.json();
    const raw = gemJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'Could not parse Gemini response' }, { status: 502 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
