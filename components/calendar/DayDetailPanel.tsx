'use client';

import { SessionLog, WorkoutDefinition } from '@/lib/types';
import { formatDate, WORKOUT_TYPE_COLORS } from '@/lib/utils';

interface DayDetailPanelProps {
  date: string;
  sessions: SessionLog[];
  workouts: WorkoutDefinition[];
  onClose: () => void;
  weightUnit?: 'kg' | 'lbs';
}

export default function DayDetailPanel({ date, sessions, workouts, onClose, weightUnit = 'kg' }: DayDetailPanelProps) {
  const profile = { weightUnit };

  function getWorkout(id: string): WorkoutDefinition | undefined {
    return workouts.find(w => w.id === id);
  }

  function displayWeight(w: number): string {
    if (profile.weightUnit === 'lbs') return `${Math.round(w * 2.20462)}lbs`;
    return `${w}kg`;
  }

  if (sessions.length === 0) return null;

  return (
    <div
      className="animate-fade-in"
      style={{
        marginTop: 20,
        background: '#111',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.03)',
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 4, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 4 }}>SESSION DETAILS</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9' }}>{formatDate(date)}</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20, padding: 4 }}
        >
          ×
        </button>
      </div>

      {sessions.map(session => {
        const workout = getWorkout(session.workoutId);
        const accent = workout?.accentColor || WORKOUT_TYPE_COLORS[workout?.type || 'custom'] || '#8b5cf6';
        return (
          <div key={session.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 4, height: 36, background: accent, borderRadius: 2 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9' }}>{workout?.name || 'Unknown'}</div>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: "'Barlow', sans-serif" }}>
                  {session.durationMinutes}min · {session.exercises.length} exercises
                </div>
              </div>
            </div>

            {session.exercises.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {session.exercises.map(ex => (
                  <div key={ex.exerciseId} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: "'Barlow', sans-serif", minWidth: 0, flex: 1 }}>{ex.exerciseName}</span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
                      {ex.sets.map((s, i) => (
                        <span key={i} style={{
                          fontSize: 10, color: '#64748b', fontFamily: "'Barlow', sans-serif",
                          background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: 3,
                        }}>
                          {s.weight > 0 ? displayWeight(s.weight) : 'BW'}×{s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
