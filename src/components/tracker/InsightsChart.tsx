'use client';
import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ReferenceArea, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { PriceRecord } from '@/types';

interface InsightsChartProps {
  localHistory: PriceRecord[];
  apiPriceHistory: [number, number][];
  currency: string;
  targetPrice: number;
  typicalLow: number;
  typicalHigh: number;
}

interface ChartPoint {
  time: number;
  date: string;
  localPrice?: number;
  apiPrice?: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number; dataKey?: string }>;
  label?: string;
  currency: string;
}

function fmtPrice(v: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label, currency }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const price = payload.find(p => p.value !== undefined)?.value;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      {price !== undefined && (
        <p className="font-semibold text-slate-900 dark:text-white">{fmtPrice(price, currency)}</p>
      )}
    </div>
  );
}

export default function InsightsChart({
  localHistory,
  apiPriceHistory,
  currency,
  targetPrice,
  typicalLow,
  typicalHigh,
}: InsightsChartProps) {
  const chartData = useMemo((): ChartPoint[] => {
    const points: ChartPoint[] = [];

    // Add local points
    localHistory.forEach(r => {
      points.push({
        time: new Date(r.fetchedAt).getTime(),
        date: fmtDate(r.fetchedAt),
        localPrice: r.lowestPrice,
      });
    });

    // Add API history points not within 30min of a local point
    apiPriceHistory.forEach(([ts, price]) => {
      const t = ts * 1000;
      const exists = points.some(p => Math.abs(p.time - t) < 1800000);
      if (!exists) {
        points.push({
          time: t,
          date: fmtDate(new Date(t).toISOString()),
          apiPrice: price,
        });
      }
    });

    return points.sort((a, b) => a.time - b.time);
  }, [localHistory, apiPriceHistory]);

  const allPrices = chartData.flatMap(p => [p.localPrice, p.apiPrice].filter((v): v is number => v !== undefined));
  const priceMin = allPrices.length ? Math.min(...allPrices) : 0;
  const priceMax = allPrices.length ? Math.max(...allPrices) : 1000;
  const padding  = (priceMax - priceMin) * 0.12 || 50;

  const yMin = Math.max(0, Math.floor(priceMin - padding));
  const yMax = Math.ceil(priceMax + padding);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.4} />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => fmtPrice(v, currency)}
          width={60}
        />

        <Tooltip content={<CustomTooltip currency={currency} />} />

        {/* Typical price range band */}
        {typicalLow > 0 && typicalHigh > 0 && (
          <ReferenceArea y1={typicalLow} y2={typicalHigh} fill="#3B82F6" fillOpacity={0.08} />
        )}

        {/* Target price line */}
        <ReferenceLine
          y={targetPrice}
          stroke="#F59E0B"
          strokeDasharray="5 3"
          strokeWidth={1.5}
          label={{ value: 'Target', position: 'insideTopRight', fontSize: 9, fill: '#F59E0B', offset: 4 }}
        />

        {/* API price history — dashed gray */}
        <Line
          type="monotone"
          dataKey="apiPrice"
          stroke="#94A3B8"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />

        {/* Locally fetched data — solid blue */}
        <Line
          type="monotone"
          dataKey="localPrice"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
