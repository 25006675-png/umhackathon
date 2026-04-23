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

BIRD_VALUE_RM = 7.0

def calculate_projections(risk_level: str, flock_size: int):
    """Layer 4 — Projection Engine"""
    if risk_level in ["Critical", "High"]:
        mort_pct, early_mort_pct = [30, 50], [5, 10]
    elif risk_level == "Moderate":
        mort_pct, early_mort_pct = [10, 20], [2, 5]
    else:
        mort_pct, early_mort_pct = [1, 3], [1, 2]

    mort_birds = [int(flock_size * (p / 100)) for p in mort_pct]
    loss_rm = [int(birds * BIRD_VALUE_RM) for birds in mort_birds]
    early_mort_birds = [int(flock_size * (p / 100)) for p in early_mort_pct]
    early_loss_rm = [int(birds * BIRD_VALUE_RM) for birds in early_mort_birds]

    return {
        "mortality_range_percent": mort_pct,
        "mortality_range_birds": mort_birds,
        "financial_loss_rm": loss_rm,
        "early_intervention_loss_rm": early_loss_rm,
        "time_horizon_days": 5
    }