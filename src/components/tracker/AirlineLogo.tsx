'use client';
/**
 * AirlineLogo — Design Specs v1.5 §5.10 / PRD v1.7 §4.10
 *
 * Renders an airline's logo image alongside its name. Handles three
 * graceful-degradation scenarios:
 *
 *   1. No data at all          → render nothing (parent omits the row)
 *   2. Name present, no logo   → Plane icon + name text
 *   3. Logo fails to load      → onerror swaps to Plane icon + name text
 *
 * The `background: white` on the image wrapper is intentional and must not be
 * themed: airline logos from Google's CDN are designed for a white background.
 * Showing them on a dark surface without it makes light-colored logos invisible.
 * The border contains the white area so it doesn't bleed into the card surface.
 */
import { useState } from 'react';
import { Plane } from 'lucide-react';

interface AirlineLogoProps {
  /** Airline name, e.g. "British Airways". Used for alt text and label. */
  name?: string | null;
  /** Absolute logo URL from the API, e.g. "https://www.gstatic.com/...". */
  logoUrl?: string | null;
  /** "card" = 20px (tracker card); "detail" = 32px (tracker detail price hero). */
  size: 'card' | 'detail';
  /** Optional flight number displayed below the name in detail size. */
  flightNumber?: string | null;
}

export function AirlineLogo({ name, logoUrl, size, flightNumber }: AirlineLogoProps) {
  const [logoError, setLogoError] = useState(false);

  // Scenario 1: No airline data — render nothing so the parent omits the row.
  if (!name && !logoUrl) return null;

  const px        = size === 'detail' ? 32 : 20;
  const radius    = size === 'detail' ? 'rounded-md' : 'rounded-sm';
  const nameClass = size === 'detail'
    ? 'text-sm font-medium text-slate-900 dark:text-white'
    : 'text-xs text-slate-500 dark:text-slate-400';
  const gap       = size === 'detail' ? 'gap-2 items-start' : 'gap-1.5 items-center';

  // Scenario 2 (no logo URL) or Scenario 3 (logo failed to load) — use Plane icon
  const showFallback = !logoUrl || logoError;

  return (
    <div className={`flex ${gap}`}>
      {/* Logo or fallback icon */}
      {showFallback ? (
        // Plane icon placeholder — aria-hidden since adjacent text conveys the airline (§9.3)
        <Plane
          size={size === 'detail' ? 18 : 14}
          className="text-slate-400 dark:text-slate-500 flex-shrink-0 mt-px"
          aria-hidden="true"
        />
      ) : (
        // White background is intentional — do not theme (see file header comment)
        <div
          className={`flex-shrink-0 ${radius} border border-slate-200 dark:border-slate-600 overflow-hidden bg-white`}
          style={{ width: px, height: px, minWidth: px }}
        >
          <img
            src={logoUrl!}
            alt={name ?? 'Airline'}
            width={px}
            height={px}
            loading="lazy"
            onError={() => setLogoError(true)}
            onLoad={e => { (e.target as HTMLImageElement).style.opacity = '1'; }}
            style={{ objectFit: 'contain', width: '100%', height: '100%', opacity: 0,
              transition: 'opacity 200ms ease-out' }}
          />
        </div>
      )}

      {/* Name (and optional flight number in detail size) */}
      {name && (
        <div className="min-w-0">
          <p className={`${nameClass} leading-tight truncate`}>{name}</p>
          {size === 'detail' && flightNumber && (
            <p
              className="text-xs text-slate-400 dark:text-slate-500 mt-0.5"
              aria-label={`Flight ${flightNumber}`}
            >
              {flightNumber}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
