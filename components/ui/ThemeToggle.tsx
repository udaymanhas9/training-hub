'use client';

import { useEffect, useState } from 'react';
import { applyTheme, THEMES, type ThemeName } from '@/lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>('dark');

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === 'light' || t === 'dark') setTheme(t);
  }, []);

  const next = () => {
    const n = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    applyTheme(n);
    setTheme(n);
  };

  return (
    <button
      onClick={next}
      title={`Theme: ${theme} (click to switch)`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 8px', borderRadius: 8, background: 'none',
        border: 'none', color: 'var(--text-faint)', cursor: 'pointer', width: '100%',
        whiteSpace: 'nowrap', overflow: 'hidden',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12,
        fontWeight: 700, letterSpacing: 2, transition: 'color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
    >
      <div style={{ flexShrink: 0, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {theme === 'dark'
            ? <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
        </svg>
      </div>
      <span>{theme === 'dark' ? 'DARK' : 'LIGHT'}</span>
    </button>
  );
}
