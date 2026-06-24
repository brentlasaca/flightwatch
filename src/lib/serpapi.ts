import type { FlightParams, SerpFlight, PriceRecord, PriceInsights } from '@/types';
import { getApiKey } from './crypto';
import { v4 as uuidv4 } from 'uuid';

const PROXY = '/api/flights';

interface SerpAPIFlightSegment {
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
  duration?: number;
}

interface SerpAPIFlightResult {
  price?: number;
  total_duration?: number;
  flights?: SerpAPIFlightSegment[];
  layovers?: unknown[];
}

interface SerpAPIPriceInsights {
  lowest_price?: number;
  price_level?: string;
  typical_price_range?: [number, number];
  price_history?: [number, number][];
}

interface SerpAPIResponse {
  best_flights?: SerpAPIFlightResult[];
  other_flights?: SerpAPIFlightResult[];
  price_insights?: SerpAPIPriceInsights;
  error?: string;
}

function buildProxyUrl(params: FlightParams, currency: string): string {
  const p = new URLSearchParams({
    departure_id:  params.departure_id,
    arrival_id:    params.arrival_id,
    outbound_date: params.outbound_date,
    type:          String(params.type),
    adults:        String(params.adults),
    travel_class:  String(params.travel_class),
    stops:         String(params.stops),
    currency,
    hl:            params.hl || 'en',
  });
  if (params.return_date && params.type === 1) p.set('return_date', params.return_date);
  if (params.children      > 0) p.set('children',       String(params.children));
  if (params.infants_in_seat > 0) p.set('infants_in_seat', String(params.infants_in_seat));
  if (params.infants_on_lap  > 0) p.set('infants_on_lap',  String(params.infants_on_lap));
  return `${PROXY}?${p.toString()}`;
}

function nextWeekDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

function authHeaders(apiKey: string): HeadersInit {
  return { 'x-serpapi-key': apiKey };
}

function parsePriceInsights(raw?: SerpAPIPriceInsights): PriceInsights | undefined {
  if (!raw || raw.lowest_price === undefined) return undefined;
  return {
    lowest_price: raw.lowest_price ?? 0,
    price_level: raw.price_level ?? '',
    typical_price_range: raw.typical_price_range ?? [0, 0],
    price_history: raw.price_history ?? [],
  };
}

export async function validateApiKey(
  key: string
): Promise<{ valid: boolean; quotaExhausted?: boolean; error?: string }> {
  const url = `${PROXY}?departure_id=JFK&arrival_id=LAX&outbound_date=${nextWeekDate()}&type=2&adults=1`;
  try {
    const res  = await fetch(url, { headers: authHeaders(key) });
    const data = await res.json() as SerpAPIResponse;
    if (data.error?.toLowerCase().includes('quota')) {
      return { valid: false, quotaExhausted: true };
    }
    if (
      data.error?.toLowerCase().includes('invalid api key') ||
      data.error?.toLowerCase().includes('api key') ||
      res.status === 401 || res.status === 403
    ) {
      return { valid: false, error: data.error ?? 'Invalid API key' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function fetchFlightPrice(
  trackerId: string,
  params: FlightParams,
  currency: string
): Promise<Omit<PriceRecord, 'id'>> {
  const base = { trackerId, fetchedAt: new Date().toISOString(), currency };

  if (!navigator.onLine) {
    return { ...base, lowestPrice: 0, flights: [], status: 'offline' };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return { ...base, lowestPrice: 0, flights: [], status: 'error', errorMessage: 'No API key configured' };
  }

  try {
    const url  = buildProxyUrl(params, currency);
    const res  = await fetch(url, { headers: authHeaders(apiKey) });
    const data = await res.json() as SerpAPIResponse;

    if (data.error) {
      if (data.error.toLowerCase().includes('quota')) {
        return { ...base, lowestPrice: 0, flights: [], status: 'error', errorMessage: 'quota_exhausted' };
      }
      return { ...base, lowestPrice: 0, flights: [], status: 'error', errorMessage: data.error };
    }

    const all: SerpAPIFlightResult[] = [
      ...(data.best_flights  ?? []),
      ...(data.other_flights ?? []),
    ];
    if (all.length === 0) {
      return { ...base, lowestPrice: 0, flights: [], status: 'no_results' };
    }

    const withPrice = all.filter(f => typeof f.price === 'number' && (f.price ?? 0) > 0);
    if (withPrice.length === 0) {
      return { ...base, lowestPrice: 0, flights: [], status: 'no_results' };
    }

    const sorted      = [...withPrice].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    const lowestItinerary = sorted[0];
    const lowestPrice = lowestItinerary.price ?? 0;

    // Airline attribution: extract from first segment of the cheapest itinerary.
    // PRD v1.7 §4.10.1 — use flights[0] of the cheapest entry in best_flights
    // (falling back to other_flights). Absent fields default to undefined so
    // callers can distinguish "not available" from an empty string.
    const firstSeg = lowestItinerary.flights?.[0];
    const lowestPriceAirline      = firstSeg?.airline      || undefined;
    const lowestPriceAirlineLogo  = firstSeg?.airline_logo || undefined;
    const lowestPriceFlightNumber = firstSeg?.flight_number || undefined;

    const flights: SerpFlight[] = sorted.slice(0, 5).map(f => ({
      price:    f.price ?? 0,
      airline:  f.flights?.[0]?.airline,
      duration: f.total_duration,
      stops:    Array.isArray(f.layovers) ? f.layovers.length : 0,
    }));

    const priceInsights = parsePriceInsights(data.price_insights);

    return {
      ...base, lowestPrice, flights, status: 'success', priceInsights,
      lowestPriceAirline, lowestPriceAirlineLogo, lowestPriceFlightNumber,
    };
  } catch (e) {
    return {
      ...base, lowestPrice: 0, flights: [], status: 'error',
      errorMessage: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

export function estimateDailyApiCalls(frequency: string): number {
  const map: Record<string, number> = { hourly: 24, '3h': 8, '6h': 4, '12h': 2, daily: 1 };
  return map[frequency] ?? 4;
}
