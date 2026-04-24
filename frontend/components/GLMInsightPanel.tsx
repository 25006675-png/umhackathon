'use client'

import type { GLMAnalysis } from '@/lib/types'

interface Props {
  analysis: GLMAnalysis
}

export default function GLMInsightPanel({ analysis }: Props) {
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
        className="px-5 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)' }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#ea580c' }}
        />
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'var(--ink-3)' }}
        >
          AI Diagnostic Report
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Situation */}
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
            Situation Assessment
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            {analysis.interpretation}
          </p>
        </div>

        {/* Hypotheses */}
        {analysis.hypothesis.length > 0 && (
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
              Probable Diagnosis
            </div>
            <div className="space-y-3">
              {analysis.hypothesis.map((h, i) => (
                <div key={i}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold font-display" style={{ color: 'var(--ink)' }}>
                      {h.disease}
                    </span>
                    <span
                      className="text-sm font-bold font-display px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: '#fff7ed',
                        color: '#ea580c',
                        border: '1px solid #fdba74',
                      }}
                    >
                      {Math.round(h.confidence * 100)}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#e2e8f0' }}>
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${h.confidence * 100}%`, backgroundColor: '#ea580c' }}
                    />
                  </div>
                  {h.reasoning && (
                    <p className="text-xs leading-snug mt-2" style={{ color: 'var(--ink-3)' }}>
                      {h.reasoning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Narration */}
        {analysis.narration && (
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
              Projected Scenario
            </div>
            <p
              className="text-sm leading-relaxed whitespace-pre-line rounded-lg p-3"
              style={{
                color: 'var(--ink-2)',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}
            >
              {analysis.narration}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
