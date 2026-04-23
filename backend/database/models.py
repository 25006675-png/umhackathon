# SQLAlchemy ORM Models
#
# Tables:
# - Farm: farm_id, name, location
# - Flock: flock_id, farm_id, size, start_date, age_days
# - DailyReading: reading_id, flock_id, timestamp, temperature, feed_intake, mortality_count, farmer_notes
# - RiskSnapshot: snapshot_id, reading_id, risk_score, risk_level, trend, deviations (JSON), projections (JSON)
# - FeedbackLog: log_id, snapshot_id, action_taken, actual_outcome, timestamp
