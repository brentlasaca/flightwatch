'use client';

interface SparklineProps {
  /** Locally fetched price points (solid, full opacity) */
  localData: number[];
  /** API price_history prices (dashed, reduced opacity) */
  apiData?: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

function buildPoints(data: number[], allMin: number, range: number, width: number, height: number, pad: number): string {
  if (data.length < 2) return '';
  const w = width - pad * 2;
  const h = height - pad * 2;
  return data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - allMin) / range) * h;
    return `${x},${y}`;
  }).join(' ');
}

/**
 * Dual-source sparkline — renders locally fetched data (solid) and
 * API price_history data (50% opacity dashed), on a shared Y scale.
 */
export function Sparkline({
  localData,
  apiData = [],
  width = 80,
  height = 32,
  color = '#3B82F6',
  className = '',
}: SparklineProps) {
  const combined = [...localData, ...apiData];
  if (combined.length < 2) return null;

  const allMin  = Math.min(...combined);
  const allMax  = Math.max(...combined);
  const range   = allMax - allMin || 1;
  const pad     = 2;

  const localPoints = buildPoints(localData, allMin, range, width, height, pad);
  const apiPoints   = buildPoints(apiData,   allMin, range, width, height, pad);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={className}
    >
      {/* API history — dashed, 50% opacity */}
      {apiPoints && (
        <polyline
          points={apiPoints}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="3 2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
      )}
      {/* Local fetched — solid */}
      {localPoints && (
        <polyline
          points={localPoints}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
