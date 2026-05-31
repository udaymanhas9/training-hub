'use client';

import { useState, useEffect, useRef } from 'react';
import { getTodos, saveTodo, deleteTodo } from '@/lib/storage';
import { Todo, TodoRepeat } from '@/lib/types';
import { format } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');
const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

type Filter = 'all' | 'today' | 'upcoming' | 'done';

// ── Repeat helpers ────────────────────────────────────────────────────────────

const REPEAT_PRESETS: { label: string; value: TodoRepeat }[] = [
  { label: 'Daily',   value: { type: 'daily' } },
  { label: 'Weekly',  value: { type: 'weekly' } },
  { label: 'Monthly', value: { type: 'monthly' } },
];

function repeatIntervalDays(r: TodoRepeat): number {
  if (r.type === 'daily')   return 1;
  if (r.type === 'weekly')  return 7;
  if (r.type === 'monthly') return 30;
  return r.every ?? 1;
}

function repeatLabel(r?: TodoRepeat): string {
  if (!r) return '';
  if (r.type === 'daily')   return 'Daily';
  if (r.type === 'weekly')  return 'Weekly';
  if (r.type === 'monthly') return 'Monthly';
  return `Every ${r.every ?? 1}d`;
}

// A repeating task is "done" only within its interval window
function isCompleted(t: Todo): boolean {
  if (!t.completed) return false;
  if (!t.repeat)    return true;
  if (!t.completedAt) return false;
  if (t.repeat.type === 'daily') return t.completedAt.slice(0, 10) === today;
  const diffMs   = Date.now() - new Date(t.completedAt).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays < repeatIntervalDays(t.repeat);
}

function dueDateLabel(date?: string): { text: string; color: string } | null {
  if (!date) return null;
  if (date < today) return { text: 'Overdue', color: '#f87171' };
  if (date === today) return { text: 'Today', color: '#f97316' };
  if (date === tomorrow) return { text: 'Tomorrow', color: '#facc15' };
  return { text: format(new Date(date + 'T00:00:00'), 'MMM d'), color: '#64748b' };
}

