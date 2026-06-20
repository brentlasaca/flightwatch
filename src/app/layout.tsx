import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flightwatch',
  description: 'Track flight prices and get notified when fares drop to your target.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Flightwatch',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F172A',
};

/* iOS apple-touch-startup-image splash screens — static images required
 * because the in-app animated splash (SplashScreen.tsx) only renders after
 * JS hydrates. The system splash bridges the gap until then. See PRD §4.9.2
 * and Design Specs §4.0.
 */
const iosSplashScreens: Array<{ media: string; href: string }> = [
  { media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',  href: '/splash/splash-iphone-se.png' },
  { media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',  href: '/splash/splash-iphone-8.png' },
  { media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',  href: '/splash/splash-iphone-x.png' },
  { media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',  href: '/splash/splash-iphone-12.png' },
  { media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',  href: '/splash/splash-iphone-14-pro-max.png' },
  { media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)', href: '/splash/splash-ipad-portrait.png' },
  { media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',href: '/splash/splash-ipad-pro-12.png' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        {iosSplashScreens.map(s => (
          <link key={s.href} rel="apple-touch-startup-image" href={s.href} media={s.media} />
        ))}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fw_theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t!=='light'&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
