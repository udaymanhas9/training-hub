'use client';

import { HealthEntry } from '@/lib/types';
import { calculateBMI, kgToLbs } from '@/lib/utils';

interface StatsSummaryCardProps {
  latest: HealthEntry;
  previous: HealthEntry | undefined;
  weightUnit: 'kg' | 'lbs';
  heightCm: number;
}

function TrendArrow({ diff, invertGood }: { diff: number; invertGood?: boolean }) {
  if (Math.abs(diff) < 0.01) return <span style={{ color: 'var(--text-faint)', fontSize: 14 }}>—</span>;
  const isGood = invertGood ? diff > 0 : diff < 0;
  return (
    <span style={{ color: diff > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 14 }}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}
    </span>
  );
}

export default function StatsSummaryCard({ latest, previous, weightUnit, heightCm }: StatsSummaryCardProps) {
  const displayWeight = weightUnit === 'lbs' ? kgToLbs(latest.weight) : latest.weight;
  const prevWeight = previous ? (weightUnit === 'lbs' ? kgToLbs(previous.weight) : previous.weight) : null;
  const weightDiff = prevWeight !== null ? displayWeight - prevWeight : 0;

  const bmi = heightCm > 0 ? calculateBMI(latest.weight, heightCm) : null;
  const prevBMI = previous && heightCm > 0 ? calculateBMI(previous.weight, heightCm) : null;
  const bmiDiff = prevBMI !== null && bmi !== null ? bmi - prevBMI : 0;

  const bfDiff = (latest.bodyFatPct && previous?.bodyFatPct) ? latest.bodyFatPct - previous.bodyFatPct : 0;

  function getBMILabel(b: number): { label: string; color: string } {
    if (b < 18.5) return { label: 'UNDERWEIGHT', color: 'var(--info)' };
    if (b < 25) return { label: 'HEALTHY', color: 'var(--success)' };
    if (b < 30) return { label: 'OVERWEIGHT', color: 'var(--warning)' };
    return { label: 'OBESE', color: 'var(--danger)' };
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Weight */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid rgb(var(--ink-rgb) / 0.07)', borderRadius: 10, padding: '20px 24px' }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>CURRENT WEIGHT</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--info)' }}>{displayWeight}<span style={{ fontSize: 16, color: 'var(--text-subtle)', marginLeft: 4 }}>{weightUnit}</span></div>
        {previous && (
          <div style={{ marginTop: 8, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>
            <TrendArrow diff={weightDiff} />
            <span style={{ color: 'var(--text-faint)', marginLeft: 6 }}>vs last entry</span>
          </div>
        )}
      </div>

      {/* Body Fat */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid rgb(var(--ink-rgb) / 0.07)', borderRadius: 10, padding: '20px 24px' }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>BODY FAT</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--violet)' }}>
          {latest.bodyFatPct ? <>{latest.bodyFatPct}<span style={{ fontSize: 16, color: 'var(--text-subtle)', marginLeft: 2 }}>%</span></> : <span style={{ color: 'var(--text-ghost)' }}>—</span>}
        </div>
        {previous?.bodyFatPct && latest.bodyFatPct && (
          <div style={{ marginTop: 8, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>
            <TrendArrow diff={bfDiff} />
            <span style={{ color: 'var(--text-faint)', marginLeft: 6 }}>vs last entry</span>
          </div>
        )}
      </div>

      {/* BMI */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid rgb(var(--ink-rgb) / 0.07)', borderRadius: 10, padding: '20px 24px' }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>BMI</div>
        {bmi !== null ? (
          <>
            <div style={{ fontSize: 36, fontWeight: 900, color: getBMILabel(bmi).color }}>{bmi}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: getBMILabel(bmi).color, fontFamily: "'Barlow Condensed', sans-serif" }}>
                {getBMILabel(bmi).label}
              </span>
            </div>
            {prevBMI && (
              <div style={{ marginTop: 4, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>
                <TrendArrow diff={bmiDiff} />
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text-ghost)' }}>—</div>
        )}
        {heightCm === 0 && (
          <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: "'Barlow Condensed', sans-serif", marginTop: 4 }}>Set height in profile</div>
        )}
      </div>
    </div>
  );
}
