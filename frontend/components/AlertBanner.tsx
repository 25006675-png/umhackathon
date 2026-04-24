'use client'

import type { Alert } from '@/lib/types'

interface Props {
  alert: Alert
}

export default function AlertBanner({ alert }: Props) {
  const isCritical = alert.risk_level === 'Critical'
  const color = isCritical ? '#dc2626' : '#ea580c'
  const bg = isCritical ? '#fef2f2' : '#fff7ed'
  const border = isCritical ? '#fca5a5' : '#fdba74'

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: bg, border: `1px solid ${border}`, boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
          style={{ backgroundColor: color }}
        >
          !
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color }}
          >
            {isCritical ? 'Critical Alert' : 'High Alert'}
          </div>
          <div className="text-sm font-semibold leading-snug" style={{ color: 'var(--ink)' }}>
            {alert.trigger}
          </div>
          <div className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            {alert.immediate_action}
          </div>
        </div>
      </div>
    </div>
  )
}
