# Eigenstructure Analysis: Critical Findings & Next Steps

**Analysis Date**: 2026-05-09  
**Data**: 149 monthly layer score snapshots (2014-01-01 to 2026-05-06)  
**Method**: Jacobi eigendecomposition + Marchenko-Pastur test

---

## Summary: Prediction 1 FAILS, But the Finding is Informative

**Result**: 0 persistent modes exceed Marchenko-Pastur threshold (λ_MP = 1.4014)

All 5 eigenvalues fall below threshold:
```
λ₁ = 1.1864,  λ₂ = 1.0836,  λ₃ = 1.0218,  λ₄ = 0.9078,  λ₅ = 0.8004
```

**Interpretation**: The correlation structure of first-difference layer scores is statistically consistent with pure random noise. This is NOT an error—it's a real finding about the data structure.

---

## Diagnostic Insight: Why Correlations Are Weak

### Observed Phenomenon
```
Layer score first differences (month-to-month changes):
  - L1 vs L2:  r = -0.031  (almost zero)
  - L1 vs L3:  r =  0.080  (near zero)
  - L3 vs L4:  r =  0.091  (near zero)
  - Max correlation in matrix: 0.115

BUT level correlations (the scores themselves, not changes):
  - L1 vs L2:  r =  0.427  (moderate!)
  - Rolling 12-month correlation: ranges -0.70 to +0.86
```

### Root Cause Analysis

The weak first-difference correlations suggest:

1. **Each layer is a quasi-independent regime indicator**: L1 (leading), L2 (coincident), L3 (stress), L4 (policy), L5 (liquidity) are intentionally designed to capture different signal sources.

2. **Phase coherence extraction at monthly frequency is noisy**: Each layer computes a phase score from multiple series' dominant cycle extraction. This aggregation may amplify month-to-month noise differently per layer.

3. **Slow-moving regime stickiness**: Layer levels are sticky (high autocorrelation, positive level correlation), but random perturbations drive uncorrelated monthly changes.

4. **Architecture prevents co-movement**: The 5-layer weighting (30%, 15%, 20%, 10%, 25%) distributes signal across independent pathways. This is likely intentional to create diversified signal.

---

## What This Means for the Research Hypothesis

**Prediction 1** (at least 2 persistent modes) was based on the assumption that layer scores co-evolve due to shared underlying economic drivers.

**Reality**: Layer scores **do share underlying drivers at slow timescales** (level correlation = 0.43), but **monthly changes are nearly independent** (first-diff correlation ≈ 0).

This suggests:

- **The 5-layer architecture is working as designed**: It creates independent signal streams (feature, not bug).
- **Persistent modes may exist at longer timescales**: Perhaps 6-month, 12-month, or longer horizons show stronger co-movement.
- **Alternative analysis needed**: Rather than first-difference eigenanalysis, we should examine:
  - Level-based correlation (no differencing)
  - Rolling correlation structure over time
  - Longer-horizon changes (3-month, 6-month, 12-month differences)

---

## Proposed Alternative Analyses

### Option A: Level-Based Eigenstructure (Recommended)
Compute eigenanalysis on the 149×5 level matrix directly (without differencing):

```
Hypothesis: Layer levels co-move due to shared economic regime,
even if month-to-month changes don't.
```

- **Expectation**: Stronger eigenvalues (higher correlation structure)
- **Interpretation**: Eigenvector 1 = "macro regime" (all positive)
- **Validity**: Slower-moving indicators (quarterly, semi-annual regimes)

### Option B: Longer-Horizon Differences
Compute first differences at 3-month, 6-month, or 12-month intervals:

```
Hypothesis: Economic cycles have periods ≥ 6 months.
Month-to-month noise dominates, but longer horizons may show signal.
```

- **Test**: Recompute eigenanalysis on ΔL(t, t-6 months)
- **Interpretation**: If eigenvalues increase, signal exists but is slower than monthly

### Option C: Rolling Eigenstructure Over Time
Compute 24-month rolling eigenvalue decomposition:

```
Hypothesis: Persistent modes wax and wane; they're stronger during
certain regimes (crises, expansions, policy shifts).
```

- **Method**: Sliding 24-month window, compute 5 eigenvalues each
- **Analysis**: Plot eigenvalue time series, identify periods of high co-movement
- **Interpretation**: Dominant mode strength as a regime indicator

### Option D: Check Layer Score Computation
Verify that layer aggregation is correctly implemented:

```
Verify:
1. Are phase scores from CycleScanner properly extracted?
2. Is per-series weighting correct (L1-L4 use specific weights)?
3. Is L5 component aggregation working as intended?
4. Are there any saturation effects or outliers distorting correlations?
```

---

## Recommendations

1. **Immediate**: Run **Option A** (level-based eigenanalysis) to test if slower-moving structure exists.

2. **If Option A succeeds**: Proceed with eigenvector composition (Part C) and rolling ratio analysis (Part D) on level data.

3. **If Option A also fails**: Run **Option C** (rolling eigenstructure) to identify periods where co-movement exists.

4. **If rolling analysis shows no patterns**: May need to revisit layer aggregation methodology (Option D).

---

## Technical Note: Marchenko-Pastur Interpretation

The Marchenko-Pastur test distinguishes signal from noise using:

$$\lambda_{MP} = \left(1 + \frac{1}{\sqrt{Q}}\right)^2$$

where Q = T/N = 148/5 ≈ 30 (time observations / variables).

- **If λ > λ_MP**: Eigenvalue is statistically significant (signal)
- **If λ < λ_MP**: Eigenvalue is noise (random walk eigenvalue distribution)

Our result (all λ < λ_MP for first differences) is clean: **no statistically significant co-movement in monthly changes**.

This is **not a borderline case**—it's a clear rejection with good separation between largest eigenvalue (1.1864) and threshold (1.4014).

---

## Next Steps

Approve one or more of the proposed alternatives. Level-based eigenanalysis (Option A) requires minimal new code and will clarify whether the 5-layer system has meaningful structure at slower timescales.
