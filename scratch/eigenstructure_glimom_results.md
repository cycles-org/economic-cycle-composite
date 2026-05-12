══════════════════════════════════════════════════════════════════════
STUDY A': EIGENSTRUCTURE ANALYSIS WITH HOWELL GLI-MOM
══════════════════════════════════════════════════════════════════════

L1-L4+TLI dataset:    244 obs, 2006-01-04 to 2026-04-01
L1-L4+L5 dataset:     149 obs, 2014-01-01 to 2026-05-06
GLI-MOM raw:          612 obs, 1975-01-31 to 2025-12-31

Aligned (year-month inner join): 240 obs
Date range: 2006-01-04 to 2025-12-03

──────────────────────────────────────────────────────────────────────
EIGENSTRUCTURE: Full overlap window (2006-01-04 to 2025-12-03)
──────────────────────────────────────────────────────────────────────
Window: 2006-01-04 to 2025-12-03 (240 obs)

After 12-month differencing: T = 228, Q = 45.60, λ_MP = 1.3181

Correlation matrix:
```
         L1      L2      L3      L4      GLI-MOM
L1         1.000   0.423   0.011   0.175  -0.254
L2         0.423   1.000   0.204   0.124  -0.203
L3         0.011   0.204   1.000   0.371  -0.055
L4         0.175   0.124   0.371   1.000  -0.013
GLI-MOM   -0.254  -0.203  -0.055  -0.013   1.000
```

Eigenvalues:
| k | λ_k    | > λ_MP? |
|---|--------|---------|
| 1 | 1.7607 | YES |
| 2 | 1.2307 | NO  |
| 3 | 0.8241 | NO  |
| 4 | 0.7165 | NO  |
| 5 | 0.4679 | NO  |

**Persistent modes: 1**

Mode 1 composition (λ=1.7607):
| Var | Loading | Sign |
|-----|---------|------|
| L1      |  -0.521 | - |
| L2      |  -0.550 | - |
| L3      |  -0.376 | - |
| L4      |  -0.399 | - |
| GLI-MOM |   0.354 | + |

Mode 2 composition (λ=1.2307):
| Var | Loading | Sign |
|-----|---------|------|
| L1      |  -0.365 | - |
| L2      |  -0.201 | - |
| L3      |   0.597 | + |
| L4      |   0.553 | + |
| GLI-MOM |   0.405 | + |

Rolling λ₁/λ₂ analysis SKIPPED: fewer than 2 persistent modes

──────────────────────────────────────────────────────────────────────
EIGENSTRUCTURE: Study 1 window (2014-01 to 2025-12)
──────────────────────────────────────────────────────────────────────
Window: 2014-01-01 to 2025-12-03 (144 obs)

After 12-month differencing: T = 132, Q = 26.40, λ_MP = 1.4271

Correlation matrix:
```
         L1      L2      L3      L4      GLI-MOM
L1         1.000   0.373  -0.019  -0.016  -0.381
L2         0.373   1.000   0.206   0.054  -0.263
L3        -0.019   0.206   1.000   0.386  -0.094
L4        -0.016   0.054   0.386   1.000  -0.028
GLI-MOM   -0.381  -0.263  -0.094  -0.028   1.000
```

Eigenvalues:
| k | λ_k    | > λ_MP? |
|---|--------|---------|
| 1 | 1.7421 | YES |
| 2 | 1.3619 | NO  |
| 3 | 0.7446 | NO  |
| 4 | 0.6461 | NO  |
| 5 | 0.5053 | NO  |

**Persistent modes: 1**

Mode 1 composition (λ=1.7421):
| Var | Loading | Sign |
|-----|---------|------|
| L1      |  -0.531 | - |
| L2      |  -0.553 | - |
| L3      |  -0.316 | - |
| L4      |  -0.213 | - |
| GLI-MOM |   0.517 | + |

Mode 2 composition (λ=1.3619):
| Var | Loading | Sign |
|-----|---------|------|
| L1      |  -0.357 | - |
| L2      |  -0.069 | - |
| L3      |   0.625 | + |
| L4      |   0.657 | + |
| GLI-MOM |   0.213 | + |

Rolling λ₁/λ₂ analysis SKIPPED: fewer than 2 persistent modes

──────────────────────────────────────────────────────────────────────
EIGENSTRUCTURE: Post-pre-seed window (2019-01 to 2025-12)
──────────────────────────────────────────────────────────────────────
Window: 2019-01-02 to 2025-12-03 (84 obs)

