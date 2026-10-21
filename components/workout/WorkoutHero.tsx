'use client';

import { WorkoutDefinition } from '@/lib/types';
import { tint } from '@/lib/theme';

interface WorkoutHeroProps {
  workout: WorkoutDefinition;
  totalExercises: number;
}

const TYPE_LABELS: Record<string, string> = {
  legs: 'LEG DAY PROTOCOL',
  push: 'PUSH DAY PROTOCOL',
  pull: 'PULL DAY PROTOCOL',
  run: 'RUN DAY PROTOCOL',
  custom: 'CUSTOM WORKOUT',
};

export default function WorkoutHero({ workout, totalExercises }: WorkoutHeroProps) {
  const accent = workout.accentColor;
  const label = TYPE_LABELS[workout.type] || 'WORKOUT PROTOCOL';

  return (
    <div style={{
      background: `linear-gradient(135deg, var(--surface-1) 0%, ${tint(accent, 0.03)} 50%, var(--bg) 100%)`,
      borderBottom: `3px solid ${accent}`,
      padding: '40px 24px 32px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, ${tint(accent, 0.03)} 39px, ${tint(accent, 0.03)} 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, ${tint(accent, 0.03)} 39px, ${tint(accent, 0.03)} 40px)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: accent, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500 }}>
          {label}
        </div>
        <h1 style={{ fontSize: 'clamp(48px,9vw,80px)', fontWeight: 900, lineHeight: 0.9, letterSpacing: -2, color: 'var(--text-strong)', fontStyle: 'italic' }}>
          {workout.name}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-muted)', letterSpacing: 2, marginTop: 12, fontWeight: 600 }}>
          {workout.tagline}
        </p>

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'DURATION', val: workout.duration },
            { label: 'EXERCISES', val: totalExercises },
            { label: 'PHASES', val: workout.phases.length },
          ].map(({ label, val }) => (
            <div key={label} style={{
              background: 'rgb(var(--ink-rgb) / 0.06)',
              border: '1px solid rgb(var(--ink-rgb) / 0.1)',
              borderRadius: 6,
              padding: '10px 18px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: accent }}>{val}</div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Coach note */}
        {workout.note && (
          <div style={{
            marginTop: 20,
            background: 'rgb(var(--ink-rgb) / 0.04)',
            borderRadius: 6,
            padding: '10px 14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: `1px solid ${tint(accent, 0.19)}`,
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 13, color: 'var(--danger-pale)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500 }}>{workout.note}</span>
          </div>
        )}
      </div>
    </div>
  );
}
