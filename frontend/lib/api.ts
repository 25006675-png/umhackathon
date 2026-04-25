import type { FarmAnalysis, GLMAnalysis, Alert, DailyReadingInput, FeedbackInput, BehaviourFlag, RiskLevel, RiskTrend, VentilationCondition } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL?.trim() ?? ''

// Dummy data matching the agreed JSON schema from work_split.md
export const DUMMY_ANALYSIS: FarmAnalysis = {
  farm_id: 'farm_001',
  flock_id: 'flock_2026_batch3',
  reading_date: '2026-04-23',
  analysis_status: 'preliminary',
  check_count: 3,
  day_completed_at: null,
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
  const res = await fetch(url, { cache: 'no-store', ...options })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export async function submitReading(
  data: DailyReadingInput,
  options?: { replaceToday?: boolean },
): Promise<FarmAnalysis> {
  if (!BASE) return DUMMY_ANALYSIS
  if (options?.replaceToday) {
    await clearTodayReadings(data.flock_id)
  }
  // Backend rejects ventilation_condition: null — omit when unset, let server default to "normal"
  const payload = { ...data }
  if (payload.ventilation_condition == null) delete payload.ventilation_condition
  const res = await fetch(`${BASE}/api/readings`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return getAnalysis(data.flock_id)
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

export async function sendChatMessage(
  message: string,
  flockId: string,
  language: 'en' | 'ms' | 'bilingual' = 'en',
): Promise<string> {
  if (!BASE) return 'Backend not connected. This is demo mode — please connect the API.'
  const res = await fetchJSON<{ reply: string }>(`${BASE}/api/glm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, flock_id: flockId, language }),
  })
  return res.reply
}

export interface TrendInsightPoint {
  day: string
  value: number | string | null
}

export async function explainTrendWithAI({
  flockId,
  metric,
  riskScore,
  riskLevel,
  topDriver,
  points,
  extraContext = [],
}: {
  flockId: string
  metric: string
  riskScore: number
  riskLevel: string
  topDriver?: string | null
  points: TrendInsightPoint[]
  extraContext?: string[]
}): Promise<string> {
  const seriesText = points
    .map((point) => `${point.day}: ${point.value == null ? 'not logged' : point.value}`)
    .join('\n')

  const contextText = extraContext.filter(Boolean).join('\n')

  const prompt = [
    `Explain the ${metric} trend for a poultry farmer in plain language.`,
    `Use a short answer with exactly these sections:`,
    `Trend:`,
    `What it may mean:`,
    `What to check next:`,
    ``,
    `Current flock risk score: ${riskScore} (${riskLevel})`,
    `Top driver: ${topDriver || 'Unknown'}`,
    ``,
    `${metric} trend data:`,
    seriesText,
    contextText ? `\nExtra context:\n${contextText}` : '',
    ``,
    `Rules:`,
    `- Be specific to this metric, not a generic farm summary.`,
    `- Do not claim a diagnosis from this metric alone.`,
    `- Keep it concise and practical.`,
  ]
    .filter(Boolean)
    .join('\n')

  if (!BASE) {
    return buildDemoTrendExplanation(metric, riskScore, riskLevel, points, extraContext)
  }

  return sendChatMessage(prompt, flockId, 'en')
}

function buildDemoTrendExplanation(
  metric: string,
  riskScore: number,
  riskLevel: string,
  points: TrendInsightPoint[],
  extraContext: string[],
): string {
  const recent = points.slice(-4)
  const numericValues = recent
    .map((point) => (typeof point.value === 'number' ? point.value : null))
    .filter((value): value is number => value != null)

  let trendSummary = 'The recent pattern is mixed.'
  if (numericValues.length >= 2) {
    const first = numericValues[0]
    const last = numericValues[numericValues.length - 1]
    if (last > first) trendSummary = `The recent pattern is rising from ${first} to ${last}.`
    else if (last < first) trendSummary = `The recent pattern is falling from ${first} to ${last}.`
    else trendSummary = `The recent pattern is broadly stable around ${last}.`
  } else if (recent.length > 0) {
    trendSummary = `Recent entries show: ${recent.map((point) => `${point.day} ${point.value}`).join(', ')}.`
  }

  const context = extraContext[0] ? ` ${extraContext[0]}` : ''

  return [
    `Trend: ${trendSummary}`,
    `What it may mean: This ${metric.toLowerCase()} pattern should be read together with the overall risk score of ${riskScore} (${riskLevel}).${context}`,
    `What to check next: Compare this trend with the latest environment, behaviour, and mortality changes before deciding whether it is a normal fluctuation or a warning sign.`,
  ].join('\n')
}

export async function explainTrajectoryWithAI({
  flockId,
  analysis,
  history,
}: {
  flockId: string
  analysis: FarmAnalysis
  history: HistoryEntry[]
}): Promise<string> {
  const recent = history.slice(-7)
  const historyText = recent
    .map((entry) => {
      const date = entry.reading_date ?? entry.timestamp.slice(0, 10)
      return `${date}: risk ${entry.score}, temp ${entry.temperature_celsius ?? 'n/a'}, feed ${entry.feed_intake_kg ?? 'n/a'}, water ${entry.water_intake_liters ?? 'n/a'}, mortality ${entry.mortality ?? 'n/a'}, ventilation ${entry.ventilation_condition ?? 'normal'}, behaviour ${entry.behaviour_flags?.join(', ') || 'none'}`
    })
    .join('\n')

  const prompt = [
    `Explain the flock trajectory over recent days for a poultry farmer.`,
    `Respond with exactly these sections:`,
    `Trend:`,
    `What it may mean:`,
    `What to check next:`,
    ``,
    `Current risk: ${analysis.risk.score} (${analysis.risk.level})`,
    `Recent daily history:`,
    historyText,
    ``,
    `Focus on sequence, earliest warning sign, current strongest signal, and whether the flock is worsening, stabilizing, or recovering.`,
  ].join('\n')

  if (!BASE) {
    const first = recent[0]
    const last = recent[recent.length - 1]
    const direction = first && last ? (last.score > first.score ? 'worsening' : last.score < first.score ? 'recovering' : 'stable') : 'stable'
    return [
      `Trend: Over the last ${recent.length} days the flock has been ${direction}, with risk moving from ${first?.score ?? analysis.risk.score} to ${last?.score ?? analysis.risk.score}.`,
      `What it may mean: The sequence suggests early intake changes were followed by environment and behaviour pressure, which is more informative than looking at today alone.`,
      `What to check next: Confirm whether ventilation and water intake improve first. If they do not, the trajectory still points to ongoing flock stress.`,
    ].join('\n')
  }

  return sendChatMessage(prompt, flockId, 'en')
}

export async function explainRangeIntelligenceWithAI({
  flockId,
  rangeLabel,
  history,
}: {
  flockId: string
  rangeLabel: string
  history: HistoryEntry[]
}): Promise<string> {
  const series = history
    .map((entry) => {
      const date = entry.reading_date ?? entry.timestamp.slice(0, 10)
      return `${date}: risk ${entry.score}, temp ${entry.temperature_celsius ?? 'n/a'}, feed ${entry.feed_intake_kg ?? 'n/a'}, water ${entry.water_intake_liters ?? 'n/a'}, mortality ${entry.mortality ?? 'n/a'}, ventilation ${entry.ventilation_condition ?? 'normal'}, behaviour ${entry.behaviour_flags?.join(', ') || 'none'}, notes ${entry.farmer_notes?.trim() || 'none'}`
    })
    .join('\n')

  const prompt = [
    `Analyse this multi-variable poultry flock trend over ${rangeLabel}.`,
    `Respond with exactly these three sections in order:`,
    `Pattern Analysis:`,
    `Recommended Next Actions:`,
    `Projected Scenario:`,
    ``,
    `Daily data:`,
    series,
    ``,
    `Instructions:`,
    `- Pattern Analysis: identify which signals changed first and which variables moved together. Say whether the flock is worsening, stabilizing, or recovering.`,
    `- Recommended Next Actions: list practical actions in priority order, numbered.`,
    `- Projected Scenario: if no action is taken, give a concrete estimate of mortality range (% and birds), financial loss in RM, and potential savings with early intervention. Base it on the trend trajectory.`,
    `- Keep it concise and grounded in the data.`,
  ].join('\n')

  if (!BASE) {
    return buildRangeExplanation(rangeLabel, history)
  }

  const res = await fetchJSON<{ reply: string }>(`${BASE}/api/glm/trends/${flockId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt, flock_id: flockId, language: 'en' }),
  })
  return res.reply || buildRangeExplanation(rangeLabel, history)
}

function buildRangeExplanation(rangeLabel: string, history: HistoryEntry[]): string {
  const first = history[0]
  const last = history[history.length - 1]
  const direction =
    first && last ? (last.score > first.score ? 'worsening' : last.score < first.score ? 'recovering' : 'stable') : 'stable'

  const topSignals = [
    last?.feed_intake_kg != null && first?.feed_intake_kg != null && last.feed_intake_kg < first.feed_intake_kg ? 'feed decline' : null,
    last?.water_intake_liters != null && first?.water_intake_liters != null && last.water_intake_liters < first.water_intake_liters ? 'water decline' : null,
    last?.temperature_celsius != null && first?.temperature_celsius != null && last.temperature_celsius > first.temperature_celsius ? 'temperature rise' : null,
    last?.ventilation_condition && last.ventilation_condition !== 'normal' ? `ventilation ${last.ventilation_condition}` : null,
    (last?.behaviour_flags?.length ?? 0) > (first?.behaviour_flags?.length ?? 0) ? 'behaviour flags spreading' : null,
    last?.mortality != null && first?.mortality != null && last.mortality > first.mortality ? 'mortality rising' : null,
  ].filter(Boolean)

  const actionLead =
    last?.ventilation_condition && last.ventilation_condition !== 'normal'
      ? 'Check ventilation and shed air quality first.'
      : last?.water_intake_liters != null && first?.water_intake_liters != null && last.water_intake_liters < first.water_intake_liters
        ? 'Check water delivery and bird access first.'
        : 'Recheck the strongest changing signals first.'

  const lastScore = last?.score ?? 0
  const projMortPct = lastScore >= 80 ? '30–50%' : lastScore >= 60 ? '15–30%' : '5–15%'
  const projBirds = lastScore >= 80 ? '1,500–2,500' : lastScore >= 60 ? '750–1,500' : '250–750'
  const projLoss = lastScore >= 80 ? 'RM 10,500–17,500' : lastScore >= 60 ? 'RM 5,000–10,000' : 'RM 1,500–5,000'
  const projSaving = lastScore >= 80 ? 'RM 1,750–3,500' : lastScore >= 60 ? 'RM 1,000–2,500' : 'RM 500–1,500'

  return [
    `Pattern Analysis: Over ${rangeLabel}, the flock trend is ${direction}. ${topSignals.length > 0 ? `The clearest linked changes are ${topSignals.join(', ')}.` : 'No single signal dominates the window.'} The recent pattern should be treated as a multi-signal change rather than a one-day anomaly.`,
    `Recommended Next Actions: 1. ${actionLead} 2. Physically verify barn ventilation, water delivery, feed response, and behaviour together. 3. If mortality continues to rise while intake stays weak, escalate intervention quickly.`,
    `Projected Scenario: Without intervention, estimated mortality is ${projMortPct} of the flock (${projBirds} birds) within 5 days, with financial losses of ${projLoss}. Early action could reduce losses to ${projSaving}.`,
  ].join('\n')
}

export async function askAnalysisFollowUpWithAI({
  flockId,
  analysis,
  glm,
  history,
  question,
}: {
  flockId: string
  analysis: FarmAnalysis
  glm: GLMAnalysis | null
  history: HistoryEntry[]
  question: string
}): Promise<string> {
  const recent = history.slice(-5)
    .map((entry) => {
      const date = entry.reading_date ?? entry.timestamp.slice(0, 10)
      return `${date}: risk ${entry.score}, feed ${entry.feed_intake_kg ?? 'n/a'}, water ${entry.water_intake_liters ?? 'n/a'}, mortality ${entry.mortality ?? 'n/a'}, ventilation ${entry.ventilation_condition ?? 'normal'}, flags ${entry.behaviour_flags?.join(', ') || 'none'}`
    })
    .join('\n')

  const prompt = [
    `Answer this follow-up question about the current flock analysis.`,
    ``,
    `Question: ${question}`,
    `Current risk: ${analysis.risk.score} (${analysis.risk.level})`,
    `Top hypotheses: ${glm?.hypothesis.map((item) => item.disease).join(', ') || 'not generated yet'}`,
    `Recent trajectory:`,
    recent,
    `Current notes: ${analysis.signals.farmer_notes || 'none'}`,
    ``,
    `Keep the answer short, grounded in the available data, and do not overclaim certainty.`,
  ].join('\n')

  if (!BASE) {
    return `Based on the current signals and recent trajectory, ${question.toLowerCase()} should be answered by checking the strongest driver first, then confirming whether feed, water, environment, and mortality are moving together or not.`
  }

  return sendChatMessage(prompt, flockId, 'en')
}

type ScenarioKey =
  | 'ventilation_recovers'
  | 'water_improves'
  | 'mortality_rises_two'

export function simulateScenarioFromAnalysis(analysis: FarmAnalysis, scenario: ScenarioKey) {
  const signals = {
    temperature_celsius: analysis.signals.temperature_celsius,
    feed_intake_kg: analysis.signals.feed_intake_kg,
    mortality_count: analysis.signals.mortality_count,
    water_intake_liters: analysis.signals.water_intake_liters ?? null,
    ventilation_condition: analysis.signals.ventilation_condition ?? 'normal',
    behaviour_flags: [...(analysis.signals.behaviour_flags ?? [])],
    farmer_notes: analysis.signals.farmer_notes,
  }

  if (scenario === 'ventilation_recovers') {
    signals.ventilation_condition = 'normal'
  }
  if (scenario === 'water_improves' && analysis.baselines.water_intake_liters != null) {
    signals.water_intake_liters = analysis.baselines.water_intake_liters
  }
  if (scenario === 'mortality_rises_two') {
    signals.mortality_count = (signals.mortality_count ?? 0) + 2
  }

  const simulated = computeRisk({
    signals,
    baselines: analysis.baselines,
    flockSize: analysis.flock_size,
    previousScores: analysis.risk.previous_scores.slice(0, -1),
  })

  return {
    signals,
    risk: simulated,
  }
}

export async function explainScenarioWithAI({
  flockId,
  analysis,
  history,
  scenarioLabel,
  simulated,
}: {
  flockId: string
  analysis: FarmAnalysis
  history: HistoryEntry[]
  scenarioLabel: string
  simulated: ReturnType<typeof simulateScenarioFromAnalysis>
}): Promise<string> {
  const prompt = [
    `Explain a what-if farm scenario for a poultry farmer.`,
    `Respond with exactly these sections:`,
    `Trend:`,
    `What it may mean:`,
    `What to check next:`,
    ``,
    `Current score: ${analysis.risk.score} (${analysis.risk.level})`,
    `Scenario: ${scenarioLabel}`,
    `Simulated score: ${simulated.risk.score} (${simulated.risk.level})`,
    `Changed signals: temperature ${simulated.signals.temperature_celsius}, feed ${simulated.signals.feed_intake_kg}, water ${simulated.signals.water_intake_liters}, mortality ${simulated.signals.mortality_count}, ventilation ${simulated.signals.ventilation_condition}`,
    `Recent history summary: ${history.slice(-3).map((entry) => `${entry.reading_date ?? entry.timestamp.slice(0, 10)} risk ${entry.score}`).join(', ')}`,
    ``,
    `Explain how the scenario changes the interpretation and action priority.`,
  ].join('\n')

  if (!BASE) {
    const delta = simulated.risk.score - analysis.risk.score
    return [
      `Trend: This scenario changes the projected score by ${delta >= 0 ? '+' : ''}${delta}, from ${analysis.risk.score} to ${simulated.risk.score}.`,
      `What it may mean: ${delta < 0 ? 'This would ease pressure on the flock if the change is real.' : 'This would worsen the risk picture and make the current concern more urgent.'}`,
      `What to check next: Confirm whether the changed signal is sustained on the next reading before changing the action plan.`,
    ].join('\n')
  }

  return sendChatMessage(prompt, flockId, 'en')
}

function computeRisk({
  signals,
  baselines,
  flockSize,
  previousScores,
}: {
  signals: {
    temperature_celsius: number | null
    feed_intake_kg: number | null
    mortality_count: number | null
    water_intake_liters: number | null
    ventilation_condition?: VentilationCondition | null
    behaviour_flags?: string[]
    farmer_notes: string
  }
  baselines: FarmAnalysis['baselines']
  flockSize: number
  previousScores: number[]
}): { score: number; level: RiskLevel; trend: RiskTrend } {
  const baselineFeed = Math.max(0.1, baselines.feed_intake_kg || 0.1)
  const feedDropPct =
    signals.feed_intake_kg != null ? Math.max(0, ((baselineFeed - signals.feed_intake_kg) / baselineFeed) * 100) : 0

  const baselineWater = baselines.water_intake_liters
  const waterDropPct =
    baselineWater && signals.water_intake_liters != null
      ? Math.max(0, ((baselineWater - signals.water_intake_liters) / baselineWater) * 100)
      : null

  const tempDelta =
    signals.temperature_celsius != null ? signals.temperature_celsius - baselines.temperature_celsius : 0

  const mortPct =
    signals.mortality_count != null ? (signals.mortality_count / Math.max(1, flockSize)) * 100 : 0

  const behaviourWeights: Record<string, number> = {
    water_change: 2,
    abnormal_sounds: 3,
    huddling_panting: 3,
    reduced_movement: 2,
  }
  const ventilationScores: Record<string, number> = {
    normal: 0,
    mild: 7,
    strong: 12,
    sensor_high: 15,
  }

  const feedScore = feedDropPct < 5 ? 0 : feedDropPct < 8 ? 8 : feedDropPct < 12 ? 14 : 20
  const waterScore =
    waterDropPct == null || waterDropPct < 5 ? 0 : waterDropPct < 10 ? 4 : waterDropPct < 15 ? 7 : 10
  const tempMag = Math.abs(tempDelta)
  const tempScore = tempMag < 1 ? 0 : tempMag < 1.5 ? 8 : tempMag < 2 ? 15 : 20
  const mortalityScore = mortPct <= 0.05 ? 0 : mortPct < 0.2 ? 8 : mortPct < 0.5 ? 15 : 20
  const airScore = ventilationScores[(signals.ventilation_condition || 'normal').toLowerCase()] ?? 0
  const behaviourScore = Math.min(
    10,
    (signals.behaviour_flags ?? []).reduce((sum, flag) => sum + (behaviourWeights[flag] ?? 0), 0),
  )

  const categoryScores = [feedScore, waterScore, tempScore, mortalityScore, airScore, behaviourScore]
  const abnormalCategories = categoryScores.filter((score) => score > 0).length
  const combo = abnormalCategories >= 4 ? 10 : abnormalCategories === 3 ? 7 : abnormalCategories === 2 ? 4 : 0
  const finalScore = Math.min(100, categoryScores.reduce((sum, score) => sum + score, 0) + combo)
  const level: RiskLevel =
    finalScore <= 30 ? 'Low' : finalScore <= 60 ? 'Moderate' : finalScore <= 80 ? 'High' : 'Critical'
  const last = previousScores[previousScores.length - 1] ?? 0
  const trend: RiskTrend = finalScore > last ? 'rising' : finalScore < last ? 'falling' : 'stable'

  return { score: finalScore, level, trend }
}

export interface HistoryEntry {
  timestamp: string
  reading_date?: string
  score: number
  level: 'Low' | 'Moderate' | 'High' | 'Critical'
  mortality: number | null
  status: 'preliminary' | 'official'
  check_count: number
  // Optional — may not be present on older backend responses
  temperature_celsius?: number | null
  feed_intake_kg?: number | null
  water_intake_liters?: number | null
  ventilation_condition?: string | null
  behaviour_flags?: string[]
  farmer_notes?: string
  top_driver?: string
}

const LEVEL_FOR = (s: number): HistoryEntry['level'] =>
  s >= 80 ? 'Critical' : s >= 60 ? 'High' : s >= 30 ? 'Moderate' : 'Low'

export async function getHistory(flockId: string, days = 30): Promise<HistoryEntry[]> {
  if (!BASE) return buildDemoHistory(days)
  const res = await fetchJSON<{ entries: HistoryEntry[] }>(`${BASE}/api/analysis/${flockId}/history?days=${days}`)
  const latestByDate = new Map<string, HistoryEntry>()
  for (const entry of res.entries) {
    const key = entry.reading_date ?? entry.timestamp.slice(0, 10)
    const current = latestByDate.get(key)
    if (!current || entry.timestamp >= current.timestamp) {
      latestByDate.set(key, entry)
    }
  }
  const entries = Array.from(latestByDate.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return isSparseHistory(entries) ? buildDemoHistory(days) : entries
}

function isSparseHistory(entries: HistoryEntry[]) {
  if (entries.length < 7) return true
  const richEntries = entries.filter(
    (entry) =>
      entry.temperature_celsius != null ||
      entry.feed_intake_kg != null ||
      entry.water_intake_liters != null ||
      !!entry.ventilation_condition ||
      (entry.behaviour_flags?.length ?? 0) > 0 ||
      !!entry.farmer_notes?.trim(),
  )
  return richEntries.length < Math.ceil(entries.length * 0.6)
}

function buildDemoHistory(days: number): HistoryEntry[] {
  const entries: Omit<HistoryEntry, 'timestamp' | 'reading_date'>[] = [
    {
      score: 18,
      level: LEVEL_FOR(18),
      mortality: 1,
      status: 'official',
      check_count: 1,
      temperature_celsius: 30.0,
      feed_intake_kg: 52.8,
      water_intake_liters: 108,
      ventilation_condition: 'normal',
      behaviour_flags: [],
      farmer_notes: 'Routine check. Birds active and feed clearance looks normal.',
      top_driver: 'Normal',
    },
    {
      score: 20,
      level: LEVEL_FOR(20),
      mortality: 1,
      status: 'official',
      check_count: 1,
      temperature_celsius: 30.1,
      feed_intake_kg: 52.5,
      water_intake_liters: 107,
      ventilation_condition: 'normal',
      behaviour_flags: [],
      farmer_notes: 'No obvious issue. House remains dry and birds stay active.',
      top_driver: 'Normal',
    },
    {
      score: 22,
      level: LEVEL_FOR(22),
      mortality: 1,
      status: 'official',
      check_count: 1,
      temperature_celsius: 30.2,
      feed_intake_kg: 52.1,
      water_intake_liters: 105,
      ventilation_condition: 'normal',
      behaviour_flags: [],
      farmer_notes: 'Slightly warmer by afternoon, but flock still looks steady.',
      top_driver: 'Normal',
    },
    {
      score: 25,
      level: LEVEL_FOR(25),
      mortality: 1,
      status: 'official',
      check_count: 2,
      temperature_celsius: 30.4,
      feed_intake_kg: 51.4,
      water_intake_liters: 103,
      ventilation_condition: 'normal',
      behaviour_flags: [],
      farmer_notes: 'Feed clears a bit slower than usual, but flock still appears calm.',
      top_driver: 'Feed intake',
    },
    {
      score: 31,
      level: LEVEL_FOR(31),
      mortality: 1,
      status: 'official',
      check_count: 2,
      temperature_celsius: 30.8,
      feed_intake_kg: 50.1,
      water_intake_liters: 99,
      ventilation_condition: 'mild',
      behaviour_flags: ['water_change'],
      farmer_notes: 'Water line looks softer than normal and a faint ammonia smell appears.',
      top_driver: 'Water intake',
    },
    {
      score: 38,
      level: LEVEL_FOR(38),
      mortality: 2,
      status: 'official',
      check_count: 2,
      temperature_celsius: 31.2,
      feed_intake_kg: 48.8,
      water_intake_liters: 96,
      ventilation_condition: 'mild',
      behaviour_flags: ['water_change'],
      farmer_notes: 'Feed trays are not clearing as quickly. More birds look dull by evening.',
      top_driver: 'Feed drop',
    },
    {
      score: 47,
      level: LEVEL_FOR(47),
      mortality: 2,
      status: 'official',
      check_count: 2,
      temperature_celsius: 31.7,
      feed_intake_kg: 47.2,
      water_intake_liters: 93,
      ventilation_condition: 'mild',
      behaviour_flags: ['water_change', 'reduced_movement'],
      farmer_notes: 'More birds remain seated longer. Feed and water are both trailing baseline.',
      top_driver: 'Feed drop',
    },
    {
      score: 58,
      level: LEVEL_FOR(58),
      mortality: 3,
      status: 'official',
      check_count: 3,
      temperature_celsius: 32.3,
      feed_intake_kg: 45.3,
      water_intake_liters: 89,
      ventilation_condition: 'strong',
      behaviour_flags: ['water_change', 'reduced_movement', 'abnormal_sounds'],
      farmer_notes: 'Quiet breathing sounds heard in one section. House feels heavier after noon.',
      top_driver: 'Environment',
    },
    {
      score: 67,
      level: LEVEL_FOR(67),
      mortality: 3,
      status: 'official',
      check_count: 2,
      temperature_celsius: 32.9,
      feed_intake_kg: 43.8,
      water_intake_liters: 86,
      ventilation_condition: 'strong',
      behaviour_flags: ['water_change', 'reduced_movement', 'abnormal_sounds'],
      farmer_notes: 'More birds stay clustered. Feed and water both keep slipping.',
      top_driver: 'Environment',
    },
    {
      score: 75,
      level: LEVEL_FOR(75),
      mortality: 4,
      status: 'official',
      check_count: 3,
      temperature_celsius: 33.3,
      feed_intake_kg: 42.6,
      water_intake_liters: 83,
      ventilation_condition: 'strong',
      behaviour_flags: ['water_change', 'abnormal_sounds', 'huddling_panting', 'reduced_movement'],
      farmer_notes: 'Panting starts to show in patches and respiratory sounds are easier to hear.',
      top_driver: 'Behaviour',
    },
    {
      score: 83,
      level: LEVEL_FOR(83),
      mortality: 5,
      status: 'official',
      check_count: 3,
      temperature_celsius: 33.8,
      feed_intake_kg: 41.2,
      water_intake_liters: 79,
      ventilation_condition: 'sensor_high',
      behaviour_flags: ['water_change', 'abnormal_sounds', 'huddling_panting', 'reduced_movement'],
      farmer_notes: 'Ammonia sensor alarm triggers. More birds panting by late afternoon.',
      top_driver: 'Environment',
    },
    {
      score: 79,
      level: LEVEL_FOR(79),
      mortality: 4,
      status: 'official',
      check_count: 2,
      temperature_celsius: 33.4,
      feed_intake_kg: 41.8,
      water_intake_liters: 81,
      ventilation_condition: 'strong',
      behaviour_flags: ['abnormal_sounds', 'huddling_panting', 'reduced_movement'],
      farmer_notes: 'Ventilation adjustment helps slightly, but flock still looks under pressure.',
      top_driver: 'Environment',
    },
    {
      score: 84,
      level: LEVEL_FOR(84),
      mortality: 5,
      status: 'official',
      check_count: 3,
      temperature_celsius: 34.0,
      feed_intake_kg: 40.7,
      water_intake_liters: 78,
      ventilation_condition: 'sensor_high',
      behaviour_flags: ['water_change', 'abnormal_sounds', 'huddling_panting', 'reduced_movement'],
      farmer_notes: 'False recovery did not hold. Feed and water drop again and the smell is back.',
      top_driver: 'Environment',
    },
    {
      score: 86,
      level: LEVEL_FOR(86),
      mortality: 6,
      status: 'preliminary',
      check_count: 2,
      temperature_celsius: 34.2,
      feed_intake_kg: 39.9,
      water_intake_liters: 76,
      ventilation_condition: 'sensor_high',
      behaviour_flags: ['water_change', 'abnormal_sounds', 'huddling_panting', 'reduced_movement'],
      farmer_notes: 'Latest check is critical again. Multiple signals worsen together and birds remain subdued.',
      top_driver: 'Feed + environment + behaviour',
    },
  ]

  return entries
    .slice(-days)
    .map((entry, i, arr) => {
      const offset = arr.length - 1 - i
      const date = new Date(Date.now() - offset * 86400000)
      return {
        ...entry,
        timestamp: date.toISOString(),
        reading_date: date.toISOString().slice(0, 10),
      }
    })
}

export async function getGLMAnalysisForDate(
  flockId: string,
  readingDate: string,
): Promise<GLMAnalysis> {
  if (!BASE) return DUMMY_GLM
  // For the demo we regenerate via the current-day endpoint; a real backend
  // should accept a date param so the GLM runs against that day's context.
  return fetchJSON<GLMAnalysis>(
    `${BASE}/api/glm/analyse/${flockId}?date=${encodeURIComponent(readingDate)}`,
    { method: 'POST' },
  )
}

export async function clearTodayReadings(flockId: string): Promise<void> {
  if (!BASE) return
  const res = await fetch(`${BASE}/api/readings/today/${flockId}`, {
    method: 'DELETE',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function submitFeedback(data: FeedbackInput): Promise<void> {
  if (!BASE) return
  await fetch(`${BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
