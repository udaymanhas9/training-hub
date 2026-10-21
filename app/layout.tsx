import type { Metadata } from 'next';
import '@/styles/theme.css';
import './globals.css';
import NavBar from '@/components/ui/NavBar';
import { AuthProvider } from '@/lib/auth-context';
import AuthGate from '@/components/ui/AuthGate';
import { THEME_STORAGE_KEY, THEME_META_COLOR } from '@/lib/theme';
import ThemeScope from '@/components/ui/ThemeScope';
import ServiceWorker from '@/components/ui/ServiceWorker';

// Runs before first paint so there is no theme flash.
const THEME_INIT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='light'?'${THEME_META_COLOR.light}':'${THEME_META_COLOR.dark}')}}catch(e){}`;

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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={THEME_META_COLOR.dark} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Barlow Condensed', Impact, sans-serif", minHeight: '100vh', paddingTop: 32 }}>
        <ServiceWorker />
        <AuthProvider>
          <AuthGate>
            <ThemeScope>
              <div style={{ display: 'flex', minHeight: 'calc(100vh - 32px)' }}>
                <NavBar />
                <main style={{ flex: 1, minWidth: 0, paddingBottom: '80px' }} className="md:pb-0">
                  {children}
                </main>
              </div>
            </ThemeScope>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
