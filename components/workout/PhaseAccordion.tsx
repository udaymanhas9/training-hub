'use client';

import { Phase, ExerciseLog, SetLog } from '@/lib/types';
import ExerciseRow from './ExerciseRow';
import { tint } from '@/lib/theme';

interface PhaseAccordionProps {
  phase: Phase;
  isOpen: boolean;
  onToggle: () => void;
  checked: Record<string, boolean>;
  onCheck: (phaseId: string, exId: string) => void;
  exerciseLogs: Record<string, ExerciseLog>;
  onLogSet: (exId: string, exName: string, set: SetLog) => void;
  onRemoveSet: (exId: string, idx: number) => void;
  lastSessionSets: (exId: string) => SetLog[];
  onPB: (msg: string) => void;
  weightUnit?: 'kg' | 'lbs';
}

export default function PhaseAccordion({
  phase,
  isOpen,
  onToggle,
  checked,
  onCheck,
  exerciseLogs,
  onLogSet,
  onRemoveSet,
  lastSessionSets,
  weightUnit = 'kg',
}: PhaseAccordionProps) {
  const phaseDone = phase.exercises.filter(ex => checked[`${phase.id}-${ex.id}`]).length;
  const profile = { weightUnit };

  return (
    <div style={{
      borderRadius: 10,
      overflow: 'hidden',
      border: `1px solid ${isOpen ? tint(phase.color, 0.27) : 'rgb(var(--ink-rgb) / 0.07)'}`,
      transition: 'border-color 0.3s',
    }}>
      {/* Phase header */}
      <div
        className="phase-header"
        onClick={onToggle}
        style={{
          background: isOpen ? `linear-gradient(90deg, ${tint(phase.color, 0.13)}, var(--surface-1))` : 'var(--surface-2)',
          padding: '14px 18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderLeft: `3px solid ${phase.color}`,
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 2, color: isOpen ? 'var(--text-strong)' : 'var(--text-muted)' }}>
              {phase.label}
            </div>
            <div style={{ fontSize: 12, color: phase.color, fontFamily: "'Barlow Condensed', sans-serif", marginTop: 1 }}>
              {phase.time} · {phase.exercises.length} exercises
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif" }}>
            {phaseDone}/{phase.exercises.length}
          </div>
          {phaseDone > 0 && phaseDone === phase.exercises.length && (
            <span style={{ fontSize: 12, color: 'var(--success)' }}>✓</span>
          )}
          <div style={{
            fontSize: 14, color: phase.color,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
          }}>
            ▼
          </div>
        </div>
      </div>

      {/* Exercises */}
      {isOpen && (
        <div style={{ background: 'var(--surface)' }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 56px 80px 56px', gap: 0, padding: '8px 18px', borderBottom: '1px solid var(--surface-blue)' }}>
            {['', 'EXERCISE', 'SETS', 'REPS', 'REST'].map(h => (
              <div key={h} style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif" }}>{h}</div>
            ))}
          </div>

          {phase.exercises.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              phaseColor={phase.color}
              done={!!checked[`${phase.id}-${ex.id}`]}
              onCheck={() => onCheck(phase.id, ex.id)}
              exerciseLog={exerciseLogs[ex.id]}
              lastSets={lastSessionSets(ex.id)}
              weightUnit={profile.weightUnit}
              onLogSet={(set) => onLogSet(ex.id, ex.name, set)}
              onRemoveSet={(idx) => onRemoveSet(ex.id, idx)}
              isLast={i === phase.exercises.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
