'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { href: '/', label: 'HOME', icon: HomeIcon },
  { href: '/calendar', label: 'CALENDAR', icon: CalendarIcon },
  { href: '/progress', label: 'PROGRESS', icon: ProgressIcon },
  { href: '/stats', label: 'STATS', icon: StatsIcon },
];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function StatsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '10px 4px', textDecoration: 'none',
                color: active ? '#f1f5f9' : '#475569', position: 'relative', gap: 4,
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 32, height: 2, background: '#3b82f6', borderRadius: '0 0 2px 2px',
                }} />
              )}
              <Icon active={active} />
              <span style={{ fontSize: 8, letterSpacing: 2, fontWeight: active ? 700 : 500, fontFamily: "'Barlow Condensed', sans-serif" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop left sidebar */}
      <nav
        className="hidden md:flex"
        style={{
          flexDirection: 'column',
          width: 64,
          background: '#0d0d0d',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowX: 'hidden',
          overflowY: 'auto',
          transition: 'width 0.2s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.width = '180px'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.width = '64px'; }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', height: 64, overflow: 'hidden' }}>
          <span style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: '#f1f5f9', whiteSpace: 'nowrap', letterSpacing: -0.5 }}>T</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 8px', flex: 1 }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 8px', borderRadius: 8, textDecoration: 'none',
                  background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: active ? '#f1f5f9' : '#475569',
                  transition: 'background 0.15s, color 0.15s',
                  borderLeft: active ? '2px solid #3b82f6' : '2px solid transparent',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ flexShrink: 0, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon active={active} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, overflow: 'hidden', opacity: 1 }}>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Sign out */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={signOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 8px', borderRadius: 8, background: 'none',
              border: 'none', color: '#475569', cursor: 'pointer', width: '100%',
              whiteSpace: 'nowrap', overflow: 'hidden',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
              fontWeight: 700, letterSpacing: 2, transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >
            <div style={{ flexShrink: 0, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <span>SIGN OUT</span>
          </button>
        </div>
      </nav>
    </>
  );
}
