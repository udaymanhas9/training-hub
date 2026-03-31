import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/ui/NavBar';
import { AuthProvider } from '@/lib/auth-context';
import AuthGate from '@/components/ui/AuthGate';

export const metadata: Metadata = {
  title: 'TRAINING HUB',
  description: 'Your personal workout tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0a0a0a', color: '#f1f5f9', fontFamily: "'Barlow Condensed', Impact, sans-serif", minHeight: '100vh', paddingTop: 32 }}>
        <AuthProvider>
          <AuthGate>
            <div style={{ display: 'flex', minHeight: 'calc(100vh - 32px)' }}>
              <NavBar />
              <main style={{ flex: 1, paddingBottom: '80px' }} className="md:pb-0">
                {children}
              </main>
            </div>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
