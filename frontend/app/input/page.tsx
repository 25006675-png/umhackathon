'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getAnalysis, submitReading } from '@/lib/api'
import type { BehaviourFlag, VentilationCondition } from '@/lib/types'
import { BarnIcon, ChickenIcon, WheatIcon } from '@/components/FarmArt'

type LocalVentilationCondition = VentilationCondition | ''

const NUMERIC_FIELDS = [
  {
    key: 'temperature_celsius',
    label: 'Barn Temperature',
    step: '0.1',
    placeholder: '33.5',
    unit: 'C',
    baseline: '~30.2 C',
    hint: 'Optional. Enter the latest or current total for today.',
  },
  {
    key: 'feed_intake_kg',
    label: 'Feed Intake',
    step: '0.1',
    placeholder: '42.0',
    unit: 'kg',
    baseline: '~51.3 kg',
    hint: 'Optional. Use total feed so far today.',
  },
  {
    key: 'water_intake_liters',
    label: 'Water Intake',
    step: '1',
    placeholder: '95',
    unit: 'L',
    baseline: 'varies with age',
    hint: 'Optional. Use total water so far today.',
  },
  {
    key: 'mortality_count',
    label: 'Mortality Count',
    step: '1',
    placeholder: '3',
    unit: 'birds',
    baseline: '~1 bird/day',
    hint: 'Optional. Use total dead birds so far today.',
  },
] as const

const VENTILATION_OPTIONS: { value: LocalVentilationCondition; label: string; hint: string }[] = [
  { value: '', label: 'Not logged', hint: 'Leave ventilation blank for now' },
  { value: 'normal', label: 'Normal', hint: 'No noticeable smell' },
  { value: 'mild', label: 'Mild smell', hint: 'Faint ammonia or poor airflow' },
  { value: 'strong', label: 'Strong smell', hint: 'Strong ammonia or high humidity' },
  { value: 'sensor_high', label: 'Sensor > 25 ppm', hint: 'Ammonia sensor reading' },
]

const BEHAVIOUR_OPTIONS: { value: BehaviourFlag; label: string }[] = [
  { value: 'water_change', label: 'Water intake changed' },
  { value: 'abnormal_sounds', label: 'Sneezing or coughing sounds' },
  { value: 'huddling_panting', label: 'Huddling or panting' },
  { value: 'reduced_movement', label: 'Reduced movement' },
]


function parseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function getKualaLumpurDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

const FLOCK_ID = 'flock_2026_batch3'

