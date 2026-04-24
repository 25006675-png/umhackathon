'use client'

import type { Projections } from '@/lib/types'

interface Props {
  projections: Projections
}

function fmt(n: number): string {
  return n.toLocaleString('en-MY')
}

export default function ProjectionSummary({ projections }: Props) {
  const [minPct, maxPct] = projections.mortality_range_percent
  const [minBirds, maxBirds] = projections.mortality_range_birds
  const [minLoss, maxLoss] = projections.financial_loss_rm
  const [minEarly, maxEarly] = projections.early_intervention_loss_rm
  const saveLow = Math.max(0, minLoss - maxEarly)
  const saveHigh = Math.max(0, maxLoss - minEarly)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3"
        style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)' }}
      >
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-3)' }}>
          {projections.time_horizon_days}-Day Forecast
        </span>
      </div>

      <div className="grid grid-cols-2">
        {/* Without action */}
        <div
          className="p-5"
          style={{ backgroundColor: '#fef2f2', borderRight: '1px solid #fca5a5' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#dc2626' }}>
              Without Action
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>Mortality Rate</div>
              <div className="font-display text-3xl font-bold leading-none" style={{ color: '#dc2626' }}>
                {minPct}–{maxPct}%
              </div>
              <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                {fmt(minBirds)}–{fmt(maxBirds)} birds
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>Estimated Loss</div>
              <div className="font-display text-lg font-bold" style={{ color: '#dc2626' }}>
                RM {fmt(minLoss)}–{fmt(maxLoss)}
              </div>
            </div>
          </div>
        </div>

        {/* With action */}
        <div className="p-5" style={{ backgroundColor: '#f0fdf4' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-600" />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#16a34a' }}>
              Act Now
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>Reduced Loss</div>
              <div className="font-display text-lg font-bold" style={{ color: '#16a34a' }}>
                RM {fmt(minEarly)}–{fmt(maxEarly)}
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>You Save</div>
              <div className="font-display text-3xl font-bold leading-none" style={{ color: '#16a34a' }}>
                RM {fmt(saveLow)}–{fmt(saveHigh)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
