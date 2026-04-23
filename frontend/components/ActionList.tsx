'use client'

import { useState } from 'react'

interface Props {
  actions: string[]
}

export default function ActionList({ actions }: Props) {
  const [done, setDone] = useState<Set<number>>(new Set())

  if (!actions.length) return null

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const completedCount = done.size

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
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)' }}
      >
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-3)' }}>
          Required Actions
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: completedCount === actions.length ? '#f0fdf4' : '#fff7ed',
            color: completedCount === actions.length ? '#16a34a' : '#ea580c',
            border: `1px solid ${completedCount === actions.length ? '#86efac' : '#fdba74'}`,
          }}
        >
          {completedCount}/{actions.length} done
        </span>
      </div>

      <div className="p-5">
        <ol className="space-y-3">
          {actions.map((action, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg transition-opacity"
              style={{
                backgroundColor: done.has(i) ? 'var(--surface-2)' : '#fff7ed',
                border: `1px solid ${done.has(i) ? 'var(--border)' : '#fdba74'}`,
                opacity: done.has(i) ? 0.55 : 1,
              }}
            >
              <span
                className="font-display text-sm font-bold flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: done.has(i) ? '#94a3b8' : '#ea580c' }}
              >
                {i + 1}
              </span>
              <span
                className="flex-1 text-sm leading-snug"
                style={{
                  color: 'var(--ink-2)',
                  textDecoration: done.has(i) ? 'line-through' : 'none',
                }}
              >
                {action}
              </span>
              <button
                onClick={() => toggle(i)}
                className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all"
                style={{
                  backgroundColor: done.has(i) ? '#16a34a' : 'white',
                  border: `2px solid ${done.has(i) ? '#16a34a' : '#cbd5e1'}`,
                }}
                aria-label={done.has(i) ? 'Mark incomplete' : 'Mark complete'}
              >
                {done.has(i) && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
