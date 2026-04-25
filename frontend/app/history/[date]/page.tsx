'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'

import type { GLMAnalysis } from '@/lib/types'
import { getGLMAnalysisForDate, getHistory, type HistoryEntry } from '@/lib/api'
import ActionList from '@/components/ActionList'
import GLMInsightPanel from '@/components/GLMInsightPanel'

const FLOCK_ID = 'flock_2026_batch3'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function displayValue(value: number | null | undefined, suffix = '') {
  return value == null ? 'Not logged' : `${value}${suffix}`
}

export default function HistoryDayPage() {
  const params = useParams<{ date: string }>()
  const date = params?.date ?? ''

  const [entry, setEntry] = useState<HistoryEntry | null>(null)
  const [glm, setGlm] = useState<GLMAnalysis | null>(null)
  const [glmLoading, setGlmLoading] = useState(false)
  const [glmError, setGlmError] = useState<string | null>(null)

  useEffect(() => {
    getHistory(FLOCK_ID, 30)
      .then((all) => {
        const found = all.find((e) => (e.reading_date ?? e.timestamp.slice(0, 10)) === date) ?? null
        setEntry(found)
      })
      .catch(() => {})
  }, [date])

  async function regenerate() {
    setGlmLoading(true)
    setGlmError(null)
    try {
      const g = await getGLMAnalysisForDate(FLOCK_ID, date)
      setGlm(g)
    } catch {
      setGlmError('AI analysis failed. Make sure the backend is running.')
    } finally {
      setGlmLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div
        className="px-4 md:px-8 py-4 md:py-5"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-xs font-semibold mb-2"
          style={{ color: 'var(--ink-3)' }}
        >
          <ArrowLeft size={12} /> Back to history
        </Link>
        <h1 className="font-display text-xl md:text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          {fmtDate(date)}
        </h1>
        {entry && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
            Risk {entry.score} ({entry.level}) | {entry.check_count} checks | {entry.status}
          </p>
        )}
      </div>

      <div className="flex-1 px-4 md:px-8 py-5 md:py-6 space-y-4">
        {entry && (
          <>
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
                Signals
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="Risk Score" value={String(entry.score)} sub={entry.level} />
                <Metric label="Temperature" value={entry.temperature_celsius != null ? `${entry.temperature_celsius.toFixed(1)} C` : 'Not logged'} />
                <Metric label="Feed Intake" value={entry.feed_intake_kg != null ? `${entry.feed_intake_kg.toFixed(1)} kg` : 'Not logged'} />
                <Metric label="Water Intake" value={entry.water_intake_liters != null ? `${entry.water_intake_liters.toFixed(1)} L` : 'Not logged'} />
                <Metric label="Mortality" value={displayValue(entry.mortality)} sub="birds" />
                <Metric label="Top Driver" value={entry.top_driver ?? 'Normal'} />
                <Metric label="Status" value={entry.status} />
                <Metric label="Checks" value={String(entry.check_count)} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Panel title="Environment">
                <DetailRow label="Ventilation" value={entry.ventilation_condition || 'Not logged'} />
                <DetailRow
                  label="Behaviour"
                  value={entry.behaviour_flags && entry.behaviour_flags.length > 0 ? entry.behaviour_flags.join(', ') : 'None flagged'}
                />
              </Panel>

              <Panel title="Notes">
                <div className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {entry.farmer_notes?.trim() ? entry.farmer_notes : 'No notes logged for this day.'}
                </div>
              </Panel>
            </div>
          </>
        )}

        {!glm && (
          <div
            className="rounded-xl p-6 flex flex-col items-center text-center gap-3"
            style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border-mid)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                Regenerate AI analysis for {fmtDate(date)}
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                The GLM will reason over this day and the recent trajectory.
              </div>
            </div>
            <button
              onClick={regenerate}
              disabled={glmLoading}
              className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
              style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
            >
              <Sparkles size={14} /> {glmLoading ? 'Generating...' : 'Generate AI analysis'}
            </button>
            {glmError && <div className="text-xs" style={{ color: '#dc2626' }}>{glmError}</div>}
          </div>
        )}

        {glm && (
          <>
            <GLMInsightPanel analysis={glm} />
            <ActionList actions={glm.recommendations} />
            <button
              onClick={regenerate}
              disabled={glmLoading}
              className="text-xs font-semibold self-start px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
            >
              {glmLoading ? 'Regenerating...' : 'Regenerate'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-3)' }}>
        {label}
      </div>
      <div className="font-display text-xl font-bold mt-1" style={{ color: 'var(--ink)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{label}</div>
      <div className="text-sm text-right" style={{ color: 'var(--ink-2)' }}>{value}</div>
    </div>
  )
}
