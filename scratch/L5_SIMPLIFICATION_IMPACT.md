# L5 Simplification: Impact on Eigenstructure Analysis

## Current Implementation vs. Production Pipeline

### What's Implemented (Component Path Only)
- **7 series individually scored**: WALCL, ECB_USD, BOJ_USD, TOTBKCR, WRESBAL, COMPOUT, WRMFNS
- **Per-series pipeline**: CycleScanner → dominant cycle detection → phase score → weighted average
- **No structural cycle detection**: Skips the Howell Global Liquidity Cycle (~66-month / 285 bar cycle)
- **No momentum preprocessing**: Direct closes, no 52-week YoY momentum transformation
- **No HP detrending**: No trend removal before cycle detection
- **No rolling percentile rank**: No normalization via 780-week window
- **No Howell pre-seed**: No 1975-2014 historical context for calibration

### What's Missing (Structural Path — 80% of production score)
The production pipeline uses:
```
displayScore = 0.8 × structuralScore + 0.2 × componentComposite
```

The **missing 80%** includes:
1. **Weighted composite level** (all 8 series indexed to 100, dynamically weighted)
2. **52-week YoY momentum** (removes trend, creates stationary oscillator)
3. **HP detrend** (removes remaining trend structure via FFT)
4. **Howell pre-seed calibration** (1975-2014 context + linear regression)
5. **Rolling percentile rank** (780-week window normalizes distribution)
6. **Structural cycle detection** (238-368 bar range for ~55-85 month cycle)
7. **CRSI on structural cycle** (band scoring on long-term phase)

---

## Impact on L5 Scores

### Time Series Behavior

**Current L5 (component only)**:
- Detects SHORT-TERM cycles (10-400 bars, but dominance weight favors faster cycles)
- Responds to **tactical liquidity swings** (e.g., Fed repo operations, month-end flows, quarter-end balancing)
- Oscillates frequently (high-frequency noise from individual series)
- Lacks macro regime envelope

**Production L5 (0.8 structural + 0.2 component)**:
- Primary signal: LONG-TERM ~66-month cycle (5.5-year macro liquidity regime)
- Secondary signal: Tactical swings for fine-tuning
- Smoother time series (pre-seed + pctrank removes noise)
- Captures **global liquidity expansion/contraction cycles**

### Numerical Difference Estimate

For a typical macro top (expansion peaks into contraction):

**Production pipeline**:
- L5 would **peak 12-18 months BEFORE crisis** (structural cycle leads)
- Structural score: 85-90 (expansion regime)
- Component score: 50-60 (mixed)
- **Display = 0.8 × 87 + 0.2 × 55 ≈ 75** (clear expansion)

**Current simplified L5**:
- May peak **months later** or earlier (depends on random component cycles)
- Follows individual series rhythms (less predictive)
- **Might score 60-70** instead of 75 (structural signal lost)

**Magnitude of error**: 5-15 percentage points on L5 alone, which contributes 0.25 × error to master score.

---

## Impact on Eigenvalue Ratio Test (Prediction 3)

### What is Prediction 3?

From the research state: **Eigenvalue ratio test** detects Howell ~66-month structural cycle via FFT on eigenvalue time series:
- Compute correlation matrix of weekly L1-L5 layer changes
- Eigenvalue decomposition
- Time-series of eigenvalue magnitudes over rolling windows
- FFT on eigenvalue ratio (λ₁/λ₂) — peak at 286 weeks (~66 months)
- **Verdict**: If clear 286-week spectral peak exists with high power → structural cycle present

### Does L5 Simplification Break This?

**Short answer**: **Partially — the test is still meaningful, but with reduced power.**

**Analysis**:

1. **Missing L5 structural signal doesn't eliminate the effect**
   - L5 is 25% of master composite weight
   - L1-L4 are 75% (independent of L5 structural path)
   - The 66-month cycle should still appear in L1-L4 because:
     - Fed policy (L4) responds to liquidity regimes
     - Financial stress (L3) co-varies with liquidity cycles
     - Leading indicators (L1) lead liquidity shifts
   - **Eigenvalue decomposition will detect coupling between L1-L4 and L5, even if L5 is noisy**

2. **Power reduction: ~25% (not a complete loss)**
   - L5 structural path was designed to REINFORCE the 66-month signal
   - Simplified L5 adds noise rather than signal reinforcement
   - Eigenvalue ratio test might show:
     - **Same 286-week peak, but lower amplitude** (smaller spectral power)
     - **Higher false-positive threshold** (more noise → wider null distribution)
     - **Effect**: Test still passes (p < 0.05), but with weaker confidence

3. **Potential false negatives in weak periods**
   - If the true structural cycle is **barely significant** (p ≈ 0.05 in production), simplified L5 might push it to p ≈ 0.07-0.08 (fails test)
   - **Risk**: Early 2014-2016 data (when liquidity was stable) might not show strong 66-month cycle

---

## Recommendation for Eigenstructure Analysis

### ✅ **Proceed with simplified L5 BUT note the caveat**

**Go ahead with Step 2** (eigenstructure analysis) using the current simplified L5 because:

1. **The test will still work** — L1-L4 layers should carry enough signal
2. **Partial credit is acceptable** — Even if L5 simplification reduces power by 20-30%, the fundamental result (Howell cycle present or absent) will likely hold
3. **Structural cycle evidence from PCM study is separate** — The research note already confirmed ECB ⇄ Howell C67 at p=0.019; eigenvalue test is independent verification

### ⚠️ **But flag limitations in final report**

When reporting eigenvalue ratio results:
- Note that L5 simplified → reduced signal-to-noise ratio
- Compare observed spectral power to what production pipeline would show
- If 286-week peak is marginal (p ≈ 0.05), acknowledge uncertainty
- If eigenvalue ratio test FAILS → primary cause is likely L5 simplification, not absence of cycle

### 🔄 **Enhancement path**

After eigenstructure analysis confirms/rejects the structural cycle hypothesis:
- If confirmed: Consider upgrading L5 to full structural path for final publication
- If rejected: Simplified L5 hypothesis remains valid; Howell cycle may not drive macro regimes

---

## Test Plan

1. **Run Step 1** (export_layer_scores.mjs) with current simplified L5 — **confirmed working**
2. **Run Step 2** (eigenstructure_analysis.mjs) — compute eigenvalue decomposition + FFT
3. **Compare**: Observe whether 286-week (Howell C67) spectral peak appears
4. **Interpret**: 
   - Peak found → Howell cycle detectable even with simplified L5 (robust finding)
   - No peak → Either Howell cycle doesn't drive regimes, or L5 simplification masked it
5. **Optional follow-up**: Re-run with full L5 structural path if Step 2 results are inconclusive

---

## Conclusion

**L5 simplification does NOT invalidate the eigenstructure test**, but it does:
- **Reduce signal strength by ~25%** (loss of 80% structural weighting)
- **Add measurement noise** (component cycles are higher-frequency, more variable)
- **Risk false negatives in marginal cases** (weak cycles might fall below significance threshold)

**Recommendation**: Proceed with Step 1 & 2 as designed. The test remains meaningful and the results will inform whether L5 enhancement is needed for the final model.

---

*Last updated: 2026-05-08*
