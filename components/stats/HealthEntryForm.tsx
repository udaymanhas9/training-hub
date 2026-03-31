'use client';

import { useState } from 'react';
import { HealthEntry } from '@/lib/types';
import { todayISO } from '@/lib/utils';

interface HealthEntryFormProps {
  onAdd: (entry: Omit<HealthEntry, 'id' | 'bmi'>) => void;
  weightUnit: 'kg' | 'lbs';
}

export default function HealthEntryForm({ onAdd, weightUnit }: HealthEntryFormProps) {
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    // Always store in kg
    const weightKg = weightUnit === 'lbs' ? Math.round((w / 2.20462) * 10) / 10 : w;
    onAdd({
      date,
      weight: weightKg,
      bodyFatPct: bodyFat ? parseFloat(bodyFat) : undefined,
    });
    setWeight('');
    setBodyFat('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 24px' }}>
      <div style={{ fontSize: 11, letterSpacing: 4, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 16 }}>LOG MEASUREMENT</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>DATE</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f1f5f9', padding: '10px 12px', fontSize: 14, fontFamily: "'Barlow', sans-serif" }}
          />
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>WEIGHT ({weightUnit})</div>
          <input
            type="number"
            step="0.1"
            min="1"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder={`e.g. ${weightUnit === 'kg' ? '82.5' : '182'}`}
            required
            style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f1f5f9', padding: '10px 12px', fontSize: 14, fontFamily: "'Barlow', sans-serif" }}
          />
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>BODY FAT % (optional)</div>
          <input
            type="number"
            step="0.1"
            min="1"
            max="60"
            value={bodyFat}
            onChange={e => setBodyFat(e.target.value)}
            placeholder="e.g. 15.2"
            style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f1f5f9', padding: '10px 12px', fontSize: 14, fontFamily: "'Barlow', sans-serif" }}
          />
        </div>
      </div>
      <button
        type="submit"
        style={{
          background: '#10b981', border: 'none', borderRadius: 6,
          color: '#000', fontSize: 13, fontWeight: 900, letterSpacing: 2,
          padding: '10px 24px', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif",
        }}
      >
        ADD MEASUREMENT
      </button>
    </form>
  );
}
