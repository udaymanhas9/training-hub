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
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6', fontFamily: "'Barlow Condensed', sans-serif" }}>
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
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9', letterSpacing: 1 }}>{itemName}</div>
        {lowestPrice !== null && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', letterSpacing: 1 }}>
            LOW {formatMoney(lowestPrice)}
          </div>
        )}
      </div>

      {chartData.length < 2 ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13, letterSpacing: 1 }}>
          Not enough price history yet — updates will plot here.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#475569', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}
              axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `£${v}`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {lowestPrice !== null && (
              <ReferenceLine
                y={lowestPrice}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 6, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
