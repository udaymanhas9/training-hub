'use client';

import { useState, useEffect, useRef } from 'react';
import { getSessions, getLeetCodeEntries, getQuantEntries, getProfile, getStravaActivities } from '@/lib/storage';
import { SessionLog, LeetCodeEntry, QuantEntry, StravaActivity } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import UniversalHeatmap from '@/components/shared/UniversalHeatmap';
import CumulativeChart from '@/components/shared/CumulativeChart';

const MONO = "'JetBrains Mono', monospace";

async function fetchGitHubActivity(username: string, token?: string): Promise<Record<string, number>> {
  try {
    const params = new URLSearchParams({ username });
    if (token) params.set('token', token);
    const res = await fetch(`/api/github/events?${params}`);
    if (!res.ok) return {};
    const events = await res.json();
    const map: Record<string, number> = {};
    events
      .filter((e: { type: string }) => e.type === 'PushEvent')
      .forEach((e: { payload: { commits: unknown[] }; created_at: string }) => {
        const date = e.created_at.slice(0, 10);
        map[date] = (map[date] || 0) + (e.payload.commits?.length || 1);
      });
    return map;
  } catch {
    return {};
  }
}

export default function LabOverviewPage() {
  const { user, signOut } = useAuth();
  const [sessions, setSessions]   = useState<SessionLog[]>([]);
  const [leetcode, setLeetcode]   = useState<LeetCodeEntry[]>([]);
  const [quant, setQuant]         = useState<QuantEntry[]>([]);
  const [github, setGithub]       = useState<Record<string, number>>({});
  const [strava, setStrava]       = useState<StravaActivity[]>([]);
  const [username, setUsername]   = useState<string>('');
  const [loading, setLoading]     = useState(true);
  const [now, setNow]             = useState('');
  const lastFetchRef = useRef(0);
  const loadRef      = useRef<() => Promise<void>>();

  useEffect(() => {
    async function load() {
      lastFetchRef.current = Date.now();
      sessionStorage.removeItem('lab-data-dirty');
      try {
        const [s, lc, q, profile, sa] = await Promise.all([
          getSessions(),
          getLeetCodeEntries(),
          getQuantEntries(),
          getProfile(),
          getStravaActivities(),
        ]);
        setSessions(s);
        setLeetcode(lc);
        setQuant(q);
        setStrava(sa);
        const gh  = profile.githubUsername || 'udaymanhas9';
        const pat = profile.githubToken;
        setUsername(gh);
        const ghData = await fetchGitHubActivity(gh, pat);
        setGithub(ghData);
      } finally {
        setLoading(false);
      }
    }
    loadRef.current = load;
    load();

    window.addEventListener('lab-data-changed', load);

    const updateClock = () => {
      const d = new Date();
      setNow(d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('lab-data-changed', load);
    };
  }, []);

  // Catch data saved while this page was in the router cache (no remount = no useEffect([]))
  useEffect(() => {
    const dirty = sessionStorage.getItem('lab-data-dirty');
    if (dirty && Number(dirty) > lastFetchRef.current && loadRef.current) {
      loadRef.current();
    }
  });

  // Derived stats
  const lcSolved   = leetcode.filter(e => e.status === 'Solved').length;
  const quantDone  = quant.length;
  const gitTotal   = Object.values(github).reduce((a, b) => a + b, 0);
  const totalRuns  = strava.filter(a => a.type === 'Run').length;

  const statPills = [
    { label: 'LC.SOLVED',    value: lcSolved,        color: '#00b8a3' },
    { label: 'QUANT.DONE',   value: quantDone,       color: '#8b5cf6' },
    { label: 'GIT.COMMITS',  value: gitTotal,        color: '#f59e0b' },
    { label: 'SESSIONS',     value: sessions.length, color: '#ef4444' },
    { label: 'RUNS',         value: totalRuns,       color: '#fc4c02' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#000000', fontFamily: MONO }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,42,42,0.15)',
        padding: '28px 28px 20px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                padding: '4px 12px',
                border: '1px solid rgba(255,42,42,0.4)',
                color: '#FF2A2A',
                fontSize: 9, letterSpacing: 4, fontFamily: MONO,
              }}>
                MODE: THE LAB
              </div>
              <div style={{
                padding: '4px 12px',
                border: '1px solid rgba(0,184,163,0.3)',
                color: '#00b8a3',
                fontSize: 9, letterSpacing: 4, fontFamily: MONO,
              }}>
                SYS.ACTIVE
              </div>
              {username && (
                <div style={{ color: '#737373', fontSize: 9, letterSpacing: 2 }}>
                  {user?.email || username}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ color: '#737373', fontSize: 9, letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>
                {now}
              </div>
              <button
                onClick={signOut}
                style={{
                  background: 'none', border: '1px solid rgba(255,42,42,0.3)',
                  color: '#737373', cursor: 'pointer', padding: '4px 12px',
                  fontSize: 9, letterSpacing: 3, fontFamily: MONO,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF2A2A'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,42,42,0.6)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#737373'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,42,42,0.3)'; }}
              >
                SIGN OUT
              </button>
            </div>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#E5E5E5', letterSpacing: 6, marginBottom: 0 }}>
            OVERVIEW
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px' }}>
        {loading ? (
          <div style={{ color: '#737373', fontSize: 11, letterSpacing: 4, textAlign: 'center', paddingTop: 80 }}>
            LOADING...
          </div>
        ) : (
          <>
            {/* Stat pills */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
              {statPills.map(({ label, value, color }) => (
                <div key={label} style={{
                  padding: '12px 20px',
                  border: '1px solid rgba(255,42,42,0.2)',
                  display: 'flex', flexDirection: 'column', gap: 4,
                  minWidth: 130,
                }}>
                  <div style={{ fontSize: 8, color: '#737373', letterSpacing: 4 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: 1 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Cumulative chart */}
            <div style={{ marginBottom: 40 }}>
              <div style={{
                fontSize: 9, color: '#737373', letterSpacing: 5, marginBottom: 16,
                borderBottom: '1px solid rgba(255,42,42,0.1)', paddingBottom: 10,
              }}>
                CUMULATIVE ACTIVITY
              </div>
              <CumulativeChart
                sessions={sessions}
                leetcode={leetcode}
                quant={quant}
                githubDays={github}
                stravaActivities={strava}
              />
            </div>

            {/* Heatmap */}
            <div>
              <div style={{
                fontSize: 9, color: '#737373', letterSpacing: 5, marginBottom: 16,
                borderBottom: '1px solid rgba(255,42,42,0.1)', paddingBottom: 10,
              }}>
                ACTIVITY MATRIX
              </div>
              <UniversalHeatmap
                sessions={sessions}
                leetcode={leetcode}
                quant={quant}
                githubDays={github}
                stravaActivities={strava}
                theme="lab"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
