'use client';

import { useState, useEffect } from 'react';
import { getPBs, getSessions, getWorkouts, getProfile, savePBs } from '@/lib/storage';
import { PersonalBest, SessionLog, WorkoutDefinition } from '@/lib/types';
import PBTable from '@/components/progress/PBTable';
import ExerciseChart from '@/components/progress/ExerciseChart';
import { generateId, todayISO, lbsToKg } from '@/lib/utils';

export default function ProgressPage() {
  const [pbs, setPBs] = useState<PersonalBest[]>([]);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  // Manual PB form
  const [showPBForm, setShowPBForm] = useState(false);
  const [pbName, setPbName] = useState('');
  const [pbWeight, setPbWeight] = useState('');
  const [pbReps, setPbReps] = useState('');
  const [pbDate, setPbDate] = useState(todayISO());
  const [pbSaving, setPbSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [p, s, w, prof] = await Promise.all([getPBs(), getSessions(), getWorkouts(), getProfile()]);
      setPBs(p);
      setSessions(s);
      setWorkouts(w);
      setWeightUnit(prof.weightUnit);
    }
    load();
  }, []);

  async function handleAddPB(e: React.FormEvent) {
    e.preventDefault();
    if (!pbName.trim() || !pbWeight || !pbReps) return;
    setPbSaving(true);
    const weightKg = weightUnit === 'lbs' ? lbsToKg(parseFloat(pbWeight)) : parseFloat(pbWeight);
    const newPB: PersonalBest = {
      exerciseId: pbName.trim().toLowerCase().replace(/\s+/g, '-'),
      exerciseName: pbName.trim(),
      weight: weightKg,
      reps: parseInt(pbReps),
      date: pbDate,
      workoutId: '',
    };
    const current = [...pbs];
    const idx = current.findIndex(p => p.exerciseId === newPB.exerciseId);
    if (idx >= 0) current[idx] = newPB; else current.push(newPB);
    await savePBs(current);
    setPBs(current);
    setPbName('');
    setPbWeight('');
    setPbReps('1');
    setPbDate(todayISO());
    setShowPBForm(false);
    setPbSaving(false);
  }

  // Build exercise history for charting
  const exerciseHistory = (() => {
    const map: Record<string, { date: string; weight: number; reps: number }[]> = {};
    sessions.forEach(s => {
      s.exercises.forEach(ex => {
        if (!map[ex.exerciseId]) map[ex.exerciseId] = [];
        ex.sets.forEach(set => {
          map[ex.exerciseId].push({ date: s.date, weight: set.weight, reps: set.reps });
        });
      });
    });
    return map;
  })();

  const exerciseNames: Record<string, string> = {};
  sessions.forEach(s => s.exercises.forEach(ex => { exerciseNames[ex.exerciseId] = ex.exerciseName; }));

  const exercisesWithData = Object.keys(exerciseHistory).filter(id => exerciseHistory[id].length > 1);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '32px 24px 24px',
        background: '#111',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 8 }}>PERFORMANCE TRACKING</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', fontStyle: 'italic', letterSpacing: -1 }}>PROGRESS</h1>
          <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'PERSONAL BESTS', val: pbs.length, color: '#f59e0b' },
              { label: 'EXERCISES TRACKED', val: Object.keys(exerciseNames).length, color: '#3b82f6' },
              { label: 'TOTAL SESSIONS', val: sessions.length, color: '#10b981' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color }}>{val}</div>
                <div style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 0' }}>
        {/* PB Table */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>PERSONAL BESTS</div>
            <button
              onClick={() => setShowPBForm(v => !v)}
              style={{
                background: showPBForm ? 'rgba(245,158,11,0.15)' : 'transparent',
                border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6,
                color: '#f59e0b', fontSize: 11, fontWeight: 700, letterSpacing: 2,
                padding: '6px 14px', cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            >
              {showPBForm ? 'CANCEL' : '+ ADD PB'}
            </button>
          </div>

          {/* Manual PB form */}
          {showPBForm && (
            <form onSubmit={handleAddPB} style={{
              background: '#111', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 10, padding: '20px 20px', marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: '#f59e0b', fontFamily: "'Barlow', sans-serif", marginBottom: 16 }}>
                ADD / UPDATE PERSONAL BEST
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>EXERCISE NAME</div>
                  <input
                    value={pbName} onChange={e => setPbName(e.target.value)}
                    placeholder="e.g. Bench Press"
                    required
                    style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 12px', color: '#f1f5f9', fontSize: 15, fontFamily: "'Barlow Condensed', sans-serif', letterSpacing: 1", outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(245,158,11,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>WEIGHT ({weightUnit})</div>
                  <input
                    type="number" min="0" step="0.5"
                    value={pbWeight} onChange={e => setPbWeight(e.target.value)}
                    placeholder="0"
                    required
                    style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 12px', color: '#f1f5f9', fontSize: 15, fontFamily: "'Barlow', sans-serif", outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(245,158,11,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>REPS</div>
                  <input
                    type="number" min="1" step="1"
                    value={pbReps} onChange={e => setPbReps(e.target.value)}
                    placeholder="1"
                    required
                    style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 12px', color: '#f1f5f9', fontSize: 15, fontFamily: "'Barlow', sans-serif", outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(245,158,11,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>DATE</div>
                  <input
                    type="date" value={pbDate} onChange={e => setPbDate(e.target.value)}
                    style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, fontFamily: "'Barlow', sans-serif", outline: 'none', colorScheme: 'dark' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(245,158,11,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={pbSaving}
                style={{
                  background: '#f59e0b', border: 'none', borderRadius: 6,
                  color: '#000', fontSize: 13, fontWeight: 900, letterSpacing: 2,
                  padding: '10px 24px', cursor: pbSaving ? 'default' : 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  opacity: pbSaving ? 0.6 : 1,
                }}
              >
                {pbSaving ? 'SAVING...' : 'SAVE PB'}
              </button>
            </form>
          )}

          {pbs.length > 0 ? (
            <PBTable pbs={pbs} workouts={workouts} weightUnit={weightUnit} />
          ) : (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#475569', letterSpacing: 2 }}>NO PBS YET</div>
              <div style={{ fontSize: 13, color: '#334155', fontFamily: "'Barlow', sans-serif", marginTop: 8 }}>Add your current PBs above, or log sets during workouts</div>
            </div>
          )}
        </div>

        {/* Exercise Charts */}
        {exercisesWithData.length > 0 && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 16 }}>EXERCISE HISTORY</div>
            <div style={{ marginBottom: 16 }}>
              <select
                value={selectedExercise || ''}
                onChange={e => setSelectedExercise(e.target.value || null)}
                style={{
                  background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                  color: '#f1f5f9', padding: '8px 12px', fontSize: 14, cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1,
                  width: '100%', maxWidth: 320,
                }}
              >
                <option value="">Select an exercise...</option>
                {exercisesWithData.map(id => (
                  <option key={id} value={id}>{exerciseNames[id]}</option>
                ))}
              </select>
            </div>
            {selectedExercise && exerciseHistory[selectedExercise] && (
              <ExerciseChart
                exerciseName={exerciseNames[selectedExercise]}
                data={exerciseHistory[selectedExercise]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
