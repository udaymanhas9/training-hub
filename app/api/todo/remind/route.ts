import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendPushToUser } from '@/lib/push';
import { isCardDone } from '@/lib/board';
import type { Board, BoardCard } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

const TZ = 'Europe/London';

// Cards store reminderTime as a bare "HH:MM" local to this timezone — no UTC
// offset involved, so this must match wherever the user actually is.
function nowLondon(): { date: string; hm: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hm: `${get('hour')}:${get('minute')}` };
}

interface BoardRow {
  user_id: string;
  data: Board;
}

// Auth: either the Vercel/GitHub Actions cron secret (process everyone) or a
// logged-in user's token (process only their own board). Mirrors /api/finance/track.
async function authorize(req: NextRequest): Promise<string | 'all' | null> {
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return null;

  if (process.env.CRON_SECRET && auth === process.env.CRON_SECRET) return 'all';

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user } } = await anon.auth.getUser(auth);
  return user?.id ?? null;
}

// A card reminds once per local calendar day: repeating cards use isCardDone's
// own period logic (still pending this period); one-off cards must be due today.
function cardDueForReminder(card: BoardCard, today: string, hm: string): boolean {
  if (!card.reminderTime || hm < card.reminderTime) return false;
  if (card.lastReminderKey === today) return false;
  return card.repeat ? !isCardDone(card) : (!card.completed && card.dueDate === today);
}

async function processRow(db: SupabaseClient, row: BoardRow, today: string, hm: string): Promise<number> {
  const toNotify = row.data.lists
    .flatMap(list => list.cards)
    .filter(card => cardDueForReminder(card, today, hm));
  if (toNotify.length === 0) return 0;

  const notifyIds = new Set(toNotify.map(c => c.id));
  const lists = row.data.lists.map(list => ({
    ...list,
    cards: list.cards.map(card => notifyIds.has(card.id) ? { ...card, lastReminderKey: today } : card),
  }));

  for (const card of toNotify) {
    await sendPushToUser(db, row.user_id, {
      title: 'Training Hub',
      body: card.title,
      url: '/todo',
      tag: `todo-${card.id}`,
    });
  }

  await db.from('todo_board').update({ data: { ...row.data, lists } }).eq('user_id', row.user_id);
  return toNotify.length;
}

// POST /api/todo/remind
// Header: Authorization: Bearer <CRON_SECRET | supabase access token>
export async function POST(req: NextRequest) {
  const scope = await authorize(req);
  if (scope === null) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { date: today, hm } = nowLondon();

  let q = db.from('todo_board').select('user_id, data');
  if (scope !== 'all') q = q.eq('user_id', scope);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data as BoardRow[]) ?? [];
  let sent = 0;
  for (const row of rows) {
    try {
      sent += await processRow(db, row, today, hm);
    } catch (err) {
      console.error('todo remind failed for', row.user_id, err);
    }
  }

  return NextResponse.json({ checked: rows.length, sent });
}

// GET support so a simple curl/cron caller can trigger it too.
export async function GET(req: NextRequest) {
  return POST(req);
}
