# Complete Data Series Inventory
## 5-Layer Economic Composite Index

**Generated:** 2026-05-09  
**Source:** `src/config/seriesRegistry.ts` + `src/services/liquidityPipeline.ts`  
**Total Series:** 30 (22 L1-L4 + 8 L5)  
**Data Provider:** FRED (Federal Reserve Economic Data) via Cycle Tools API  

---

## Layer 1: Leading Indicators (Weight: 30%)

**Binding Constraint:** JTSJOL (Dec 2000) — Requires ~100 months for meaningful cycle detection ≈ **Apr 2009**

| Series ID | FRED ID | Description | Ticker | Freq | Weight | Invert | Available Since |
|---|---|---|---|---|---|---|---|
| T10Y2Y | T10Y2Y | 10Y-2Y Treasury Spread | T10Y2Y:FDS | Daily | 0.100 | No | ~1961 |
| T10Y3M | T10Y3M | 10Y-3M Treasury Spread | T10Y3M:FDS | Daily | 0.100 | No | ~1991 |
| ICSA | ICSA | Initial Jobless Claims | ICSA-W:FDS | Weekly | 0.253 | **Yes** | 1967 |
| CCSA | CCSA | Continued Claims | CCSA-W:FDS | Weekly | 1.500 | **Yes** | 1967 |
| UMCSENT | UMCSENT | U. Michigan Consumer Sentiment | UMCSENT-M:FDS | Monthly | 1.500 | No | 1955 |
| USSLIND | USSLIND | US Leading Economic Index | USSLIND-M:FDS | Monthly | 0.600 | No | 1959 |
| PERMIT | PERMIT | Building Permits | PERMIT-M:FDS | Monthly | 0.400 | No | 1960 |
| DGORDER | DGORDER | Mfrs New Orders: Durable Goods | DGORDER-M:FDS | Monthly | 0.800 | No | ~1992 |
| **JTSJOL** | **JTSJOL** | **JOLTS Job Openings** | **JTSJOL-M:FDS** | **Monthly** | **0.896** | **No** | **Dec 2000** ⚠️ |

**Layer 1 Summary:** 9 series | Total weight: 7.149 | Data constraint: JTSJOL (2000)

---

## Layer 2: Coincident Activity (Weight: 15%)

**Binding Constraint:** UNRATE (1948) — All data readily available since post-WWII

| Series ID | FRED ID | Description | Ticker | Freq | Weight | Invert | Available Since |
|---|---|---|---|---|---|---|---|
| INDPRO | INDPRO | Industrial Production Index | INDPRO-M:FDS | Monthly | 1.000 | No | 1919 |
| PAYEMS | PAYEMS | Nonfarm Payrolls | PAYEMS-M:FDS | Monthly | 0.500 | No | 1939 |
| DSPIC96 | DSPIC96 | Real Disposable Personal Income | DSPIC96-M:FDS | Monthly | 0.400 | No | 1959 |
| UNRATE | UNRATE | Unemployment Rate | UNRATE-M:FDS | Monthly | 0.600 | **Yes** | 1948 |

**Layer 2 Summary:** 4 series | Total weight: 2.500 | Data constraint: PAYEMS (1939)

---

## Layer 3: Financial Stress / Risk Appetite (Weight: 20%)

**Binding Constraint:** BAMLH0A0HYM2 (Jan 1997) — High yield data modern era

| Series ID | FRED ID | Description | Ticker | Freq | Weight | Invert | Available Since |
|---|---|---|---|---|---|---|---|
| VIXCLS | VIXCLS | CBOE VIX | VIXCLS:FDS | Daily | 0.100 | **Yes** | 1990 |
| STLFSI4 | STLFSI4 | St. Louis Financial Stress Index | STLFSI4-W:FDS | Weekly | 0.100 | **Yes** | ~1980s |
| BAA10Y | BAA10Y | Baa Corp Bond-10Y Spread | BAA10Y:FDS | Daily | 1.500 | **Yes** | 1919 |
| **BAMLH0A0HYM2** | **BAMLH0A0HYM2** | **ICE BofA High Yield OAS** | **BAMLH0A0HYM2:FDS** | **Daily** | **1.349** | **Yes** | **Jan 1997** ⚠️ |

**Layer 3 Summary:** 4 series | Total weight: 3.049 | Data constraint: BAMLH0A0HYM2 (1997)

---

## Layer 4: Inflation / Policy Regime (Weight: 10%)

**Binding Constraint:** T5YIE (Jan 2003) — Modern breakeven inflation expectations

