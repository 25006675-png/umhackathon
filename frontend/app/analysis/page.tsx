'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRightLeft, MessageCircle, Sparkles, TrendingUp } from 'lucide-react'

import type { FarmAnalysis, GLMAnalysis } from '@/lib/types'
import {
  askAnalysisFollowUpWithAI,
  DUMMY_ANALYSIS,
  explainScenarioWithAI,
  explainTrajectoryWithAI,
  getAnalysis,
  getGLMAnalysis,
  getHistory,
  simulateScenarioFromAnalysis,
  type HistoryEntry,
} from '@/lib/api'
import ActionList from '@/components/ActionList'
import GLMInsightPanel from '@/components/GLMInsightPanel'
import GLMToggle from '@/components/GLMToggle'
import RiskGauge from '@/components/RiskGauge'

const FLOCK_ID = 'flock_2026_batch3'

export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState<FarmAnalysis>(DUMMY_ANALYSIS)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [glm, setGlm] = useState<GLMAnalysis | null>(null)
  const [glmEnabled, setGlmEnabled] = useState(true)
  const [glmLoading, setGlmLoading] = useState(false)
  const [glmError, setGlmError] = useState<string | null>(null)
  const [trajectory, setTrajectory] = useState('')
  const [trajectoryLoading, setTrajectoryLoading] = useState(false)
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUpReply, setFollowUpReply] = useState('')
  const [activeQuestion, setActiveQuestion] = useState('')
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [scenarioReply, setScenarioReply] = useState('')
  const [activeScenario, setActiveScenario] = useState('')

  useEffect(() => {
    getAnalysis(FLOCK_ID).then(setAnalysis).catch(() => {})
    getHistory(FLOCK_ID, 14).then(setHistory).catch(() => {})
  }, [])

  async function generateAIAnalysis() {
    setGlmLoading(true)
    setGlmError(null)
    try {
      const g = await getGLMAnalysis(FLOCK_ID)
      setGlm(g)
    } catch {
      setGlmError('AI analysis failed. Make sure the backend is running.')
    } finally {
      setGlmLoading(false)
    }
  }

  useEffect(() => {
    if (!history.length) return
    let cancelled = false
    async function loadTrajectory() {
      setTrajectoryLoading(true)
      try {
        const reply = await explainTrajectoryWithAI({
          flockId: FLOCK_ID,
          analysis,
          history,
        })
        if (!cancelled) setTrajectory(reply)
      } catch {
        if (!cancelled) setTrajectory('Trajectory explanation failed.')
      } finally {
        if (!cancelled) setTrajectoryLoading(false)
      }
    }
    loadTrajectory()
    return () => {
      cancelled = true
    }
  }, [analysis, history])

  async function runFollowUp(question: string) {
    setActiveQuestion(question)
    setFollowUpReply('')
    setFollowUpLoading(true)
    try {
      const reply = await askAnalysisFollowUpWithAI({
        flockId: FLOCK_ID,
        analysis,
        glm,
        history,
        question,
      })
      setFollowUpReply(reply)
    } catch {
      setFollowUpReply('Follow-up analysis failed.')
    } finally {
      setFollowUpLoading(false)
    }
  }

  async function runScenario(label: string, scenario: 'ventilation_recovers' | 'water_improves' | 'mortality_rises_two') {
    setActiveScenario(label)
    setScenarioReply('')
    setScenarioLoading(true)
    try {
      const simulated = simulateScenarioFromAnalysis(analysis, scenario)
      const reply = await explainScenarioWithAI({
        flockId: FLOCK_ID,
        analysis,
        history,
        scenarioLabel: label,
        simulated,
      })
      setScenarioReply(`Projected score: ${simulated.risk.score} (${simulated.risk.level})\n\n${reply}`)
    } catch {
      setScenarioReply('Scenario simulation failed.')
    } finally {
      setScenarioLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div
        className="px-4 md:px-8 py-4 md:py-5 flex items-start justify-between gap-4"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-semibold mb-2"
            style={{ color: 'var(--ink-3)' }}
          >
            <ArrowLeft size={12} /> Back to dashboard
          </Link>
          <h1 className="font-display text-xl md:text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
            <Sparkles size={20} style={{ color: '#ea580c' }} />
            AI Analysis
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
            Interpretation · Diagnosis · Recommendations · Scenario narration
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 md:px-8 py-5 md:py-6">
        <div className="flex flex-col md:grid md:grid-cols-[340px_1fr] md:gap-6 gap-4">
          <div className="flex flex-col gap-4">
            <RiskGauge score={analysis.risk.score} level={analysis.risk.level} />
            <GLMToggle enabled={glmEnabled} onToggle={setGlmEnabled} />
          </div>

          <div className="flex flex-col gap-4">
            {glmEnabled && !glm && (
              <div
                className="rounded-xl p-6 flex flex-col items-center text-center gap-3"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px dashed var(--border-mid)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                    Raw numbers alone do not tell you what to do.
                  </div>
                  <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                    Generate an AI-powered interpretation, diagnosis, and action plan for this flock.
                  </div>
                </div>
                <button
                  onClick={generateAIAnalysis}
                  disabled={glmLoading}
                  className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
                >
                  {glmLoading ? 'Generating…' : 'Generate AI Analysis →'}
                </button>
                {glmError && (
                  <div className="text-xs" style={{ color: '#dc2626' }}>
                    {glmError}
                  </div>
                )}
              </div>
            )}

            {glmEnabled && glm && (
              <>
                <GLMInsightPanel analysis={glm} />
                <InsightBlock
                  icon={<TrendingUp size={16} />}
                  eyebrow="Trajectory Intelligence"
                  title="Why risk is changing"
                  loading={trajectoryLoading}
                  body={trajectory}
                  tint="orange"
                />
                <QuestionBlock
                  title="Interactive Investigation"
                  questions={[
                    'Why do you think this is the leading hypothesis?',
                    'What should I physically check in the barn right now?',
                    'What data would most change your conclusion?',
                  ]}
                  active={activeQuestion}
                  loading={followUpLoading}
                  body={followUpReply}
                  onSelect={runFollowUp}
                />
                <ScenarioBlock
                  title="What-If Simulator"
                  active={activeScenario}
                  loading={scenarioLoading}
                  body={scenarioReply}
                  onSelect={runScenario}
                />
                <ActionList actions={glm.recommendations} />
                <button
                  onClick={generateAIAnalysis}
                  disabled={glmLoading}
                  className="text-xs font-semibold self-start px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--surface-2)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
                >
                  {glmLoading ? 'Regenerating…' : '→ Regenerate AI Analysis'}
                </button>
              </>
            )}

            {!glmEnabled && (
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
                  Enable the toggle to generate diagnostics and recommendations.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InsightBlock({
  icon,
  eyebrow,
  title,
  body,
  loading,
  tint,
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
  body: string
  loading: boolean
  tint: 'orange'
}) {
  const palette = tint === 'orange'
    ? { bg: '#fff7ed', border: '#fdba74', iconBg: '#ea580c', title: '#9a3412', text: '#7c2d12' }
    : { bg: '#ffffff', border: '#e2e8f0', iconBg: '#0f172a', title: '#0f172a', text: '#334155' }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}`, boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: palette.iconBg, color: '#ffffff' }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: palette.title }}>
            {eyebrow}
          </div>
          <div className="font-display text-xl font-semibold mt-1" style={{ color: palette.title }}>
            {title}
          </div>
          <div className="mt-3 text-sm leading-7 whitespace-pre-wrap" style={{ color: palette.text }}>
            {loading ? 'Generating...' : body}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionBlock({
  title,
  questions,
  active,
  loading,
  body,
  onSelect,
}: {
  title: string
  questions: string[]
  active: string
  loading: boolean
  body: string
  onSelect: (question: string) => void
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}
        >
          <MessageCircle size={16} />
        </div>
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#2563eb' }}>
            Interactive Investigation
          </div>
          <div className="font-display text-xl font-semibold" style={{ color: 'var(--ink)' }}>
            {title}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => {
          const activeState = active === question
          return (
            <button
              key={question}
              type="button"
              onClick={() => onSelect(question)}
              className="px-3 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: activeState ? '#2563eb' : '#f8fafc',
                color: activeState ? '#ffffff' : '#1e3a8a',
                border: `1px solid ${activeState ? '#2563eb' : '#bfdbfe'}`,
              }}
            >
              {question}
            </button>
          )
        })}
      </div>
      {(loading || body) && (
        <div
          className="mt-4 rounded-xl p-4 text-sm leading-7 whitespace-pre-wrap"
          style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a' }}
        >
          {loading ? 'Thinking...' : body}
        </div>
      )}
    </div>
  )
}

function ScenarioBlock({
  title,
  active,
  loading,
  body,
  onSelect,
}: {
  title: string
  active: string
  loading: boolean
  body: string
  onSelect: (label: string, scenario: 'ventilation_recovers' | 'water_improves' | 'mortality_rises_two') => void
}) {
  const scenarios = [
    { label: 'Ventilation returns to normal', value: 'ventilation_recovers' as const },
    { label: 'Water intake recovers to baseline', value: 'water_improves' as const },
    { label: 'Mortality rises by 2 birds', value: 'mortality_rises_two' as const },
  ]

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}
        >
          <ArrowRightLeft size={16} />
        </div>
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#7c3aed' }}>
            What-If Simulator
          </div>
          <div className="font-display text-xl font-semibold" style={{ color: 'var(--ink)' }}>
            {title}
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {scenarios.map((scenario) => {
          const activeState = active === scenario.label
          return (
            <button
              key={scenario.value}
              type="button"
              onClick={() => onSelect(scenario.label, scenario.value)}
              className="rounded-xl p-3 text-left transition-opacity hover:opacity-90"
              style={{
                backgroundColor: activeState ? '#7c3aed' : '#faf5ff',
                color: activeState ? '#ffffff' : '#5b21b6',
                border: `1px solid ${activeState ? '#7c3aed' : '#ddd6fe'}`,
              }}
            >
              <div className="text-sm font-semibold leading-snug">{scenario.label}</div>
            </button>
          )
        })}
      </div>
      {(loading || body) && (
        <div
          className="mt-4 rounded-xl p-4 text-sm leading-7 whitespace-pre-wrap"
          style={{ backgroundColor: '#faf5ff', border: '1px solid #ddd6fe', color: '#5b21b6' }}
        >
          {loading ? 'Simulating...' : body}
        </div>
      )}
    </div>
  )
}
