'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getWorkoutById, saveWorkout, deleteWorkout } from '@/lib/storage';
import { WorkoutDefinition, WorkoutType } from '@/lib/types';
import WorkoutEditorCanvas from '@/components/editor/WorkoutEditorCanvas';
import BackButton from '@/components/ui/BackButton';
import { generateId, WORKOUT_TYPE_COLORS } from '@/lib/utils';
import { ACCENT_CHOICES, DEFAULT_CUSTOM_COLOR } from '@/lib/theme';

const BLANK_WORKOUT: WorkoutDefinition = {
  id: '',
  name: 'NEW WORKOUT',
  type: 'custom',
  accentColor: DEFAULT_CUSTOM_COLOR,
  tagline: '',
  duration: '60 min',
  note: '',
  phases: [],
};

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const [workout, setWorkout] = useState<WorkoutDefinition | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (isNew) {
        setWorkout({ ...BLANK_WORKOUT, id: generateId() });
      } else {
        const w = await getWorkoutById(id);
        if (w) setWorkout(w);
        else router.push('/');
      }
    }
    load();
  }, [id, isNew, router]);

  async function handleSave(w: WorkoutDefinition) {
    await saveWorkout(w);
    setWorkout(w);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDelete() {
    if (!workout) return;
    if (confirm(`Delete "${workout.name}"? This cannot be undone.`)) {
      await deleteWorkout(workout.id);
      router.push('/');
    }
  }

  if (!workout) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ fontSize: 16, color: 'var(--text-faint)', letterSpacing: 3 }}>LOADING...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface-2)', borderBottom: '1px solid rgb(var(--ink-rgb) / 0.07)',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <BackButton />
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', letterSpacing: 2, flex: 1, textAlign: 'center' }}>
          {isNew ? 'CREATE WORKOUT' : 'EDIT WORKOUT'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && (
            <button
              onClick={handleDelete}
              style={{ background: 'transparent', border: '1px solid rgb(var(--danger-rgb) / 0.3)', borderRadius: 6, color: 'var(--danger)', fontSize: 11, letterSpacing: 2, padding: '6px 14px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              DELETE
            </button>
          )}
          <button
            onClick={() => handleSave(workout)}
            style={{
              background: saved ? 'var(--success)' : 'var(--violet)',
              border: 'none', borderRadius: 6, color: 'var(--text-strong)', fontSize: 11,
              fontWeight: 900, letterSpacing: 2, padding: '6px 16px', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", transition: 'background 0.2s',
            }}
          >
            {saved ? 'SAVED!' : 'SAVE'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 0' }}>
        {/* Workout Meta */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid rgb(var(--ink-rgb) / 0.07)', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 16 }}>WORKOUT DETAILS</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>NAME</div>
              <input
                value={workout.name}
                onChange={e => setWorkout(w => w ? { ...w, name: e.target.value.toUpperCase() } : w)}
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid rgb(var(--ink-rgb) / 0.1)', borderRadius: 6, color: 'var(--text)', padding: '10px 12px', fontSize: 16, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>TAGLINE</div>
              <input
                value={workout.tagline}
                onChange={e => setWorkout(w => w ? { ...w, tagline: e.target.value } : w)}
                placeholder="e.g. Chest · Shoulders · Arms"
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid rgb(var(--ink-rgb) / 0.1)', borderRadius: 6, color: 'var(--text)', padding: '10px 12px', fontSize: 14, fontFamily: "'Barlow Condensed', sans-serif" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>DURATION</div>
              <input
                value={workout.duration}
                onChange={e => setWorkout(w => w ? { ...w, duration: e.target.value } : w)}
                placeholder="e.g. 60 min"
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid rgb(var(--ink-rgb) / 0.1)', borderRadius: 6, color: 'var(--text)', padding: '10px 12px', fontSize: 14, fontFamily: "'Barlow Condensed', sans-serif" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>ACCENT COLOR</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ACCENT_CHOICES.map(color => (
                  <button
                    key={color}
                    onClick={() => setWorkout(w => w ? { ...w, accentColor: color } : w)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: color, border: 'none', cursor: 'pointer',
                      outline: workout.accentColor === color ? `3px solid ${color}` : 'none',
                      outlineOffset: 2, transition: 'outline 0.1s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>COACH NOTE (optional)</div>
            <input
              value={workout.note || ''}
              onChange={e => setWorkout(w => w ? { ...w, note: e.target.value } : w)}
              placeholder="Any important notes for this workout..."
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid rgb(var(--ink-rgb) / 0.1)', borderRadius: 6, color: 'var(--text)', padding: '10px 12px', fontSize: 14, fontFamily: "'Barlow Condensed', sans-serif" }}
            />
          </div>
        </div>

        {/* Editor Canvas */}
        <WorkoutEditorCanvas
          workout={workout}
          onChange={setWorkout as (w: WorkoutDefinition) => void}
        />

        {/* Save button (bottom) */}
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => handleSave(workout)}
            style={{
              width: '100%', padding: '16px', background: workout.accentColor,
              border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 900,
              color: 'var(--scrim)', letterSpacing: 3, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            {saved ? 'SAVED!' : 'SAVE WORKOUT'}
          </button>
        </div>
      </div>
    </div>
  );
}
