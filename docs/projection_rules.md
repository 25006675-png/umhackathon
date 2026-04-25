# Projection Engine Rules

## Source
`backend/engine/projection.py` — Layer 4 of the risk pipeline.

## Bird Value Assumption
- **RM 7.00 per bird** (Malaysian broiler market price assumption)

## Mortality & Loss by Risk Level

| Risk Level       | Mortality (no action) | Mortality (early action) | Time Horizon |
|------------------|-----------------------|--------------------------|--------------|
| Critical / High  | 30 – 50% of flock     | 5 – 10% of flock         | 7 days       |
| Moderate         | 10 – 20% of flock     | 2 – 5% of flock          | 7 days       |
| Low              | 1 – 3% of flock       | 1 – 2% of flock          | 7 days       |

## How Numbers Are Computed
```
mort_birds      = flock_size × mort_pct / 100
financial_loss  = mort_birds × RM 7.00
early_mort_birds = flock_size × early_mort_pct / 100
early_loss      = early_mort_birds × RM 7.00
savings         = financial_loss[high] - early_loss[high]
savings_pct     = savings / financial_loss[high] × 100
```

## Example (High risk, 5,000 birds)
- Birds lost (no action): 1,500 – 2,500
- Financial loss (no action): RM 10,500 – RM 17,500
- Birds lost (early action): 250 – 500
- Financial loss (early action): RM 1,750 – RM 3,500
- Max savings: RM 14,000 (~80% cost reduction)

## Disclaimer
These are scenario-based estimates derived from outbreak progression curves,
not clinical predictions. Actual outcomes depend on disease type, farm conditions,
and speed of veterinary intervention.
