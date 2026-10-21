'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { PricePoint, formatMoney } from '@/lib/finance';

interface PriceChartProps {
  itemName: string;
  history: PricePoint[];
  lowestPrice: number | null;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-4)', border: '1px solid rgb(var(--ink-rgb) / 0.1)', borderRadius: 6, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--info)', fontFamily: "'Barlow Condensed', sans-serif" }}>
        {formatMoney(payload[0].value)}
      </div>
    </div>
  );
}

export default function PriceChart({ itemName, history, lowestPrice }: PriceChartProps) {
  const chartData = history.map(p => ({
    date: (() => { try { return format(parseISO(p.checkedAt), 'dd MMM'); } catch { return p.checkedAt.slice(0, 10); } })(),
    price: p.price,
  }));

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid rgb(var(--ink-rgb) / 0.07)', borderRadius: 10, padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', letterSpacing: 1 }}>{itemName}</div>
        {lowestPrice !== null && (
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', letterSpacing: 1 }}>
            LOW {formatMoney(lowestPrice)}
          </div>
        )}
      </div>

      {chartData.length < 2 ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13, letterSpacing: 1 }}>
          Not enough price history yet — updates will plot here.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--ink-rgb) / 0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--text-faint)', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}
              axisLine={{ stroke: 'rgb(var(--ink-rgb) / 0.07)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-faint)', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `£${v}`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {lowestPrice !== null && (
              <ReferenceLine
                y={lowestPrice}
                stroke="var(--success)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey="price"
              stroke="var(--info)"
              strokeWidth={2}
              dot={{ fill: 'var(--info)', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 6, fill: 'var(--info)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
