# Layer 3 — Risk Scoring Engine (banded, transparent 100-point)
#
# Categories and max scores:
#   feed_intake       20   (drop % vs baseline)
#   water_intake      10   (drop % vs baseline; earlier signal than feed)
#   temperature       20   (absolute deviation from baseline)
#   mortality         20   (% of flock / day)
#   air_quality       15   (structured ventilation condition)
#   behaviour         10   (structured checklist)
#   combination bonus 10   (count of abnormal categories)
#   sustained bonus    5   (any category worsening 3+ consecutive days)
#
# Cap at 100.

FEED_MAX = 20
WATER_MAX = 10
TEMP_MAX = 20
MORT_MAX = 20
AIR_MAX = 15
BEHAV_MAX = 10
COMBO_MAX = 10
SUSTAINED_MAX = 5

BEHAVIOUR_WEIGHTS = {
    "water_change": 2,
    "abnormal_sounds": 3,      # sneezing / coughing
    "huddling_panting": 3,
    "reduced_movement": 2,
}

VENTILATION_SCORES = {
    "normal": 0,
    "mild": 7,         # mild ammonia smell / poor ventilation
    "strong": 12,      # strong ammonia / high humidity
    "sensor_high": 15, # sensor ammonia > 25 ppm
}


def _score_feed(drop_pct: float) -> int:
    if drop_pct < 5: return 0
    if drop_pct < 8: return 8
    if drop_pct < 12: return 14
    return FEED_MAX


def _score_water(drop_pct):
    if drop_pct is None or drop_pct < 5: return 0
    if drop_pct < 10: return 4
    if drop_pct < 15: return 7
    return WATER_MAX


def _score_temp(delta_c: float) -> int:
    mag = abs(delta_c)
    if mag < 1.0: return 0
    if mag < 1.5: return 8
    if mag < 2.0: return 15
    return TEMP_MAX


def _score_mortality(pct_flock_day: float) -> int:
    # Spec anchors: 0.2% and 0.5% per day; treat < ~0.05% as normal noise.
    if pct_flock_day <= 0.05: return 0
    if pct_flock_day < 0.2: return 8
    if pct_flock_day < 0.5: return 15
    return MORT_MAX


def _score_air(condition: str) -> int:
    return VENTILATION_SCORES.get((condition or "normal").lower(), 0)


def _score_behaviour(flags) -> int:
    if not flags: return 0
    total = sum(BEHAVIOUR_WEIGHTS.get(f, 0) for f in flags)
    return min(BEHAV_MAX, total)


def _combo_bonus(n_abnormal: int) -> int:
    if n_abnormal >= 4: return COMBO_MAX
    if n_abnormal == 3: return 7
    if n_abnormal == 2: return 4
    return 0


def _sustained_bonus(category_scores: dict, category_history: dict | None) -> int:
    """+5 if any category score has worsened for 3+ consecutive days."""
    if not category_history: return 0
    for cat, cur in category_scores.items():
        hist = category_history.get(cat, [])
        if len(hist) < 2: continue
        prev1, prev2 = hist[-1], hist[-2]
        if cur > prev1 > prev2 and cur > 0:
            return SUSTAINED_MAX
    return 0


def calculate_risk(
    signals: dict,
    baselines: dict,
    flock_size: int,
    previous_scores: list | None = None,
    category_history: dict | None = None,
):
    """Compute banded additive risk score.

    signals keys: temperature_celsius, feed_intake_kg, mortality_count,
                  water_intake_liters (opt), ventilation_condition (opt),
                  behaviour_flags (opt list)
    baselines keys: temperature_celsius, feed_intake_kg, water_intake_liters (opt)
    """
    baseline_feed = max(0.1, baselines.get("feed_intake_kg", 0) or 0.1)
    feed_intake = signals.get("feed_intake_kg")
    feed_drop_pct = (
        max(0.0, (baseline_feed - feed_intake) / baseline_feed * 100)
        if feed_intake is not None else 0.0
    )

    baseline_water = baselines.get("water_intake_liters")
    water_intake = signals.get("water_intake_liters")
    water_drop_pct = None
    if baseline_water and water_intake is not None:
        water_drop_pct = max(0.0, (baseline_water - water_intake) / baseline_water * 100)

    temperature = signals.get("temperature_celsius")
    temp_delta = (
        temperature - baselines["temperature_celsius"]
        if temperature is not None else 0.0
    )

    mortality_count = signals.get("mortality_count")
    mort_pct_flock = (
        (mortality_count / max(1, flock_size)) * 100
        if mortality_count is not None else 0.0
    )

    category_scores = {
        "feed": _score_feed(feed_drop_pct),
        "water": _score_water(water_drop_pct),
        "temperature": _score_temp(temp_delta),
        "mortality": _score_mortality(mort_pct_flock),
        "air_quality": _score_air(signals.get("ventilation_condition") or "normal"),
        "behaviour": _score_behaviour(signals.get("behaviour_flags") or []),
    }

    n_abnormal = sum(1 for v in category_scores.values() if v > 0)
    combo = _combo_bonus(n_abnormal)
    sustained = _sustained_bonus(category_scores, category_history)

    base = sum(category_scores.values())
    final_score = int(min(100, base + combo + sustained))

    if final_score <= 30: level = "Low"
    elif final_score <= 60: level = "Moderate"
    elif final_score <= 80: level = "High"
    else: level = "Critical"

    prev = previous_scores or []
    last = prev[-1] if prev else 0
    trend = "rising" if final_score > last else "falling" if final_score < last else "stable"
    updated_scores = (prev + [final_score])[-4:]

    return {
        "score": final_score,
        "level": level,
        "trend": trend,
        "previous_scores": updated_scores,
        "category_scores": category_scores,
        "breakdown": {
            "feed": {"score": category_scores["feed"], "max": FEED_MAX, "drop_pct": round(feed_drop_pct, 1)},
            "water": {"score": category_scores["water"], "max": WATER_MAX, "drop_pct": round(water_drop_pct, 1) if water_drop_pct is not None else None},
            "temperature": {"score": category_scores["temperature"], "max": TEMP_MAX, "delta_c": round(temp_delta, 2)},
            "mortality": {"score": category_scores["mortality"], "max": MORT_MAX, "pct_flock_day": round(mort_pct_flock, 3)},
            "air_quality": {"score": category_scores["air_quality"], "max": AIR_MAX, "condition": signals.get("ventilation_condition") or "normal"},
            "behaviour": {"score": category_scores["behaviour"], "max": BEHAV_MAX, "flags": signals.get("behaviour_flags") or []},
            "combination_bonus": combo,
            "sustained_bonus": sustained,
            "abnormal_categories": n_abnormal,
        },
    }
