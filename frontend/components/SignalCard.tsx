'use client'

interface Props {
  label: string
  value: number | null
  unit: string
  baseline: number
  deviation: number
  badDirection: 'up' | 'down'
}

function getStatus(deviation: number, badDirection: 'up' | 'down') {
  const isBad = badDirection === 'up' ? deviation > 0.05 : deviation < -0.05
  if (!isBad) return 'low'
  const abs = Math.abs(deviation)
  if (abs < 0.15) return 'mod'
  if (abs < 0.3)  return 'high'
  return 'crit'
}

const STATUS: Record<string, { color: string; bg: string; border: string; badge: string }> = {
  low:  { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', badge: '✓ Normal' },
  mod:  { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', badge: '⚠ Watch' },
  high: { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', badge: '↑ Alert' },
  crit: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', badge: '✕ Critical' },
}

export default function SignalCard({ label, value, unit, baseline, deviation, badDirection }: Props) {
  const status = getStatus(deviation, badDirection)
  const { color, bg, border, badge } = STATUS[status]
  const pct = Math.abs(deviation * 100).toFixed(0)
  const isUp = deviation > 0.02
  const displayValue = value == null ? '—' : value
  const formattedBaseline = baseline.toFixed(2)

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="text-[0.65rem] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
        {label}
      </div>

      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="font-display text-2xl font-bold leading-none" style={{ color: 'var(--ink)' }}>
          {displayValue}
        </span>
        <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{unit}</span>
      </div>

      <div className="text-[0.65rem]" style={{ color: 'var(--ink-3)' }}>
        Baseline: {formattedBaseline} {unit}
      </div>

      <div
        className="mt-1 flex items-center justify-between rounded-md px-2 py-1"
        style={{ backgroundColor: bg, border: `1px solid ${border}` }}
      >
        <span className="text-[0.65rem] font-semibold" style={{ color }}>
          {badge}
        </span>
        <span className="text-[0.65rem] font-bold" style={{ color }}>
          {isUp ? '↑' : '↓'}{pct}%
        </span>
      </div>
    </div>
  )
}
