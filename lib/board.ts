import { Board, BoardCard, BoardLabel, BoardList, TodoRepeat } from './types';
import { format, startOfWeek, startOfMonth } from 'date-fns';

export function uid(): string {
  return crypto.randomUUID();
}

function todayStr()    { return format(new Date(), 'yyyy-MM-dd'); }
function tomorrowStr() { return format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'); }

// Default label palette — Trello-ish colours, names blank until the user sets them.
export const DEFAULT_LABELS: BoardLabel[] = [
  { id: 'lbl-green',  name: '', color: '#22c55e' },
  { id: 'lbl-yellow', name: '', color: '#eab308' },
  { id: 'lbl-orange', name: '', color: '#f97316' },
  { id: 'lbl-red',    name: '', color: '#ef4444' },
  { id: 'lbl-purple', name: '', color: '#a855f7' },
  { id: 'lbl-blue',   name: '', color: '#3b82f6' },
  { id: 'lbl-sky',    name: '', color: '#38bdf8' },
  { id: 'lbl-slate',  name: '', color: '#64748b' },
];

export function defaultBoard(): Board {
  const mk = (title: string): BoardList => ({ id: uid(), title, cards: [] });
  return {
    lists: [mk('To Do'), mk('In Progress'), mk('Done')],
    labels: DEFAULT_LABELS.map(l => ({ ...l })),
  };
}

export function newCard(title: string): BoardCard {
  return {
    id: uid(),
    title,
    labelIds: [],
    checklist: [],
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

export function intervalDays(r: TodoRepeat): number {
  if (r.type === 'daily')   return 1;
  if (r.type === 'weekly')  return 7;
  if (r.type === 'monthly') return 30;
  return r.every ?? 1;
}

export function repeatLabel(r?: TodoRepeat): string {
  if (!r) return '';
  if (r.type === 'daily')   return 'Daily';
  if (r.type === 'weekly')  return 'Weekly';
  if (r.type === 'monthly') return 'Monthly';
  return `Every ${r.every ?? 1}d`;
}

// A repeating card counts as done only within the current calendar period,
// so it re-surfaces as a task when that period rolls over (all in local time):
//   daily   → resets at local midnight
//   weekly  → resets Monday 00:00
//   monthly → resets on the 1st
//   custom  → rolling window of N days from completion
export function isCardDone(card: BoardCard): boolean {
  if (!card.completed) return false;
  if (!card.repeat)    return true;
  if (!card.completedAt) return false;
  const completed = new Date(card.completedAt);
  switch (card.repeat.type) {
    case 'daily':
      return format(completed, 'yyyy-MM-dd') === todayStr();
    case 'weekly':
      return completed >= startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday 00:00
    case 'monthly':
      return completed >= startOfMonth(new Date());
    case 'custom': {
      const days = (Date.now() - completed.getTime()) / 86400000;
      return days < intervalDays(card.repeat);
    }
  }
}

// Colour-coded due-date pill, Trello-style.
export function dueMeta(
  dueDate: string | undefined,
  done: boolean,
): { text: string; bg: string; fg: string } | null {
  if (!dueDate) return null;
  const today = todayStr();
  const tomorrow = tomorrowStr();
  const text =
    dueDate === today ? 'Today'
    : dueDate === tomorrow ? 'Tomorrow'
    : format(new Date(dueDate + 'T00:00:00'), 'MMM d');
  if (done)                  return { text, bg: 'rgba(34,197,94,0.15)',  fg: '#4ade80' };
  if (dueDate < today)       return { text, bg: 'rgba(239,68,68,0.15)',  fg: '#f87171' };
  if (dueDate === today)     return { text, bg: 'rgba(249,115,22,0.16)', fg: '#fb923c' };
  if (dueDate === tomorrow)  return { text, bg: 'rgba(234,179,8,0.14)',  fg: '#facc15' };
  return { text, bg: 'rgba(255,255,255,0.06)', fg: '#94a3b8' };
}

export function checklistProgress(card: BoardCard): { done: number; total: number } {
  return {
    done: card.checklist.filter(i => i.done).length,
    total: card.checklist.length,
  };
}

/** Locate a card by id → [listIndex, cardIndex], or null. */
export function locateCard(board: Board, cardId: string): [number, number] | null {
  for (let li = 0; li < board.lists.length; li++) {
    const ci = board.lists[li].cards.findIndex(c => c.id === cardId);
    if (ci !== -1) return [li, ci];
  }
  return null;
}
