'use client';

import Model, { MuscleType, ModelType } from 'react-body-highlighter';
import type { IExerciseData } from 'react-body-highlighter';
import { WorkoutType } from '@/lib/types';
import { MUSCLE_DISPLAY } from '@/lib/muscleMap';

type Muscle = typeof MuscleType[keyof typeof MuscleType];

// Fallback mapping when no per-exercise muscle data exists
const WORKOUT_TYPE_MUSCLES: Record<string, Muscle[]> = {
  legs: [
    MuscleType.QUADRICEPS, MuscleType.HAMSTRING, MuscleType.GLUTEAL,
    MuscleType.CALVES, MuscleType.ABS, MuscleType.OBLIQUES,
  ],
  push: [MuscleType.CHEST, MuscleType.FRONT_DELTOIDS, MuscleType.TRICEPS, MuscleType.ABS],
  pull: [MuscleType.UPPER_BACK, MuscleType.TRAPEZIUS, MuscleType.BACK_DELTOIDS, MuscleType.BICEPS],
  run:  [MuscleType.QUADRICEPS, MuscleType.HAMSTRING, MuscleType.CALVES, MuscleType.GLUTEAL],
  custom: [],
};

interface Props {
  workoutType: WorkoutType;
  accentColor: string;
  /** Per-exercise muscle groups aggregated from the workout definition */
  muscles?: string[];
}

export default function MuscleDiagram({ workoutType, accentColor, muscles }: Props) {
  // Use passed muscles if available, otherwise fall back to workout-type mapping
  const resolvedMuscles: Muscle[] = (muscles && muscles.length > 0)
    ? (muscles as Muscle[])
    : (WORKOUT_TYPE_MUSCLES[workoutType] ?? []);

  const exerciseData: IExerciseData[] = resolvedMuscles.length > 0
    ? [{ name: 'workout', muscles: resolvedMuscles }]
    : [];

  const svgStyle: React.CSSProperties = { width: '100%', height: 'auto' };
  const wrapperStyle: React.CSSProperties = { flex: 1 };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <div style={{
        fontSize: 10, letterSpacing: 3, color: '#475569',
        fontFamily: "'Barlow', sans-serif", marginBottom: 16,
      }}>
        MUSCLES TARGETED
      </div>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: '#475569', marginBottom: 8, fontFamily: "'Barlow', sans-serif" }}>FRONT</div>
          <Model
            data={exerciseData}
            style={wrapperStyle}
            svgStyle={svgStyle}
            type={ModelType.ANTERIOR}
            bodyColor="#3e4248"
            highlightedColors={[accentColor]}
          />
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: '#475569', marginBottom: 8, fontFamily: "'Barlow', sans-serif" }}>BACK</div>
          <Model
            data={exerciseData}
            style={wrapperStyle}
            svgStyle={svgStyle}
            type={ModelType.POSTERIOR}
            bodyColor="#3e4248"
            highlightedColors={[accentColor]}
          />
        </div>
      </div>

      {resolvedMuscles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px', marginTop: 16 }}>
          {Array.from(new Set(resolvedMuscles)).map(m => (
            <span key={m} style={{
              fontSize: 10,
              letterSpacing: 1,
              color: accentColor,
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}45`,
              borderRadius: 4,
              padding: '3px 8px',
              fontFamily: "'Barlow', sans-serif",
            }}>
              {MUSCLE_DISPLAY[m as keyof typeof MUSCLE_DISPLAY] ?? m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
