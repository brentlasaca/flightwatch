'use client';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid, Label } from 'recharts';
import { RotateCcw } from 'lucide-react';
import { ChartTooltip } from './ChartTooltip';
import { useChartPanZoom } from '@/lib/useChartPanZoom';
import type { PriceRecord } from '@/types';

const fmtTick  = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtPrice = (v: number, cur: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export default function PriceChart({ data, currency, targetPrice }: { data: PriceRecord[]; currency: string; targetPrice: number }) {
  const allPoints = useMemo(() => data.map(r => ({
    time: new Date(r.fetchedAt).getTime(),
    price: r.lowestPrice,
    source: 'local' as const,
    fetchedAt: r.fetchedAt,
    airline: r.lowestPriceAirline,
  })), [data]);

  const dataMin = allPoints.length ? allPoints[0].time : 0;
  const dataMax = allPoints.length ? allPoints[allPoints.length - 1].time : Date.now();

  const { wrapperRef, domain, isZoomed, resetZoom } = useChartPanZoom(dataMin, dataMax);

  // Filter to visible range + 10% buffer so line extends to edges
  const chartData = useMemo(() => {
    if (domain[0] === 'dataMin') return allPoints;
    const [lo, hi] = domain as [number, number];
    const buf = (hi - lo) * 0.1;
    return allPoints.filter(p => p.time >= lo - buf && p.time <= hi + buf);
  }, [allPoints, domain]);

  return (
    <div ref={wrapperRef} className="relative select-none" style={{ touchAction: 'none' }}>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
          <XAxis dataKey="time" scale="time" type="number" domain={domain} tickFormatter={fmtTick}
            tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
            tickFormatter={v => fmtPrice(v, currency)} width={64} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <ReferenceLine y={targetPrice} stroke="#F59E0B" strokeDasharray="4 4">
            <Label value="Target" position="insideTopRight" fontSize={10} fill="#F59E0B" />
          </ReferenceLine>
          <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2}
            dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      {isZoomed && (
        <button onClick={resetZoom} aria-label="Reset zoom"
          className="absolute top-1 right-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-700/90 backdrop-blur border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500 dark:text-slate-400 shadow-sm">
          <RotateCcw size={9} /> Reset
        </button>
      )}
    </div>
  );
}
