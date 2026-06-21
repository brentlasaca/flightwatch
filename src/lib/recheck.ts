import type { FetchFrequency, Tracker } from '@/types';

/**
 * Recheck interval, in milliseconds, per PRD §4.2.3.
 * This is a staleness threshold only — Flightwatch has no backend server
 * and never fetches on a fixed background clock. It is evaluated
 * opportunistically at one of three triggers: Home open, Tracker Detail
 * open, or manual "Check now" (PRD §4.2.1).
 */
export const FREQUENCY_MS: Record<FetchFrequency, number> = {
  hourly: 60 * 60 * 1000,
  '3h':   3  * 60 * 60 * 1000,
  '6h':   6  * 60 * 60 * 1000,
  '12h':  12 * 60 * 60 * 1000,
  daily:  24 * 60 * 60 * 1000,
};

export const FREQUENCY_LABEL: Record<FetchFrequency, string> = {
  hourly: 'Every hour',
  '3h':   'Every 3 hours',
  '6h':   'Every 6 hours',
  '12h':  'Every 12 hours',
  daily:  'Once a day',
};

/**
 * Whether `tracker` is due for an opportunistic recheck: its recheck
 * interval has elapsed since the last successful fetch (or it has never
 * been fetched). This must only ever be called at one of the three actual
 * fetch triggers — it is never evaluated on a timer while the app is
 * closed, since Flightwatch cannot run code while fully closed.
 */
export function isTrackerStale(tracker: Tracker, now: number = Date.now()): boolean {
  if (!tracker.lastFetchedAt) return true;
  const intervalMs = FREQUENCY_MS[tracker.schedule.frequency] ?? FREQUENCY_MS['6h'];
  return now - new Date(tracker.lastFetchedAt).getTime() >= intervalMs;
}
