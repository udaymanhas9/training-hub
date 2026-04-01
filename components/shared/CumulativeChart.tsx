'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { SessionLog, LeetCodeEntry, QuantEntry, StravaActivity } from '@/lib/types';
import { format, startOfWeek, addWeeks, parseISO, isAfter, subWeeks } from 'date-fns';

interface CumulativeChartProps {
  sessions: SessionLog[];
  leetcode: LeetCodeEntry[];
  quant: QuantEntry[];
  githubDays: Record<string, number>;
  stravaActivities?: StravaActivity[];
}

interface WeekBucket {
  weekLabel: string;
  training: number;
  leetcode: number;
  quant: number;
  commits: number;
}

const SERIES = [
  { key: 'training', color: '#ef4444', label: 'Training' },
  { key: 'leetcode', color: '#00b8a3', label: 'LeetCode' },
  { key: 'quant',    color: '#8b5cf6', label: 'Quant'    },
  { key: 'commits',  color: '#f59e0b', label: 'Commits'  },
] as const;

const RANGES = [
  { label: '4W',  weeks: 4  },
  { label: '8W',  weeks: 8  },
  { label: '3M',  weeks: 13 },
  { label: '6M',  weeks: 26 },
  { label: 'ALL', weeks: 0  },
] as const;

type RangeLabel = typeof RANGES[number]['label'];

function toDate(dateStr: string): Date {
  try { return parseISO(dateStr); } catch { return new Date(dateStr); }
}

export default function CumulativeChart({ sessions, leetcode, quant, githubDays, stravaActivities = [] }: CumulativeChartProps) {
  const [range, setRange] = useState<RangeLabel>('3M');
  const today = new Date();

  const allDates: Date[] = [
    ...sessions.map(s => toDate(s.date)),
    ...leetcode.map(e => toDate(e.date)),
    ...quant.map(e => toDate(e.date)),
    ...Object.keys(githubDays).map(d => toDate(d)),
    ...stravaActivities.map(a => toDate(new Date(a.startDate).toISOString().slice(0, 10))),
  ].filter(d => !isNaN(d.getTime()));

  if (allDates.length === 0) {
    return (
      <div style={{
        height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#737373', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2,
      }}>
        NO DATA YET
      </div>
    );
  }

  const selectedWeeks = RANGES.find(r => r.label === range)!.weeks;
  const earliest = allDates.reduce((min, d) => d < min ? d : min, allDates[0]);
  const absoluteStart = startOfWeek(earliest, { weekStartsOn: 1 });
  const rangeStart = selectedWeeks === 0
    ? absoluteStart
    : startOfWeek(subWeeks(today, selectedWeeks), { weekStartsOn: 1 });
  const effectiveStart = rangeStart < absoluteStart ? absoluteStart : rangeStart;

  // Build weekly buckets
  const buckets: WeekBucket[] = [];
  let cursor = effectiveStart;
  while (!isAfter(cursor, today)) {
    const weekEnd = addWeeks(cursor, 1);
    const isCurrentWeek = cursor <= today && today < weekEnd;
    const label = isCurrentWeek ? format(today, 'MMM d') : format(cursor, 'MMM d');

    buckets.push({
      weekLabel: label,
      training: sessions.filter(s => { const d = toDate(s.date); return d >= cursor && d < weekEnd; }).length
              + stravaActivities.filter(a => { const d = toDate(new Date(a.startDate).toISOString().slice(0, 10)); return d >= cursor && d < weekEnd; }).length,
      leetcode: leetcode.filter(e => { const d = toDate(e.date); return d >= cursor && d < weekEnd; }).length,
      quant:    quant.filter(e    => { const d = toDate(e.date); return d >= cursor && d < weekEnd; }).length,
      commits:  Object.entries(githubDays).reduce((sum, [ds, cnt]) => {
        const d = toDate(ds); return d >= cursor && d < weekEnd ? sum + cnt : sum;
      }, 0),
    });
    cursor = weekEnd;
  }

  const MONO = "'JetBrains Mono', monospace";

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: '#0a0a0a', border: '1px solid rgba(255,42,42,0.3)',
        padding: '10px 14px', fontFamily: MONO, fontSize: 11,
      }}>
        <div style={{ color: '#737373', marginBottom: 6, letterSpacing: 2 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name.toUpperCase()}: {p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Range selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'flex-end' }}>
        {RANGES.map(({ label }) => (
          <button
            key={label}
            onClick={() => setRange(label)}
            style={{
              background: range === label ? 'rgba(255,42,42,0.12)' : 'transparent',
              border: `1px solid ${range === label ? 'rgba(255,42,42,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: range === label ? '#FF2A2A' : '#737373',
              padding: '4px 10px', fontSize: 9, letterSpacing: 2,
              cursor: 'pointer', fontFamily: MONO,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,42,42,0.08)" />
          <XAxis
            dataKey="weekLabel"
            stroke="#737373"
            tick={{ fill: '#737373', fontFamily: MONO, fontSize: 9 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#737373"
            tick={{ fill: '#737373', fontFamily: MONO, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, paddingTop: 8 }} />
          {SERIES.map(({ key, color, label }) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stackId="a"
              stroke={color}
              fill={color}
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
