import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const TAG_COLORS: Record<string, string> = {
  "💪 Main Lift": "var(--danger)",
  "⚡ Power": "var(--violet)",
  Hypertrophy: "var(--warning)",
  Endurance: "var(--success)",
  Isolation: "var(--cyan)",
  "Posterior Chain": "var(--orange)",
  Activation: "var(--lime)",
  Mobility: "var(--magenta)",
  Cardio: "var(--info)",
  Stretch: "var(--text-subtle)",
};

export const WORKOUT_TYPE_COLORS: Record<string, string> = {
  legs: 'var(--danger)',
  push: 'var(--orange)',
  pull: 'var(--info)',
  run: 'var(--success)',
  custom: 'var(--violet)',
};

export function formatLastTrained(dateStr: string | undefined): string {
  if (!dateStr) return 'Never';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

export function getSessionsThisWeek(sessions: { date: string }[]): number {
  const now = new Date();
  const weekStart = getWeekStart(now);
  return sessions.filter(s => {
    try {
      return parseISO(s.date) >= weekStart;
    } catch {
      return false;
    }
  }).length;
}

export function getCurrentStreak(sessions: { date: string }[]): number {
  if (sessions.length === 0) return 0;
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const today = todayISO();
  let streak = 0;
  let current = new Date(today);

  const dateset = new Set(sorted.map(s => s.date.slice(0, 10)));

  while (true) {
    const key = format(current, 'yyyy-MM-dd');
    if (dateset.has(key)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
