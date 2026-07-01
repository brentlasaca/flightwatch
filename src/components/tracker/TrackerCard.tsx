'use client';
import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  PauseCircle, Play, Trash2, TrendingDown, TrendingUp,
  Minus, RefreshCw, MoreHorizontal, CalendarRange,
} from 'lucide-react';
import { getDB } from '@/lib/db';
import { Sparkline } from './Sparkline';
import { PriceLevelBadge } from './PriceLevelBadge';
import { TypicalPriceRangeBar } from './TypicalPriceRangeBar';
import { AirlineLogo } from './AirlineLogo';
import { ManageHistorySheet } from './ManageHistorySheet';
import { Badge } from '@/components/ui/Badge';
import type { Tracker, PriceInsights } from '@/types';

interface TrackerCardProps {
  tracker: Tracker;
  onClick: () => void;
  onTogglePause: (t: Tracker) => void;
  onDelete: (t: Tracker) => void;
  onFetch: (t: Tracker) => void;
  isFetching?: boolean;
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function tripTypeName(t: number) { return t === 1 ? 'Round Trip' : 'One Way'; }
function className_(n: number) { return ['', 'Economy', 'Premium Eco.', 'Business', 'First'][n] || 'Economy'; }

export function TrackerCard({ tracker, onClick, onTogglePause, onDelete, onFetch, isFetching }: TrackerCardProps) {
  const history = useLiveQuery(
    () => getDB().priceHistory.where('trackerId').equals(tracker.id).sortBy('fetchedAt'),
    [tracker.id]
  );

  const successRecords = (history || []).filter(h => h.status === 'success' && h.lowestPrice > 0);
  const prices         = successRecords.map(h => h.lowestPrice);

  const latestInsights: PriceInsights | undefined = [...successRecords]
    .reverse()
    .find(r => r.priceInsights)?.priceInsights;

  const apiPrices = latestInsights?.price_history?.map(([, p]) => p) ?? [];
  const blendedPrices = [
    ...apiPrices.slice(0, Math.max(0, 20 - prices.length)),
    ...prices,
  ].slice(-30);

  const currentPrice = tracker.lastKnownPrice;
  const prevPrice    = prices.length >= 2 ? prices[prices.length - 2] : undefined;
  const priceDelta   = currentPrice && prevPrice ? currentPrice - prevPrice : undefined;

  const isPaused  = tracker.status === 'paused';
  const targetMet = currentPrice !== undefined && (
    (tracker.alertDirection === 'below' && currentPrice <= tracker.targetPrice) ||
    (tracker.alertDirection === 'above' && currentPrice >= tracker.targetPrice)
  );

  const badgeVariant = targetMet ? 'alert' : isPaused ? 'paused' : 'active';
  const badgeLabel   = targetMet ? '● Alert' : isPaused ? '⏸ Paused' : '● Active';

  const [pulsing, setPulsing] = useState(false);
  const prevTargetMet = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (targetMet && prevTargetMet.current === false) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 650);
      return () => clearTimeout(t);
    }
    prevTargetMet.current = targetMet;
  }, [targetMet]);

  // Overflow action sheet state — §5.1, §5.7
  const [showOverflow, setShowOverflow]         = useState(false);
  const [showManageHistory, setShowManageHistory] = useState(false);

  const route = `${tracker.params.departure_id} to ${tracker.params.arrival_id}`;

  const lastChecked = tracker.lastFetchedAt
    ? (() => {
        const diff = Date.now() - new Date(tracker.lastFetchedAt).getTime();
        if (diff < 60000)    return 'Just now';
        if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return formatDate(tracker.lastFetchedAt);
      })()
    : 'Never checked';

  const typicalLow  = latestInsights?.typical_price_range[0] ?? 0;
  const typicalHigh = latestInsights?.typical_price_range[1] ?? 0;
  const showRangeBar = !!latestInsights && typicalLow > 0 && typicalHigh > 0 && !!currentPrice;

  return (
    <>
      <article
        onClick={onClick}
        className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-150 active:scale-[0.985] cursor-pointer shadow-sm overflow-hidden
          ${targetMet ? 'border-amber-400 dark:border-amber-500' : 'border-slate-200 dark:border-slate-700'}
          ${isPaused ? 'opacity-70' : ''}
          ${pulsing ? 'animate-alert-pulse' : ''}`}
        aria-label={[
          `${route} tracker`,
          targetMet ? 'Alert: fare meets your target.' : null,
          tracker.lastKnownAirline ? `${tracker.lastKnownAirline}.` : null,
        ].filter(Boolean).join(' ')}
      >
        {targetMet && <div className="h-0.5 bg-amber-400 dark:bg-amber-500 w-full" />}
        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight truncate">
                {tracker.params.departure_id} → {tracker.params.arrival_id}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {tracker.name || [
                  formatDate(tracker.params.outbound_date),
                  tracker.params.return_date ? `→ ${formatDate(tracker.params.return_date)}` : '',
                  `· ${tripTypeName(tracker.params.type)}`,
                  `· ${className_(tracker.params.travel_class)}`,
                ].filter(Boolean).join(' ')}
              </p>
            </div>
            <Badge variant={badgeVariant}>{badgeLabel}</Badge>
          </div>

          {/* Price area */}
          <div className="flex items-end justify-between mb-2">
            <div className="min-w-0">
              {currentPrice ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`font-mono font-bold text-2xl tabular-nums leading-none
                      ${targetMet ? 'text-amber-500 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                      {formatPrice(currentPrice, tracker.currency)}
                    </div>
                    {latestInsights?.price_level && (
                      <PriceLevelBadge level={latestInsights.price_level} />
                    )}
                  </div>

                  {priceDelta !== undefined && (
                    <div className={`flex items-center gap-1 mt-1 text-xs font-medium
                      ${priceDelta < 0 ? 'text-emerald-600 dark:text-emerald-400'
                      : priceDelta > 0 ? 'text-red-500 dark:text-red-400'
                      : 'text-slate-400'}`}>
                      {priceDelta < 0 ? <TrendingDown size={12} /> : priceDelta > 0 ? <TrendingUp size={12} /> : <Minus size={12} />}
                      {priceDelta === 0
                        ? 'No change'
                        : `${priceDelta < 0 ? '−' : '+'}${formatPrice(Math.abs(priceDelta), tracker.currency)} since last check`}
                    </div>
                  )}

                  {(tracker.lastKnownAirline || tracker.lastKnownAirlineLogo) && (
                    <div className="mt-1.5">
                      <AirlineLogo
                        name={tracker.lastKnownAirline}
                        logoUrl={tracker.lastKnownAirlineLogo}
                        size="card"
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                    Target: {tracker.alertDirection === 'below' ? '≤' : '≥'} {formatPrice(tracker.targetPrice, tracker.currency)}
                  </p>
                </>
              ) : (
                <div className="text-slate-400 dark:text-slate-500 text-sm font-mono">
                  {isPaused ? 'Tracking paused' : 'Checking prices…'}
                </div>
              )}
              <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1.5 flex items-center gap-1">
                {isFetching && <RefreshCw size={9} className="animate-spin" />}
                {isFetching ? 'Updating…' : lastChecked}
              </p>
            </div>

            {blendedPrices.length >= 2 && (
              <Sparkline
                localData={prices.slice(-30)}
                apiData={apiPrices.slice(-30)}
                color={targetMet ? '#F59E0B' : '#3B82F6'}
                className="opacity-40 flex-shrink-0 ml-2"
              />
            )}
          </div>

          {showRangeBar && (
            <div className="mt-2 mb-1">
              <TypicalPriceRangeBar
                currentPrice={currentPrice!}
                typicalLow={typicalLow}
                typicalHigh={typicalHigh}
                currency={tracker.currency}
              />
            </div>
          )}

          {/* Card actions row — §5.1 (v1.7): 4 items including ⋯ overflow */}
          <div
            className="flex gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => onFetch(tracker)}
              disabled={isFetching || isPaused}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Checking…' : 'Check now'}
            </button>

            <button
              onClick={() => onTogglePause(tracker)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {isPaused ? <Play size={12} /> : <PauseCircle size={12} />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={() => onDelete(tracker)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={12} />
              Delete
            </button>

            {/* ⋯ overflow — opens card overflow action sheet (§5.7) */}
            <button
              onClick={() => setShowOverflow(true)}
              aria-label="More actions for this tracker"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-auto"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
      </article>

      {/* Card Overflow Action Sheet — §5.7 */}
      {showOverflow && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          onClick={() => setShowOverflow(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl pb-safe"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>
            <button
              onClick={() => { setShowOverflow(false); setShowManageHistory(true); }}
              aria-label="Manage price history for this tracker"
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-slate-900 dark:text-white min-h-[48px] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <CalendarRange size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
              Manage history
            </button>
            <div className="px-4 pb-4 pt-2">
              <button
                onClick={() => setShowOverflow(false)}
                className="w-full py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage History Sheet */}
      <ManageHistorySheet
        open={showManageHistory}
        onClose={() => setShowManageHistory(false)}
        tracker={tracker}
      />
    </>
  );
}
