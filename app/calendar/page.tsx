'use client';

import { useState, useEffect } from 'react';
import { getSessions, getWorkouts, getProfile } from '@/lib/storage';
import { SessionLog, WorkoutDefinition } from '@/lib/types';
import MonthView from '@/components/calendar/MonthView';
import WeekHeatmap from '@/components/calendar/WeekHeatmap';
import DayDetailPanel from '@/components/calendar/DayDetailPanel';

export default function CalendarPage() {
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'heatmap'>('month');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  useEffect(() => {
    async function load() {
      const [s, w, p] = await Promise.all([getSessions(), getWorkouts(), getProfile()]);
      setSessions(s);
      setWorkouts(w);
      setWeightUnit(p.weightUnit);
    }
    load();
  }, []);

  const selectedSessions = selectedDay
    ? sessions.filter(s => s.date.slice(0, 10) === selectedDay)
    : [];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '32px 24px 24px',
        background: '#111',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 8 }}>TRAINING CALENDAR</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', fontStyle: 'italic', letterSpacing: -1 }}>HISTORY</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            {(['month', 'heatmap'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '6px 16px', borderRadius: 4, border: '1px solid',
                  borderColor: view === v ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  background: view === v ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: view === v ? '#3b82f6' : '#64748b',
                  fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 0' }}>
        {view === 'month' ? (
          <MonthView
            sessions={sessions}
            workouts={workouts}
            onDayClick={setSelectedDay}
            selectedDay={selectedDay}
          />
        ) : (
          <WeekHeatmap sessions={sessions} onDayClick={setSelectedDay} />
        )}

        {selectedDay && (
          <DayDetailPanel
            date={selectedDay}
            sessions={selectedSessions}
            workouts={workouts}
            onClose={() => setSelectedDay(null)}
            weightUnit={weightUnit}
          />
        )}
      </div>
    </div>
  );
}
