'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  Eye,
  ListChecks,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { explainRangeIntelligenceWithAI, getAnalysis, getGLMAnalysis, getHistory, type HistoryEntry } from '@/lib/api'
import type { GLMAnalysis, Projections } from '@/lib/types'

type AITab = 'assessment' | 'diagnosis' | 'actions' | 'impact'

const AI_TABS: { key: AITab; label: string; icon: LucideIcon }[] = [
  { key: 'assessment', label: 'Overall Assessment', icon: Activity },
  { key: 'diagnosis', label: 'Disease Probability', icon: Eye },
  { key: 'actions', label: 'Recommended Actions', icon: ListChecks },
  { key: 'impact', label: 'Impact Comparison', icon: Zap },
]

const FLOCK_ID = 'flock_2026_batch3'

const RANGE_FILTERS = [
  { key: '3d', label: '3 Days', days: 3 },
  { key: '1w', label: '1 Week', days: 7 },
  { key: '2w', label: '2 Weeks', days: 14 },
] as const

const GRAPH_FILTERS = [
  { key: 'risk', label: 'Risk' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'feed', label: 'Feed Intake' },
  { key: 'water', label: 'Water Intake' },
  { key: 'mortality', label: 'Mortality' },
  { key: 'environment', label: 'Environment' },
  { key: 'behaviour', label: 'Behaviour' },
  { key: 'notes', label: 'Farmer Note' },
] as const

type RangeKey = (typeof RANGE_FILTERS)[number]['key']
type GraphKey = (typeof GRAPH_FILTERS)[number]['key']

