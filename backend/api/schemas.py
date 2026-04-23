# Pydantic Schemas — Request/Response Models
#
# Defines the data contracts between frontend and backend.
# Based on the agreed JSON handoff schema (see work_split.md).
#
# Key schemas:
# - DailyReadingInput:  temperature, feed_intake, mortality_count, farmer_notes
# - RiskAssessment:     deviations, risk score/level/trend, projections
# - GLMAnalysis:        interpretation, hypothesis, recommendations, narration
# - AlertResponse:      alert level, message, recommended actions
