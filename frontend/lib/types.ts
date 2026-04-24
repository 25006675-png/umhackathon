export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";
export type RiskTrend = "stable" | "rising" | "falling";

export interface FlockCreateInput {
  flock_id: string;
  flock_size: number;
  farm_id: string;
  age_days: number;
  start_date?: string;
}

export interface DailyReadingInput {
  flock_id: string;
  temperature_celsius: number;
  feed_intake_kg: number;
  mortality_count: number;
  farmer_notes?: string | null;
  timestamp?: string;
}

export interface FeedbackInput {
  flock_id: string;
  action_taken: string;
  outcome: string;
}

export interface Signals {
  temperature_celsius: number;
  feed_intake_kg: number;
  mortality_count: number;
  farmer_notes?: string | null;
}

export interface Baselines {
  temperature_celsius: number;
  feed_intake_kg: number;
  mortality_count: number;
}

export interface Deviations {
  temperature: number;
  feed_intake: number;
  mortality: number;
}

export interface Risk {
  score: number;
  level: RiskLevel;
  trend: RiskTrend;
  previous_scores: number[];
}

export interface Projections {
  mortality_range_percent: [number, number];
  mortality_range_birds: [number, number];
  financial_loss_rm: [number, number];
  early_intervention_loss_rm: [number, number];
  time_horizon_days: number;
}

export interface FarmDataResponse {
  farm_id: string;
  flock_id: string;
  flock_age_days: number;
  flock_size: number;
  timestamp: string;
  signals: Signals;
  baselines: Baselines;
  deviations: Deviations;
  risk: Risk;
  projections: Projections;
}

export interface ReadingRecord extends DailyReadingInput {
  reading_id: number;
  timestamp: string;
}

export interface ReadingHistoryResponse {
  flock_id: string;
  history: ReadingRecord[];
}

export interface AlertRecord {
  alert_id: number;
  flock_id: string;
  timestamp: string;
  level: RiskLevel;
  score: number;
}

export interface ActiveAlertsResponse {
  flock_id: string;
  active_alerts: AlertRecord[];
}

export interface AlertHistoryResponse {
  flock_id: string;
  alerts: AlertRecord[];
}
