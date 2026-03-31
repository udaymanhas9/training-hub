'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getLeetCodeEntries, saveLeetCodeEntry, deleteLeetCodeEntry, getProfile, saveProfile } from '@/lib/storage';
import { LeetCodeEntry, Difficulty, ProblemStatus, UserProfile } from '@/lib/types';
import { generateId, todayISO } from '@/lib/utils';

const MONO = "'JetBrains Mono', monospace";

const DIFF_COLORS: Record<Difficulty, string> = {
  Easy:   '#00b8a3',
  Medium: '#ffc01e',
  Hard:   '#ff375f',
};

const STATUS_COLORS: Record<ProblemStatus, string> = {
  Solved:    '#00b8a3',
  Attempted: '#ffc01e',
  Revisit:   '#FF2A2A',
};

const LANGUAGES = ['Python', 'C++', 'Java', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Other'];
const STATUSES: ProblemStatus[] = ['Solved', 'Attempted', 'Revisit'];
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

// LeetCode lang codes → display names
const LANG_MAP: Record<string, string> = {
  python3: 'Python', python: 'Python', cpp: 'C++', java: 'Java',
  javascript: 'JavaScript', typescript: 'TypeScript', golang: 'Go',
  rust: 'Rust', c: 'C', csharp: 'C#', ruby: 'Ruby', swift: 'Swift',
  kotlin: 'Kotlin', scala: 'Scala', php: 'PHP',
};

function normLang(raw: string): string {
  return LANG_MAP[raw?.toLowerCase()] ?? raw ?? 'Other';
}

function DiffBadge({ diff }: { diff: Difficulty }) {
  return (
    <span style={{
      padding: '2px 8px',
      border: `1px solid ${DIFF_COLORS[diff]}`,
      color: DIFF_COLORS[diff],
      fontSize: 8, letterSpacing: 2, fontFamily: MONO,
    }}>
      {diff.toUpperCase()}
    </span>
  );
}

function StatusText({ status }: { status: ProblemStatus }) {
  return (
    <span style={{ color: STATUS_COLORS[status], fontSize: 9, letterSpacing: 2, fontFamily: MONO, fontWeight: 700 }}>
      {status.toUpperCase()}
    </span>
  );
}

interface LCStats {
  solved: { All: number; Easy: number; Medium: number; Hard: number };
  total:  { All: number; Easy: number; Medium: number; Hard: number };
  ranking: number;
  streak: number;
  totalActiveDays: number;
  submissionCalendar: string; // JSON string { "unixTs": count }
}

interface LookupResult {
  name: string;
  difficulty: Difficulty;
  topics: string[];
}

// ── Mini heatmap (26 weeks) ──────────────────────────────────────────────────
function SubmissionHeatmap({ calendarJson }: { calendarJson: string }) {
  const calendar: Record<string, number> = (() => {
    try { return JSON.parse(calendarJson); } catch { return {}; }
  })();

  const today = new Date();
  const weeks = 26;
  const cells: { date: string; count: number }[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 6; d >= 0; d--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - (w * 7 + d));
      const iso = dt.toISOString().slice(0, 10);
      // calendar keys can be any timestamp within that day
      const count = Object.entries(calendar).reduce((acc, [k, v]) => {
        const kDate = new Date(parseInt(k) * 1000).toISOString().slice(0, 10);
        return kDate === iso ? acc + v : acc;
      }, 0);
      cells.push({ date: iso, count });
    }
  }

  const maxCount = Math.max(...cells.map(c => c.count), 1);

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${weeks}, 10px)`,
        gridTemplateRows: 'repeat(7, 10px)',
        gridAutoFlow: 'column',
        gap: 2,
      }}>
        {cells.map(({ date, count }) => {
          const intensity = count === 0 ? 0 : Math.max(0.15, Math.sqrt(count) / Math.sqrt(maxCount));
          const color = count === 0
            ? 'rgba(255,255,255,0.05)'
            : `rgba(0,184,163,${intensity})`;
          return (
            <div
              key={date}
              title={`${date}: ${count} submissions`}
              style={{ width: 10, height: 10, background: color, borderRadius: 2 }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Difficulty progress bar ──────────────────────────────────────────────────
function DiffBar({ label, solved, total, color }: { label: string; solved: number; total: number; color: string }) {
  const pct = total > 0 ? (solved / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 8, color, letterSpacing: 3 }}>{label}</span>
        <span style={{ fontSize: 8, color: '#737373', letterSpacing: 1 }}>{solved}/{total}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', width: '100%' }}>
        <div style={{ height: 3, width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function LeetCodePage() {
  const [entries, setEntries]         = useState<LeetCodeEntry[]>([]);
  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [formOpen, setFormOpen]       = useState(false);

  // LeetCode stats (from GraphQL)
  const [stats, setStats]             = useState<LCStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError]   = useState('');

  // Sync state
  const [syncStatus, setSyncStatus]   = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [syncMsg, setSyncMsg]         = useState('');
  const [lastSync, setLastSync]       = useState<Date | null>(null);

  // Cookie setup panel
  const [showCookiePanel, setShowCookiePanel] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const [cookieSaving, setCookieSaving] = useState(false);

  // Form state
  const [probNum, setProbNum]         = useState('');
  const [probName, setProbName]       = useState('');
  const [difficulty, setDifficulty]   = useState<Difficulty>('Medium');
  const [topics, setTopics]           = useState<string[]>([]);
  const [status, setStatus]           = useState<ProblemStatus>('Solved');
  const [language, setLanguage]       = useState('Python');
  const [timeTaken, setTimeTaken]     = useState('');
  const [notes, setNotes]             = useState('');
  const [date, setDate]               = useState(todayISO());
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError]   = useState('');
  const [manualMode, setManualMode]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  // Filters
  const [filterDiff, setFilterDiff]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTopic, setFilterTopic] = useState('');

  const numInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch LeetCode stats ─────────────────────────────────────────────────
  const fetchStats = useCallback(async (username: string) => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const res = await fetch(`/api/leetcode/stats?username=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setStats(data);
    } catch {
      setStatsError('Could not fetch LeetCode stats.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Sync submissions ─────────────────────────────────────────────────────
  const syncSubmissions = useCallback(async (
    username: string,
    session: string | undefined,
    currentEntries: LeetCodeEntry[],
  ): Promise<LeetCodeEntry[]> => {
    setSyncStatus('syncing');
    setSyncMsg('Fetching submissions...');

    const existingBySlug = new Map<string, LeetCodeEntry>();
    currentEntries.forEach(e => {
      const slug = e.problemName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      existingBySlug.set(slug, e);
    });

    let allSubs: { titleSlug: string; title: string; timestamp: number; lang: string; statusDisplay: string }[] = [];
    let offset = 0;
    let hasMore = true;
    let pages = 0;
    const maxPages = session ? 20 : 1; // paginate more with session

    while (hasMore && pages < maxPages) {
      const res = await fetch('/api/leetcode/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, session, offset }),
      });
      if (!res.ok) break;
      const data = await res.json();
      allSubs = allSubs.concat(data.submissions || []);
      hasMore = data.hasMore;
      offset += 50;
      pages++;
      if (pages < maxPages && hasMore) setSyncMsg(`Fetching page ${pages + 1}...`);
    }

    // Deduplicate: keep latest accepted per slug
    const latestBySlug = new Map<string, typeof allSubs[0]>();
    allSubs.forEach(s => {
      const existing = latestBySlug.get(s.titleSlug);
      if (!existing || s.timestamp > existing.timestamp) {
        latestBySlug.set(s.titleSlug, s);
      }
    });

    setSyncMsg(`Looking up ${latestBySlug.size} problems...`);

    const newEntries: LeetCodeEntry[] = [];
    let looked = 0;

    for (const [slug, sub] of Array.from(latestBySlug)) {
      looked++;
      if (looked % 10 === 0) setSyncMsg(`Looking up ${looked}/${latestBySlug.size}...`);

      // If already in DB (by slug match), preserve existing entry but merge if needed
      const existing = existingBySlug.get(slug);
      if (existing) continue; // already tracked — don't overwrite user notes/time/status

      // Lookup problem metadata
      try {
        const res = await fetch(`/api/leetcode?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) continue;
        const meta = await res.json();

        const entry: LeetCodeEntry = {
          id: generateId(),
          problemNumber: parseInt(meta.number, 10),
          problemName:   meta.name,
          difficulty:    meta.difficulty as Difficulty,
          topics:        meta.topics || [],
          status:        sub.statusDisplay === 'Accepted' ? 'Solved' : 'Attempted',
          language:      normLang(sub.lang),
          date:          new Date(sub.timestamp * 1000).toISOString().slice(0, 10),
        };

        await saveLeetCodeEntry(entry);
        newEntries.push(entry);
        existingBySlug.set(slug, entry); // prevent duplicates within this batch
      } catch {
        // skip individual lookup errors
      }
    }

    setSyncStatus('done');
    setSyncMsg(`Synced ${newEntries.length} new problem${newEntries.length !== 1 ? 's' : ''}.`);
    setLastSync(new Date());
    return newEntries;
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [data, prof] = await Promise.all([getLeetCodeEntries(), getProfile()]);
        setEntries(data);
        setProfile(prof);

        if (prof.leetcodeUsername) {
          fetchStats(prof.leetcodeUsername);
          try {
            const newEntries = await syncSubmissions(prof.leetcodeUsername, prof.leetcodeSession, data);
            if (newEntries.length > 0) {
              setEntries(prev => [...newEntries, ...prev]);
            }
          } catch {
            setSyncStatus('error');
            setSyncMsg('Sync failed.');
          }
        } else {
          setSyncStatus('idle');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save cookie ──────────────────────────────────────────────────────────
  async function handleSaveCookie(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setCookieSaving(true);
    const updated: UserProfile = { ...profile, leetcodeSession: cookieInput.trim() };
    await saveProfile(updated);
    setProfile(updated);
    setCookieInput('');
    setShowCookiePanel(false);
    setCookieSaving(false);
    // Re-sync with new session
    if (profile.leetcodeUsername) {
      try {
        const newEntries = await syncSubmissions(profile.leetcodeUsername, cookieInput.trim(), entries);
        if (newEntries.length > 0) setEntries(prev => [...newEntries, ...prev]);
      } catch {
        setSyncStatus('error');
        setSyncMsg('Sync failed.');
      }
    }
  }

  // ── Manual form helpers ──────────────────────────────────────────────────
  async function lookupProblem(num: string) {
    if (!num) return;
    setLookupLoading(true);
    setLookupError('');
    setManualMode(false);
    try {
      const res = await fetch(`/api/leetcode?num=${encodeURIComponent(num)}`);
      if (!res.ok) throw new Error('Not found');
      const data: LookupResult = await res.json();
      setProbName(data.name);
      setDifficulty(data.difficulty);
      setTopics(data.topics);
    } catch {
      setLookupError('Could not fetch — enter manually.');
      setManualMode(true);
    } finally {
      setLookupLoading(false);
    }
  }

  function resetForm() {
    setProbNum(''); setProbName(''); setDifficulty('Medium'); setTopics([]);
    setStatus('Solved'); setLanguage('Python'); setTimeTaken(''); setNotes('');
    setDate(todayISO()); setLookupError(''); setManualMode(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!probNum || !probName) return;
    setSubmitting(true);
    try {
      const entry: LeetCodeEntry = {
        id: generateId(),
        problemNumber: parseInt(probNum, 10),
        problemName: probName,
        difficulty,
        topics,
        status,
        language,
        timeTaken: timeTaken ? parseInt(timeTaken, 10) : undefined,
        notes: notes || undefined,
        date,
      };
      await saveLeetCodeEntry(entry);
      setEntries(prev => [entry, ...prev]);
      resetForm();
      setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteLeetCodeEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const allTopics = Array.from(new Set(entries.flatMap(e => e.topics))).sort();
  const filtered  = entries.filter(e => {
    if (filterDiff   && e.difficulty !== filterDiff)         return false;
    if (filterStatus && e.status     !== filterStatus)       return false;
    if (filterTopic  && !e.topics.includes(filterTopic))     return false;
    return true;
  });

  const localSolved    = entries.filter(e => e.status === 'Solved').length;
  const localAttempted = entries.filter(e => e.status === 'Attempted').length;
  const localRevisit   = entries.filter(e => e.status === 'Revisit').length;
  const avgTime = (() => {
    const timed = entries.filter(e => e.timeTaken);
    if (!timed.length) return null;
    return Math.round(timed.reduce((a, e) => a + (e.timeTaken || 0), 0) / timed.length);
  })();

  // ── Styles ───────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'transparent', border: '1px solid rgba(255,42,42,0.25)',
    color: '#E5E5E5', padding: '8px 10px', fontFamily: MONO, fontSize: 11, outline: 'none', width: '100%',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 8, color: '#737373', letterSpacing: 4, display: 'block', marginBottom: 6, fontFamily: MONO,
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer', appearance: 'none' as const, WebkitAppearance: 'none' as const,
  };

  const hasUsername = !!profile?.leetcodeUsername;
  const hasSession  = !!profile?.leetcodeSession;

  return (
    <div style={{ minHeight: '100vh', background: '#000000', fontFamily: MONO }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,42,42,0.15)', padding: '28px 28px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 9, color: '#737373', letterSpacing: 5, marginBottom: 8 }}>THE LAB / LEETCODE</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#E5E5E5', letterSpacing: 4 }}>
              LEETCODE TRACKER
            </h1>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Sync status indicator */}
              {syncStatus === 'syncing' && (
                <span style={{ fontSize: 8, color: '#ffc01e', letterSpacing: 2 }}>
                  ● {syncMsg || 'SYNCING...'}
                </span>
              )}
              {syncStatus === 'done' && (
                <span style={{ fontSize: 8, color: '#00b8a3', letterSpacing: 2 }}>
                  ● SYNC COMPLETE{lastSync ? ` — ${Math.round((Date.now() - lastSync.getTime()) / 60000)}m ago` : ''}
                </span>
              )}
              {syncStatus === 'error' && (
                <span style={{ fontSize: 8, color: '#ff375f', letterSpacing: 2 }}>
                  ● SYNC ERROR
                </span>
              )}
              <button
                onClick={() => setShowCookiePanel(p => !p)}
                style={{
                  background: showCookiePanel ? 'rgba(255,42,42,0.1)' : 'transparent',
                  border: '1px solid rgba(255,42,42,0.3)', color: '#737373',
                  cursor: 'pointer', padding: '6px 12px', fontSize: 8, letterSpacing: 3, fontFamily: MONO,
                }}
              >
                {hasSession ? 'SESSION ✓' : 'ADD SESSION'}
              </button>
              <button
                onClick={() => { setFormOpen(f => !f); if (!formOpen) resetForm(); }}
                style={{
                  background: formOpen ? 'rgba(255,42,42,0.1)' : 'transparent',
                  border: '1px solid rgba(255,42,42,0.4)', color: '#FF2A2A',
                  cursor: 'pointer', padding: '8px 16px', fontSize: 9, letterSpacing: 3, fontFamily: MONO,
                }}
              >
                {formOpen ? '— CANCEL' : '+ LOG PROBLEM'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px' }}>

        {/* Cookie setup panel */}
        {showCookiePanel && (
          <div style={{
            border: '1px solid rgba(255,42,42,0.25)', padding: 24, marginBottom: 28,
            background: 'rgba(255,42,42,0.02)',
          }}>
            <div style={{ fontSize: 9, color: '#FF2A2A', letterSpacing: 4, marginBottom: 16 }}>
              LEETCODE SESSION COOKIE
            </div>
            <div style={{ fontSize: 9, color: '#737373', lineHeight: 1.8, marginBottom: 16, letterSpacing: 1 }}>
              To sync your full submission history, paste your LEETCODE_SESSION cookie:<br />
              1. Log in to leetcode.com<br />
              2. Open DevTools → Application → Cookies → https://leetcode.com<br />
              3. Copy the value of <span style={{ color: '#ffc01e' }}>LEETCODE_SESSION</span>
            </div>
            <form onSubmit={handleSaveCookie} style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={cookieInput}
                onChange={e => setCookieInput(e.target.value)}
                placeholder="Paste LEETCODE_SESSION value..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={cookieSaving || !cookieInput.trim()}
                style={{
                  background: 'rgba(255,42,42,0.1)', border: '1px solid rgba(255,42,42,0.4)',
                  color: '#FF2A2A', cursor: 'pointer', padding: '8px 20px',
                  fontSize: 9, letterSpacing: 3, fontFamily: MONO,
                  opacity: !cookieInput.trim() ? 0.4 : 1,
                }}
              >
                {cookieSaving ? 'SAVING...' : 'SAVE & SYNC'}
              </button>
            </form>
          </div>
        )}

        {/* LeetCode Stats Dashboard */}
        {hasUsername && (
          <div style={{ marginBottom: 36 }}>
            {statsLoading ? (
              <div style={{ fontSize: 8, color: '#737373', letterSpacing: 4 }}>LOADING STATS...</div>
            ) : statsError ? (
              <div style={{ fontSize: 8, color: '#ff375f', letterSpacing: 2 }}>{statsError}</div>
            ) : stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>

                {/* Total solved + diff bars */}
                <div style={{ border: '1px solid rgba(255,42,42,0.12)', padding: 20 }}>
                  <div style={{ fontSize: 8, color: '#737373', letterSpacing: 4, marginBottom: 16 }}>PROBLEMS SOLVED</div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: '#E5E5E5', letterSpacing: -2, marginBottom: 4 }}>
                    {stats.solved.All}
                  </div>
                  <div style={{ fontSize: 8, color: '#737373', letterSpacing: 1, marginBottom: 20 }}>
                    of {stats.total.All} total
                  </div>
                  <DiffBar label="EASY"   solved={stats.solved.Easy}   total={stats.total.Easy}   color={DIFF_COLORS.Easy} />
                  <DiffBar label="MEDIUM" solved={stats.solved.Medium} total={stats.total.Medium} color={DIFF_COLORS.Medium} />
                  <DiffBar label="HARD"   solved={stats.solved.Hard}   total={stats.total.Hard}   color={DIFF_COLORS.Hard} />
                </div>

                {/* Activity stats */}
                <div style={{ border: '1px solid rgba(255,42,42,0.12)', padding: 20 }}>
                  <div style={{ fontSize: 8, color: '#737373', letterSpacing: 4, marginBottom: 16 }}>ACTIVITY</div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                    {[
                      { label: 'STREAK',      value: `${stats.streak}d`,           color: '#ffc01e' },
                      { label: 'ACTIVE DAYS', value: stats.totalActiveDays,        color: '#00b8a3' },
                      { label: 'RANKING',     value: `#${stats.ranking.toLocaleString()}`, color: '#737373' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div style={{ fontSize: 8, color: '#737373', letterSpacing: 3 }}>{label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 8, color: '#737373', letterSpacing: 3, marginBottom: 8 }}>
                    26W SUBMISSIONS
                  </div>
                  <SubmissionHeatmap calendarJson={stats.submissionCalendar} />
                </div>

              </div>
            ) : null}
          </div>
        )}

        {/* No username warning */}
        {!hasUsername && !loading && (
          <div style={{
            border: '1px solid rgba(255,42,42,0.15)', padding: '16px 20px', marginBottom: 28,
            fontSize: 9, color: '#737373', letterSpacing: 2,
          }}>
            No LeetCode username set. Add it in{' '}
            <a href="/stats" style={{ color: '#FF2A2A', textDecoration: 'none' }}>Health Stats → Profile</a>{' '}
            to enable stats and auto-sync.
          </div>
        )}

        {/* Local summary stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'LOGGED',    value: entries.length, color: '#E5E5E5' },
            { label: 'SOLVED',    value: localSolved,    color: '#00b8a3' },
            { label: 'ATTEMPTED', value: localAttempted, color: '#ffc01e' },
            { label: 'REVISIT',   value: localRevisit,   color: '#ff375f' },
            { label: 'AVG.TIME',  value: avgTime !== null ? `${avgTime}m` : '—', color: '#737373' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '10px 16px', border: '1px solid rgba(255,42,42,0.12)', minWidth: 80,
            }}>
              <div style={{ fontSize: 8, color: '#737373', letterSpacing: 4 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Log form */}
        {formOpen && (
          <form onSubmit={handleSubmit} style={{
            border: '1px solid rgba(255,42,42,0.25)', padding: 24, marginBottom: 32,
            background: 'rgba(255,42,42,0.02)',
          }}>
            <div style={{ fontSize: 9, color: '#FF2A2A', letterSpacing: 4, marginBottom: 20 }}>LOG PROBLEM</div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>PROB.NUM</label>
                <input
                  ref={numInputRef}
                  type="number"
                  value={probNum}
                  onChange={e => setProbNum(e.target.value)}
                  onBlur={() => { if (probNum && !manualMode) lookupProblem(probNum); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupProblem(probNum); } }}
                  placeholder="1"
                  style={{ ...inputStyle, width: '100%' }}
                />
                {lookupLoading && (
                  <div style={{ fontSize: 8, color: '#737373', marginTop: 4, letterSpacing: 2 }}>FETCHING...</div>
                )}
                {lookupError && (
                  <div style={{ fontSize: 8, color: '#ff375f', marginTop: 4, letterSpacing: 1 }}>{lookupError}</div>
                )}
              </div>
              <div>
                <label style={labelStyle}>PROBLEM NAME</label>
                <input
                  type="text"
                  value={probName}
                  onChange={e => setProbName(e.target.value)}
                  readOnly={!manualMode && !!probName && !lookupError}
                  placeholder="Two Sum"
                  required
                  style={{ ...inputStyle, color: (!manualMode && probName) ? '#737373' : '#E5E5E5' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>DIFF</label>
                {!manualMode && probName ? (
                  <div style={{ paddingTop: 8 }}><DiffBadge diff={difficulty} /></div>
                ) : (
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} style={selectStyle}>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label style={labelStyle}>LANG</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={selectStyle}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>TIME (MIN)</label>
                <input type="number" value={timeTaken} onChange={e => setTimeTaken(e.target.value)} placeholder="Optional" style={inputStyle} />
              </div>
            </div>

            {topics.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>TOPICS (AUTO)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {topics.map(t => (
                    <span key={t} style={{
                      padding: '2px 8px', border: '1px solid rgba(255,42,42,0.2)',
                      color: '#737373', fontSize: 8, letterSpacing: 2,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>STATUS</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {STATUSES.map(s => (
                  <button
                    key={s} type="button" onClick={() => setStatus(s)}
                    style={{
                      padding: '6px 16px',
                      border: `1px solid ${status === s ? STATUS_COLORS[s] : 'rgba(255,42,42,0.2)'}`,
                      background: status === s ? `${STATUS_COLORS[s]}18` : 'transparent',
                      color: status === s ? STATUS_COLORS[s] : '#737373',
                      fontSize: 8, letterSpacing: 3, cursor: 'pointer', fontFamily: MONO,
                    }}
                  >{s.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>NOTES (OPTIONAL)</label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  rows={3} placeholder="Approach, edge cases..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={labelStyle}>DATE</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <button
              type="submit" disabled={submitting || !probNum || !probName}
              style={{
                background: 'rgba(255,42,42,0.1)', border: '1px solid rgba(255,42,42,0.5)',
                color: '#FF2A2A', cursor: 'pointer', padding: '10px 24px',
                fontSize: 10, letterSpacing: 4, fontFamily: MONO,
                opacity: (!probNum || !probName) ? 0.4 : 1,
              }}
            >
              {submitting ? 'SAVING...' : 'SUBMIT'}
            </button>
          </form>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#737373', letterSpacing: 3 }}>FILTER:</span>
          {[
            { label: 'DIFF',   value: filterDiff,   setter: setFilterDiff,   options: DIFFICULTIES },
            { label: 'STATUS', value: filterStatus, setter: setFilterStatus, options: STATUSES },
          ].map(({ label, value, setter, options }) => (
            <select
              key={label} value={value} onChange={e => setter(e.target.value)}
              style={{ ...selectStyle, width: 'auto', padding: '6px 10px', fontSize: 9 }}
            >
              <option value="">ALL {label}</option>
              {options.map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
            </select>
          ))}
          {allTopics.length > 0 && (
            <select
              value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
              style={{ ...selectStyle, width: 'auto', padding: '6px 10px', fontSize: 9 }}
            >
              <option value="">ALL TOPICS</option>
              {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {(filterDiff || filterStatus || filterTopic) && (
            <button
              onClick={() => { setFilterDiff(''); setFilterStatus(''); setFilterTopic(''); }}
              style={{
                background: 'none', border: '1px solid rgba(255,42,42,0.2)',
                color: '#737373', cursor: 'pointer', padding: '5px 10px',
                fontSize: 8, letterSpacing: 2, fontFamily: MONO,
              }}
            >CLEAR</button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ color: '#737373', fontSize: 10, letterSpacing: 4, paddingTop: 40, textAlign: 'center' }}>
            LOADING...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#737373', fontSize: 10, letterSpacing: 4, paddingTop: 40, textAlign: 'center' }}>
            {entries.length === 0 && !hasUsername
              ? 'NO ENTRIES — LOG A PROBLEM OR CONNECT LEETCODE'
              : 'NO ENTRIES'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,42,42,0.15)' }}>
                  {['#', 'PROBLEM', 'DIFF', 'TOPICS', 'STATUS', 'LANG', 'TIME', 'DATE', ''].map(h => (
                    <th key={h} style={{
                      padding: '8px 10px', textAlign: 'left',
                      fontSize: 8, color: '#737373', letterSpacing: 3,
                      fontFamily: MONO, fontWeight: 700,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <tr
                    key={entry.id}
                    style={{ borderBottom: '1px solid rgba(255,42,42,0.06)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,42,42,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 10px', color: '#737373', fontSize: 10 }}>{entry.problemNumber}</td>
                    <td style={{ padding: '10px 10px', color: '#E5E5E5', fontSize: 10, maxWidth: 240 }}>
                      <a
                        href={`https://leetcode.com/problems/${entry.problemName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}/`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: '#E5E5E5', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FF2A2A'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#E5E5E5'}
                      >
                        {entry.problemName}
                      </a>
                    </td>
                    <td style={{ padding: '10px 10px' }}><DiffBadge diff={entry.difficulty} /></td>
                    <td style={{ padding: '10px 10px', maxWidth: 200 }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {entry.topics.slice(0, 3).map(t => (
                          <span key={t} style={{
                            padding: '1px 6px', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#737373', fontSize: 7, letterSpacing: 1,
                          }}>{t}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '10px 10px' }}><StatusText status={entry.status} /></td>
                    <td style={{ padding: '10px 10px', color: '#737373', fontSize: 9 }}>{entry.language}</td>
                    <td style={{ padding: '10px 10px', color: '#737373', fontSize: 9 }}>
                      {entry.timeTaken ? `${entry.timeTaken}m` : '—'}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#737373', fontSize: 9, whiteSpace: 'nowrap' }}>
                      {entry.date}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        style={{
                          background: 'none', border: 'none', color: '#4a4a4a',
                          cursor: 'pointer', fontSize: 14, padding: '0 4px',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff375f'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4a4a4a'}
                        title="Delete entry"
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
