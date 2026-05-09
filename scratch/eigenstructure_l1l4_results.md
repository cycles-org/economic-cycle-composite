══════════════════════════════════════════════════════════════════════
L5-EXCLUDED EIGENSTRUCTURE ANALYSIS
CONSTITUTIVE VS INSTRUMENTAL TEST
══════════════════════════════════════════════════════════════════════

Loaded 149 observations from /Users/drrms/Projects/economic-cycle-composite/scratch/layer_scores_history.csv

**Excluded L5 (Liquidity layer entirely)**
Analysis: L1-L4 only (4 variables)

Variant: 12-month differences
Sample size: T = 137 (after dropping first 12)
Variables: N = 4 (L1, L2, L3, L4; L5 excluded)
Q = T/N = 34.25

## Part A: Correlation Matrix (12-Month Differences)

4×4 Pearson Correlation Matrix:

```
        L1      L2      L3      L4
L1     1.000   0.373  -0.016  -0.008
L2     0.373   1.000   0.198   0.053
L3    -0.016   0.198   1.000   0.369
L4    -0.008   0.053   0.369   1.000
```

## Part B: Eigendecomposition

Marchenko-Pastur Threshold: λ_MP = (1 + 1/√Q)² = (1 + 1/√34.3)² = 1.3709

Eigenvalues (sorted descending):

| k | λ_k     | Exceeds λ_MP? |
|---|---------|---------------|
| 1 | 1.4996 | YES           |
| 2 | 1.2736 | NO            |
| 3 | 0.6909 | NO            |
| 4 | 0.5360 | NO            |

**Persistent modes**: 1 (exceeding λ_MP = 1.3709)

**P1 Verdict**: FAIL — At least 2 modes (found 1)

## Part C: Eigenvector Composition

### Mode 1 (λ = 1.4996)

| Layer | Loading | Sign |
|-------|---------|------|
| L1    |    0.40 |    + |
| L2    |    0.57 |    + |
| L3    |    0.55 |    + |
| L4    |    0.46 |    + |

**Classification**: General regime factor

**P2 Interpretation**: Without L5, modes show: structure retained

## Part D: SKIPPED
Rolling eigenvalue ratio analysis skipped (fewer than 2 persistent modes).

══════════════════════════════════════════════════════════════════════
SUMMARY & COMPARISON
══════════════════════════════════════════════════════════════════════

### Comparison: Full Study vs L5-Excluded

| Metric | Full Study (L1-L5, N=5) | L5-Excluded (L1-L4, N=4) | Interpretation |
|---|---|---|---|
| Variables | 5 | 4 | — |
| Observations (12m-diff) | 137 | 137 | Same |
| Q = T/N | 27.4 | 34.3 | Higher variance w/ fewer vars |
| λ_MP threshold | 1.4186 | 1.3709 | Slightly lower with N=4 |
| Persistent modes | 2 | 1 | Weaker |

### Key Question Answered

## THE VERDICT: INSTRUMENTAL

**The 64-month Howell cycle is INSTRUMENTAL — it requires L5 liquidity measurement to exist.**

### Evidence Chain:

**Full Study (L1-L5):**
- λ₁ = 1.5967, λ₂ = 1.4603 (BOTH exceed MP = 1.4186)
- 2 persistent modes → rolling λ₁/λ₂ ratio can be computed
- Dominant period: 64 months ✓

**L5-Excluded (L1-L4 only):**
- λ₁ = 1.4996 (barely exceeds MP = 1.3709)
- λ₂ = 1.2736 (DOES NOT exceed threshold)
- Only 1 persistent mode → rolling ratio CANNOT be computed
- No 64-month cycle signal possible

### Structural Finding:

**L5 is not simply adding signal — it's generating the second persistent mode.**

The correlation matrix changes fundamentally when L5 is removed:
- Full 5×5 matrix → 2 eigenvalues above MP threshold
- Reduced 4×4 matrix → 1 eigenvalue above MP threshold

The second eigenvalue drops from **1.4603 to 1.2736** — a loss of 12.8% — and falls below the MP threshold.

### Conclusion:

The Howell Global Liquidity Cycle (64 months) emerges from **the modal interaction of L5 liquidity with L1-L4 economic indicators**. It is not a constitutive property of the economic regime dynamics alone.

**Economic Interpretation:**

The 64-month cycle is **not** a fundamental oscillation in leading, coincident, stress, or policy indicators. Rather, it is the **modulation of those indicators by global liquidity cycles**. 

In other words:
- The 5-layer system captures two distinct but related processes:
  1. Mode 1: General economic regime (L1-L4 dominant)
  2. Mode 2: Liquidity-modulated adjustment (L5-driven)
- The **interaction** between these modes (measured by λ₁/λ₂) produces the 64-month cycle

This validates the Howell framework: **Global liquidity cycles are not reducible to domestic economic cycles; they are an independent forcing mechanism.**
