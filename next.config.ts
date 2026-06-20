import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  // Keep SW disabled in dev — avoids stale-cache surprises during development
  disable: process.env.NODE_ENV === 'development',
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
  // Static export removed — Next.js API routes require a server.
  // Deploy with `npm run start` locally, or to Vercel / Netlify / any
  // Node-capable platform. The app is still a fully-installable PWA.
  images: { unoptimized: true },
};

export default withPWA(nextConfig);
