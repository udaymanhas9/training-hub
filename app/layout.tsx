import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/ui/NavBar';
import { AuthProvider } from '@/lib/auth-context';
import AuthGate from '@/components/ui/AuthGate';
import ServiceWorker from '@/components/ui/ServiceWorker';

export const metadata: Metadata = {
  title: 'Training Hub',
  description: 'Your personal workout tracker',
  manifest: '/manifest.json',
  icons: {
    icon: '/IconKitchen-Output/web/favicon.ico',
    apple: '/IconKitchen-Output/web/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Training Hub',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body style={{ background: '#0a0a0a', color: '#f1f5f9', fontFamily: "'Barlow Condensed', Impact, sans-serif", minHeight: '100vh', paddingTop: 32 }}>
        <ServiceWorker />
        <AuthProvider>
          <AuthGate>
            <div style={{ display: 'flex', minHeight: 'calc(100vh - 32px)' }}>
              <NavBar />
              <main style={{ flex: 1, minWidth: 0, paddingBottom: '80px' }} className="md:pb-0">
                {children}
              </main>
            </div>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
