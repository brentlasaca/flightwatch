'use client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid, Label,
} from 'recharts';
import type { PriceRecord } from '@/types';

interface PriceChartProps {
  data: PriceRecord[];
  currency: string;
  targetPrice: number;
}

interface TooltipPayload {
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  currency: string;
}

function CustomTooltip({ active, payload, label, currency }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const price = payload[0]?.value;
  const fmt = (v: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency,
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(v);
  return (
    <div style={{
      background: 'white', border: '1px solid #E2E8F0',
      borderRadius: 8, padding: '6px 10px', fontSize: 12,
    }}>
      <p style={{ color: '#64748B', marginBottom: 2 }}>{label}</p>
      {price !== undefined && (
        <p style={{ fontWeight: 600, color: '#0F172A' }}>{fmt(price)}</p>
      )}
    </div>
  );
}

export default function PriceChart({ data, currency, targetPrice }: PriceChartProps) {
  const fmt = (v: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency,
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(v);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const chartData = data.map(r => ({
    date: fmtDate(r.fetchedAt),
    price: r.lowestPrice,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmt}
          width={64}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <ReferenceLine y={targetPrice} stroke="#F59E0B" strokeDasharray="4 4">
          <Label value="Target" position="insideTopRight" fontSize={10} fill="#F59E0B" />
        </ReferenceLine>
        <Line
          type="monotone"
          dataKey="price"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
