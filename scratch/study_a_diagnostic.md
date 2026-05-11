══════════════════════════════════════════════════════════════════════
STUDY A DIAGNOSTIC: WHY DID λ₂ DETERIORATE?
══════════════════════════════════════════════════════════════════════

Loaded 244 observations from TLI dataset (2006-2026)
Loaded 149 observations from FRED L5 dataset (2014-2026)

══════════════════════════════════════════════════════════════════════
DIAGNOSTIC 1: SUB-PERIOD EIGENSTRUCTURE ANALYSIS
══════════════════════════════════════════════════════════════════════

Period 1 (2006-01 to 2013-12, pre-2014): 96 observations
Period 2 (2014-01 to 2019-12, Study 1 era): 72 observations
Period 3 (2020-01 to 2026-04, COVID era): 76 observations

Period 1 (2006-2013, Crisis era):
  Differenced observations (T): 84
  Q = T/N: 16.8
  λ_MP: 1.5475
  λ₁: 1.0000
  λ₂: 1.0000
  λ₂ > λ_MP? NO

Period 2 (2014-2019, Study 1 era):
  Differenced observations (T): 60
  Q = T/N: 12.0
  λ_MP: 1.6607
  λ₁: 1.7391
  λ₂: 1.3137
  λ₂ > λ_MP? NO

Period 3 (2020-2026, COVID era):
  Differenced observations (T): 64
  Q = T/N: 12.8
  λ_MP: 1.6371
  λ₁: 2.2979
  λ₂: 1.1805
  λ₂ > λ_MP? NO

**Sub-period Comparison Table**:

| Period | T | Q | λ_MP | λ₁ | λ₂ | Exceeds? |
|--------|---|---|------|----|----|----------|
| 1 (2006-13) | 84 | 16.8 | 1.5475 | 1.0000 | 1.0000 | NO |
| 2 (2014-19) | 60 | 12.0 | 1.6607 | 1.7391 | 1.3137 | NO |
| 3 (2020-26) | 64 | 12.8 | 1.6371 | 2.2979 | 1.1805 | NO |

══════════════════════════════════════════════════════════════════════
DIAGNOSTIC 2: ROLLING λ₂ TIME SERIES (60-month windows)
══════════════════════════════════════════════════════════════════════

Rolling window: 60 months
Total windows: 173

| Window End (approx) | λ₂ | λ_MP | Exceeds? |
|---------------------|----|----- |----------|
| 2011-12-07 | 1.0000 | 1.6607 | NO |
| 2012-11-07 | 1.0000 | 1.6607 | NO |
| 2013-10-02 | 1.0000 | 1.6607 | NO |
| 2014-09-03 | 1.0128 | 1.6607 | NO |
| 2015-08-05 | 1.1529 | 1.6607 | NO |
| 2016-07-06 | 1.1048 | 1.6607 | NO |
| 2017-06-07 | 1.1669 | 1.6607 | NO |
| 2018-05-02 | 1.2026 | 1.6607 | NO |
| 2019-04-03 | 1.3123 | 1.6607 | NO |
| 2020-03-04 | 1.3198 | 1.6607 | NO |
| 2021-02-03 | 1.3239 | 1.6607 | NO |
| 2022-01-05 | 1.3077 | 1.6607 | NO |
| 2022-12-07 | 1.2409 | 1.6607 | NO |
| 2023-11-01 | 1.2822 | 1.6607 | NO |
| 2024-10-02 | 1.3427 | 1.6607 | NO |
| 2025-09-03 | 1.2847 | 1.6607 | NO |
| 2026-04-01 | 1.1836 | 1.6607 | NO |

Windows where λ₂ > λ_MP: 0/173 (0.0%)

══════════════════════════════════════════════════════════════════════
DIAGNOSTIC 3: TLI vs FRED L5 CORRELATION (2014-2026 overlap)
══════════════════════════════════════════════════════════════════════

Overlap period observations:
  TLI dataset: 148
  FRED L5 dataset: 148

Aligned pairs for correlation: 148

**TLI vs FRED L5 Correlation (2014-2026): 0.4501**

**Interpretation**: Low correlation (0-0.5)
  TLI and FRED L5 measure different aspects of liquidity.
  Eigenstructure difference is primarily from measurement differences.

══════════════════════════════════════════════════════════════════════
DIAGNOSTIC CONCLUSIONS
══════════════════════════════════════════════════════════════════════

**Q1: Is the second geometric mode present in 2014-2019 with TLI?**
Answer: NO
  (λ₂ = 1.3137 vs λ_MP = 1.6607)

**Q2: Was the second mode ever present in 2006-2026?**
Answer: NO, NEVER
  (Found in 0/173 rolling windows, 0.0% of the time)

**Q3: How correlated are TLI and FRED L5 (2014-2026)?**
Answer: r = 0.4501
  Interpretation: Low/weak correlation — different constructs

**Q4: Most likely explanation for λ₂ deterioration in Study A?**

**FINDING A**: The second mode is NOT present in Period 2 (2014-2019) even WITH TLI.
  This means the entire difference is coming from the extended 2006-2013 data,
  not from the difference between FRED L5 and Howell TLI.
  → The 2006-2013 pre-crisis era breaks the eigenstructure signal.

**FINDING C**: TLI and FRED L5 are poorly correlated (r < 0.5).
  The measurement method matters significantly.
  FRED L5 reconstruction may not capture what Howell's TLI measures.

**FINDING E**: The second mode is rarely present across the full time window.
  It was unstable and intermittent, not a robust structural feature.
  The modal signal degrades outside the 2014-2026 window.

**SYNTHESIS**:
The most likely explanation is that the 2006-2013 pre-crisis period
has a fundamentally different economic structure (different modal
geometry) than the post-GFC 2014-2026 period. When 2006-2013 is
included in the analysis, it dominates the correlation structure and
λ₂ drops below the signal threshold.