function newTodo(
  text: string,
  dueDate?: string,
  priority: Todo['priority'] = 'normal',
  repeat?: TodoRepeat,
): Todo {
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
    dueDate,
    priority,
    repeat,
    createdAt: new Date().toISOString(),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TodoPage() {
  const [todos, setTodos]           = useState<Todo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [input, setInput]           = useState('');
  const [dueDate, setDueDate]       = useState<string | undefined>(undefined);
  const [priority, setPriority]     = useState<Todo['priority']>('normal');
  const [repeat, setRepeat]         = useState<TodoRepeat | undefined>(undefined);
  const [filter, setFilter]         = useState<Filter>('all');
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [customDays, setCustomDays] = useState('2');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getTodos().then(t => { setTodos(t); setLoading(false); });
  }, []);

  async function addTodo() {
    const text = input.trim();
    if (!text) return;
    const todo = newTodo(text, dueDate, priority, repeat);
    setTodos(prev => [todo, ...prev]);
    setInput('');
    setDueDate(undefined);
    setPriority('normal');
    setRepeat(undefined);
    setShowDatePicker(false);
    setShowRepeatPicker(false);
    await saveTodo(todo);
  }

  async function toggleTodo(id: string) {
    const next = todos.map(t => {
      if (t.id !== id) return t;
      const currentlyDone = isCompleted(t);
      if (currentlyDone) {
        // un-complete: clear flag
        return { ...t, completed: false, completedAt: undefined };
      }
      return { ...t, completed: true, completedAt: new Date().toISOString() };
    });
    setTodos(next);
    await saveTodo(next.find(t => t.id === id)!);
  }

  async function removeTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
    await deleteTodo(id);
  }

  async function updateText(id: string, text: string) {
    const next = todos.map(t => t.id === id ? { ...t, text } : t);
    setTodos(next);
    await saveTodo(next.find(t => t.id === id)!);
  }

  const filtered = todos.filter(t => {
    const done = isCompleted(t);
    if (filter === 'today')    return !done && (t.dueDate === today || t.repeat?.type === 'daily');
    if (filter === 'upcoming') return !done && (!t.dueDate || t.dueDate >= today);
    if (filter === 'done')     return done;
    return !done;
  });

  // Sort: repeating tasks float to top within pending list
  const sorted = [...filtered].sort((a, b) => {
    if (a.repeat && !b.repeat) return -1;
    if (!a.repeat && b.repeat) return 1;
    return 0;
  });

  const active   = todos.filter(t => !isCompleted(t)).length;
  const doneToday = todos.filter(t => isCompleted(t) && t.completedAt?.startsWith(today)).length;

  const dateOptions = [
    { label: 'Today',    value: today },
    { label: 'Tomorrow', value: tomorrow },
    { label: 'No date',  value: undefined as string | undefined },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 120, overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '32px 24px 24px', background: '#0f0f0f' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: 6, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>
            {format(new Date(), 'EEEE, MMMM d').toUpperCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', letterSpacing: -1, fontStyle: 'italic', margin: 0 }}>TASKS</h1>
            <span style={{ fontSize: 13, color: '#475569', fontFamily: "'Barlow Condensed', sans-serif" }}>
              {active} remaining{doneToday > 0 ? ` · ${doneToday} done today` : ''}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 24px 0' }}>

        {/* ── Quick-add bar ────────────────────────────────────────────────── */}
        <div style={{
          background: '#111', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, marginBottom: 8,
          transition: 'border-color 0.15s',
        }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
        >
          {/* Text input row */}
          <div style={{ padding: '4px 4px 4px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
              placeholder="What needs to be done?"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#f1f5f9', fontSize: 15, fontWeight: 500,
                fontFamily: 'inherit', padding: '10px 0',
              }}
            />
            <button
              onClick={addTodo}
              disabled={!input.trim()}
              style={{
                height: 40, width: 40, borderRadius: 8, border: 'none',
                background: input.trim() ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                color: input.trim() ? '#fff' : '#475569',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Options row */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4,
          }}>

            {/* Priority */}
            <ToolBtn
              active={priority === 'high'}
              activeColor="#f97316"
              activeBg="rgba(249,115,22,0.12)"
              title="High priority"
              onClick={() => setPriority(p => p === 'high' ? 'normal' : 'high')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={priority === 'high' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {priority === 'high' && <span style={{ fontSize: 10, fontWeight: 700 }}>HIGH</span>}
            </ToolBtn>

            {/* Date */}
            <div style={{ position: 'relative' }}>
              <ToolBtn
                active={!!dueDate}
                activeColor="#3b82f6"
                activeBg="rgba(59,130,246,0.12)"
                title="Set due date"
                onClick={() => { setShowDatePicker(v => !v); setShowRepeatPicker(false); }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span style={{ fontSize: 10, fontWeight: 600 }}>
                  {dueDate ? (dueDate === today ? 'Today' : dueDate === tomorrow ? 'Tomorrow' : format(new Date(dueDate + 'T00:00:00'), 'MMM d')) : 'Date'}
                </span>
              </ToolBtn>
              {showDatePicker && (
                <Popover onClose={() => setShowDatePicker(false)}>
                  {dateOptions.map(opt => (
                    <PopoverOption
                      key={opt.label}
                      label={opt.label}
                      active={dueDate === opt.value}
                      onClick={() => { setDueDate(opt.value); setShowDatePicker(false); }}
                    />
                  ))}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0', paddingTop: 4 }}>
                    <input
                      type="date" value={dueDate || ''}
                      onChange={e => { setDueDate(e.target.value || undefined); setShowDatePicker(false); }}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#64748b', fontSize: 12, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                </Popover>
              )}
            </div>

            {/* Repeat */}
            <div style={{ position: 'relative' }}>
              <ToolBtn
                active={!!repeat}
                activeColor="#10b981"
                activeBg="rgba(16,185,129,0.12)"
                title="Set repeat"
                onClick={() => { setShowRepeatPicker(v => !v); setShowDatePicker(false); }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <span style={{ fontSize: 10, fontWeight: 600 }}>
                  {repeat ? repeatLabel(repeat) : 'Repeat'}
                </span>
              </ToolBtn>
              {showRepeatPicker && (
                <Popover onClose={() => setShowRepeatPicker(false)}>
                  <PopoverOption label="No repeat" active={!repeat} onClick={() => { setRepeat(undefined); setShowRepeatPicker(false); }} />
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }} />
                  {REPEAT_PRESETS.map(p => (
                    <PopoverOption
                      key={p.label}
                      label={p.label}
                      active={repeat?.type === p.value.type}
                      onClick={() => { setRepeat(p.value); setShowRepeatPicker(false); }}
                    />
                  ))}
                  {/* Custom interval */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0', padding: '6px 8px' }}>
                    <div style={{ fontSize: 10, color: '#475569', letterSpacing: 2, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>CUSTOM</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Every</span>
                      <input
                        type="number" min="1" max="365"
                        value={customDays}
                        onChange={e => setCustomDays(e.target.value)}
                        style={{
                          width: 44, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 4, color: '#f1f5f9', fontSize: 12, padding: '3px 6px',
                          fontFamily: 'inherit', outline: 'none', textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>days</span>
                      <button
                        onClick={() => {
                          const n = parseInt(customDays);
                          if (n > 0) { setRepeat({ type: 'custom', every: n }); setShowRepeatPicker(false); }
                        }}
                        style={{
                          marginLeft: 'auto', padding: '3px 10px', borderRadius: 4, border: 'none',
                          background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >Set</button>
                    </div>
                  </div>
                </Popover>
              )}
            </div>
          </div>
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, marginTop: 16 }}>
          {(['all', 'today', 'upcoming', 'done'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 14px', borderRadius: 6, border: 'none',
              background: filter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: filter === f ? '#f1f5f9' : '#475569',
              fontSize: 10, fontWeight: 700, letterSpacing: 3,
              cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", transition: 'all 0.15s',
            }}>{f.toUpperCase()}</button>
          ))}
          <div style={{ flex: 1 }} />
          {filter === 'done' && todos.some(t => isCompleted(t)) && (
            <button
              onClick={async () => {
                const toDelete = todos.filter(t => isCompleted(t) && !t.repeat);
                setTodos(prev => prev.filter(t => !isCompleted(t) || !!t.repeat));
                await Promise.all(toDelete.map(t => deleteTodo(t.id)));
              }}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.2)',
                background: 'transparent', color: '#f87171', fontSize: 10, fontWeight: 700,
                letterSpacing: 2, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
              }}
            >CLEAR DONE</button>
          )}
        </div>

        {/* ── Task list ────────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 52, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 13, letterSpacing: 3, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {filter === 'done' ? 'NO COMPLETED TASKS' : 'ALL CLEAR'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sorted.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                done={isCompleted(todo)}
                onToggle={() => toggleTodo(todo.id)}
                onDelete={() => removeTodo(todo.id)}
                onTextChange={text => updateText(todo.id, text)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small shared components ───────────────────────────────────────────────────

function ToolBtn({ active, activeColor, activeBg, title, onClick, children }: {
  active: boolean; activeColor: string; activeBg: string;
  title: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
        padding: '0 8px', display: 'flex', alignItems: 'center', gap: 5,
        background: active ? activeBg : 'transparent',
        color: active ? activeColor : '#475569',
        transition: 'all 0.15s', flexShrink: 0,
      }}
    >{children}</button>
  );
}

function Popover({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 6,
        background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, padding: 8, zIndex: 50, minWidth: 170,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>{children}</div>
    </>
  );
}

function PopoverOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '8px 12px', borderRadius: 6, border: 'none',
        background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
        color: active ? '#3b82f6' : '#94a3b8',
        fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >{label}</button>
  );
}

// ── TodoItem ─────────────────────────────────────────────────────────────────

function TodoItem({ todo, done, onToggle, onDelete, onTextChange }: {
  todo: Todo; done: boolean;
  onToggle: () => void; onDelete: () => void; onTextChange: (text: string) => void;
}) {
  const [hovered, setHovered]   = useState(false);
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const dateInfo = dueDateLabel(todo.dueDate);
  const overdue  = todo.dueDate && todo.dueDate < today && !done;

  function commitEdit() {
    setEditing(false);
    const text = editText.trim();
    if (text && text !== todo.text) onTextChange(text);
    else setEditText(todo.text);
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10,
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        transition: 'background 0.1s',
        borderLeft: overdue
          ? '2px solid rgba(248,113,113,0.4)'
          : todo.priority === 'high' && !done
            ? '2px solid rgba(249,115,22,0.4)'
            : '2px solid transparent',
      }}
    >
      {/* Checkbox — 44×44 tap target wrapping a 22×22 visual circle */}
      <button
        onClick={onToggle}
        style={{
          width: 44, height: 44, flexShrink: 0,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, margin: '-11px -11px -11px -11px',
        }}
      >
        <div style={{
          width: 22, height: 22,
          borderRadius: '50%',
          border: done ? 'none' : `1.5px solid ${overdue ? '#f87171' : todo.priority === 'high' ? '#f97316' : '#4a5568'}`,
          background: done
            ? (overdue ? '#f87171' : todo.priority === 'high' ? '#f97316' : '#22c55e')
            : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s, border-color 0.15s',
          flexShrink: 0,
        }}>
          {done && (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,7 5.5,10.5 12,3.5" />
            </svg>
          )}
        </div>
      </button>

      {/* Text */}
      {editing ? (
        <input
          autoFocus value={editText}
          onChange={e => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditing(false); setEditText(todo.text); } }}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6, padding: '4px 8px', color: '#f1f5f9', fontSize: 14,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
      ) : (
        <span
          onDoubleClick={() => !done && setEditing(true)}
          style={{
            flex: 1, fontSize: 14, color: done ? '#334155' : '#cbd5e1',
            textDecoration: done ? 'line-through' : 'none',
            lineHeight: 1.4, cursor: 'text',
          }}
        >{todo.text}</span>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {todo.repeat && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
            color: done ? '#334155' : '#10b981',
            fontFamily: "'Barlow Condensed', sans-serif",
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            {repeatLabel(todo.repeat).toUpperCase()}
          </span>
        )}
        {todo.priority === 'high' && !done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f97316" stroke="#f97316" strokeWidth="1">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
        {dateInfo && (
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1,
            color: done ? '#334155' : dateInfo.color,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>{dateInfo.text}</span>
        )}
        <button
          onClick={onDelete}
          style={{
            width: 24, height: 24, borderRadius: 6, border: 'none',
            background: 'transparent', color: '#475569',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hovered ? 1 : 0, transition: 'opacity 0.1s, color 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
