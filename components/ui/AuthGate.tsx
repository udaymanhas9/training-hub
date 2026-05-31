'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { isAdmin, isAdminPath } from '@/lib/admin';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const admin = isAdmin(user?.email);

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') {
      router.replace('/login');
      return;
    }
    if (user && pathname === '/login') {
      router.replace('/');
      return;
    }
    if (user && !admin && isAdminPath(pathname)) {
      router.replace('/');
    }
  }, [user, loading, admin, pathname, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: '#334155' }}>Loading...</div>
      </div>
    );
  }

  // Signed in but hit an admin-only route — show brief denial while redirect fires
  if (user && !admin && isAdminPath(pathname)) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Access restricted</div>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>
            This section is only available to the admin account.
          </div>
        </div>
      </div>
    );
  }

  // Not signed in and not on login page — render nothing while redirect fires
  if (!user && pathname !== '/login') return null;

  return <>{children}</>;
}
