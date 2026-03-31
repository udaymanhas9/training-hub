'use client';

import { useState } from 'react';
import { Exercise, ExerciseLog, SetLog } from '@/lib/types';
import { TAG_COLORS } from '@/lib/utils';
import SetLoggerInline from './SetLoggerInline';

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
  const [showLogger, setShowLogger] = useState(false);
  const tagColor = TAG_COLORS[exercise.tag] || '#475569';
  const loggedSets = exerciseLog?.sets || [];

  return (
    <div
      className="ex-row"
      style={{
        padding: '14px 18px',
        borderBottom: isLast ? 'none' : '1px solid #1a1a1a',
        opacity: done ? 0.45 : 1,
        transition: 'opacity 0.2s',
        background: 'transparent',
      }}
    >
      {/* Last time pill */}
      {lastSets.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <button
            onClick={() => setShowLastTime(p => !p)}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#475569',
              cursor: 'pointer', fontFamily: "'Barlow', sans-serif", letterSpacing: 1,
            }}
          >
            {showLastTime ? '▲ HIDE LAST TIME' : '▼ LAST TIME'}
          </button>
          {showLastTime && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {lastSets.map((s, i) => (
                <span key={i} style={{
                  fontSize: 11, color: '#64748b', fontFamily: "'Barlow', sans-serif",
                  background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 3,
                }}>
                  {s.weight > 0 ? `${s.weight}${s.unit}` : 'BW'} × {s.reps}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 56px 80px 56px', gap: 0, alignItems: 'start' }}>
        {/* Checkbox */}
        <div
          className="check-btn"
          onClick={onCheck}
          style={{
            width: 20, height: 20, marginTop: 2,
            border: `2px solid ${done ? phaseColor : '#334155'}`,
            borderRadius: 4,
            background: done ? phaseColor : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {done && <span style={{ color: '#000', fontSize: 12, fontWeight: 900 }}>✓</span>}
        </div>

        {/* Name + tag + meta */}
        <div style={{ paddingRight: 12 }}>
          <div style={{
            fontSize: 17, fontWeight: 700, letterSpacing: 0.5,
            color: done ? '#475569' : '#f1f5f9',
            textDecoration: done ? 'line-through' : 'none',
          }}>
            {exercise.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{
              fontSize: 9, letterSpacing: 2, fontWeight: 600,
              padding: '2px 7px', borderRadius: 3,
              background: tagColor + '22',
              color: tagColor,
              fontFamily: "'Barlow', sans-serif",
              border: `1px solid ${tagColor}44`,
            }}>
              {exercise.tag}
            </span>
          </div>
          {exercise.intensity && (
            <div style={{ marginTop: 5 }}>
              <span style={{ fontSize: 11, letterSpacing: 1, color: '#f59e0b', fontFamily: "'Barlow', sans-serif", fontWeight: 700 }}>
                🎯 {exercise.intensity}
              </span>
            </div>
          )}
          {exercise.warmupSets && (
            <div style={{ marginTop: 5, padding: '5px 8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 4 }}>
              <span style={{ fontSize: 11, color: '#d97706', fontFamily: "'Barlow', sans-serif", fontWeight: 700 }}>WARM-UP SETS: </span>
              <span style={{ fontSize: 11, color: '#78716c', fontFamily: "'Barlow', sans-serif" }}>{exercise.warmupSets}</span>
            </div>
          )}
          {exercise.notes && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 5, fontFamily: "'Barlow', sans-serif", lineHeight: 1.4 }}>
              {exercise.notes}
            </div>
          )}

          {/* Log set toggle */}
          <button
            onClick={() => setShowLogger(p => !p)}
            style={{
              marginTop: 8, background: 'transparent',
              border: `1px solid ${showLogger ? phaseColor + '60' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 4, color: showLogger ? phaseColor : '#64748b',
              fontSize: 10, letterSpacing: 2, padding: '3px 10px', cursor: 'pointer',
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

        <div style={{ fontSize: 20, fontWeight: 900, color: phaseColor, textAlign: 'center' }}>{exercise.sets}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', fontFamily: "'Barlow', sans-serif", textAlign: 'center' }}>{exercise.reps}</div>
        <div style={{ fontSize: 14, color: '#94a3b8', fontFamily: "'Barlow', sans-serif", textAlign: 'center' }}>{exercise.rest}</div>
      </div>
    </div>
  );
}
