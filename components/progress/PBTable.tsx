'use client';

import { useState } from 'react';
import { PersonalBest, WorkoutDefinition } from '@/lib/types';
import { formatDate, WORKOUT_TYPE_COLORS } from '@/lib/utils';
import { parseISO, differenceInDays } from 'date-fns';

interface PBTableProps {
  pbs: PersonalBest[];
  workouts: WorkoutDefinition[];
  weightUnit?: 'kg' | 'lbs';
}

type SortKey = 'exerciseName' | 'weight' | 'date';

export default function PBTable({ pbs, workouts, weightUnit = 'kg' }: PBTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('weight');
  const [sortAsc, setSortAsc] = useState(false);
  const profile = { weightUnit };

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  function displayWeight(w: number): string {
    if (profile.weightUnit === 'lbs') return `${Math.round(w * 2.20462)}lbs`;
    return `${w}kg`;
  }

  function getWorkoutColor(workoutId: string): string {
    const w = workouts.find(x => x.id === workoutId);
    return w?.accentColor || WORKOUT_TYPE_COLORS[w?.type || 'custom'] || '#8b5cf6';
  }

  const sorted = [...pbs].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'exerciseName') cmp = a.exerciseName.localeCompare(b.exerciseName);
    else if (sortKey === 'weight') cmp = (a.weight * a.reps) - (b.weight * b.reps);
    else if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
    return sortAsc ? cmp : -cmp;
  });

  function isRecent(dateStr: string): boolean {
    try { return differenceInDays(new Date(), parseISO(dateStr)) <= 14; }
    catch { return false; }
  }

  const cols: { key: SortKey | null; label: string }[] = [
    { key: 'exerciseName', label: 'EXERCISE' },
    { key: 'weight', label: 'BEST (1RM equiv)' },
    { key: null, label: 'REPS' },
    { key: 'date', label: 'DATE' },
    { key: null, label: 'WORKOUT' },
  ];

  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 60px 110px 100px', gap: 0, padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {cols.map(({ key, label }) => (
          <div
            key={label}
            onClick={() => key && handleSort(key)}
            style={{
              fontSize: 9, letterSpacing: 3, color: key && sortKey === key ? '#f1f5f9' : '#475569',
              fontFamily: "'Barlow', sans-serif", cursor: key ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {label}
            {key && sortKey === key && <span style={{ fontSize: 8 }}>{sortAsc ? '▲' : '▼'}</span>}
          </div>
        ))}
      </div>

      {sorted.map((pb, i) => {
        const recent = isRecent(pb.date);
        const color = getWorkoutColor(pb.workoutId);
        return (
          <div key={pb.exerciseId} style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 60px 110px 100px', gap: 0,
            padding: '12px 18px', alignItems: 'center',
            borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            background: recent ? 'rgba(245,158,11,0.04)' : 'transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {recent && <span style={{ fontSize: 14 }}>🏆</span>}
              <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{pb.exerciseName}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: recent ? '#fbbf24' : '#f1f5f9' }}>
              {displayWeight(pb.weight)}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: "'Barlow', sans-serif" }}>{pb.reps}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontFamily: "'Barlow', sans-serif" }}>{formatDate(pb.date)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 11, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>
                {workouts.find(w => w.id === pb.workoutId)?.name || '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
