'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadBoard, saveBoard } from '@/lib/storage';
import { defaultBoard, newCard, uid, dueMeta, checklistProgress, isCardDone, repeatLabel, locateCard } from '@/lib/board';
import { Board, BoardCard, BoardLabel } from '@/lib/types';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors,
  closestCorners, useDroppable, DragStartEvent, DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import CardModal from '@/components/todo/CardModal';

const BC = "'Barlow Condensed', sans-serif";

const SETUP_SQL = `create table if not exists public.todo_board (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.todo_board enable row level security;

create policy "Users manage their own board"
  on public.todo_board for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);`;

export default function TodoPage() {
  const [board, setBoard]       = useState<Board | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [filter, setFilter]     = useState<string[]>([]);

  const firstSave = useRef(true);
  const boardRef  = useRef<Board | null>(null);
  boardRef.current = board;

  useEffect(() => {
    loadBoard()
      .then(({ board, needsSetup }) => { setNeedsSetup(needsSetup); setBoard(board); })
      .catch(err => console.error('board load failed', err))
      .finally(() => setLoading(false));
  }, []);

  // Debounced autosave
  useEffect(() => {
    if (!board) return;
    if (firstSave.current) { firstSave.current = false; return; }
    const t = setTimeout(() => saveBoard(board), 500);
    return () => clearTimeout(t);
  }, [board]);

  // Flush the latest board when leaving the page
  useEffect(() => () => { if (!firstSave.current && boardRef.current) saveBoard(boardRef.current); }, []);

  const mutate = useCallback((fn: (b: Board) => Board) => {
    setBoard(prev => (prev ? fn(prev) : prev));
  }, []);

  // ── Card / list mutations ──────────────────────────────────────────────────
  const addCard = (listId: string, title: string) =>
    mutate(b => ({ ...b, lists: b.lists.map(l => l.id === listId ? { ...l, cards: [...l.cards, newCard(title)] } : l) }));

  const updateCard = (cardId: string, updater: (c: BoardCard) => BoardCard) =>
    mutate(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.map(c => c.id === cardId ? updater(c) : c) })) }));

  const deleteCard = (cardId: string) => {
    mutate(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.filter(c => c.id !== cardId) })) }));
    setOpenCardId(null);
  };

  const moveCardToList = (cardId: string, listId: string) =>
    mutate(b => {
      const loc = locateCard(b, cardId);
      if (!loc) return b;
      const card = b.lists[loc[0]].cards[loc[1]];
      return {
        ...b,
        lists: b.lists.map(l =>
          l.id === b.lists[loc[0]].id ? { ...l, cards: l.cards.filter(c => c.id !== cardId) }
          : l.id === listId ? { ...l, cards: [...l.cards, card] }
          : l),
      };
    });

  const addList = () => mutate(b => ({ ...b, lists: [...b.lists, { id: uid(), title: 'New list', cards: [] }] }));
  const renameList = (listId: string, title: string) =>
    mutate(b => ({ ...b, lists: b.lists.map(l => l.id === listId ? { ...l, title } : l) }));
  const deleteList = (listId: string) =>
    mutate(b => ({ ...b, lists: b.lists.filter(l => l.id !== listId) }));
  const moveList = (listId: string, dir: -1 | 1) =>
    mutate(b => {
      const i = b.lists.findIndex(l => l.id === listId);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= b.lists.length) return b;
      const lists = [...b.lists];
      [lists[i], lists[j]] = [lists[j], lists[i]];
      return { ...b, lists };
    });

  const updateLabel = (labelId: string, patch: Partial<BoardLabel>) =>
    mutate(b => ({ ...b, labels: b.labels.map(l => l.id === labelId ? { ...l, ...patch } : l) }));

  // ── Drag and drop (cards across lists) ─────────────────────────────────────
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  function onDragStart(e: DragStartEvent) {
    const loc = board && locateCard(board, String(e.active.id));
    if (loc && board) setActiveCard(board.lists[loc[0]].cards[loc[1]]);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    mutate(b => {
      const from = locateCard(b, activeId);
      if (!from) return b;
      const lists = b.lists.map(l => ({ ...l, cards: [...l.cards] }));
      const [card] = lists[from[0]].cards.splice(from[1], 1);

      const overCard = locateCard(b, overId);
      let tli: number, tci: number;
      if (overCard) {
        tli = overCard[0];
        tci = lists[tli].cards.findIndex(c => c.id === overId);
        if (tci === -1) tci = lists[tli].cards.length;
      } else {
        const li = b.lists.findIndex(l => l.id === overId);
        tli = li === -1 ? from[0] : li;
        tci = lists[tli].cards.length;
      }
      lists[tli].cards.splice(tci, 0, card);
      return { ...b, lists };
    });
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const openCard = board && openCardId ? locateCard(board, openCardId) : null;
  const openCardData = openCard && board ? board.lists[openCard[0]].cards[openCard[1]] : null;
  const openCardListId = openCard && board ? board.lists[openCard[0]].id : null;

  const allCards = board ? board.lists.flatMap(l => l.cards) : [];
  const totalCards = allCards.length;
  const doneCards = allCards.filter(isCardDone).length;
  const usedLabelIds = new Set(allCards.flatMap(c => c.labelIds));
  const filterLabels = board ? board.labels.filter(l => usedLabelIds.has(l.id)) : [];

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>Loading…</div>;
  }

  if (needsSetup || !board) {
    return <SetupBanner />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 100, overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '28px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0f0f0f' }}>
        <div style={{ fontSize: 10, letterSpacing: 6, color: '#475569', fontFamily: BC, marginBottom: 6 }}>
          {format(new Date(), 'EEEE, MMMM d').toUpperCase()}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: '#f1f5f9', letterSpacing: -1, fontStyle: 'italic', margin: 0 }}>BOARD</h1>
          <span style={{ fontSize: 13, color: '#475569', fontFamily: BC }}>
            {totalCards} card{totalCards === 1 ? '' : 's'}{doneCards > 0 ? ` · ${doneCards} done` : ''}
          </span>
        </div>

        {/* Label filter */}
        {filterLabels.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, letterSpacing: 2, color: '#334155', fontFamily: BC, fontWeight: 700, marginRight: 2 }}>FILTER</span>
            {filterLabels.map(l => {
              const on = filter.includes(l.id);
              return (
                <button key={l.id}
                  onClick={() => setFilter(f => on ? f.filter(x => x !== l.id) : [...f, l.id])}
                  style={{
                    height: 24, padding: '0 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
                    border: on ? '1.5px solid #fff' : '1.5px solid transparent',
                    background: l.color, color: '#0a0a0a',
                  }}>
                  {l.name || '  '}
                </button>
              );
            })}
            {filter.length > 0 && (
              <button onClick={() => setFilter([])} style={{
                height: 24, padding: '0 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 1,
                cursor: 'pointer', fontFamily: BC,
              }}>CLEAR</button>
            )}
          </div>
        )}
      </div>

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveCard(null)}>
        <div className="board-scroll">
          {board.lists.map((list, i) => (
            <ListColumn
              key={list.id}
              list={list}
              labels={board.labels}
              filter={filter}
              isFirst={i === 0}
              isLast={i === board.lists.length - 1}
              onOpenCard={setOpenCardId}
              onAddCard={addCard}
              onRename={renameList}
              onDelete={deleteList}
              onMove={moveList}
            />
          ))}
          <button onClick={addList} className="board-add-list" style={{
            width: 200, flexShrink: 0, alignSelf: 'flex-start', marginTop: 4,
            padding: '14px', borderRadius: 12, cursor: 'pointer', fontFamily: BC,
            border: '1px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)',
            color: '#64748b', fontSize: 12, fontWeight: 700, letterSpacing: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ADD LIST
          </button>
        </div>

        <DragOverlay>
          {activeCard && <CardFace card={activeCard} labels={board.labels} dragging />}
        </DragOverlay>
      </DndContext>

      {openCardData && openCardListId && (
        <CardModal
          key={openCardData.id}
          card={openCardData}
          listTitle={board.lists[openCard![0]].title}
          currentListId={openCardListId}
          lists={board.lists.map(l => ({ id: l.id, title: l.title }))}
          labels={board.labels}
          onChange={updater => updateCard(openCardData.id, updater)}
          onClose={() => setOpenCardId(null)}
          onDelete={() => deleteCard(openCardData.id)}
          onMove={listId => moveCardToList(openCardData.id, listId)}
          onUpdateLabel={updateLabel}
        />
      )}
    </div>
  );
}

