'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWorkouts, getProfile, getSessionCount, getSessionDates, getRecentSessions, getLatestHealthEntry, getTodos, saveTodo } from '@/lib/storage';
import { WorkoutDefinition, SessionLog, Todo } from '@/lib/types';
import { formatLastTrained, getSessionsThisWeek, getCurrentStreak, formatDate, WORKOUT_TYPE_COLORS } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { UpcomingWorkout } from '@/app/api/garmin/upcoming/route';

export default function DashboardPage() {
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [sessionDates, setSessionDates] = useState<{ date: string; workoutId: string }[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionLog[]>([]);
  const [profileName, setProfileName] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [currentBF, setCurrentBF] = useState<number | null>(null);
  const [todayTodos, setTodayTodos] = useState<Todo[]>([]);
  const [todayRun, setTodayRun] = useState<UpcomingWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const today = format(new Date(), 'EEEE, MMMM d');

  useEffect(() => {
    async function load() {
      const todayDate = format(new Date(), 'yyyy-MM-dd');
      const [w, p, count, dates, recent, latestHealth, allTodos] = await Promise.all([
        getWorkouts(),
        getProfile(),
        getSessionCount(),
        getSessionDates(),
        getRecentSessions(5),
        getLatestHealthEntry(),
        getTodos(),
      ]);
      setWorkouts(w);
      setProfileName(p.name);
      setWeightUnit(p.weightUnit);
      setTotalSessions(count);
      setSessionDates(dates);
      setRecentSessions(recent);
      if (latestHealth) {
        setCurrentWeight(latestHealth.weight);
        setCurrentBF(latestHealth.bodyFatPct ?? null);
      }
      setTodayTodos(allTodos.filter(t => !t.completed && t.dueDate === todayDate));
      setLoading(false);

      // Fetch today's scheduled Garmin run (non-blocking, best-effort)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('/api/garmin/upcoming', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const json = await res.json();
            const run = (json.upcoming as UpcomingWorkout[]).find(w => w.date === todayDate);
            if (run) setTodayRun(run);
          }
        }
      } catch { /* Garmin unavailable — silent fail */ }
    }
    load();
  }, []);

  const thisWeek = getSessionsThisWeek(sessionDates);
  const streak = getCurrentStreak(sessionDates);

  function getLastTrainedDate(workoutId: string): string | undefined {
    return sessionDates.find(s => s.workoutId === workoutId)?.date;
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 120, overflowX: 'hidden' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f0f0f 0%, #111 50%, #0a0a0a 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '40px 24px 32px',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ height: 12, width: 180, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 64, width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 16 }} />
            <div style={{ height: 12, width: 120, background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 28 }} />
            <div style={{ display: 'flex', gap: 16 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 70, width: 100, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 0' }}>
          <div style={{ height: 10, width: 120, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 16 }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 160, background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 120, overflowX: 'hidden' }}>
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
          <div style={{ fontSize: 11, letterSpacing: 6, color: '#64748b', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, marginBottom: 8 }}>
            {today.toUpperCase()}
          </div>
          <h1 style={{ fontSize: 'clamp(42px,8vw,72px)', fontWeight: 900, lineHeight: 0.9, letterSpacing: -1, color: '#fff', fontStyle: 'italic' }}>
            {profileName ? `WELCOME BACK, ${profileName.toUpperCase()}` : 'TRAINING HUB'}
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', letterSpacing: 2, marginTop: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
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
                <div style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>

        {/* Today's scheduled run from Garmin */}
        {todayRun && (
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 12 }}>
              TODAY&apos;S RUN
            </div>
            <Link href="/runs" style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                background: 'linear-gradient(135deg, #0f1f17 0%, #111 100%)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderLeft: '4px solid #10b981',
                borderRadius: 10, padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)')}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>
                  🏃
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9', letterSpacing: 0.5 }}>{todayRun.title}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {todayRun.sportTypeKey && (
                      <span style={{ fontSize: 9, letterSpacing: 3, color: '#10b981', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                        {todayRun.sportTypeKey.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    )}
                    {todayRun.duration && (
                      <span style={{ fontSize: 13, color: '#64748b', fontFamily: "'Barlow Condensed', sans-serif" }}>
                        ~{Math.round(todayRun.duration / 60)} min
                      </span>
                    )}
                    {todayRun.distance && todayRun.distance > 0 && (
                      <span style={{ fontSize: 13, color: '#64748b', fontFamily: "'Barlow Condensed', sans-serif" }}>
                        {(todayRun.distance / 1000).toFixed(1)} km
                      </span>
                    )}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          </div>
        )}

        {/* Workout Cards */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 16 }}>YOUR WORKOUTS</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreWorkouts.map(workout => {
              const accent = workout.accentColor;
              const lastDate = getLastTrainedDate(workout.id);
              const sessionCount = sessionDates.filter(s => s.workoutId === workout.id).length;
              return (
                <div key={workout.id} style={{ position: 'relative' }}>
                  <Link href={`/workout/${workout.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                    <div style={{
                      background: '#111',
                      border: `1px solid rgba(255,255,255,0.07)`,
                      borderRadius: 10,
                      padding: '20px 18px 20px 18px',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      position: 'relative',
                      overflow: 'hidden',
                      height: '100%',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                    >
                      <div style={{
                        position: 'absolute', top: 0, right: 0, width: 80, height: 80,
                        background: `radial-gradient(circle at top right, ${accent}15, transparent 70%)`,
                        pointerEvents: 'none',
                      }} />
                      <div style={{ fontSize: 10, letterSpacing: 4, color: accent, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, marginBottom: 6 }}>
                        {getWorkoutTypeLabel(workout.type)}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#f1f5f9', letterSpacing: -0.5, lineHeight: 1, paddingRight: 28 }}>{workout.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', fontFamily: "'Barlow Condensed', sans-serif", marginTop: 6, lineHeight: 1.4, flex: 1 }}>{workout.tagline}</div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                        <div style={{ background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 4, padding: '3px 8px' }}>
                          <span style={{ fontSize: 11, color: accent, fontWeight: 700, letterSpacing: 1 }}>{workout.duration}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {sessionCount > 0 ? `${sessionCount}× logged` : 'Not started'}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 10, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
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
              <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif" }}>CUSTOM WORKOUTS</div>
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
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: "'Barlow Condensed', sans-serif", marginTop: 4 }}>{formatLastTrained(lastDate)}</div>
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
                <div style={{ fontSize: 11, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif", marginTop: 2 }}>Build your own program with phases and exercises</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Today's Tasks */}
        {todayTodos.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif" }}>TODAY&apos;S TASKS</div>
              <Link href="/todo" style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: 11, color: '#64748b', letterSpacing: 2 }}>VIEW ALL</span>
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {todayTodos.map(todo => (
                <HomeTodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={async () => {
                    const updated = { ...todo, completed: true, completedAt: new Date().toISOString() };
                    setTodayTodos(prev => prev.filter(t => t.id !== todo.id));
                    await saveTodo(updated);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif" }}>RECENT SESSIONS</div>
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
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: "'Barlow Condensed', sans-serif", marginTop: 2 }}>
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
        {totalSessions === 0 && (
          <div style={{ marginTop: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏋️</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#475569', letterSpacing: 2 }}>NO SESSIONS YET</div>
            <div style={{ fontSize: 14, color: '#334155', fontFamily: "'Barlow Condensed', sans-serif", marginTop: 8 }}>Start a workout above to begin tracking your progress</div>
          </div>
        )}
      </div>
    </div>
  );
}

function HomeTodoItem({ todo, onToggle }: { todo: Todo; onToggle: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 8,
      background: '#111', border: '1px solid rgba(255,255,255,0.07)',
      borderLeft: todo.priority === 'high' ? '3px solid rgba(249,115,22,0.5)' : '3px solid transparent',
      opacity: done ? 0.4 : 1, transition: 'opacity 0.2s',
    }}>
      <button
        onClick={() => { setDone(true); setTimeout(onToggle, 200); }}
        style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${todo.priority === 'high' ? '#f97316' : 'rgba(255,255,255,0.2)'}`,
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.2)'; (e.currentTarget as HTMLElement).style.borderColor = '#22c55e'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = todo.priority === 'high' ? '#f97316' : 'rgba(255,255,255,0.2)'; }}
      />
      <span style={{ flex: 1, fontSize: 14, color: '#cbd5e1' }}>{todo.text}</span>
      {todo.priority === 'high' && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="#f97316" stroke="#f97316" strokeWidth="1">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
    </div>
  );
}
