
'use client';
import { useCallback, useRef } from 'react';
import { getDB } from '@/lib/db';
import { fetchFlightPrice } from '@/lib/serpapi';
import { showPriceAlert, showQuotaExhaustedNotification } from '@/lib/notifications';
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
}

interface UseFetchResult {
  fetchTracker: (tracker: Tracker) => Promise<{ quotaExhausted?: boolean }>;
  /**
   * Opportunistically rechecks active trackers whose recheck interval has
   * elapsed (PRD §4.2.3). This is the Home-screen-load batch trigger
   * (PRD §4.2.1, trigger 1) — it must never run on a timer.
   */
  fetchAllActive: (trackers: Tracker[], opts?: FetchAllOptions) => Promise<void>;
}

export function useTrackerFetch(onQuotaExhausted?: () => void): UseFetchResult {
  const fetchingRef = useRef<Set<string>>(new Set());

  const fetchTracker = useCallback(async (tracker: Tracker): Promise<{ quotaExhausted?: boolean }> => {
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
        showQuotaExhaustedNotification();
        onQuotaExhausted?.();
        return { quotaExhausted: true };
      }

      if (result.status === 'success' && result.lowestPrice > 0) {
        const prevPrice = tracker.lastKnownPrice;
        await db.trackers.update(tracker.id, { lastFetchedAt: now, updatedAt: now, lastKnownPrice: result.lowestPrice });

        // Check alert condition
        const meetsAlert =
          (tracker.alertDirection === 'below' && result.lowestPrice <= tracker.targetPrice) ||
          (tracker.alertDirection === 'above' && result.lowestPrice >= tracker.targetPrice);

        const prevMet =
          prevPrice !== undefined && (
            (tracker.alertDirection === 'below' && prevPrice <= tracker.targetPrice) ||
            (tracker.alertDirection === 'above' && prevPrice >= tracker.targetPrice)
          );

        const cooldownPassed = !tracker.lastNotifiedAt ||
          (Date.now() - new Date(tracker.lastNotifiedAt).getTime()) > (tracker.cooldownHours * 3600000);

        if (meetsAlert && !prevMet && cooldownPassed && tracker.notificationsEnabled) {
          const route = `${tracker.params.departure_id} → ${tracker.params.arrival_id}`;
          showPriceAlert({
            trackerName: tracker.name || route,
            route,
            currentPrice: result.lowestPrice,
            targetPrice: tracker.targetPrice,
            currency: tracker.currency,
            direction: tracker.alertDirection,
            priceLevel: result.priceInsights?.price_level,
            typicalRange: result.priceInsights?.typical_price_range,
          });
          await db.trackers.update(tracker.id, { lastNotifiedAt: now });
        }
      } else {
        await db.trackers.update(tracker.id, { lastFetchedAt: now, updatedAt: now });
      }
      return {};
    } finally {
      fetchingRef.current.delete(tracker.id);
    }
  }, [onQuotaExhausted]);

  const fetchAllActive = useCallback(async (trackers: Tracker[], opts?: FetchAllOptions) => {
    const due = trackers.filter(t => t.status === 'active' && (opts?.force || isTrackerStale(t)));
    for (const t of due) {
      opts?.onTrackerStart?.(t.id);
      const result = await fetchTracker(t);
      opts?.onTrackerEnd?.(t.id);
      if (result.quotaExhausted) break;
    }
  }, [fetchTracker]);

  return { fetchTracker, fetchAllActive };
}
