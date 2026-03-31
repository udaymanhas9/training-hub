'use client';

import { useState } from 'react';
import { SessionLog, WorkoutDefinition } from '@/lib/types';
import { WORKOUT_TYPE_COLORS } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, parseISO } from 'date-fns';

interface MonthViewProps {
  sessions: SessionLog[];
  workouts: WorkoutDefinition[];
  onDayClick: (day: string) => void;
  selectedDay: string | null;
}

export default function MonthView({ sessions, workouts, onDayClick, selectedDay }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const sessionsByDay: Record<string, SessionLog[]> = {};
  sessions.forEach(s => {
    const key = s.date.slice(0, 10);
    if (!sessionsByDay[key]) sessionsByDay[key] = [];
    sessionsByDay[key].push(s);
  });

  function getWorkoutColor(workoutId: string): string {
    const w = workouts.find(x => x.id === workoutId);
    if (w) return w.accentColor || WORKOUT_TYPE_COLORS[w.type] || '#8b5cf6';
    return '#8b5cf6';
  }

  const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={() => setCurrentMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; })}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#94a3b8', padding: '6px 14px', cursor: 'pointer', fontSize: 14, fontFamily: "'Barlow Condensed', sans-serif', letterSpacing: 2" }}
        >
          ‹
        </button>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#f1f5f9', letterSpacing: 2, fontStyle: 'italic' }}>
          {format(currentMonth, 'MMMM yyyy').toUpperCase()}
        </div>
        <button
          onClick={() => setCurrentMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; })}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#94a3b8', padding: '6px 14px', cursor: 'pointer', fontSize: 14, fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {WEEK_DAYS.map(d => (
          <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 9, letterSpacing: 3, color: '#334155', fontFamily: "'Barlow', sans-serif" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const daySessions = sessionsByDay[key] || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isSelected = selectedDay === key;

          return (
            <div
              key={key}
              onClick={() => daySessions.length > 0 && onDayClick(key)}
              style={{
                padding: '8px 6px',
                minHeight: 56,
                borderRight: '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: isSelected ? 'rgba(59,130,246,0.1)' : today ? 'rgba(255,255,255,0.03)' : 'transparent',
                cursor: daySessions.length > 0 ? 'pointer' : 'default',
                transition: 'background 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (daySessions.length > 0) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? 'rgba(59,130,246,0.1)' : today ? 'rgba(255,255,255,0.03)' : 'transparent'; }}
            >
              <div style={{
                fontSize: 12, fontWeight: today ? 900 : 500,
                color: !inMonth ? '#1e293b' : today ? '#3b82f6' : isSelected ? '#60a5fa' : '#94a3b8',
                marginBottom: 4,
              }}>
                {format(day, 'd')}
              </div>
              {/* Workout dots */}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {daySessions.slice(0, 3).map((s, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: getWorkoutColor(s.workoutId),
                    flexShrink: 0,
                  }} />
                ))}
                {daySessions.length > 3 && (
                  <span style={{ fontSize: 8, color: '#475569' }}>+{daySessions.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {workouts.slice(0, 4).map(w => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: w.accentColor || '#8b5cf6' }} />
            <span style={{ fontSize: 10, color: '#475569', fontFamily: "'Barlow', sans-serif", letterSpacing: 1 }}>{w.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
