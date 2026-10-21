'use client';

import { SessionLog, WorkoutDefinition, StravaActivity } from '@/lib/types';
import { formatDate, WORKOUT_TYPE_COLORS } from '@/lib/utils';

interface DayDetailPanelProps {
  date: string;
  sessions: SessionLog[];
  workouts: WorkoutDefinition[];
  onClose: () => void;
  weightUnit?: 'kg' | 'lbs';
  stravaActivities?: StravaActivity[];
}

function fmtPace(mps: number) {
  if (!mps) return '—';
  const spk = 1000 / mps;
  return `${Math.floor(spk / 60)}:${Math.floor(spk % 60).toString().padStart(2, '0')}/km`;
}
function fmtDist(m: number) { return `${(m / 1000).toFixed(2)} km`; }
function fmtTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DayDetailPanel({ date, sessions, workouts, onClose, weightUnit = 'kg', stravaActivities = [] }: DayDetailPanelProps) {
  const profile = { weightUnit };

  function getWorkout(id: string): WorkoutDefinition | undefined {
    return workouts.find(w => w.id === id);
  }

  function displayWeight(w: number): string {
    if (profile.weightUnit === 'lbs') return `${Math.round(w * 2.20462)}lbs`;
    return `${w}kg`;
  }

  if (sessions.length === 0 && stravaActivities.length === 0) return null;

  return (
    <div
      className="animate-fade-in"
      style={{
        marginTop: 20,
        background: 'var(--surface-2)',
        border: '1px solid rgb(var(--ink-rgb) / 0.1)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '1px solid rgb(var(--ink-rgb) / 0.07)',
        background: 'rgb(var(--ink-rgb) / 0.03)',
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 4, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>SESSION DETAILS</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{formatDate(date)}</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20, padding: 4 }}
        >
          ×
        </button>
      </div>

      {sessions.map(session => {
        const workout = getWorkout(session.workoutId);
        const accent = workout?.accentColor || WORKOUT_TYPE_COLORS[workout?.type || 'custom'] || 'var(--violet)';
        return (
          <div key={session.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgb(var(--ink-rgb) / 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 4, height: 36, background: accent, borderRadius: 2 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{workout?.name || 'Unknown'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {session.durationMinutes}min · {session.exercises.length} exercises
                </div>
              </div>
            </div>

            {session.exercises.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {session.exercises.map(ex => (
                  <div key={ex.exerciseId} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", minWidth: 0, flex: 1 }}>{ex.exerciseName}</span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
                      {ex.sets.map((s, i) => (
                        <span key={i} style={{
                          fontSize: 10, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif",
                          background: 'rgb(var(--ink-rgb) / 0.04)', padding: '1px 5px', borderRadius: 3,
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

      {/* Strava runs */}
      {stravaActivities.map(a => (
        <div key={a.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgb(var(--ink-rgb) / 0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 4, height: 36, background: 'var(--brand-strava)', borderRadius: 2 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{a.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif" }}>
                {a.type} · Strava
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'DIST',  value: fmtDist(a.distance),         color: 'var(--text)' },
              { label: 'TIME',  value: fmtTime(a.movingTime),        color: 'var(--text-muted)' },
              { label: 'PACE',  value: fmtPace(a.averageSpeed),      color: 'var(--success)' },
              { label: 'ELEV',  value: `↑${Math.round(a.totalElevationGain)}m`, color: 'var(--warning)' },
              ...(a.averageHeartrate ? [{ label: 'HR', value: `${Math.round(a.averageHeartrate)} bpm`, color: 'var(--danger)' }] : []),
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
