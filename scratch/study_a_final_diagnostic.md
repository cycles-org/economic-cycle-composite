══════════════════════════════════════════════════════════════════════
STUDY A FINAL DIAGNOSTIC: TLI IN STUDY 1 WINDOW
══════════════════════════════════════════════════════════════════════

TLI dataset: 244 obs (2006-2026)
FRED L5 dataset: 149 obs (2014-2026)

══════════════════════════════════════════════════════════════════════
TEST 1: EIGENSTRUCTURE ON 2014-2026 WITH TLI (Study 1 Window)
══════════════════════════════════════════════════════════════════════

TLI observations from 2014-01: 148
Date range: 2014-01-01 to 2026-04-01

Sample after 12-month differencing:
  T = 136 observations
  Q = T/N = 27.20
  λ_MP = (1 + 1/√Q)² = 1.4202

Correlation Matrix (12-month diffs, 2014-2026):
```
       L1      L2      L3      L4      TLI
L1      1.000   0.373  -0.024  -0.012  -0.399
L2      0.373   1.000   0.201   0.054  -0.489
L3     -0.024   0.201   1.000   0.359  -0.086
L4     -0.012   0.054   0.359   1.000  -0.012
TLI    -0.399  -0.489  -0.086  -0.012   1.000
```

Eigenvalues (sorted descending):

| k | λ_k     | Exceeds λ_MP? |
|---|---------|---------------|
| 1 | 1.8849 | YES           |
| 2 | 1.3503 | NO            |
| 3 | 0.7031 | NO            |
| 4 | 0.5704 | NO            |
| 5 | 0.4913 | NO            |

**TEST 1 RESULT**:
  λ₂ (TLI, 2014-2026) = 1.3503
  λ_MP threshold = 1.4202
  Second mode present? NO

**Study 1 comparison (2014-2026, FRED L5)**:
  λ₂ (FRED L5) = 1.4603 (PASS - exceeds MP=1.4186)
  λ₂ (TLI)     = 1.3503 (FAIL - below MP=1.4202)
  Difference: -0.1100

Eigenvector composition (Mode 1):
| Var | Loading | Sign |
|-----|---------|------|
| L1  |  -0.501 | - |
| L2  |  -0.590 | - |
| L3  |  -0.229 | - |
| L4  |  -0.129 | - |
| TLI  |   0.576 | + |

Eigenvector composition (Mode 2):
| Var | Loading | Sign |
|-----|---------|------|
| L1  |  -0.272 | - |
| L2  |  -0.023 | - |
| L3  |   0.663 | + |
| L4  |   0.680 | + |
| TLI  |   0.156 | + |

══════════════════════════════════════════════════════════════════════
TEST 2: 12-MONTH DIFFERENCE CORRELATION (TLI vs FRED L5)
══════════════════════════════════════════════════════════════════════

Overlap period observations:
  TLI: 148
  FRED L5: 149

Aligned date pairs: 148

**Level correlation (TLI vs FRED L5, 2014-2026)**: r = 0.4501

12-month difference pairs: 136

**12-month difference correlation (TLI vs FRED L5)**: r = 0.1876

**Correlation Comparison**:

| Series       | Pearson r |
|--------------|-----------|
| TLI vs L5 (levels)        | 0.4501 |
| TLI vs L5 (12-month diffs) | 0.1876 |

**Interpretation**:

✗ Low difference correlation (0.19).
  → The two series have genuinely different cycle dynamics.
  → They measure different aspects of liquidity at cycle scale.
  → Interpretation (A): Different constructs, not just different noise.

══════════════════════════════════════════════════════════════════════
FINAL VERDICT: TWO KEY NUMBERS
══════════════════════════════════════════════════════════════════════

**Number 1: λ₂ with TLI in 2014-2026 only**
  λ₂ = 1.3503
  λ_MP = 1.4202
  Second mode present? NO (below threshold)

**Number 2: Correlation of 12-month diffs (TLI vs FRED L5)**
  r = 0.1876

**Conference Narrative Decision Tree**:

**NARRATIVE 4**: Construct Specificity (TLI ≠ L5 fundamentally)

TLI cannot reproduce second mode in 2014-2026.
TLI and FRED L5 do not share cycle dynamics (r < 0.7).
They measure different aspects of "liquidity."
Study 1 captured what FRED L5 measures; that pattern does not generalize.
Honest message: "Window-specific to FRED L5 methodology; not structural."
