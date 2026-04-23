# Liquidity Pipeline Specification

Precise technical specification for reproducing the Global Liquidity Cycle Watch composite and structural cycle detection. This document is the authoritative reference for any implementation that needs to produce identical results.

---

## Overview

The pipeline produces three scores:

| Score | Label | Weight in Display | What it represents |
|-------|-------|-------------------|-------------------|
| **Structural Score** | Struct | 80% | Where we are in the ~66-month Howell global liquidity cycle |
| **Component Score** | Comp | 20% | Weighted average of 8 individually-scored series |
| **Display Score** | Final | 100% | `0.8 * Structural + 0.2 * Component` |

The structural score and component score are computed through **two completely separate paths** that use different input data and detect different cycles. They are not related computations — they are independent measurements that are blended at the end.

---

## Input Data

### 12 FRED Tickers

| Ticker | Purpose | Frequency |
|--------|---------|-----------|
| `WALCL-W:FDS` | Fed Total Assets | weekly |
| `SWPT-W:FDS` | Fed Swap Lines | weekly |
| `RRPONTSYD:FDS` | Overnight Reverse Repo | daily |
| `WTREGEN-W:FDS` | Treasury General Account | weekly |
| `ECBASSETSW-W:FDS` | ECB Total Assets | weekly |
| `JPNASSETS-M:FDS` | BOJ Total Assets | monthly |
| `DEXUSEU:FDS` | USD per EUR exchange rate | daily |
| `DEXJPUS:FDS` | JPY per USD exchange rate | daily |
| `TOTBKCR-W:FDS` | US Total Bank Credit | weekly |
| `WRESBAL-W:FDS` | US Reserve Balances | weekly |
| `COMPOUT-W:FDS` | Commercial Paper Outstanding | weekly |
| `WRMFNS-W:FDS` | Retail Money Market Funds | weekly |

### Derived Series

**NFL (Net Fed Liquidity):** `WALCL + SWPT - RRPONTSYD - WTREGEN`

