'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getWorkoutById, getLastSession, saveSession, getPBs, savePBs, getProfile } from '@/lib/storage';
import { WorkoutDefinition, ExerciseLog, SessionLog, SetLog, PersonalBest } from '@/lib/types';
import WorkoutHero from '@/components/workout/WorkoutHero';
import PhaseAccordion from '@/components/workout/PhaseAccordion';
import ProgressBar from '@/components/workout/ProgressBar';
import MuscleDiagram from '@/components/workout/MuscleDiagram';
import FinishWorkoutModal from '@/components/workout/FinishWorkoutModal';
import BackButton from '@/components/ui/BackButton';
import Toast from '@/components/ui/Toast';
import { todayISO, generateId } from '@/lib/utils';
import { lookupMuscles } from '@/lib/muscleMap';

interface ToastMsg { id: string; message: string; type: 'pb' | 'info'; }

interface WorkoutDraft {
  sessionId: string;
  startTimestamp: number;
  exerciseLogs: Record<string, ExerciseLog>;
  checked: Record<string, boolean>;
  sessionDate: string;
  savedAt: number;
}

function draftKey(workoutId: string) {
  return `workout-draft-${workoutId}`;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [workout, setWorkout] = useState<WorkoutDefinition | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});
  const [openPhase, setOpenPhase] = useState<string>('');
  const [showFinish, setShowFinish] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [newPBs, setNewPBs] = useState<PersonalBest[]>([]);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [sessionDate, setSessionDate] = useState(todayISO());

  // Stable across backgrounding / retries
  const [sessionId, setSessionId] = useState('');
  const [startTimestamp, setStartTimestamp] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const lastSession = useRef<SessionLog | undefined>(undefined);

  function addToast(message: string, type: 'pb' | 'info' = 'info') {
    const t: ToastMsg = { id: generateId(), message, type };
    setToasts(p => [...p, t]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 4000);
  }

  useEffect(() => {
    async function load() {
      const [w, prof] = await Promise.all([getWorkoutById(id), getProfile()]);
      if (!w) { router.push('/'); return; }
      setWorkout(w);
      setOpenPhase(w.phases[0]?.id || '');
      setWeightUnit(prof.weightUnit);
      lastSession.current = await getLastSession(id);

      // Attempt to restore an in-progress draft (covers iOS Safari background kill)
      try {
        const raw = localStorage.getItem(draftKey(id));
        if (raw) {
          const draft: WorkoutDraft = JSON.parse(raw);
          if (Date.now() - draft.savedAt < DRAFT_MAX_AGE_MS) {
            setSessionId(draft.sessionId);
            setStartTimestamp(draft.startTimestamp);
            setExerciseLogs(draft.exerciseLogs);
            setChecked(draft.checked);
            setSessionDate(draft.sessionDate);
            setTimeout(() => addToast('Workout resumed', 'info'), 0);
            return;
          }
          localStorage.removeItem(draftKey(id));
        }
      } catch { /* corrupt localStorage entry — start fresh */ }

      setSessionId(generateId());
      setStartTimestamp(Date.now());
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  // Live elapsed timer — wall-clock based so it stays accurate after phone sleep
  useEffect(() => {
    if (!startTimestamp) return;
    setElapsedSeconds(Math.floor((Date.now() - startTimestamp) / 1000));
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimestamp) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTimestamp]);

  // Persist draft so state survives iOS Safari backgrounding
  useEffect(() => {
    if (!sessionId || !startTimestamp) return;
    const draft: WorkoutDraft = {
      sessionId,
      startTimestamp,
      exerciseLogs,
      checked,
      sessionDate,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(draftKey(id), JSON.stringify(draft));
    } catch { /* storage full — non-critical */ }
  }, [id, sessionId, startTimestamp, exerciseLogs, checked, sessionDate]);

  function toggle(phaseId: string, exId: string) {
    const key = `${phaseId}-${exId}`;
    setChecked(p => ({ ...p, [key]: !p[key] }));
  }

  function logSet(exerciseId: string, exerciseName: string, set: SetLog) {
    setExerciseLogs(prev => {
      const existing = prev[exerciseId] || { exerciseId, exerciseName, sets: [] };
      return { ...prev, [exerciseId]: { ...existing, sets: [...existing.sets, set] } };
    });
  }

  function removeSet(exerciseId: string, idx: number) {
    setExerciseLogs(prev => {
      const existing = prev[exerciseId];
      if (!existing) return prev;
      const sets = existing.sets.filter((_, i) => i !== idx);
      return { ...prev, [exerciseId]: { ...existing, sets } };
    });
  }

  function getLastSessionSets(exerciseId: string): SetLog[] {
    if (!lastSession.current) return [];
    const ex = lastSession.current.exercises.find(e => e.exerciseId === exerciseId);
    return ex?.sets || [];
  }

  async function handleFinish() {
    if (!workout || isSubmitting || hasSubmitted) return;
    setIsSubmitting(true);

    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const exercises = Object.values(exerciseLogs).filter(e => e.sets.length > 0);

    const session: SessionLog = {
      id: sessionId,
      workoutId: workout.id,
      date: sessionDate,
      durationMinutes,
      exercises,
    };

    try {
      const currentPBs = await getPBs();
      const detectedPBs: PersonalBest[] = [];

      exercises.forEach(exLog => {
        exLog.sets.forEach(s => {
          const score = s.weight * s.reps;
          const existing = currentPBs.find(pb => pb.exerciseId === exLog.exerciseId);
          const existingScore = existing ? existing.weight * existing.reps : 0;

          if (score > existingScore) {
            const pb: PersonalBest = {
              exerciseId: exLog.exerciseId,
              exerciseName: exLog.exerciseName,
              weight: s.weight,
              reps: s.reps,
              date: sessionDate,
              workoutId: workout.id,
            };
            const idx = currentPBs.findIndex(p => p.exerciseId === exLog.exerciseId);
            if (idx >= 0) currentPBs[idx] = pb; else currentPBs.push(pb);
            detectedPBs.push(pb);
          }
        });
      });

      await savePBs(currentPBs);
      await saveSession(session);

      try { localStorage.removeItem(draftKey(id)); } catch { /* ok */ }
      setNewPBs(detectedPBs);
      setHasSubmitted(true);
      setShowFinish(true);
    } catch {
      addToast('Failed to save — check your connection and try again', 'info');
      setIsSubmitting(false);
    }
  }

  if (!workout) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <div style={{ fontSize: 16, color: '#475569', letterSpacing: 3 }}>LOADING...</div>
      </div>
    );
  }

  const totalExercises = workout.phases.flatMap(p => p.exercises).length;
  const doneCount = Object.values(checked).filter(Boolean).length;
  const pct = totalExercises > 0 ? Math.round((doneCount / totalExercises) * 100) : 0;
  const canFinish = !isSubmitting && !hasSubmitted;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 60 }}>
      <style>{`
        @keyframes workout-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
      `}</style>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0' }}>
        <div style={{ padding: '16px 24px 0' }}>
          <BackButton />
        </div>

        <WorkoutHero workout={workout} totalExercises={totalExercises} />

        <div style={{ padding: '20px 24px 0' }}>
          <ProgressBar pct={pct} accentColor={workout.accentColor} />
        </div>

        <div style={{ padding: '16px 24px 0' }}>
          <MuscleDiagram
            workoutType={workout.type}
            accentColor={workout.accentColor}
            muscles={workout.phases
              .flatMap(p => p.exercises)
              .flatMap(ex =>
                ex.muscleGroups && ex.muscleGroups.length > 0
                  ? ex.muscleGroups
                  : lookupMuscles(ex.name)
              )
              .filter((m, i, arr) => arr.indexOf(m) === i)}
          />
        </div>

        <div style={{ padding: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {workout.phases.map(phase => (
            <PhaseAccordion
              key={phase.id}
              phase={phase}
              isOpen={openPhase === phase.id}
              onToggle={() => setOpenPhase(prev => prev === phase.id ? '' : phase.id)}
              checked={checked}
              onCheck={toggle}
              exerciseLogs={exerciseLogs}
              onLogSet={logSet}
              onRemoveSet={removeSet}
              lastSessionSets={getLastSessionSets}
              onPB={(msg) => addToast(msg, 'pb')}
              weightUnit={weightUnit}
            />
          ))}
        </div>

        {/* Date picker */}
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif", whiteSpace: 'nowrap' }}>
              SESSION DATE
            </div>
            <input
              type="date"
              value={sessionDate}
              max={todayISO()}
              onChange={e => setSessionDate(e.target.value)}
              style={{
                background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, color: '#f1f5f9', padding: '6px 12px',
                fontSize: 13, fontFamily: "'Barlow', sans-serif",
                colorScheme: 'dark', cursor: 'pointer',
              }}
            />
            {sessionDate !== todayISO() && (
              <span style={{ fontSize: 10, color: '#f59e0b', fontFamily: "'Barlow', sans-serif", letterSpacing: 1 }}>
                LOGGING RETROSPECTIVELY
              </span>
            )}
          </div>
        </div>

        {/* Timer + Finish button */}
        <div style={{ padding: '12px 24px 0' }}>
          {startTimestamp > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, marginBottom: 12,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: workout.accentColor,
                animation: 'workout-blink 2s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: 32, fontWeight: 900, letterSpacing: 6,
                color: '#f1f5f9', fontFamily: "'Barlow Condensed', sans-serif",
                fontStyle: 'italic', lineHeight: 1,
              }}>
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>
          )}

          <button
            onClick={handleFinish}
            disabled={!canFinish}
            style={{
              width: '100%', padding: '16px',
              background: canFinish ? workout.accentColor : '#1e293b',
              border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 900,
              color: canFinish ? '#000' : '#475569',
              letterSpacing: 3, cursor: canFinish ? 'pointer' : 'not-allowed',
              fontFamily: "'Barlow Condensed', sans-serif",
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => canFinish && (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {isSubmitting ? 'SAVING...' : hasSubmitted ? 'SAVED' : 'FINISH WORKOUT'}
          </button>
        </div>
      </div>

      {/* Toasts */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => setToasts(p => p.filter(x => x.id !== t.id))} />
        ))}
      </div>

      {/* Finish Modal */}
      {showFinish && (
        <FinishWorkoutModal
          workout={workout}
          exerciseLogs={Object.values(exerciseLogs)}
          durationMinutes={Math.max(1, Math.round(elapsedSeconds / 60))}
          newPBs={newPBs}
          onClose={() => { setShowFinish(false); router.push('/'); }}
        />
      )}
    </div>
  );
}
