'use client';

import { WorkoutDefinition, Phase } from '@/lib/types';
import PhaseEditBlock from './PhaseEditBlock';
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

const BLANK_PHASE: Omit<Phase, 'id'> = {
  label: 'NEW PHASE',
  color: '#8b5cf6',
  time: '15 min',
  exercises: [],
};

interface WorkoutEditorCanvasProps {
  workout: WorkoutDefinition;
  onChange: (w: WorkoutDefinition) => void;
}

export default function WorkoutEditorCanvas({ workout, onChange }: WorkoutEditorCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updatePhase(idx: number, phase: Phase) {
    const phases = [...workout.phases];
    phases[idx] = phase;
    onChange({ ...workout, phases });
  }

  function deletePhase(idx: number) {
    onChange({ ...workout, phases: workout.phases.filter((_, i) => i !== idx) });
  }

  function addPhase() {
    const phase: Phase = { ...BLANK_PHASE, id: generateId(), exercises: [] };
    onChange({ ...workout, phases: [...workout.phases, phase] });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = workout.phases.findIndex(p => p.id === active.id);
    const newIdx = workout.phases.findIndex(p => p.id === over.id);
    onChange({ ...workout, phases: arrayMove(workout.phases, oldIdx, newIdx) });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>
          PHASES ({workout.phases.length})
        </div>
        <span style={{ fontSize: 10, color: '#334155', fontFamily: "'Barlow', sans-serif" }}>Drag to reorder</span>
      </div>

      {workout.phases.length === 0 && (
        <div style={{
          background: '#111', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10,
          padding: '40px 24px', textAlign: 'center', marginBottom: 16,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#475569', letterSpacing: 2 }}>NO PHASES YET</div>
          <div style={{ fontSize: 12, color: '#334155', fontFamily: "'Barlow', sans-serif", marginTop: 6 }}>Add a phase below to structure your workout</div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={workout.phases.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {workout.phases.map((phase, idx) => (
            <PhaseEditBlock
              key={phase.id}
              phase={phase}
              onChange={p => updatePhase(idx, p)}
              onDelete={() => deletePhase(idx)}
              accentColor={workout.accentColor}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={addPhase}
        style={{
          width: '100%', background: 'transparent',
          border: `1px dashed ${workout.accentColor}50`,
          borderRadius: 8, color: workout.accentColor,
          fontSize: 13, fontWeight: 900, letterSpacing: 3,
          padding: '14px', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif",
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${workout.accentColor}08`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        + ADD PHASE
      </button>
    </div>
  );
}
