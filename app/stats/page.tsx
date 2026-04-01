'use client';

import { useState, useEffect } from 'react';
import { getHealthEntries, saveHealthEntries, getProfile, saveProfile, getHealthMetrics, saveHealthMetric, HealthMetric } from '@/lib/storage';
import { HealthEntry, UserProfile } from '@/lib/types';
import HealthEntryForm from '@/components/stats/HealthEntryForm';
import StatsSummaryCard from '@/components/stats/StatsSummaryCard';
import HealthChart from '@/components/stats/HealthChart';
import { generateId, calculateBMI } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { todayISO } from '@/lib/utils';

export default function StatsPage() {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ name: '', heightCm: 175, weightUnit: 'kg' });
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<UserProfile>({ name: '', heightCm: 175, weightUnit: 'kg' });
  const [steps, setSteps] = useState<HealthMetric[]>([]);
  const [restingHR, setRestingHR] = useState<HealthMetric[]>([]);
  const [sleep, setSleep] = useState<HealthMetric[]>([]);
  const [vo2Max, setVo2Max] = useState<HealthMetric[]>([]);
  const [showVo2Form, setShowVo2Form] = useState(false);
  const [vo2Input, setVo2Input] = useState('');
  const [vo2Date, setVo2Date] = useState(todayISO());

  useEffect(() => {
    async function load() {
      const [e, p, s, hr, sl, vo2] = await Promise.all([
        getHealthEntries(),
        getProfile(),
        getHealthMetrics('HKQuantityTypeIdentifierStepCount', 14),
        getHealthMetrics('HKQuantityTypeIdentifierRestingHeartRate', 14),
        getHealthMetrics('HKCategoryTypeIdentifierSleepAnalysis', 14),
        getHealthMetrics('vo2max', 365),
      ]);
      setEntries(e);
      setProfile(p);
      setProfileDraft(p);
      setSteps(s);
      setRestingHR(hr);
      setSleep(sl);
      setVo2Max(vo2);
    }
    load();
  }, []);

  async function handleAddEntry(e: Omit<HealthEntry, 'id' | 'bmi'>) {
    const bmi = e.weight && profile.heightCm ? calculateBMI(e.weight, profile.heightCm) : undefined;
    const entry: HealthEntry = { ...e, id: generateId(), bmi };
    const updated = [...entries, entry].sort((a, b) => a.date.localeCompare(b.date));
    setEntries(updated);
    await saveHealthEntries(updated);
    setShowForm(false);
  }

  async function handleDeleteEntry(id: string) {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await saveHealthEntries(updated);
  }

  async function handleSaveProfile() {
    setProfile(profileDraft);
    await saveProfile(profileDraft);
    setEditingProfile(false);
  }

  async function handleSaveVo2() {
    const val = parseFloat(vo2Input);
    if (isNaN(val) || val <= 0) return;
    await saveHealthMetric({ type: 'vo2max', value: val, unit: 'mL/kg/min', date: vo2Date });
    const updated = await getHealthMetrics('vo2max', 365);
    setVo2Max(updated);
    setVo2Input('');
    setVo2Date(todayISO());
    setShowVo2Form(false);
  }

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sortedEntries[0];
  const previous = sortedEntries[1];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '32px 24px 24px',
        background: '#111',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 8 }}>BODY COMPOSITION</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', fontStyle: 'italic', letterSpacing: -1 }}>HEALTH STATS</h1>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 0' }}>
        {/* Profile Section */}
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>PROFILE</div>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#94a3b8', fontSize: 11, letterSpacing: 2, padding: '4px 12px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {editingProfile ? 'CANCEL' : 'EDIT'}
            </button>
          </div>
          {editingProfile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'NAME', key: 'name', type: 'text', val: profileDraft.name },
                  { label: 'HEIGHT (cm)', key: 'heightCm', type: 'number', val: profileDraft.heightCm },
                ].map(({ label, key, type, val }) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>{label}</div>
                    <input
                      type={type}
                      value={val}
                      onChange={e => setProfileDraft(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                      style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f1f5f9', padding: '8px 12px', fontSize: 14, fontFamily: "'Barlow', sans-serif" }}
                    />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>WEIGHT UNIT</div>
                  <select
                    value={profileDraft.weightUnit}
                    onChange={e => setProfileDraft(p => ({ ...p, weightUnit: e.target.value as 'kg' | 'lbs' }))}
                    style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f1f5f9', padding: '8px 12px', fontSize: 14, fontFamily: "'Barlow', sans-serif" }}
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginTop: 4 }}>
                {[
                  { label: 'GITHUB USERNAME', key: 'githubUsername', val: profileDraft.githubUsername ?? '' },
                  { label: 'LEETCODE USERNAME', key: 'leetcodeUsername', val: profileDraft.leetcodeUsername ?? '' },
                ].map(({ label, key, val }) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>{label}</div>
                    <input
                      type="text"
                      value={val}
                      onChange={e => setProfileDraft(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f1f5f9', padding: '8px 12px', fontSize: 14, fontFamily: "'Barlow', sans-serif" }}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveProfile}
                style={{ alignSelf: 'flex-start', background: '#10b981', border: 'none', borderRadius: 6, color: '#000', fontSize: 13, fontWeight: 900, letterSpacing: 2, padding: '8px 20px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                SAVE PROFILE
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'NAME', val: profile.name || '—' },
                { label: 'HEIGHT', val: `${profile.heightCm}cm` },
                { label: 'UNIT', val: profile.weightUnit.toUpperCase() },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#f1f5f9', marginTop: 4 }}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {latest && (
          <div style={{ marginBottom: 24 }}>
            <StatsSummaryCard latest={latest} previous={previous} weightUnit={profile.weightUnit} heightCm={profile.heightCm} />
          </div>
        )}

        {/* Add Entry */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 5, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>MEASUREMENTS</div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: '#10b981', border: 'none', borderRadius: 6, color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: 2, padding: '6px 16px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {showForm ? 'CANCEL' : '+ LOG TODAY'}
          </button>
        </div>

        {showForm && (
          <div style={{ marginBottom: 20 }}>
            <HealthEntryForm onAdd={handleAddEntry} weightUnit={profile.weightUnit} />
          </div>
        )}

        {/* Charts */}
        {entries.length > 1 && (
          <div style={{ marginBottom: 32 }}>
            <HealthChart entries={entries} weightUnit={profile.weightUnit} />
          </div>
        )}

        {/* History Table */}
        {sortedEntries.length > 0 ? (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 40px', gap: 0, padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['DATE', 'WEIGHT', 'BODY FAT', 'BMI', ''].map(h => (
                <div key={h} style={{ fontSize: 9, letterSpacing: 3, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>{h}</div>
              ))}
            </div>
            {sortedEntries.map((entry, i) => {
              const displayWeight = profile.weightUnit === 'lbs' ? `${Math.round(entry.weight * 2.20462)}lbs` : `${entry.weight}kg`;
              return (
                <div key={entry.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 40px', gap: 0,
                  padding: '12px 18px', borderBottom: i < sortedEntries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{entry.date}</div>
                  <div style={{ fontSize: 14, color: '#3b82f6', fontWeight: 700 }}>{displayWeight}</div>
                  <div style={{ fontSize: 14, color: entry.bodyFatPct ? '#8b5cf6' : '#334155' }}>{entry.bodyFatPct ? `${entry.bodyFatPct}%` : '—'}</div>
                  <div style={{ fontSize: 14, color: entry.bmi ? '#10b981' : '#334155' }}>{entry.bmi ?? '—'}</div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                    title="Delete entry"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#475569', letterSpacing: 2 }}>NO MEASUREMENTS YET</div>
            <div style={{ fontSize: 13, color: '#334155', fontFamily: "'Barlow', sans-serif", marginTop: 8 }}>Log your first measurement to track body composition over time</div>
          </div>
        )}

        {/* ── Apple Health ─────────────────────────────────────────────── */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 20 }}>
            APPLE HEALTH
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

            {/* Steps */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 20px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 4, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>STEPS</div>
                {steps.length > 0 && (
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#3b82f6' }}>
                    {Math.round(steps[steps.length - 1].value).toLocaleString()}
                    <span style={{ fontSize: 10, color: '#475569', marginLeft: 4, fontWeight: 400 }}>today</span>
                  </div>
                )}
              </div>
              {steps.length > 0 ? (
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={steps.map(m => ({ d: m.date.slice(5), v: Math.round(m.value) }))} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                    <XAxis dataKey="d" tick={{ fill: '#475569', fontSize: 9, fontFamily: "'Barlow', sans-serif" }} axisLine={false} tickLine={false} />
                    <YAxis tick={false} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11, fontFamily: "'Barlow', sans-serif" }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: '#3b82f6' }}
                      formatter={(v: number) => [v.toLocaleString(), 'steps']}
                    />
                    <Bar dataKey="v" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    <ReferenceLine y={10000} stroke="rgba(59,130,246,0.25)" strokeDasharray="3 3" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 11, letterSpacing: 2 }}>NO DATA</div>
              )}
            </div>

            {/* Resting HR */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 20px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 4, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>RESTING HR</div>
                {restingHR.length > 0 && (
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444' }}>
                    {Math.round(restingHR[restingHR.length - 1].value)}
                    <span style={{ fontSize: 10, color: '#475569', marginLeft: 4, fontWeight: 400 }}>bpm</span>
                  </div>
                )}
              </div>
              {restingHR.length > 0 ? (
                <ResponsiveContainer width="100%" height={90}>
                  <LineChart data={restingHR.map(m => ({ d: m.date.slice(5), v: Math.round(m.value) }))} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                    <XAxis dataKey="d" tick={{ fill: '#475569', fontSize: 9, fontFamily: "'Barlow', sans-serif" }} axisLine={false} tickLine={false} />
                    <YAxis tick={false} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11, fontFamily: "'Barlow', sans-serif" }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: '#ef4444' }}
                      formatter={(v: number) => [v, 'bpm']}
                    />
                    <Line type="monotone" dataKey="v" stroke="#ef4444" strokeWidth={2} dot={{ r: 2, fill: '#ef4444' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 11, letterSpacing: 2 }}>NO DATA</div>
              )}
            </div>

            {/* Sleep */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 20px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 4, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>SLEEP</div>
                {sleep.length > 0 && (
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#8b5cf6' }}>
                    {sleep[sleep.length - 1].value.toFixed(1)}
                    <span style={{ fontSize: 10, color: '#475569', marginLeft: 4, fontWeight: 400 }}>hrs last night</span>
                  </div>
                )}
              </div>
              {sleep.length > 0 ? (
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={sleep.map(m => ({ d: m.date.slice(5), v: Number(m.value.toFixed(1)) }))} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                    <XAxis dataKey="d" tick={{ fill: '#475569', fontSize: 9, fontFamily: "'Barlow', sans-serif" }} axisLine={false} tickLine={false} />
                    <YAxis tick={false} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11, fontFamily: "'Barlow', sans-serif" }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: '#8b5cf6' }}
                      formatter={(v: number) => [`${v}h`, 'sleep']}
                    />
                    <Bar dataKey="v" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                    <ReferenceLine y={8} stroke="rgba(139,92,246,0.25)" strokeDasharray="3 3" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 11, letterSpacing: 2 }}>NO DATA</div>
              )}
            </div>

            {/* VO2 Max */}
            {(() => {
              const latest = vo2Max.length > 0 ? vo2Max[vo2Max.length - 1] : null;
              const val = latest?.value ?? 0;
              const color = '#10b981';
              const zone =
                val >= 60 ? { label: 'SUPERIOR', color: '#10b981' } :
                val >= 50 ? { label: 'EXCELLENT', color: '#3b82f6' } :
                val >= 40 ? { label: 'GOOD',      color: '#f59e0b' } :
                val >= 30 ? { label: 'FAIR',       color: '#f97316' } :
                val >  0  ? { label: 'POOR',       color: '#ef4444' } :
                              null;

              return (
                <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 20px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontSize: 9, letterSpacing: 4, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>VO2 MAX</div>
                      {zone && (
                        <span style={{ fontSize: 8, letterSpacing: 2, color: zone.color, fontFamily: "'Barlow', sans-serif", fontWeight: 700 }}>
                          {zone.label}
                        </span>
                      )}
                    </div>
                    {latest && (
                      <div style={{ fontSize: 20, fontWeight: 900, color }}>
                        {val.toFixed(1)}
                        <span style={{ fontSize: 10, color: '#475569', marginLeft: 4, fontWeight: 400 }}>mL/kg/min</span>
                      </div>
                    )}
                  </div>

                  {vo2Max.length > 1 ? (
                    <ResponsiveContainer width="100%" height={90}>
                      <LineChart data={vo2Max.map(m => ({ d: m.date.slice(5), v: m.value }))} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                        <XAxis dataKey="d" tick={{ fill: '#475569', fontSize: 9, fontFamily: "'Barlow', sans-serif" }} axisLine={false} tickLine={false} />
                        <YAxis tick={false} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11, fontFamily: "'Barlow', sans-serif" }}
                          labelStyle={{ color: '#94a3b8' }}
                          itemStyle={{ color }}
                          formatter={(v: number) => [`${v.toFixed(1)} mL/kg/min`, 'VO2 Max']}
                        />
                        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 11, letterSpacing: 2 }}>
                      {latest ? 'LOG MORE TO SEE TREND' : 'NO DATA'}
                    </div>
                  )}

                  {/* Manual entry */}
                  {showVo2Form ? (
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        value={vo2Input}
                        onChange={e => setVo2Input(e.target.value)}
                        placeholder="e.g. 52.4"
                        min={10} max={90} step={0.1}
                        style={{ flex: 1, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#f1f5f9', padding: '6px 10px', fontSize: 13, fontFamily: "'Barlow', sans-serif" }}
                      />
                      <input
                        type="date"
                        value={vo2Date}
                        onChange={e => setVo2Date(e.target.value)}
                        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#f1f5f9', padding: '6px 8px', fontSize: 13, fontFamily: "'Barlow', sans-serif", colorScheme: 'dark' }}
                      />
                      <button
                        onClick={handleSaveVo2}
                        style={{ background: color, border: 'none', borderRadius: 4, color: '#000', fontSize: 11, fontWeight: 900, letterSpacing: 2, padding: '7px 12px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", whiteSpace: 'nowrap' }}
                      >
                        SAVE
                      </button>
                      <button
                        onClick={() => setShowVo2Form(false)}
                        style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowVo2Form(true)}
                      style={{ marginTop: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#475569', fontSize: 9, letterSpacing: 3, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", width: '100%' }}
                    >
                      + LOG VO2 MAX
                    </button>
                  )}
                </div>
              );
            })()}

          </div>
        </div>
      </div>
    </div>
  );
}
