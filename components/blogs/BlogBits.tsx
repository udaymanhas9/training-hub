'use client';

import { useState } from 'react';

const BC = "'Barlow Condensed', sans-serif";

export const BLOG_SETUP_SQL = `create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  subtitle text,
  cover_image text,
  body text not null default '',
  author text,
  date date not null default current_date,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

create policy "Users manage their own posts"
  on public.blog_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists blog_posts_user_date_idx
  on public.blog_posts (user_id, date desc);`;

export function BlogSetupBanner() {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--blog-ink)', fontStyle: 'italic', fontFamily: BC }}>ONE-TIME SETUP</h2>
      <p style={{ color: 'var(--blog-dim)', fontSize: 15, lineHeight: 1.6, marginTop: 12, fontFamily: 'Georgia, serif' }}>
        The blog needs a <code style={{ color: 'var(--blog-accent)' }}>blog_posts</code> table. Open Supabase → <b>SQL Editor</b>, paste this, run it, then reload.
      </p>
      <div style={{ position: 'relative', marginTop: 16 }}>
        <pre style={{ background: '#08080a', border: '1px solid var(--blog-line)', borderRadius: 10, padding: 16, overflowX: 'auto', fontSize: 12, color: '#cbd5e1', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>{BLOG_SETUP_SQL}</pre>
        <button onClick={() => { navigator.clipboard.writeText(BLOG_SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{
          position: 'absolute', top: 10, right: 10, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--blog-line)',
          background: '#1c1e22', color: copied ? '#4ade80' : '#cbd5e1', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: BC, letterSpacing: 1,
        }}>{copied ? 'COPIED' : 'COPY'}</button>
      </div>
      <button onClick={() => location.reload()} style={{
        marginTop: 20, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--blog-accent)', color: '#fff',
        fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', fontFamily: BC,
      }}>I&apos;VE RUN IT — RELOAD</button>
    </div>
  );
}

export function SubscribeBox() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 8, maxWidth: 420 }}>
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Type your email…"
        style={{
          flex: 1, background: 'var(--blog-panel)', border: '1px solid var(--blog-line)', borderRadius: 8,
          color: 'var(--blog-ink)', fontSize: 14, padding: '10px 12px', outline: 'none', fontFamily: 'Georgia, serif',
        }}
      />
      <button onClick={() => { if (email.trim()) { setSent(true); setEmail(''); } }} style={{
        padding: '0 18px', borderRadius: 8, border: 'none', background: 'var(--blog-accent)', color: '#fff',
        fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap',
      }}>{sent ? 'Subscribed ✓' : 'Subscribe'}</button>
    </div>
  );
}
