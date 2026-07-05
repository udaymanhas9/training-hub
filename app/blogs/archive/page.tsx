'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBlogPosts } from '@/lib/storage';
import { BlogPost } from '@/lib/types';
import { excerpt, formatPostDate } from '@/lib/blog';
import BlogChrome from '@/components/blogs/BlogChrome';
import { BlogSetupBanner } from '@/components/blogs/BlogBits';

const SERIF = 'Georgia, serif';
const BC = "'Barlow Condensed', sans-serif";

export default function BlogArchive() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogPosts()
      .then(({ posts, needsSetup }) => { setPosts(posts); setNeedsSetup(needsSetup); })
      .catch(err => console.error('blog load failed', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <BlogChrome active="archive">
      {loading ? (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--blog-faint)' }}>Loading…</div>
      ) : needsSetup ? (
        <BlogSetupBanner />
      ) : (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 80px' }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: 'var(--blog-faint)', fontFamily: BC, fontWeight: 700, marginBottom: 8 }}>
            {posts.length} POST{posts.length === 1 ? '' : 'S'}
          </div>
          {posts.length === 0 && <div style={{ color: 'var(--blog-dim)', fontFamily: SERIF, padding: '40px 0' }}>Nothing archived yet.</div>}
          {posts.map(p => (
            <Link key={p.id} href={`/blogs/${p.id}`} style={{
              textDecoration: 'none', display: 'block', padding: '18px 0', borderTop: '1px solid var(--blog-line)',
            }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--blog-faint)', fontFamily: BC, fontWeight: 600, marginBottom: 4 }}>
                {formatPostDate(p.date).toUpperCase()}
              </div>
              <h3 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: 'var(--blog-ink)', lineHeight: 1.25, margin: '0 0 4px' }}>
                {p.title || 'Untitled'}
              </h3>
              <p style={{ fontFamily: SERIF, fontSize: 14, color: 'var(--blog-dim)', lineHeight: 1.45, margin: 0 }}>
                {excerpt(p, 150)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </BlogChrome>
  );
}
