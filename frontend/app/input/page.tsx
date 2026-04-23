'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitReading } from '@/lib/api'

const FIELDS = [
  {
    key: 'temperature_celsius',
    label: 'Barn Temperature',
    inputMode: 'decimal' as const,
    step: '0.1',
    placeholder: '33.5',
    unit: '°C',
    baseline: '~30.2 °C',
    hint: 'Normal range: 28–32 °C',
  },
  {
    key: 'feed_intake_kg',
    label: 'Feed Intake',
    inputMode: 'decimal' as const,
    step: '0.1',
    placeholder: '42.0',
    unit: 'kg',
    baseline: '~51.3 kg',
    hint: 'Measure total consumption today',
  },
  {
    key: 'mortality_count',
    label: 'Mortality Count',
    inputMode: 'numeric' as const,
    step: '1',
    placeholder: '3',
    unit: 'birds',
    baseline: '~1 bird/day',
    hint: 'Count dead birds found today',
  },
]

export default function InputPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    temperature_celsius: '',
    feed_intake_kg: '',
    mortality_count: '',
    farmer_notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await submitReading({
        farm_id: 'farm_001',
        flock_id: 'flock_2026_batch3',
        temperature_celsius: parseFloat(form.temperature_celsius),
        feed_intake_kg: parseFloat(form.feed_intake_kg),
        mortality_count: parseInt(form.mortality_count, 10),
        farmer_notes: form.farmer_notes,
      })
      router.push('/dashboard')
    } catch {
      setError('Failed to submit data. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div
        className="px-6 md:px-10 py-5"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="font-display text-xl md:text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          Log Daily Data
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
          Farm 001 · Flock 2026 Batch 3
        </p>
      </div>

      <div className="flex-1 px-6 md:px-10 py-6">
        <div className="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {FIELDS.map(({ key, label, inputMode, step, placeholder, unit, baseline, hint }) => (
              <div
                key={key}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  className="text-xs font-semibold tracking-widest uppercase mb-3"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {label}
                </div>
                <div className="flex items-baseline gap-3">
                  <input
                    type="number"
                    inputMode={inputMode}
                    step={step}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => set(key, e.target.value)}
                    required
                    min={key === 'mortality_count' ? '0' : undefined}
                    className="flex-1 bg-transparent focus:outline-none font-display"
                    style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--ink)', width: '100%' }}
                  />
                  <span className="text-lg font-medium flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
                    {unit}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between mt-3 pt-3 text-xs"
                  style={{ borderTop: '1px solid var(--border)', color: 'var(--ink-3)' }}
                >
                  <span>Baseline: {baseline}</span>
                  <span>{hint}</span>
                </div>
              </div>
            ))}

            {/* Notes */}
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
                Farmer Notes
              </div>
              <textarea
                rows={3}
                placeholder="e.g. chickens are quiet, eating less, unusual breathing sounds..."
                value={form.farmer_notes}
                onChange={(e) => set('farmer_notes', e.target.value)}
                className="w-full text-sm bg-transparent focus:outline-none resize-none leading-relaxed"
                style={{ color: 'var(--ink)' }}
              />
            </div>

            {error && (
              <div
                className="rounded-lg p-3.5 text-sm"
                style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-sm font-semibold py-3.5 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--ink)', color: '#f8fafc' }}
            >
              {loading ? 'Submitting…' : 'Submit & Analyse →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
