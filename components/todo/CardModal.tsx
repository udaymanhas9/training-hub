'use client';

import { useState } from 'react';
import { BoardCard, BoardLabel, ChecklistItem, TodoRepeat } from '@/lib/types';
import { checklistProgress, dueMeta, isCardDone, repeatLabel, uid } from '@/lib/board';
import { format } from 'date-fns';

const BC = "'Barlow Condensed', sans-serif";
const todayStr    = () => format(new Date(), 'yyyy-MM-dd');
const tomorrowStr = () => format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

interface Props {
  card: BoardCard;
  listTitle: string;
  lists: { id: string; title: string }[];
  currentListId: string;
  labels: BoardLabel[];
  onChange: (updater: (c: BoardCard) => BoardCard) => void;
  onClose: () => void;
  onDelete: () => void;
  onMove: (listId: string) => void;
  onUpdateLabel: (labelId: string, patch: Partial<BoardLabel>) => void;
}

export default function CardModal({
  card, listTitle, lists, currentListId, labels,
  onChange, onClose, onDelete, onMove, onUpdateLabel,
}: Props) {
  const [title, setTitle] = useState(card.title);
  const [desc, setDesc]   = useState(card.description ?? '');
  const [newItem, setNewItem] = useState('');
  const [panel, setPanel] = useState<null | 'labels' | 'date' | 'repeat' | 'move'>(null);

  const done = isCardDone(card);
  const prog = checklistProgress(card);
  const appliedLabels = card.labelIds.map(id => labels.find(l => l.id === id)).filter(Boolean) as BoardLabel[];

  function commitTitle() {
    const t = title.trim();
    if (t && t !== card.title) onChange(c => ({ ...c, title: t }));
    else if (!t) setTitle(card.title);
  }
  function commitDesc() {
    onChange(c => ({ ...c, description: desc.trim() || undefined }));
  }

  function toggleLabel(id: string) {
    onChange(c => ({
      ...c,
      labelIds: c.labelIds.includes(id) ? c.labelIds.filter(x => x !== id) : [...c.labelIds, id],
    }));
  }
  function setDue(d?: string) { onChange(c => ({ ...c, dueDate: d })); setPanel(null); }
  function setRepeat(r?: TodoRepeat) { onChange(c => ({ ...c, repeat: r })); setPanel(null); }

  function addItem() {
    const t = newItem.trim();
    if (!t) return;
    const item: ChecklistItem = { id: uid(), text: t, done: false };
    onChange(c => ({ ...c, checklist: [...c.checklist, item] }));
    setNewItem('');
  }
  function toggleItem(id: string) {
    onChange(c => ({ ...c, checklist: c.checklist.map(i => i.id === id ? { ...i, done: !i.done } : i) }));
  }
  function deleteItem(id: string) {
    onChange(c => ({ ...c, checklist: c.checklist.filter(i => i.id !== id) }));
  }
  function toggleComplete() {
    onChange(c => isCardDone(c)
      ? { ...c, completed: false, completedAt: undefined }
      : { ...c, completed: true, completedAt: new Date().toISOString() });
  }

  const due = dueMeta(card.dueDate, done);

  return (
    <div
      className="card-sheet-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="card-sheet-panel"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#141517', border: '1px solid rgba(255,255,255,0.1)',
          overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, background: '#141517', zIndex: 2,
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={() => setPanel(panel === 'move' ? null : 'move')}
            style={chip('rgba(255,255,255,0.06)', '#94a3b8')}
          >
            <ListIcon />{listTitle}
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={toggleComplete} style={{
            ...chip(done ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', done ? '#4ade80' : '#94a3b8'),
          }}>
            <CheckIcon />{done ? 'Completed' : 'Mark done'}
          </button>
          <button onClick={onClose} style={iconBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {panel === 'move' && (
          <PanelBox>
            <PanelLabel>MOVE TO LIST</PanelLabel>
            {lists.map(l => (
              <PopRow key={l.id} active={l.id === currentListId} onClick={() => { onMove(l.id); setPanel(null); }}>
                {l.title}
              </PopRow>
            ))}
          </PanelBox>
        )}

        <div style={{ padding: '16px' }}>
          {/* Title */}
          <textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
            rows={1}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              color: done ? '#64748b' : '#f1f5f9', fontSize: 20, fontWeight: 700, fontFamily: 'inherit',
              lineHeight: 1.3, textDecoration: done ? 'line-through' : 'none',
            }}
          />

          {/* Applied labels */}
          {appliedLabels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 4px' }}>
              {appliedLabels.map(l => (
                <span key={l.id} style={{
                  height: 24, padding: '0 10px', borderRadius: 6, display: 'flex', alignItems: 'center',
                  background: l.color, color: '#0a0a0a', fontSize: 12, fontWeight: 700,
                }}>{l.name || ' '}</span>
              ))}
            </div>
          )}

          {/* Attribute buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <AttrBtn active={panel === 'labels'} onClick={() => setPanel(panel === 'labels' ? null : 'labels')}>
              <TagIcon /> Labels
            </AttrBtn>
            <AttrBtn active={panel === 'date' || !!card.dueDate} onClick={() => setPanel(panel === 'date' ? null : 'date')}>
              <CalIcon /> {due ? due.text : 'Due date'}
            </AttrBtn>
            <AttrBtn active={panel === 'repeat' || !!card.repeat} onClick={() => setPanel(panel === 'repeat' ? null : 'repeat')}>
              <RepeatIcon /> {card.repeat ? repeatLabel(card.repeat) : 'Repeat'}
            </AttrBtn>
          </div>

          {/* Labels panel */}
          {panel === 'labels' && (
            <PanelBox>
              <PanelLabel>LABELS — tap to apply, type to name</PanelLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {labels.map(l => {
                  const on = card.labelIds.includes(l.id);
                  return (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => toggleLabel(l.id)} style={{
                        flex: 1, height: 34, borderRadius: 6, border: on ? '2px solid #fff' : '2px solid transparent',
                        background: l.color, color: '#0a0a0a', display: 'flex', alignItems: 'center', paddingLeft: 10,
                        cursor: 'pointer', overflow: 'hidden',
                      }}>
                        <input
                          value={l.name}
                          placeholder="Name…"
                          onClick={e => e.stopPropagation()}
                          onChange={e => onUpdateLabel(l.id, { name: e.target.value })}
                          style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            color: '#0a0a0a', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                          }}
                        />
                      </button>
                      {on && <CheckMini />}
                    </div>
                  );
                })}
              </div>
            </PanelBox>
          )}

          {/* Date panel */}
          {panel === 'date' && (
            <PanelBox>
              <PanelLabel>DUE DATE</PanelLabel>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <QuickBtn onClick={() => setDue(todayStr())}>Today</QuickBtn>
                <QuickBtn onClick={() => setDue(tomorrowStr())}>Tomorrow</QuickBtn>
                <QuickBtn onClick={() => setDue(undefined)}>None</QuickBtn>
              </div>
              <input
                type="date" value={card.dueDate || ''}
                onChange={e => setDue(e.target.value || undefined)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, color: '#f1f5f9', fontSize: 13, padding: '8px 10px', fontFamily: 'inherit', outline: 'none',
                }}
              />
            </PanelBox>
          )}

          {/* Repeat panel */}
          {panel === 'repeat' && (
            <PanelBox>
              <PanelLabel>REPEAT</PanelLabel>
              <PopRow active={!card.repeat} onClick={() => setRepeat(undefined)}>No repeat</PopRow>
              <PopRow active={card.repeat?.type === 'daily'} onClick={() => setRepeat({ type: 'daily' })}>Daily</PopRow>
              <PopRow active={card.repeat?.type === 'weekly'} onClick={() => setRepeat({ type: 'weekly' })}>Weekly</PopRow>
              <PopRow active={card.repeat?.type === 'monthly'} onClick={() => setRepeat({ type: 'monthly' })}>Monthly</PopRow>
              <CustomRepeat current={card.repeat} onSet={n => setRepeat({ type: 'custom', every: n })} />
            </PanelBox>
          )}

          {/* Description */}
          <div style={{ marginTop: 20 }}>
            <SectionLabel><DescIcon /> Description</SectionLabel>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onBlur={commitDesc}
              placeholder="Add more detail…"
              rows={3}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, color: '#cbd5e1', fontSize: 14, padding: '10px 12px', fontFamily: 'inherit',
                outline: 'none', resize: 'vertical', lineHeight: 1.5, marginTop: 8,
              }}
            />
          </div>

          {/* Checklist */}
          <div style={{ marginTop: 20 }}>
            <SectionLabel>
              <ChecklistIcon /> Checklist
              {prog.total > 0 && <span style={{ color: '#475569', fontWeight: 700, marginLeft: 6 }}>{prog.done}/{prog.total}</span>}
            </SectionLabel>
            {prog.total > 0 && (
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, margin: '10px 0', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${(prog.done / prog.total) * 100}%`,
                  background: prog.done === prog.total ? '#22c55e' : '#3b82f6',
                  borderRadius: 3, transition: 'width 0.3s',
                }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
              {card.checklist.map(item => (
                <div key={item.id} className="ex-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 6px', borderRadius: 6 }}>
                  <button onClick={() => toggleItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: item.done ? 'none' : '1.5px solid #4a5568',
                      background: item.done ? '#22c55e' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.done && <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,7 5.5,10.5 12,3.5"/></svg>}
                    </div>
                  </button>
                  <span style={{ flex: 1, fontSize: 14, color: item.done ? '#475569' : '#cbd5e1', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                  <button onClick={() => deleteItem(item.id)} style={{ ...iconBtn, width: 22, height: 22, color: '#475569' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder="Add an item…"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, color: '#f1f5f9', fontSize: 13, padding: '8px 10px', fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button onClick={addItem} disabled={!newItem.trim()} style={{
                padding: '0 14px', borderRadius: 6, border: 'none',
                background: newItem.trim() ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                color: newItem.trim() ? '#fff' : '#475569', fontSize: 13, fontWeight: 700,
                cursor: newItem.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
              }}>Add</button>
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={() => { if (confirm('Delete this card?')) onDelete(); }}
            style={{
              marginTop: 24, width: '100%', padding: '10px', borderRadius: 8,
              border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.06)',
              color: '#f87171', fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', fontFamily: BC,
            }}
          >DELETE CARD</button>
        </div>
      </div>
    </div>
  );
}

// ── Bits ──────────────────────────────────────────────────────────────────────

function CustomRepeat({ current, onSet }: { current?: TodoRepeat; onSet: (n: number) => void }) {
  const [n, setN] = useState(String(current?.type === 'custom' ? current.every ?? 2 : 2));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: 13, color: '#94a3b8' }}>Every</span>
      <input type="number" min="1" max="365" value={n} onChange={e => setN(e.target.value)} style={{
        width: 48, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
        color: '#f1f5f9', fontSize: 13, padding: '4px 6px', fontFamily: 'inherit', outline: 'none', textAlign: 'center',
      }} />
      <span style={{ fontSize: 13, color: '#94a3b8' }}>days</span>
      <button onClick={() => { const v = parseInt(n); if (v > 0) onSet(v); }} style={{
        marginLeft: 'auto', padding: '4px 12px', borderRadius: 4, border: 'none', background: '#10b981',
        color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      }}>Set</button>
    </div>
  );
}

const chip = (bg: string, fg: string): React.CSSProperties => ({
  height: 28, padding: '0 10px', borderRadius: 6, border: 'none', background: bg, color: fg,
  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit',
});
const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 6, border: 'none', background: 'transparent', color: '#94a3b8',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

function AttrBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      height: 34, padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600,
      border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
      background: active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
      color: active ? '#93c5fd' : '#94a3b8',
    }}>{children}</button>
  );
}
function PanelBox({ children }: { children: React.ReactNode }) {
  return <div style={{ margin: '12px 0 4px', padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>{children}</div>;
}
function PanelLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, letterSpacing: 2, color: '#475569', fontFamily: BC, fontWeight: 700, marginBottom: 8 }}>{children}</div>;
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>{children}</div>;
}
function PopRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none',
      background: active ? 'rgba(59,130,246,0.12)' : 'transparent', color: active ? '#93c5fd' : '#cbd5e1',
      fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  );
}
function QuickBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 0', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  );
}

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const CheckMini  = () => <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#4ade80"><polyline points="20 6 9 17 4 12"/></svg>;
const CheckIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" {...s}><polyline points="20 6 9 17 4 12"/></svg>;
const ListIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" {...s}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const TagIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" {...s}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const CalIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const RepeatIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" {...s}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const DescIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" {...s}><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/></svg>;
const ChecklistIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" {...s}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
