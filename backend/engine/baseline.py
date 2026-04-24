from datetime import datetime


DEFAULT_BASELINES = {
    "temperature_celsius": 30.0,
    "feed_intake_kg": 50.0,
    "mortality_count": 1.0,
}

# Simple age-normalization factors for a short broiler demo horizon.
FEED_GROWTH_PER_DAY = 0.012
TEMPERATURE_DROP_PER_DAY = 0.03


def _parse_timestamp(timestamp: str | None):
    if not timestamp:
        return None
    return datetime.fromisoformat(timestamp)


def _normalize_reading_for_age(reading: dict, target_timestamp: str | None):
    normalized = {
        "temperature_celsius": reading["temperature_celsius"],
        "feed_intake_kg": reading["feed_intake_kg"],
        "mortality_count": reading["mortality_count"],
    }

    reading_ts = _parse_timestamp(reading.get("timestamp"))
    target_ts = _parse_timestamp(target_timestamp)
    if not reading_ts or not target_ts:
        return normalized

    days_apart = max(0.0, (target_ts - reading_ts).total_seconds() / 86400)
    normalized["feed_intake_kg"] *= 1 + (FEED_GROWTH_PER_DAY * days_apart)
    normalized["temperature_celsius"] -= TEMPERATURE_DROP_PER_DAY * days_apart
    return normalized


def _get_reading_age_days(reading: dict, current_age_days: int | None, target_timestamp: str | None):
    reading_age_days = reading.get("flock_age_days")
    if reading_age_days is not None:
        return float(reading_age_days)

    if current_age_days is None:
        return None

    reading_ts = _parse_timestamp(reading.get("timestamp"))
    target_ts = _parse_timestamp(target_timestamp)
    if not reading_ts or not target_ts:
        return float(current_age_days)

    days_apart = max(0.0, (target_ts - reading_ts).total_seconds() / 86400)
    return max(0.0, float(current_age_days) - days_apart)


def _normalize_reading_to_target_age(
    reading: dict,
    current_age_days: int | None,
    target_timestamp: str | None,
):
    normalized = _normalize_reading_for_age(reading, target_timestamp)
    if current_age_days is None:
        return normalized

    reading_age_days = _get_reading_age_days(reading, current_age_days, target_timestamp)
    if reading_age_days is None:
        return normalized

    age_delta = max(0.0, float(current_age_days) - reading_age_days)
    normalized["feed_intake_kg"] = reading["feed_intake_kg"] * (1 + (FEED_GROWTH_PER_DAY * age_delta))
    normalized["temperature_celsius"] = reading["temperature_celsius"] - (TEMPERATURE_DROP_PER_DAY * age_delta)
    return normalized


def calculate_baselines(
    readings: list,
    current_age_days: int | None = None,
    target_timestamp: str | None = None,
):
    """Calculate a 3-day rolling average normalized to the current flock age."""
    if not readings:
        return DEFAULT_BASELINES.copy()

    recent = readings[-3:]
    normalized = [
        _normalize_reading_to_target_age(reading, current_age_days, target_timestamp)
        for reading in recent
    ]
    return {
        "temperature_celsius": sum(r["temperature_celsius"] for r in normalized) / len(normalized),
        "feed_intake_kg": sum(r["feed_intake_kg"] for r in normalized) / len(normalized),
        "mortality_count": sum(r["mortality_count"] for r in normalized) / len(normalized),
    }


def calculate_deviations(current: dict, baseline: dict):
    """Formula: (current - baseline) / baseline."""
    return {
        "temperature": (current["temperature_celsius"] - baseline["temperature_celsius"]) / max(0.1, baseline["temperature_celsius"]),
        "feed_intake": (current["feed_intake_kg"] - baseline["feed_intake_kg"]) / max(0.1, baseline["feed_intake_kg"]),
        "mortality": (current["mortality_count"] - baseline["mortality_count"]) / max(1, baseline["mortality_count"]),
    }
