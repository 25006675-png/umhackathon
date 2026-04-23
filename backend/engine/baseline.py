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
