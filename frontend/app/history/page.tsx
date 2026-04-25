'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, History } from 'lucide-react'

import { getHistory, type HistoryEntry } from '@/lib/api'

const FLOCK_ID = 'flock_2026_batch3'

const LEVEL_STYLES: Record<HistoryEntry['level'], { bg: string; ink: string; border: string; dot: string }> = {
  Low: { bg: '#ecfdf5', ink: '#166534', border: '#86efac', dot: '#16a34a' },
  Moderate: { bg: '#fffbeb', ink: '#92400e', border: '#fcd34d', dot: '#d97706' },
  High: { bg: '#fff1f2', ink: '#be123c', border: '#fda4af', dot: '#ea580c' },
  Critical: { bg: '#fef2f2', ink: '#991b1b', border: '#fca5a5', dot: '#dc2626' },
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory(FLOCK_ID, 30)
      .then((h) => setHistory(h.slice().reverse()))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-full">
      <div
        className="px-4 md:px-8 py-4 md:py-5"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="font-display text-xl md:text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <History size={20} style={{ color: '#ea580c' }} />
          History
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
          Past daily reports. Tap any day to see that day's AI analysis.
          {loading && <span style={{ color: 'var(--risk-mod)' }}> · Loading…</span>}
        </p>
      </div>

      <div className="flex-1 px-4 md:px-8 py-5 md:py-6">
        {history.length === 0 && !loading && (
          <div
            className="rounded-xl p-6 text-center text-sm"
            style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border-mid)', color: 'var(--ink-3)' }}
          >
            No history yet. Log daily data to build a record.
          </div>
        )}

        <div className="space-y-2">
          {history.map((entry, idx) => {
            const date = entry.reading_date ?? entry.timestamp.slice(0, 10)
            const s = LEVEL_STYLES[entry.level]
            const prev = history[idx + 1]
            const delta = prev ? entry.score - prev.score : 0
            const deltaStr = prev ? (delta > 0 ? `+${delta}` : `${delta}`) : '—'
            const deltaColor = delta > 2 ? '#dc2626' : delta < -2 ? '#16a34a' : '#64748b'
            return (
              <Link
                key={date}
                href={`/history/${date}`}
                className="group flex items-center gap-3 md:gap-4 rounded-xl p-4 transition-shadow hover:shadow-md"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              >
                <div
                  className="w-14 md:w-16 flex-shrink-0 text-center rounded-lg py-2"
                  style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
                >
                  <div className="font-display text-xl md:text-2xl font-bold leading-none" style={{ color: s.ink }}>
                    {entry.score}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: s.ink }}>
                    {entry.level}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {fmtDate(entry.timestamp)}
                    </div>
                    <span
                      className="text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: entry.status === 'official' ? '#ecfdf5' : '#fff7ed',
                        color: entry.status === 'official' ? '#166534' : '#c2410c',
                        border: `1px solid ${entry.status === 'official' ? '#86efac' : '#fdba74'}`,
                      }}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-3)' }}>
                    {entry.top_driver ?? 'Daily report'} · {entry.mortality} mortality · {entry.check_count} checks
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: deltaColor }}>
                    {prev ? `${deltaStr} vs previous day` : 'earliest record'}
                  </div>
                </div>

                <ArrowRight size={16} style={{ color: 'var(--ink-3)' }} className="transition-transform group-hover:translate-x-0.5 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}
