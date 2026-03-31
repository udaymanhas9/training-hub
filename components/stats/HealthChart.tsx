'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HealthEntry } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { kgToLbs } from '@/lib/utils';

interface HealthChartProps {
  entries: HealthEntry[];
  weightUnit: 'kg' | 'lbs';
}

type ChartMetric = 'weight' | 'bodyFatPct' | 'bmi';

function CustomTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number; color: string }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Barlow', sans-serif", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: payload[0].color }}>
        {payload[0].value}{unit}
      </div>
    </div>
  );
}

const METRICS: { key: ChartMetric; label: string; color: string; unit: string }[] = [
  { key: 'weight', label: 'WEIGHT', color: '#3b82f6', unit: 'kg' },
  { key: 'bodyFatPct', label: 'BODY FAT', color: '#8b5cf6', unit: '%' },
  { key: 'bmi', label: 'BMI', color: '#10b981', unit: '' },
];

export default function HealthChart({ entries, weightUnit }: HealthChartProps) {
  const [metric, setMetric] = useState<ChartMetric>('weight');

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  const chartData = sorted.map(e => {
    const displayWeight = weightUnit === 'lbs' ? kgToLbs(e.weight) : e.weight;
    return {
      date: (() => { try { return format(parseISO(e.date), 'dd MMM'); } catch { return e.date; } })(),
      weight: displayWeight,
      bodyFatPct: e.bodyFatPct || null,
      bmi: e.bmi || null,
    };
  }).filter(d => d[metric] !== null);

  const metricDef = METRICS.find(m => m.key === metric)!;
  const displayUnit = metric === 'weight' ? weightUnit : metricDef.unit;

  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 16px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            style={{
              padding: '5px 14px', borderRadius: 4, border: '1px solid',
              borderColor: metric === m.key ? m.color : 'rgba(255,255,255,0.1)',
              background: metric === m.key ? `${m.color}18` : 'transparent',
              color: metric === m.key ? m.color : '#64748b',
              fontSize: 10, fontWeight: 700, letterSpacing: 2, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#475569', fontSize: 10, fontFamily: "'Barlow', sans-serif" }}
              axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 10, fontFamily: "'Barlow', sans-serif" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}${displayUnit}`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip unit={displayUnit} />} />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={metricDef.color}
              strokeWidth={2.5}
              dot={{ fill: metricDef.color, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: metricDef.color }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, color: '#334155', fontFamily: "'Barlow', sans-serif" }}>Add more entries to see trends</span>
        </div>
      )}
    </div>
  );
}