| Series ID | FRED ID | Description | Ticker | Freq | Weight | Invert | Available Since |
|---|---|---|---|---|---|---|---|
| DFF | DFF | Fed Funds Effective Rate | DFF:FDS | Daily | 0.301 | **Yes** | 1954 |
| **T5YIE** | **T5YIE** | **5Y Breakeven Inflation Rate** | **T5YIE:FDS** | **Daily** | **1.500** | **No** | **Jan 2003** ⚠️ |
| CPIAUCSL | CPIAUCSL | CPI All Urban (headline) | CPIAUCSL-M:FDS | Monthly | 0.400 | **Yes** | 1913 |
| CPILFESL | CPILFESL | Core CPI (ex food & energy) | CPILFESL-M:FDS | Monthly | 0.307 | **Yes** | 1957 |
| M2SL | M2SL | M2 Money Supply | M2SL-M:FDS | Monthly | 0.100 | No | 1959 |
| DTWEXBGS | DTWEXBGS | Trade-Weighted US Dollar Index | DTWEXBGS:FDS | Daily | 0.100 | **Yes** | 1973 |

**Layer 4 Summary:** 6 series | Total weight: 2.708 | Data constraint: T5YIE (2003)

---

## Layer 5: Liquidity Indicators — Howell Global Liquidity Cycle (Weight: 25%)

**Architecture:** 8-series model aligned to Wednesday grid | Total weight: 10.0  
**Binding Constraint:** WALCL (Sept 2008) + WRESBAL (2008) — Post-crisis transparency

| Series ID | FRED ID | Description | Ticker | Freq | Weight | Adjustment | Available Since |
|---|---|---|---|---|---|---|---|
| WALCL | WALCL | Fed Total Assets | WALCL-W:FDS | Weekly | 3 | — | Sept 2008 |
| ECBASSETSW | ECB_USD | ECB Total Assets (USD) | ECBASSETSW-W:FDS | Weekly | 1 | ÷ DEXUSEU | ~1998 |
| JPNASSETS | BOJ_USD | BOJ Total Assets (USD) | JPNASSETS-M:FDS | Monthly | 1 | ÷ DEXJPUS | ~1979 |
| **NFL** | **NFL** | **Net Fed Liquidity** | **NFL** | **Weekly** | **1** | **Derived** | **Sept 2008** ⚠️ |
| TOTBKCR | TOTBKCR | US Total Bank Credit | TOTBKCR-W:FDS | Weekly | 1 | — | ~1973 |
| **WRESBAL** | **WRESBAL** | **US Reserve Balances** | **WRESBAL-W:FDS** | **Weekly** | **1** | **—** | **Sept 2008** ⚠️ |
| COMPOUT | COMPOUT | Commercial Paper Outstanding | COMPOUT-W:FDS | Weekly | 1 | — | ~1970 |
| WRMFNS | WRMFNS | Retail Money Market Funds | WRMFNS-W:FDS | Weekly | 1 | — | 1971 |

**NFL (Net Fed Liquidity) — Derived Series:**
```
NFL = WALCL + SWPT - RRPONTSYD - WTREGEN
  where:
    WALCL = Fed Total Assets (positive)
    SWPT = CB Swap Lines (positive)
    RRPONTSYD = Reverse Repo Outstanding (negative)
    WTREGEN = Treasury General Account (negative)
```

**Layer 5 Summary:** 8 series | Total weight: 10.0 | Data constraint: WALCL + WRESBAL (Sept 2008)

---

## Data Availability Summary

### By Layer Binding Constraint

| Layer | Bottleneck Series | Start Date | Minimum for 100 obs | Safe Start Date |
|---|---|---|---|---|
| **L1** | JTSJOL | Dec 2000 | Apr 2009 | 2011+ |
| **L2** | PAYEMS | 1939 | ~1948 | — |
| **L3** | BAMLH0A0HYM2 | Jan 1997 | ~2003 | — |
| **L4** | T5YIE | Jan 2003 | Sep 2011 | 2013+ |
| **L5** | WALCL, WRESBAL | Sept 2008 | — | 2009+ |

### Overall Binding Constraint (All 30 Series)

**Earliest practical start: Q2 2009** (L1 JTSJOL + L5 WALCL/WRESBAL)

**Safe/robust start: 2013-2014** (allows 5-7+ years history per series for signal detection)

**Current analysis start: Jan 2014** ✓ (optimal — 149 snapshots through May 2026)

---

## Data Quality & Sourcing Notes

### FRED / Cycle Tools API Provider (FDS)

