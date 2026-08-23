'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadFinanceItems, addFinanceItem, updateFinanceItem, deleteFinanceItem,
  loadPriceHistory, setWishlistCost,
  FinanceItem, FinanceKind, PricePoint, formatMoney, totalCost,
} from '@/lib/finance';
import PriceChart from '@/components/finance/PriceChart';
import { useAuth } from '@/lib/auth-context';
import { pushSupported, isPushEnabled, enablePush, disablePush } from '@/lib/push-client';

const BC = "'Barlow Condensed', sans-serif";
const ACCENT = '#3b82f6';

const SETUP_SQL = `-- Run the full migration in the Supabase SQL editor:
-- supabase/migrations/0003_wishlist.sql
-- Minimal version (finance_items only) shown here for convenience.
create table if not exists public.finance_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('upcoming', 'wishlist')),
  name text not null,
  link text not null default '',
  current_cost numeric,
  price_selector text,
  track_enabled boolean not null default true,
  lowest_price numeric,
  last_notified_price numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.finance_items enable row level security;
create policy "Users manage their own finance items" on public.finance_items
  for all using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);`;

// ── Small styled primitives ────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
  color: '#f1f5f9', padding: '9px 11px', fontSize: 14, fontFamily: BC, outline: 'none',
};

function fmtDelta(current: number | null, low: number | null): { text: string; color: string } | null {
  if (current === null || low === null) return null;
  const diff = current - low;
  if (diff <= 0.001) return { text: 'AT LOW', color: '#10b981' };
  const pct = low > 0 ? (diff / low) * 100 : 0;
  return { text: `+${formatMoney(diff)} (${pct.toFixed(0)}%)`, color: '#f87171' };
}

