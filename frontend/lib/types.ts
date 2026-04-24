export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical'
export type RiskTrend = 'stable' | 'rising' | 'falling'

export interface FarmSignals {
  temperature_celsius: number
  feed_intake_kg: number
  mortality_count: number
  farmer_notes: string
}

export interface FarmBaselines {
  temperature_celsius: number
  feed_intake_kg: number
  mortality_count: number
}

export interface Deviations {
  temperature: number
  feed_intake: number
  mortality: number
}

export interface Risk {
  score: number
  level: RiskLevel
  trend: RiskTrend
  previous_scores: number[]
}

export interface Projections {
  mortality_range_percent: [number, number]
  mortality_range_birds: [number, number]
  financial_loss_rm: [number, number]
  early_intervention_loss_rm: [number, number]
  time_horizon_days: number
}

export interface FarmAnalysis {
  farm_id: string
  flock_id: string
  flock_age_days: number
  flock_size: number
  timestamp: string
  signals: FarmSignals
  baselines: FarmBaselines
  deviations: Deviations
  risk: Risk
  projections: Projections
}

export interface DailyReadingInput {
  farm_id: string
  flock_id: string
  temperature_celsius: number
  feed_intake_kg: number
  mortality_count: number
  farmer_notes: string
}

export interface DiseaseHypothesis {
  disease: string
  confidence: number
  reasoning: string
  citations?: string[]
}

export interface GLMAnalysis {
  interpretation: string
  hypothesis: DiseaseHypothesis[]
  recommendations: string[]
  narration: string
  constraint_based_recs?: string[]
  generated_at: string
}

export interface Alert {
  id: string
  flock_id: string
  risk_level: RiskLevel
  trigger: string
  immediate_action: string
  created_at: string
  active: boolean
}

export interface FeedbackInput {
  flock_id: string
  helpful: boolean
  comment?: string
}
