══════════════════════════════════════════════════════════════════════
EIGENSTRUCTURE ANALYSIS OF LAYER SCORES
══════════════════════════════════════════════════════════════════════

Loaded 149 observations from /Users/drrms/Projects/economic-cycle-composite/scratch/layer_scores_history.csv

First differences: N = 148 observations

## Part A: Correlation Matrix

5×5 Pearson Correlation Matrix:

```
        L1      L2      L3      L4      L5
L1     1.000  -0.031   0.080   0.052  -0.025
L2    -0.031   1.000   0.115   0.028  -0.013
L3     0.080   0.115   1.000   0.091   0.067
L4     0.052   0.028   0.091   1.000  -0.086
L5    -0.025  -0.013   0.067  -0.086   1.000
```

Layer Statistics:

| Layer | Mean    | Std Dev | Min     | Max     |
|-------|---------|---------|---------|---------|
| L1     | -0.2568 |  4.9004 | -22.1000 | 19.9000 |
| L2     |  0.0392 | 10.0496 | -43.7000 | 29.0000 |
| L3     | -0.0007 | 25.2636 | -84.1000 | 61.5000 |
| L4     | -0.0432 | 21.2362 | -51.3000 | 61.7000 |
| L5     | -0.2007 |  8.5744 | -36.7000 | 23.3000 |

## Part B: Eigendecomposition

Marchenko-Pastur Threshold: λ_MP = (1 + 1/√Q)² = (1 + 1/√29.6)² = 1.4014

Eigenvalues (sorted descending):

| k | λ_k     | Exceeds λ_MP? |
|---|---------|---------------|
| 1 | 1.1864 | NO            |
| 2 | 1.0836 | NO            |
| 3 | 1.0218 | NO            |
| 4 | 0.9078 | NO            |
| 5 | 0.8004 | NO            |

**Persistent modes**: 0 (exceeding λ_MP)

**Prediction 1 Verdict**: FAIL — At least 2 modes (found 0)

══════════════════════════════════════════════════════════════════════
SUMMARY
══════════════════════════════════════════════════════════════════════

Eigenstructure analysis complete.
Data: 148 first-difference observations from 149 monthly snapshots
Persistent modes: 0 (threshold λ_MP = 1.4014)

See above for prediction verdicts.