export default function WishlistPage() {
  const { session } = useAuth();
  const [items, setItems]           = useState<FinanceItem[] | null>(null);
  const [history, setHistory]       = useState<Record<string, PricePoint[]>>({});
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<FinanceKind>('wishlist');

  // New-item form
  const [name, setName]         = useState('');
  const [cost, setCost]         = useState('');
  const [link, setLink]         = useState('');
  const [track, setTrack]       = useState(true);
  const [saving, setSaving]     = useState(false);

  // Inline edit + chart selection
  const [editId, setEditId]           = useState<string | null>(null);
  const [draft, setDraft]             = useState<{ name: string; cost: string; link: string }>({ name: '', cost: '', link: '' });
  const [chartId, setChartId]         = useState<string | null>(null);

  // Alerts + manual price check
  const [pushOn, setPushOn]           = useState(false);
  const [pushBusy, setPushBusy]       = useState(false);
  const [checking, setChecking]       = useState(false);

  const refresh = useCallback(async () => {
    const { items, needsSetup } = await loadFinanceItems();
    setNeedsSetup(needsSetup);
    setItems(items ?? []);
    if (items) {
      const wishIds = items.filter(i => i.kind === 'wishlist').map(i => i.id);
      setHistory(await loadPriceHistory(wishIds));
    }
  }, []);

  useEffect(() => {
    refresh()
      .catch(err => console.error('finance load failed', err))
      .finally(() => setLoading(false));
  }, [refresh]);

  const visible = useMemo(
    () => (items ?? []).filter(i => i.kind === tab),
    [items, tab],
  );

  // Keep a wishlist item selected for the chart
  useEffect(() => {
    if (tab !== 'wishlist') return;
    if (chartId && visible.some(i => i.id === chartId)) return;
    setChartId(visible[0]?.id ?? null);
  }, [tab, visible, chartId]);

  const total = useMemo(() => totalCost(visible), [visible]);

  // Reflect whether this browser is already subscribed to alerts
  useEffect(() => {
    if (pushSupported()) isPushEnabled().then(setPushOn).catch(() => {});
  }, []);

  async function toggleAlerts() {
    const token = session?.access_token;
    if (!token || pushBusy) return;
    setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush(token);
        setPushOn(false);
      } else {
        const ok = await enablePush(token);
        setPushOn(ok);
        if (!ok) alert('Notification permission was blocked — enable it in your browser settings.');
      }
    } catch (err) {
      console.error('alert toggle failed', err);
      alert('Could not change alerts. See console.');
    } finally {
      setPushBusy(false);
    }
  }

  async function checkPricesNow() {
    const token = session?.access_token;
    if (!token || checking) return;
    setChecking(true);
    try {
      const res = await fetch('/api/finance/track', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'check failed');
      await refresh();
      alert(`Checked ${json.checked} item(s): ${json.found} price(s) found, ${json.newLows} new low(s).`);
    } catch (err) {
      console.error('price check failed', err);
      alert('Could not check prices. Sites may be blocking automated requests. See console.');
    } finally {
      setChecking(false);
    }
  }

  async function handleAdd() {
    const nm = name.trim();
    if (!nm || saving) return;
    setSaving(true);
    try {
      const parsedCost = cost.trim() === '' ? null : parseFloat(cost);
      await addFinanceItem({
        kind: tab,
        name: nm,
        link: link.trim(),
        currentCost: parsedCost !== null && !Number.isNaN(parsedCost) ? parsedCost : null,
        trackEnabled: tab === 'wishlist' ? track : false,
      });
      setName(''); setCost(''); setLink(''); setTrack(true);
      await refresh();
    } catch (err) {
      console.error('add failed', err);
      alert('Could not add item. See console.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: FinanceItem) {
    setEditId(item.id);
    setDraft({
      name: item.name,
      cost: item.currentCost === null ? '' : String(item.currentCost),
      link: item.link,
    });
  }

  async function saveEdit(item: FinanceItem) {
    const nm = draft.name.trim();
    if (!nm) return;
    try {
      const parsed = draft.cost.trim() === '' ? null : parseFloat(draft.cost);
      const newCost = parsed !== null && !Number.isNaN(parsed) ? parsed : null;

      await updateFinanceItem(item.id, { name: nm, link: draft.link.trim() });
      // Wishlist cost changes flow through the tracker path (history + low).
      if (item.kind === 'wishlist' && newCost !== null && newCost !== item.currentCost) {
        await setWishlistCost(item, newCost);
      } else if (newCost !== item.currentCost) {
        await updateFinanceItem(item.id, { currentCost: newCost });
      }
      setEditId(null);
      await refresh();
    } catch (err) {
      console.error('save failed', err);
      alert('Could not save. See console.');
    }
  }

  async function handleDelete(item: FinanceItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteFinanceItem(item.id);
      await refresh();
    } catch (err) {
      console.error('delete failed', err);
    }
  }

  async function toggleTrack(item: FinanceItem) {
    try {
      await updateFinanceItem(item.id, { trackEnabled: !item.trackEnabled });
      await refresh();
    } catch (err) {
      console.error('toggle failed', err);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ padding: 40, color: '#475569', fontFamily: BC, letterSpacing: 1 }}>Loading…</div>;
  }

  if (needsSetup) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', fontFamily: BC }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, marginBottom: 12 }}>WISHLIST</h1>
        <p style={{ color: '#94a3b8', marginBottom: 16 }}>
          One-time setup — run this in the Supabase SQL editor, then reload.
        </p>
        <pre style={{
          background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
          padding: 16, fontSize: 12, overflowX: 'auto', color: '#cbd5e1',
          fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre',
        }}>{SETUP_SQL}</pre>
      </div>
    );
  }

  const isWish = tab === 'wishlist';
  const chartItem = isWish ? visible.find(i => i.id === chartId) ?? null : null;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px 60px', fontFamily: BC }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: 3, margin: 0 }}>WISHLIST</h1>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 2 }}>{isWish ? 'WISHLIST VALUE' : 'UPCOMING TOTAL'}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9' }}>{formatMoney(total)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 2 }}>ITEMS</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9' }}>{visible.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
        {(['wishlist', 'upcoming'] as FinanceKind[]).map(k => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: '8px 18px', borderRadius: 6, cursor: 'pointer',
                border: active ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.1)',
                background: active ? 'rgba(59,130,246,0.14)' : 'transparent',
                color: active ? '#dbeafe' : '#64748b',
                fontSize: 13, fontWeight: 700, letterSpacing: 2, fontFamily: BC,
              }}
            >
              {k === 'wishlist' ? 'WISH LIST' : 'UPCOMING COSTS'}
            </button>
          );
        })}
      </div>

      {/* Wishlist controls: manual price check + alert opt-in */}
      {isWish && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button
            onClick={checkPricesNow}
            disabled={checking}
            style={{
              padding: '7px 14px', borderRadius: 6, cursor: checking ? 'default' : 'pointer',
              border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.12)',
              color: '#dbeafe', fontSize: 12, fontWeight: 700, letterSpacing: 1, fontFamily: BC, opacity: checking ? 0.6 : 1,
            }}
          >
            {checking ? 'CHECKING…' : 'CHECK PRICES NOW'}
          </button>
          {pushSupported() && (
            <button
              onClick={toggleAlerts}
              disabled={pushBusy}
              style={{
                padding: '7px 14px', borderRadius: 6, cursor: pushBusy ? 'default' : 'pointer',
                border: '1px solid ' + (pushOn ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'),
                background: pushOn ? 'rgba(16,185,129,0.12)' : 'transparent',
                color: pushOn ? '#34d399' : '#94a3b8', fontSize: 12, fontWeight: 700, letterSpacing: 1, fontFamily: BC, opacity: pushBusy ? 0.6 : 1,
              }}
            >
              {pushOn ? '🔔 ALERTS ON' : '🔕 ENABLE LOW-PRICE ALERTS'}
            </button>
          )}
        </div>
      )}

      {/* Add form */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10,
        padding: 12, marginBottom: 24,
      }}>
        <input style={{ ...inputStyle, flex: '2 1 180px' }} placeholder="Item name"
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <input style={{ ...inputStyle, flex: '1 1 110px' }} placeholder="Cost (£)" inputMode="decimal"
          value={cost} onChange={e => setCost(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <input style={{ ...inputStyle, flex: '2 1 200px' }} placeholder="Link (https://…)"
          value={link} onChange={e => setLink(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        {isWish && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 12, letterSpacing: 1, cursor: 'pointer' }}>
            <input type="checkbox" checked={track} onChange={e => setTrack(e.target.checked)} />
            TRACK
          </label>
        )}
        <button
          onClick={handleAdd}
          disabled={saving || !name.trim()}
          style={{
            padding: '9px 20px', borderRadius: 6, border: 'none', cursor: saving || !name.trim() ? 'default' : 'pointer',
            background: !name.trim() ? 'rgba(59,130,246,0.3)' : ACCENT, color: '#fff',
            fontSize: 13, fontWeight: 800, letterSpacing: 2, fontFamily: BC, opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'ADDING…' : 'ADD'}
        </button>
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569', letterSpacing: 1 }}>
          No {isWish ? 'wishlist items' : 'upcoming costs'} yet.
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isWish ? 720 : 520 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['ITEM', 'CURRENT', ...(isWish ? ['LOW', 'VS LOW', 'TRACK'] : []), 'LINK', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 ? 'left' : 'left', padding: '11px 14px', fontSize: 11, letterSpacing: 2, color: '#64748b', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(item => {
                  const editing = editId === item.id;
                  const delta = isWish ? fmtDelta(item.currentCost, item.lowestPrice) : null;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {/* Name */}
                      <td style={{ padding: '10px 14px' }}>
                        {editing
                          ? <input style={{ ...inputStyle, width: '100%', minWidth: 120 }} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
                          : <span style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{item.name}</span>}
                      </td>
                      {/* Current cost */}
                      <td style={{ padding: '10px 14px' }}>
                        {editing
                          ? <input style={{ ...inputStyle, width: 90 }} inputMode="decimal" value={draft.cost} onChange={e => setDraft(d => ({ ...d, cost: e.target.value }))} />
                          : <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{formatMoney(item.currentCost)}</span>}
                      </td>
                      {/* Wishlist-only cells */}
                      {isWish && (
                        <>
                          <td style={{ padding: '10px 14px', fontSize: 14, color: '#10b981', fontWeight: 700 }}>{formatMoney(item.lowestPrice)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: delta?.color ?? '#475569' }}>{delta?.text ?? '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <button onClick={() => toggleTrack(item)} title="Toggle price tracking"
                              style={{
                                fontSize: 11, fontWeight: 800, letterSpacing: 1, padding: '3px 9px', borderRadius: 5, cursor: 'pointer',
                                border: '1px solid ' + (item.trackEnabled ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'),
                                background: item.trackEnabled ? 'rgba(16,185,129,0.12)' : 'transparent',
                                color: item.trackEnabled ? '#34d399' : '#64748b', fontFamily: BC,
                              }}>
                              {item.trackEnabled ? 'ON' : 'OFF'}
                            </button>
                          </td>
                        </>
                      )}
                      {/* Link */}
                      <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                        {editing
                          ? <input style={{ ...inputStyle, width: '100%', minWidth: 120 }} value={draft.link} onChange={e => setDraft(d => ({ ...d, link: e.target.value }))} />
                          : item.link
                            ? <a href={item.link} target="_blank" rel="noreferrer" style={{ color: ACCENT, fontSize: 13, textDecoration: 'none', display: 'inline-block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
                                {(() => { try { return new URL(item.link).hostname.replace('www.', ''); } catch { return 'link'; } })()} ↗
                              </a>
                            : <span style={{ color: '#475569' }}>—</span>}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {editing ? (
                          <>
                            <button onClick={() => saveEdit(item)} style={actionBtn('#34d399')}>Save</button>
                            <button onClick={() => setEditId(null)} style={actionBtn('#64748b')}>Cancel</button>
                          </>
                        ) : (
                          <>
                            {isWish && <button onClick={() => setChartId(item.id)} style={actionBtn(chartId === item.id ? ACCENT : '#64748b')}>Chart</button>}
                            <button onClick={() => startEdit(item)} style={actionBtn('#94a3b8')}>Edit</button>
                            <button onClick={() => handleDelete(item)} style={actionBtn('#f87171')}>Del</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart (wishlist only) */}
      {isWish && chartItem && (
        <PriceChart
          itemName={chartItem.name}
          history={history[chartItem.id] ?? []}
          lowestPrice={chartItem.lowestPrice}
        />
      )}
    </div>
  );
}

function actionBtn(color: string): React.CSSProperties {
  return {
    background: 'none', border: 'none', cursor: 'pointer', color,
    fontSize: 12, fontWeight: 700, letterSpacing: 1, fontFamily: BC, padding: '4px 7px',
  };
}
