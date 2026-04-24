# Layer 2 — Baseline & Deviation Engine
#
# Computes baselines and deviations from daily readings.
#
# Logic:
#   baseline = 3-day rolling average per signal
#   deviation = (current - baseline) / baseline
#   Adjusted for flock age using simple normalization
#
# Input:  list of recent DailyReading records
# Output: dict of deviations per signal + trend direction

def calculate_baselines(readings: list):
    """Calculates the 3-day rolling average."""
    if not readings:
        return {"temperature_celsius": 30.0, "feed_intake_kg": 50.0, "mortality_count": 1.0}
    
    # Get up to last 3 readings
    recent = readings[-3:]
    return {
        "temperature_celsius": sum(r["temperature_celsius"] for r in recent) / len(recent),
        "feed_intake_kg": sum(r["feed_intake_kg"] for r in recent) / len(recent),
        "mortality_count": sum(r["mortality_count"] for r in recent) / len(recent)
    }

def calculate_deviations(current: dict, baseline: dict):
    """Formula: (current - baseline) / baseline"""
    return {
        "temperature": (current["temperature_celsius"] - baseline["temperature_celsius"]) / baseline["temperature_celsius"],
        "feed_intake": (current["feed_intake_kg"] - baseline["feed_intake_kg"]) / baseline["feed_intake_kg"],
        "mortality": (current["mortality_count"] - baseline["mortality_count"]) / max(1, baseline["mortality_count"])
    }