function dayLabel(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function formatVentilation(value: string | null | undefined) {
  if (!value) return 'Not logged'
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatBehaviour(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function TrendsPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [projections, setProjections] = useState<Projections | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState<RangeKey>('1w')
  const [selectedGraphs, setSelectedGraphs] = useState<GraphKey[]>(
    GRAPH_FILTERS.map((filter) => filter.key),
  )
  const [aiText, setAiText] = useState('')
  const [glmData, setGlmData] = useState<GLMAnalysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<AITab>('assessment')

  function cacheKey(range: RangeKey) {
    return `ternakAI_trends_${FLOCK_ID}_${range}`
  }

  function loadCache(range: RangeKey) {
    try {
      const raw = sessionStorage.getItem(cacheKey(range))
      if (!raw) return
      const { aiText: t, glmData: g } = JSON.parse(raw)
      if (t) setAiText(t)
      if (g) setGlmData(g)
    } catch {}
  }

  function saveCache(range: RangeKey, text: string, glm: GLMAnalysis | null) {
    try {
      sessionStorage.setItem(cacheKey(range), JSON.stringify({ aiText: text, glmData: glm }))
    } catch {}
  }

  useEffect(() => {
    loadCache(selectedRange)
    Promise.allSettled([
      getHistory(FLOCK_ID, 30),
      getAnalysis(FLOCK_ID),
    ]).then(([histResult, analysisResult]) => {
      if (histResult.status === 'fulfilled') setHistory(histResult.value)
      if (analysisResult.status === 'fulfilled') setProjections(analysisResult.value.projections)
    }).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const rangeDays = RANGE_FILTERS.find((filter) => filter.key === selectedRange)?.days ?? 7
  const filteredHistory = useMemo(() => history.slice(-rangeDays), [history, rangeDays])

  const data = useMemo(
    () =>
      filteredHistory.map((entry) => ({
        day: dayLabel(entry.timestamp),
        score: entry.score,
        temp: entry.temperature_celsius ?? null,
        feed: entry.feed_intake_kg ?? null,
        water: entry.water_intake_liters ?? null,
        mortality: entry.mortality,
        ventilation: formatVentilation(entry.ventilation_condition),
        behaviourCount: entry.behaviour_flags?.length ?? 0,
        behaviourFlags: entry.behaviour_flags ?? [],
        note: entry.farmer_notes?.trim() || 'No farmer note',
      })),
    [filteredHistory],
  )

  async function generateAI() {
    if (!filteredHistory.length) return
    setAiLoading(true)
    setAiText('')
    setGlmData(null)
    setActiveTab('assessment')
    const rangeLabel = RANGE_FILTERS.find((filter) => filter.key === selectedRange)?.label ?? '1 Week'
    const [trendsResult, glmResult] = await Promise.allSettled([
      explainRangeIntelligenceWithAI({ flockId: FLOCK_ID, rangeLabel, history: filteredHistory }),
      getGLMAnalysis(FLOCK_ID),
    ])
    const newText = trendsResult.status === 'fulfilled' ? trendsResult.value : ''
    const newGlm = glmResult.status === 'fulfilled' ? glmResult.value : null
    setAiText(newText)
    setGlmData(newGlm)
    saveCache(selectedRange, newText, newGlm)
    setAiLoading(false)
  }

  // When range changes, load any cached AI for that range (clears if none)
  function handleRangeChange(range: RangeKey) {
    setSelectedRange(range)
    setAiText('')
    setGlmData(null)
    loadCache(range)
  }

  const headline = useMemo(() => {
    if (filteredHistory.length < 2) return null
    const first = filteredHistory[0]
    const last = filteredHistory[filteredHistory.length - 1]
    if (last.score > first.score + 8) {
      return {
        tone: 'bad' as const,
        text: `Across ${rangeDays} days, risk climbed from ${first.score} to ${last.score}. This window is useful for cross-signal AI reasoning.`,
      }
    }
    if (last.score > first.score) {
      return {
        tone: 'warn' as const,
        text: `Risk is trending upward over this ${rangeDays}-day window. Check the AI pattern analysis below for linked signals.`,
      }
    }
    return {
      tone: 'ok' as const,
      text: `This ${rangeDays}-day window is stable or improving overall. Use the AI analysis below to confirm what changed first.`,
    }
  }, [filteredHistory, rangeDays])

  function toggleGraph(key: GraphKey) {
    setSelectedGraphs((current) => {
      if (current.includes(key)) {
        return current.length === 1 ? current : current.filter((item) => item !== key)
      }
      return [...current, key]
    })
  }

  const latest = filteredHistory[filteredHistory.length - 1] ?? null
  const hasTemperatureData = data.some((entry) => entry.temp != null)
  const hasFeedData = data.some((entry) => entry.feed != null)
  const hasWaterData = data.some((entry) => entry.water != null)
  const hasMortalityData = data.some((entry) => entry.mortality != null)
  const tempDomain = numericDomain(data.map((entry) => entry.temp), 1, [28, 35])
  const feedDomain = numericDomain(data.map((entry) => entry.feed), 2, [0, 60])
  const waterDomain = numericDomain(data.map((entry) => entry.water), 3, [0, 120])
  const mortalityDomain = numericDomain(data.map((entry) => entry.mortality), 1, [0, 5], true)

  return (
    <div className="flex flex-col min-h-full">
      <div
        className="px-4 md:px-8 py-4 md:py-5"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="font-display text-xl md:text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <TrendingUp size={20} style={{ color: '#ea580c' }} />
          Trends
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
          Multi-variable timeline, graph filters, and AI reasoning from the selected time window.
          {loading && <span style={{ color: 'var(--risk-mod)' }}> · Loading...</span>}
        </p>
      </div>

      <div className="flex-1 px-4 md:px-8 py-5 md:py-6 space-y-5">
        {headline && (
          <div
            className="rounded-xl p-4 md:p-5"
            style={{
              backgroundColor:
                headline.tone === 'bad' ? '#fff1f2' : headline.tone === 'warn' ? '#fff7ed' : '#ecfdf5',
              border: `1.5px solid ${
                headline.tone === 'bad' ? '#fda4af' : headline.tone === 'warn' ? '#fdba74' : '#86efac'
              }`,
            }}
          >
            <div
              className="text-[10px] font-bold tracking-widest uppercase mb-1"
              style={{
                color:
                  headline.tone === 'bad' ? '#be123c' : headline.tone === 'warn' ? '#c2410c' : '#166534',
              }}
            >
              {headline.tone === 'bad' ? 'Window Alert' : headline.tone === 'warn' ? 'Watch' : 'Stable'}
            </div>
            <div
              className="text-sm md:text-base font-semibold"
              style={{
                color:
                  headline.tone === 'bad' ? '#881337' : headline.tone === 'warn' ? '#7c2d12' : '#14532d',
              }}
            >
              {headline.text}
            </div>
          </div>
        )}

        <div
          className="rounded-xl p-4 md:p-5"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-3)' }}>
                Analysis Window
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Both the graphs and AI reasoning use the same selected period.
              </div>
            </div>
            {latest && (
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                Latest in window: Risk {latest.score} ({latest.level}) · {latest.top_driver ?? 'Normal'}
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {RANGE_FILTERS.map((filter) => {
              const active = selectedRange === filter.key
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => handleRangeChange(filter.key)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: active ? '#0f172a' : 'var(--surface-2)',
                    color: active ? '#ffffff' : 'var(--ink-2)',
                    border: `1px solid ${active ? '#0f172a' : 'var(--border)'}`,
                  }}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Generate button — shown when no AI output yet */}
        {!aiText && !glmData && !aiLoading && (
          <div
            className="rounded-2xl p-6 flex flex-col items-center text-center gap-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div>
              <div className="font-display text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                AI Analysis Hub
              </div>
              <div className="text-sm max-w-sm" style={{ color: 'var(--ink-3)' }}>
                Generate a full AI read: pattern analysis, disease probability, recommended actions, and 7-day impact for the selected window.
              </div>
            </div>
            <button
              type="button"
              onClick={generateAI}
              disabled={!filteredHistory.length}
              className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
            >
              <Sparkles size={15} />
              Generate AI Analysis
            </button>
          </div>
        )}

        {/* Loading state */}
        {aiLoading && (
          <div
            className="rounded-2xl p-6 flex items-center justify-center gap-3"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#ea580c', animationDelay: `${delay}ms` }} />
              ))}
            </div>
            <span className="text-sm" style={{ color: 'var(--ink-3)' }}>Analysing {selectedRange} of data…</span>
          </div>
        )}

        {/* AI Hub — tabs shown after generation */}
        {(aiText || glmData) && !aiLoading && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            {/* Tab bar */}
            <div
              className="flex items-center gap-1 px-4 pt-4 pb-0 overflow-x-auto"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              {AI_TABS.map((tab) => {
                const active = activeTab === tab.key
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-t-lg whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: active ? '#ea580c' : 'transparent',
                      color: active ? '#ffffff' : 'var(--ink-3)',
                      borderBottom: active ? '2px solid #ea580c' : '2px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                )
              })}
              <div className="ml-auto pb-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setAiText(''); setGlmData(null) }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink-2)' }}
                >
                  Regenerate
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div className="p-5 md:p-6">
              {activeTab === 'assessment' && (
                <>
                  <AssessmentTab
                    interpretation={glmData?.interpretation ?? ''}
                    patternText={extractSection(aiText, 'Pattern Analysis')}
                  />
                  <FollowUpButton tab="assessment" glmData={glmData} aiText={aiText} rangeLabel={RANGE_FILTERS.find(f => f.key === selectedRange)?.label ?? '1 Week'} />
                </>
              )}
              {activeTab === 'diagnosis' && (
                <>
                  <DiagnosisTab hypotheses={glmData?.hypothesis ?? []} />
                  <FollowUpButton tab="diagnosis" glmData={glmData} aiText={aiText} rangeLabel={RANGE_FILTERS.find(f => f.key === selectedRange)?.label ?? '1 Week'} />
                </>
              )}
              {activeTab === 'actions' && (
                <>
                  <ActionsTab
                    structuredRecs={glmData?.recommendations ?? []}
                    textContent={extractSection(aiText, 'Recommended Next Actions')}
                  />
                  <FollowUpButton tab="actions" glmData={glmData} aiText={aiText} rangeLabel={RANGE_FILTERS.find(f => f.key === selectedRange)?.label ?? '1 Week'} />
                </>
              )}
              {activeTab === 'impact' && (
                <>
                  <ProjectedScenarioBlock
                    loading={false}
                    content={extractSection(aiText, 'Projected Scenario')}
                    projections={projections}
                    bare
                  />
                  <FollowUpButton tab="impact" glmData={glmData} aiText={aiText} rangeLabel={RANGE_FILTERS.find(f => f.key === selectedRange)?.label ?? '1 Week'} />
                </>
              )}
            </div>
          </div>
        )}

        <div
          className="rounded-xl p-4 md:p-5"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-3)' }}>
                Graph Filter
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Choose which signals to compare inside the selected analysis window.
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {GRAPH_FILTERS.map((filter) => {
              const active = selectedGraphs.includes(filter.key)
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => toggleGraph(filter.key)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: active ? '#ea580c' : 'var(--surface-2)',
                    color: active ? '#ffffff' : 'var(--ink-2)',
                    border: `1px solid ${active ? '#ea580c' : 'var(--border)'}`,
                  }}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {selectedGraphs.includes('risk') && (
            <ChartCard title="Risk Score" hint="This is the main standout panel for the selected time window." className="md:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 30, 60, 80, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={30} stroke="#16a34a" strokeDasharray="4 4" />
                  <ReferenceLine y={60} stroke="#d97706" strokeDasharray="4 4" />
                  <ReferenceLine y={80} stroke="#ea580c" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="score" stroke="#ea580c" strokeWidth={2.5} fill="url(#riskGrad)" dot={{ r: 3, fill: '#ea580c' }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {selectedGraphs.includes('temperature') && (
            <ChartCard title="Temperature" hint="Barn temperature (C).">
              {hasTemperatureData ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={tempDomain} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="temp" stroke="#dc2626" strokeWidth={2} fill="url(#tempGrad)" dot={{ r: 3, fill: '#dc2626' }} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyMetricState metric="temperature" />
              )}
            </ChartCard>
          )}

          {selectedGraphs.includes('feed') && (
            <ChartCard title="Feed Intake" hint="Daily feed in kg.">
              {hasFeedData ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="feedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={feedDomain} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="feed" stroke="#0891b2" strokeWidth={2} fill="url(#feedGrad)" dot={{ r: 3, fill: '#0891b2' }} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyMetricState metric="feed intake" />
              )}
            </ChartCard>
          )}

          {selectedGraphs.includes('water') && (
            <ChartCard title="Water Intake" hint="Daily water in L.">
              {hasWaterData ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={waterDomain} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="water" stroke="#2563eb" strokeWidth={2} fill="url(#waterGrad)" dot={{ r: 3, fill: '#2563eb' }} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyMetricState metric="water intake" />
              )}
            </ChartCard>
          )}

          {selectedGraphs.includes('mortality') && (
            <ChartCard title="Mortality" hint="Dead birds per day.">
              {hasMortalityData ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mortGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#be123c" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#be123c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} domain={mortalityDomain} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="mortality" stroke="#be123c" strokeWidth={2} fill="url(#mortGrad)" dot={{ r: 3, fill: '#be123c' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyMetricState metric="mortality" />
              )}
            </ChartCard>
          )}

          {selectedGraphs.includes('environment') && (
            <ObservationCard
              title="Environment"
              hint="Daily ventilation or air-quality status."
              items={data.map((entry) => ({
                day: entry.day,
                value: entry.ventilation,
                tone:
                  entry.ventilation === 'Normal'
                    ? 'ok'
                    : entry.ventilation === 'Mild'
                      ? 'warn'
                      : entry.ventilation === 'Not logged'
                        ? 'muted'
                        : 'danger',
              }))}
            />
          )}

          {selectedGraphs.includes('behaviour') && (
            <ObservationCard
              title="Behaviour"
              hint="Checklist flags captured by the farmer."
              items={data.map((entry) => ({
                day: entry.day,
                value:
                  entry.behaviourCount > 0
                    ? entry.behaviourFlags.map(formatBehaviour).join(', ')
                    : 'No abnormal behaviour',
                tone: entry.behaviourCount > 0 ? 'warn' : 'ok',
              }))}
            />
          )}

          {selectedGraphs.includes('notes') && (
            <ObservationCard
              title="Farmer Note"
              hint="Daily free-text context from the farm."
              className="md:col-span-2"
              items={data.map((entry) => ({
                day: entry.day,
                value: entry.note,
                tone: entry.note === 'No farmer note' ? 'muted' : 'ok',
              }))}
            />
          )}
        </div>
      </div>

    </div>
  )
}

