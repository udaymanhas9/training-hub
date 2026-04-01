'use client';

import { SessionLog, LeetCodeEntry, QuantEntry, StravaActivity } from '@/lib/types';
import { format, subWeeks, startOfWeek, addDays } from 'date-fns';

interface UniversalHeatmapProps {
  sessions: SessionLog[];
  leetcode: LeetCodeEntry[];
  quant: QuantEntry[];
  githubDays: Record<string, number>;  // date → commit count
  stravaActivities?: StravaActivity[];
  theme?: 'training' | 'lab';
}

const ACTIVITY_COLORS = {
  training: { r: 239, g: 68,  b: 68  },  // #ef4444
  leetcode: { r: 0,   g: 184, b: 163 },  // #00b8a3
  quant:    { r: 139, g: 92,  b: 246 },  // #8b5cf6
  github:   { r: 245, g: 158, b: 11  },  // #f59e0b
};

function blendColors(
  activities: { color: { r: number; g: number; b: number }; count: number }[]
): string {
  const active = activities.filter(a => a.count > 0);
  if (active.length === 0) return '';

  let r = 0, g = 0, b = 0, totalWeight = 0;
  active.forEach(({ color, count }) => {
    const w = Math.sqrt(count);
    r += color.r * w;
    g += color.g * w;
    b += color.b * w;
    totalWeight += w;
  });
  r = Math.round(r / totalWeight);
  g = Math.round(g / totalWeight);
  b = Math.round(b / totalWeight);

  // Intensity: 0.15 for 1 activity, up to 1.0 for high activity
  const intensity = Math.min(1, 0.15 + (totalWeight / 8) * 0.85);

  return `rgba(${r}, ${g}, ${b}, ${intensity})`;
}

const DAY_LABELS = ['M', '', 'W', '', 'F', '', ''];

export default function UniversalHeatmap({
  sessions,
  leetcode,
  quant,
  githubDays,
  stravaActivities = [],
  theme = 'training',
}: UniversalHeatmapProps) {
  const isLab = theme === 'lab';
  const today = new Date();
  const weeksCount = 52;
  const gridStart = startOfWeek(subWeeks(today, weeksCount - 1), { weekStartsOn: 1 });

  // Index activity counts by date
  const trainingByDay: Record<string, number> = {};
  sessions.forEach(s => {
    const k = s.date.slice(0, 10);
    trainingByDay[k] = (trainingByDay[k] || 0) + 1;
  });
  stravaActivities.forEach(a => {
    const k = new Date(a.startDate).toISOString().slice(0, 10);
    trainingByDay[k] = (trainingByDay[k] || 0) + 1;
  });

  const leetcodeByDay: Record<string, number> = {};
  leetcode.forEach(e => {
    const k = e.date.slice(0, 10);
    leetcodeByDay[k] = (leetcodeByDay[k] || 0) + 1;
  });

  const quantByDay: Record<string, number> = {};
  quant.forEach(e => {
    const k = e.date.slice(0, 10);
    quantByDay[k] = (quantByDay[k] || 0) + 1;
  });

  // Build weeks array
  const weeks: Date[][] = [];
  for (let w = 0; w < weeksCount; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(gridStart, w * 7 + d));
    }
    weeks.push(week);
  }

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const m = week[0].getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ label: format(week[0], 'MMM'), col: wi });
      lastMonth = m;
    }
  });

  const bg = isLab ? '#000000' : '#0a0a0a';
  const emptyColor = isLab ? 'rgba(255,42,42,0.06)' : 'rgba(255,255,255,0.04)';
  const borderColor = isLab ? 'rgba(255,42,42,0.2)' : 'rgba(255,255,255,0.07)';
  const labelColor = isLab ? '#737373' : '#475569';
  const font = isLab ? "'JetBrains Mono', monospace" : "'Barlow Condensed', sans-serif";
  const titleColor = isLab ? '#E5E5E5' : '#f1f5f9';
  const todayBorder = isLab ? '#FF2A2A' : '#3b82f6';

  const legend = [
    { label: 'TRAINING', color: '#ef4444' },
    { label: 'LEETCODE', color: '#00b8a3' },
    { label: 'QUANT',    color: '#8b5cf6' },
    { label: 'COMMITS',  color: '#f59e0b' },
  ];

  return (
    <div style={{
      background: bg,
      border: `1px solid ${borderColor}`,
      borderRadius: isLab ? 2 : 10,
      padding: '20px 24px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: titleColor, letterSpacing: 4, marginBottom: 16, fontFamily: font }}>
        ACTIVITY MATRIX — 52 WEEKS
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4 }}>
            <div style={{ height: 14 }} />
            {DAY_LABELS.map((label, i) => (
              <div key={i} style={{
                width: 12, height: 12, fontSize: 8, color: labelColor,
                fontFamily: font, display: 'flex', alignItems: 'center',
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wi) => {
            const monthLabel = monthLabels.find(m => m.col === wi);
            return (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ height: 14, fontSize: 8, color: labelColor, fontFamily: font, whiteSpace: 'nowrap' }}>
                  {monthLabel?.label || ''}
                </div>
                {week.map(day => {
                  const key = format(day, 'yyyy-MM-dd');
                  const isInFuture = day > today;
                  const tCount = trainingByDay[key] || 0;
                  const lCount = leetcodeByDay[key] || 0;
                  const qCount = quantByDay[key] || 0;
                  const gCount = githubDays[key] || 0;

                  const blended = blendColors([
                    { color: ACTIVITY_COLORS.training, count: tCount },
                    { color: ACTIVITY_COLORS.leetcode, count: lCount },
                    { color: ACTIVITY_COLORS.quant,    count: qCount },
                    { color: ACTIVITY_COLORS.github,   count: gCount },
                  ]);

                  const cellColor = isInFuture ? 'transparent' : (blended || emptyColor);
                  const hasActivity = tCount + lCount + qCount + gCount > 0;

                  const tooltipParts = [];
                  if (tCount) tooltipParts.push(`${tCount} training`);
                  if (lCount) tooltipParts.push(`${lCount} leetcode`);
                  if (qCount) tooltipParts.push(`${qCount} quant`);
                  if (gCount) tooltipParts.push(`${gCount} commits`);

                  return (
                    <div
                      key={key}
                      title={`${key}${tooltipParts.length ? ': ' + tooltipParts.join(', ') : ''}`}
                      style={{
                        width: 12, height: 12,
                        background: cellColor,
                        borderRadius: 2,
                        cursor: hasActivity && !isInFuture ? 'pointer' : 'default',
                        transition: 'opacity 0.15s',
                        border: key === format(today, 'yyyy-MM-dd') ? `1px solid ${todayBorder}` : 'none',
                      }}
                      onMouseEnter={e => { if (hasActivity) (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
        {legend.map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.8 }} />
            <span style={{ fontSize: 8, color: labelColor, letterSpacing: 2, fontFamily: font }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
