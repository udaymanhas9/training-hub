'use client';

import { usePathname } from 'next/navigation';

// The Lab is a deliberately dark terminal-style area: pin it to the dark tokens
// regardless of the user's theme.
export default function ThemeScope({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const forceDark = pathname === '/lab' || pathname.startsWith('/lab/');
  return (
    <div
      data-theme={forceDark ? 'dark' : undefined}
      style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: 'calc(100vh - 32px)' }}
    >
      {children}
    </div>
  );
}
