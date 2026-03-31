'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWorkouts, getSessions, getProfile, getHealthEntries } from '@/lib/storage';
import { WorkoutDefinition, SessionLog } from '@/lib/types';
import { formatLastTrained, getSessionsThisWeek, getCurrentStreak, formatDate, WORKOUT_TYPE_COLORS } from '@/lib/utils';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [profileName, setProfileName] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [currentBF, setCurrentBF] = useState<number | null>(null);
  const today = format(new Date(), 'EEEE, MMMM d');

  useEffect(() => {
    async function load() {
      const [w, s, p, h] = await Promise.all([
        getWorkouts(),
        getSessions(),
        getProfile(),
        getHealthEntries(),
      ]);
      setWorkouts(w);
      setSessions(s);
      setProfileName(p.name);
      setWeightUnit(p.weightUnit);
      if (h.length > 0) {
        const sorted = [...h].sort((a, b) => b.date.localeCompare(a.date));
        setCurrentWeight(sorted[0].weight);
        setCurrentBF(sorted[0].bodyFatPct ?? null);
      }
    }
    load();
  }, []);

  const totalSessions = sessions.length;
  const thisWeek = getSessionsThisWeek(sessions);
  const streak = getCurrentStreak(sessions);
  const recentSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  function getLastTrainedDate(workoutId: string): string | undefined {
    const s = sessions.filter(x => x.workoutId === workoutId).sort((a, b) => b.date.localeCompare(a.date));
    return s[0]?.date;
  }

  function getWorkoutTypeLabel(type: string) {
    const labels: Record<string, string> = { legs: 'LEG DAY', push: 'PUSH DAY', pull: 'PULL DAY', run: 'RUN DAY', custom: 'CUSTOM' };
    return labels[type] || 'WORKOUT';
  }

  function displayWeight(w: number): string {
    if (weightUnit === 'lbs') return `${Math.round(w * 2.20462)}lbs`;
    return `${w}kg`;
  }

  const coreWorkouts = workouts.filter(w => ['legs', 'push', 'pull', 'run'].includes(w.type));
  const customWorkouts = workouts.filter(w => w.type === 'custom');

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 40 }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f0f0f 0%, #111 50%, #0a0a0a 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '40px 24px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: '#64748b', fontFamily: "'Barlow', sans-serif", fontWeight: 500, marginBottom: 8 }}>
            {today.toUpperCase()}
          </div>
          <h1 style={{ fontSize: 'clamp(42px,8vw,72px)', fontWeight: 900, lineHeight: 0.9, letterSpacing: -1, color: '#fff', fontStyle: 'italic' }}>
            {profileName ? `WELCOME BACK, ${profileName.toUpperCase()}` : 'TRAINING HUB'}
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', letterSpacing: 2, marginTop: 10, fontFamily: "'Barlow', sans-serif" }}>
            Track · Train · Progress
          </p>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 16, marginTop: 28, flexWrap: 'wrap' }}>
            {[
              { label: 'TOTAL SESSIONS', val: totalSessions, color: '#f1f5f9' },
              { label: 'THIS WEEK', val: thisWeek, color: '#10b981' },
              { label: 'DAY STREAK', val: streak, color: '#f97316' },
              ...(currentWeight ? [{ label: 'WEIGHT', val: displayWeight(currentWeight), color: '#3b82f6' }] : []),
              ...(currentBF ? [{ label: 'BODY FAT', val: `${currentBF}%`, color: '#8b5cf6' }] : []),
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 20px', textAlign: 'center', minWidth: 90 }}>
                <div style={{ fontSize: 26, fontWeight: 900, color }}>{val}</div>
                <div style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
        {/* Workout Cards */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 16 }}>YOUR WORKOUTS</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {coreWorkouts.map(workout => {
              const accent = workout.accentColor;
              const lastDate = getLastTrainedDate(workout.id);
              const sessionCount = sessions.filter(s => s.workoutId === workout.id).length;
              return (
                <div key={workout.id} style={{ position: 'relative' }}>
                  <Link href={`/workout/${workout.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{
                      background: '#111',
                      border: `1px solid rgba(255,255,255,0.07)`,
                      borderTop: `3px solid ${accent}`,
                      borderRadius: 10,
                      padding: '20px 18px 20px 18px',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                    >
                      <div style={{
                        position: 'absolute', top: 0, right: 0, width: 80, height: 80,
                        background: `radial-gradient(circle at top right, ${accent}15, transparent 70%)`,
                        pointerEvents: 'none',
                      }} />
                      <div style={{ fontSize: 10, letterSpacing: 4, color: accent, fontFamily: "'Barlow', sans-serif", fontWeight: 500, marginBottom: 6 }}>
                        {getWorkoutTypeLabel(workout.type)}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#f1f5f9', letterSpacing: -0.5, lineHeight: 1, paddingRight: 28 }}>{workout.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginTop: 6, lineHeight: 1.4 }}>{workout.tagline}</div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                        <div style={{ background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 4, padding: '3px 8px' }}>
                          <span style={{ fontSize: 11, color: accent, fontWeight: 700, letterSpacing: 1 }}>{workout.duration}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>
                          {sessionCount > 0 ? `${sessionCount}× logged` : 'Not started'}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 10, color: '#475569', fontFamily: "'Barlow', sans-serif", letterSpacing: 1 }}>
                        {formatLastTrained(lastDate).toUpperCase()}
                      </div>
                    </div>
                  </Link>
                  {/* Edit button */}
                  <Link
                    href={`/edit/${workout.id}`}
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', top: 12, right: 12,
                      background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 5, padding: '4px 7px', textDecoration: 'none',
                      color: '#64748b', fontSize: 11, lineHeight: 1,
                      transition: 'color 0.15s, border-color 0.15s',
                      zIndex: 2,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f1f5f9'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  >
                    ✎
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Workouts */}
        {customWorkouts.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>CUSTOM WORKOUTS</div>
              <Link href="/edit/new" style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: 11, color: '#8b5cf6', letterSpacing: 2, fontWeight: 600, cursor: 'pointer' }}>+ NEW</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customWorkouts.map(workout => {
                const lastDate = getLastTrainedDate(workout.id);
                return (
                  <div key={workout.id} style={{ position: 'relative' }}>
                    <Link href={`/workout/${workout.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div style={{
                        background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #8b5cf6',
                        borderRadius: 8, padding: '16px 18px', cursor: 'pointer',
                      }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9', paddingRight: 28 }}>{workout.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginTop: 4 }}>{formatLastTrained(lastDate)}</div>
                      </div>
                    </Link>
                    <Link
                      href={`/edit/${workout.id}`}
                      style={{
                        position: 'absolute', top: 10, right: 10,
                        background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 5, padding: '4px 7px', textDecoration: 'none',
                        color: '#64748b', fontSize: 11, lineHeight: 1, zIndex: 2,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f1f5f9'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
                    >
                      ✎
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Workout CTA */}
        <div style={{ marginTop: customWorkouts.length > 0 ? 16 : 32 }}>
          <Link href="/edit/new" style={{ textDecoration: 'none' }}>
            <div style={{
              border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 10, padding: '16px 24px',
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            >
              <span style={{ fontSize: 24, color: '#8b5cf6' }}>+</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', letterSpacing: 1 }}>CREATE CUSTOM WORKOUT</div>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: "'Barlow', sans-serif", marginTop: 2 }}>Build your own program with phases and exercises</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>RECENT SESSIONS</div>
              <Link href="/calendar" style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: 11, color: '#64748b', letterSpacing: 2 }}>VIEW ALL</span>
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSessions.map(session => {
                const workout = workouts.find(w => w.id === session.workoutId);
                const accent = workout?.accentColor || WORKOUT_TYPE_COLORS[workout?.type || 'custom'] || '#8b5cf6';
                return (
                  <div key={session.id} style={{
                    background: '#111', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{ width: 4, height: 40, background: accent, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{workout?.name || 'Unknown Workout'}</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginTop: 2 }}>
                        {formatDate(session.date)} · {session.durationMinutes}min · {session.exercises.length} exercises
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: accent }}>{session.durationMinutes}m</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && (
          <div style={{ marginTop: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏋️</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#475569', letterSpacing: 2 }}>NO SESSIONS YET</div>
            <div style={{ fontSize: 14, color: '#334155', fontFamily: "'Barlow', sans-serif", marginTop: 8 }}>Start a workout above to begin tracking your progress</div>
          </div>
        )}
      </div>
    </div>
  );
}
