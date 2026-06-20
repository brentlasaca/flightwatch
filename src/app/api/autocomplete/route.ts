import { NextRequest, NextResponse } from 'next/server';

const SERP_BASE = 'https://serpapi.com/search';

export interface AirportSuggestion {
  id: string;      // IATA code  e.g. "CEB"
  name: string;    // Airport full name
  city: string;    // City where airport is located
  country: string; // Derived from parent suggestion description
}

// ─── SerpAPI response types ───────────────────────────────────────────────────

interface SerpAirport {
  id?: string;       // IATA code
  name?: string;
  city?: string;
  city_id?: string;
  distance?: string;
}

interface SerpSuggestion {
  position?: number;
  name?: string;        // City / region name  e.g. "Cebu City"
  type?: string;        // "city" | "region"
  description?: string; // e.g. "City in Cebu, Philippines"
  id?: string;          // kgmid e.g. "/m/..."
  airports?: SerpAirport[];
}

interface SerpResponse {
  suggestions?: SerpSuggestion[];
  error?: string;
  [key: string]: unknown;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract a human-readable location string from the suggestion description.
 * "City in Cebu, Philippines"  →  "Cebu, Philippines"
 * "Capital of Japan"           →  "Japan"
 * "City in New York State"     →  "New York State"
 */
function extractLocation(description: string): string {
  const inMatch  = description.match(/\bin\s+(.+)$/i);
  if (inMatch)  return inMatch[1].trim();
  const ofMatch  = description.match(/\bof\s+(.+)$/i);
  if (ofMatch)  return ofMatch[1].trim();
  return description.trim();
}

// ─── route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-serpapi-key');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const params = new URLSearchParams({
    engine:  'google_flights_autocomplete',
    api_key: apiKey,
    q,
  });

  let serpRes: Response;
  try {
    serpRes = await fetch(`${SERP_BASE}?${params.toString()}`, {
      headers: { 'User-Agent': 'Flightwatch/1.0' },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to reach SerpAPI' }, { status: 502 });
  }

  let raw: SerpResponse;
  try {
    raw = (await serpRes.json()) as SerpResponse;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from SerpAPI' }, { status: 502 });
  }

  if (raw.error) {
    return NextResponse.json({ error: raw.error }, { status: serpRes.status });
  }

  // The response shape is:
  //   suggestions[].airports[].{ id (IATA), name, city, ... }
  // Flatten all airports from every suggestion into a single list.
  const suggestions: AirportSuggestion[] = [];

  for (const suggestion of raw.suggestions ?? []) {
    const locationLabel = extractLocation(suggestion.description ?? suggestion.name ?? '');

    for (const airport of suggestion.airports ?? []) {
      const iata = airport.id?.trim().toUpperCase();
      if (!iata) continue;

      suggestions.push({
        id:      iata,
        name:    airport.name ?? iata,
        city:    airport.city ?? suggestion.name ?? '',
        country: locationLabel,
      });
    }
  }

  return NextResponse.json(
    { suggestions: suggestions.slice(0, 8) },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
