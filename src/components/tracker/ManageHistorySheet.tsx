'use client';
/**
 * ManageHistorySheet — Design Specs v1.7 §5.13 / PRD v1.10 §4.8.6
 *
 * A full-height bottom sheet for deleting locally-fetched PriceHistory records
 * within a user-selected date range.
 *
 * Entry points (Design Specs §5.1, §4.3):
 *   1. Card ⋯ overflow → "Manage history" item
 *   2. CalendarRange icon button on Tracker Detail beside the history header
 *
 * Scope: only PriceHistory rows with fetchedAt in [fromDate, toDate] (inclusive).
 *        API price_history overlay points are not individually addressable.
 *
 * No undo after deletion (PRD OQ-11 resolved). Confirmation modal shows exact
 * record count and date range before committing.
 *
 * Cascading effect: if deleted range covers the most-recent record, the tracker's
 * denormalized fields (lastKnownPrice, lastKnownAirline, etc.) are recomputed in
 * the same transaction.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, CalendarRange, Trash2 } from 'lucide-react';
import { getDB } from '@/lib/db';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import type { Tracker, PriceRecord } from '@/types';

const PriceChart = dynamic(() => import('./PriceChart'), {
  ssr: false,
  loading: () => <div className="h-44 flex items-center justify-center text-slate-400 text-sm">Loading chart…</div>,
});

interface ManageHistorySheetProps {
  open: boolean;
  onClose: () => void;
  tracker: Tracker;
}

function toDateInputValue(iso: string): string {
  // Returns YYYY-MM-DD for the <input type="date">
  return iso.split('T')[0];
}

function startOfDay(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

function endOfDay(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`;
}

function fmtDisplayDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function ManageHistorySheet({ open, onClose, tracker }: ManageHistorySheetProps) {
  const { toast } = useToast();

  const [history, setHistory]   = useState<PriceRecord[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load history when sheet opens
  useEffect(() => {
    if (!open) return;
    getDB().priceHistory
      .where('trackerId').equals(tracker.id)
      .sortBy('fetchedAt')
      .then(records => {
        setHistory(records);
        const success = records.filter(r => r.status === 'success' && r.lowestPrice > 0);
        const today = new Date().toISOString().split('T')[0];
        if (success.length > 0) {
          setFromDate(toDateInputValue(success[0].fetchedAt));
        } else {
          setFromDate(today);
        }
        setToDate(today);
      });
  }, [open, tracker.id]);

  // Compute which records fall within the selected range (local fetches only)
  const inRangeRecords = useMemo(() => {
    if (!fromDate || !toDate) return [];
    const from = startOfDay(fromDate);
    const to   = endOfDay(toDate);
    return history.filter(r => r.fetchedAt >= from && r.fetchedAt <= to);
  }, [history, fromDate, toDate]);

  const successHistory = useMemo(
    () => history.filter(r => r.status === 'success' && r.lowestPrice > 0),
    [history]
  );

  const handleFromChange = useCallback((val: string) => {
    setFromDate(val);
    if (toDate && val > toDate) setToDate(val);
  }, [toDate]);

  const handleToChange = useCallback((val: string) => {
    setToDate(val);
    if (fromDate && val < fromDate) setFromDate(val);
  }, [fromDate]);

  const handleDelete = async () => {
    if (inRangeRecords.length === 0) return;
    setDeleting(true);
    try {
      const db = getDB();
      const ids = inRangeRecords.map(r => r.id);

      await db.transaction('rw', [db.priceHistory, db.trackers], async () => {
        await db.priceHistory.bulkDelete(ids);

        // Recompute denormalized tracker fields if we deleted the most-recent record
        const remaining = await db.priceHistory
          .where('trackerId').equals(tracker.id)
          .filter(r => r.status === 'success' && r.lowestPrice > 0)
          .sortBy('fetchedAt');

        const newest = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        await db.trackers.update(tracker.id, {
          lastKnownPrice:      newest?.lowestPrice      ?? undefined,
          lastKnownAirline:    newest?.lowestPriceAirline    ?? undefined,
          lastKnownAirlineLogo:newest?.lowestPriceAirlineLogo ?? undefined,
          lastFetchedAt:       newest?.fetchedAt        ?? undefined,
          updatedAt: new Date().toISOString(),
        });
      });

      const n = ids.length;
      toast(`${n} price record${n !== 1 ? 's' : ''} deleted`);

      // Refresh displayed history
      const updated = await db.priceHistory
        .where('trackerId').equals(tracker.id).sortBy('fetchedAt');
      setHistory(updated);
      setShowConfirm(false);
    } catch (err) {
      toast('Deletion failed. Please try again.', 'error');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const n = inRangeRecords.length;
  const canDelete = n > 0 && !deleting;
  const today = new Date().toISOString().split('T')[0];
  const minDate = successHistory.length > 0 ? toDateInputValue(successHistory[0].fetchedAt) : undefined;

  const confirmTitle = `Delete ${n} price record${n !== 1 ? 's' : ''}?`;
  const confirmDescription = `Records from ${fmtDisplayDate(fromDate)} to ${fmtDisplayDate(toDate)} will be permanently removed. This cannot be undone.`;

  return (
    <>
      <BottomSheet open={open} onClose={onClose} height="full">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <CalendarRange size={16} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Manage history
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close manage history sheet"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {successHistory.length === 0 ? (
              /* ── Empty state ── */
              <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                <CalendarRange size={40} className="text-slate-300 dark:text-slate-600" aria-hidden="true" />
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  No price history yet.
                </p>
                <p className="text-xs text-slate-300 dark:text-slate-600">
                  History appears after the first successful fetch.
                </p>
              </div>
            ) : (
              <div className="px-4 pt-4 flex flex-col gap-5 pb-6">
                {/* Chart preview */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 relative overflow-hidden">
                  <PriceChart
                    data={successHistory}
                    currency={tracker.currency}
                    targetPrice={tracker.targetPrice}
                  />
                </div>

                {/* Date range pickers */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                    Select date range to delete
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label
                        htmlFor="manage-from"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        From
                      </label>
                      <input
                        id="manage-from"
                        type="date"
                        value={fromDate}
                        min={minDate}
                        max={toDate || today}
                        onChange={e => handleFromChange(e.target.value)}
                        aria-label="From date"
                        className="w-full px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="manage-to"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        To
                      </label>
                      <input
                        id="manage-to"
                        type="date"
                        value={toDate}
                        min={fromDate || minDate}
                        max={today}
                        onChange={e => handleToChange(e.target.value)}
                        aria-label="To date"
                        className="w-full px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Record count preview */}
                <div
                  role="status"
                  aria-live="polite"
                  className="text-sm text-center"
                >
                  {n === 0 ? (
                    <span className="text-slate-400 dark:text-slate-500 italic">
                      No records in this range
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-white">{n}</span>
                      {' '}record{n !== 1 ? 's' : ''} in selected range
                    </span>
                  )}
                </div>

                {/* Delete button */}
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  disabled={!canDelete}
                  onClick={() => setShowConfirm(true)}
                  aria-label={`Delete ${n} price records from ${fmtDisplayDate(fromDate)} to ${fmtDisplayDate(toDate)}`}
                >
                  <Trash2 size={14} />
                  {n === 0 ? 'Delete records' : `Delete ${n} record${n !== 1 ? 's' : ''}`}
                </Button>

                <p className="text-[11px] text-slate-300 dark:text-slate-600 text-center leading-relaxed">
                  Only locally-fetched records can be deleted.{'\n'}Google Flights historical data is read-only.
                </p>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Confirmation modal */}
      <Modal
        open={showConfirm}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={`Delete ${n} record${n !== 1 ? 's' : ''}`}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        loading={deleting}
      />
    </>
  );
}
