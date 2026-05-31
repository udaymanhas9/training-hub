'use client';

import { useState, useEffect, useRef } from 'react';
import { getTodos, saveTodo, deleteTodo } from '@/lib/storage';
import { Todo } from '@/lib/types';
import { format } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');
const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

type Filter = 'all' | 'today' | 'upcoming' | 'done';

function newTodo(text: string, dueDate?: string, priority: Todo['priority'] = 'normal'): Todo {
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
    dueDate,
    priority,
    createdAt: new Date().toISOString(),
  };
}

function dueDateLabel(date?: string): { text: string; color: string } | null {
  if (!date) return null;
  if (date < today) return { text: 'Overdue', color: '#f87171' };
  if (date === today) return { text: 'Today', color: '#f97316' };
  if (date === tomorrow) return { text: 'Tomorrow', color: '#facc15' };
  return { text: format(new Date(date + 'T00:00:00'), 'MMM d'), color: '#64748b' };
}

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<Todo['priority']>('normal');
  const [filter, setFilter] = useState<Filter>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getTodos().then(t => { setTodos(t); setLoading(false); });
  }, []);

  async function addTodo() {
    const text = input.trim();
    if (!text) return;
    const todo = newTodo(text, dueDate, priority);
    const next = [todo, ...todos];
    setTodos(next);
    setInput('');
    setDueDate(undefined);
    setPriority('normal');
    setShowDatePicker(false);
    await saveTodo(todo);
  }

  async function toggleTodo(id: string) {
    const next = todos.map(t => {
      if (t.id !== id) return t;
      const completed = !t.completed;
      return { ...t, completed, completedAt: completed ? new Date().toISOString() : undefined };
    });
    setTodos(next);
    const updated = next.find(t => t.id === id)!;
    await saveTodo(updated);
  }

  async function removeTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
    await deleteTodo(id);
  }

  async function updateText(id: string, text: string) {
    const next = todos.map(t => t.id === id ? { ...t, text } : t);
    setTodos(next);
    const updated = next.find(t => t.id === id)!;
    await saveTodo(updated);
  }

  const filtered = todos.filter(t => {
    if (filter === 'today') return !t.completed && t.dueDate === today;
    if (filter === 'upcoming') return !t.completed && (!t.dueDate || t.dueDate >= today);
    if (filter === 'done') return t.completed;
    return !t.completed;
  });

  const active = todos.filter(t => !t.completed).length;
  const doneToday = todos.filter(t => t.completed && t.completedAt?.startsWith(today)).length;

  const dateOptions = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: tomorrow },
    { label: 'No date', value: undefined },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '32px 24px 24px',
        background: '#0f0f0f',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: 6, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 6 }}>
            {format(new Date(), 'EEEE, MMMM d').toUpperCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', letterSpacing: -1, fontStyle: 'italic', margin: 0 }}>
              TASKS
            </h1>
            <span style={{ fontSize: 13, color: '#475569', fontFamily: "'Barlow', sans-serif" }}>
              {active} remaining{doneToday > 0 ? ` · ${doneToday} done today` : ''}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 24px 0' }}>
        {/* Quick add */}
        <div style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '4px 4px 4px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 24,
          transition: 'border-color 0.15s',
        }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
        >
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

          {/* Priority toggle */}
          <button
            onClick={() => setPriority(p => p === 'high' ? 'normal' : 'high')}
            title="Toggle high priority"
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: priority === 'high' ? 'rgba(249,115,22,0.15)' : 'transparent',
              color: priority === 'high' ? '#f97316' : '#475569',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={priority === 'high' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>

          {/* Date quick-pick */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDatePicker(v => !v)}
              style={{
                height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: dueDate ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: dueDate ? '#3b82f6' : '#475569',
                fontSize: 11, fontWeight: 600, letterSpacing: 1,
                padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.15s', flexShrink: 0,
                fontFamily: "'Barlow', sans-serif",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {dueDate ? (dueDate === today ? 'Today' : dueDate === tomorrow ? 'Tomorrow' : format(new Date(dueDate + 'T00:00:00'), 'MMM d')) : 'Date'}
            </button>
            {showDatePicker && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: 8, zIndex: 50, minWidth: 160,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {dateOptions.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => { setDueDate(opt.value); setShowDatePicker(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', borderRadius: 6, border: 'none',
                      background: dueDate === opt.value ? 'rgba(59,130,246,0.12)' : 'transparent',
                      color: dueDate === opt.value ? '#3b82f6' : '#94a3b8',
                      fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (dueDate !== opt.value) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (dueDate !== opt.value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {opt.label}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0', paddingTop: 4 }}>
                  <input
                    type="date"
                    value={dueDate || ''}
                    onChange={e => { setDueDate(e.target.value || undefined); setShowDatePicker(false); }}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      color: '#64748b', fontSize: 12, padding: '6px 12px',
                      cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {(['all', 'today', 'upcoming', 'done'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px', borderRadius: 6, border: 'none',
                background: filter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: filter === f ? '#f1f5f9' : '#475569',
                fontSize: 10, fontWeight: 700, letterSpacing: 3,
                cursor: 'pointer', fontFamily: "'Barlow', sans-serif",
                transition: 'all 0.15s',
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {filter === 'done' && todos.some(t => t.completed) && (
            <button
              onClick={async () => {
                const toDelete = todos.filter(t => t.completed);
                setTodos(prev => prev.filter(t => !t.completed));
                await Promise.all(toDelete.map(t => deleteTodo(t.id)));
              }}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.2)',
                background: 'transparent', color: '#f87171',
                fontSize: 10, fontWeight: 700, letterSpacing: 2,
                cursor: 'pointer', fontFamily: "'Barlow', sans-serif",
              }}
            >
              CLEAR DONE
            </button>
          )}
        </div>

        {/* Task list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 52, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#334155' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 13, letterSpacing: 3, fontFamily: "'Barlow', sans-serif" }}>
              {filter === 'done' ? 'NO COMPLETED TASKS' : 'ALL CLEAR'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
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

function TodoItem({
  todo,
  onToggle,
  onDelete,
  onTextChange,
}: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  onTextChange: (text: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const dateInfo = dueDateLabel(todo.dueDate);
  const overdue = todo.dueDate && todo.dueDate < today && !todo.completed;

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
        borderLeft: overdue ? '2px solid rgba(248,113,113,0.4)' : todo.priority === 'high' && !todo.completed ? '2px solid rgba(249,115,22,0.4)' : '2px solid transparent',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          border: todo.completed ? 'none' : `2px solid ${overdue ? '#f87171' : todo.priority === 'high' ? '#f97316' : 'rgba(255,255,255,0.2)'}`,
          background: todo.completed ? '#22c55e' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {todo.completed && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Text */}
      {editing ? (
        <input
          autoFocus
          value={editText}
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
          onDoubleClick={() => !todo.completed && setEditing(true)}
          style={{
            flex: 1, fontSize: 14, color: todo.completed ? '#334155' : '#cbd5e1',
            textDecoration: todo.completed ? 'line-through' : 'none',
            lineHeight: 1.4, cursor: 'text',
          }}
        >
          {todo.text}
        </span>
      )}

      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {todo.priority === 'high' && !todo.completed && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#f97316" stroke="#f97316" strokeWidth="1">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
        {dateInfo && (
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1,
            color: todo.completed ? '#334155' : dateInfo.color,
            fontFamily: "'Barlow', sans-serif",
          }}>
            {dateInfo.text}
          </span>
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