// ── List column ─────────────────────────────────────────────────────────────

function ListColumn({ list, labels, filter, isFirst, isLast, onOpenCard, onAddCard, onRename, onDelete, onMove }: {
  list: Board['lists'][number]; labels: BoardLabel[]; filter: string[];
  isFirst: boolean; isLast: boolean;
  onOpenCard: (id: string) => void;
  onAddCard: (listId: string, title: string) => void;
  onRename: (listId: string, title: string) => void;
  onDelete: (listId: string) => void;
  onMove: (listId: string, dir: -1 | 1) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(list.title);

  const cards = list.cards.filter(c => filter.length === 0 || c.labelIds.some(id => filter.includes(id)));

  function submit() {
    const t = text.trim();
    if (t) { onAddCard(list.id, t); setText(''); }
  }

  return (
    <div className="board-col" style={{
      background: '#111214', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
      display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 200px)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 8px 10px 14px', position: 'relative' }}>
        {editingTitle ? (
          <input
            autoFocus value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={() => { setEditingTitle(false); const t = titleDraft.trim(); if (t) onRename(list.id, t); else setTitleDraft(list.title); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(list.title); } }}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, color: '#f1f5f9', fontSize: 13, fontWeight: 700, padding: '4px 8px', fontFamily: 'inherit', outline: 'none' }}
          />
        ) : (
          <span onClick={() => { setTitleDraft(list.title); setEditingTitle(true); }} style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#e2e8f0', letterSpacing: 0.5, cursor: 'text' }}>
            {list.title}
          </span>
        )}
        <span style={{ fontSize: 11, color: '#475569', fontFamily: BC, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{list.cards.length}</span>
        <button onClick={() => setMenu(m => !m)} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
        </button>
        {menu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenu(false)} />
            <div style={{ position: 'absolute', top: 40, right: 8, zIndex: 50, background: '#1c1e22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 6, minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              <MenuItem disabled={isFirst} onClick={() => { onMove(list.id, -1); setMenu(false); }}>Move left</MenuItem>
              <MenuItem disabled={isLast} onClick={() => { onMove(list.id, 1); setMenu(false); }}>Move right</MenuItem>
              <MenuItem onClick={() => { setTitleDraft(list.title); setEditingTitle(true); setMenu(false); }}>Rename</MenuItem>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
              <MenuItem danger onClick={() => { if (list.cards.length === 0 || confirm(`Delete "${list.title}" and its ${list.cards.length} card(s)?`)) onDelete(list.id); setMenu(false); }}>Delete list</MenuItem>
            </div>
          </>
        )}
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="board-cards" style={{
        flex: 1, overflowY: 'auto', padding: '2px 8px 8px', minHeight: 12,
        background: isOver ? 'rgba(59,130,246,0.05)' : 'transparent', transition: 'background 0.15s',
      }}>
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <SortableCard key={card.id} card={card} labels={labels} onOpen={() => onOpenCard(card.id)} />
          ))}
        </SortableContext>

        {composing ? (
          <div style={{ marginTop: 6 }}>
            <textarea
              autoFocus value={text} rows={2}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') { setComposing(false); setText(''); } }}
              placeholder="Card title…"
              style={{ width: '100%', background: '#0c0d0f', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 8, color: '#f1f5f9', fontSize: 13, padding: '8px 10px', fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.4 }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button onClick={submit} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Add card</button>
              <button onClick={() => { setComposing(false); setText(''); }} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setComposing(true)} style={{
            width: '100%', marginTop: 6, padding: '9px 10px', borderRadius: 8, border: 'none', textAlign: 'left',
            background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}

function MenuItem({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none',
      background: 'transparent', color: disabled ? '#334155' : danger ? '#f87171' : '#cbd5e1',
      fontSize: 13, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function SortableCard({ card, labels, onOpen }: { card: BoardCard; labels: BoardLabel[]; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes} {...listeners}
      onClick={onOpen}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        opacity: isDragging ? 0.35 : 1, marginBottom: 6, touchAction: 'manipulation',
      }}
    >
      <CardFace card={card} labels={labels} />
    </div>
  );
}

function CardFace({ card, labels, dragging }: { card: BoardCard; labels: BoardLabel[]; dragging?: boolean }) {
  const done = isCardDone(card);
  const due = dueMeta(card.dueDate, done);
  const prog = checklistProgress(card);
  const cardLabels = card.labelIds.map(id => labels.find(l => l.id === id)).filter(Boolean) as BoardLabel[];
  const hasFooter = !!due || prog.total > 0 || !!card.repeat || !!card.description;

  return (
    <div style={{
      background: '#191b1f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
      padding: '9px 11px', cursor: 'pointer', boxShadow: dragging ? '0 12px 28px rgba(0,0,0,0.5)' : 'none',
      transform: dragging ? 'rotate(2deg)' : 'none', opacity: done ? 0.6 : 1,
    }}>
      {cardLabels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 7 }}>
          {cardLabels.map(l => (
            <span key={l.id} title={l.name} style={{
              height: l.name ? 18 : 7, minWidth: 34, padding: l.name ? '0 7px' : 0, borderRadius: 4,
              background: l.color, color: '#0a0a0a', fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap',
            }}>{l.name}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {done && (
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#22c55e', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,7 5.5,10.5 12,3.5"/></svg>
          </div>
        )}
        <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.4, color: done ? '#64748b' : '#e2e8f0', textDecoration: done ? 'line-through' : 'none' }}>{card.title}</span>
      </div>

      {hasFooter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {due && (
            <span style={{ height: 20, padding: '0 7px', borderRadius: 5, background: due.bg, color: due.fg, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 8 12 12 15 14"/></svg>
              {due.text}
            </span>
          )}
          {card.repeat && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', fontFamily: BC, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              {repeatLabel(card.repeat).toUpperCase()}
            </span>
          )}
          {prog.total > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: prog.done === prog.total ? '#22c55e' : '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              {prog.done}/{prog.total}
            </span>
          )}
          {card.description && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/></svg>
          )}
        </div>
      )}
    </div>
  );
}

// ── Setup banner (shown until the todo_board table exists) ──────────────────────

function SetupBanner() {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', fontStyle: 'italic', letterSpacing: -0.5 }}>ONE-TIME SETUP</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
        The board needs a <code style={{ color: '#93c5fd' }}>todo_board</code> table. Open your Supabase project → <b>SQL Editor</b>, paste this, and run it. Then reload.
      </p>
      <div style={{ position: 'relative', marginTop: 16 }}>
        <pre style={{ background: '#0c0d0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 16, overflowX: 'auto', fontSize: 12, color: '#cbd5e1', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>{SETUP_SQL}</pre>
        <button onClick={() => { navigator.clipboard.writeText(SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{
          position: 'absolute', top: 10, right: 10, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
          background: '#1c1e22', color: copied ? '#4ade80' : '#cbd5e1', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: BC, letterSpacing: 1,
        }}>{copied ? 'COPIED' : 'COPY'}</button>
      </div>
      <button onClick={() => location.reload()} style={{
        marginTop: 20, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff',
        fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', fontFamily: BC,
      }}>I&apos;VE RUN IT — RELOAD</button>
    </div>
  );
}
