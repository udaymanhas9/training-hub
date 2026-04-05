'use client';

import { useState, useCallback, useEffect } from 'react';

const BARLOW = "'Barlow Condensed', sans-serif";
const MONO   = "'JetBrains Mono', monospace";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toMonday(iso?: string): string {
  const d = iso ? new Date(iso + 'T00:00:00Z') : new Date();
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function shiftWeek(monday: string, n: number): string {
  const d = new Date(monday + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

function fmtWeek(monday: string): string {
  return new Date(monday + 'T00:00:00Z')
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}

function fmtPace(minKm: number): string {
  return `${Math.floor(minKm)}:${String(Math.round((minKm % 1) * 60)).padStart(2, '0')}`;
}

function blockDuration(start: string, end: string): string {
  const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const mins = toMins(end) - toMins(start);
  if (mins <= 0) return '';
  return mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`;
}

const SCORE_CLR = (n: number) => n >= 8 ? '#10b981' : n >= 6 ? '#f59e0b' : '#ef4444';
const GOAL_CLR: Record<string, string> = {
  Great: '#10b981', Good: '#3b82f6', Okay: '#f59e0b', Poor: '#ef4444',
};
const BLOCK_COLORS: Record<string, { bg: string; accent: string }> = {
  workout_legs:  { bg: 'rgba(239,68,68,0.09)',   accent: '#ef4444' },
  workout_push:  { bg: 'rgba(249,115,22,0.09)',  accent: '#f97316' },
  workout_pull:  { bg: 'rgba(59,130,246,0.09)',  accent: '#3b82f6' },
  run:           { bg: 'rgba(16,185,129,0.09)',  accent: '#10b981' },
  leetcode:      { bg: 'rgba(6,182,212,0.09)',   accent: '#06b6d4' },
  quant:         { bg: 'rgba(167,139,250,0.09)', accent: '#a78bfa' },
  github:        { bg: 'rgba(96,165,250,0.09)',  accent: '#60a5fa' },
  study:         { bg: 'rgba(245,158,11,0.09)',  accent: '#f59e0b' },
  break:         { bg: 'rgba(15,23,42,0.7)',     accent: '#334155' },
  fixed:         { bg: 'rgba(71,85,105,0.12)',   accent: '#64748b' },
};

// ─── types ────────────────────────────────────────────────────────────────────

interface DigestResult {
  weekStart: string;
  weekEnd:   string;
  metrics: {
    workouts: number; runs: number; totalKm: number;
    lcSolved: number; quantDone: number; commits: number;
    sleepAvgHrs: number | null; avgPaceMinKm: number | null;
  };
  score: number;
  wins: string[]; didntGoWell: string[]; keyLessons: string[];
  progressOnGoals: { quant_ml: string; coding_dsa: string; fitness: string; other: string };
  bottlenecks: string[]; nextWeekPriorities: string[];
  systemAdjustments: string[]; oneFocus: string;
}

interface Commitment {
  id: string; label: string; days: string[]; durationMins: number;
}

interface ScheduleConfig {
  workDays: string[];
  morningStart: string; morningEnd: string;
  afternoonStart: string; afternoonEnd: string;
  gymTime: 'early' | 'evening';
  commitments: Commitment[];
  notes: string;
}

interface Block {
  start: string; end: string; label: string; type: string;
}

interface DaySchedule {
  day: string; date: string; isWorkDay: boolean; blocks: Block[];
}

const DEFAULT_CONFIG: ScheduleConfig = {
  workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  morningStart: '07:30', morningEnd: '12:00',
  afternoonStart: '14:00', afternoonEnd: '18:00',
  gymTime: 'early',
  commitments: [
    { id: '1', label: 'Daily LeetCode', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], durationMins: 90 },
    { id: '2', label: 'Run', days: ['Mon','Wed','Fri'], durationMins: 90 },
  ],
  notes: '',
};

// ─── review sub-components ────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 62, cx = 80, circ = 2 * Math.PI * r;
  const color = SCORE_CLR(score);
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1c1c1c" strokeWidth="10" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="16"
        strokeLinecap="round" opacity="0.08"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 10)}
        transform={`rotate(-90 ${cx} ${cx})`}
      />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 10)}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset 0.7s ease, stroke 0.4s' }}
      />
      <text x={cx} y="76" textAnchor="middle" fill="#f1f5f9" fontSize="48" fontWeight="700" fontFamily={BARLOW}>{score}</text>
      <text x={cx} y="99" textAnchor="middle" fill="#334155" fontSize="11" fontFamily={MONO} letterSpacing="2">/ 10</text>
    </svg>
  );
}

function Card({ accent, title, children, span2 = false }: {
  accent: string; title: string; children: React.ReactNode; span2?: boolean;
}) {
  return (
    <div style={{
      background: '#0d0d0d', borderRadius: 3,
      border: `1px solid ${accent}20`, borderTop: `2px solid ${accent}`,
      padding: '18px 22px', gridColumn: span2 ? '1 / -1' : undefined,
    }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 4, color: accent, fontFamily: MONO, margin: '0 0 16px' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((t, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color, fontSize: 10, lineHeight: '20px', flexShrink: 0 }}>▸</span>
          <span style={{ color: '#94a3b8', fontSize: 14, fontFamily: BARLOW, lineHeight: '20px', letterSpacing: 0.3 }}>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function StatBox({ val, label, sub }: { val: string; label: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 6px' }}>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: '#f1f5f9', fontFamily: BARLOW }}>{val}</div>
      {sub && <div style={{ fontSize: 9, color: '#10b981', fontFamily: MONO, margin: '3px 0 1px', letterSpacing: 1 }}>{sub}</div>}
      <div style={{ fontSize: 8, letterSpacing: 2, color: '#475569', fontFamily: MONO, marginTop: sub ? 0 : 4 }}>{label}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`@keyframes sk{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
      {[160, 72, 72, 72, 72, 72].map((h, i) => (
        <div key={i} style={{ height: h, background: '#0d0d0d', borderRadius: 3, animation: `sk 1.4s ease-in-out ${i * 0.1}s infinite` }} />
      ))}
    </div>
  );
}

// ─── schedule sub-components ──────────────────────────────────────────────────

function CommitmentRow({ c, onChange, onDelete }: {
  c: Commitment; onChange: (c: Commitment) => void; onDelete: () => void;
}) {
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const inp: React.CSSProperties = {
    background: '#111', border: '1px solid #1e1e1e', borderRadius: 2,
    color: '#94a3b8', fontFamily: MONO, fontSize: 10, padding: '5px 8px', outline: 'none',
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid #0f0f0f' }}>
      <input value={c.label} onChange={e => onChange({ ...c, label: e.target.value })}
        placeholder="Label" style={{ ...inp, flex: 1, minWidth: 120 }} />
      <input type="number" value={c.durationMins}
        onChange={e => onChange({ ...c, durationMins: Math.max(5, parseInt(e.target.value) || 30) })}
        style={{ ...inp, width: 52 }} />
      <span style={{ fontSize: 8, color: '#334155', fontFamily: MONO }}>MIN</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {DAYS.map(d => {
          const on = c.days.includes(d);
          return (
            <button key={d} onClick={() => onChange({ ...c, days: on ? c.days.filter(x => x !== d) : [...c.days, d] })}
              style={{
                width: 22, height: 22, fontSize: 8, fontFamily: MONO, fontWeight: 700,
                borderRadius: 2, cursor: 'pointer', border: 'none',
                background: on ? 'rgba(99,102,241,0.25)' : '#111',
                color: on ? '#818cf8' : '#2a2a2a',
              }}>
              {d[0]}
            </button>
          );
        })}
      </div>
      <button onClick={onDelete}
        style={{ background: 'none', border: 'none', color: '#2a2a2a', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
        onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
      >×</button>
    </div>
  );
}

function DayCard({ day }: { day: DaySchedule }) {
  const dateLabel = new Date(day.date + 'T00:00:00Z')
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
    .toUpperCase();
  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 3, overflow: 'hidden', minWidth: 0 }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px', borderBottom: '1px solid #111',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, fontFamily: BARLOW, color: day.isWorkDay ? '#f1f5f9' : '#2a2a2a' }}>
          {day.day.slice(0, 3).toUpperCase()}
        </span>
        <span style={{ fontSize: 8, color: '#2a2a2a', fontFamily: MONO }}>{dateLabel}</span>
      </div>
      {/* Blocks */}
      {day.blocks.length > 0 ? (
        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {day.blocks.map((block, i) => {
            const clr = BLOCK_COLORS[block.type] ?? BLOCK_COLORS.fixed;
            return (
              <div key={i} style={{
                background: clr.bg, borderLeft: `2px solid ${clr.accent}`,
                borderRadius: 2, padding: '5px 8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 8, color: clr.accent, fontFamily: MONO }}>{block.start}</span>
                  <span style={{ fontSize: 8, color: '#2a2a2a', fontFamily: MONO }}>{blockDuration(block.start, block.end)}</span>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: BARLOW, letterSpacing: 0.3, lineHeight: 1.3 }}>
                  {block.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '24px 12px', textAlign: 'center' }}>
          <span style={{ fontSize: 8, color: '#1e1e1e', fontFamily: MONO, letterSpacing: 3 }}>REST</span>
        </div>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  // ── review state ──────────────────────────────────────────────────────────
  const [week,    setWeek]    = useState(() => toMonday());
  const [result,  setResult]  = useState<DigestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  // ── schedule state ────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState<'review' | 'schedule'>('review');
  const [schedConfig,  setSchedConfig]  = useState<ScheduleConfig>(DEFAULT_CONFIG);
  const [schedule,     setSchedule]     = useState<DaySchedule[] | null>(null);
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedErr,     setSchedErr]     = useState<string | null>(null);
  const [configOpen,   setConfigOpen]   = useState(true);

  // ── effects ───────────────────────────────────────────────────────────────

  // Load review from localStorage when week changes
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`review_${week}`);
      setResult(cached ? JSON.parse(cached) : null);
    } catch { setResult(null); }
    setErr(null);
  }, [week]);

  // Load schedule from localStorage when week changes
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`schedule_${week}`);
      setSchedule(cached ? JSON.parse(cached) : null);
    } catch { setSchedule(null); }
    setSchedErr(null);
  }, [week]);

  // Load schedule config from localStorage once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('schedule_prefs');
      if (stored) setSchedConfig(JSON.parse(stored));
    } catch {}
  }, []);

  // Auto-save schedule config whenever it changes
  useEffect(() => {
    localStorage.setItem('schedule_prefs', JSON.stringify(schedConfig));
  }, [schedConfig]);

  // ── callbacks ─────────────────────────────────────────────────────────────

  const thisMonday = toMonday();
  const isCurrent  = week >= thisMonday;
  const isGenerating = activeTab === 'review' ? loading : schedLoading;

  const generate = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/digest?week=${week}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Request failed');
      const data: DigestResult = await res.json();
      localStorage.setItem(`review_${week}`, JSON.stringify(data));
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [week]);

  const generateSchedule = useCallback(async () => {
    setSchedLoading(true); setSchedErr(null);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week,
          config: schedConfig,
          reviewData: result ? {
            oneFocus:            result.oneFocus,
            nextWeekPriorities:  result.nextWeekPriorities,
            bottlenecks:         result.bottlenecks,
            progressOnGoals:     result.progressOnGoals,
            didntGoWell:         result.didntGoWell,
          } : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Request failed');
      const data = await res.json();
      const sched = data.schedule as DaySchedule[];
      localStorage.setItem(`schedule_${week}`, JSON.stringify(sched));
      setSchedule(sched);
      setConfigOpen(false);
    } catch (e) {
      setSchedErr(e instanceof Error ? e.message : String(e));
    } finally { setSchedLoading(false); }
  }, [week, schedConfig, result]);

  const prevWeek = () => setWeek(w => shiftWeek(w, -1));
  const nextWeek = () => { if (!isCurrent) setWeek(w => shiftWeek(w, 1)); };

  const m = result?.metrics;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', padding: '20px 20px 64px', paddingTop: 'calc(32px + 20px)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: 20, flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 44, fontWeight: 700, color: '#f1f5f9', fontFamily: BARLOW, letterSpacing: 5, lineHeight: 1 }}>
              WEEKLY REVIEW
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 9, color: '#334155', fontFamily: MONO, letterSpacing: 3 }}>
              AI-GENERATED PERFORMANCE DIGEST
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={prevWeek} style={{ background: 'none', border: '1px solid #1e1e1e', borderRadius: 2, color: '#475569', cursor: 'pointer', padding: '5px 12px', fontSize: 13, fontFamily: MONO, lineHeight: 1 }}>←</button>
              <span style={{ fontSize: 12, color: '#64748b', fontFamily: MONO, letterSpacing: 1, minWidth: 136, textAlign: 'center' }}>
                {fmtWeek(week)}
              </span>
              <button onClick={nextWeek} style={{ background: 'none', border: '1px solid #1e1e1e', borderRadius: 2, color: isCurrent ? '#222' : '#475569', cursor: isCurrent ? 'default' : 'pointer', padding: '5px 12px', fontSize: 13, fontFamily: MONO, lineHeight: 1 }}>→</button>
            </div>

            <button
              onClick={activeTab === 'review' ? generate : generateSchedule}
              disabled={isGenerating}
              style={{
                background: isGenerating ? '#0d0d0d' : 'rgba(99,102,241,0.1)',
                border: `1px solid ${isGenerating ? '#1e1e1e' : 'rgba(99,102,241,0.45)'}`,
                borderRadius: 2, padding: '9px 22px',
                color: isGenerating ? '#334155' : '#818cf8',
                fontSize: 10, fontWeight: 700, letterSpacing: 3,
                fontFamily: MONO, cursor: isGenerating ? 'wait' : 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)'; }}
              onMouseLeave={e => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)'; }}
            >
              {activeTab === 'review'
                ? (loading ? 'GENERATING...' : '⚡  GENERATE REVIEW')
                : (schedLoading ? 'GENERATING...' : '⚡  GENERATE SCHEDULE')}
            </button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #161616', marginBottom: 24 }}>
          {(['review', 'schedule'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 20px', fontSize: 10, fontWeight: 700, letterSpacing: 3,
              fontFamily: MONO, transition: 'color 0.15s',
              color: activeTab === tab ? '#f1f5f9' : '#334155',
              borderBottom: activeTab === tab ? '2px solid #818cf8' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ── REVIEW TAB ─────────────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'review' && (
          <>
            {err && (
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 3, padding: '12px 16px', marginBottom: 20, color: '#f87171', fontFamily: MONO, fontSize: 11 }}>
                {err}
              </div>
            )}

            {!result && !loading && !err && (
              <div style={{ border: '1px dashed #1a1a1a', borderRadius: 4, padding: '80px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 52, color: '#1e1e1e', marginBottom: 20, lineHeight: 1 }}>◎</div>
                <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 4, color: '#252525', margin: 0 }}>
                  GENERATE A REVIEW FOR THE WEEK OF {fmtWeek(week)}
                </p>
              </div>
            )}

            {loading && <Skeleton />}

            {result && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Hero */}
                <div style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 3, padding: '24px 28px', display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <ScoreRing score={result.score} />
                    <span style={{ fontSize: 8, letterSpacing: 3, color: '#1e2a38', fontFamily: MONO }}>WEEKLY SCORE</span>
                  </div>
                  <div className="hidden md:block" style={{ width: 1, height: 100, background: '#1a1a1a', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, flex: 1, justifyContent: 'center', padding: '8px 0' }}>
                    <StatBox val={String(m!.workouts)} label="WORKOUTS" />
                    <StatBox val={String(m!.runs)} label="RUNS" sub={m!.totalKm > 0 ? `${m!.totalKm} KM` : undefined} />
                    {m!.avgPaceMinKm !== null && <StatBox val={fmtPace(m!.avgPaceMinKm!)} label="AVG PACE" sub="MIN / KM" />}
                    <StatBox val={String(m!.lcSolved)}  label="LEETCODE" />
                    <StatBox val={String(m!.quantDone)} label="QUANT" />
                    <StatBox val={String(m!.commits)}   label="COMMITS" />
                    {m!.sleepAvgHrs !== null && <StatBox val={String(m!.sleepAvgHrs)} label="SLEEP AVG" sub="HRS / NIGHT" />}
                  </div>
                </div>

                {/* One Focus */}
                <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderLeft: '3px solid #818cf8', borderRadius: 3, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 8, letterSpacing: 4, color: '#4f46e5', fontFamily: MONO, flexShrink: 0 }}>ONE FOCUS</span>
                  <div style={{ width: 1, height: 28, background: 'rgba(99,102,241,0.25)', flexShrink: 0 }} />
                  <span style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', fontFamily: BARLOW, letterSpacing: 2 }}>→ {result.oneFocus}</span>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10 }}>
                  <Card accent="#10b981" title="01 — WINS"><Bullets items={result.wins} color="#10b981" /></Card>
                  <Card accent="#ef4444" title="02 — DIDN'T GO WELL"><Bullets items={result.didntGoWell} color="#ef4444" /></Card>
                  <Card accent="#3b82f6" title="03 — KEY LESSONS"><Bullets items={result.keyLessons} color="#3b82f6" /></Card>

                  <Card accent="#f59e0b" title="04 — PROGRESS ON GOALS">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                      {(Object.entries({ 'QUANT / ML': result.progressOnGoals.quant_ml, 'CODING / DSA': result.progressOnGoals.coding_dsa, 'FITNESS': result.progressOnGoals.fitness, 'OTHER': result.progressOnGoals.other }) as [string, string][]).map(([label, val]) => {
                        const clr = GOAL_CLR[val] ?? '#475569';
                        return (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: '#475569', fontFamily: MONO, letterSpacing: 1 }}>{label}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: clr, fontFamily: MONO, padding: '3px 10px', background: `${clr}12`, border: `1px solid ${clr}35`, borderRadius: 2 }}>
                              {val?.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card accent="#f97316" title="05 — BOTTLENECKS"><Bullets items={result.bottlenecks} color="#f97316" /></Card>

                  <Card accent="#a78bfa" title="06 — NEXT WEEK PRIORITIES">
                    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {result.nextWeekPriorities.map((t, i) => (
                        <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', fontFamily: MONO, lineHeight: '20px', flexShrink: 0, minWidth: 14 }}>{i + 1}.</span>
                          <span style={{ color: '#94a3b8', fontSize: 14, fontFamily: BARLOW, lineHeight: '20px', letterSpacing: 0.3 }}>{t}</span>
                        </li>
                      ))}
                    </ol>
                  </Card>

                  <Card accent="#fbbf24" title="07 — SYSTEM ADJUSTMENTS" span2>
                    <Bullets items={result.systemAdjustments} color="#fbbf24" />
                  </Card>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ── SCHEDULE TAB ───────────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'schedule' && (
          <>
            {/* Hint if no review */}
            {!result && (
              <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 3, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: '#4f46e5', fontFamily: MONO }}>ℹ</span>
                <span style={{ fontSize: 10, color: '#334155', fontFamily: MONO, letterSpacing: 1 }}>
                  GENERATE A REVIEW FIRST TO GET SCHEDULE RECOMMENDATIONS BASED ON YOUR PERFORMANCE
                </span>
              </div>
            )}

            {schedErr && (
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 3, padding: '12px 16px', marginBottom: 12, color: '#f87171', fontFamily: MONO, fontSize: 11 }}>
                {schedErr}
              </div>
            )}

            {/* Config panel */}
            <div style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
              <button onClick={() => setConfigOpen(o => !o)} style={{
                width: '100%', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: configOpen ? '1px solid #161616' : 'none',
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 4, color: '#475569', fontFamily: MONO }}>CONFIGURATION</span>
                <span style={{ color: '#2a2a2a', fontFamily: MONO, fontSize: 11 }}>{configOpen ? '▲' : '▼'}</span>
              </button>

              {configOpen && (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

                  {/* Available days */}
                  <div>
                    <p style={{ fontSize: 8, color: '#475569', fontFamily: MONO, letterSpacing: 3, margin: '0 0 10px' }}>AVAILABLE DAYS</p>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => {
                        const on = schedConfig.workDays.includes(d);
                        return (
                          <button key={d} onClick={() => setSchedConfig(c => ({ ...c, workDays: on ? c.workDays.filter(x => x !== d) : [...c.workDays, d] }))}
                            style={{ padding: '5px 10px', fontSize: 9, fontFamily: MONO, fontWeight: 700, letterSpacing: 1, borderRadius: 2, cursor: 'pointer', background: on ? 'rgba(99,102,241,0.18)' : '#111', border: on ? '1px solid rgba(99,102,241,0.4)' : '1px solid #1e1e1e', color: on ? '#818cf8' : '#334155' }}>
                            {d.slice(0, 2).toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Work window + gym */}
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {[
                      { label: 'MORNING', startKey: 'morningStart' as const, endKey: 'morningEnd' as const },
                      { label: 'AFTERNOON', startKey: 'afternoonStart' as const, endKey: 'afternoonEnd' as const },
                    ].map(({ label, startKey, endKey }) => (
                      <div key={label}>
                        <p style={{ fontSize: 8, color: '#475569', fontFamily: MONO, letterSpacing: 3, margin: '0 0 10px' }}>{label}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {[startKey, endKey].map((key, ki) => (
                            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {ki === 1 && <span style={{ color: '#2a2a2a', fontFamily: MONO, fontSize: 10 }}>→</span>}
                              <input type="time" value={schedConfig[key]}
                                onChange={e => setSchedConfig(c => ({ ...c, [key]: e.target.value }))}
                                style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 2, color: '#94a3b8', fontFamily: MONO, fontSize: 11, padding: '5px 8px' }} />
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div>
                      <p style={{ fontSize: 8, color: '#475569', fontFamily: MONO, letterSpacing: 3, margin: '0 0 10px' }}>GYM TIME</p>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['early', 'evening'] as const).map(opt => {
                          const on = schedConfig.gymTime === opt;
                          return (
                            <button key={opt} onClick={() => setSchedConfig(c => ({ ...c, gymTime: opt }))}
                              style={{ padding: '5px 12px', fontSize: 9, fontFamily: MONO, fontWeight: 700, letterSpacing: 1, borderRadius: 2, cursor: 'pointer', background: on ? 'rgba(16,185,129,0.15)' : '#111', border: on ? '1px solid rgba(16,185,129,0.4)' : '1px solid #1e1e1e', color: on ? '#10b981' : '#334155' }}>
                              {opt === 'early' ? 'EARLY AM' : 'EVENING'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Recurring commitments */}
                  <div>
                    <p style={{ fontSize: 8, color: '#475569', fontFamily: MONO, letterSpacing: 3, margin: '0 0 8px' }}>RECURRING COMMITMENTS</p>
                    {schedConfig.commitments.map(c => (
                      <CommitmentRow key={c.id} c={c}
                        onChange={updated => setSchedConfig(cfg => ({ ...cfg, commitments: cfg.commitments.map(x => x.id === updated.id ? updated : x) }))}
                        onDelete={() => setSchedConfig(cfg => ({ ...cfg, commitments: cfg.commitments.filter(x => x.id !== c.id) }))}
                      />
                    ))}
                    <button
                      onClick={() => setSchedConfig(c => ({ ...c, commitments: [...c.commitments, { id: Date.now().toString(), label: '', days: [], durationMins: 45 }] }))}
                      style={{ marginTop: 10, background: 'none', border: '1px dashed #1e1e1e', borderRadius: 2, color: '#334155', cursor: 'pointer', padding: '6px 14px', fontSize: 9, fontFamily: MONO, letterSpacing: 2 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#818cf8'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#334155'; (e.currentTarget as HTMLElement).style.borderColor = '#1e1e1e'; }}
                    >
                      + ADD COMMITMENT
                    </button>
                  </div>

                  {/* Notes */}
                  <div>
                    <p style={{ fontSize: 8, color: '#475569', fontFamily: MONO, letterSpacing: 3, margin: '0 0 10px' }}>NOTES FOR THE AI</p>
                    <textarea value={schedConfig.notes} onChange={e => setSchedConfig(c => ({ ...c, notes: e.target.value }))}
                      placeholder="e.g. exam Thursday morning, skip gym Friday..."
                      rows={2}
                      style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 2, color: '#94a3b8', fontFamily: MONO, fontSize: 10, padding: '8px 10px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                </div>
              )}
            </div>

            {/* Schedule loading */}
            {schedLoading && <Skeleton />}

            {/* Schedule empty state */}
            {!schedule && !schedLoading && !schedErr && (
              <div style={{ border: '1px dashed #1a1a1a', borderRadius: 4, padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, color: '#1e1e1e', marginBottom: 16, lineHeight: 1 }}>▦</div>
                <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 4, color: '#252525', margin: 0 }}>
                  CONFIGURE AND GENERATE YOUR WEEK SCHEDULE
                </p>
              </div>
            )}

            {/* Week grid */}
            {schedule && !schedLoading && (
              <div>
                <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(148px, 1fr))', gap: 8, minWidth: 1050 }}>
                    {schedule.map(day => <DayCard key={day.date} day={day} />)}
                  </div>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #111' }}>
                  {Object.entries({
                    'Workout': '#ef4444', 'Run': '#10b981',
                    'LeetCode': '#06b6d4', 'Quant': '#a78bfa',
                    'GitHub': '#60a5fa', 'Study': '#f59e0b',
                    'Break': '#334155',
                  }).map(([label, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 1, background: color, opacity: 0.7 }} />
                      <span style={{ fontSize: 8, color: '#334155', fontFamily: MONO, letterSpacing: 1 }}>{label.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}