After 12-month differencing: T = 72, Q = 14.40, λ_MP = 1.5965

Correlation matrix:
```
         L1      L2      L3      L4      GLI-MOM
L1         1.000   0.481  -0.088   0.011  -0.600
L2         0.481   1.000   0.148   0.102  -0.350
L3        -0.088   0.148   1.000   0.295  -0.121
L4         0.011   0.102   0.295   1.000  -0.027
GLI-MOM   -0.600  -0.350  -0.121  -0.027   1.000
```

Eigenvalues:
| k | λ_k    | > λ_MP? |
|---|--------|---------|
| 1 | 1.9829 | YES |
| 2 | 1.3100 | NO  |
| 3 | 0.7318 | NO  |
| 4 | 0.6511 | NO  |
| 5 | 0.3242 | NO  |

**Persistent modes: 1**

Mode 1 composition (λ=1.9829):
| Var | Loading | Sign |
|-----|---------|------|
| L1      |  -0.599 | - |
| L2      |  -0.530 | - |
| L3      |  -0.132 | - |
| L4      |  -0.117 | - |
| GLI-MOM |   0.574 | + |

Mode 2 composition (λ=1.3100):
| Var | Loading | Sign |
|-----|---------|------|
| L1      |  -0.252 | - |
| L2      |   0.060 | + |
| L3      |   0.696 | + |
| L4      |   0.664 | + |
| GLI-MOM |   0.089 | + |

Rolling λ₁/λ₂ analysis SKIPPED: fewer than 2 persistent modes

══════════════════════════════════════════════════════════════════════
THREE-WAY CORRELATION DIAGNOSTIC
══════════════════════════════════════════════════════════════════════

Three-way overlap (L5+TLI+GLI-MOM): 144 obs, 2014-01-01 to 2025-12-03

| Pair                           | Level r  | 12mo Diff r | N (level/diff) |
|--------------------------------|----------|-------------|----------------|
| GLI-MOM vs TLI                 |   0.8394 |   0.8549 | 144/132 |
| GLI-MOM vs FRED L5             |   0.4827 |   0.2376 | 144/132 |
| TLI vs FRED L5                 |   0.4526 |   0.1896 | 144/132 |

**Documentation claim**: "Correlation with Howell" = 77.7% (Section 12 of liquidity-layer-methodology.md)
**This corresponds most closely to**: GLI-MOM vs FRED L5 at level = 0.4827 (48.3%)
**At cycle scale (12-month diff)**:  GLI-MOM vs FRED L5 = 0.2376 (23.8%)

Note: The 77.7% in the doc is computed over the full weekly pipeline including
the Howell pre-seed (1975-2003). Our correlation here is on the final L5 monthly
display score 2014-2026, so the pre-seed is mostly out of the pctrank window
by mid-2018. We expect lower than 77.7% as a result.

**Pre-seed split** (2014-2018 = partial pre-seed contamination; 2019-2025 = clean):

| Pair                 | 14-18 Lvl | 14-18 Diff | 19-25 Lvl | 19-25 Diff |
|----------------------|-----------|------------|-----------|------------|
| GLI-MOM vs FRED L5   | -0.0473 | -0.1388 |  0.5882 |  0.4448 |
| GLI-MOM vs TLI       |  0.4027 |  0.7145 |  0.9422 |  0.9168 |
| TLI vs FRED L5       |  0.2163 | -0.3220 |  0.5000 |  0.3465 |

══════════════════════════════════════════════════════════════════════
SIX STRESS TESTS
══════════════════════════════════════════════════════════════════════

**Baseline (full window, 2006-01-04 to 2025-12-03, T=228)**
  λ₁ = 1.7607
  λ₂ = 1.2307
  λ_MP = 1.3181
  Persistent modes: 1

## Stress Test 1: GLI-MOM Data Integrity

GLI-MOM source: `public/US-GLI-MOM.csv` — 612 monthly observations, 1975-2025.
This is Howell's published Global Liquidity Index — Momentum series, supplied as
a static file. It is the EXACT series the L5 pipeline was designed to reconstruct
(used as the Howell pre-seed for the 780-week pctrank window).

**Verdict**: VALID — authentic Howell GLI-MOM data, monthly, no FRED reconstruction.

## Stress Test 2: Pre-seed Contamination

