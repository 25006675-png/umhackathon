# Layer 4 — Projection Engine
#
# Maps current risk score to expected outcomes using predefined
# outbreak progression curves.
#
# Output:
#   mortality_range_percent: [low, high]
#   mortality_range_birds:   [low, high] (based on flock size)
#   financial_loss_rm:       [low, high] (at ~RM7 per bird)
#   early_intervention_loss_rm: [low, high]
#   time_horizon_days:       int
#
# Note: These are scenario-based estimates, not clinical predictions.
