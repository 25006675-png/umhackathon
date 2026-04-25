# Current Risk Score Rules

This document describes the current deterministic risk scoring logic implemented in [backend/engine/risk_scoring.py](/C:/Documents/umhack_ternakAI/backend/engine/risk_scoring.py:1).

## Overview

The engine uses a transparent additive 100-point model with:

- 6 category scores
- 1 combination bonus
- 1 sustained-worsening bonus
- a final cap at `100`

The final score is mapped to a risk level and compared with the previous score to derive a trend.

## Score Structure

Maximum score by category:

- Feed intake: `20`
- Water intake: `10`
- Temperature: `20`
- Mortality: `20`
- Air quality / ventilation: `15`
- Behaviour checklist: `10`
- Combination bonus: `10`
- Sustained trend bonus: `5`

## Summary Table

| Component | Max Score | Rule Basis | Current Rule |
|---|---:|---|---|
| Feed intake | 20 | % drop vs feed baseline | `<5%=0`, `5-<8=8`, `8-<12=14`, `>=12=20` |
| Water intake | 10 | % drop vs water baseline | `missing/<5=0`, `5-<10=4`, `10-<15=7`, `>=15=10` |
| Temperature | 20 | Absolute deviation from temperature baseline | `<1.0C=0`, `1.0-<1.5=8`, `1.5-<2.0=15`, `>=2.0=20` |
| Mortality | 20 | % of flock lost that day | `<=0.05%=0`, `>0.05-<0.2=8`, `0.2-<0.5=15`, `>=0.5=20` |
| Air quality / ventilation | 15 | Structured ventilation status | `normal=0`, `mild=7`, `strong=12`, `sensor_high=15` |
| Behaviour checklist | 10 | Sum of flag weights, capped | `water_change=2`, `abnormal_sounds=3`, `huddling_panting=3`, `reduced_movement=2` |
| Combination bonus | 10 | Number of abnormal categories | `0-1=0`, `2=4`, `3=7`, `>=4=10` |
| Sustained trend bonus | 5 | 3 consecutive daily worsenings in any category | `+5` if `current > prev1 > prev2` and current > 0 |
| Final score | 100 | Sum of all categories + bonuses | capped at `100` |

Formula:

```text
final_score = min(
  100,
  feed + water + temperature + mortality + air_quality + behaviour
  + combination_bonus
  + sustained_bonus
)
```

## Inputs Used

Signals:

- `temperature_celsius`
- `feed_intake_kg`
- `mortality_count`
- `water_intake_liters` (optional)
- `ventilation_condition` (optional)
- `behaviour_flags` (optional)

Baselines:

- `temperature_celsius`
- `feed_intake_kg`
- `water_intake_liters` (optional)

Other:

- `flock_size`
- `previous_scores`
- `category_history`

## Category Rules

### 1. Feed Intake

Feed uses percentage drop versus baseline:

```text
feed_drop_pct = max(0, (baseline_feed - feed_intake) / baseline_feed * 100)
```

Scoring:

- `< 5%`: `0`
- `5% to < 8%`: `8`
- `8% to < 12%`: `14`
- `>= 12%`: `20`

### 2. Water Intake

Water uses percentage drop versus baseline when both current water and baseline water exist:

```text
water_drop_pct = max(0, (baseline_water - water_intake) / baseline_water * 100)
```

If baseline water is missing, or current water is missing, water contributes `0`.

Scoring:

- missing or `< 5%`: `0`
- `5% to < 10%`: `4`
- `10% to < 15%`: `7`
- `>= 15%`: `10`

### 3. Temperature

Temperature uses absolute deviation from baseline:

```text
temp_delta = temperature_celsius - baseline_temperature_celsius
mag = abs(temp_delta)
```

Scoring:

- `< 1.0 C`: `0`
- `1.0 C to < 1.5 C`: `8`
- `1.5 C to < 2.0 C`: `15`
- `>= 2.0 C`: `20`

Note: the rule is symmetric. Both above-baseline and below-baseline deviations are scored by magnitude.

### 4. Mortality

Mortality uses percent of flock lost that day:

```text
mort_pct_flock_day = mortality_count / flock_size * 100
```

Scoring:

- `<= 0.05%`: `0`
- `> 0.05% to < 0.2%`: `8`
- `0.2% to < 0.5%`: `15`
- `>= 0.5%`: `20`

### 5. Air Quality / Ventilation

Ventilation is scored from a fixed lookup:

- `normal`: `0`
- `mild`: `7`
- `strong`: `12`
- `sensor_high`: `15`

Unknown values default to `0`.

### 6. Behaviour Checklist

Behaviour flags use additive weights, capped at `10`.

Weights:

- `water_change`: `2`
- `abnormal_sounds`: `3`
- `huddling_panting`: `3`
- `reduced_movement`: `2`

Formula:

```text
behaviour_score = min(10, sum(weights for all flags))
```

## Combination Bonus

The engine counts how many category scores are abnormal, meaning `> 0`.

```text
abnormal_categories = number of categories with score > 0
```

Bonus:

- `0 or 1 abnormal categories`: `0`
- `2 abnormal categories`: `4`
- `3 abnormal categories`: `7`
- `4 or more abnormal categories`: `10`

## Sustained-Worsening Bonus

The engine gives `+5` if any category has worsened for 3 consecutive days.

Rule:

- look at current category score
- compare with the last 2 historical values for that same category
- if `current > prev1 > prev2` and current score is positive, add `5`

Only one sustained bonus is applied even if multiple categories qualify.

## Risk Level Mapping

After all category scores and bonuses are summed and capped:

- `<= 30`: `Low`
- `31 to 60`: `Moderate`
- `61 to 80`: `High`
- `81 to 100`: `Critical`

## Trend Rule

Trend is based on the latest previous total score:

- current score `>` last score: `rising`
- current score `<` last score: `falling`
- current score `==` last score: `stable`

The stored score history is limited to the latest 4 total scores.

## Important Current Limitation

`farmer_notes` do not directly affect the deterministic risk score.

They are available to the AI reasoning layer, but they are not currently translated into deterministic risk points in `risk_scoring.py`.
