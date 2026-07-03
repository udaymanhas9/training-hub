import { Todo, TodoRepeat } from './types';
import { format } from 'date-fns';

// One-Month Grad Role Push — seeded onto the task page.
// Daily/weekly goals become repeating todos, each carrying its bare-minimum
// fallback after a ' · min: ' delimiter (the UI renders that as a muted subtitle).
// One-off setup tasks are high-priority and due this week.
// The mission statement and rules stay in the source doc — they're reference, not tasks.

// Bump when the wording changes so existing accounts get the new copy cleanly.
export const GRAD_SCHEDULE_VERSION = '2';

// Delimiter separating the ideal action from its bare-minimum fallback.
export const MIN_DELIM = ' · min: ';

// Current one-off setup tasks (no ' · min: ' delimiter, so listed explicitly).
const SETUP_TEXTS = [
  'Build target list — 25 companies across big tech, quant, and systems & semis, with every open date and deadline in the calendar',
  'Send 8–10 applications to currently-open rolling roles',
  'Draft 6 STAR stories — Fiduciam ×3, Aixtron, boxing club secretary, basketball captaincy',
  'Two CV variants — quant/systems (lead with C++, Orchard, numerics) and general SWE (lead with Fiduciam production work)',
  'Orchard benchmark README — the AMX vs MPS crossover, legible to a stranger in 5 min',
];

// Every setup-task text ever seeded (current + legacy) so a version bump can
// find and clear the old ones. Daily/weekly tasks are matched by MIN_DELIM instead.
const KNOWN_SETUP_TEXTS = new Set<string>([
  ...SETUP_TEXTS,
  // v1
  'Target list — ~25 companies in 3 buckets, every open date & deadline in the calendar',
  'Send 8–10 applications to currently-open rolling roles',
  'Draft 6 STAR stories — Fiduciam ×3, Aixtron, boxing secretary, basketball captaincy',
  'Two CV variants — quant/systems (C++, Orchard, numerics) + general SWE (Fiduciam)',
  'Orchard benchmark README — AMX vs MPS crossover, legible in 5 min',
]);

/** True if a todo was seeded by this schedule (any version), so it can be replaced. */
export function isGradScheduleText(text: string): boolean {
  return text.includes(MIN_DELIM) || KNOWN_SETUP_TEXTS.has(text);
}

type Seed = { text: string; priority?: Todo['priority']; repeat?: TodoRepeat; due?: string };

// Coming Sunday (today if already Sunday) — the "this week" deadline for setup tasks.
function comingSunday(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return format(d, 'yyyy-MM-dd');
}

export function buildGradScheduleTodos(): Todo[] {
  const createdAt = new Date().toISOString();
  const due = comingSunday();
  const daily: TodoRepeat = { type: 'daily' };
  const weekly: TodoRepeat = { type: 'weekly' };

  const seeds: Seed[] = [
    // ── Daily goals (ideal · min: bare minimum) ─────────────────────────────
    { text: 'Wake 6:30 — alarm across the room, no phone until 7:30 · min: up before the house wakes, phone stays out of the bedroom', repeat: daily },
    { text: 'Stretch 10 min — hips, hamstrings, shoulders · min: 10 min, any routine — this one never drops', repeat: daily },
    { text: 'LeetCode 7:00–9:00 — 2 timed mediums + review the pattern behind each · min: 1 timed problem, 30 min on the clock', repeat: daily, priority: 'high' },
    { text: 'Deep track 9:30–12:00 — M/W/F: Orchard + C++/systems · Tu/Th: green book + 15 min Zetamac · min: 20 min green book or 15 min Zetamac', repeat: daily, priority: 'high' },
    { text: 'GF call 12:30–13:30 — her evening, phone away from the deep block · min: short check-in message', repeat: daily },
    { text: 'Applications 13:30–15:00 — submit apps, chase referrals, clear pending OAs · min: 1 application or 1 referral message', repeat: daily, priority: 'high' },
    { text: 'Gym / run 15:00–16:30 — full 1.5 hr session · min: 20-min run or brisk walk', repeat: daily },
    { text: 'Evening reading 30–40 min — DDIA / systems architecture · min: first thing to drop — OK to skip', repeat: daily },
    { text: 'Sleep — screens off 22:00, lights out by 22:30 · min: in bed within 1 hr of normal', repeat: daily },

    // ── Weekly goals ────────────────────────────────────────────────────────
    { text: 'LeetCode — 15 problems this week, grouped by pattern · min: 7 problems, all timed', repeat: weekly, priority: 'high' },
    { text: 'Timed set — 2 mediums back-to-back in 70 min, once this week · min: covered by the daily problems', repeat: weekly },
    { text: 'Applications — 8–10 submitted this week · min: 4 submitted', repeat: weekly, priority: 'high' },
    { text: 'Mock interview — Saturday, friend or platform, talking out loud · min: solo timed set, talking through it out loud', repeat: weekly },
    { text: 'Orchard — ship the benchmark README (AMX vs MPS crossover) · min: 1 focused Orchard session', repeat: weekly, priority: 'high' },
    { text: 'Green book — 2 chapters + all exercises · min: 1 chapter', repeat: weekly },
    { text: 'Sunday review — 45 min: update pipeline, log what shipped, plan next week · min: 15 min — pipeline check + plan Monday', repeat: weekly },

    // ── One-off setup tasks (due this week) ─────────────────────────────────
    ...SETUP_TEXTS.map(text => ({ text, priority: 'high' as const, due })),
  ];

  return seeds.map(s => ({
    id: crypto.randomUUID(),
    text: s.text,
    completed: false,
    dueDate: s.due,
    priority: s.priority ?? 'normal',
    repeat: s.repeat,
    createdAt,
  }));
}
