'use client';

import { useState, useRef, useEffect } from 'react';
import { Exercise } from '@/lib/types';
import { TAG_COLORS } from '@/lib/utils';
import {
  ALL_MUSCLES, MUSCLE_DISPLAY, lookupMuscles, searchExercises,
  type MuscleValue, type ExerciseSuggestion,
} from '@/lib/muscleMap';
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

  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[]>([]);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [showPicker, setShowPicker]   = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current  && !inputRef.current.contains(e.target as Node)
      ) {
        setSuggestions([]);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function update<K extends keyof Exercise>(key: K, value: Exercise[K]) {
    onChange({ ...exercise, [key]: value });
  }

  function handleNameChange(name: string) {
    update('name', name);
    setSuggestions(searchExercises(name));
    setActiveIdx(-1);
  }

  function handleNameBlur() {
    // Auto-fill muscles on blur if no manual selection yet
    if (!exercise.muscleGroups || exercise.muscleGroups.length === 0) {
      const detected = lookupMuscles(exercise.name);
      if (detected.length > 0) onChange({ ...exercise, muscleGroups: detected });
    }
  }

  function selectSuggestion(s: ExerciseSuggestion) {
    onChange({ ...exercise, name: s.name, muscleGroups: s.muscles });
    setSuggestions([]);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  }

  function toggleMuscle(muscle: MuscleValue) {
    const current = exercise.muscleGroups ?? [];
    const next = current.includes(muscle)
      ? current.filter(m => m !== muscle)
      : [...current, muscle];
    update('muscleGroups', next);
  }

  const selectedMuscles = (exercise.muscleGroups ?? []) as MuscleValue[];

  const inputStyle: React.CSSProperties = {
    background: '#0d0d0d',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#f1f5f9',
    padding: '6px 8px',
    fontSize: 13,
    fontFamily: "'Barlow', sans-serif",
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 8,
    letterSpacing: 2,
    color: '#475569',
    fontFamily: "'Barlow', sans-serif",
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div ref={setNodeRef} style={{ ...style, background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>

      {/* Name + tag row */}
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

        {/* Name input + autocomplete dropdown */}
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            value={exercise.name}
            onChange={e => handleNameChange(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleKeyDown}
            placeholder="Exercise name"
            autoComplete="off"
            style={{
              ...inputStyle,
              fontSize: 15, fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: 0.5,
            }}
          />

          {suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                marginTop: 3,
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={s.name}
                  onPointerDown={e => { e.preventDefault(); selectSuggestion(s); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '9px 12px',
                    background: i === activeIdx ? 'rgba(255,255,255,0.07)' : 'transparent',
                    border: 'none',
                    borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: 10,
                  }}
                >
                  <span style={{
                    fontSize: 13,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600,
                    color: '#f1f5f9',
                    letterSpacing: 0.3,
                  }}>
                    {s.name}
                  </span>
                  <span style={{
                    fontSize: 9,
                    color: '#475569',
                    fontFamily: "'Barlow', sans-serif",
                    letterSpacing: 1,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {s.muscles.slice(0, 3).map(m => MUSCLE_DISPLAY[m]).join(' · ')}
                    {s.muscles.length > 3 ? ` +${s.muscles.length - 3}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

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

      {/* Muscles row */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>MUSCLES</span>
          {selectedMuscles.length > 0 && (
            <span style={{ fontSize: 8, letterSpacing: 1, color: '#22c55e', fontFamily: "'Barlow', sans-serif" }}>
              AUTO
            </span>
          )}
          <button
            onClick={() => setShowPicker(p => !p)}
            style={{
              background: 'transparent', border: 'none',
              color: showPicker ? accentColor : '#475569',
              cursor: 'pointer', fontSize: 9, letterSpacing: 2,
              fontFamily: "'Barlow', sans-serif", padding: 0,
            }}
          >
            {showPicker ? 'DONE' : 'EDIT'}
          </button>
        </div>

        {!showPicker && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px' }}>
            {selectedMuscles.length > 0
              ? selectedMuscles.map(m => (
                  <span key={m} style={{
                    fontSize: 9, letterSpacing: 1,
                    color: accentColor,
                    background: `${accentColor}18`,
                    border: `1px solid ${accentColor}40`,
                    borderRadius: 3, padding: '2px 7px',
                    fontFamily: "'Barlow', sans-serif",
                  }}>
                    {MUSCLE_DISPLAY[m] ?? m}
                  </span>
                ))
              : (
                <button
                  onClick={() => setShowPicker(true)}
                  style={{
                    background: 'transparent', border: '1px dashed #334155',
                    borderRadius: 3, color: '#475569', cursor: 'pointer',
                    fontSize: 9, letterSpacing: 1, padding: '2px 8px',
                    fontFamily: "'Barlow', sans-serif",
                  }}
                >
                  + Select muscles
                </button>
              )
            }
          </div>
        )}

        {showPicker && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 6px' }}>
            {ALL_MUSCLES.map(m => {
              const active = selectedMuscles.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleMuscle(m)}
                  style={{
                    border: `1px solid ${active ? accentColor : 'rgba(255,255,255,0.1)'}`,
                    background: active ? `${accentColor}25` : 'transparent',
                    color: active ? accentColor : '#64748b',
                    borderRadius: 3, cursor: 'pointer',
                    fontSize: 9, letterSpacing: 1, padding: '3px 8px',
                    fontFamily: "'Barlow', sans-serif",
                    transition: 'all 0.1s',
                  }}
                >
                  {MUSCLE_DISPLAY[m]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sets / reps / rest */}
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
