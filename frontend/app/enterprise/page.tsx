'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Home, BarChart2, FileText, Settings, Layers,
  Thermometer, AlertTriangle, Zap, Activity,
  ChevronRight, BookOpen, Shield,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ─── Data ─────────────────────────────────────────────────────────────────────

const DATA = {
  stable: {
    label: 'Hari 1 (Stabil)',
    riskScore: 35,
    riskLevel: 'SEDERHANA',
    signals: {
      temp:      { value: 30.8, baseline: 30.2, deviation:  0.020, history: [29.8, 30.0, 30.2, 30.5, 30.8] },
      feed:      { value: 49.5, baseline: 51.3, deviation: -0.035, history: [51.5, 51.3, 50.8, 50.2, 49.5] },
      mortality: { value: 2,    baseline: 1.0,  deviation:  1.000, history: [1, 1, 1, 1, 2] },
    },
    trend: [
      { day: 'H-6', score: 20 }, { day: 'H-5', score: 22 }, { day: 'H-4', score: 24 },
      { day: 'H-3', score: 26 }, { day: 'H-2', score: 28 }, { day: 'H-1', score: 32 },
      { day: 'Hari Ini', score: 35 },
    ],
    assessment: 'Flock dalam keadaan stabil. Suhu reban sedikit meningkat (+2%) tetapi masih dalam had selamat. Pengambilan makanan sedikit menurun (-3.5%), mungkin variasi harian biasa. Tiada tanda-tanda penyakit yang ketara dikesan pada masa ini.',
    hypotheses: [
      { name: 'Variasi Normal',   confidence: 0.78, source: 'DVS Protocol 2024',    color: '#16a34a' },
      { name: 'Heat Stress Awal', confidence: 0.22, source: 'MARDI Poultry Guide',  color: '#ca8a04' },
    ],
    actions: [
      { n: 1, text: 'Pantau suhu secara berkala — pastikan pengudaraan mencukupi', urgency: 'RENDAH',    ub: 'bg-green-100',  ut: 'text-green-700' },
      { n: 2, text: 'Rekod pengambilan makanan harian dengan tepat',               urgency: 'RENDAH',    ub: 'bg-green-100',  ut: 'text-green-700' },
      { n: 3, text: 'Periksa ayam secara visual pada waktu pagi',                  urgency: 'RENDAH',    ub: 'bg-green-100',  ut: 'text-green-700' },
    ],
    proj: { noLoss: 3500, earlyLoss: 500, mortalityRange: '5–10%', birdsRange: '250–500' },
  },
  outbreak: {
    label: 'Hari 2 (Wabak)',
    riskScore: 72,
    riskLevel: 'RISIKO TINGGI',
    signals: {
      temp:      { value: 33.5, baseline: 30.2, deviation:  0.109, history: [30.2, 30.8, 31.5, 32.4, 33.5] },
      feed:      { value: 42.0, baseline: 51.3, deviation: -0.181, history: [51.3, 50.2, 48.1, 45.0, 42.0] },
      mortality: { value: 3,    baseline: 1.0,  deviation:  2.000, history: [1, 1, 1, 2, 3] },
    },
    trend: [
      { day: 'H-6', score: 20 }, { day: 'H-5', score: 24 }, { day: 'H-4', score: 28 },
      { day: 'H-3', score: 35 }, { day: 'H-2', score: 42 }, { day: 'H-1', score: 58 },
      { day: 'Hari Ini', score: 72 },
    ],
    assessment: 'Flock menunjukkan tanda-tanda tekanan sederhana hingga teruk. Suhu reban melebihi paras selamat sebanyak 10.9%, manakala pengambilan makanan jatuh 18.1% di bawah garis asas. Kadar kematian adalah 2× ganda norma. Corak ini konsisten dengan permulaan jangkitan pernafasan atau tekanan haba akut — campur tangan segera diperlukan.',
    hypotheses: [
      { name: 'Chronic Respiratory Disease (CRD)', confidence: 0.72, source: 'DVS Malaysia Protocol',     color: '#dc2626' },
      { name: 'Heat Stress (Akut)',                confidence: 0.55, source: 'MARDI Poultry 2023',        color: '#ea580c' },
      { name: 'Newcastle Disease',                 confidence: 0.30, source: 'OIE/WOAH Terrestrial Manual', color: '#ca8a04' },
    ],
    actions: [
      { n: 1, text: 'Hubungi doktor veterinar dalam masa 24 jam — jangan tunggu',         urgency: 'KRITIKAL',  ub: 'bg-red-100',    ut: 'text-red-700' },
      { n: 2, text: 'Tingkatkan pengudaraan reban segera — buka semua tirai samping',     urgency: 'TINGGI',    ub: 'bg-orange-100', ut: 'text-orange-700' },
      { n: 3, text: 'Periksa semua ayam — cari tanda batuk, bersin, pernafasan labuh',   urgency: 'TINGGI',    ub: 'bg-orange-100', ut: 'text-orange-700' },
      { n: 4, text: 'Asingkan ayam yang menunjukkan gejala ke pen berasingan',            urgency: 'SEDERHANA', ub: 'bg-amber-100',  ut: 'text-amber-700' },
      { n: 5, text: 'Pastikan bekalan air bersih dan dingin mencukupi sepanjang masa',    urgency: 'SEDERHANA', ub: 'bg-amber-100',  ut: 'text-amber-700' },
    ],
    proj: { noLoss: 17500, earlyLoss: 1750, mortalityRange: '30–50%', birdsRange: '1,500–2,500' },
  },
} as const

