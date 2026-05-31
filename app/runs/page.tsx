'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getProfile, saveProfile, getStravaActivities, upsertStravaActivities } from '@/lib/storage';
import { StravaActivity, UserProfile } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import type { UpcomingWorkout } from '@/app/api/garmin/upcoming/route';
import RunDetailModal from '@/components/runs/RunDetailModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, startOfWeek, addWeeks, parseISO, subWeeks, isAfter } from 'date-fns';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPace(mps: number): string {
  if (!mps) return '—';
  const spk = 1000 / mps;
  return `${Math.floor(spk / 60)}:${Math.floor(spk % 60).toString().padStart(2, '0')}/km`;
}

function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtDist(m: number): string {
  return `${(m / 1000).toFixed(2)} km`;
}

function toISO(date: string): string {
  return new Date(date).toISOString().slice(0, 10);
}

// Fastest estimated time for a given distance (from splits)
function estimatePB(activities: StravaActivity[], targetM: number): string | null {
  let best: number | null = null;
  for (const a of activities) {
    if (a.distance < targetM * 0.95) continue;
    // Estimate time over targetM using average speed
    if (a.averageSpeed > 0) {
      const estimated = targetM / a.averageSpeed;
      if (best === null || estimated < best) best = estimated;
    }
  }
  if (!best) return null;
  const m = Math.floor(best / 60);
  const s = Math.floor(best % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Weekly mileage bucketing (last N weeks)
function weeklyBuckets(activities: StravaActivity[], weeks = 12) {
  const today = new Date();
  const start = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: 1 });
  const buckets: { label: string; km: number }[] = [];
  let cursor = start;
  while (!isAfter(cursor, today)) {
    const end = addWeeks(cursor, 1);
    const km = activities
      .filter(a => {
        const d = parseISO(toISO(a.startDate));
        return d >= cursor && d < end;
      })
      .reduce((sum, a) => sum + a.distance / 1000, 0);
    buckets.push({ label: format(cursor, 'MMM d'), km: parseFloat(km.toFixed(1)) });
    cursor = end;
  }
  return buckets;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RunsPage() {
  const searchParams = useSearchParams();
  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [activities, setActivities]   = useState<StravaActivity[]>([]);
  const [loading, setLoading]         = useState(true);
  const [syncing, setSyncing]         = useState(false);
  const [syncMsg, setSyncMsg]         = useState('');
  const [selected, setSelected]       = useState<StravaActivity | null>(null);
  const [filterType, setFilterType]   = useState('');
  const [upcoming, setUpcoming]       = useState<UpcomingWorkout[]>([]);

  const stravaStatus = searchParams.get('strava');

  // Save tokens passed back from OAuth callback
  useEffect(() => {
    if (stravaStatus !== 'save') return;
    const at      = searchParams.get('at');
    const rt      = searchParams.get('rt');
    const exp     = searchParams.get('exp');
    const athlete = searchParams.get('athlete');
    if (!at || !rt) return;

    async function saveTokens() {
      const prof = await import('@/lib/storage').then(m => m.getProfile());
      const updated: UserProfile = {
        ...prof,
        stravaAccessToken:  at!,
        stravaRefreshToken: rt!,
        stravaExpiresAt:    exp ? parseInt(exp) : undefined,
        stravaAthleteId:    athlete ? parseInt(athlete) : undefined,
      };
      await import('@/lib/storage').then(m => m.saveProfile(updated));
      setProfile(updated);
      // Clean up URL
      window.history.replaceState({}, '', '/runs?strava=connected');
    }
    saveTokens();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = useCallback(async (prof: UserProfile, existing: StravaActivity[]) => {
    if (!prof.stravaAccessToken || !prof.stravaRefreshToken) return;
    setSyncing(true);
    setSyncMsg('Syncing from Strava...');
    try {
      // Use most recent activity date as `after` to only fetch new ones
      const mostRecent = existing.length > 0
        ? Math.floor(new Date(existing[0].startDate).getTime() / 1000)
        : undefined;

      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken:  prof.stravaAccessToken,
          refreshToken: prof.stravaRefreshToken,
          expiresAt:    prof.stravaExpiresAt ?? 0,
          after:        mostRecent,
        }),
      });

      if (!res.ok) { setSyncMsg('Sync failed.'); return; }
      const data = await res.json();

      // Save refreshed tokens if they changed
      if (data.newAccessToken) {
        const updated: UserProfile = {
          ...prof,
          stravaAccessToken:  data.newAccessToken,
          stravaRefreshToken: data.newRefreshToken,
          stravaExpiresAt:    data.newExpiresAt,
        };
        await saveProfile(updated);
        setProfile(updated);
      }

      if (data.activities?.length > 0) {
        await upsertStravaActivities(data.activities);
        // Merge with existing, deduplicate by id, re-sort
        setActivities(prev => {
          const map = new Map(prev.map(a => [a.id, a]));
          data.activities.forEach((a: StravaActivity) => map.set(a.id, a));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
        });
        setSyncMsg(`${data.activities.length} new activit${data.activities.length === 1 ? 'y' : 'ies'} synced.`);
      } else {
        setSyncMsg('Up to date.');
      }
    } catch {
      setSyncMsg('Sync failed.');
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [prof, acts] = await Promise.all([getProfile(), getStravaActivities()]);
        setProfile(prof);
        setActivities(acts);
        if (prof.stravaAccessToken) {
          sync(prof, acts);
        }
        // Fetch upcoming Garmin schedule
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          fetch('/api/garmin/upcoming', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.upcoming) setUpcoming(d.upcoming); })
            .catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sync]);

  function isRunType(type: string) {
    const t = type.toLowerCase();
    return t === 'run' || t.includes('running');
  }

  const runs = activities.filter(a =>
    filterType ? a.type === filterType : true
  );
  const runningOnly = activities.filter(a => isRunType(a.type));
  const activityTypes = Array.from(new Set(activities.map(a => a.type))).sort();

  // Dashboard stats
  const totalDistance  = runningOnly.reduce((s, a) => s + a.distance, 0);
  const totalRuns      = runningOnly.length;
  const totalElevation = runningOnly.reduce((s, a) => s + a.totalElevationGain, 0);
  const avgPace        = runningOnly.length
    ? runningOnly.reduce((s, a) => s + a.averageSpeed, 0) / runningOnly.length
    : 0;
  const avgHR          = runningOnly.filter(a => a.averageHeartrate).length
    ? runningOnly.filter(a => a.averageHeartrate).reduce((s, a) => s + (a.averageHeartrate ?? 0), 0) /
      runningOnly.filter(a => a.averageHeartrate).length
    : 0;

  const pb5k   = estimatePB(runningOnly, 5000);
  const pb10k  = estimatePB(runningOnly, 10000);
  const pbHalf = estimatePB(runningOnly, 21097);

  const weeklyData = weeklyBuckets(runningOnly, 12);

  const isStravaConnected = !!profile?.stravaAccessToken;
  const hasActivities = activities.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '32px 24px 24px', background: '#111' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 8 }}>
            TRAINING HUB
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', fontStyle: 'italic', letterSpacing: -1 }}>RUNS</h1>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {syncing && (
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'Barlow', sans-serif" }}>
                  ● {syncMsg}
                </span>
              )}
              {!syncing && syncMsg && (
                <span style={{ fontSize: 11, color: isStravaConnected ? '#10b981' : '#64748b', fontFamily: "'Barlow', sans-serif" }}>
                  ● {syncMsg}
                </span>
              )}
            </div>
          </div>

          {/* Status messages */}
          {stravaStatus === 'connected' && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#10b981', fontFamily: "'Barlow', sans-serif" }}>
              Strava connected successfully.
            </div>
          )}
          {stravaStatus === 'denied' && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#f59e0b', fontFamily: "'Barlow', sans-serif" }}>
              Strava connection was declined.
            </div>
          )}
          {stravaStatus === 'noauth' && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#f59e0b', fontFamily: "'Barlow', sans-serif" }}>
              Please log in before connecting Strava.
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 0' }}>
        {loading ? (
          <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>Loading...</div>
        ) : (
          <>
            {/* Stats strip */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
              {[
                { label: 'TOTAL RUNS',     value: totalRuns,                          color: '#3b82f6' },
                { label: 'TOTAL DISTANCE', value: `${(totalDistance / 1000).toFixed(0)} km`, color: '#f1f5f9' },
                { label: 'ELEVATION',      value: `${Math.round(totalElevation)} m`,  color: '#f59e0b' },
                { label: 'AVG PACE',       value: fmtPace(avgPace),                   color: '#10b981' },
                { label: 'AVG HR',         value: avgHR ? `${Math.round(avgHR)} bpm` : '—', color: '#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: '#111', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 8, padding: '10px 18px', minWidth: 110,
                }}>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* PBs */}
            {(pb5k || pb10k || pbHalf) && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 12 }}>ESTIMATED PBs</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: '5K',   value: pb5k },
                    { label: '10K',  value: pb10k },
                    { label: 'HALF', value: pbHalf },
                  ].filter(p => p.value).map(({ label, value }) => (
                    <div key={label} style={{
                      background: '#111', border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: 8, padding: '10px 20px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#3b82f6', marginTop: 2 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly mileage chart */}
            {weeklyData.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 16 }}>
                  WEEKLY MILEAGE (KM)
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#475569', fontFamily: "'Barlow', sans-serif", fontSize: 10 }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#475569', fontFamily: "'Barlow', sans-serif", fontSize: 10 }}
                      tickLine={false} axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: '#3b82f6' }}
                      formatter={(v: number) => [`${v} km`, 'Distance']}
                    />
                    <Bar dataKey="km" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Upcoming schedule */}
            {upcoming.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 16 }}>
                  UPCOMING
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcoming.map(w => {
                    const dayLabel = new Date(w.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                    const isToday  = w.date === new Date().toISOString().slice(0, 10);
                    return (
                      <div key={w.id} style={{
                        background: '#111',
                        border: `1px solid ${isToday ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
                        borderLeft: `3px solid ${isToday ? '#10b981' : '#3b82f6'}`,
                        borderRadius: 8, padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: 16,
                      }}>
                        <div style={{ minWidth: 70 }}>
                          <div style={{ fontSize: 10, letterSpacing: 2, color: isToday ? '#10b981' : '#3b82f6', fontFamily: "'Barlow', sans-serif", fontWeight: 700 }}>
                            {isToday ? 'TODAY' : dayLabel.split(' ')[0].toUpperCase()}
                          </div>
                          <div style={{ fontSize: 12, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>
                            {isToday ? dayLabel : dayLabel.slice(dayLabel.indexOf(' ') + 1)}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{w.title}</div>
                          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                            {w.sportTypeKey && (
                              <span style={{ fontSize: 10, letterSpacing: 2, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>
                                {w.sportTypeKey.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            )}
                            {w.duration && (
                              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                                {Math.round(w.duration / 60)} min
                              </span>
                            )}
                            {w.distance && w.distance > 0 && (
                              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                                {(w.distance / 1000).toFixed(1)} km
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity list */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>
                  ACTIVITIES
                </div>
                {activityTypes.length > 1 && (
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    style={{
                      background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6, color: '#f1f5f9', padding: '6px 12px',
                      fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", cursor: 'pointer',
                    }}
                  >
                    <option value="">ALL TYPES</option>
                    {activityTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                )}
              </div>

              {runs.length === 0 ? (
                <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#475569', letterSpacing: 2 }}>NO ACTIVITIES YET</div>
                  <div style={{ fontSize: 13, color: '#334155', fontFamily: "'Barlow', sans-serif", marginTop: 8 }}>
                    {syncing ? 'Syncing...' : 'Go for a run — it will appear here automatically.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {runs.map(activity => (
                    <div
                      key={activity.id}
                      onClick={() => setSelected(activity)}
                      style={{
                        background: '#111', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 8, padding: '14px 18px', cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 12, alignItems: 'center',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.4)';
                        (e.currentTarget as HTMLElement).style.background = '#141414';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                        (e.currentTarget as HTMLElement).style.background = '#111';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 9, letterSpacing: 3, color: '#3b82f6', fontFamily: "'Barlow', sans-serif" }}>
                            {activity.type.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 12, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>
                            {new Date(activity.startDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{activity.name}</div>
                        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                          {[
                            { label: fmtDist(activity.distance),          color: '#f1f5f9' },
                            { label: fmtTime(activity.movingTime),         color: '#94a3b8' },
                            { label: fmtPace(activity.averageSpeed),       color: '#10b981' },
                            { label: `↑${Math.round(activity.totalElevationGain)}m`, color: '#f59e0b' },
                            ...(activity.averageHeartrate ? [{ label: `♥ ${Math.round(activity.averageHeartrate)}`, color: '#ef4444' }] : []),
                          ].map(({ label, color }, i) => (
                            <span key={i} style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ color: '#334155', fontSize: 20 }}>›</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {selected && <RunDetailModal activity={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
