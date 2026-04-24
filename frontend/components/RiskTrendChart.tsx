'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart,
} from 'recharts'

interface Props {
  scores: number[]
}

const ZONES = [
  { label: 'Low',      color: '#16a34a' },
  { label: 'Moderate', color: '#d97706' },
  { label: 'High',     color: '#ea580c' },
  { label: 'Critical', color: '#dc2626' },
]

export default function RiskTrendChart({ scores }: Props) {
  const data = scores.map((score, i) => ({ day: `D${i + 1}`, score }))

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-3)' }}>
          Risk Trend
        </h2>
        <div className="flex gap-3">
          {ZONES.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: color }} />
              <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            ticks={[0, 30, 60, 80, 100]}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v: number) => [v, 'Score']}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
            }}
          />
          <ReferenceLine y={30} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine y={60} stroke="#d97706" strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine y={80} stroke="#ea580c" strokeDasharray="4 4" strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#ea580c"
            strokeWidth={2.5}
            fill="url(#riskGrad)"
            dot={{ r: 4, fill: '#ea580c', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#ea580c', strokeWidth: 2, stroke: 'white' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
