'use client';

import { SessionLog } from '@/lib/types';
import { format, subWeeks, startOfWeek, addDays, parseISO } from 'date-fns';

interface WeekHeatmapProps {
  sessions: SessionLog[];
  onDayClick: (day: string) => void;
}

export default function WeekHeatmap({ sessions, onDayClick }: WeekHeatmapProps) {
  const today = new Date();
  const weeksCount = 52;
  const gridStart = startOfWeek(subWeeks(today, weeksCount - 1), { weekStartsOn: 1 });

  // Count sessions per day
  const countByDay: Record<string, number> = {};
  sessions.forEach(s => {
    const key = s.date.slice(0, 10);
    countByDay[key] = (countByDay[key] || 0) + 1;
  });

  function getColor(count: number): string {
    if (count === 0) return '#1a1a1a';
    if (count === 1) return '#1e3a5f';
    if (count === 2) return '#1d4ed8';
    return '#3b82f6';
  }

  // Build weeks array
  const weeks: Date[][] = [];
  for (let w = 0; w < weeksCount; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(gridStart, w * 7 + d));
    }
    weeks.push(week);
  }

  const DAY_LABELS = ['M', '', 'W', '', 'F', '', ''];

  const totalActive = Object.keys(countByDay).length;
  const totalSessions = sessions.length;
  const maxStreak = (() => {
    let max = 0, cur = 0;
    const sorted = Object.keys(countByDay).sort();
    sorted.forEach((d, i) => {
      if (i === 0) { cur = 1; max = 1; return; }
      const prev = sorted[i - 1];
      const diff = (new Date(d).getTime() - new Date(prev).getTime()) / 86400000;
      if (diff === 1) { cur++; max = Math.max(max, cur); } else { cur = 1; }
    });
    return max;
  })();

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const m = week[0].getMonth();
    if (m !== lastMonth) { monthLabels.push({ label: format(week[0], 'MMM'), col: wi }); lastMonth = m; }
  });

  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#f1f5f9', letterSpacing: 2 }}>52-WEEK ACTIVITY</div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'ACTIVE DAYS', val: totalActive },
            { label: 'SESSIONS', val: totalSessions },
            { label: 'BEST STREAK', val: maxStreak },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>{val}</div>
              <div style={{ fontSize: 8, letterSpacing: 2, color: '#334155', fontFamily: "'Barlow', sans-serif" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4 }}>
            <div style={{ height: 14 }} /> {/* month label spacer */}
            {DAY_LABELS.map((label, i) => (
              <div key={i} style={{ width: 12, height: 12, fontSize: 8, color: '#334155', fontFamily: "'Barlow', sans-serif", display: 'flex', alignItems: 'center' }}>
                {label}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => {
            const monthLabel = monthLabels.find(m => m.col === wi);
            return (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ height: 14, fontSize: 8, color: '#475569', fontFamily: "'Barlow', sans-serif", whiteSpace: 'nowrap' }}>
                  {monthLabel?.label || ''}
                </div>
                {week.map(day => {
                  const key = format(day, 'yyyy-MM-dd');
                  const count = countByDay[key] || 0;
                  const isInFuture = day > today;
                  return (
                    <div
                      key={key}
                      onClick={() => count > 0 && !isInFuture && onDayClick(key)}
                      title={`${key}: ${count} session${count !== 1 ? 's' : ''}`}
                      style={{
                        width: 12, height: 12,
                        background: isInFuture ? '#111' : getColor(count),
                        borderRadius: 2,
                        cursor: count > 0 && !isInFuture ? 'pointer' : 'default',
                        transition: 'opacity 0.15s',
                        border: format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') ? '1px solid #3b82f6' : 'none',
                      }}
                      onMouseEnter={e => { if (count > 0) (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
        <span style={{ fontSize: 9, color: '#334155', fontFamily: "'Barlow', sans-serif" }}>LESS</span>
        {[0, 1, 2, 3].map(v => (
          <div key={v} style={{ width: 10, height: 10, borderRadius: 2, background: getColor(v) }} />
        ))}
        <span style={{ fontSize: 9, color: '#334155', fontFamily: "'Barlow', sans-serif" }}>MORE</span>
      </div>
    </div>
  );
}
