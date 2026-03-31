import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const TAG_COLORS: Record<string, string> = {
  "💪 Main Lift": "#ef4444",
  "⚡ Power": "#8b5cf6",
  Hypertrophy: "#f59e0b",
  Endurance: "#10b981",
  Isolation: "#06b6d4",
  "Posterior Chain": "#f97316",
  Activation: "#84cc16",
  Mobility: "#ec4899",
  Cardio: "#3b82f6",
  Stretch: "#64748b",
};

export const WORKOUT_TYPE_COLORS: Record<string, string> = {
  legs: '#ef4444',
  push: '#f97316',
  pull: '#3b82f6',
  run: '#10b981',
  custom: '#8b5cf6',
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
