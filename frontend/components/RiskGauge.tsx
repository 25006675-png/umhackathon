'use client'

import type { RiskLevel } from '@/lib/types'

interface Props {
  score: number
  level: RiskLevel
}

const RISK: Record<RiskLevel, { color: string; bg: string; border: string; label: string; desc: string }> = {
  Low:      { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: 'LOW',      desc: 'Flock is healthy' },
  Moderate: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: 'MODERATE', desc: 'Monitor closely' },
  High:     { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', label: 'HIGH',     desc: 'Action required' },
  Critical: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: 'CRITICAL', desc: 'Immediate action' },
}

function buildArc(score: number): string {
  if (score <= 0) return ''
  if (score >= 100) return 'M 20 100 A 80 80 0 1 1 180 100'
  const rad = (180 * (1 - score / 100) * Math.PI) / 180
  const x = (100 + 80 * Math.cos(rad)).toFixed(2)
  const y = (100 - 80 * Math.sin(rad)).toFixed(2)
  return `M 20 100 A 80 80 0 0 1 ${x} ${y}`
}

export default function RiskGauge({ score, level }: Props) {
  const { color, bg, border, label, desc } = RISK[level]
  const arcPath = buildArc(score)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Colored top strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <div className="px-6 pt-4 pb-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'var(--ink-3)' }}
          >
            Risk Score
          </span>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: bg, color, border: `1px solid ${border}` }}
          >
            {label}
          </span>
        </div>

        {/* Gauge SVG */}
        <div className="px-4">
          <svg viewBox="0 0 200 110" className="w-full" aria-hidden="true">
            {/* Track */}
            <path
              d="M 20 100 A 80 80 0 1 1 180 100"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Filled arc */}
            {arcPath && (
              <path
                d={arcPath}
                fill="none"
                stroke={color}
                strokeWidth="12"
                strokeLinecap="round"
              />
            )}
            {/* Threshold ticks */}
            {[30, 60, 80].map((t) => {
              const rad = (180 * (1 - t / 100) * Math.PI) / 180
              return (
                <line
                  key={t}
                  x1={(100 + 72 * Math.cos(rad)).toFixed(2)}
                  y1={(100 - 72 * Math.sin(rad)).toFixed(2)}
                  x2={(100 + 90 * Math.cos(rad)).toFixed(2)}
                  y2={(100 - 90 * Math.sin(rad)).toFixed(2)}
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />
              )
            })}
            {/* Score */}
            <text
              x="100" y="88"
              textAnchor="middle"
              fontSize="52"
              fontWeight="700"
              fontFamily="var(--font-spectral), Georgia, serif"
              fill={color}
            >
              {score}
            </text>
          </svg>
        </div>

        {/* Label + description */}
        <div className="text-center mt-1">
          <div className="text-base font-semibold font-display" style={{ color }}>
            {label}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
            {desc}
          </div>
        </div>

        {/* Threshold legend */}
        <div
          className="flex justify-between text-[0.6rem] mt-4 pt-3"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--ink-3)' }}
        >
          <span style={{ color: '#16a34a' }}>Low &lt;30</span>
          <span style={{ color: '#d97706' }}>Mod 30–60</span>
          <span style={{ color: '#ea580c' }}>High 60–80</span>
          <span style={{ color: '#dc2626' }}>Crit &gt;80</span>
        </div>
      </div>
    </div>
  )
}
