'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getBlogPost, deleteBlogPost } from '@/lib/storage';
import { BlogPost } from '@/lib/types';
import { formatPostDate } from '@/lib/blog';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/admin';
import BlogChrome from '@/components/blogs/BlogChrome';
import { SubscribeBox } from '@/components/blogs/BlogBits';

const SERIF = 'Georgia, serif';
const BC = "'Barlow Condensed', sans-serif";

export default function BlogReader() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const admin = isAdmin(user?.email);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    getBlogPost(id).then(p => { setPost(p); setLoading(false); });
  }, [id]);

  if (loading) {
    return <BlogChrome active="home"><div style={{ padding: 80, textAlign: 'center', color: 'var(--blog-faint)' }}>Loading…</div></BlogChrome>;
  }
  if (!post) {
    return (
      <BlogChrome active="home">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '80px 24px', textAlign: 'center', color: 'var(--blog-dim)', fontFamily: SERIF }}>
          Post not found. <Link href="/blogs" style={{ color: 'var(--blog-accent)' }}>Back home</Link>
        </div>
      </BlogChrome>
    );
  }

  async function del() {
    if (!post || !confirm('Delete this post?')) return;
    await deleteBlogPost(post.id);
    router.push('/blogs');
  }

  return (
    <BlogChrome active="home">
      <article style={{ maxWidth: 680, margin: '0 auto', padding: '44px 24px 90px' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 700, color: 'var(--blog-ink)', lineHeight: 1.15, margin: 0 }}>
          {post.title || 'Untitled'}
        </h1>
        {post.subtitle && (
          <p style={{ fontFamily: SERIF, fontSize: 20, color: 'var(--blog-dim)', lineHeight: 1.4, margin: '12px 0 0' }}>{post.subtitle}</p>
        )}

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '26px 0' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'var(--blog-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontFamily: SERIF, fontSize: 16,
          }}>{(post.author || 'A').charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, letterSpacing: 1, color: 'var(--blog-ink)', fontFamily: BC, fontWeight: 700 }}>
              {(post.author || 'Anonymous').toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--blog-faint)', fontFamily: BC, letterSpacing: 0.5 }}>
              {formatPostDate(post.date)}
            </div>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(location.href); setShared(true); setTimeout(() => setShared(false), 1500); }} style={pill}>
            {shared ? 'Copied' : 'Share'}
          </button>
          {admin && <>
            <Link href={`/blogs/${post.id}/edit`} style={{ ...pill, textDecoration: 'none' }}>Edit</Link>
            <button onClick={del} style={{ ...pill, color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>Delete</button>
          </>}
        </div>

        {post.coverImage && (
          <img src={post.coverImage} alt="" style={{ width: '100%', borderRadius: 8, margin: '0 0 30px', display: 'block' }} />
        )}

        <div className="blog-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
        </div>

        {/* Subscribe */}
        <div style={{ margin: '48px 0 0', padding: '28px 0', borderTop: '1px solid var(--blog-line)', borderBottom: '1px solid var(--blog-line)' }}>
          <div style={{ fontFamily: SERIF, fontSize: 17, color: 'var(--blog-ink)', marginBottom: 12 }}>
            Enjoyed this? Subscribe for more.
          </div>
          <SubscribeBox />
        </div>
      </article>
    </BlogChrome>
  );
}

const pill: React.CSSProperties = {
  height: 30, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: 13,
  border: '1px solid var(--blog-line)', background: 'transparent', color: 'var(--blog-dim)',
  display: 'flex', alignItems: 'center',
};