- RRPONTSYD is daily — downsample to weekly (pick Wednesday, or nearest prior business day)
- Trim to 2014+ (RRP didn't exist before ~2013, produces artifacts)
- Align all 4 sub-components by finding the nearest observation within 5 days of each WALCL date

### 8 Scored Series

| Series | Weight | FX Adjusted | Source |
|--------|--------|-------------|--------|
| WALCL | 3 | No | Direct from FRED |
| ECB | 1 | Yes: multiply by EUR/USD | Direct from FRED |
| BOJ | 1 | Yes: divide by JPY/USD | Interpolated from monthly |
| NFL | 1 | No | Derived (see above) |
| TOTBKCR | 1 | No | Direct from FRED |
| WRESBAL | 1 | No | Direct from FRED |
| COMPOUT | 1 | No | Direct from FRED |
| WRMFNS | 1 | No | Direct from FRED |

**Total weight: 10** (3+1+1+1+1+1+1+1)

---

## Path A: Structural Score (80% of Display)

Detects the ~66-month Howell cycle from a composite level series built by blending all 8 raw series into one weighted index. The structural score tells you where the global liquidity super-cycle stands.

### Step A1: Wednesday Date Grid

Generate a weekly Wednesday grid from WALCL's date range:
- Start: first Wednesday >= WALCL's first date
- End: WALCL's last date
- Step: every 7 days

### Step A2: Align All Series to Wednesday Grid

| Series type | Alignment method |
|-------------|-----------------|
| Weekly/daily (WALCL, ECB, TOTBKCR, WRESBAL, COMPOUT, WRMFNS, FX rates) | For each Wednesday, search day 0, then ±1, ±2, ±3, ±4, ±5. First match wins. Null if nothing found within 5 days. |
| Monthly (BOJ) | Linear interpolation between the two surrounding monthly observations |
| Derived (NFL) | Build daily map from derived level, then align like weekly/daily |

**FX adjustment** (applied after alignment):
- `ECB_USD[w] = ECB_EUR[w] * DEXUSEU[w]`
- `BOJ_USD[w] = BOJ_JPY[w] / DEXJPUS[w]`

### Step A3: First Valid Index

Find the first Wednesday where **all 3 core CB series** (WALCL, ECB, BOJ) have non-null data. This is typically around December 2002.

**Important:** Only the 3 core CB series are required. The other 5 series may have null values at this point (NFL starts ~2014, COMPOUT/WRMFNS may start later). They join dynamically when available.

### Step A4: Base Values

Each series independently uses its **own first non-null value** after the first valid index as its base for indexing:

```
base[series] = first non-null value of that series after the first valid index
```

Base dates differ per series:
- WALCL, ECB, BOJ, TOTBKCR, WRESBAL: base from ~2002
- NFL, COMPOUT, WRMFNS: base from whenever their data starts (~2014)

### Step A5: Composite Level with Dynamic Weighting

At each weekly bar, only series with non-null data contribute. The weight is normalized by the sum of available weights at that bar:

```
For each bar i:
  weightedSum = 0
  availWeight = 0
  
  For each of the 8 series s:
    v = trimData[s.name][i]
    if v is not null AND base[s.name] is not null:
      indexed = (v / base[s.name]) * 100
      weightedSum += indexed * s.weight
      availWeight += s.weight
  
  level[i] = weightedSum / availWeight    (null if availWeight == 0)
```

**Before ~2014** (5 series available): `availWeight = 7` (3+1+1+1+1)
**After ~2014** (8 series available): `availWeight = 10` (3+1+1+1+1+1+1+1)

The composite level transitions smoothly because new series are indexed to 100 at their entry point.

### Step A6: 52-Week Year-over-Year Momentum

```
yoy[i] = (level[i] - level[i-52]) / |level[i-52]| * 100
```

Consumes 52 bars. ~1200 level bars → ~1165 momentum bars.

### Step A7: HP Filter Detrend

```
POST /api/DSP/Detrend
  Body: yoy array (JSON array of doubles)
  Params: dtype=0 (Hodrick-Prescott), ret=false (return cyclic component)
```

Returns the detrended cyclic component, same length as input.

### Step A8: Howell Pre-Seed (optional but important)

Prepend calibrated Howell GLI-MOM data (1975-2003) to the HP-detrended series before percentile ranking. This gives the pctrank function ~30 years of historical context, eliminating warm-up artifacts where early values swing wildly.

**Calibration:** Linear regression on the overlap period (our HP values vs Howell values at matching months) produces scale factor `a` and offset `b`. Each monthly Howell value is scaled as `a * howell + b` and expanded to ~4.33 weekly entries.

**If no Howell CSV is available:** Skip this step. Pctrank will have warm-up artifacts for the first few years but will stabilize.

### Step A9: Rolling Percentile Rank (780-week window)

```
For each bar i:
  window = all non-null values from index max(0, i-779) to i (inclusive)
  rank = (count of values in window < current value + 0.5) / window.length * 100
```

780 weeks = ~180 months = ~15 years. This normalizes the detrended cycle to a 0-100 scale.

The pre-seed bars are included in the ranking window but stripped from the output afterward. The result is the `norm` array, same length as the YoY/HP arrays.

### Step A10: Structural Cycle Detection

```
POST /api/cycles/CycleScanner
  Body: norm array with nulls removed (JSON array of doubles)
  Params:
    dtype = 0            (HP filter — the scanner applies its own HP)
    minCycleLength = 238  (55 months * 4.33 weeks/month)
    maxCycleLength = 368  (85 months * 4.33 weeks/month)
    bartelsLimit = 10
```

Take the **first peak** from the `peaks` array (rank 1 in this restricted band). This is the structural cycle.

**Expected result:** C285 weekly bars (~65.8 months), matching Howell's published ~67-month finding.

### Step A11: Score the Structural Cycle

Run CRSI on the same `norm` array, tuned to the structural cycle length:

```
POST /api/DSP/CRSI
  Body: norm array with nulls removed
  Params: length = structuralCycleLength (e.g., 285)
```

Compute the structural score:
```
phaseScore = getPhaseScore(structuralPeak.avgPhaseStatus, structuralPeak.avgPhaseScore)
crsiBandScore = getCrsiBandScore(crsi, ub, lb, direction, crsiArr, ubArr, lbArr)
structuralScore = 0.5 * phaseScore + 0.5 * crsiBandScore
```

**This is the Struct value** — e.g., 26.4.

---

## Path B: Component Score (20% of Display)

Each of the 8 series is scored **independently** through its own cycle detection and CRSI pipeline. This does NOT use the composite level — it uses each series' own raw indexed data.

### Step B1: 52-Week YoY on Each Series Individually

For each of the 8 series, compute YoY on the series' own trimmed indexed data:

```
For each series s:
  For i = 52 to length-1:
    compYoY[i] = (trimData[s][i] - trimData[s][i-52]) / |trimData[s][i-52]| * 100
```

This produces 8 independent YoY arrays. Each series has its own length (NFL is shorter because it starts in 2014).

### Step B2: CycleScanner on Each Series' YoY

```
POST /api/cycles/CycleScanner
  Body: that series' compYoY array
  Params: dtype=0, minCycleLength=10, maxCycleLength=400, bartelsLimit=10
```

Extract dominant cycle: highest-strength peak where:
- `cycleLength >= 20`
- `cycleLength <= dataLength / 3` (ensures valid CRSI bands)
- `stabilityScore >= 0.4` OR `stabilityScore == 0`
- Fallback: relax stability if no viable peaks, keep dataLength/3 cap

Each series finds its own cycle:
- WALCL → C120 (~28mo)
- NFL → C39 (~9mo)
- ECB → C232 (~54mo)
- BOJ → C37 (~9mo)
- TOTBKCR → C100 (~23mo)
- WRESBAL → C155 (~36mo)
- COMPOUT → C73 (~17mo)
- WRMFNS → C209 (~48mo)

### Step B3: CRSI on Each Series' YoY

```
POST /api/DSP/CRSI
  Body: that series' compYoY array
  Params: length = that series' dominant cycle length
```

### Step B4: Score Each Series

```
phaseScore = getPhaseScore(dominant.avgPhaseStatus, dominant.avgPhaseScore)
crsiBandScore = getCrsiBandScore(crsi, ub, lb, direction, crsiArr, ubArr, lbArr)
seriesScore = 0.5 * phaseScore + 0.5 * crsiBandScore
```

### Step B5: Component Composite = Weighted Average

```
componentComposite = sum(series.score * series.weight) / sum(series.weight)
```

Only series with valid (non-null) scores contribute. The denominator is the sum of weights of scored series, not the total 10.5.

**This is the Comp value** — e.g., 41.6.

---

## Final Display Score

```
displayScore = 0.8 * structuralScore + 0.2 * componentComposite
```

Example: `0.8 * 26.4 + 0.2 * 41.6 = 21.12 + 8.32 = 29.4`

### Regime Classification

| Display Score | Regime |
|--------------|--------|
| >= 65 | Liquidity Expanding |
| >= 50 | Liquidity Supportive |
| >= 35 | Liquidity Neutral |
| >= 20 | Liquidity Tightening |
| < 20 | Liquidity Contracting |

---

## Why Structural and Component Scores Diverge

The two paths use completely different input data:

| Aspect | Structural (Path A) | Component (Path B) |
|--------|--------------------|--------------------|
| Input data | Composite level (8 series blended into one) | Each series' own raw YoY independently |
| Preprocessing | YoY → HP detrend → pctrank → scanner | YoY → scanner (no pctrank, no pre-seed) |
| Cycle detected | One cycle: C285 (~66mo) from composite | 8 different cycles, one per series |
| Scanner range | Restricted: 238-368 bars (55-85 months) | Full: 10-400 bars |
| What it measures | Position in the global super-cycle | Current momentum state of each series |

They diverge because the structural cycle is a slow-moving macro regime (entire cycle takes ~5.5 years) while individual components oscillate on their own shorter rhythms. The structural cycle can say "early downtrend" while some individual components are temporarily bullish due to their own shorter cycles.

The 80/20 blend ensures the structural cycle dominates because historically when the ~66-month cycle turns, all components eventually follow — individual bullish readings within a structural downtrend are counter-trend bounces that resolve downward.

---

## Key Implementation Details

### WALCL/NFL Overlap

WALCL appears at weight 3 directly AND inside NFL (WALCL+SWPT-RRP-TGA) at weight 1. This is intentional:
- WALCL measures the gross Fed balance sheet
- NFL measures the net liquidity after operational drains (RRP, TGA)
- These are meaningfully different signals — gross can be flat while net oscillates due to RRP/TGA dynamics
- Effective WALCL influence: ~3 + ~1 = ~4 out of 10, which is appropriate given the Fed's dominance

### Dynamic Weighting Transition

The composite level changes character around 2014:
- Before 2014: 5 series (WALCL, ECB, BOJ, TOTBKCR, WRESBAL), total weight 7
- After 2014: 8 series, total weight 10

The transition is smooth because new series are indexed to 100 at their entry point. The structural cycle scanner sees the full ~22-year history and finds the ~66-month cycle in the data before and after the transition.

### Phase Scoring

See `crsi-scoring-guide.md` for the complete CRSI band scoring specification (Method A: crossing override + 6-state logic).

See the Phase Scoring Reference section in `SKILL.md` or `liquidity-layer-methodology.md` for the `avgPhaseStatus + avgPhaseScore → 0-100` mapping table.

### Data Length / 3 Cap

The CRSI endpoint requires ~3 full cycle repetitions for valid Bollinger bands. Any dominant cycle longer than `dataLength / 3` is excluded from selection. For example, with 588 YoY bars, maximum usable cycle is 196.

### API Parameter Casing

The Cycle Tools API requires **lowercase** `dtype` in query parameters (e.g., `dtype=0`). Using `dType` (capital T) may silently fail — the server may not recognize the parameter and use a different default detrending mode, producing incorrect cycle detection results.

### bartelsLimit: Structural vs Component

The two CycleScanner calls use **different** bartelsLimit values:
- **Structural cycle** (Step A10): `bartelsLimit=10` — strict Bartels confidence for the restricted 238-368 band
- **Component scoring** (Step B2): `bartelsLimit=49` — relaxed Bartels, matching the `generate-data.mjs` reference default

Using bartelsLimit=10 for component scoring selects different dominant cycles for some series, producing score divergence.

### Wednesday Alignment: Priority Search Order

The alignment function must use **priority search order**, not nearest-neighbor:
```
For each Wednesday: check day 0 → day -1 → day +1 → day -2 → day +2 → ... → day -5 → day +5
First match wins. Return null if nothing found within ±5 days.
```
Nearest-neighbor (minimum absolute distance) can select a different observation when two candidates are equidistant, producing subtle data alignment differences.

### Howell Pre-Seed: Critical for Structural Scoring

The Howell pre-seed (Step A8) is the single most important step for producing correct structural scores. Without it:
- The 780-week pctrank window has severe warm-up artifacts for the first ~15 years
- Pctrank values cluster in a narrow range, producing extremely narrow CRSI Bollinger bands (e.g., UB=54, LB=46 instead of UB=56, LB=47)
- The narrow bands cause the CycleScanner to detect the wrong phase (e.g., TOP_Departure instead of Downtrend_Starting)
- Structural score errors of 15-20 points propagate through the 80% weight into a ~12-16 point display score error

The pre-seed adds ~1,388 calibrated weekly bars from 1975-2003, giving the pctrank function 30 years of cycle history before our data begins. Once the rolling window is fully populated with our own data (~2018+), the Howell values have scrolled out and no longer affect current readings.

### CRSI Band Extraction

The reference implementation reads UB/LB from the **direct last element** of the CRSI output arrays:
```
ub = ubArr[n - 1]
lb = lbArr[n - 1]
```
Walking backward through previous bars to find valid (non-NaN) values can produce slightly different band values when the CRSI endpoint returns trailing NaN values, leading to small (~1-2 point) score differences.
