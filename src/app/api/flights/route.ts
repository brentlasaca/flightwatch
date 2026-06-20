import { NextRequest, NextResponse } from 'next/server';

const SERP_BASE = 'https://serpapi.com/search';

// Allowlist of params forwarded to SerpAPI
const ALLOWED_PARAMS = [
  'departure_id', 'arrival_id', 'outbound_date', 'return_date',
  'type', 'adults', 'children', 'infants_in_seat', 'infants_on_lap',
  'travel_class', 'stops', 'currency', 'hl',
] as const;

export async function GET(request: NextRequest) {
  // API key is passed in a custom header — never exposed in the browser URL bar
  const apiKey = request.headers.get('x-serpapi-key');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const serpParams = new URLSearchParams();
  serpParams.set('engine', 'google_flights');
  serpParams.set('api_key', apiKey);
  serpParams.set('output', 'json');

  for (const key of ALLOWED_PARAMS) {
    const val = searchParams.get(key);
    if (val !== null) serpParams.set(key, val);
  }

  let serpRes: Response;
  try {
    serpRes = await fetch(`${SERP_BASE}?${serpParams.toString()}`, {
      headers: { 'User-Agent': 'Flightwatch/1.0' },
      // No cache on the server — we manage freshness ourselves
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to reach SerpAPI' }, { status: 502 });
  }

  const data: unknown = await serpRes.json().catch(() => ({ error: 'Invalid JSON from SerpAPI' }));

  return NextResponse.json(data, {
    status: serpRes.status,
    headers: {
      // Never cache API responses in the browser or CDN
      'Cache-Control': 'no-store',
    },
  });
}
