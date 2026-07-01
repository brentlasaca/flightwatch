'use client';
import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ReferenceArea, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
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
  time: number; // ms timestamp — unique per point, used as XAxis key
  localPrice?: number;
  apiPrice?: number;
  source: 'local' | 'api';
  fetchedAt?: string; // for tooltip: ISO string on local points
  airline?: string;
}

const fmtTick = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const fmtPrice = (v: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

export default function InsightsChart({
  localHistory, apiPriceHistory, currency,
  targetPrice, typicalLow, typicalHigh,
}: InsightsChartProps) {
  const chartData = useMemo((): ChartPoint[] => {
    const points: ChartPoint[] = [];

    // Local points: each has a unique ms timestamp, so same-day points are distinct
    localHistory.forEach(r => {
      points.push({
        time: new Date(r.fetchedAt).getTime(),
        localPrice: r.lowestPrice,
        source: 'local',
        fetchedAt: r.fetchedAt,
        airline: r.lowestPriceAirline,
      });
    });

    // API history points — skip if within 30 min of any local point
    apiPriceHistory.forEach(([ts, price]) => {
      const t = ts * 1000;
      const tooClose = points.some(p => Math.abs(p.time - t) < 1_800_000);
      if (!tooClose) {
        points.push({ time: t, apiPrice: price, source: 'api' });
      }
    });

    return points.sort((a, b) => a.time - b.time);
  }, [localHistory, apiPriceHistory]);

  const allPrices = chartData.flatMap(p =>
    [p.localPrice, p.apiPrice].filter((v): v is number => v !== undefined)
  );
  const priceMin = allPrices.length ? Math.min(...allPrices) : 0;
  const priceMax = allPrices.length ? Math.max(...allPrices) : 1000;
  const pad = (priceMax - priceMin) * 0.12 || 50;
  const yMin = Math.max(0, Math.floor(priceMin - pad));
  const yMax = Math.ceil(priceMax + pad);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.4} />
        <XAxis
          dataKey="time"
          scale="time"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={fmtTick}
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false} axisLine={false}
          tickFormatter={v => fmtPrice(v, currency)}
          width={60}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        {typicalLow > 0 && typicalHigh > 0 && (
          <ReferenceArea y1={typicalLow} y2={typicalHigh} fill="#3B82F6" fillOpacity={0.08} />
        )}
        <ReferenceLine
          y={targetPrice} stroke="#F59E0B" strokeDasharray="5 3" strokeWidth={1.5}
          label={{ value: 'Target', position: 'insideTopRight', fontSize: 9, fill: '#F59E0B', offset: 4 }}
        />
        <Line
          type="monotone" dataKey="apiPrice" stroke="#94A3B8"
          strokeWidth={1.5} strokeDasharray="4 3"
          dot={false} activeDot={{ r: 4 }}
          connectNulls={false}
        />
        <Line
          type="monotone" dataKey="localPrice" stroke="#3B82F6" strokeWidth={2}
          dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
