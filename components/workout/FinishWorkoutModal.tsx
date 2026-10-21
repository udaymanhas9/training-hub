'use client';

import { WorkoutDefinition, ExerciseLog, PersonalBest } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import { tint } from '@/lib/theme';

interface FinishWorkoutModalProps {
  workout: WorkoutDefinition;
  exerciseLogs: ExerciseLog[];
  durationMinutes: number;
  newPBs: PersonalBest[];
  onClose: () => void;
}

export default function FinishWorkoutModal({
  workout,
  exerciseLogs,
  durationMinutes,
  newPBs,
  onClose,
}: FinishWorkoutModalProps) {
  const totalSets = exerciseLogs.reduce((sum, e) => sum + e.sets.length, 0);
  const accent = workout.accentColor;

  return (
    <Modal onClose={onClose} maxWidth={480}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${tint(accent, 0.13)}, var(--surface-2))`,
        borderBottom: `2px solid ${accent}`,
        borderRadius: '12px 12px 0 0',
        padding: '28px 24px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔥</div>
        <div style={{ fontSize: 11, letterSpacing: 6, color: accent, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>WORKOUT COMPLETE</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)', fontStyle: 'italic' }}>{workout.name}</div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
          {[
            { label: 'DURATION', val: `${durationMinutes}min`, color: accent },
            { label: 'EXERCISES', val: exerciseLogs.length, color: 'var(--info)' },
            { label: 'SETS LOGGED', val: totalSets, color: 'var(--success)' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              flex: 1, background: 'rgb(var(--ink-rgb) / 0.05)', border: '1px solid rgb(var(--ink-rgb) / 0.08)',
              borderRadius: 8, padding: '12px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: 8, letterSpacing: 2, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* PB Notifications */}
        {newPBs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--warning)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 10 }}>NEW PERSONAL BESTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newPBs.map(pb => (
                <div key={pb.exerciseId} style={{
                  background: 'rgb(var(--warning-rgb) / 0.08)', border: '1px solid rgb(var(--warning-rgb) / 0.25)',
                  borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>🏆</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning-2)' }}>{pb.exerciseName}</div>
                    <div style={{ fontSize: 12, color: 'var(--orange-dark)', fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {pb.weight}kg × {pb.reps} reps
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercise summary */}
        {exerciseLogs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 10 }}>EXERCISES LOGGED</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {exerciseLogs.map(ex => (
                <div key={ex.exerciseId} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: 'rgb(var(--ink-rgb) / 0.03)', borderRadius: 4,
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif" }}>{ex.exerciseName}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif" }}>{ex.sets.length} sets</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px', background: accent,
            border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 900,
            color: 'var(--scrim)', letterSpacing: 3, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        >
          SAVE & FINISH
        </button>
      </div>
    </Modal>
  );
}
