# Flightwatch ✈

A Progressive Web App (PWA) for tracking flight prices using the SerpAPI Google Flights API.  
Get notified when fares drop to your target price.

## Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later
- A **SerpAPI key** — get one at https://serpapi.com (free tier available)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Development server (service worker disabled in dev mode)
npm run dev

# 3. Production build + serve
npm run build
npm run start
```

Open http://localhost:3000, enter your SerpAPI key, and start tracking.

## Deployment

The app runs as a **Next.js server** (serverless-compatible). Deploy to:

| Platform | Command |
|----------|---------|
| **Vercel** | `vercel --prod` (zero config) |
| **Netlify** | Connect repo → build: `npm run build`, publish: `.next` |
| **Railway / Render / Fly.io** | Dockerfile or `npm run start` |

> **HTTPS required** for PWA installation and push notifications.  
> All major platforms provide this automatically.

## Why not static export?

SerpAPI does not send CORS headers, so browsers block direct `fetch()` calls to
`serpapi.com`. The `/api/flights` server-side proxy route resolves this — it
forwards requests to SerpAPI and streams the response back, keeping the API key
out of the browser network tab entirely. Static hosting (CDN-only) cannot serve
API routes, so `output: 'export'` was removed.

## Installing on Your Phone

### iOS (Safari 16.4+)
1. Open the deployed HTTPS URL in Safari
2. Tap Share (⬆) → **Add to Home Screen**
3. Push notifications only work in the installed (home screen) version

### Android (Chrome)
1. Open the deployed HTTPS URL in Chrome
2. Tap the install banner, or Menu → **Add to Home screen**

## Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (server / serverless) |
| Styling | Tailwind CSS v4 |
| Database | Dexie.js (IndexedDB) |
| Charts | Recharts 3 |
| Icons | Lucide React |
| PWA | @ducanh2912/next-pwa (Workbox) |
| API proxy | Next.js Route Handler (`/api/flights`) |

## Security notes

- The SerpAPI key is stored in `localStorage` (base64). It is sent to the
  Next.js proxy in the `x-serpapi-key` request header and is never exposed in
  the public URL.
- For production hardening, consider encrypting the stored key via the
  Web Crypto API (AES-GCM) before storing.
