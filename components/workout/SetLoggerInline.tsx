'use client';

import { useState } from 'react';
import { SetLog } from '@/lib/types';
import { tint } from '@/lib/theme';

interface SetLoggerInlineProps {
  exerciseId: string;
  accentColor: string;
  loggedSets: SetLog[];
  lastSets: SetLog[];
  weightUnit: 'kg' | 'lbs';
  onLog: (set: SetLog) => void;
  onRemove: (idx: number) => void;
}

export default function SetLoggerInline({
  exerciseId,
  accentColor,
  loggedSets,
  lastSets,
  weightUnit,
  onLog,
  onRemove,
}: SetLoggerInlineProps) {
  const lastSet = lastSets[loggedSets.length] || lastSets[lastSets.length - 1];
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  function handleAdd() {
    const r = parseInt(reps) || 0;
    const w = parseFloat(weight) || 0;
    if (r <= 0 && w <= 0) return;
    onLog({ reps: r || 1, weight: w, unit: weightUnit });
    setReps('');
    setWeight('');
  }

  return (
    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgb(var(--ink-rgb) / 0.03)', border: '1px solid rgb(var(--ink-rgb) / 0.07)', borderRadius: 6 }}>
      {/* Logged sets */}
      {loggedSets.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {loggedSets.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: `${tint(accentColor, 0.13)}`, border: `1px solid ${tint(accentColor, 0.25)}`,
                borderRadius: 4, padding: '3px 8px',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>
                {s.weight > 0 ? `${s.weight}${weightUnit}` : 'BW'} × {s.reps}
              </span>
              <button
                onClick={() => onRemove(i)}
                style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row — large touch targets for phone use */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder={lastSet ? String(lastSet.weight) : '0'}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={{
                width: 80, background: 'var(--surface)', border: '1px solid rgb(var(--ink-rgb) / 0.12)',
                borderRadius: 6, color: 'var(--text)', padding: '10px 8px', fontSize: 16,
                fontFamily: "'Barlow Condensed', sans-serif", textAlign: 'center',
                minHeight: 44,
              }}
            />
            <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: 'var(--text-faint)', pointerEvents: 'none' }}>{weightUnit}</span>
          </div>
          <span style={{ color: 'var(--text-ghost)', fontSize: 18, fontWeight: 700 }}>×</span>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={e => setReps(e.target.value)}
            placeholder={lastSet ? String(lastSet.reps) : 'reps'}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{
              width: 70, background: 'var(--surface)', border: '1px solid rgb(var(--ink-rgb) / 0.12)',
              borderRadius: 6, color: 'var(--text)', padding: '10px 8px', fontSize: 16,
              fontFamily: "'Barlow Condensed', sans-serif", textAlign: 'center',
              minHeight: 44,
            }}
          />
        </div>
        <button
          onClick={handleAdd}
          style={{
            background: accentColor, border: 'none', borderRadius: 6,
            color: 'var(--scrim)', fontSize: 13, fontWeight: 900, letterSpacing: 1,
            padding: '10px 16px', cursor: 'pointer', minHeight: 44,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        >+ LOG</button>
        {lastSet && (
          <span style={{ fontSize: 10, color: 'var(--text-ghost)', fontFamily: "'Barlow Condensed', sans-serif" }}>
            Last: {lastSet.weight > 0 ? `${lastSet.weight}${weightUnit}` : 'BW'} × {lastSet.reps}
          </span>
        )}
      </div>
    </div>
  );
}
