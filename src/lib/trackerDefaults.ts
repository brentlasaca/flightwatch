/**
 * Tracker Creation Defaults — PRD v1.8 §4.11
 *
 * Eight user-configurable defaults stored as individual keys in localStorage.
 * These pre-populate the Create Tracker form for new trackers.
 * Editing an existing tracker never consults these defaults.
 */

import type { TripType, TravelClass, StopsFilter, AlertDirection, FetchFrequency } from '@/types';

export interface TrackerDefaults {
  defaultCurrency: string;
  defaultLanguage: string;
  defaultTravelClass: TravelClass;
  defaultAdults: number;
  defaultTripType: TripType;
  defaultStops: StopsFilter;
  defaultRecheckInterval: FetchFrequency;
  defaultAlertDirection: AlertDirection;
}

export const SYSTEM_DEFAULTS: TrackerDefaults = {
  defaultCurrency: 'USD',
  defaultLanguage: 'en',
  defaultTravelClass: 1,
  defaultAdults: 1,
  defaultTripType: 1,
  defaultStops: 0,
  defaultRecheckInterval: '6h',
  defaultAlertDirection: 'below',
};

const NUMERIC_KEYS = new Set<keyof TrackerDefaults>([
  'defaultTravelClass',
  'defaultAdults',
  'defaultTripType',
  'defaultStops',
]);

const ALL_KEYS = Object.keys(SYSTEM_DEFAULTS) as (keyof TrackerDefaults)[];

/**
 * Read all eight defaults from localStorage, falling back to system defaults.
 */
export function getTrackerDefaults(): TrackerDefaults {
  if (typeof window === 'undefined') return { ...SYSTEM_DEFAULTS };
  const result = { ...SYSTEM_DEFAULTS } as Record<string, unknown>;
  for (const key of ALL_KEYS) {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      result[key] = NUMERIC_KEYS.has(key) ? Number(stored) : stored;
    }
  }
  return result as unknown as TrackerDefaults;
}

/**
 * Persist a single default to localStorage.
 */
export function setTrackerDefault<K extends keyof TrackerDefaults>(
  key: K,
  value: TrackerDefaults[K],
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, String(value));
}

/**
 * Remove all eight default keys from localStorage, reverting to system defaults.
 */
export function resetTrackerDefaults(): void {
  if (typeof window === 'undefined') return;
  for (const key of ALL_KEYS) {
    localStorage.removeItem(key);
  }
}

/**
 * Serialize currently-stored defaults for inclusion in an export file.
 * Only keys that have been explicitly set are included.
 */
export function getDefaultsForExport(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const out: Record<string, string> = {};
  for (const key of ALL_KEYS) {
    const v = localStorage.getItem(key);
    if (v !== null) out[key] = v;
  }
  return out;
}

/**
 * Apply imported defaults during a "Replace all data" import (PRD §4.11.6).
 * Under "Merge", this function is NOT called — existing defaults are preserved.
 */
export function applyImportedDefaults(defaults: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  for (const key of ALL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(defaults, key)) {
      localStorage.setItem(key, defaults[key]);
    }
  }
}