const tooltipStyle: React.CSSProperties = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
}

function ChartCard({
  title,
  hint,
  children,
  className,
}: {
  title: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl p-4 md:p-5 ${className ?? ''}`}
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="mb-3">
        <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-3)' }}>
          {title}
        </div>
        {hint && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function ObservationCard({
  title,
  hint,
  items,
  className,
}: {
  title: string
  hint?: string
  items: Array<{ day: string; value: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }>
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const visibleItems = expanded ? items : items.slice(-3)

  return (
    <ChartCard title={title} hint={hint} className={className}>
      <div className="space-y-2">
        {visibleItems.map((item) => {
          const palette =
            item.tone === 'ok'
              ? { bg: '#ecfdf5', border: '#86efac', color: '#166534' }
              : item.tone === 'warn'
                ? { bg: '#fff7ed', border: '#fdba74', color: '#c2410c' }
                : item.tone === 'danger'
                  ? { bg: '#fff1f2', border: '#fda4af', color: '#be123c' }
                  : { bg: 'var(--surface-2)', border: 'var(--border)', color: 'var(--ink-3)' }

          return (
            <div
              key={`${title}-${item.day}`}
              className="flex items-start gap-3 rounded-lg px-3 py-2"
              style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}
            >
              <div className="text-[11px] font-semibold min-w-12" style={{ color: 'var(--ink-3)' }}>
                {item.day}
              </div>
              <div className="text-sm leading-relaxed min-w-0 flex-1" style={{ color: palette.color }}>
                {item.value}
              </div>
            </div>
          )
        })}
      </div>

      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 w-full text-sm font-semibold py-2.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink)' }}
        >
          {expanded ? 'Show less' : 'Show older days'}
        </button>
      )}
    </ChartCard>
  )
}

function AssessmentTab({
  interpretation,
  patternText,
}: {
  interpretation: string
  patternText: string
}) {
  const patternItems = useMemo(() => parseAIItems(patternText), [patternText])
  return (
    <div className="space-y-5">
      {interpretation && (
        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase mb-2" style={{ color: '#c2410c' }}>
            Situation Assessment
          </div>
          <p className="text-sm leading-7" style={{ color: 'var(--ink-2)' }}>
            {interpretation}
          </p>
        </div>
      )}
      {patternItems.length > 0 && (
        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: '#c2410c' }}>
            Multi-Signal Pattern Analysis
          </div>
          <ol className="space-y-3">
            {patternItems.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: '#fff7ed', border: '1px solid #fde5c8', borderLeft: '4px solid #ea580c' }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', color: '#fff' }}
                >
                  {idx + 1}
                </div>
                <p className="text-sm leading-7 pt-0.5" style={{ color: '#7c2d12' }}>{item}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {!interpretation && patternItems.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No assessment generated yet.</p>
      )}
    </div>
  )
}

function DiagnosisTab({ hypotheses }: { hypotheses: GLMAnalysis['hypothesis'] }) {
  if (!hypotheses.length) {
    return <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No disease hypotheses generated yet.</p>
  }
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#c2410c' }}>
        Probable Diagnosis — AI Reasoning
      </div>
      {hypotheses.map((h, i) => {
        const pct = Math.round(h.confidence * 100)
        const color = pct >= 70 ? '#be123c' : pct >= 50 ? '#c2410c' : '#b45309'
        const bg = pct >= 70 ? '#fff1f2' : pct >= 50 ? '#fff7ed' : '#fefce8'
        const border = pct >= 70 ? '#fda4af' : pct >= 50 ? '#fdba74' : '#fde68a'
        return (
          <div
            key={i}
            className="rounded-2xl p-5"
            style={{ backgroundColor: bg, border: `1.5px solid ${border}` }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-display text-base font-bold" style={{ color }}>
                  {h.disease}
                </div>
                {h.reasoning && (
                  <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--ink-3)' }}>
                    {h.reasoning}
                  </p>
                )}
              </div>
              <div
                className="font-display font-black text-2xl flex-shrink-0"
                style={{ color }}
              >
                {pct}%
              </div>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            {h.citations && h.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {h.citations.map((c, ci) => (
                  <span
                    key={ci}
                    className="text-[10px] px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: '#ffffff', border: `1px solid ${border}`, color: 'var(--ink-3)' }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ActionsTab({
  structuredRecs,
  textContent,
}: {
  structuredRecs: string[]
  textContent: string
}) {
  // Prefer structured recs from GLM analyse; fall back to parsed text
  const items = useMemo(() => {
    if (structuredRecs.length > 0) return structuredRecs
    return parseAIItems(textContent)
  }, [structuredRecs, textContent])

  if (!items.length) {
    return <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No recommended actions generated yet.</p>
  }

  return (
    <ol className="space-y-3.5">
      {items.map((item, idx) => {
        const label = String(idx + 1).padStart(2, '0')
        return (
          <li
            key={idx}
            className="rounded-2xl pl-5 pr-4 py-4 flex items-start gap-4"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #dbeafe',
              borderLeft: '4px solid #2563eb',
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-base flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                boxShadow: '0 4px 10px rgba(37,99,235,0.25)',
                letterSpacing: '0.02em',
              }}
            >
              {label}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: '#2563eb' }}>
                Step {label}
              </div>
              <div className="text-sm md:text-[15px] leading-7" style={{ color: '#1e3a8a' }}>
                {item}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function buildFollowUpContext(
  tab: AITab,
  glmData: GLMAnalysis | null,
  aiText: string,
  rangeLabel: string,
): string {
  const assessment = glmData?.interpretation
    ? `Overall Assessment: ${glmData.interpretation}`
    : extractSection(aiText, 'Pattern Analysis')
      ? `Pattern Analysis: ${extractSection(aiText, 'Pattern Analysis').slice(0, 300)}`
      : ''

  const diagnoses = glmData?.hypothesis.length
    ? `Disease Probability:\n${glmData.hypothesis.map((h) => `- ${h.disease}: ${Math.round(h.confidence * 100)}% — ${h.reasoning}`).join('\n')}`
    : ''

  const actions = extractSection(aiText, 'Recommended Next Actions')
    ? `Recommended Next Actions:\n${extractSection(aiText, 'Recommended Next Actions').slice(0, 400)}`
    : ''

  const scenario = extractSection(aiText, 'Projected Scenario')
    ? `Projected Scenario: ${extractSection(aiText, 'Projected Scenario').slice(0, 200)}`
    : ''

  const focusMap: Record<AITab, string> = {
    assessment: 'the overall assessment and pattern analysis',
    diagnosis: 'the disease probability and diagnosis',
    actions: 'the recommended actions',
    impact: 'the projected scenario and financial impact',
  }

  const parts = [
    `Context from my ${rangeLabel} flock analysis:`,
    assessment,
    diagnoses,
    actions,
    scenario,
    '',
    `I would like to ask about ${focusMap[tab]}:`,
    '',
  ].filter(Boolean)

  return parts.join('\n')
}

function FollowUpButton({
  tab,
  glmData,
  aiText,
  rangeLabel,
}: {
  tab: AITab
  glmData: GLMAnalysis | null
  aiText: string
  rangeLabel: string
}) {
  const context = buildFollowUpContext(tab, glmData, aiText, rangeLabel)
  return (
    <div className="mt-6 pt-4" style={{ borderTop: '1px dashed var(--border)' }}>
      <div className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
        Have a question about this analysis?
      </div>
      <Link
        href={`/chat?q=${encodeURIComponent(context)}`}
        className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
      >
        <MessageCircle size={14} />
        Ask AI a follow-up question
      </Link>
      <p className="text-[10px] mt-2" style={{ color: 'var(--ink-3)' }}>
        The full context will be pre-loaded — edit the message before sending.
      </p>
    </div>
  )
}

function AIBlock({
  eyebrow,
  title,
  content,
  loading,
  variant,
  bare = false,
}: {
  eyebrow: string
  title: string
  content: string
  loading: boolean
  variant: 'pattern' | 'actions'
  bare?: boolean
}) {
  const palette = variant === 'pattern'
    ? {
        bg: 'linear-gradient(180deg, #fff7ed 0%, #fffaf5 100%)',
        border: '#fdba74',
        accentFrom: '#ea580c',
        accentTo: '#f97316',
        title: '#9a3412',
        subtitle: '#c2410c',
        text: '#7c2d12',
        itemBg: '#ffffff',
        itemBorder: '#fde5c8',
        badgeShadow: 'rgba(234, 88, 12, 0.25)',
      }
    : {
        bg: 'linear-gradient(180deg, #eff6ff 0%, #f8fbff 100%)',
        border: '#93c5fd',
        accentFrom: '#2563eb',
        accentTo: '#3b82f6',
        title: '#1d4ed8',
        subtitle: '#2563eb',
        text: '#1e3a8a',
        itemBg: '#ffffff',
        itemBorder: '#dbeafe',
        badgeShadow: 'rgba(37, 99, 235, 0.25)',
      }

  const items = useMemo(() => (loading ? [] : parseAIItems(content)), [content, loading])
  const HeadIcon = variant === 'actions' ? ListChecks : Sparkles

  const inner = (
    <>
      {!bare && (
        <div className="flex items-center gap-3 pb-4 mb-5" style={{ borderBottom: `1px dashed ${palette.border}` }}>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${palette.accentFrom}, ${palette.accentTo})`,
              color: '#ffffff',
              boxShadow: `0 6px 14px ${palette.badgeShadow}`,
            }}
          >
            <HeadIcon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: palette.subtitle }}>
              {eyebrow}
            </div>
            <div className="font-display text-lg md:text-xl font-bold leading-tight mt-0.5" style={{ color: palette.title }}>
              {title}
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <AISkeleton />
      ) : items.length === 0 ? (
        <div className="text-sm leading-7" style={{ color: palette.text }}>
          No analysis generated for this window yet.
        </div>
      ) : (
        <ol className="space-y-3.5">
          {items.map((item, idx) => (
            <AIItem key={idx} index={idx} text={item} variant={variant} palette={palette} />
          ))}
        </ol>
      )}
    </>
  )

  if (bare) return inner

  return (
    <div
      className="rounded-2xl p-5 md:p-6 relative overflow-hidden"
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${palette.accentFrom}, ${palette.accentTo})` }} />
      {inner}
    </div>
  )
}

function AIItem({
  index,
  text,
  variant,
  palette,
}: {
  index: number
  text: string
  variant: 'pattern' | 'actions'
  palette: {
    accentFrom: string
    accentTo: string
    title: string
    text: string
    itemBg: string
    itemBorder: string
    badgeShadow: string
  }
}) {
  const label = String(index + 1).padStart(2, '0')

  return (
    <li
      className="relative rounded-2xl pl-5 pr-4 py-4 md:py-5 flex items-start gap-4"
      style={{
        backgroundColor: palette.itemBg,
        border: `1px solid ${palette.itemBorder}`,
        borderLeft: `4px solid ${palette.accentFrom}`,
      }}
    >
      <div
        className="flex flex-col items-center flex-shrink-0"
        style={{ minWidth: 44 }}
      >
        {variant === 'actions' ? (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-base"
            style={{
              background: `linear-gradient(135deg, ${palette.accentFrom}, ${palette.accentTo})`,
              color: '#ffffff',
              boxShadow: `0 4px 10px ${palette.badgeShadow}`,
              letterSpacing: '0.02em',
            }}
          >
            {label}
          </div>
        ) : (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${palette.accentFrom}, ${palette.accentTo})`,
              color: '#ffffff',
              boxShadow: `0 4px 10px ${palette.badgeShadow}`,
            }}
          >
            <Eye size={18} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div
          className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1"
          style={{ color: palette.accentFrom }}
        >
          {variant === 'actions' ? `Step ${label}` : `Observation ${label}`}
        </div>
        <div className="text-sm md:text-[15px] leading-7" style={{ color: palette.text }}>
          {text}
        </div>
      </div>
    </li>
  )
}

