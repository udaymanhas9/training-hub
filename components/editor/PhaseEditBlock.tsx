'use client';

import { useState } from 'react';
import { Phase, Exercise } from '@/lib/types';
import ExerciseEditRow from './ExerciseEditRow';
import { generateId } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const BLANK_EXERCISE: Omit<Exercise, 'id'> = {
  name: '',
  sets: '3',
  reps: '10',
  rest: '60s',
  tag: 'Hypertrophy',
};

const PHASE_COLOR_OPTIONS = [
  '#f59e0b', '#ef4444', '#f97316', '#3b82f6', '#10b981',
  '#8b5cf6', '#ec4899', '#64748b', '#84cc16', '#06b6d4',
];

interface PhaseEditBlockProps {
  phase: Phase;
  onChange: (phase: Phase) => void;
  onDelete: () => void;
  accentColor: string;
}

export default function PhaseEditBlock({ phase, onChange, onDelete, accentColor }: PhaseEditBlockProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function updatePhaseField<K extends keyof Phase>(key: K, value: Phase[K]) {
    onChange({ ...phase, [key]: value });
  }

  function updateExercise(idx: number, ex: Exercise) {
    const exercises = [...phase.exercises];
    exercises[idx] = ex;
    onChange({ ...phase, exercises });
  }

  function deleteExercise(idx: number) {
    onChange({ ...phase, exercises: phase.exercises.filter((_, i) => i !== idx) });
  }

  function addExercise() {
    const ex: Exercise = { ...BLANK_EXERCISE, id: generateId() };
    onChange({ ...phase, exercises: [...phase.exercises, ex] });
  }

  function handleExDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = phase.exercises.findIndex(e => e.id === active.id);
    const newIdx = phase.exercises.findIndex(e => e.id === over.id);
    onChange({ ...phase, exercises: arrayMove(phase.exercises, oldIdx, newIdx) });
  }

  return (
    <div ref={setNodeRef} style={{ ...style, background: '#0d0d0d', border: `1px solid ${isOpen ? phase.color + '44' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      {/* Phase header */}
      <div style={{
        background: isOpen ? `linear-gradient(90deg, ${phase.color}18, #111)` : '#111',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderLeft: `3px solid ${phase.color}`,
      }}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#334155', flexShrink: 0, touchAction: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </div>

        <input
          value={phase.label}
          onChange={e => updatePhaseField('label', e.target.value.toUpperCase())}
          style={{
            flex: 1, background: 'transparent', border: 'none', color: '#f1f5f9',
            fontSize: 14, fontWeight: 900, letterSpacing: 2, fontFamily: "'Barlow Condensed', sans-serif",
            outline: 'none',
          }}
        />

        <input
          value={phase.time}
          onChange={e => updatePhaseField('time', e.target.value)}
          placeholder="10 min"
          style={{ width: 60, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#94a3b8', padding: '4px 6px', fontSize: 11, fontFamily: "'Barlow', sans-serif", textAlign: 'center' }}
        />

        {/* Color picker */}
        <div style={{ display: 'flex', gap: 4 }}>
          {PHASE_COLOR_OPTIONS.slice(0, 5).map(c => (
            <button
              key={c}
              onClick={() => updatePhaseField('color', c)}
              style={{
                width: 14, height: 14, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                outline: phase.color === c ? `2px solid ${c}` : 'none', outlineOffset: 1,
              }}
            />
          ))}
        </div>

        <button
          onClick={() => setIsOpen(o => !o)}
          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          ▼
        </button>

        <button
          onClick={onDelete}
          style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: '2px 8px', fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          DEL
        </button>
      </div>

      {/* Exercises */}
      {isOpen && (
        <div style={{ padding: '12px 16px' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExDragEnd}>
            <SortableContext items={phase.exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
              {phase.exercises.map((ex, idx) => (
                <ExerciseEditRow
                  key={ex.id}
                  exercise={ex}
                  onChange={newEx => updateExercise(idx, newEx)}
                  onDelete={() => deleteExercise(idx)}
                  accentColor={phase.color}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={addExercise}
            style={{
              width: '100%', background: 'transparent', border: `1px dashed ${phase.color}50`,
              borderRadius: 6, color: phase.color, fontSize: 11, letterSpacing: 2, padding: '8px',
              cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              marginTop: 4, transition: 'border-color 0.15s',
            }}
          >
            + ADD EXERCISE
          </button>
        </div>
      )}
    </div>
  );
}