All series accessed through **FRED (Federal Reserve Economic Data)** via **Cycle Tools API**:
- Real-time daily/weekly/monthly updates
- Point-in-time accuracy (historical revisions preserved)
- API: `cycle.tools` endpoint (GetDatasetSeries, CycleScanner)

### Critical Data Notes

1. **L5 Constraint (2008):** WALCL and WRESBAL only available from Sept 2008 due to:
   - Federal Reserve transparency (post-Lehman crisis expansion)
   - Reserve Balances (WRESBAL) introduced with QE programs
   - NFL (derived) therefore only available from 2008

2. **L4 Constraint (2003):** T5YIE (5Y breakeven inflation) only available from:
   - Jan 2003 when TIPS (Treasury Inflation-Protected Securities) 5Y maturity introduced
   - Higher weight (1.500) makes this a critical policy indicator

3. **L1 Constraint (2000):** JTSJOL requires:
   - Dec 2000 start (Job Openings and Labor Turnover Survey inception)
   - High weight (0.896) reflects labor market leading signal
   - 100+ monthly observations needed for cycle detection → Apr 2009

4. **Frequency Mix:**
   - **Daily (8 series):** T10Y2Y, T10Y3M, VIXCLS, BAA10Y, BAMLH0A0HYM2, DFF, T5YIE, DTWEXBGS
   - **Weekly (10 series):** ICSA, CCSA, STLFSI4, WALCL, ECBASSETSW, TOTBKCR, WRESBAL, COMPOUT, WRMFNS, NFL (derived)
   - **Monthly (12 series):** UMCSENT, USSLIND, PERMIT, DGORDER, JTSJOL, INDPRO, PAYEMS, DSPIC96, UNRATE, CPIAUCSL, CPILFESL, M2SL, JPNASSETS

### Inversion Convention

Series marked **"Invert: Yes"** are logically inverted for composite scoring:
- **Claims (ICSA, CCSA):** High claims = economic weakness → inverted
- **Unemployment (UNRATE):** High unemployment = weakness → inverted
- **Stress indicators (VIXCLS, STLFSI4, BAA10Y, BAMLH0A0HYM2):** High stress/spreads = risk-off → inverted
- **Policy rates (DFF, inflation, CPI):** Higher rates/inflation = tightening → inverted for growth signal
- **Dollar (DTWEXBGS):** Stronger dollar = risk-off signal → inverted

---

## Series Weighting Methodology

**Per-series weights** derived from **constrained optimization (2000-2022)**:
- Optimized against 8 major market turning points (tops/bottoms)
- Constraint: all 22 L1-L4 series retained (no dropping)
- Minimum weight floor: 0.100
- **Achieved: 8/8 classification accuracy with 20.4pt mean separation**

**Highest-weighted series (all ≥1.3 weight):**
1. CCSA (Continued Claims) — 1.500
2. UMCSENT (Consumer Sentiment) — 1.500
3. BAA10Y (Corp Spreads) — 1.500
4. T5YIE (Inflation Expectation) — 1.500
5. BAMLH0A0HYM2 (HY OAS) — 1.349
6. JTSJOL (Job Openings) — 0.896

**Layer-level aggregation:**
- L1 (Leading): 30% of composite | 9 series
- L2 (Coincident): 15% of composite | 4 series
- L3 (Stress): 20% of composite | 4 series
- L4 (Policy): 10% of composite | 6 series
- L5 (Liquidity): 25% of composite | 8 series

---

## Appendix: FX Adjustment Series (L5 Only)

For international CBs, FX-adjusted to USD:

| Symbol | FRED ID | Description | Ticker | Purpose |
|---|---|---|---|---|
| DEXUSEU | DEXUSEU | USD/EUR Exchange Rate | DEXUSEU:FDS | ECB assets conversion (multiply) |
| DEXJPUS | DEXJPUS | JPY/USD Exchange Rate | DEXJPUS:FDS | BOJ assets conversion (divide) |

---

## References

- **Registry Source:** `src/config/seriesRegistry.ts`
- **L5 Pipeline:** `src/services/liquidityPipeline.ts`
- **Phase Scoring:** `src/services/phaseScoring.ts`
- **Weights Paper:** Constrained optimization vs historical turning points (2000-2022)
- **FRED API:** https://fred.stlouisfed.org/
- **Cycle Tools:** https://api.cycle.tools/

---

*This inventory documents the complete data provenance of the eigenstructure study (May 2026). Data availability constraint: effectively **Sept 2008** for full L1-L5 coverage, **2014+** for robust signal detection.*
