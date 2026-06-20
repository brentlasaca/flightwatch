'use client';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { BarChart2 } from 'lucide-react';
import { PriceLevelBadge } from './PriceLevelBadge';
import { FlightwatchLogoMark } from '@/components/ui/FlightwatchLogo';
import type { PriceRecord, PriceInsights } from '@/types';

const InsightsChart = dynamic(() => import('./InsightsChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
      Loading chart…
    </div>
  ),
});

interface PriceInsightsPanelProps {
  history: PriceRecord[];
  currency: string;
  targetPrice: number;
}

function fmt(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

export function PriceInsightsPanel({ history, currency, targetPrice }: PriceInsightsPanelProps) {
  // Find the most recent record that has priceInsights
  const insights: PriceInsights | undefined = useMemo(() => {
    const records = [...history].reverse();
    return records.find(r => r.priceInsights)?.priceInsights;
  }, [history]);

  const successHistory = useMemo(
    () => history.filter(r => r.status === 'success' && r.lowestPrice > 0),
    [history]
  );

  const hasData = !!insights || successHistory.length >= 2;

  const typicalLow  = insights?.typical_price_range[0] ?? 0;
  const typicalHigh = insights?.typical_price_range[1] ?? 0;
  const currentPrice = insights?.lowest_price;

  // vs. midpoint calculation
  const midpoint = typicalLow > 0 && typicalHigh > 0 ? (typicalLow + typicalHigh) / 2 : null;
  const vsTypical = currentPrice && midpoint ? currentPrice - midpoint : null;

  return (
    <div className="px-4 mb-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={18} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Price Insights</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {!hasData ? (
          /* Empty state */
          <div
            className="flex flex-col items-center justify-center py-10 gap-3"
            style={{ minHeight: 120 }}
          >
            <FlightwatchLogoMark size={40} className="opacity-40" />
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center px-4">
              Price insights will appear after the first successful fetch.
            </p>
          </div>
        ) : (
          <>
            {/* Combined chart */}
            <div className="p-4 pb-0">
              <InsightsChart
                localHistory={successHistory}
                apiPriceHistory={insights?.price_history ?? []}
                currency={currency}
                targetPrice={targetPrice}
                typicalLow={typicalLow}
                typicalHigh={typicalHigh}
              />
            </div>

            {/* Chart legend */}
            <div className="px-4 pt-2 pb-3 flex flex-wrap gap-x-4 gap-y-1">
              <LegendItem color="#3B82F6" dash={false} label="Fetched" />
              <LegendItem color="#94A3B8" dash={true}  label="API history" />
              <LegendItem color="#F59E0B" dash={true}  label="Your target" />
              {typicalLow > 0 && typicalHigh > 0 && (
                <LegendItem color="#3B82F6" fill label="Typical range" />
              )}
            </div>

            {/* Summary stats row */}
            {insights && (
              <div className="border-t border-slate-100 dark:border-slate-700 p-3 flex gap-2 min-w-0">
                {/* Current price */}
                <StatChip
                  value={fmt(insights.lowest_price, currency)}
                  label="Current"
                  className="flex-1"
                />
                {/* Price level */}
                {insights.price_level && (
                  <div className="min-w-0 flex-1 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 p-2.5 text-center flex flex-col items-center gap-1">
                    <PriceLevelBadge level={insights.price_level} />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate w-full">Price Level</p>
                  </div>
                )}
                {/* Typical range */}
                {typicalLow > 0 && typicalHigh > 0 && (
                  <StatChip
                    value={`${fmt(typicalLow, currency)}–${fmt(typicalHigh, currency)}`}
                    label="Typical range"
                    className="flex-1"
                    valueSize="text-xs"
                  />
                )}
                {/* vs. Typical midpoint */}
                {vsTypical !== null && (
                  <StatChip
                    value={`${vsTypical < 0 ? '−' : '+'}${fmt(Math.abs(vsTypical), currency)}`}
                    label="vs. midpoint"
                    className="flex-1"
                    valueColor={vsTypical < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
                    aria-label={`${Math.abs(vsTypical) > 0 ? (vsTypical < 0 ? fmt(Math.abs(vsTypical), currency) + ' below' : fmt(Math.abs(vsTypical), currency) + ' above') : 'at'} the typical midpoint`}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LegendItem({
  color, dash, fill, label,
}: { color: string; dash?: boolean; fill?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {fill ? (
        <div className="w-4 h-3 rounded-sm opacity-20" style={{ background: color }} />
      ) : (
        <svg width="16" height="8" aria-hidden="true">
          <line
            x1="0" y1="4" x2="16" y2="4"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={dash ? '4 2' : undefined}
          />
        </svg>
      )}
      <span className="text-[10px] text-slate-400 dark:text-slate-500">{label}</span>
    </div>
  );
}

function StatChip({
  value, label, className = '', valueSize = 'text-sm', valueColor = 'text-slate-900 dark:text-white',
  'aria-label': ariaLabel,
}: {
  value: string; label: string; className?: string; valueSize?: string; valueColor?: string;
  'aria-label'?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 p-2.5 text-center flex flex-col items-center gap-1 ${className}`}
      aria-label={ariaLabel}
    >
      <p className={`font-semibold leading-tight break-words ${valueSize} ${valueColor}`}>{value}</p>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate w-full">{label}</p>
    </div>
  );
}
