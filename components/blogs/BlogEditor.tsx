'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogPost } from '@/lib/types';
import { saveBlogPost, deleteBlogPost } from '@/lib/storage';

const SERIF = 'Georgia, serif';
const BC = "'Barlow Condensed', sans-serif";

export default function BlogEditor({ initial, mode }: { initial: BlogPost; mode: 'new' | 'edit' }) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost>(initial);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof BlogPost>(k: K, v: BlogPost[K]) => setPost(p => ({ ...p, [k]: v }));

  async function save() {
    if (!post.title.trim()) { alert('Give it a title first.'); return; }
    setSaving(true);
    await saveBlogPost({ ...post, title: post.title.trim() });
    router.push(`/blogs/${post.id}`);
  }
  async function del() {
    if (!confirm('Delete this post?')) return;
    await deleteBlogPost(post.id);
    router.push('/blogs');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--blog-bg)' }}>
      {/* Toolbar */}
      <div style={{
        position: 'sticky', top: 32, zIndex: 20, background: 'var(--blog-bg)', borderBottom: '1px solid var(--blog-line)',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.back()} style={ghost}>Cancel</button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', background: 'var(--blog-panel)', borderRadius: 8, padding: 3 }}>
            {(['write', 'preview'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: BC, fontSize: 11,
                fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
                background: tab === t ? 'var(--blog-accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--blog-dim)',
              }}>{t}</button>
            ))}
          </div>
          {mode === 'edit' && <button onClick={del} style={{ ...ghost, color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>Delete</button>}
          <button onClick={save} disabled={saving} style={{
            padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--blog-accent)', color: '#fff',
            fontSize: 12, fontWeight: 700, letterSpacing: 1.5, fontFamily: BC, cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}>{saving ? 'SAVING…' : 'PUBLISH'}</button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 90px' }}>
        {tab === 'write' ? (
          <>
            <Field label="COVER IMAGE URL">
              <input value={post.coverImage || ''} onChange={e => set('coverImage', e.target.value || undefined)} placeholder="https://…" style={input} />
            </Field>
            {post.coverImage && <img src={post.coverImage} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 8, margin: '2px 0 18px' }} />}

            <input value={post.title} onChange={e => set('title', e.target.value)} placeholder="Title"
              style={{ ...bare, fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: 'var(--blog-ink)', marginBottom: 10 }} />
            <input value={post.subtitle || ''} onChange={e => set('subtitle', e.target.value || undefined)} placeholder="Subtitle (optional)"
              style={{ ...bare, fontFamily: SERIF, fontSize: 19, color: 'var(--blog-dim)', marginBottom: 20 }} />

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <Field label="AUTHOR" grow>
                <input value={post.author || ''} onChange={e => set('author', e.target.value || undefined)} placeholder="Your name" style={input} />
              </Field>
              <Field label="DATE">
                <input type="date" value={post.date} onChange={e => set('date', e.target.value)} style={{ ...input, colorScheme: 'dark' }} />
              </Field>
            </div>

            <Field label="BODY — markdown supported (## heading, **bold**, > quote, - list, [link](url), ![img](url))">
              <textarea value={post.body} onChange={e => set('body', e.target.value)} placeholder="Write your post…" rows={20}
                style={{ ...input, fontFamily: SERIF, fontSize: 16, lineHeight: 1.7, resize: 'vertical' }} />
            </Field>
          </>
        ) : (
          <article>
            {post.coverImage && <img src={post.coverImage} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 24 }} />}
            <h1 style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 700, color: 'var(--blog-ink)', lineHeight: 1.15, margin: 0 }}>{post.title || 'Untitled'}</h1>
            {post.subtitle && <p style={{ fontFamily: SERIF, fontSize: 20, color: 'var(--blog-dim)', margin: '12px 0 0' }}>{post.subtitle}</p>}
            <div className="blog-prose" style={{ marginTop: 28 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body || '_Nothing to preview yet._'}</ReactMarkdown>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <div style={{ marginBottom: 16, flex: grow ? 1 : undefined, minWidth: grow ? 160 : undefined }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--blog-faint)', fontFamily: BC, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%', background: 'var(--blog-panel)', border: '1px solid var(--blog-line)', borderRadius: 8,
  color: 'var(--blog-ink)', fontSize: 14, padding: '10px 12px', outline: 'none', fontFamily: 'Georgia, serif',
};
const bare: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', outline: 'none' };
const ghost: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, border: '1px solid var(--blog-line)', background: 'transparent',
  color: 'var(--blog-dim)', fontSize: 12, fontWeight: 700, letterSpacing: 1, fontFamily: BC, cursor: 'pointer',
};
