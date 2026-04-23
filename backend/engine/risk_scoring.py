# Layer 3 — Risk Scoring Engine
#
# Computes a composite risk score (0-100) from signal deviations.
#
# Weights:
#   feed_drop:              0.35  (earliest, most reliable indicator)
#   temperature_change:     0.25  (environmental trigger)
#   mortality_increase:     0.25  (direct outcome signal)
#   multi_signal_interaction: 0.15  (compound patterns amplify risk)
#
# Output:
#   risk_score: int (0-100)
#   risk_level: str (Low / Moderate / High / Critical)
#   trend: str (stable / rising / falling)
