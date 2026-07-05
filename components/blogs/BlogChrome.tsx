'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/admin';

const BC = "'Barlow Condensed', sans-serif";

export default function BlogChrome({ active, children }: {
  active: 'home' | 'archive';
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const admin = isAdmin(user?.email);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--blog-bg)' }}>
      {/* Title bar */}
      <div style={{ borderBottom: '1px solid var(--blog-line)', background: 'var(--blog-bg)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 24px 0', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>
            <h1 style={{
              margin: 0, fontSize: 34, fontWeight: 900, fontStyle: 'italic', letterSpacing: -0.5,
              color: 'var(--blog-ink)', fontFamily: BC,
            }}>BLOGS</h1>
            {admin && (
              <Link href="/blogs/new" style={{
                position: 'absolute', right: 24, top: 18, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                background: 'var(--blog-accent)', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 1.5, fontFamily: BC,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                NEW POST
              </Link>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 14 }}>
            <Tab href="/blogs" label="Home" active={active === 'home'} />
            <Tab href="/blogs/archive" label="Archive" active={active === 'archive'} />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{
      textDecoration: 'none', padding: '0 2px 12px', fontSize: 14, fontWeight: active ? 700 : 500,
      color: active ? 'var(--blog-ink)' : 'var(--blog-dim)',
      borderBottom: active ? '2px solid var(--blog-accent)' : '2px solid transparent',
      fontFamily: 'Georgia, serif',
    }}>{label}</Link>
  );
}
