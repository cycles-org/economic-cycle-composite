══════════════════════════════════════════════════════════════════════
STUDY A: EIGENSTRUCTURE ANALYSIS WITH HOWELL TLI
══════════════════════════════════════════════════════════════════════

Loaded 244 observations from /Users/drrms/Projects/economic-cycle-composite/scratch/layer_scores_with_tli.csv
Date range: 2006-01-04 to 2026-04-01

12-Month Differences Analysis:
  Original observations: 244
  Differenced observations (T): 232
  Variables (N): 5
  Q = T/N: 46.4
  Marchenko-Pastur threshold: λ_MP = (1 + 1/√Q)² = 1.3152

## Part A: Correlation Matrix

5×5 Pearson Correlation Matrix of 12-month differences:

```
       L1      L2      L3      L4      TLI
L1     1.000   0.423   0.007   0.175  -0.264
L2     0.423   1.000   0.200   0.123  -0.390
L3     0.007   0.200   1.000   0.347  -0.050
L4     0.175   0.123   0.347   1.000   0.008
TLI    -0.264  -0.390  -0.050   0.008   1.000
```

## Part B: Eigendecomposition

Marchenko-Pastur Threshold: λ_MP = (1 + 1/√46.4)² = 1.3152

Eigenvalues (sorted descending):

| k | λ_k     | Exceeds λ_MP? |
|---|---------|---------------|
| 1 | 1.8348 | YES           |
| 2 | 1.2578 | NO            |
| 3 | 0.8152 | NO            |
| 4 | 0.6160 | NO            |
| 5 | 0.4762 | NO            |

**Persistent modes**: 1 (exceeding λ_MP = 1.3152)

**Prediction 1 Verdict**: FAIL — At least 2 modes (found 1)

## Part C: Eigenvector Composition

### Mode 1 (λ = 1.8348)

| Variable | Loading | Abs Loading | Sign |
|----------|---------|-------------|------|
| L1     |   -0.51 |        0.51 |    - |
| L2     |   -0.59 |        0.59 |    - |
| L3     |   -0.30 |        0.30 |    - |
| L4     |   -0.31 |        0.31 |    - |
| TLI     |    0.45 |        0.45 |    + |

**Classification**: Mixed — Positive: TLI, Negative: L1, L2, L3, L4

**Prediction 2 Verdict**: PARTIAL
