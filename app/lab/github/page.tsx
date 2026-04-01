'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { getProfile, saveProfile } from '@/lib/storage';
import { format, subDays, parseISO } from 'date-fns';

const MONO = "'JetBrains Mono', monospace";
const DEFAULT_USERNAME = 'udaymanhas9';

interface GitHubCommit {
  sha: string;
  message: string;
}

interface RepoPush {
  repo: string;
  repoUrl: string;
  date: string;
  commits: GitHubCommit[];
}

interface RepoSummary {
  repo: string;
  repoUrl: string;
  pushes: RepoPush[];
  last30Days: number;
  sparkline: { day: string; count: number }[];
}

interface GitHubEvent {
  type: string;
  repo: { name: string; url: string };
  payload: { commits?: { sha: string; message: string }[] };
  created_at: string;
}

async function fetchEvents(username: string, token?: string): Promise<GitHubEvent[]> {
  const params = new URLSearchParams({ username });
  if (token) params.set('token', token);
  const res = await fetch(`/api/github/events?${params}`);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

function buildRepoPushes(events: GitHubEvent[]): RepoPush[] {
  const pushes = events.filter(e => e.type === 'PushEvent');
  return pushes.map(e => ({
    repo: e.repo.name,
    repoUrl: `https://github.com/${e.repo.name}`,
    date: e.created_at.slice(0, 10),
    commits: (e.payload.commits || []).map(c => ({
      sha: c.sha.slice(0, 7),
      message: c.message.split('\n')[0],
    })),
  }));
}

function buildRepoSummaries(pushes: RepoPush[]): RepoSummary[] {
  const today = new Date();
  const cutoff = subDays(today, 30);
  const repoMap = new Map<string, RepoSummary>();

  // Build 30-day sparkline buckets
  const last30 = Array.from({ length: 30 }, (_, i) => format(subDays(today, 29 - i), 'yyyy-MM-dd'));

  pushes.forEach(push => {
    if (!repoMap.has(push.repo)) {
      repoMap.set(push.repo, {
        repo: push.repo,
        repoUrl: push.repoUrl,
        pushes: [],
        last30Days: 0,
        sparkline: last30.map(day => ({ day, count: 0 })),
      });
    }
    const summary = repoMap.get(push.repo)!;
    summary.pushes.push(push);

    const pushDate = parseISO(push.date);
    if (pushDate >= cutoff) {
      summary.last30Days += push.commits.length || 1;
      const idx = summary.sparkline.findIndex(s => s.day === push.date);
      if (idx >= 0) summary.sparkline[idx].count += push.commits.length || 1;
    }
  });

  return Array.from(repoMap.values())
    .filter(r => r.pushes.length > 0)
    .sort((a, b) => b.last30Days - a.last30Days);
}

export default function GitHubPage() {
  const [username, setUsername]               = useState(DEFAULT_USERNAME);
  const [token, setToken]                     = useState<string | undefined>(undefined);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput]     = useState('');
  const [showTokenForm, setShowTokenForm]     = useState(false);
  const [tokenInput, setTokenInput]           = useState('');
  const [pushes, setPushes]                   = useState<RepoPush[]>([]);
  const [repoSummaries, setRepoSummaries]     = useState<RepoSummary[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [expandedRepo, setExpandedRepo]       = useState<string | null>(null);
  const [refreshing, setRefreshing]           = useState(false);

  const loadData = useCallback(async (uname: string, pat?: string) => {
    setError('');
    try {
      const events = await fetchEvents(uname, pat);
      const p = buildRepoPushes(events);
      setPushes(p);
      setRepoSummaries(buildRepoSummaries(p));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GitHub data');
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const profile = await getProfile();
        const uname = profile.githubUsername || DEFAULT_USERNAME;
        const pat   = profile.githubToken;
        setUsername(uname);
        setToken(pat);
        await loadData(uname, pat);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadData]);

  async function handleSaveUsername() {
    const trimmed = usernameInput.trim();
    if (!trimmed) { setEditingUsername(false); return; }
    setUsername(trimmed);
    setEditingUsername(false);
    setLoading(true);
    try {
      const profile = await getProfile();
      await saveProfile({ ...profile, githubUsername: trimmed });
      await loadData(trimmed, token);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveToken() {
    const trimmed = tokenInput.trim();
    setShowTokenForm(false);
    setTokenInput('');
    const pat = trimmed || undefined;
    setToken(pat);
    const profile = await getProfile();
    await saveProfile({ ...profile, githubToken: pat });
    setLoading(true);
    try {
      await loadData(username, pat);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData(username, token);
    setRefreshing(false);
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayPushes = pushes.filter(p => p.date === today);

  // Weekly and monthly totals
  const last7Days = subDays(new Date(), 7);
  const last30Days = subDays(new Date(), 30);
  const weekTotal  = pushes.filter(p => parseISO(p.date) >= last7Days).reduce((s, p) => s + (p.commits.length || 1), 0);
  const monthTotal = pushes.filter(p => parseISO(p.date) >= last30Days).reduce((s, p) => s + (p.commits.length || 1), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#000000', fontFamily: MONO }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,42,42,0.15)', padding: '28px 28px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 9, color: '#737373', letterSpacing: 5, marginBottom: 8 }}>THE LAB / GITHUB</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#E5E5E5', letterSpacing: 4 }}>
              GIT.FEED —&nbsp;
              {editingUsername ? (
                <input
                  autoFocus
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveUsername();
                    if (e.key === 'Escape') setEditingUsername(false);
                  }}
                  onBlur={handleSaveUsername}
                  placeholder={username}
                  style={{
                    background: 'transparent', border: 'none',
                    borderBottom: '1px solid rgba(255,42,42,0.5)',
                    color: '#FF2A2A', fontFamily: MONO, fontSize: 28,
                    fontWeight: 700, letterSpacing: 4, outline: 'none',
                    width: 200,
                  }}
                />
              ) : (
                <span
                  style={{ color: '#FF2A2A', cursor: 'pointer', borderBottom: '1px solid transparent', transition: 'border-color 0.15s' }}
                  onClick={() => { setUsernameInput(username); setEditingUsername(true); }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderBottomColor = 'rgba(255,42,42,0.4)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderBottomColor = 'transparent'}
                  title="Click to edit username"
                >
                  {username}
                </span>
              )}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Token status / toggle */}
              {showTokenForm ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    autoFocus
                    type="password"
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveToken(); if (e.key === 'Escape') { setShowTokenForm(false); setTokenInput(''); } }}
                    placeholder="ghp_xxxxxxxxxxxx"
                    style={{
                      background: '#0d0d0d', border: '1px solid rgba(255,42,42,0.4)',
                      color: '#E5E5E5', fontFamily: MONO, fontSize: 10,
                      padding: '6px 10px', outline: 'none', width: 200, letterSpacing: 1,
                    }}
                  />
                  <button
                    onClick={handleSaveToken}
                    style={{
                      background: 'transparent', border: '1px solid rgba(255,42,42,0.4)',
                      color: '#FF2A2A', cursor: 'pointer', padding: '6px 12px',
                      fontSize: 9, letterSpacing: 2, fontFamily: MONO,
                    }}
                  >
                    SAVE
                  </button>
                  {token && (
                    <button
                      onClick={() => { setTokenInput(''); handleSaveToken(); }}
                      style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#737373', cursor: 'pointer', padding: '6px 10px',
                        fontSize: 9, letterSpacing: 2, fontFamily: MONO,
                      }}
                    >
                      REMOVE
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { setTokenInput(token || ''); setShowTokenForm(true); }}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${token ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    color: token ? '#10b981' : '#737373',
                    cursor: 'pointer', padding: '8px 14px',
                    fontSize: 9, letterSpacing: 3, fontFamily: MONO, transition: 'all 0.15s',
                  }}
                  title={token ? 'PAT connected — showing private commits' : 'Add GitHub PAT to include private commits'}
                >
                  {token ? '⬤ PAT' : '○ PAT'}
                </button>
              )}

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,42,42,0.3)',
                  color: '#737373', cursor: 'pointer',
                  padding: '8px 16px', fontSize: 9, letterSpacing: 3, fontFamily: MONO,
                  transition: 'all 0.15s', opacity: refreshing ? 0.5 : 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF2A2A'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,42,42,0.6)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#737373'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,42,42,0.3)'; }}
              >
                {refreshing ? 'REFRESHING...' : '↻ REFRESH'}
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
        ) : error ? (
          <div style={{ color: '#ff375f', fontSize: 10, letterSpacing: 2, textAlign: 'center', paddingTop: 80 }}>
            ERROR: {error}
          </div>
        ) : (
          <>
            {/* Totals */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
              {[
                { label: '7D.COMMITS',  value: weekTotal,  color: '#10b981' },
                { label: '30D.COMMITS', value: monthTotal, color: '#10b981' },
                { label: 'REPOS.ACTIVE', value: repoSummaries.length, color: '#E5E5E5' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '10px 16px', border: '1px solid rgba(255,42,42,0.15)', minWidth: 120 }}>
                  <div style={{ fontSize: 8, color: '#737373', letterSpacing: 4 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Today's commits */}
            {todayPushes.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{
                  fontSize: 9, color: '#737373', letterSpacing: 5, marginBottom: 14,
                  borderBottom: '1px solid rgba(255,42,42,0.1)', paddingBottom: 10,
                }}>
                  TODAY.COMMITS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todayPushes.map((push, i) => (
                    <div key={i} style={{
                      padding: '10px 14px',
                      border: '1px solid rgba(255,42,42,0.12)',
                      background: 'rgba(255,42,42,0.02)',
                    }}>
                      <a
                        href={push.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#FF2A2A', fontSize: 10, letterSpacing: 2, textDecoration: 'none' }}
                      >
                        {push.repo}
                      </a>
                      <span style={{ color: '#737373', fontSize: 9, marginLeft: 12 }}>
                        {push.commits.length} commit{push.commits.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-repo blocks */}
            {repoSummaries.length === 0 ? (
              <div style={{ color: '#737373', fontSize: 10, letterSpacing: 4, textAlign: 'center', paddingTop: 40 }}>
                NO RECENT ACTIVITY
              </div>
            ) : (
              <div>
                <div style={{
                  fontSize: 9, color: '#737373', letterSpacing: 5, marginBottom: 14,
                  borderBottom: '1px solid rgba(255,42,42,0.1)', paddingBottom: 10,
                }}>
                  REPO.ACTIVITY
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {repoSummaries.map(repo => {
                    const isExpanded = expandedRepo === repo.repo;
                    return (
                      <div key={repo.repo} style={{ border: '1px solid rgba(255,42,42,0.12)' }}>
                        {/* Repo header */}
                        <div
                          style={{
                            padding: '14px 16px',
                            display: 'flex', alignItems: 'center', gap: 16,
                            background: isExpanded ? 'rgba(255,42,42,0.04)' : 'transparent',
                            cursor: 'pointer', flexWrap: 'wrap',
                          }}
                          onClick={() => setExpandedRepo(isExpanded ? null : repo.repo)}
                        >
                          {/* Repo name */}
                          <a
                            href={repo.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ color: '#FF2A2A', fontSize: 11, letterSpacing: 2, textDecoration: 'none', fontWeight: 700 }}
                          >
                            {repo.repo.split('/')[1] || repo.repo}
                          </a>
                          <span style={{ color: '#4a4a4a', fontSize: 9 }}>
                            {repo.repo.split('/')[0]}
                          </span>

                          {/* 30-day commit count */}
                          <span style={{ color: '#10b981', fontSize: 10, marginLeft: 'auto' }}>
                            {repo.last30Days} COMMITS / 30D
                          </span>

                          {/* Sparkline */}
                          <div style={{ width: 100, height: 28 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={repo.sparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                <Bar dataKey="count" isAnimationActive={false}>
                                  {repo.sparkline.map((entry, idx) => (
                                    <Cell
                                      key={idx}
                                      fill={entry.count > 0 ? '#10b981' : 'rgba(255,255,255,0.06)'}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Expand chevron */}
                          <span style={{ color: '#737373', fontSize: 10 }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>

                        {/* Expanded commit list */}
                        {isExpanded && (
                          <div style={{
                            borderTop: '1px solid rgba(255,42,42,0.08)',
                            padding: '12px 16px',
                            display: 'flex', flexDirection: 'column', gap: 4,
                          }}>
                            {repo.pushes.slice(0, 20).map((push, pi) => (
                              <div key={pi}>
                                <div style={{ color: '#737373', fontSize: 8, letterSpacing: 2, marginBottom: 4 }}>
                                  {push.date}
                                </div>
                                {push.commits.map((c, ci) => (
                                  <div key={ci} style={{
                                    display: 'flex', gap: 10, padding: '3px 0',
                                    borderBottom: '1px solid rgba(255,42,42,0.04)',
                                  }}>
                                    <span style={{ color: '#FF2A2A', fontSize: 9, fontFamily: MONO, flexShrink: 0 }}>
                                      [{c.sha}]
                                    </span>
                                    <span style={{ color: '#E5E5E5', fontSize: 9 }}>
                                      {c.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ))}
                            {repo.pushes.length > 20 && (
                              <div style={{ color: '#737373', fontSize: 8, letterSpacing: 2, paddingTop: 4 }}>
                                +{repo.pushes.length - 20} MORE PUSHES
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