GLI-MOM IS the pre-seed source. As an eigenstructure variable (5th column), GLI-MOM
contains no pre-seed contamination — it IS the raw Howell signal.

Pre-seed contamination is relevant only for the GLI-MOM vs L5 correlation diagnostic,
where L5's pctrank window includes calibrated GLI-MOM pre-seed for 1975-2003.
That window scrolls out by ~mid-2018, so 2019-2025 L5 scores are pre-seed-clean.
See the pre-seed split correlation table above for the early-vs-late comparison.

**Verdict**: VALID for primary eigenstructure analysis. Documented for L5 correlation.

## Stress Test 3: Bootstrap Null Model (1000 resamples)

Method: resample 12-month diff observations with replacement, recompute λ₂.

Observed λ₂ = 1.2307, λ_MP = 1.3181
Bootstrap resamples with λ₂ > λ_MP: 233/1000 = p = 0.2330
Study 1 baseline: p = 0.006
Study A (TLI) baseline: p = 0.000

**Verdict**: NEGATIVE — λ₂ subthreshold; bootstrap confirms it is not in the significant tail

## Stress Test 4: Quarterly Decimation

Decimated T = 76, Q = 15.20, λ_MP = 1.5788
  λ₁ = 1.7756 (original 1.7607)
  λ₂ = 1.2296 (original 1.2307)
  λ₂ > λ_MP? NO

**Verdict**: FAILS decimation

## Stress Test 5: Transition Sensitivity

After excluding top-3 L1+L4 transition windows: T = 131, λ_MP = 1.4289
  λ₂ = 1.1389 (original 1.2307, Δ = -0.0918)

**Verdict**: SENSITIVE to transition removal

## Stress Test 6: CRITICAL — Bootstrap Phase Transition

**L1-L4 only baseline (4 variables, no GLI-MOM)**:
  λ₁ = 1.6584
  λ₂ = 1.1465
  λ_MP (4-var) = 1.2825
  λ₂ > λ_MP? NO

Bootstrap phase transition (1000 resamples):
P(full λ₂ > λ_MP AND L1-L4 λ₂ < λ_MP_4): 125/1000 = 0.1250 (12.5%)

Study 1: P(both) = 0.5%
Study A (TLI): P(both) = 19.6%

**Verdict**: FRAGILE

══════════════════════════════════════════════════════════════════════
STUDY A' VERDICT — Three-Outcome Decision
══════════════════════════════════════════════════════════════════════

**OUTCOME 3**

OUTCOME 3: λ₂ < MP with GLI-MOM (matches Study A with TLI).
Neither TLI nor GLI-MOM produces the second mode.
Study 1 finding is specific to FRED reconstruction methodology.
This is the STRONGEST negative result — both authentic Howell products fail to replicate.

══════════════════════════════════════════════════════════════════════
COMPARISON TABLE: STUDY 1 vs STUDY A vs STUDY A'
══════════════════════════════════════════════════════════════════════

| Metric | Study 1 | Study A | Study A' |
|--------|---------|---------|----------|
| L5 source | FRED reconstruction | Howell TLI | Howell GLI-MOM |
| L5 was built to reconstruct this | — | No | YES |
| Sample months (orig) | 149 | 244 | 240 |
| After 12-mo diff (T) | 137 | 232 | 228 |
| λ₁ | 1.5967 | 1.8348 | 1.7607 |
| λ₂ | 1.4603 | 1.2578 | 1.2307 |
| λ_MP | 1.4186 | 1.3152 | 1.3181 |
| Modes above MP | 2 | 1 | 1 |
| Dominant period | 64 months | N/A | N/A |
| Flaw 3 bootstrap p | 0.006 | 0.000 | 0.2330 |
| Flaw 6 P(both) | 0.5% | 19.6% | 12.5% |
| Verdict | Preliminary | Does not replicate | FRAGILE |

**Sub-window stability for Study A' (does eigenstructure hold across time?)**

| Window | T | λ₁ | λ₂ | λ_MP | Modes |
|--------|---|----|----|------|-------|
| Full overlap (2006-01 to 2025-12) | 228 | 1.7607 | 1.2307 | 1.3181 | 1 |
| Study 1 window (2014-01 to 2025-12) | 132 | 1.7421 | 1.3619 | 1.4271 | 1 |
| Post-pre-seed (2019-01 to 2025-12) | 72 | 1.9829 | 1.3100 | 1.5965 | 1 |
