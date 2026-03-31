'use client';

import { useState, useEffect } from 'react';
import { getHealthEntries, saveHealthEntries, getProfile, saveProfile } from '@/lib/storage';
import { HealthEntry, UserProfile } from '@/lib/types';
import HealthEntryForm from '@/components/stats/HealthEntryForm';
import StatsSummaryCard from '@/components/stats/StatsSummaryCard';
import HealthChart from '@/components/stats/HealthChart';
import { generateId, calculateBMI } from '@/lib/utils';

export default function StatsPage() {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ name: '', heightCm: 175, weightUnit: 'kg' });
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<UserProfile>({ name: '', heightCm: 175, weightUnit: 'kg' });

  useEffect(() => {
    async function load() {
      const [e, p] = await Promise.all([getHealthEntries(), getProfile()]);
      setEntries(e);
      setProfile(p);
      setProfileDraft(p);
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
      </div>
    </div>
  );
}
