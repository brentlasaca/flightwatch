'use client';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RotateCcw } from 'lucide-react';
import { ChartTooltip } from './ChartTooltip';
import { useChartPanZoom } from '@/lib/useChartPanZoom';
import type { PriceRecord } from '@/types';

const fmtTick  = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtPrice = (v: number, cur: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

interface Props { localHistory: PriceRecord[]; apiPriceHistory: [number, number][]; currency: string; targetPrice: number; typicalLow: number; typicalHigh: number; }
interface Pt { time: number; localPrice?: number; apiPrice?: number; source: 'local'|'api'; fetchedAt?: string; airline?: string; }

export default function InsightsChart({ localHistory, apiPriceHistory, currency, targetPrice, typicalLow, typicalHigh }: Props) {
  const allPoints = useMemo((): Pt[] => {
    const pts: Pt[] = localHistory.map(r => ({
      time: new Date(r.fetchedAt).getTime(), localPrice: r.lowestPrice,
      source: 'local', fetchedAt: r.fetchedAt, airline: r.lowestPriceAirline,
    }));
    apiPriceHistory.forEach(([ts, price]) => {
      const t = ts * 1000;
      if (!pts.some(p => Math.abs(p.time - t) < 1_800_000))
        pts.push({ time: t, apiPrice: price, source: 'api' });
    });
    return pts.sort((a, b) => a.time - b.time);
  }, [localHistory, apiPriceHistory]);

  const dataMin = allPoints.length ? allPoints[0].time : 0;
  const dataMax = allPoints.length ? allPoints[allPoints.length - 1].time : Date.now();

  const { wrapperRef, domain, isZoomed, resetZoom } = useChartPanZoom(dataMin, dataMax);

  const chartData = useMemo(() => {
    if (domain[0] === 'dataMin') return allPoints;
    const [lo, hi] = domain as [number, number];
    const buf = (hi - lo) * 0.1;
    return allPoints.filter(p => p.time >= lo - buf && p.time <= hi + buf);
  }, [allPoints, domain]);

  const prices = chartData.flatMap(p => [p.localPrice, p.apiPrice].filter((v): v is number => v !== undefined));
  const pad = prices.length ? (Math.max(...prices) - Math.min(...prices)) * 0.12 || 50 : 50;
  const yMin = prices.length ? Math.max(0, Math.floor(Math.min(...prices) - pad)) : 0;
  const yMax = prices.length ? Math.ceil(Math.max(...prices) + pad) : 1000;

  return (
    <div ref={wrapperRef} className="relative select-none" style={{ touchAction: 'none' }}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.4} />
          <XAxis dataKey="time" scale="time" type="number" domain={domain} tickFormatter={fmtTick}
            tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
            tickFormatter={v => fmtPrice(v, currency)} width={60} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          {typicalLow > 0 && typicalHigh > 0 && <ReferenceArea y1={typicalLow} y2={typicalHigh} fill="#3B82F6" fillOpacity={0.08} />}
          <ReferenceLine y={targetPrice} stroke="#F59E0B" strokeDasharray="5 3" strokeWidth={1.5}
            label={{ value: 'Target', position: 'insideTopRight', fontSize: 9, fill: '#F59E0B', offset: 4 }} />
          <Line type="monotone" dataKey="apiPrice" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 3"
            dot={false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="localPrice" stroke="#3B82F6" strokeWidth={2}
            dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
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