export default function InputPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    temperature_celsius: '',
    feed_intake_kg: '',
    water_intake_liters: '',
    mortality_count: '',
    ventilation_condition: '' as LocalVentilationCondition,
    behaviour_flags: [] as BehaviourFlag[],
    farmer_notes: '',
  })
  const [hasExisting, setHasExisting] = useState(false)
  const [prefilling, setPrefilling] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getAnalysis(FLOCK_ID)
      .then((analysis) => {
        const isToday = analysis.reading_date === getKualaLumpurDateString()
        if (analysis.check_count > 0 && isToday) {
          const s = analysis.signals
          setHasExisting(true)
          setForm({
            temperature_celsius: s.temperature_celsius != null ? String(s.temperature_celsius) : '',
            feed_intake_kg: s.feed_intake_kg != null ? String(s.feed_intake_kg) : '',
            water_intake_liters: s.water_intake_liters != null ? String(s.water_intake_liters) : '',
            mortality_count: s.mortality_count != null ? String(s.mortality_count) : '',
            ventilation_condition: (s.ventilation_condition as LocalVentilationCondition) ?? '',
            behaviour_flags: (s.behaviour_flags as BehaviourFlag[]) ?? [],
            farmer_notes: s.farmer_notes ?? '',
          })
        } else {
          setHasExisting(false)
        }
      })
      .catch(() => {})
      .finally(() => setPrefilling(false))
  }, [])

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleFlag(flag: BehaviourFlag) {
    setForm((prev) => ({
      ...prev,
      behaviour_flags: prev.behaviour_flags.includes(flag)
        ? prev.behaviour_flags.filter((f) => f !== flag)
        : [...prev.behaviour_flags, flag],
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await submitReading({
        farm_id: 'farm_001',
        flock_id: FLOCK_ID,
        temperature_celsius: parseNumber(form.temperature_celsius),
        feed_intake_kg: parseNumber(form.feed_intake_kg),
        mortality_count: parseNumber(form.mortality_count),
        water_intake_liters: parseNumber(form.water_intake_liters),
        ventilation_condition: form.ventilation_condition || null,
        behaviour_flags: form.behaviour_flags,
        farmer_notes: form.farmer_notes,
      }, { replaceToday: hasExisting })
      setSaved(true)
    } catch {
      setError('Failed to save data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function goToDashboard() {
    router.refresh()
    router.push('/')
  }

  return (
    <div className="flex flex-col min-h-full">
      <div
        className="relative px-6 md:px-10 py-5 overflow-hidden"
        style={{
          backgroundColor: 'var(--earth-cream)',
          borderBottom: '1px solid var(--earth-straw)',
          backgroundImage: 'radial-gradient(circle at 95% 50%, #fef3c7 0%, transparent 55%)',
        }}
      >
        <BarnIcon size={72} className="absolute -bottom-2 right-4 opacity-35" />
        <WheatIcon size={38} className="absolute top-2 right-24 opacity-40 floaty" />
        <div className="relative flex items-center gap-3">
          <ChickenIcon size={44} className="peck flex-shrink-0" />
          <div>
            <h1 className="font-display text-xl md:text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
              {hasExisting ? "Edit Today's Data" : 'Log Daily Data'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
              Farm 001 | Flock 2026 Batch 3
              {prefilling && <span style={{ color: 'var(--risk-mod)' }}> · Loading...</span>}
              {!prefilling && hasExisting && <span style={{ color: '#16a34a' }}> · Pre-filled from today's last reading</span>}
            </p>
          </div>
        </div>
      </div>
      <div className="farm-divider" />

      {saved && (
        <div className="flex-1 px-6 md:px-10 py-10 flex flex-col items-center justify-center gap-5 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#ecfdf5', border: '2px solid #86efac' }}
          >
            <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
              <path d="M2 11L10 19L26 3" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="font-display text-xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>
              {hasExisting ? 'Data updated' : 'Data saved'}
            </div>
            <div className="text-sm" style={{ color: 'var(--ink-3)' }}>
              Today's readings have been recorded. Head to the Today tab to see your updated risk score.
            </div>
          </div>
          <button
            type="button"
            onClick={goToDashboard}
            className="text-sm font-semibold px-6 py-3 rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--ink)', color: '#f8fafc' }}
          >
            Go to Today →
          </button>
        </div>
      )}

      {!saved && <div className="flex-1 px-6 md:px-10 py-6">
        <div className="max-w-2xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="space-y-5">
            <SectionHeader step={1} title="Sensor readings" subtitle="All numeric fields are optional" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {NUMERIC_FIELDS.map(({ key, label, step, placeholder, unit, baseline, hint }) => (
                <div
                  key={key}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--ink-3)' }}>
                      {label}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
                      Optional
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <input
                      type="number"
                      step={step}
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      min={key === 'mortality_count' ? '0' : undefined}
                      className="flex-1 bg-transparent focus:outline-none font-display w-full"
                      style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ink)' }}
                    />
                    <span className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>
                      {unit}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between mt-2 pt-2 text-[11px]"
                    style={{ borderTop: '1px solid var(--border)', color: 'var(--ink-3)' }}
                  >
                    <span>Baseline: {baseline}</span>
                    <span>{hint}</span>
                  </div>
                </div>
              ))}
            </div>

            <SectionHeader step={2} title="Environment" subtitle="Ventilation can be left blank" />
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {VENTILATION_OPTIONS.map((opt) => {
                  const active = form.ventilation_condition === opt.value
                  return (
                    <button
                      key={opt.value || 'blank'}
                      type="button"
                      onClick={() => setField('ventilation_condition', opt.value)}
                      className="text-left rounded-lg p-3 transition-all"
                      style={{
                        border: active ? '1.5px solid var(--ink)' : '1px solid var(--border)',
                        backgroundColor: active ? 'var(--bg)' : 'transparent',
                      }}
                    >
                      <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{opt.label}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{opt.hint}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <SectionHeader step={3} title="Behaviour checklist" subtitle="Tick anything you observed today" />
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {BEHAVIOUR_OPTIONS.map((opt) => {
                  const active = form.behaviour_flags.includes(opt.value)
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 rounded-lg p-2.5 cursor-pointer"
                      style={{
                        border: active ? '1.5px solid var(--ink)' : '1px solid var(--border)',
                        backgroundColor: active ? 'var(--bg)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleFlag(opt.value)}
                        className="accent-black"
                      />
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>{opt.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <SectionHeader step={4} title="Farmer notes" subtitle="Optional free-text context" />
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <textarea
                rows={3}
                placeholder="e.g. chickens are quiet, eating less, unusual breathing sounds"
                value={form.farmer_notes}
                onChange={(e) => setField('farmer_notes', e.target.value)}
                className="w-full text-sm bg-transparent focus:outline-none resize-none leading-relaxed"
                style={{ color: 'var(--ink)' }}
              />
            </div>

            {error && (
              <div
                className="rounded-lg p-3 text-sm"
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
              {loading ? 'Saving...' : hasExisting ? 'Update Today\'s Data →' : 'Submit & Analyse →'}
            </button>
          </form>
        </div>
      </div>
    }
  </div>
  )
}

function SectionHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline gap-3 pt-1">
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
        style={{ backgroundColor: 'var(--ink)', color: '#f8fafc' }}
      >
        {step}
      </span>
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</div>
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{subtitle}</div>
      </div>
    </div>
  )
}
