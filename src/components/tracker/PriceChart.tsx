'use client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid, Label,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import type { PriceRecord } from '@/types';

interface PriceChartProps {
  data: PriceRecord[];
  currency: string;
  targetPrice: number;
}

const fmtTick = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const fmtPrice = (v: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

export default function PriceChart({ data, currency, targetPrice }: PriceChartProps) {
  // Use millisecond timestamp as the unique x-axis key so multiple records
  // on the same calendar day each get their own distinct point and tooltip.
  const chartData = data.map(r => ({
    time: new Date(r.fetchedAt).getTime(), // unique per point
    price: r.lowestPrice,
    source: 'local',
    fetchedAt: r.fetchedAt,
    airline: r.lowestPriceAirline,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
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
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false} axisLine={false}
          tickFormatter={v => fmtPrice(v, currency)}
          width={64}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <ReferenceLine y={targetPrice} stroke="#F59E0B" strokeDasharray="4 4">
          <Label value="Target" position="insideTopRight" fontSize={10} fill="#F59E0B" />
        </ReferenceLine>
        <Line
          type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2}
          dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
