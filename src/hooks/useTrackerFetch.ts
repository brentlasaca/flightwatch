'use client';
import { useCallback, useRef } from 'react';
import { getDB } from '@/lib/db';
import { fetchFlightPrice } from '@/lib/serpapi';
import { announceAlert } from '@/lib/aria-announce';
import { isTrackerStale } from '@/lib/recheck';
import { v4 as uuidv4 } from 'uuid';
import type { Tracker } from '@/types';

interface FetchAllOptions {
  /** Called right before a given tracker's recheck fetch begins. */
  onTrackerStart?: (trackerId: string) => void;
  /** Called once that tracker's fetch settles (success or failure). */
  onTrackerEnd?: (trackerId: string) => void;
  /** Skip the staleness check and recheck every active tracker. Default false. */
  force?: boolean;
  /**
   * Stagger delay in ms between sequential fetches (Design Specs v1.8 §5.14).
   * Fetches always run sequentially regardless of this value — this only
   * adds a pause between them to avoid tripping SerpAPI's standard rate
   * limiting during a large "Fetch All" batch. Default 0 (no added delay),
   * which preserves prior behavior for the opportunistic Home-open recheck.
   */
  staggerMs?: number;
  /**
   * Checked before each tracker's fetch is started. If it returns true, the
   * batch stops immediately without starting any further fetches — used by
   * "Fetch All" cancellation (PRD §4.2.5). A fetch already in flight is not
   * interrupted by this check; it's only consulted between iterations.
   */
  isCancelled?: () => boolean;
}

/** Outcome of a fetchAllActive run — drives the Fetch All completion toast (Design Specs v1.8 §5.14). */
export interface FetchAllSummary {
  /** Number of trackers whose fetch was actually started (and settled or was in-flight when quota hit). */
  attempted: number;
  /** Of those attempted, how many returned a successful price. */
  succeeded: number;
  /** Of those attempted, how many did not (error, offline, no results — excluding quota exhaustion). */
  failed: number;
  /** True if the batch was stopped early via `isCancelled`. */
  cancelled: boolean;
  /** True if the batch was stopped early because a fetch hit the SerpAPI quota. */
  quotaExhausted: boolean;
}

interface UseFetchResult {
  fetchTracker: (tracker: Tracker) => Promise<{ quotaExhausted?: boolean; success?: boolean }>;
  /**
   * Opportunistically rechecks active trackers whose recheck interval has
   * elapsed (PRD v1.6 §4.2.2). This is the Home-screen-load batch trigger
   * (PRD §4.2.1, trigger 1) — it must never run on a timer.
   *
   * With `force: true`, this also serves as the "Fetch All" batch trigger
   * (PRD §4.2.5, trigger 4): every active tracker is fetched regardless of
   * staleness, sequentially, with an optional stagger and cancellation hook.
   */
  fetchAllActive: (trackers: Tracker[], opts?: FetchAllOptions) => Promise<FetchAllSummary>;
}

export function useTrackerFetch(onQuotaExhausted?: () => void): UseFetchResult {
  const fetchingRef = useRef<Set<string>>(new Set());

  const fetchTracker = useCallback(async (tracker: Tracker): Promise<{ quotaExhausted?: boolean; success?: boolean }> => {
    if (fetchingRef.current.has(tracker.id)) return {};
    fetchingRef.current.add(tracker.id);
    const db = getDB();
    try {
      const result = await fetchFlightPrice(tracker.id, tracker.params, tracker.currency);
      const record = { ...result, id: uuidv4() };
      await db.priceHistory.add(record);
      const now = new Date().toISOString();

      if (result.status === 'error' && result.errorMessage === 'quota_exhausted') {
        await db.trackers.update(tracker.id, { status: 'paused', updatedAt: now });
        onQuotaExhausted?.();
        return { quotaExhausted: true };
      }

      let success = false;
      if (result.status === 'success' && result.lowestPrice > 0) {
        success = true;
        const prevPrice = tracker.lastKnownPrice;
        // Write airline fields atomically alongside price (PRD v1.7 §4.10.1)
        await db.trackers.update(tracker.id, {
          lastFetchedAt: now,
          updatedAt: now,
          lastKnownPrice: result.lowestPrice,
          lastKnownAirline:     result.lowestPriceAirline     ?? undefined,
          lastKnownAirlineLogo: result.lowestPriceAirlineLogo ?? undefined,
        });

        // Detect a false→true targetMet transition (Design Specs v1.5 §6.6).
        // No system notification (PRD v1.6 OQ-8). Sole proactive signals are:
        // the amber card visual treatment + the aria-live assertive announcement.
        const meetsAlert =
          (tracker.alertDirection === 'below' && result.lowestPrice <= tracker.targetPrice) ||
          (tracker.alertDirection === 'above' && result.lowestPrice >= tracker.targetPrice);

        const prevMet =
          prevPrice !== undefined && (
            (tracker.alertDirection === 'below' && prevPrice <= tracker.targetPrice) ||
            (tracker.alertDirection === 'above' && prevPrice >= tracker.targetPrice)
          );

        if (meetsAlert && !prevMet) {
          const route = `${tracker.params.departure_id} → ${tracker.params.arrival_id}`;
          const dir = tracker.alertDirection === 'below' ? 'at or below' : 'at or above';
          const fmt = new Intl.NumberFormat('en-US', {
            style: 'currency', currency: tracker.currency, minimumFractionDigits: 0,
          });
          // Include airline so screen-reader users know where to book (Design Specs v1.5 §9.6)
          const airlinePart = result.lowestPriceAirline ? ` via ${result.lowestPriceAirline}` : '';
          announceAlert(
            `Alert: ${tracker.name || route} — fare is now ${fmt.format(result.lowestPrice)}${airlinePart},` +
            ` ${dir} your target of ${fmt.format(tracker.targetPrice)}.`
          );
        }
      } else {
        await db.trackers.update(tracker.id, { lastFetchedAt: now, updatedAt: now });
      }
      return { success };
    } finally {
      fetchingRef.current.delete(tracker.id);
    }
  }, [onQuotaExhausted]);

  const fetchAllActive = useCallback(async (trackers: Tracker[], opts?: FetchAllOptions): Promise<FetchAllSummary> => {
    const due = trackers.filter(t => t.status === 'active' && (opts?.force || isTrackerStale(t)));
    let attempted = 0, succeeded = 0, failed = 0, cancelled = false, quotaExhausted = false;

    for (let i = 0; i < due.length; i++) {
      if (opts?.isCancelled?.()) { cancelled = true; break; }
      const t = due[i];
      opts?.onTrackerStart?.(t.id);
      const result = await fetchTracker(t);
      opts?.onTrackerEnd?.(t.id);
      attempted++;

      if (result.quotaExhausted) { quotaExhausted = true; break; }
      if (result.success) succeeded++; else failed++;

      if (opts?.staggerMs && i < due.length - 1) {
        await new Promise(resolve => setTimeout(resolve, opts.staggerMs));
      }
    }

    return { attempted, succeeded, failed, cancelled, quotaExhausted };
  }, [fetchTracker]);

  return { fetchTracker, fetchAllActive };
}
