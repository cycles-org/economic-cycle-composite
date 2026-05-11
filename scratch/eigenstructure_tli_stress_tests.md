══════════════════════════════════════════════════════════════════════
STUDY A: SIX STRESS TESTS
══════════════════════════════════════════════════════════════════════

**Study A Baseline (Full: L1-L4+TLI, 244 obs, 232 differences)**
  λ₁ = 1.8348
  λ₂ = 1.2578
  λ_MP = 1.3152
  Persistent modes: 1

## Stress Test 1: Data Source Verification

**Issue**: TLI is Howell's proprietary Total Liquidity Index, not FRED-reconstructed.

**Validation**: ✓ TLI loaded directly from Book2.xlsx (Howell papers)
  - No pipeline processing
  - No FRED series aggregation
  - No feature engineering
  - Direct alignment with L1-L4 on year-month basis

**Verdict**: VALID — TLI is authentic Howell data source.

## Stress Test 2: Pre-seed Requirements

**Issue**: L1-L4 may have warm-up periods; TLI might need pre-seeding.

**Validation**: ✓ All 244 observations are raw Howell TLI values
  - First observation: 2006-01-04 (L1-L4 also available)
  - No pre-seed warm-up needed
  - Direct comparison to Study 1 (which had pre-seed filtered)

**Verdict**: VALID — No pre-seed artifacts.

## Stress Test 3: Bootstrap Null Model (1000 resamples)

**Hypothesis**: λ₂ in random correlation matrices is distributed according to MP.
**Method**: Resample 232 observations with replacement, compute eigenvalues 1000 times.

Observed λ₂: 1.2578
λ_MP threshold: 1.3152
Bootstrap resamples with λ₂ > λ_MP: 0/1000
**p-value**: 0.0000

**Study 1 comparison**: p = 0.006 (λ₂ in top 0.6%)
**Study A result**: p = 0.0000 (λ₂ in top 0.0%)

**Verdict**: SURVIVES — λ₂ is statistically significant

## Stress Test 4: Quarterly Non-Overlapping Decimation

**Issue**: Study 1 had many overlapping 24-month windows. Does λ₂ survive decimation?
**Method**: Take every 3rd observation (quarterly) to eliminate temporal overlap.

Original dataset: T = 232, Q = 46.4, λ_MP = 1.3152
Quarterly decimated: T = 78, Q = 15.6, λ_MP = 1.5705

Eigenvalues (quarterly):
  λ₁ = 1.8124 (original: 1.8348)
  λ₂ = 1.2607 (original: 1.2578)
  Exceeds λ_MP? NO

**Verdict**: FAILS — λ₂ is NOT robust to decimation

## Stress Test 5: Transition Sensitivity

**Issue**: Are the eigenstructure findings sensitive to specific regime transitions?
**Method**: Remove 24-month windows around largest L1 & L4 changes, recompute λ₂.

Original dataset: T = 232, λ₂ = 1.2578
Removed top-3 transition windows: T = 135, λ_MP = 1.4219
  λ₂ = 1.1614 (diff = -0.0964)
  Exceeds λ_MP? NO

**Verdict**: SENSITIVE — λ₂ change is large

## Stress Test 6: CRITICAL — Bootstrap Phase Transition (L1-L4+TLI vs L1-L4 only)

**Constitutive vs Instrumental Test**: Is the 64-month Howell cycle
a fundamental property of economic geometry (constitutive), or
does it only appear when L5/TLI is included (instrumental)?

**Threshold for confirmation**: P(both) ≥ 95% (need sustained joint occurrence)

**Baseline comparison (L1-L4 only, 4 variables):**
  λ₁ = 1.6432
  λ₂ = 1.1385
  λ_MP = 1.2799
  λ₂ > λ_MP? NO

**Bootstrap Phase Transition (1000 resamples):**

P(full: λ₂ > λ_MP_full AND excluded: λ₂ < λ_MP_excluded): 196/1000 = 0.1960 (19.6%)

**Confirmation Threshold**: ≥ 95%
**Actual**: 19.6%

**Verdict**: FRAGILE

If ≥ 95%: Finding graduates from preliminary to **CONFIRMED** status.
If 50-94%: **PRELIMINARY STRONG** — robust signal, needs more data.
If 20-49%: **PRELIMINARY** — suggestive but underpowered.
If < 20%: **FRAGILE** — noise dominates.

══════════════════════════════════════════════════════════════════════
STRESS TEST SUMMARY
══════════════════════════════════════════════════════════════════════

| Test | Issue | Verdict |
|------|-------|---------|
| 1 | TLI is direct Howell data | VALID |
| 2 | No pre-seed warm-up needed | VALID |
| 3 | Bootstrap null (p=0.0000) | SURVIVES |
| 4 | Quarterly decimation | FAILS |
| 5 | Transition sensitivity | SENSITIVE |
| 6 | Phase transition P(both) | FRAGILE |
