export type TripType = 1 | 2;
export type TravelClass = 1 | 2 | 3 | 4;
export type StopsFilter = 0 | 1 | 2;
export type AlertDirection = 'below' | 'above';
export type TrackerStatus = 'active' | 'paused';
export type FetchStatus = 'success' | 'error' | 'offline' | 'no_results';
export type FetchFrequency = 'hourly' | '3h' | '6h' | '12h' | 'daily';
export type Theme = 'light' | 'dark' | 'system';
export type Screen = 'onboarding' | 'home' | 'detail' | 'settings';

export interface FlightParams {
  departure_id: string;
  departure_name?: string;
  arrival_id: string;
  arrival_name?: string;
  outbound_date: string;
  return_date?: string;
  type: TripType;
  adults: number;
  children: number;
  infants_in_seat: number;
  infants_on_lap: number;
  travel_class: TravelClass;
  stops: StopsFilter;
  hl: string;
}

/**
 * A tracker's recheck interval configuration.
 *
 * PRD v1.5 / Design Specs v1.3: Flightwatch has no backend server, so it
 * cannot guarantee fetches on a fixed background schedule. `frequency` is a
 * staleness threshold evaluated only when the user opens Home, opens this
 * tracker's Detail screen, or taps "Check now" — never on a timer while the
 * app is closed. The "Fetch time window" and "Active days" controls that
 * existed in earlier versions implied a level of background scheduling
 * precision Flightwatch cannot deliver and have been removed entirely.
 */
export interface Schedule {
  frequency: FetchFrequency;
}

export interface Tracker {
  id: string;
  name: string;
  params: FlightParams;
  targetPrice: number;
  alertDirection: AlertDirection;
  currency: string;
  /**
   * Recheck interval — PRD v1.7 §4.2.2. Staleness threshold only.
   * Checks only at the three app-open triggers.
   */
  schedule: Schedule;
  status: TrackerStatus;
  createdAt: string;
  updatedAt: string;
  lastFetchedAt?: string;
  lastKnownPrice?: number;
  /** Airline name for the most recently fetched lowest fare (PRD v1.7 §4.5.2). */
  lastKnownAirline?: string;
  /** Airline logo URL for the most recently fetched lowest fare (PRD v1.7 §4.5.2). */
  lastKnownAirlineLogo?: string;
}

/** Price insights returned by Google Flights API */
export interface PriceInsights {
  lowest_price: number;
  price_level: string; // 'low' | 'typical' | 'high'
  typical_price_range: [number, number];
  price_history: [number, number][]; // [unix_timestamp_seconds, price]
}

export interface PriceRecord {
  id: string;
  trackerId: string;
  fetchedAt: string;
  lowestPrice: number;
  currency: string;
  flights: SerpFlight[];
  status: FetchStatus;
  errorMessage?: string;
  priceInsights?: PriceInsights;
  /** Airline name for cheapest itinerary first segment (PRD v1.7 §4.10.1). */
  lowestPriceAirline?: string;
  /** Airline logo URL for cheapest itinerary first segment (PRD v1.7 §4.10.1). */
  lowestPriceAirlineLogo?: string;
  /** Flight number for cheapest itinerary first segment (PRD v1.7 §4.10.3). */
  lowestPriceFlightNumber?: string;
}

export interface SerpFlight {
  price: number;
  airline?: string;
  duration?: number;
  stops?: number;
}

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

export interface AirportSuggestion {
  id: string;
  name: string;
  city: string;
  country: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}
