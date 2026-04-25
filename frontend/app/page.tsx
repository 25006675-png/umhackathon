'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Trash2, X } from 'lucide-react'

import type { Alert, FarmAnalysis } from '@/lib/types'
import {
  clearTodayReadings,
  DUMMY_ALERTS,
  DUMMY_ANALYSIS,
  getAlerts,
  getAnalysis,
  getHistory,
  type HistoryEntry,
} from '@/lib/api'
import AlertBanner from '@/components/AlertBanner'
import RiskGauge from '@/components/RiskGauge'
import SignalCard from '@/components/SignalCard'
import { FarmSceneHero, WheatIcon, EggIcon, ChickenIcon } from '@/components/FarmArt'

const SCORE_STORAGE_KEY = 'ternakAI_scoreRevealed'

function getStoredScoreRevealed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(SCORE_STORAGE_KEY)
    if (!raw) return false
    const { date } = JSON.parse(raw)
    return date === new Date().toISOString().slice(0, 10)
  } catch {
    return false
  }
}

function storeScoreRevealed() {
  try {
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10) }))
  } catch {}
}

const FLOCK_ID = 'flock_2026_batch3'


export default function TodayPage() {
  const [analysis, setAnalysis] = useState<FarmAnalysis>({ ...DUMMY_ANALYSIS, check_count: 0 })
  const [alerts, setAlerts] = useState<Alert[]>(DUMMY_ALERTS)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [scoreRevealed, setScoreRevealed] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    setScoreRevealed(getStoredScoreRevealed())
    async function load() {
      const [a, al, hist] = await Promise.allSettled([
        getAnalysis(FLOCK_ID),
        getAlerts(FLOCK_ID),
        getHistory(FLOCK_ID, 7),
      ])
      if (a.status === 'fulfilled') setAnalysis(a.value)
      if (al.status === 'fulfilled') setAlerts(al.value)
      if (hist.status === 'fulfilled') setHistory(hist.value)
      setLoading(false)
    }
    load()
  }, [])

  function revealScore() {
    setScoreRevealed(true)
    storeScoreRevealed()
  }

  async function handleClear() {
    if (!confirm('Clear all of today\'s data? This cannot be undone.')) return
    setClearing(true)
    await clearTodayReadings(FLOCK_ID)
    setAnalysis({ ...DUMMY_ANALYSIS, check_count: 0 })
    setScoreRevealed(false)
    try { localStorage.removeItem(SCORE_STORAGE_KEY) } catch {}
    setClearing(false)
  }

  const hasData = analysis.check_count > 0
  const isPreliminary = analysis.analysis_status === 'preliminary'
  const waterBaseline = analysis.baselines.water_intake_liters
  const waterValue = analysis.signals.water_intake_liters
  const waterDeviation =
    waterBaseline && waterValue != null ? (waterValue - waterBaseline) / waterBaseline : null
  const ventilation = analysis.signals.ventilation_condition ?? 'normal'
  const behaviourFlags = analysis.signals.behaviour_flags ?? []
  const activeAlert = alerts.find((a) => a.active) ?? null

  const yesterday = history.length >= 2 ? history[history.length - 2] : null
  const dayDelta = yesterday ? analysis.risk.score - yesterday.score : 0
  const trendArrow = dayDelta > 2 ? '↑' : dayDelta < -2 ? '↓' : '→'
  const trendLabel = dayDelta > 2 ? 'rising' : dayDelta < -2 ? 'falling' : 'stable'
  const trendColor = dayDelta > 2 ? '#dc2626' : dayDelta < -2 ? '#16a34a' : '#64748b'

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundColor: 'var(--earth-cream)' }}>
        <FarmSceneHero className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,247,230,0.94) 0%, rgba(255,247,230,0.75) 45%, rgba(255,247,230,0.15) 100%)',
          }}
        />
        <WheatIcon size={52} className="absolute top-6 right-6 md:right-16 opacity-70 floaty" />
        <EggIcon size={26} className="absolute top-24 right-28 opacity-50 hidden md:block" />
        <ChickenIcon size={44} className="absolute bottom-4 right-10 peck hidden md:block" />
        <div className="relative px-6 md:px-10 py-14 md:py-24 min-h-[360px] md:min-h-[440px] flex flex-col justify-center max-w-3xl">
          <h1
            className="font-display text-3xl md:text-5xl font-bold leading-[1.1] mb-4"
            style={{ color: 'var(--ink)' }}
          >
            Protect your flock<br />
            <span style={{ color: 'var(--earth-barn)' }}>before losses mount.</span>
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-xl mb-3" style={{ color: 'var(--ink-2)' }}>
            TernakAI watches temperature, feed intake, water, and mortality every day —
            turning raw numbers into a plain-language warning before disease takes hold.
          </p>
          <p className="text-sm md:text-base max-w-lg" style={{ color: 'var(--ink-3)' }}>
            Farm 001 · Flock 2026 Batch 3 · Day {analysis.flock_age_days} ·{' '}
            {analysis.flock_size.toLocaleString()} birds
            {loading && <span style={{ color: 'var(--risk-mod)' }}> · Loading…</span>}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Link
              href="/input"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--ink)', color: '#f8fafc', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }}
            >
              {hasData ? '✏️ Edit Today\'s Data' : '+ Log Today\'s Data'}
            </Link>
            {hasData && (
              <button
                type="button"
                onClick={handleClear}
                disabled={clearing}
                title="Clear today's data"
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ backgroundColor: '#fee2e2', color: '#be123c', border: '1px solid #fca5a5' }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1 rounded-md"
              style={{
                backgroundColor: isPreliminary ? '#fff7ed' : '#ecfdf5',
                color: isPreliminary ? '#c2410c' : '#166534',
                border: `1px solid ${isPreliminary ? '#fdba74' : '#86efac'}`,
              }}
            >
              {isPreliminary ? 'Preliminary Daily Analysis' : 'Official Daily Analysis'}
            </span>
            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
              {analysis.check_count} {analysis.check_count === 1 ? 'check' : 'checks'} today
            </span>
          </div>
        </div>
      </section>

      <div className="flex-1 px-4 md:px-8 py-5 md:py-6 space-y-5">
        {activeAlert && <AlertBanner alert={activeAlert} />}

        {/* Empty state */}
        {!loading && !hasData ? (
          <div
            className="rounded-2xl p-10 flex flex-col items-center text-center gap-4"
            style={{
              backgroundColor: 'var(--surface)',
              border: '2px dashed var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <ChickenIcon size={56} className="opacity-30" />
            <div>
              <div className="font-display text-xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                No data logged for today
              </div>
              <div className="text-sm" style={{ color: 'var(--ink-3)' }}>
                Log today's readings to calculate your flock's risk score and get an AI diagnosis.
              </div>
            </div>
            <Link
              href="/input"
              className="text-sm font-semibold px-6 py-3 rounded-xl transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--ink)', color: '#f8fafc' }}
            >
              Log Today's Data →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-[340px_1fr] gap-4 md:gap-6">
            {/* Left column: gauge */}
            <div className="flex flex-col gap-4">
              {loading ? (
                <GaugePlaceholder state="loading" />
              ) : !scoreRevealed ? (
                <GaugePlaceholder state="pending" onCalculate={revealScore} />
              ) : (
                <div className="flex flex-col gap-3">
                  <RiskGauge score={analysis.risk.score} level={analysis.risk.level} />
                  <button
                    type="button"
                    onClick={() => setScoreOpen(true)}
                    className="w-full text-sm font-semibold py-2.5 rounded-lg transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
                  >
                    View Details Scoring
                  </button>
                </div>
              )}

              {scoreRevealed && yesterday && (
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
                >
                  <div className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--ink-3)' }}>
                    vs Yesterday
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl font-bold" style={{ color: trendColor }}>
                      {trendArrow} {dayDelta > 0 ? '+' : ''}{dayDelta}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>
                      risk {trendLabel}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    Yesterday: {yesterday.score} ({yesterday.level})
                  </div>
                </div>
              )}
            </div>

            {/* Right column: signals + AI */}
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
                  Today's Signals
                </h2>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  <SignalCard
                    label="Temperature"
                    value={analysis.signals.temperature_celsius}
                    unit="C"
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
                    label="Water Intake"
                    value={analysis.signals.water_intake_liters ?? null}
                    unit="L"
                    baseline={analysis.baselines.water_intake_liters ?? 0}
                    deviation={waterDeviation ?? 0}
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
                  <StatusCard
                    label="Environment"
                    value={formatVentilation(ventilation)}
                    detail={ventilation === 'normal' ? 'No ventilation issue flagged today' : 'Air quality or ventilation needs attention'}
                    tone={ventilationTone(ventilation)}
                  />
                  <StatusCard
                    label="Behaviour"
                    value={behaviourFlags.length > 0 ? `${behaviourFlags.length} flagged` : 'Normal'}
                    detail={
                      behaviourFlags.length > 0
                        ? behaviourFlags.map(formatBehaviourFlag).join(', ')
                        : 'No abnormal behaviour checklist items'
                    }
                    tone={behaviourFlags.length > 0 ? 'warn' : 'ok'}
                  />
                  <StatusCard
                    label="Farmer Note"
                    value={analysis.signals.farmer_notes?.trim() ? 'Logged' : 'None'}
                    detail={analysis.signals.farmer_notes?.trim() ? analysis.signals.farmer_notes : 'No farmer note logged for today.'}
                    tone="muted"
                    showBadge={false}
                  />
                </div>
              </div>

              {/* CTA to Trends AI hub */}
              {scoreRevealed && (
                <Link
                  href="/trends"
                  className="flex items-center justify-between gap-3 rounded-xl p-4 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#ea580c', color: '#ffffff', boxShadow: 'var(--shadow-sm)' }}
                >
                  <div>
                    <div className="text-sm font-bold">AI Analysis &amp; Projected Scenario</div>
                    <div className="text-xs opacity-80 mt-0.5">Disease probability, actions, 7-day impact</div>
                  </div>
                  <ArrowRight size={18} className="flex-shrink-0" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {scoreOpen && (
        <ScoreBreakdownModal analysis={analysis} onClose={() => setScoreOpen(false)} />
      )}
    </div>
  )
}

function formatVentilation(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatBehaviourFlag(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function ventilationTone(value: string): 'ok' | 'warn' | 'danger' {
  if (value === 'normal') return 'ok'
  if (value === 'mild') return 'warn'
  return 'danger'
}

function GaugePlaceholder({
  state,
  onCalculate,
}: {
  state: 'loading' | 'pending'
  onCalculate?: () => void
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col items-center text-center gap-4"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Placeholder gauge ring */}
      <div
        className="w-28 h-28 rounded-full flex items-center justify-center"
        style={{
          border: '6px dashed var(--border)',
          backgroundColor: 'var(--surface-2, var(--bg))',
        }}
      >
        {state === 'loading' ? (
          <div
            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--ink-3)', borderTopColor: 'transparent' }}
          />
        ) : (
          <span className="font-display text-2xl font-bold" style={{ color: 'var(--border)' }}>?</span>
        )}
      </div>
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {state === 'loading' ? 'Loading data…' : 'Risk score pending'}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
          {state === 'loading' ? 'Fetching today\'s readings' : 'Tap to calculate from today\'s readings'}
        </div>
      </div>
      {state === 'pending' && onCalculate && (
        <button
          type="button"
          onClick={onCalculate}
          className="w-full text-sm font-semibold py-2.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--ink)', color: '#f8fafc' }}
        >
          Calculate Risk Score
        </button>
      )}
    </div>
  )
}

function StatusCard({
  label,
  value,
  detail,
  tone,
  showBadge = true,
}: {
  label: string
  value: string
  detail: string
  tone: 'ok' | 'warn' | 'danger' | 'muted'
  showBadge?: boolean
}) {
  const palette = {
    ok: { color: '#166534', bg: '#ecfdf5', border: '#86efac', badge: 'Stable' },
    warn: { color: '#c2410c', bg: '#fff7ed', border: '#fdba74', badge: 'Watch' },
    danger: { color: '#be123c', bg: '#fff1f2', border: '#fda4af', badge: 'Alert' },
    muted: { color: '#64748b', bg: 'var(--surface-2)', border: 'var(--border)', badge: 'Empty' },
  }[tone]

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="text-[0.65rem] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
        {label}
      </div>
      <div className="font-display text-xl font-bold leading-tight" style={{ color: 'var(--ink)' }}>
        {value}
      </div>
      <div className="text-[0.72rem] leading-relaxed min-h-[2.5rem]" style={{ color: 'var(--ink-3)' }}>
        {detail}
      </div>
      {showBadge && (
        <div
          className="mt-auto inline-flex items-center rounded-md px-2 py-1 text-[0.65rem] font-semibold"
          style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}`, color: palette.color }}
        >
          {palette.badge}
        </div>
      )}
    </div>
  )
}

function ScoreBreakdownModal({
  analysis,
  onClose,
}: {
  analysis: FarmAnalysis
  onClose: () => void
}) {
  const breakdown = analysis.risk.breakdown

  if (!breakdown) {
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/35 px-4 py-6" onClick={onClose}>
        <div
          className="w-full max-w-xl rounded-2xl p-5 md:p-6"
          style={{ backgroundColor: 'var(--surface)', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-3)' }}>
                Score Breakdown
              </div>
              <div className="font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                Risk {analysis.risk.score}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full"
              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--ink-2)' }}
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Detailed score inputs are not available for this response.
          </p>
        </div>
      </div>
    )
  }

  const rows = [
    {
      label: 'Feed intake',
      score: breakdown.feed.score,
      max: breakdown.feed.max,
      detail: breakdown.feed.drop_pct > 0 ? `Feed is down ${breakdown.feed.drop_pct}% versus baseline.` : 'Feed is at or above baseline.',
    },
    {
      label: 'Water intake',
      score: breakdown.water.score,
      max: breakdown.water.max,
      detail:
        breakdown.water.drop_pct == null
          ? 'Water was not logged.'
          : breakdown.water.drop_pct > 0
            ? `Water is down ${breakdown.water.drop_pct}% versus baseline.`
            : 'Water is at or above baseline.',
    },
    {
      label: 'Temperature',
      score: breakdown.temperature.score,
      max: breakdown.temperature.max,
      detail:
        breakdown.temperature.delta_c > 0
          ? `Temperature is ${breakdown.temperature.delta_c} C above baseline.`
          : breakdown.temperature.delta_c < 0
            ? `Temperature is ${Math.abs(breakdown.temperature.delta_c)} C below baseline.`
            : 'Temperature is on baseline.',
    },
    {
      label: 'Mortality',
      score: breakdown.mortality.score,
      max: breakdown.mortality.max,
      detail:
        breakdown.mortality.pct_flock_day > 0
          ? `${breakdown.mortality.pct_flock_day}% of the flock was lost today.`
          : 'No mortality increase recorded.',
    },
    {
      label: 'Air quality',
      score: breakdown.air_quality.score,
      max: breakdown.air_quality.max,
      detail: `Environment status: ${formatVentilation(breakdown.air_quality.condition)}.`,
    },
    {
      label: 'Behaviour',
      score: breakdown.behaviour.score,
      max: breakdown.behaviour.max,
      detail:
        breakdown.behaviour.flags.length > 0
          ? `Flags: ${breakdown.behaviour.flags.map(formatBehaviourFlag).join(', ')}.`
          : 'No abnormal behaviour flags were logged.',
    },
  ]

  const categoryTotal = rows.reduce((sum, row) => sum + row.score, 0)
  const finalScore = Math.min(100, categoryTotal + breakdown.combination_bonus + breakdown.sustained_bonus)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/35 px-4 py-6" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl p-5 md:p-6 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--surface)', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-3)' }}>
              Score Breakdown
            </div>
            <div className="font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>
              Risk {analysis.risk.score} ({analysis.risk.level})
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
              Built from today&apos;s inputs, environment, behaviour, and pattern bonuses.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full"
            style={{ backgroundColor: 'var(--surface-2)', color: 'var(--ink-2)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {row.label}
                  </div>
                  <div className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                    {row.detail}
                  </div>
                </div>
                <div className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                  {row.score}/{row.max}
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.max > 0 ? (row.score / row.max) * 100 : 0}%`,
                    backgroundColor: row.score > 0 ? '#ea580c' : '#94a3b8',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-5 rounded-xl p-4"
          style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74' }}
        >
          <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#9a3412' }}>
            Final Score
          </div>
          <div className="space-y-1 text-sm" style={{ color: '#7c2d12' }}>
            <div>Category total: {categoryTotal}</div>
            <div>Combination bonus: {breakdown.combination_bonus}</div>
            <div>Sustained trend bonus: {breakdown.sustained_bonus}</div>
            <div>Abnormal categories: {breakdown.abnormal_categories}</div>
            <div className="font-semibold pt-1">Final capped score: {finalScore}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
