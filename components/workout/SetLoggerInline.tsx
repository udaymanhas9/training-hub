'use client';

import { useState } from 'react';
import { SetLog } from '@/lib/types';

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
    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6 }}>
      {/* Logged sets */}
      {loggedSets.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {loggedSets.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: `${accentColor}20`, border: `1px solid ${accentColor}40`,
                borderRadius: 4, padding: '3px 8px',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>
                {s.weight > 0 ? `${s.weight}${weightUnit}` : 'BW'} × {s.reps}
              </span>
              <button
                onClick={() => onRemove(i)}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder={lastSet ? String(lastSet.weight) : '0'}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={{
                width: 72, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 4, color: '#f1f5f9', padding: '6px 8px', fontSize: 14,
                fontFamily: "'Barlow', sans-serif", textAlign: 'center',
              }}
            />
            <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#475569', pointerEvents: 'none' }}>{weightUnit}</span>
          </div>
          <span style={{ color: '#334155', alignSelf: 'center', fontSize: 16 }}>×</span>
          <input
            type="number"
            value={reps}
            onChange={e => setReps(e.target.value)}
            placeholder={lastSet ? String(lastSet.reps) : 'reps'}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{
              width: 60, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 4, color: '#f1f5f9', padding: '6px 8px', fontSize: 14,
              fontFamily: "'Barlow', sans-serif", textAlign: 'center',
            }}
          />
        </div>
        <button
          onClick={handleAdd}
          style={{
            background: accentColor, border: 'none', borderRadius: 4,
            color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: 1,
            padding: '6px 12px', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        >
          + LOG SET
        </button>
        {lastSet && (
          <span style={{ fontSize: 10, color: '#334155', fontFamily: "'Barlow', sans-serif" }}>
            Last: {lastSet.weight > 0 ? `${lastSet.weight}${weightUnit}` : 'BW'} × {lastSet.reps}
          </span>
        )}
      </div>
    </div>
  );
}
