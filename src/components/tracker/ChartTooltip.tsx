'use client';
/**
 * ChartTooltip — Design Specs v1.7 §5.12 / PRD v1.10 §4.8.5
 *
 * Shown when the user taps/hovers a data point on any Flightwatch chart.
 *
 * Two content variants based on the point's data source:
 *   - 'local'  → locally-fetched PriceHistory record: shows date, time, price,
 *                airline (when available), and "Fetched by Flightwatch" label.
 *   - 'api'    → API price_history overlay point: shows date only (no time —
 *                these are daily aggregates from Google, not Flightwatch fetches),
 *                price, and "Google Flights historical estimate" label.
 *
 * Usage: pass as <Tooltip content={<ChartTooltip currency={…} />} /> to Recharts.
 * Access the full data row via payload[0].payload — Recharts includes the full
 * data object here, so source, fetchedAt, airline etc. are all available.
 */

import { Clock } from 'lucide-react';

function fmtPrice(v: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  currency: string;
}

export function ChartTooltip({ active, payload, currency }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload.find(p => {
    const row = p.payload as Record<string, unknown> | undefined;
    return row && (row.localPrice !== undefined || row.apiPrice !== undefined || row.price !== undefined);
  })?.payload as Record<string, unknown> | undefined;

  if (!item) return null;

  const source    = (item.source as string) ?? 'local';
  const fetchedAt = item.fetchedAt as string | undefined;
  const airline   = item.airline   as string | undefined;
  const price = (item.localPrice ?? item.apiPrice ?? item.price) as number | undefined;

  if (price === undefined) return null;

  const container = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 shadow-lg text-xs min-w-[152px] max-w-[200px] pointer-events-none';

  /* ── Local (Flightwatch-fetched) point ── */
  if (source === 'local' && fetchedAt) {
    const d = new Date(fetchedAt);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

    return (
      <div className={container} role="tooltip">
        <p className="font-semibold text-slate-900 dark:text-white mb-0.5">{dateStr}</p>
        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 mb-2">
          <Clock size={11} aria-hidden="true" />
          <time dateTime={fetchedAt}>{timeStr}</time>
        </div>
        <p className="font-bold text-sm font-mono tabular-nums text-slate-900 dark:text-white">
          {fmtPrice(price, currency)}
        </p>
        {airline && (
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">{airline}</p>
        )}
        <p className="text-[10px] text-slate-300 dark:text-slate-600 italic mt-1.5 leading-tight">
          Fetched by Flightwatch
        </p>
      </div>
    );
  }

  /* ── API-sourced point ── */
  // item.time is the ms timestamp; derive the display date from it directly
  const ms = item.time as number | undefined;
  const displayDate = ms
    ? new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : (item.date as string | undefined) ?? '';

  return (
    <div className={container} role="tooltip">
      <p className="font-semibold text-slate-900 dark:text-white mb-2">{displayDate}</p>
      <p className="font-bold text-sm font-mono tabular-nums text-slate-900 dark:text-white">
        {fmtPrice(price, currency)}
      </p>
      <p className="text-[10px] text-slate-300 dark:text-slate-600 italic mt-1.5 leading-tight">
        Google Flights historical estimate
      </p>
    </div>
  );
}
