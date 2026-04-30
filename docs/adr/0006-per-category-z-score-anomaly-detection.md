# ADR 0006 — Per-category z-score for anomaly detection

**Status:** Accepted
**Date:** 2026-04 (Phase 3.3.2)

## Context

Phase 3.3 surfaces "unusual spending" on the dashboard — a transaction that's
out of character for the user. Two natural framings:

1. **Global** — one mean and stddev across *all* the user's expenses.
   ₹15000 dinner is unusual relative to the typical ₹500 expense
2. **Per-category** — separate baseline for each spending category. ₹15000
   dinner is unusual relative to the user's typical Food spend, even if
   their global mean is dragged up by rent/groceries/etc.

Global framing produces noisy alerts. A user whose median expense is ₹250
and who has a single rent payment of ₹7000 will see the rent flagged forever
because it's permanently >2σ above the global mean. Categories solve this:
within Food, ₹15000 dinner stands out; within Rent, ₹7000 is normal.

## Decision

Compute z-scores **per category**, over a rolling 90-day window, with sample
stddev (`n-1`):

```
z = (amount - mean(category)) / stddev(category)

z >= 2  → MODERATE
z >= 3  → SEVERE
```

Constraints:

- A category needs **at least 4 transactions** in the window to compute a
  meaningful σ — fewer samples and we skip the whole bucket
- We only flag **positive** deviations. A smaller-than-usual expense isn't
  an anomaly worth surfacing in this UX
- Categories where σ = 0 (all amounts identical, e.g. a fixed rent) are
  skipped — z is undefined and any tiny variation would flag

The result is sorted SEVERE-first, then by recency, then by z-score. The
loudest, freshest signals surface at the top.

## Consequences

**Good**
- Signal stays honest: a ₹5000 grocery run is unremarkable, a ₹5000 coffee
  is not — and the algorithm correctly tells them apart
- Per-category framing is the way users *think* about their own spending
  ("this Uber was way more than usual"), so the alerts feel intuitive
- The 4-sample minimum prevents false alarms during the first month of use
  when categories are still sparse
- 90-day window adapts to seasonal changes (vacation spending becomes the
  new normal after a month, then surfaces again as anomalous when it returns
  next year)

**Less good**
- Categories with seasonal patterns (December gift spend) get flagged every
  December until the previous year ages out of the window. Real-world
  anomaly detection systems handle this with seasonal decomposition; we
  intentionally chose simplicity over accuracy
- `MIN_SAMPLES = 4` is a magic number. Sound for a personal-finance app on
  free-tier scale; larger datasets would tune empirically
- z = (mean + 3σ) is a Gaussian-tail assumption; expense distributions are
  long-tailed, so we get more "moderate" flags than a naive read of the
  thresholds suggests. Users seem fine with this; we'd revisit if we
  start getting alert-fatigue feedback

## Alternatives considered

- **Median + MAD** (median absolute deviation) — robust to outliers in the
  baseline. Rejected because z-score is more recognizable to users when we
  surface the score in tooltips ("3.2σ above your normal")
- **Isolation Forest / DBSCAN** — proper ML. Rejected as over-engineering
  for a portfolio-grade dashboard; would also need a separate model
  lifecycle (train, persist, retrain) without commensurate UX gain

## Related

- [`backend/src/main/java/com/project/financeDashboard/service/AnomalyDetectorService.java`](../../backend/src/main/java/com/project/financeDashboard/service/AnomalyDetectorService.java)
- [`backend/src/main/java/com/project/financeDashboard/dto/DetectedAnomaly.java`](../../backend/src/main/java/com/project/financeDashboard/dto/DetectedAnomaly.java)