type Mode = keyof typeof DATA

// ─── Gauge helpers ────────────────────────────────────────────────────────────

const CX = 120, CY = 140, R = 85

function pt(deg: number) {
  const r = (deg * Math.PI) / 180
  return { x: CX + R * Math.cos(r), y: CY - R * Math.sin(r) }
}

function arc(fromDeg: number, toDeg: number): string {
  const s = pt(fromDeg), e = pt(toDeg)
  const large = fromDeg - toDeg > 180 ? 1 : 0
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

function filledArc(score: number): string {
  if (score <= 0) return ''
  return arc(210, 210 - score * 2.4)
}

function scoreColor(score: number): string {
  if (score <= 30) return '#16a34a'
  if (score <= 60) return '#ca8a04'
  if (score <= 80) return '#ea580c'
  return '#dc2626'
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, good }: { values: readonly number[], good: boolean }) {
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const W = 72, H = 28
  const pts = values.map((v, i) =>
    `${((i / (values.length - 1)) * W).toFixed(1)},${(H - ((v - min) / range) * (H - 4)).toFixed(1)}`
  ).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke={good ? '#16a34a' : '#ef4444'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  )
}

// ─── Signal Card ──────────────────────────────────────────────────────────────

function SignalCard({
  icon, label, labelEn, value, unit, baseline, deviation, history, badDir,
}: {
  icon: ReactNode
  label: string; labelEn: string
  value: number; unit: string; baseline: number
  deviation: number; history: readonly number[]
  badDir: 'up' | 'down'
}) {
  const bad = badDir === 'up' ? deviation > 0.05 : deviation < -0.05
  const pct = Math.abs(deviation * 100).toFixed(1)
  const arrow = deviation > 0.02 ? '↑' : deviation < -0.02 ? '↓' : '→'
  const devColor = bad ? '#ef4444' : '#16a34a'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="text-sm font-semibold text-slate-700 leading-none">{label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{labelEn}</div>
          </div>
        </div>
        <Sparkline values={history} good={!bad} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-3xl font-bold text-slate-900">{value}</span>
          <span className="text-sm text-slate-400 ml-1">{unit}</span>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold" style={{ color: devColor }}>{arrow} {pct}%</div>
          <div className="text-xs text-slate-400">vs Asas {baseline} {unit}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const NAV = [
  { icon: Home,    ms: 'Utama',    en: 'Overview' },
  { icon: Layers,  ms: 'Flock',    en: 'Flocks' },
  { icon: BarChart2, ms: 'Analitik', en: 'Analytics', active: true },
  { icon: FileText,  ms: 'Laporan',  en: 'Reports' },
  { icon: Settings,  ms: 'Tetapan',  en: 'Settings' },
]

export default function EnterpriseDashboard() {
  const [mode, setMode] = useState<Mode>('outbreak')
  const d = DATA[mode]
  const alert = mode === 'outbreak'
  const sc = scoreColor(d.riskScore)
  const ep = pt(210 - d.riskScore * 2.4)

  return (
    // fixed overlay covers entire viewport — sits above root layout header & bottom nav
    <div className="fixed inset-0 z-50 flex bg-slate-50 overflow-hidden text-slate-800">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ backgroundColor: '#064E3B' }}>
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-lg">🐔</div>
            <div>
              <div className="text-white font-bold text-sm leading-none">TernakAI</div>
              <div className="text-emerald-300 text-xs mt-0.5">Enterprise</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV.map(({ icon: Icon, ms, en, active }) => (
            <button key={ms} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
              active ? 'bg-white/15 text-white' : 'text-emerald-200 hover:bg-white/8 hover:text-white'
            }`}>
              <Icon size={16} />
              <div>
                <div className="text-sm font-medium leading-none">{ms}</div>
                <div className="text-xs opacity-50 mt-0.5">{en}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1.5">Ladang Aktif</div>
          <div className="text-white text-sm font-semibold">Semenyih Farm</div>
          <div className="text-emerald-300 text-xs mt-0.5">Shed B · 5,000 ekor</div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${alert ? 'bg-red-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="text-xs text-emerald-200">{alert ? 'AMARAN AKTIF' : 'Sistem Normal'}</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-13 bg-white border-b border-slate-200 px-5 flex items-center gap-3 flex-shrink-0" style={{ height: 52 }}>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <span>Semenyih Farm</span>
            <ChevronRight size={13} />
            <span>Shed B</span>
            <ChevronRight size={13} />
            <span className="font-semibold text-slate-700">Analitik Risiko</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              alert ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${alert ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
              {alert ? 'AMARAN' : 'LIVE'}
            </div>
            <span className="text-xs text-slate-400">23 Apr 2026, 08:00</span>
            <button
              onClick={() => setMode(m => m === 'stable' ? 'outbreak' : 'stable')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                alert
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Activity size={12} />
              Mod Simulasi: {d.label}
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-auto p-4 space-y-4">

          {/* Alert bar */}
          {alert && (
            <div className="flex items-center gap-2.5 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
              <AlertTriangle size={15} className="flex-shrink-0" />
              <span>AMARAN KRITIKAL — Skor Risiko 72/100. Tindakan segera diperlukan dalam 24 jam.</span>
              <span className="ml-auto text-red-200 text-xs flex-shrink-0">Suhu +10.9% · Makanan −18.1% · Kematian 3×</span>
            </div>
          )}

          {/* Signal cards */}
          <div className="grid grid-cols-3 gap-4">
            <SignalCard
              icon={<Thermometer size={17} className="text-orange-500" />}
              label="Suhu Kandang" labelEn="Shed Temperature"
              value={d.signals.temp.value} unit="°C"
              baseline={d.signals.temp.baseline} deviation={d.signals.temp.deviation}
              history={d.signals.temp.history} badDir="up"
            />
            <SignalCard
              icon={<span className="text-amber-500 text-base leading-none">🌾</span>}
              label="Pengambilan Makanan" labelEn="Feed Intake"
              value={d.signals.feed.value} unit="kg"
              baseline={d.signals.feed.baseline} deviation={d.signals.feed.deviation}
              history={d.signals.feed.history} badDir="down"
            />
            <SignalCard
              icon={<AlertTriangle size={17} className="text-red-500" />}
              label="Kematian" labelEn="Mortality Count"
              value={d.signals.mortality.value} unit="ekor"
              baseline={d.signals.mortality.baseline} deviation={d.signals.mortality.deviation}
              history={d.signals.mortality.history} badDir="up"
            />
          </div>

          {/* Bento row: Risk Hub + AI Diagnostic */}
          <div className="grid grid-cols-12 gap-4">

            {/* Left col: gauge + economic */}
            <div className="col-span-4 flex flex-col gap-4">

              {/* Risk Gauge */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Skor Risiko</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    d.riskScore > 60 ? 'bg-red-100 text-red-700' :
                    d.riskScore > 30 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {d.riskScore > 60 ? '↑ Meningkat' : d.riskScore > 30 ? '→ Stabil' : '↓ Menurun'}
                  </span>
                </div>

                <svg viewBox="0 0 240 190" className="w-full">
                  {/* Zone backgrounds */}
                  <path d={arc(210, 138)} fill="none" stroke="#bbf7d0" strokeWidth="13" strokeLinecap="round" />
                  <path d={arc(138,  66)} fill="none" stroke="#fef08a" strokeWidth="13" strokeLinecap="round" />
                  <path d={arc( 66,  18)} fill="none" stroke="#fed7aa" strokeWidth="13" strokeLinecap="round" />
                  <path d={arc( 18, -30)} fill="none" stroke="#fecaca" strokeWidth="13" strokeLinecap="round" />
                  {/* Filled */}
                  {d.riskScore > 0 && (
                    <path d={filledArc(d.riskScore)} fill="none" stroke={sc} strokeWidth="13" strokeLinecap="round" />
                  )}
                  {/* Endpoint indicator */}
                  {d.riskScore > 0 && (
                    <>
                      <circle cx={ep.x} cy={ep.y} r="9" fill={sc} opacity="0.18" />
                      <circle cx={ep.x} cy={ep.y} r="5" fill="white" stroke={sc} strokeWidth="2.5" />
                    </>
                  )}
                  {/* Score */}
                  <text x="120" y="133" textAnchor="middle" fontSize="42" fontWeight="700" fill={sc} fontFamily="Inter,sans-serif">
                    {d.riskScore}
                  </text>
                  <text x="120" y="150" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="Inter,sans-serif">/ 100</text>
                  {/* Zone labels */}
                  <text x="32"  y="180" textAnchor="middle" fontSize="8" fill="#16a34a" fontFamily="Inter,sans-serif">Selamat</text>
                  <text x="208" y="180" textAnchor="middle" fontSize="8" fill="#dc2626" fontFamily="Inter,sans-serif">Kritikal</text>
                </svg>

                <div className="text-center -mt-1">
                  <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold"
                    style={{ backgroundColor: sc + '1a', color: sc }}>
                    {d.riskLevel}
                  </span>
                </div>
              </div>

              {/* Economic Projection */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex-1">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Unjuran Ekonomi · 5 Hari</div>
                <div className="space-y-3">
                  <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                    <div className="text-xs text-red-500 font-semibold mb-0.5">Tanpa Tindakan</div>
                    <div className="text-2xl font-bold text-red-600">RM {d.proj.noLoss.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Kematian {d.proj.mortalityRange} · {d.proj.birdsRange} ekor
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <div className="text-xs text-emerald-600 font-semibold mb-0.5">Campur Tangan Awal</div>
                    <div className="text-2xl font-bold text-emerald-600">RM {d.proj.earlyLoss.toLocaleString()}</div>
                    <div className="text-xs text-emerald-700 font-semibold mt-1">
                      ↓ Jimat RM {(d.proj.noLoss - d.proj.earlyLoss).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right col: AI Diagnostic */}
            <div
              className="col-span-8 bg-white rounded-2xl flex flex-col overflow-hidden"
              style={{
                border: '1px solid #064E3B',
                boxShadow: '0 0 0 3px rgba(6,78,59,0.06), 0 4px 24px rgba(6,78,59,0.08)',
              }}
            >
              {/* Panel header */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-white/10 flex-shrink-0"
                style={{ backgroundColor: '#064E3B' }}>
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-emerald-300" />
                  <span className="text-white font-bold text-sm">Penaakulan Diagnostik AI</span>
                  <span className="text-emerald-400 text-xs italic">AI Diagnostic Reasoning</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-300 bg-white/10 px-2 py-0.5 rounded-full">Z.AI GLM</span>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${alert ? 'bg-red-400' : 'bg-emerald-400'}`} />
                </div>
              </div>

              <div className="flex-1 overflow-auto p-5 space-y-4">
                {/* Assessment */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <Activity size={11} /> Penilaian Situasi · Situation Assessment
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    {d.assessment}
                  </p>
                </div>

                {/* Hypotheses */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    <BookOpen size={11} /> Hipotesis Berurutan · Ranked Hypotheses
                  </div>
                  <div className="space-y-2">
                    {d.hypotheses.map((h, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: h.color }}>
                              {Math.round(h.confidence * 100)}% Padanan
                            </span>
                            <span className="text-sm font-semibold text-slate-800">{h.name}</span>
                          </div>
                          <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full flex-shrink-0">
                            {h.source}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${h.confidence * 100}%`, backgroundColor: h.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    <Shield size={11} /> Pelan Tindakan · Prioritized Action Plan
                  </div>
                  <div className="space-y-2">
                    {d.actions.map((a) => (
                      <div key={a.n} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: '#064E3B' }}>
                          {a.n}
                        </span>
                        <span className="flex-1 text-sm text-slate-700 leading-snug">{a.text}</span>
                        <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${a.ub} ${a.ut}`}>
                          {a.urgency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-slate-700">Trend Skor Risiko · 7 Hari</div>
                <div className="text-xs text-slate-400 mt-0.5">Risk Score Trend · Last 7 Days</div>
              </div>
              <div className="flex items-center gap-4">
                {[['#16a34a','Selamat'],['#ca8a04','Sederhana'],['#ea580c','Tinggi'],['#dc2626','Kritikal']].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: c }} />
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={[...d.trend]} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={sc} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={sc} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} ticks={[0,30,60,80,100]} />
                <Tooltip
                  formatter={(v: number) => [v, 'Skor']}
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                />
                <ReferenceLine y={30} stroke="#16a34a" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.5} />
                <ReferenceLine y={60} stroke="#ca8a04" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.5} />
                <ReferenceLine y={80} stroke="#ea580c" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.5} />
                <Area type="monotone" dataKey="score" stroke={sc} strokeWidth={2.5} fill="url(#rg)"
                  dot={{ r: 4, fill: sc, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: sc, stroke: 'white', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </main>
      </div>
    </div>
  )
}
