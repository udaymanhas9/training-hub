'use client';

import { useState, useEffect } from 'react';
import {
  getQuantEntries, saveQuantEntry, deleteQuantEntry,
  getCustomTopics, saveCustomTopics,
} from '@/lib/storage';
import { QuantEntry, Difficulty } from '@/lib/types';
import { generateId, todayISO } from '@/lib/utils';

const MONO = "'JetBrains Mono', monospace";

const DIFF_COLORS: Record<Difficulty, string> = {
  Easy:   '#00b8a3',
  Medium: '#ffc01e',
  Hard:   '#ff375f',
};

const PRESET_TOPICS = [
  'Probability', 'Brainteasers', 'Statistics', 'Stochastic Calculus',
  'Linear Algebra', 'Game Theory', 'Combinatorics', 'Estimation',
  'Options Pricing', 'Other',
];

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

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

export default function QuantPage() {
  const [entries, setEntries]             = useState<QuantEntry[]>([]);
  const [customTopics, setCustomTopics]   = useState<string[]>([]);
  const [loading, setLoading]             = useState(true);
  const [formOpen, setFormOpen]           = useState(false);

  // Form state
  const [name, setName]               = useState('');
  const [source, setSource]           = useState('');
  const [topic, setTopic]             = useState('Probability');
  const [difficulty, setDifficulty]   = useState<Difficulty>('Medium');
  const [notes, setNotes]             = useState('');
  const [date, setDate]               = useState(todayISO());
  const [submitting, setSubmitting]   = useState(false);

  // Custom topic inline input
  const [addingTopic, setAddingTopic]   = useState(false);
  const [newTopicVal, setNewTopicVal]   = useState('');

  // Filters
  const [filterDiff, setFilterDiff]   = useState('');
  const [filterTopic, setFilterTopic] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [data, ct] = await Promise.all([getQuantEntries(), getCustomTopics()]);
        setEntries(data);
        setCustomTopics(ct);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allTopics = [...PRESET_TOPICS, ...customTopics];

  async function handleAddCustomTopic() {
    const trimmed = newTopicVal.trim();
    if (!trimmed || allTopics.includes(trimmed)) { setAddingTopic(false); setNewTopicVal(''); return; }
    const updated = [...customTopics, trimmed];
    setCustomTopics(updated);
    await saveCustomTopics(updated);
    setTopic(trimmed);
    setAddingTopic(false);
    setNewTopicVal('');
  }

  function resetForm() {
    setName(''); setSource(''); setTopic('Probability'); setDifficulty('Medium');
    setNotes(''); setDate(todayISO());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !source) return;
    setSubmitting(true);
    try {
      const entry: QuantEntry = {
        id: generateId(),
        name, source, topic, difficulty,
        notes: notes || undefined,
        date,
      };
      await saveQuantEntry(entry);
      setEntries(prev => [entry, ...prev]);
      resetForm();
      setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteQuantEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  // Stats
  const byDiff: Record<Difficulty, number> = {
    Easy:   entries.filter(e => e.difficulty === 'Easy').length,
    Medium: entries.filter(e => e.difficulty === 'Medium').length,
    Hard:   entries.filter(e => e.difficulty === 'Hard').length,
  };

  // Filtered
  const filtered = entries.filter(e => {
    if (filterDiff && e.difficulty !== filterDiff) return false;
    if (filterTopic && e.topic !== filterTopic) return false;
    return true;
  });

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid rgba(255,42,42,0.25)',
    color: '#E5E5E5',
    padding: '8px 10px',
    fontFamily: MONO,
    fontSize: 11,
    outline: 'none',
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 8, color: '#737373', letterSpacing: 4,
    display: 'block', marginBottom: 6, fontFamily: MONO,
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', fontFamily: MONO }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,42,42,0.15)', padding: '28px 28px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 9, color: '#737373', letterSpacing: 5, marginBottom: 8 }}>THE LAB / QUANT</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#E5E5E5', letterSpacing: 4 }}>
              QUANT TRACKER
            </h1>
            <button
              onClick={() => { setFormOpen(f => !f); if (!formOpen) resetForm(); }}
              style={{
                background: formOpen ? 'rgba(255,42,42,0.1)' : 'transparent',
                border: '1px solid rgba(255,42,42,0.4)',
                color: '#FF2A2A', cursor: 'pointer',
                padding: '8px 16px', fontSize: 9, letterSpacing: 3, fontFamily: MONO,
              }}
            >
              {formOpen ? '— CANCEL' : '+ LOG PROBLEM'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px' }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          {DIFFICULTIES.map(d => (
            <div key={d} style={{
              padding: '10px 16px', border: '1px solid rgba(255,42,42,0.15)',
              minWidth: 100,
            }}>
              <div style={{ fontSize: 8, color: '#737373', letterSpacing: 4 }}>{d.toUpperCase()}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: DIFF_COLORS[d], marginTop: 2 }}>{byDiff[d]}</div>
            </div>
          ))}
          <div style={{
            padding: '10px 16px', border: '1px solid rgba(255,42,42,0.15)',
            minWidth: 100,
          }}>
            <div style={{ fontSize: 8, color: '#737373', letterSpacing: 4 }}>TOTAL</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#E5E5E5', marginTop: 2 }}>{entries.length}</div>
          </div>
        </div>

        {/* Log form */}
        {formOpen && (
          <form onSubmit={handleSubmit} style={{
            border: '1px solid rgba(255,42,42,0.25)',
            padding: 24,
            marginBottom: 32,
            background: 'rgba(255,42,42,0.02)',
          }}>
            <div style={{ fontSize: 9, color: '#FF2A2A', letterSpacing: 4, marginBottom: 20 }}>
              LOG PROBLEM
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>NAME</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Monty Hall Problem" required style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>SRC</label>
                <input
                  type="text" value={source} onChange={e => setSource(e.target.value)}
                  placeholder="Heard on Street / 50 Challenging Problems..."
                  required style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>TOPIC</label>
                {addingTopic ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      autoFocus
                      type="text" value={newTopicVal}
                      onChange={e => setNewTopicVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTopic(); } if (e.key === 'Escape') { setAddingTopic(false); setNewTopicVal(''); } }}
                      placeholder="New topic name"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button type="button" onClick={handleAddCustomTopic} style={{
                      background: 'rgba(255,42,42,0.1)', border: '1px solid rgba(255,42,42,0.4)',
                      color: '#FF2A2A', cursor: 'pointer', padding: '0 12px',
                      fontSize: 9, letterSpacing: 2, fontFamily: MONO,
                    }}>ADD</button>
                  </div>
                ) : (
                  <select
                    value={topic}
                    onChange={e => {
                      if (e.target.value === '__add__') { setAddingTopic(true); }
                      else setTopic(e.target.value);
                    }}
                    style={selectStyle}
                  >
                    {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="__add__">Add custom topic…</option>
                  </select>
                )}
              </div>

              <div>
                <label style={labelStyle}>DATE</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Difficulty pill toggle */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>DIFF</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    style={{
                      padding: '6px 16px',
                      border: `1px solid ${difficulty === d ? DIFF_COLORS[d] : 'rgba(255,42,42,0.2)'}`,
                      background: difficulty === d ? `${DIFF_COLORS[d]}18` : 'transparent',
                      color: difficulty === d ? DIFF_COLORS[d] : '#737373',
                      fontSize: 8, letterSpacing: 3, cursor: 'pointer', fontFamily: MONO,
                    }}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>NOTES (OPTIONAL)</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={3} placeholder="Key insight, approach..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !name || !source}
              style={{
                background: submitting ? 'rgba(255,42,42,0.05)' : 'rgba(255,42,42,0.1)',
                border: '1px solid rgba(255,42,42,0.5)',
                color: '#FF2A2A', cursor: 'pointer',
                padding: '10px 24px', fontSize: 10, letterSpacing: 4, fontFamily: MONO,
                opacity: (!name || !source) ? 0.4 : 1,
              }}
            >
              {submitting ? 'SAVING...' : 'SUBMIT'}
            </button>
          </form>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#737373', letterSpacing: 3 }}>FILTER:</span>
          <select
            value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
            style={{
              background: 'transparent', border: '1px solid rgba(255,42,42,0.25)',
              color: '#E5E5E5', padding: '6px 10px', fontFamily: MONO, fontSize: 9,
              outline: 'none', cursor: 'pointer', appearance: 'none' as const,
            }}
          >
            <option value="">ALL DIFF</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
          </select>
          <select
            value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
            style={{
              background: 'transparent', border: '1px solid rgba(255,42,42,0.25)',
              color: '#E5E5E5', padding: '6px 10px', fontFamily: MONO, fontSize: 9,
              outline: 'none', cursor: 'pointer', appearance: 'none' as const,
            }}
          >
            <option value="">ALL TOPICS</option>
            {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(filterDiff || filterTopic) && (
            <button
              onClick={() => { setFilterDiff(''); setFilterTopic(''); }}
              style={{
                background: 'none', border: '1px solid rgba(255,42,42,0.2)',
                color: '#737373', cursor: 'pointer', padding: '5px 10px',
                fontSize: 8, letterSpacing: 2, fontFamily: MONO,
              }}
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ color: '#737373', fontSize: 10, letterSpacing: 4, paddingTop: 40, textAlign: 'center' }}>
            LOADING...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#737373', fontSize: 10, letterSpacing: 4, paddingTop: 40, textAlign: 'center' }}>
            NO ENTRIES
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,42,42,0.15)' }}>
                  {['NAME', 'SRC', 'TOPIC', 'DIFF', 'DATE', 'NOTES', ''].map(h => (
                    <th key={h} style={{
                      padding: '8px 10px', textAlign: 'left',
                      fontSize: 8, color: '#737373', letterSpacing: 3,
                      fontFamily: MONO, fontWeight: 700,
                    }}>
                      {h}
                    </th>
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
                    <td style={{ padding: '10px 10px', color: '#E5E5E5', fontSize: 10, maxWidth: 200 }}>
                      {entry.name}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#737373', fontSize: 9, maxWidth: 160 }}>
                      {entry.source}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{
                        padding: '2px 8px', border: '1px solid rgba(255,42,42,0.2)',
                        color: '#737373', fontSize: 8, letterSpacing: 2,
                      }}>
                        {entry.topic}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <DiffBadge diff={entry.difficulty} />
                    </td>
                    <td style={{ padding: '10px 10px', color: '#737373', fontSize: 9, whiteSpace: 'nowrap' }}>
                      {entry.date}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#737373', fontSize: 9, maxWidth: 240 }}>
                      {entry.notes ? (
                        <span title={entry.notes}>
                          {entry.notes.length > 60 ? entry.notes.slice(0, 60) + '…' : entry.notes}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        style={{
                          background: 'none', border: 'none', color: '#4a4a4a',
                          cursor: 'pointer', fontSize: 14, padding: '0 4px',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff375f'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4a4a4a'}
                        title="Delete entry"
                      >
                        ×
                      </button>
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
