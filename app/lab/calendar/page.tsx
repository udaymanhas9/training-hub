'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, addDays,
  isSameMonth, isToday, parseISO,
} from 'date-fns';
import { getLeetCodeEntries, getQuantEntries, getProfile } from '@/lib/storage';
import { LeetCodeEntry, QuantEntry, Difficulty } from '@/lib/types';
import UniversalHeatmap from '@/components/shared/UniversalHeatmap';

const MONO = "'JetBrains Mono', monospace";

const DIFF_COLORS: Record<Difficulty, string> = {
  Easy:   '#00b8a3',
  Medium: '#ffc01e',
  Hard:   '#ff375f',
};

interface GitHubEvent {
  type: string;
  repo: { name: string };
  payload: { commits?: { sha: string; message: string }[] };
  created_at: string;
}

async function fetchGitHubActivity(username: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=100`
    );
    const events: GitHubEvent[] = await res.json();
    const map: Record<string, number> = {};
    events
      .filter(e => e.type === 'PushEvent')
      .forEach(e => {
        const date = e.created_at.slice(0, 10);
        map[date] = (map[date] || 0) + (e.payload.commits?.length || 1);
      });
    return map;
  } catch {
    return {};
  }
}

interface DayCommit {
  repo: string;
  count: number;
  messages: string[];
}

interface DayDetail {
  leetcode: LeetCodeEntry[];
  quant: QuantEntry[];
  commits: DayCommit[];
}

export default function LabCalendarPage() {
  const [leetcode, setLeetcode]     = useState<LeetCodeEntry[]>([]);
  const [quant, setQuant]           = useState<QuantEntry[]>([]);
  const [github, setGithub]         = useState<Record<string, number>>({});
  const [githubEvents, setGithubEvents] = useState<GitHubEvent[]>([]);
  const [loading, setLoading]       = useState(true);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay]   = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [lc, q, profile] = await Promise.all([
        getLeetCodeEntries(),
        getQuantEntries(),
        getProfile(),
      ]);
      setLeetcode(lc);
      setQuant(q);
      const uname = profile.githubUsername || 'udaymanhas9';
      const [ghMap, events] = await Promise.all([
        fetchGitHubActivity(uname),
        fetch(`https://api.github.com/users/${uname}/events/public?per_page=100`)
          .then(r => r.json() as Promise<GitHubEvent[]>)
          .catch(() => [] as GitHubEvent[]),
      ]);
      setGithub(ghMap);
      setGithubEvents(events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build month grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= monthEnd || weeks.length < 5) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) { week.push(cursor); cursor = addDays(cursor, 1); }
    weeks.push(week);
    if (cursor > monthEnd && weeks.length >= 4) break;
  }

  // Index data
  const lcByDay: Record<string, LeetCodeEntry[]> = {};
  leetcode.forEach(e => {
    const k = e.date.slice(0, 10);
    if (!lcByDay[k]) lcByDay[k] = [];
    lcByDay[k].push(e);
  });

  const qByDay: Record<string, QuantEntry[]> = {};
  quant.forEach(e => {
    const k = e.date.slice(0, 10);
    if (!qByDay[k]) qByDay[k] = [];
    qByDay[k].push(e);
  });

  // Build detail for selected day
  const dayDetail: DayDetail | null = selectedDay ? (() => {
    const lcEntries = lcByDay[selectedDay] || [];
    const qEntries  = qByDay[selectedDay] || [];

    // Build commit details from events
    const pushEvents = githubEvents.filter(
      e => e.type === 'PushEvent' && e.created_at.slice(0, 10) === selectedDay
    );
    const repoMap = new Map<string, DayCommit>();
    pushEvents.forEach(e => {
      const repo = e.repo.name.split('/')[1] || e.repo.name;
      if (!repoMap.has(repo)) repoMap.set(repo, { repo, count: 0, messages: [] });
      const entry = repoMap.get(repo)!;
      const commits = e.payload.commits || [];
      entry.count += commits.length || 1;
      commits.slice(0, 3).forEach(c => {
        entry.messages.push(c.message.split('\n')[0]);
      });
    });

    return { leetcode: lcEntries, quant: qEntries, commits: Array.from(repoMap.values()) };
  })() : null;

  const DAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div style={{ minHeight: '100vh', background: '#000000', fontFamily: MONO }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,42,42,0.15)', padding: '28px 28px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 9, color: '#737373', letterSpacing: 5, marginBottom: 8 }}>THE LAB / CALENDAR</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#E5E5E5', letterSpacing: 4 }}>
              {format(currentMonth, 'MMMM yyyy').toUpperCase()}
            </h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,42,42,0.25)',
                  color: '#737373', cursor: 'pointer',
                  padding: '6px 14px', fontSize: 12, fontFamily: MONO,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FF2A2A'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#737373'}
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,42,42,0.25)',
                  color: '#737373', cursor: 'pointer',
                  padding: '6px 14px', fontSize: 8, letterSpacing: 3, fontFamily: MONO,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FF2A2A'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#737373'}
              >
                TODAY
              </button>
              <button
                onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,42,42,0.25)',
                  color: '#737373', cursor: 'pointer',
                  padding: '6px 14px', fontSize: 12, fontFamily: MONO,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FF2A2A'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#737373'}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px' }}>
        {loading ? (
          <div style={{ color: '#737373', fontSize: 10, letterSpacing: 4, textAlign: 'center', paddingTop: 80 }}>
            LOADING...
          </div>
        ) : (
          <>
            {/* Month grid + Day detail panel */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 40, alignItems: 'flex-start' }}>
              {/* Calendar grid */}
              <div style={{ flex: 1 }}>
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
                  {DAY_HEADERS.map(h => (
                    <div key={h} style={{
                      textAlign: 'center', fontSize: 7, color: '#4a4a4a', letterSpacing: 3, padding: '4px 0',
                    }}>
                      {h}
                    </div>
                  ))}
                </div>

                {/* Week rows */}
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
                    {week.map(day => {
                      const key = format(day, 'yyyy-MM-dd');
                      const inMonth = isSameMonth(day, currentMonth);
                      const todayFlag = isToday(day);
                      const isSelected = selectedDay === key;
                      const lcCount = (lcByDay[key] || []).length;
                      const qCount  = (qByDay[key] || []).length;
                      const ghCount = github[key] || 0;
                      const hasActivity = lcCount + qCount + ghCount > 0;

                      return (
                        <div
                          key={key}
                          onClick={() => inMonth && (hasActivity || true) && setSelectedDay(isSelected ? null : key)}
                          style={{
                            minHeight: 64,
                            border: isSelected
                              ? '1px solid rgba(255,42,42,0.6)'
                              : todayFlag
                                ? '1px solid rgba(255,42,42,0.3)'
                                : '1px solid rgba(255,42,42,0.08)',
                            background: isSelected
                              ? 'rgba(255,42,42,0.08)'
                              : todayFlag
                                ? 'rgba(255,42,42,0.04)'
                                : 'transparent',
                            padding: '6px 8px',
                            cursor: inMonth ? 'pointer' : 'default',
                            opacity: inMonth ? 1 : 0.2,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => {
                            if (inMonth && !isSelected)
                              (e.currentTarget as HTMLElement).style.background = 'rgba(255,42,42,0.04)';
                          }}
                          onMouseLeave={e => {
                            if (!isSelected)
                              (e.currentTarget as HTMLElement).style.background = todayFlag
                                ? 'rgba(255,42,42,0.04)'
                                : 'transparent';
                          }}
                        >
                          {/* Day number */}
                          <div style={{
                            fontSize: 9, color: todayFlag ? '#FF2A2A' : '#737373',
                            fontWeight: todayFlag ? 700 : 400, marginBottom: 6,
                          }}>
                            {format(day, 'd')}
                          </div>

                          {/* Activity dots */}
                          {inMonth && (
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                              {lcCount > 0 && (
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00b8a3' }} title={`${lcCount} LC`} />
                              )}
                              {qCount > 0 && (
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6' }} title={`${qCount} Quant`} />
                              )}
                              {ghCount > 0 && (
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} title={`${ghCount} commits`} />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Day detail panel */}
              {selectedDay && dayDetail && (
                <div style={{
                  width: 300,
                  border: '1px solid rgba(255,42,42,0.2)',
                  background: 'rgba(255,42,42,0.02)',
                  padding: 20,
                  flexShrink: 0,
                  position: 'sticky',
                  top: 60,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: '#FF2A2A', letterSpacing: 3 }}>
                      {format(parseISO(selectedDay), 'dd MMM yyyy').toUpperCase()}
                    </div>
                    <button
                      onClick={() => setSelectedDay(null)}
                      style={{ background: 'none', border: 'none', color: '#4a4a4a', cursor: 'pointer', fontSize: 16 }}
                    >
                      ×
                    </button>
                  </div>

                  {/* LeetCode */}
                  {dayDetail.leetcode.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 7, color: '#00b8a3', letterSpacing: 4, marginBottom: 8 }}>LEETCODE</div>
                      {dayDetail.leetcode.map(e => (
                        <div key={e.id} style={{
                          padding: '6px 0', borderBottom: '1px solid rgba(255,42,42,0.06)',
                        }}>
                          <div style={{ color: '#E5E5E5', fontSize: 9 }}>
                            #{e.problemNumber} {e.problemName}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <span style={{ color: DIFF_COLORS[e.difficulty], fontSize: 7, letterSpacing: 2 }}>
                              {e.difficulty.toUpperCase()}
                            </span>
                            <span style={{ color: '#737373', fontSize: 7 }}>{e.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quant */}
                  {dayDetail.quant.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 7, color: '#8b5cf6', letterSpacing: 4, marginBottom: 8 }}>QUANT</div>
                      {dayDetail.quant.map(e => (
                        <div key={e.id} style={{
                          padding: '6px 0', borderBottom: '1px solid rgba(255,42,42,0.06)',
                        }}>
                          <div style={{ color: '#E5E5E5', fontSize: 9 }}>{e.name}</div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <span style={{ color: DIFF_COLORS[e.difficulty], fontSize: 7, letterSpacing: 2 }}>
                              {e.difficulty.toUpperCase()}
                            </span>
                            <span style={{ color: '#737373', fontSize: 7 }}>{e.source}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* GitHub commits */}
                  {dayDetail.commits.length > 0 && (
                    <div>
                      <div style={{ fontSize: 7, color: '#10b981', letterSpacing: 4, marginBottom: 8 }}>GITHUB</div>
                      {dayDetail.commits.map(c => (
                        <div key={c.repo} style={{
                          padding: '6px 0', borderBottom: '1px solid rgba(255,42,42,0.06)',
                        }}>
                          <div style={{ color: '#E5E5E5', fontSize: 9 }}>{c.repo}</div>
                          <div style={{ color: '#10b981', fontSize: 8, marginTop: 2 }}>{c.count} commit{c.count !== 1 ? 's' : ''}</div>
                          {c.messages.map((msg, mi) => (
                            <div key={mi} style={{ color: '#737373', fontSize: 7, marginTop: 2 }}>— {msg}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {dayDetail.leetcode.length === 0 && dayDetail.quant.length === 0 && dayDetail.commits.length === 0 && (
                    <div style={{ color: '#4a4a4a', fontSize: 9, letterSpacing: 3, textAlign: 'center', paddingTop: 20 }}>
                      NO ACTIVITY
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Universal heatmap */}
            <div>
              <div style={{
                fontSize: 9, color: '#737373', letterSpacing: 5, marginBottom: 16,
                borderBottom: '1px solid rgba(255,42,42,0.1)', paddingBottom: 10,
              }}>
                ACTIVITY MATRIX
              </div>
              <UniversalHeatmap
                sessions={[]}
                leetcode={leetcode}
                quant={quant}
                githubDays={github}
                theme="lab"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
