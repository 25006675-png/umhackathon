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

def calculate_risk(deviations: dict, previous_scores: list):
    """Layer 3 — Risk Scoring Engine"""
    feed_score = min(100, max(0, (-deviations["feed_intake"] / 0.20) * 100))
    temp_score = min(100, (abs(deviations["temperature"]) / 0.10) * 100)
    mort_score = min(100, max(0, (deviations["mortality"] / 2.0) * 100))

    base_score = (feed_score * 0.35) + (temp_score * 0.25) + (mort_score * 0.25)
    interaction = 100 if (feed_score > 20 and temp_score > 20 and mort_score > 20) else 0
    final_score = int(min(100, base_score + (interaction * 0.15)))

    if final_score <= 30: level = "Low"
    elif final_score <= 60: level = "Moderate"
    elif final_score <= 80: level = "High"
    else: level = "Critical"

    last_score = previous_scores[-1] if previous_scores else 0
    trend = "rising" if final_score > last_score else "falling" if final_score < last_score else "stable"

    updated_scores = previous_scores + [final_score]

    return {
        "score": final_score,
        "level": level,
        "trend": trend,
        "previous_scores": updated_scores[-4:]
    }