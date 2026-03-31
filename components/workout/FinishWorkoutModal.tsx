'use client';

import { WorkoutDefinition, ExerciseLog, PersonalBest } from '@/lib/types';
import Modal from '@/components/ui/Modal';

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
        background: `linear-gradient(135deg, ${accent}20, #111)`,
        borderBottom: `2px solid ${accent}`,
        borderRadius: '12px 12px 0 0',
        padding: '28px 24px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔥</div>
        <div style={{ fontSize: 11, letterSpacing: 6, color: accent, fontFamily: "'Barlow', sans-serif", marginBottom: 8 }}>WORKOUT COMPLETE</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#f1f5f9', fontStyle: 'italic' }}>{workout.name}</div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
          {[
            { label: 'DURATION', val: `${durationMinutes}min`, color: accent },
            { label: 'EXERCISES', val: exerciseLogs.length, color: '#3b82f6' },
            { label: 'SETS LOGGED', val: totalSets, color: '#10b981' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '12px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: 8, letterSpacing: 2, color: '#475569', fontFamily: "'Barlow', sans-serif", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* PB Notifications */}
        {newPBs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#f59e0b', fontFamily: "'Barlow', sans-serif", marginBottom: 10 }}>NEW PERSONAL BESTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newPBs.map(pb => (
                <div key={pb.exerciseId} style={{
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>🏆</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{pb.exerciseName}</div>
                    <div style={{ fontSize: 12, color: '#92400e', fontFamily: "'Barlow', sans-serif" }}>
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
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 10 }}>EXERCISES LOGGED</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {exerciseLogs.map(ex => (
                <div key={ex.exerciseId} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 4,
                }}>
                  <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: "'Barlow', sans-serif" }}>{ex.exerciseName}</span>
                  <span style={{ fontSize: 11, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>{ex.sets.length} sets</span>
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
            color: '#000', letterSpacing: 3, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        >
          SAVE & FINISH
        </button>
      </div>
    </Modal>
  );
}
