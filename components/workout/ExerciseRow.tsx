'use client';

import { useState } from 'react';
import { Exercise, ExerciseLog, SetLog } from '@/lib/types';
import { TAG_COLORS } from '@/lib/utils';
import SetLoggerInline from './SetLoggerInline';
import { tint } from '@/lib/theme';

interface ExerciseRowProps {
  exercise: Exercise;
  phaseColor: string;
  done: boolean;
  onCheck: () => void;
  exerciseLog: ExerciseLog | undefined;
  lastSets: SetLog[];
  weightUnit: 'kg' | 'lbs';
  onLogSet: (set: SetLog) => void;
  onRemoveSet: (idx: number) => void;
  isLast: boolean;
}

export default function ExerciseRow({
  exercise,
  phaseColor,
  done,
  onCheck,
  exerciseLog,
  lastSets,
  weightUnit,
  onLogSet,
  onRemoveSet,
  isLast,
}: ExerciseRowProps) {
  const [showLastTime, setShowLastTime] = useState(false);
  const [showLogger, setShowLogger]     = useState(false);
  const tagColor  = TAG_COLORS[exercise.tag] || 'var(--text-faint)';
  const loggedSets = exerciseLog?.sets || [];

  return (
    <div
      className="ex-row"
      style={{
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--surface-4)',
        opacity: done ? 0.45 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

        {/* Checkbox — 44×44 touch target */}
        <button
          className="check-btn"
          onClick={onCheck}
          aria-label="Mark exercise done"
          style={{
            width: 44, height: 44, flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: -12, marginTop: -10,
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 5,
            border: `2px solid ${done ? phaseColor : 'var(--text-ghost)'}`,
            background: done ? phaseColor : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {done && <span style={{ color: 'var(--scrim)', fontSize: 13, fontWeight: 900 }}>✓</span>}
          </div>
        </button>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Last time */}
          {lastSets.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <button
                onClick={() => setShowLastTime(p => !p)}
                style={{
                  background: 'rgb(var(--ink-rgb) / 0.04)', border: '1px solid rgb(var(--ink-rgb) / 0.08)',
                  borderRadius: 4, padding: '3px 8px', fontSize: 10, color: 'var(--text-faint)',
                  cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1,
                }}
              >
                {showLastTime ? '▲ HIDE LAST TIME' : '▼ LAST TIME'}
              </button>
              {showLastTime && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {lastSets.map((s, i) => (
                    <span key={i} style={{
                      fontSize: 11, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif",
                      background: 'rgb(var(--ink-rgb) / 0.04)', padding: '2px 6px', borderRadius: 3,
                    }}>
                      {s.weight > 0 ? `${s.weight}${s.unit}` : 'BW'} × {s.reps}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <div style={{
            fontSize: 17, fontWeight: 700, letterSpacing: 0.5,
            color: done ? 'var(--text-faint)' : 'var(--text)',
            textDecoration: done ? 'line-through' : 'none',
            lineHeight: 1.2,
          }}>
            {exercise.name}
          </div>

          {/* Tag + sets/reps/rest pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{
              fontSize: 9, letterSpacing: 2, fontWeight: 600,
              padding: '2px 7px', borderRadius: 3,
              background: tint(tagColor, 0.13), color: tagColor,
              border: `1px solid ${tint(tagColor, 0.27)}`,
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>{exercise.tag}</span>

            {exercise.sets && (
              <span style={{
                fontSize: 12, fontWeight: 900, color: phaseColor,
                background: tint(phaseColor, 0.09), padding: '2px 8px', borderRadius: 4,
              }}>{exercise.sets} sets</span>
            )}
            {exercise.reps && (
              <span style={{
                fontSize: 12, fontWeight: 600, color: 'var(--text-soft-2)',
                background: 'rgb(var(--ink-rgb) / 0.06)', padding: '2px 8px', borderRadius: 4,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>{exercise.reps}</span>
            )}
            {exercise.rest && (
              <span style={{
                fontSize: 12, color: 'var(--text-muted)',
                background: 'rgb(var(--ink-rgb) / 0.04)', padding: '2px 8px', borderRadius: 4,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>{exercise.rest} rest</span>
            )}
          </div>

          {/* Intensity / warmup / notes */}
          {exercise.intensity && (
            <div style={{ marginTop: 5 }}>
              <span style={{ fontSize: 11, letterSpacing: 1, color: 'var(--warning)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                🎯 {exercise.intensity}
              </span>
            </div>
          )}
          {exercise.warmupSets && (
            <div style={{ marginTop: 5, padding: '5px 8px', background: 'rgb(var(--warning-rgb) / 0.08)', border: '1px solid rgb(var(--warning-rgb) / 0.18)', borderRadius: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--warning-dark)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>WARM-UP: </span>
              <span style={{ fontSize: 11, color: 'var(--stone)', fontFamily: "'Barlow Condensed', sans-serif" }}>{exercise.warmupSets}</span>
            </div>
          )}
          {exercise.notes && (
            <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 5, fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1.4 }}>
              {exercise.notes}
            </div>
          )}

          {/* Log sets toggle */}
          <button
            onClick={() => setShowLogger(p => !p)}
            style={{
              marginTop: 10,
              background: 'transparent',
              border: `1px solid ${showLogger ? tint(phaseColor, 0.38) : 'rgb(var(--ink-rgb) / 0.1)'}`,
              borderRadius: 4, color: showLogger ? phaseColor : 'var(--text-subtle)',
              fontSize: 11, letterSpacing: 2, padding: '6px 12px', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            }}
          >
            {showLogger ? 'HIDE' : loggedSets.length > 0 ? `${loggedSets.length} SETS LOGGED` : '+ LOG SETS'}
          </button>

          {showLogger && (
            <SetLoggerInline
              exerciseId={exercise.id}
              accentColor={phaseColor}
              loggedSets={loggedSets}
              lastSets={lastSets}
              weightUnit={weightUnit}
              onLog={onLogSet}
              onRemove={onRemoveSet}
            />
          )}
        </div>
      </div>
    </div>
  );
}
