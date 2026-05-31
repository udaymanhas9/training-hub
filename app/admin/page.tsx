'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ADMIN_EMAIL, ADMIN_ONLY_PREFIXES } from '@/lib/admin';
import { getSessionCount, getWorkouts, getSessionDates, getRecentSessions } from '@/lib/storage';
import { getSessionsThisWeek, getCurrentStreak } from '@/lib/utils';
import { WorkoutDefinition, SessionLog } from '@/lib/types';

const CARD: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.07)',
  overflow: 'hidden',
};

const PUBLIC_ROUTES = ['/', '/workout/*', '/calendar', '/progress', '/stats', '/review', '/runs'];
const ADMIN_ROUTES  = ['/lab/*', '/bereal', '/admin'];

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: `${color}18`, border: `1px solid ${color}30`, color,
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
    <div style={{ minHeight: '100vh', background: '#0f0f0f', paddingBottom: 48 }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 18px 0' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: -0.5 }}>
              Admin panel
            </h1>
            <Badge label="Admin only" color="#fbbf24" />
          </div>
          <p style={{ fontSize: 14, color: '#555', margin: 0 }}>
            Signed in as <span style={{ color: '#888' }}>{user?.email}</span>
          </p>
        </div>

        {/* Access control */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 14 }}>Access control</div>
          <div style={CARD}>
            {/* Public section */}
            <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Training Hub</div>
                <Badge label="Public" color="#4ade80" />
              </div>
              <div style={{ fontSize: 13, color: '#444', marginBottom: 8 }}>
                Any signed-in user can access these routes:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PUBLIC_ROUTES.map(r => (
                  <span key={r} style={{
                    fontSize: 12, color: '#555', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '2px 8px',
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
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>The Lab · BeReal · Admin</div>
                <Badge label="Admin only" color="#fbbf24" />
              </div>
              <div style={{ fontSize: 13, color: '#444', marginBottom: 8 }}>
                Restricted to <span style={{ color: '#888', fontFamily: 'monospace' }}>{ADMIN_EMAIL}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ADMIN_ROUTES.map(r => (
                  <span key={r} style={{
                    fontSize: 12, color: '#666', background: 'rgba(251,191,36,0.06)',
                    border: '1px solid rgba(251,191,36,0.15)', borderRadius: 6, padding: '2px 8px',
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
          <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 14 }}>App stats</div>
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
                  borderBottom: isLastRow ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  borderRight: isRight ? 'none' : '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 14 }}>Recent sessions</div>
            <div style={CARD}>
              {recentSessions.map((session, idx) => {
                const workout = workouts.find(w => w.id === session.workoutId);
                const isLast = idx === recentSessions.length - 1;
                return (
                  <div key={session.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 18px',
                    borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{workout?.name || 'Workout'}</div>
                      <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{session.date}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#444' }}>{session.durationMinutes} min</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Supabase link */}
        <div style={{ ...CARD, padding: '16px 18px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Supabase dashboard</div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
            Manage users, view all data, and configure RLS policies.
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', padding: '9px 18px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, color: '#888', fontSize: 13, fontWeight: 500,
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
