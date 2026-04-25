export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical'
export type RiskTrend = 'stable' | 'rising' | 'falling'
export type AnalysisStatus = 'preliminary' | 'official'

export interface FarmSignals {
  temperature_celsius: number | null
  feed_intake_kg: number | null
  mortality_count: number | null
  water_intake_liters?: number | null
  ventilation_condition?: VentilationCondition
  behaviour_flags?: string[]
  farmer_notes: string
}

export interface FarmBaselines {
  temperature_celsius: number
  feed_intake_kg: number
  mortality_count: number
  water_intake_liters?: number | null
}

export interface Deviations {
  temperature: number
  feed_intake: number
  mortality: number
}

export type VentilationCondition = 'normal' | 'mild' | 'strong' | 'sensor_high'
export type BehaviourFlag = 'water_change' | 'abnormal_sounds' | 'huddling_panting' | 'reduced_movement'

export interface RiskBreakdown {
  feed: { score: number; max: number; drop_pct: number }
  water: { score: number; max: number; drop_pct: number | null }
  temperature: { score: number; max: number; delta_c: number }
  mortality: { score: number; max: number; pct_flock_day: number }
  air_quality: { score: number; max: number; condition: string }
  behaviour: { score: number; max: number; flags: string[] }
  combination_bonus: number
  sustained_bonus: number
  abnormal_categories: number
}

export interface Risk {
  score: number
  level: RiskLevel
  trend: RiskTrend
  previous_scores: number[]
  breakdown?: RiskBreakdown
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
  reading_date: string
  analysis_status: AnalysisStatus
  check_count: number
  day_completed_at?: string | null
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
  temperature_celsius?: number | null
  feed_intake_kg?: number | null
  mortality_count?: number | null
  water_intake_liters?: number | null
  ventilation_condition?: VentilationCondition | null
  behaviour_flags?: BehaviourFlag[]
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
