'use client';

import { Exercise } from '@/lib/types';
import { TAG_COLORS } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ExerciseEditRowProps {
  exercise: Exercise;
  onChange: (ex: Exercise) => void;
  onDelete: () => void;
  accentColor: string;
}

const TAG_OPTIONS = Object.keys(TAG_COLORS);

export default function ExerciseEditRow({ exercise, onChange, onDelete, accentColor }: ExerciseEditRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function update<K extends keyof Exercise>(key: K, value: Exercise[K]) {
    onChange({ ...exercise, [key]: value });
  }

  const inputStyle = {
    background: '#0d0d0d',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#f1f5f9',
    padding: '6px 8px',
    fontSize: 13,
    fontFamily: "'Barlow', sans-serif",
    width: '100%',
  };

  const labelStyle = {
    fontSize: 8,
    letterSpacing: 2,
    color: '#475569',
    fontFamily: "'Barlow', sans-serif",
    marginBottom: 4,
    display: 'block' as const,
  };

  return (
    <div ref={setNodeRef} style={{ ...style, background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#334155', flexShrink: 0, padding: '4px 2px', touchAction: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </div>
        <input
          value={exercise.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Exercise name"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5, flex: 1 }}
        />
        <select
          value={exercise.tag}
          onChange={e => update('tag', e.target.value)}
          style={{ ...inputStyle, width: 'auto', flexShrink: 0, color: TAG_COLORS[exercise.tag] || '#94a3b8' }}
        >
          {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          <option value="Custom">Custom</option>
        </select>
        <button
          onClick={onDelete}
          style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 18, padding: '0 4px', flexShrink: 0 }}
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        {[
          { key: 'sets', label: 'SETS', placeholder: 'e.g. 4' },
          { key: 'reps', label: 'REPS', placeholder: 'e.g. 8-10' },
          { key: 'rest', label: 'REST', placeholder: 'e.g. 90s' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label style={labelStyle}>{label}</label>
            <input
              value={exercise[key as keyof Exercise] as string || ''}
              onChange={e => update(key as keyof Exercise, e.target.value as Exercise[keyof Exercise])}
              placeholder={placeholder}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label style={labelStyle}>INTENSITY (optional)</label>
          <input
            value={exercise.intensity || ''}
            onChange={e => update('intensity', e.target.value)}
            placeholder="e.g. 75-85% 1RM"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>NOTES (optional)</label>
          <input
            value={exercise.notes || ''}
            onChange={e => update('notes', e.target.value)}
            placeholder="Coaching notes..."
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}
