'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// ── Training nav ──────────────────────────────────────────────────────────────

const TRAINING_NAV = [
  { href: '/', label: 'HOME', icon: HomeIcon },
  { href: '/runs', label: 'RUNS', icon: RunIcon },
  { href: '/calendar', label: 'CALENDAR', icon: CalendarIcon },
  { href: '/progress', label: 'PROGRESS', icon: ProgressIcon },
  { href: '/stats', label: 'STATS', icon: StatsIcon },
  { href: '/review', label: 'REVIEW', icon: ReviewIcon },
];

// ── Lab nav ───────────────────────────────────────────────────────────────────

const LAB_NAV = [
  { href: '/lab', label: 'OVERVIEW', icon: GridIcon },
  { href: '/lab/leetcode', label: 'LEETCODE', icon: CodeIcon },
  { href: '/lab/quant', label: 'QUANT', icon: ChartIcon },
  { href: '/lab/github', label: 'GITHUB', icon: GitIcon },
];

// ── Training icons ────────────────────────────────────────────────────────────

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

function RunIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="1.5" />
      <path d="M7 20l2-6 3 2 4-5" />
      <path d="M11 20h4" />
      <path d="M15.5 8.5L14 13l-3-2-2 4" />
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

function ReviewIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'currentColor' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

// ── Lab icons ─────────────────────────────────────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  const c = active ? '#FF2A2A' : '#4a4a4a';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function CodeIcon({ active }: { active: boolean }) {
  const c = active ? '#FF2A2A' : '#4a4a4a';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  const c = active ? '#FF2A2A' : '#4a4a4a';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <path d="M3 20h18" />
    </svg>
  );
}

function GitIcon({ active }: { active: boolean }) {
  const c = active ? '#FF2A2A' : '#4a4a4a';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 0 0 9 9" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const isLabMode = pathname.startsWith('/lab');
  const navItems = isLabMode ? LAB_NAV : TRAINING_NAV;

  function isActive(href: string) {
    if (href === '/' || href === '/lab') return pathname === href;
    return pathname.startsWith(href);
  }

  // ── Mode pill bar (fixed top, both mobile + desktop) ──────────────────────
  const ModePill = (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 32, background: isLabMode ? '#000000' : '#0d0d0d',
        borderBottom: isLabMode ? '1px solid rgba(255,42,42,0.2)' : '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}
    >
      {/* Training HUB option */}
      <button
        onClick={() => router.push('/')}
        style={{
          padding: '0 14px', height: 22, borderRadius: 3,
          border: !isLabMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
          background: !isLabMode ? 'rgba(255,255,255,0.08)' : 'transparent',
          color: !isLabMode ? '#f1f5f9' : '#4a4a4a',
          fontSize: 9, fontWeight: 700, letterSpacing: 3,
          cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
          transition: 'all 0.15s',
        }}
      >
        TRAINING HUB
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />

      {/* THE LAB option */}
      <button
        onClick={() => router.push('/lab')}
        style={{
          padding: '0 14px', height: 22, borderRadius: 3,
          border: isLabMode ? '1px solid rgba(255,42,42,0.5)' : '1px solid transparent',
          background: isLabMode ? 'rgba(255,42,42,0.15)' : 'transparent',
          color: isLabMode ? '#FF2A2A' : '#4a4a4a',
          fontSize: 9, fontWeight: 700, letterSpacing: 3,
          cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
          transition: 'all 0.15s',
        }}
      >
        THE LAB
      </button>
    </div>
  );

  // ── Lab sidebar sign out button ────────────────────────────────────────────
  const labSignOut = (
    <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,42,42,0.15)' }}>
      <button
        onClick={signOut}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 8px', borderRadius: 4, background: 'none',
          border: 'none', color: '#4a4a4a', cursor: 'pointer', width: '100%',
          whiteSpace: 'nowrap', overflow: 'hidden',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          fontWeight: 700, letterSpacing: 2, transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#FF2A2A')}
        onMouseLeave={e => (e.currentTarget.style.color = '#4a4a4a')}
      >
        <div style={{ flexShrink: 0, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <span>SIGN OUT</span>
      </button>
    </div>
  );

  // ── Training sidebar sign out button ──────────────────────────────────────
  const trainingSignOut = (
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
  );

  return (
    <>
      {ModePill}

      {/* ── Mobile bottom tab bar ──────────────────────────────────────────── */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: isLabMode ? '#000000' : '#0d0d0d',
          borderTop: isLabMode ? '1px solid rgba(255,42,42,0.2)' : '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '10px 4px', textDecoration: 'none',
                color: isLabMode
                  ? (active ? '#FF2A2A' : '#4a4a4a')
                  : (active ? '#f1f5f9' : '#475569'),
                position: 'relative', gap: 4,
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 32, height: 2,
                  background: isLabMode ? '#FF2A2A' : '#3b82f6',
                  borderRadius: '0 0 2px 2px',
                }} />
              )}
              <Icon active={active} />
              <span style={{
                fontSize: 8, letterSpacing: 2,
                fontWeight: active ? 700 : 500,
                fontFamily: isLabMode ? "'JetBrains Mono', monospace" : "'Barlow Condensed', sans-serif",
              }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Desktop left sidebar ──────────────────────────────────────────── */}
      <nav
        className="hidden md:flex"
        style={{
          flexDirection: 'column',
          width: 64,
          background: isLabMode ? '#000000' : '#0d0d0d',
          borderRight: isLabMode ? '1px solid rgba(255,42,42,0.15)' : '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
          position: 'sticky',
          top: 32, // account for mode pill
          height: 'calc(100vh - 32px)',
          overflowX: 'hidden',
          overflowY: 'auto',
          transition: 'width 0.2s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.width = '180px'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.width = '64px'; }}
      >
        {/* Logo */}
        <div style={{
          padding: '20px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: isLabMode ? '1px solid rgba(255,42,42,0.15)' : '1px solid rgba(255,255,255,0.07)',
          height: 64, overflow: 'hidden',
        }}>
          {isLabMode ? (
            <span style={{
              fontSize: 14, fontWeight: 700, color: '#FF2A2A',
              whiteSpace: 'nowrap', letterSpacing: 2,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              LAB
            </span>
          ) : (
            <img
              src="/logo.png"
              alt="logo"
              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }}
            />
          )}
        </div>

        {/* Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 8px', flex: 1 }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 8px',
                  borderRadius: isLabMode ? 2 : 8,
                  textDecoration: 'none',
                  background: active
                    ? (isLabMode ? 'rgba(255,42,42,0.1)' : 'rgba(59,130,246,0.12)')
                    : 'transparent',
                  color: active
                    ? (isLabMode ? '#FF2A2A' : '#f1f5f9')
                    : (isLabMode ? '#4a4a4a' : '#475569'),
                  transition: 'background 0.15s, color 0.15s',
                  borderLeft: active
                    ? (isLabMode ? '2px solid #FF2A2A' : '2px solid #3b82f6')
                    : '2px solid transparent',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = isLabMode
                      ? 'rgba(255,42,42,0.06)'
                      : 'rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div style={{ flexShrink: 0, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon active={active} />
                </div>
                <span style={{
                  fontSize: isLabMode ? 10 : 12,
                  fontWeight: 700,
                  letterSpacing: isLabMode ? 3 : 2,
                  overflow: 'hidden', opacity: 1,
                  fontFamily: isLabMode ? "'JetBrains Mono', monospace" : undefined,
                }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        {isLabMode ? labSignOut : trainingSignOut}
      </nav>
    </>
  );
}
