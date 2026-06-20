'use client';

interface TypicalPriceRangeBarProps {
  currentPrice: number;
  typicalLow: number;
  typicalHigh: number;
  currency: string;
}

function fmt(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Horizontal bar showing where the current price sits within the typical range.
 * - Track: full-width gray bar
 * - Fill: blue from left to marker
 * - Marker: triangle indicator at current price position
 * - Labels: low/high bounds at edges
 */
export function TypicalPriceRangeBar({
  currentPrice,
  typicalLow,
  typicalHigh,
  currency,
}: TypicalPriceRangeBarProps) {
  if (typicalLow <= 0 || typicalHigh <= 0 || typicalHigh <= typicalLow) return null;

  const raw = (currentPrice - typicalLow) / (typicalHigh - typicalLow);
  const position = Math.max(0, Math.min(1, raw)); // clamped 0–1
  const belowRange = currentPrice < typicalLow;
  const aboveRange = currentPrice > typicalHigh;

  const lowLabel  = belowRange ? `< ${fmt(typicalLow, currency)}`  : fmt(typicalLow, currency);
  const highLabel = aboveRange ? `> ${fmt(typicalHigh, currency)}` : fmt(typicalHigh, currency);

  return (
    <div
      role="meter"
      aria-valuemin={typicalLow}
      aria-valuemax={typicalHigh}
      aria-valuenow={currentPrice}
      aria-label="Current price relative to typical price range"
      aria-valuetext={
        belowRange
          ? `${fmt(currentPrice, currency)}, below the typical range of ${fmt(typicalLow, currency)} to ${fmt(typicalHigh, currency)}`
          : aboveRange
          ? `${fmt(currentPrice, currency)}, above the typical range`
          : `${fmt(currentPrice, currency)}, within the typical range of ${fmt(typicalLow, currency)} to ${fmt(typicalHigh, currency)}`
      }
      className="w-full select-none"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          Typical: {lowLabel}
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">{highLabel}</span>
      </div>

      {/* Track */}
      <div className="relative w-full h-1 rounded-full overflow-visible"
        style={{ background: 'var(--price-range-track)' }}>

        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full range-bar-fill"
          style={{
            width: `${position * 100}%`,
            background: 'var(--price-range-fill)',
          }}
        />

        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[8px] leading-none"
          style={{
            left: `${position * 100}%`,
            color: 'var(--price-range-fill)',
          }}
          aria-hidden="true"
        >
          ▲
        </div>
      </div>
    </div>
  );
}
