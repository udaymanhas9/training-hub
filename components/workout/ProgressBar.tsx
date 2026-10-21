'use client';

import { tint } from '@/lib/theme';

interface ProgressBarProps {
  pct: number;
  accentColor: string;
}

export default function ProgressBar({ pct, accentColor }: ProgressBarProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: 4, color: 'var(--text-subtle)', fontFamily: "'Barlow Condensed', sans-serif" }}>WORKOUT PROGRESS</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: pct === 100 ? 'var(--success)' : accentColor }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--surface-blue)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          className="progress-bar"
          style={{
            height: '100%',
            width: `${pct}%`,
            background: pct === 100 ? 'var(--success)' : `linear-gradient(90deg, ${accentColor}, ${tint(accentColor, 0.80)})`,
            borderRadius: 2,
          }}
        />
      </div>
      {pct === 100 && (
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 20, fontWeight: 900, color: 'var(--success)', letterSpacing: 3 }}>
          SESSION COMPLETE
        </div>
      )}
    </div>
  );
}
