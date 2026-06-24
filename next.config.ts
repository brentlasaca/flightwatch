import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  // Keep SW disabled in dev — avoids stale-cache surprises during development
  disable: process.env.NODE_ENV === 'development',
  // Merges worker/index.js (message + notificationclick handlers) into the
  // generated sw.js. There is no push handler here — Flightwatch has no
  // backend server and never receives server-initiated Web Push.
  customWorkerSrc: 'worker',
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      // ① Internal API proxy — network only, never cache
      {
        urlPattern: /^\/api\/.*/i,
        handler: 'NetworkOnly' as const,
      },
      // ② Anything cross-origin (fonts, analytics, etc.) — network only
      //    This also prevents Workbox from ever touching SerpAPI even if
      //    a caller accidentally hits it directly.
      {
        urlPattern: ({ sameOrigin }: { sameOrigin: boolean }) => !sameOrigin,
        handler: 'NetworkOnly' as const,
      },
      // ③ App shell — stale-while-revalidate so the app loads offline
      {
        urlPattern: /\.(?:js|css|html|json|svg|png|ico|woff2?)$/i,
        handler: 'StaleWhileRevalidate' as const,
        options: {
          cacheName: 'static-assets',
          expiration: {
            maxEntries: 128,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            // img-src includes https://www.gstatic.com for airline logo images
            // served by Google's CDN (PRD v1.7 §4.10.5 / §6.4).
            // All other origins are same-origin only.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev; tighten in prod if needed
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://www.gstatic.com",
              "connect-src 'self'",
              "font-src 'self'",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
