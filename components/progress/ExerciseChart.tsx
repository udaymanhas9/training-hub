'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

interface DataPoint {
  date: string;
  weight: number;
  reps: number;
}

interface ExerciseChartProps {
  exerciseName: string;
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ fontSize: 14, fontWeight: 700, color: p.color, fontFamily: "'Barlow Condensed', sans-serif" }}>
          {p.dataKey === 'weight' ? `${p.value}kg` : `${p.value} reps`}
        </div>
      ))}
    </div>
  );
}

export default function ExerciseChart({ exerciseName, data }: ExerciseChartProps) {
  // Aggregate by date (max weight × reps per day)
  const byDay: Record<string, { weight: number; reps: number }> = {};
  data.forEach(d => {
    const key = d.date.slice(0, 10);
    if (!byDay[key] || d.weight * d.reps > byDay[key].weight * byDay[key].reps) {
      byDay[key] = { weight: d.weight, reps: d.reps };
    }
  });

  const chartData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date: (() => { try { return format(parseISO(date), 'dd MMM'); } catch { return date; } })(),
      weight: v.weight,
      reps: v.reps,
    }));

  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 16px' }}>
      <div style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9', marginBottom: 20, letterSpacing: 1 }}>
        {exerciseName}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: "'Barlow', sans-serif" }}
            axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="weight"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: "'Barlow', sans-serif" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}kg`}
          />
          <YAxis
            yAxisId="reps"
            orientation="right"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: "'Barlow', sans-serif" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}r`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="weight"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: '#3b82f6' }}
          />
          <Line
            yAxisId="reps"
            type="monotone"
            dataKey="reps"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: '#10b981' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, color: '#64748b', fontFamily: "'Barlow', sans-serif", letterSpacing: 2 }}
            formatter={v => v.toUpperCase()}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