function AISkeleton() {
  return (
    <div className="space-y-3.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl px-5 py-5 animate-pulse flex items-start gap-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="w-11 h-11 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }} />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 rounded w-1/3" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }} />
            <div className="h-3 rounded w-11/12" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
            <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function parseAIItems(body: string): string[] {
  if (!body) return []

  // Insert line breaks before inline numbered markers only (e.g., "...foo. 2. bar" -> "...foo.\n2. bar").
  // Avoid splitting on dashes mid-sentence (e.g. "**Bold** - description") — too ambiguous.
  const normalized = body
    .replace(/[ \t]+(?=\d+[.)]\s+\S)/g, '\n')

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean)
  const items: string[] = []
  let buffer = ''

  const flush = () => {
    const cleaned = buffer.trim()
    if (cleaned) items.push(cleaned)
    buffer = ''
  }

  const bulletRe = /^(?:[-*•]|\d+[.)])\s+/

  for (const line of lines) {
    if (bulletRe.test(line)) {
      flush()
      buffer = line.replace(bulletRe, '')
    } else if (buffer) {
      buffer += ' ' + line
    } else {
      buffer = line
      flush()
    }
  }
  flush()

  if (items.length === 0 && body.trim()) {
    return body
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return items
}

const KNOWN_SECTIONS = ['Pattern Analysis', 'Recommended Next Actions', 'Projected Scenario']

