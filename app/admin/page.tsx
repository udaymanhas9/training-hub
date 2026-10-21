'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ADMIN_EMAIL, ADMIN_ONLY_PREFIXES } from '@/lib/admin';
import { getSessionCount, getWorkouts, getSessionDates, getRecentSessions } from '@/lib/storage';
import { getSessionsThisWeek, getCurrentStreak } from '@/lib/utils';
import { WorkoutDefinition, SessionLog } from '@/lib/types';
import { tint } from '@/lib/theme';

const CARD: React.CSSProperties = {
  background: 'var(--surface-4)',
  borderRadius: 16,
  border: '1px solid rgb(var(--ink-rgb) / 0.07)',
  overflow: 'hidden',
};

const PUBLIC_ROUTES = ['/', '/workout/*', '/calendar', '/progress', '/stats', '/review', '/runs'];
const ADMIN_ROUTES  = ['/lab/*', '/blogs', '/admin'];

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: `${tint(color, 0.09)}`, border: `1px solid ${tint(color, 0.19)}`, color,
    }}>
      {label}
    </span>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [totalSessions, setTotalSessions] = useState(0);
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [sessionDates, setSessionDates] = useState<{ date: string; workoutId: string }[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionLog[]>([]);

  useEffect(() => {
    async function load() {
      const [count, w, dates, recent] = await Promise.all([
        getSessionCount(),
        getWorkouts(),
        getSessionDates(),
        getRecentSessions(5),
      ]);
      setTotalSessions(count);
      setWorkouts(w);
      setSessionDates(dates);
      setRecentSessions(recent);
    }
    load();
  }, []);

  const thisWeek  = getSessionsThisWeek(sessionDates);
  const streak    = getCurrentStreak(sessionDates);
  const coreCount = workouts.filter(w => ['legs', 'push', 'pull', 'run'].includes(w.type)).length;
  const customCount = workouts.filter(w => w.type === 'custom').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-1)', paddingBottom: 48 }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 18px 0' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-strong)', margin: 0, letterSpacing: -0.5 }}>
              Admin panel
            </h1>
            <Badge label="Admin only" color="var(--warning-2)" />
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-neutral-dim)', margin: 0 }}>
            Signed in as <span style={{ color: 'var(--text-neutral-mid)' }}>{user?.email}</span>
          </p>
        </div>

        {/* Access control */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 14 }}>Access control</div>
          <div style={CARD}>
            {/* Public section */}
            <div style={{ padding: '16px 18px', borderBottom: '1px solid rgb(var(--ink-rgb) / 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>Training Hub</div>
                <Badge label="Public" color="var(--success-3)" />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-neutral-ghost)', marginBottom: 8 }}>
                Any signed-in user can access these routes:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PUBLIC_ROUTES.map(r => (
                  <span key={r} style={{
                    fontSize: 12, color: 'var(--text-neutral-dim)', background: 'rgb(var(--ink-rgb) / 0.04)',
                    border: '1px solid rgb(var(--ink-rgb) / 0.07)', borderRadius: 6, padding: '2px 8px',
                    fontFamily: 'monospace',
                  }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Admin-only sections */}
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>The Lab · Blogs · Admin</div>
                <Badge label="Admin only" color="var(--warning-2)" />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-neutral-ghost)', marginBottom: 8 }}>
                Restricted to <span style={{ color: 'var(--text-neutral-mid)', fontFamily: 'monospace' }}>{ADMIN_EMAIL}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ADMIN_ROUTES.map(r => (
                  <span key={r} style={{
                    fontSize: 12, color: 'var(--text-neutral-low)', background: 'rgb(var(--warning-2-rgb) / 0.06)',
                    border: '1px solid rgb(var(--warning-2-rgb) / 0.15)', borderRadius: 6, padding: '2px 8px',
                    fontFamily: 'monospace',
                  }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* App stats */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 14 }}>App stats</div>
          <div style={{ ...CARD, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {[
              { label: 'Total sessions', value: totalSessions },
              { label: 'This week', value: thisWeek },
              { label: 'Current streak', value: `${streak} days` },
              { label: 'Core workouts', value: coreCount },
              { label: 'Custom workouts', value: customCount },
              { label: 'Workouts total', value: workouts.length },
            ].map(({ label, value }, idx) => {
              const isRight = idx % 2 === 1;
              const isLastRow = idx >= 4;
              return (
                <div key={label} style={{
                  padding: '16px 18px',
                  borderBottom: isLastRow ? 'none' : '1px solid rgb(var(--ink-rgb) / 0.05)',
                  borderRight: isRight ? 'none' : '1px solid rgb(var(--ink-rgb) / 0.05)',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: -0.5 }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-neutral-dim)', marginTop: 4 }}>{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 14 }}>Recent sessions</div>
            <div style={CARD}>
              {recentSessions.map((session, idx) => {
                const workout = workouts.find(w => w.id === session.workoutId);
                const isLast = idx === recentSessions.length - 1;
                return (
                  <div key={session.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 18px',
                    borderBottom: isLast ? 'none' : '1px solid rgb(var(--ink-rgb) / 0.05)',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{workout?.name || 'Workout'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-neutral-dim)', marginTop: 2 }}>{session.date}</div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-neutral-ghost)' }}>{session.durationMinutes} min</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Supabase link */}
        <div style={{ ...CARD, padding: '16px 18px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 4 }}>Supabase dashboard</div>
          <div style={{ fontSize: 13, color: 'var(--text-neutral-dim)', marginBottom: 12 }}>
            Manage users, view all data, and configure RLS policies.
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', padding: '9px 18px',
              background: 'rgb(var(--ink-rgb) / 0.06)', border: '1px solid rgb(var(--ink-rgb) / 0.1)',
              borderRadius: 10, color: 'var(--text-neutral-mid)', fontSize: 13, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Open Supabase →
          </a>
        </div>
      </div>
    </div>
  );
}
