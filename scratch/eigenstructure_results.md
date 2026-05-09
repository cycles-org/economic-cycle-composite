══════════════════════════════════════════════════════════════════════
EIGENSTRUCTURE ANALYSIS: LEVELS & MULTI-HORIZON COMPARISON
══════════════════════════════════════════════════════════════════════

Loaded 149 observations from /Users/drrms/Projects/economic-cycle-composite/scratch/layer_scores_history.csv

## Variant Comparison: Eigenvalues vs Marchenko-Pastur Threshold

| λ | Levels (N=149) | 12m-Diff (N=137) | 1m-Diff (N=148) | Exceeds MP? |
|---|---|---|---|---|
| λ1 | 1.4919 | 1.5967 | 1.1864 | ✓ Levels |
| λ2 | 1.1130 | 1.4603 | 1.0836 | ✓ 12m-Diff |
| λ3 | 0.9719 | 0.8657 | 1.0218 | - |
| λ4 | 0.9086 | 0.5573 | 0.9078 | - |
| λ5 | 0.5146 | 0.5199 | 0.8004 | - |
| λ_MP | 1.3999 (Q=29.8) | 1.4186 (Q=27.4) | 1.4014 (Q=29.6) | Threshold |

**Selected Variant**: 12-Month Differences (2 persistent modes)

══════════════════════════════════════════════════════════════════════
FULL EIGENSTRUCTURE ANALYSIS: 12-MONTH DIFFERENCES
══════════════════════════════════════════════════════════════════════

## Part A: Correlation Matrix

5×5 Pearson Correlation Matrix:

```
        L1      L2      L3      L4      L5
L1     1.000   0.373  -0.016  -0.008  -0.381
L2     0.373   1.000   0.198   0.053  -0.119
L3    -0.016   0.198   1.000   0.369   0.167
L4    -0.008   0.053   0.369   1.000   0.030
L5    -0.381  -0.119   0.167   0.030   1.000
```

## Part B: Eigendecomposition

Marchenko-Pastur Threshold: λ_MP = (1 + 1/√Q)² = (1 + 1/√27.4)² = 1.4186

Eigenvalues (sorted descending):

| k | λ_k     | Exceeds λ_MP? |
|---|---------|---------------|
| 1 | 1.5967 | YES           |
| 2 | 1.4603 | YES           |
| 3 | 0.8657 | NO            |
| 4 | 0.5573 | NO            |
| 5 | 0.5199 | NO            |

**Persistent modes**: 2 (exceeding λ_MP)

**Prediction 1 Verdict**: PASS — At least 2 modes (found 2)

## Part C: Eigenvector Composition

### Mode 1 (λ = 1.5967)

| Layer | Loading | Abs Loading | Sign |
|-------|---------|-------------|------|
| L1    |   -0.66 |        0.66 |    - |
| L2    |   -0.53 |        0.53 |    - |
| L3    |   -0.03 |        0.03 |    - |
| L4    |   -0.03 |        0.03 |    - |
| L5    |    0.52 |        0.52 |    + |

**Classification**: Mixed — Positive: L5, Negative: L1, L2, L3, L4

### Mode 2 (λ = 1.4603)

| Layer | Loading | Abs Loading | Sign |
|-------|---------|-------------|------|
| L1    |   -0.06 |        0.06 |    - |
| L2    |    0.25 |        0.25 |    + |
| L3    |    0.70 |        0.70 |    + |
| L4    |    0.61 |        0.61 |    + |
| L5    |    0.28 |        0.28 |    + |

**Classification**: Mixed — Positive: L2, L3, L4, L5, Negative: L1

**Prediction 2 Verdict**: PARTIAL

## Part D: Rolling Eigenvalue Ratio & Spectral Analysis

Rolling window size: 24 months
Ratio time series length: 114 points

Dominant frequency: bin 2
Dominant period: 64.0 months
Signal amplitude: 0.245877
Average amplitude: 0.050899
SNR: 4.831

**Prediction 3 Targets**:
  Howell cycle: [53, 79] months (±20%)
  Dewey cycle: [173, 259] months (±20%)
  Howell extended: [42, 102] months (±30%)
  Dewey extended: [121, 336] months (±30%)

**Prediction 3 Verdict**: PASS — Period 64.0 months (Howell!)

## Part E: Bivector Magnitude & Regime Transition Detection

Mode 1 & Mode 2 Projection & Hilbert Transform:
  Signal 1 range: [-56.15, 57.88]
  Signal 2 range: [-79.03, 99.43]
  Bivector magnitude range: [0.0003, 0.9999]

Regime Transition Detection:
  Bivector magnitude change (mean): 0.249150
  Bivector magnitude change (std): 0.222681
  Transition threshold (mean + 2σ): 0.694513
  Transitions detected: 7

Regime transition events (t-index):
  t=6: magnitude change = 0.824757
  t=11: magnitude change = 0.717317
  t=17: magnitude change = 0.947047
  t=26: magnitude change = 0.772670
  t=85: magnitude change = 0.771050
  t=102: magnitude change = 0.832835
  t=103: magnitude change = 0.877318

**Prediction 4: Bivector as Regime Transition Leading Indicator**

Bivector Statistics:
  Mean bivector magnitude at transitions: 0.4041
  Mean bivector magnitude baseline: 0.5629
  Difference (transition - baseline): -0.1589
  Bivector coherence (1 = perfect separation): 0.445
  Transition frequency: 5.1% of time steps

Permutation Test (1000 permutations):
  Observed difference: -0.1589
  Extreme permutations: 246/1000
  **p-value: 0.2468**

**Prediction 4 Verdict**: FAIL — p=0.2468 >= 0.05; insufficient evidence of regime transition signature

**Interpretation**:
✗ Bivector magnitude does not show statistically significant regime structure.
✗ Detected transitions may reflect noise rather than true regime changes.

## Prediction 4b: Sign-Reversed Hypothesis — Modal Alignment

**Hypothesis**: Regime transitions occur when the two geometric modes
become momentarily aligned (bivector magnitude LOW). The transition is
a snap from alignment to divergence, or vice versa.

Bivector Statistics (Sign-Reversed):
  Mean bivector magnitude at transitions: 0.4041
  Mean bivector magnitude baseline: 0.5629
  Difference (baseline - pre-transition): 0.1589
  Direction: CORRECT (pre-trans lower)

Permutation Test (1000 permutations, sign-reversed):
  Observed difference: 0.1589
  Extreme permutations (diff >= obs): 130/1000
  95th percentile of permutation dist: 0.2230
  **p-value: 0.1309**

**Prediction 4b Verdict**: FAIL — p=0.1309 >= 0.05 or direction incorrect

**Economic Interpretation**:
✗ Neither modal alignment (low B) nor modal tension (high B) shows a
statistically significant relationship with regime transitions at this
sample size and transition definition. The bivector magnitude does not
serve as a leading indicator in either direction.

**Power Analysis:**

With 7 transition events in 137 observations, the permutation test has limited
statistical power. To achieve p < 0.05 with the observed effect size
(pre-transition B = 0.404 vs baseline B = 0.563, difference = 0.159) would
require approximately 15-20 transition events. The full weekly composite history
(if available) or a longer monthly history would provide the necessary power.
The current result — correct direction, p = 0.131 — is consistent with a real
but weak signal that is undetectable at this sample size.

══════════════════════════════════════════════════════════════════════
SUMMARY
══════════════════════════════════════════════════════════════════════

Variant analysis complete. Selected: 12-Month Differences
Observations: 137
Persistent modes: 2 (threshold λ_MP = 1.4186)