function ProjectedScenarioBlock({
  loading,
  content,
  projections,
  bare = false,
}: {
  loading: boolean
  content: string
  projections: Projections | null
  bare?: boolean
}) {
  const p = projections
  const savingsHigh = p ? p.financial_loss_rm[1] - p.early_intervention_loss_rm[1] : null
  const savingsPct = p && p.financial_loss_rm[1] > 0
    ? Math.round((savingsHigh! / p.financial_loss_rm[1]) * 100)
    : null

  const body = (
    <div className="space-y-5">
      {/* Two-column impact cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 md:p-5 flex flex-col gap-3" style={{ background: 'linear-gradient(180deg, #fff1f2 0%, #fff5f5 100%)', border: '1.5px solid #fda4af' }}>
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase flex items-center gap-1.5" style={{ color: '#be123c' }}>
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#be123c' }} />
            Without Action
          </div>
          <div>
            <div className="font-display font-black leading-none" style={{ fontSize: '2rem', color: '#881337' }}>
              {p ? `${p.mortality_range_percent[0]}–${p.mortality_range_percent[1]}%` : '—'}
            </div>
            <div className="text-xs mt-1" style={{ color: '#be123c' }}>of flock lost</div>
          </div>
          <div style={{ borderTop: '1px solid #fecdd3', paddingTop: '0.75rem' }}>
            <div className="font-display font-bold leading-tight" style={{ fontSize: '1.25rem', color: '#881337' }}>
              {p ? `RM ${p.financial_loss_rm[0].toLocaleString()} – ${p.financial_loss_rm[1].toLocaleString()}` : '—'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#be123c' }}>financial loss</div>
          </div>
          <div style={{ borderTop: '1px solid #fecdd3', paddingTop: '0.75rem' }}>
            <div className="font-display font-bold" style={{ fontSize: '1.1rem', color: '#881337' }}>
              {p ? `${p.mortality_range_birds[0].toLocaleString()} – ${p.mortality_range_birds[1].toLocaleString()}` : '—'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#be123c' }}>birds at risk</div>
          </div>
        </div>

        <div className="rounded-2xl p-4 md:p-5 flex flex-col gap-3" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #f7fef9 100%)', border: '1.5px solid #86efac' }}>
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase flex items-center gap-1.5" style={{ color: '#16a34a' }}>
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#16a34a' }} />
            Act Now
          </div>
          <div>
            <div className="font-display font-black leading-none" style={{ fontSize: '2rem', color: '#14532d' }}>
              {p ? `${p.mortality_range_percent[0] > 10 ? '5–10' : '1–5'}%` : '—'}
            </div>
            <div className="text-xs mt-1" style={{ color: '#16a34a' }}>of flock lost</div>
          </div>
          <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: '0.75rem' }}>
            <div className="font-display font-bold leading-tight" style={{ fontSize: '1.25rem', color: '#14532d' }}>
              {p ? `RM ${p.early_intervention_loss_rm[0].toLocaleString()} – ${p.early_intervention_loss_rm[1].toLocaleString()}` : '—'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#16a34a' }}>reduced loss</div>
          </div>
          <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: '0.75rem' }}>
            <div className="font-display font-bold" style={{ fontSize: '1.1rem', color: '#14532d' }}>
              {savingsHigh != null ? `Save up to RM ${savingsHigh.toLocaleString()}` : '—'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#16a34a' }}>by intervening today</div>
          </div>
        </div>
      </div>

      {/* Savings bar */}
      {savingsPct != null && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold" style={{ color: '#475569' }}>Cost reduction with early action</div>
            <div className="text-sm font-bold font-display" style={{ color: '#14532d' }}>{savingsPct}% saved</div>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#fee2e2' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${savingsPct}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)' }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px]" style={{ color: '#94a3b8' }}>
            <span>RM 0</span>
            <span>RM {p?.financial_loss_rm[1].toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* AI explanation */}
      <div style={{ borderTop: '1px dashed #fca5a5', paddingTop: '1.25rem' }}>
        <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: '#be123c' }}>AI Explanation</div>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[0, 1].map((i) => (
              <div key={i} className="h-3 rounded" style={{ width: i === 0 ? '85%' : '65%', backgroundColor: 'rgba(190,18,60,0.08)' }} />
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7" style={{ color: '#9f1239' }}>
            {content || 'AI scenario explanation will appear here once analysis is generated.'}
          </p>
        )}
      </div>

      <p className="text-[10px] leading-relaxed" style={{ color: '#94a3b8' }}>
        Scenario-based estimates at RM 7/bird market rate. Not clinical predictions — outcomes depend on disease type and intervention speed.
      </p>
    </div>
  )

  if (bare) return body

  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ border: '1px solid #fca5a5', boxShadow: 'var(--shadow-sm)' }}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #be123c, #e11d48)' }} />
      <div className="px-5 md:px-6 pt-6 pb-4 flex items-center gap-3" style={{ background: 'linear-gradient(180deg, #fef2f2 0%, #fff5f5 100%)', borderBottom: '1px dashed #fca5a5' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: 'linear-gradient(135deg, #be123c, #e11d48)', boxShadow: '0 6px 14px rgba(190,18,60,0.25)' }}>
          ⚠️
        </div>
        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: '#e11d48' }}>
            Based on Risk Level · {p ? p.mortality_range_birds[0].toLocaleString() + '–' + p.mortality_range_birds[1].toLocaleString() + ' birds at risk' : 'flock size'}
          </div>
          <div className="font-display text-lg md:text-xl font-bold mt-0.5" style={{ color: '#881337' }}>7-Day Projected Scenario</div>
        </div>
      </div>
      <div className="p-5 md:p-6" style={{ background: 'linear-gradient(180deg, #fff8f8 0%, #fffafa 100%)' }}>
        {body}
      </div>
    </div>
  )
}

