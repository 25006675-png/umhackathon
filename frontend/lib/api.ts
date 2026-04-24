import type { FarmAnalysis, GLMAnalysis, Alert, DailyReadingInput, FeedbackInput } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

// Dummy data matching the agreed JSON schema from work_split.md
export const DUMMY_ANALYSIS: FarmAnalysis = {
  farm_id: 'farm_001',
  flock_id: 'flock_2026_batch3',
  flock_age_days: 28,
  flock_size: 5000,
  timestamp: '2026-04-23T08:00:00+08:00',
  signals: {
    temperature_celsius: 33.5,
    feed_intake_kg: 42.0,
    mortality_count: 3,
    farmer_notes: 'ayam senyap sikit, kurang makan',
  },
  baselines: {
    temperature_celsius: 30.2,
    feed_intake_kg: 51.3,
    mortality_count: 1.0,
  },
  deviations: {
    temperature: 0.109,
    feed_intake: -0.181,
    mortality: 2.0,
  },
  risk: {
    score: 72,
    level: 'High',
    trend: 'rising',
    previous_scores: [35, 42, 58, 72],
  },
  projections: {
    mortality_range_percent: [30, 50],
    mortality_range_birds: [1500, 2500],
    financial_loss_rm: [10500, 17500],
    early_intervention_loss_rm: [1750, 3500],
    time_horizon_days: 5,
  },
}

export const DUMMY_GLM: GLMAnalysis = {
  interpretation:
    'Flock menunjukkan tanda-tanda tekanan sederhana hingga teruk. Suhu reban melebihi paras selamat sebanyak 10.9%, manakala pengambilan makanan jatuh 18.1% di bawah garis asas. Kadar kematian adalah 2x ganda norma. Corak ini konsisten dengan permulaan jangkitan pernafasan atau tekanan haba.',
  hypothesis: [
    {
      disease: 'Chronic Respiratory Disease (CRD)',
      confidence: 0.72,
      reasoning: 'Suhu tinggi, nafsu makan rendah, ayam pendiam — tanda klasik CRD',
    },
    {
      disease: 'Heat Stress',
      confidence: 0.55,
      reasoning: 'Suhu reban 3.3°C melebihi paras optimum',
    },
    {
      disease: 'Newcastle Disease',
      confidence: 0.3,
      reasoning: 'Perlu pemerhatian lanjut — kematian meningkat',
    },
  ],
  recommendations: [
    'Hubungi doktor veterinar dalam masa 24 jam',
    'Tingkatkan pengudaraan reban segera — buka semua tirai samping',
    'Periksa semua ayam secara visual — cari tanda batuk, bersin, atau pernafasan labuh',
    'Pastikan bekalan air bersih dan dingin mencukupi',
    'Asingkan ayam yang menunjukkan gejala ke pen berasingan',
  ],
  narration:
    '⚠️ Tanpa tindakan: Kematian dijangka 30–50% (1,500–2,500 ekor) dalam 5 hari. Kerugian RM 10,500–17,500.\n✅ Bertindak sekarang: Kerugian boleh dikurangkan kepada RM 1,750–3,500 dengan rawatan awal.',
  generated_at: '2026-04-23T08:00:00+08:00',
}

export const DUMMY_ALERTS: Alert[] = [
  {
    id: 'alert_001',
    flock_id: 'flock_2026_batch3',
    risk_level: 'High',
    trigger: 'Suhu +10.9%, Makanan -18.1%, Kematian 3x ganda',
    immediate_action: 'Hubungi veterinar dalam 24 jam. Tingkatkan pengudaraan segera.',
    created_at: '2026-04-23T08:00:00+08:00',
    active: true,
  },
]

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export async function submitReading(data: DailyReadingInput): Promise<void> {
  if (!BASE) return
  await fetch(`${BASE}/api/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function getAnalysis(flockId: string): Promise<FarmAnalysis> {
  if (!BASE) return DUMMY_ANALYSIS
  return fetchJSON<FarmAnalysis>(`${BASE}/api/analysis/${flockId}`)
}

export async function getGLMAnalysis(flockId: string): Promise<GLMAnalysis> {
  if (!BASE) return DUMMY_GLM
  return fetchJSON<GLMAnalysis>(`${BASE}/api/glm/analyse/${flockId}`, { method: 'POST' })
}

export async function getAlerts(flockId: string): Promise<Alert[]> {
  if (!BASE) return DUMMY_ALERTS
  return fetchJSON<Alert[]>(`${BASE}/api/alerts/${flockId}`)
}

export async function getComparison(flockId: string): Promise<{ with_glm: GLMAnalysis | null; without_glm: null }> {
  if (!BASE) return { with_glm: DUMMY_GLM, without_glm: null }
  return fetchJSON(`${BASE}/api/glm/compare/${flockId}`)
}

export async function sendChatMessage(message: string, flockId: string): Promise<string> {
  if (!BASE) return 'Maaf, backend belum bersambung. Ini adalah mod demo — sila hubungi Person 1 untuk menyambungkan API.'
  const res = await fetchJSON<{ reply: string }>(`${BASE}/api/glm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, flock_id: flockId }),
  })
  return res.reply
}

export async function submitFeedback(data: FeedbackInput): Promise<void> {
  if (!BASE) return
  await fetch(`${BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
