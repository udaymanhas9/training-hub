'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBlogPosts } from '@/lib/storage';
import { BlogPost } from '@/lib/types';
import { excerpt, relativeDate } from '@/lib/blog';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/admin';
import BlogChrome from '@/components/blogs/BlogChrome';
import { BlogSetupBanner } from '@/components/blogs/BlogBits';

const SERIF = 'Georgia, serif';
const BC = "'Barlow Condensed', sans-serif";

export default function BlogHome() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const admin = isAdmin(user?.email);

  useEffect(() => {
    getBlogPosts()
      .then(({ posts, needsSetup }) => { setPosts(posts); setNeedsSetup(needsSetup); })
      .catch(err => console.error('blog load failed', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <BlogChrome active="home"><div style={{ padding: 80, textAlign: 'center', color: 'var(--blog-faint)' }}>Loading…</div></BlogChrome>;
  }
  if (needsSetup) {
    return <BlogChrome active="home"><BlogSetupBanner /></BlogChrome>;
  }
  if (posts.length === 0) {
    return (
      <BlogChrome active="home">
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✍️</div>
          <div style={{ color: 'var(--blog-dim)', fontFamily: SERIF, fontSize: 18 }}>No posts yet.</div>
          {admin && (
            <Link href="/blogs/new" style={{
              display: 'inline-block', marginTop: 20, padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
              background: 'var(--blog-accent)', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 2, fontFamily: BC,
            }}>WRITE YOUR FIRST POST</Link>
          )}
        </div>
      </BlogChrome>
    );
  }

  const [featured, ...rest] = posts;

  return (
    <BlogChrome active="home">
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 24px 80px' }}>
        <div className="blog-home-grid">
          {/* Featured */}
          <Link href={`/blogs/${featured.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            {featured.coverImage
              ? <img src={featured.coverImage} alt="" style={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'cover', borderRadius: 6, display: 'block' }} />
              : <div style={{ width: '100%', aspectRatio: '3 / 2', borderRadius: 6, background: 'linear-gradient(135deg,#1a1a1d,#0f0f11)' }} />}
            <h2 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: 'var(--blog-ink)', lineHeight: 1.2, margin: '18px 0 10px' }}>
              {featured.title || 'Untitled'}
            </h2>
            <p style={{ fontFamily: SERIF, fontSize: 16, color: 'var(--blog-dim)', lineHeight: 1.55, margin: 0 }}>
              {excerpt(featured, 180)}
            </p>
            <Meta post={featured} />
          </Link>

          {/* List */}
          <div className="blog-home-aside">
            {rest.map((p, i) => (
              <Link key={p.id} href={`/blogs/${p.id}`} style={{
                textDecoration: 'none', display: 'flex', gap: 16, alignItems: 'flex-start',
                padding: '18px 0', borderTop: i === 0 ? 'none' : '1px solid var(--blog-line)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: 'var(--blog-ink)', lineHeight: 1.25, margin: '0 0 5px' }}>
                    {p.title || 'Untitled'}
                  </h3>
                  <p style={{ fontFamily: SERIF, fontSize: 14, color: 'var(--blog-dim)', lineHeight: 1.45, margin: 0,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {excerpt(p, 120)}
                  </p>
                  <Meta post={p} small />
                </div>
                {p.coverImage && (
                  <img src={p.coverImage} alt="" style={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </BlogChrome>
  );
}

function Meta({ post, small }: { post: BlogPost; small?: boolean }) {
  return (
    <div style={{
      marginTop: small ? 8 : 14, fontSize: small ? 10 : 11, letterSpacing: 1, color: 'var(--blog-faint)',
      fontFamily: BC, fontWeight: 600,
    }}>
      {relativeDate(post.date)}{post.author ? ` · ${post.author.toUpperCase()}` : ''}
    </div>
  );
}