// Strip markdown formatting markers (**, ##, *, >, etc.) from start/end of a line.
// Also returns empty string for horizontal rules like ---, ***, ___.
function stripMarkdown(line: string) {
  const trimmed = line.trim()
  if (/^[-*_]{3,}$/.test(trimmed)) return ''
  return trimmed.replace(/^[\s*#_>~`]+/, '').replace(/[*_`]+$/, '').trim()
}

function extractSection(body: string, sectionTitle: string) {
  if (!body) return ''

  // Insert newline before any known section header so single-paragraph AI
  // responses still split cleanly, even with markdown formatting.
  let normalized = body
  for (const section of KNOWN_SECTIONS) {
    const re = new RegExp(`(?=[*#_\\s]*${section}\\s*:)`, 'gi')
    normalized = normalized.replace(re, '\n')
  }

  const lines = normalized.split('\n')
  let active = false
  const collected: string[] = []

  for (const rawLine of lines) {
    const stripped = stripMarkdown(rawLine)
    if (stripped.toLowerCase().startsWith(`${sectionTitle.toLowerCase()}:`)) {
      active = true
      const firstLine = stripped.slice(sectionTitle.length + 1).trim()
      if (firstLine) collected.push(firstLine)
      continue
    }
    if (active) {
      const isOtherSection = KNOWN_SECTIONS.some(
        (s) =>
          s.toLowerCase() !== sectionTitle.toLowerCase() &&
          stripMarkdown(rawLine).toLowerCase().startsWith(`${s.toLowerCase()}:`),
      )
      if (isOtherSection) break
      const clean = stripMarkdown(rawLine)
      if (clean) collected.push(clean)
    }
  }

  return collected.join('\n').trim()
}

function numericDomain(
  values: Array<number | null | undefined>,
  padding: number,
  fallback: [number, number],
  clampFloor = false,
): [number, number] {
  const numeric = values.filter((value): value is number => value != null)
  if (!numeric.length) return fallback
  const min = Math.min(...numeric)
  const max = Math.max(...numeric)
  const lower = clampFloor ? Math.max(0, min - padding) : min - padding
  const upper = max + padding
  if (lower === upper) return [lower, upper + 1]
  return [lower, upper]
}

function EmptyMetricState({ metric }: { metric: string }) {
  return (
    <div
      className="h-[180px] rounded-xl flex items-center justify-center text-center px-6"
      style={{ backgroundColor: 'var(--surface-2)', border: '1px dashed var(--border)', color: 'var(--ink-3)' }}
    >
      <div className="max-w-xs text-sm leading-6">
        No historical {metric} values are available for this time window yet.
      </div>
    </div>
  )
}
