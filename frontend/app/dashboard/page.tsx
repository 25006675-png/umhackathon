'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { FarmAnalysis, GLMAnalysis, Alert } from '@/lib/types'
import {
  getAnalysis, getGLMAnalysis, getAlerts,
  DUMMY_ANALYSIS, DUMMY_GLM, DUMMY_ALERTS,
} from '@/lib/api'
import AlertBanner from '@/components/AlertBanner'
import RiskGauge from '@/components/RiskGauge'
import GLMToggle from '@/components/GLMToggle'
import SignalCard from '@/components/SignalCard'
import RiskTrendChart from '@/components/RiskTrendChart'
import GLMInsightPanel from '@/components/GLMInsightPanel'
import ActionList from '@/components/ActionList'
import ProjectionSummary from '@/components/ProjectionSummary'

const FLOCK_ID = 'flock_2026_batch3'

export default function DashboardPage() {
  const [analysis, setAnalysis] = useState<FarmAnalysis>(DUMMY_ANALYSIS)
  const [glm, setGlm] = useState<GLMAnalysis>(DUMMY_GLM)
  const [alerts, setAlerts] = useState<Alert[]>(DUMMY_ALERTS)
  const [glmEnabled, setGlmEnabled] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [a, g, al] = await Promise.allSettled([
        getAnalysis(FLOCK_ID),
        getGLMAnalysis(FLOCK_ID),
        getAlerts(FLOCK_ID),
      ])
      if (a.status === 'fulfilled') setAnalysis(a.value)
      if (g.status === 'fulfilled') setGlm(g.value)
      if (al.status === 'fulfilled') setAlerts(al.value)
      setLoading(false)
    }
    load()
  }, [])

  const activeAlert = alerts.find((a) => a.active) ?? null

  return (
    <div className="flex flex-col min-h-full">

      {/* Page header */}
      <div
        className="px-4 md:px-8 py-4 md:py-5 flex items-start justify-between gap-4"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
            Farm 001 · Flock 2026 Batch 3 · Day {analysis.flock_age_days} · {analysis.flock_size.toLocaleString()} birds
            {loading && <span style={{ color: 'var(--risk-mod)' }}> · Loading…</span>}
          </p>
        </div>
        <Link
          href="/input"
          className="flex-shrink-0 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--ink)', color: '#f8fafc' }}
        >
          <span>+</span>
          <span>Log Today&apos;s Data</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 md:px-8 py-5 md:py-6">
        <div className="flex flex-col md:grid md:grid-cols-[340px_1fr] md:gap-6 gap-4">

          {/* Left column — risk gauge, alert, toggle */}
          <div className="flex flex-col gap-4">
            {activeAlert && <AlertBanner alert={activeAlert} />}
            <RiskGauge score={analysis.risk.score} level={analysis.risk.level} />
            <GLMToggle enabled={glmEnabled} onToggle={setGlmEnabled} />
          </div>

          {/* Right column — readings, chart, insights */}
          <div className="flex flex-col gap-4">

            {/* Signal readings */}
            <div>
              <h2
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: 'var(--ink-3)' }}
              >
                Current Readings
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <SignalCard
                  label="Temperature"
                  value={analysis.signals.temperature_celsius}
                  unit="°C"
                  baseline={analysis.baselines.temperature_celsius}
                  deviation={analysis.deviations.temperature}
                  badDirection="up"
                />
                <SignalCard
                  label="Feed Intake"
                  value={analysis.signals.feed_intake_kg}
                  unit="kg"
                  baseline={analysis.baselines.feed_intake_kg}
                  deviation={analysis.deviations.feed_intake}
                  badDirection="down"
                />
                <SignalCard
                  label="Mortality"
                  value={analysis.signals.mortality_count}
                  unit="birds"
                  baseline={analysis.baselines.mortality_count}
                  deviation={analysis.deviations.mortality}
                  badDirection="up"
                />
              </div>
            </div>

            <RiskTrendChart scores={analysis.risk.previous_scores} />

            {glmEnabled ? (
              <>
                <GLMInsightPanel analysis={glm} />
                <ActionList actions={glm.recommendations} />
              </>
            ) : (
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px dashed var(--border-mid)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>
                  AI Analysis Disabled
                </div>
                <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  Numerical data only — no diagnostics or recommendations
                </div>
              </div>
            )}

            <ProjectionSummary projections={analysis.projections} />
          </div>
        </div>
      </div>
    </div>
  )
}
