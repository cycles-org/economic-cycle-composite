# Global Liquidity Cycle Watch: Methodology & Interpretation Reference

This document is a standalone reference for the Global Liquidity Cycle Watch — a composite score (0–100) measuring the current state of global liquidity conditions based on 8 dynamically-weighted economic series. It covers the theoretical foundation, data pipeline, scoring logic, interpretation framework, and dashboard UI interpretation features. It is sufficient to understand, explain, or rebuild the liquidity scoring mechanism from scratch.

---

## 1. Theoretical Foundation: Michael Howell's Liquidity Framework

The liquidity layer is grounded in the work of Michael Howell (CrossBorder Capital), primarily from *Capital Wars* (2020) and his ongoing research published on Substack. Howell's central thesis is that **liquidity — the gross flow of credit and capital through the financial system — is the dominant driver of asset prices**, more so than earnings, economic growth, or valuation.

### Key Principles

1. **Asset prices are a function of liquidity and allocation.** Howell models prices as `P = L × (P/L)`, where L is the liquidity pool and P/L is the allocation ratio toward risky assets. Rising liquidity combined with falling inflation creates the maximum equity tailwind.

2. **Financial markets are debt-refinancing machines.** Crises occur when cash flows dry up, not when assets are overpriced. Central banks exist to backstop liquidity provision, and their balance sheet operations are the primary lever.

3. **Liquidity Granger-causes equity prices.** Statistical tests show one-way causation from global liquidity to stock markets (p ≈ 0.00). This is not merely correlation — liquidity changes precede price changes.

4. **The lead-lag structure is predictable.** Fed liquidity leads the S&P 500 and NASDAQ by approximately 6 weeks, and gold by approximately 6 months. This creates an actionable timing framework.

5. **The yield curve is a liquidity expression.** A steepening curve reflects expanding liquidity (more credit flowing into the economy). A flattening or inverted curve reflects contracting liquidity (credit withdrawal). The curve is a consequence, not a cause.

6. **Less than one fifth of Wall Street's gains come from earnings.** The rest is driven by liquidity expansion and investor reallocation toward riskier assets. This explains why markets can rise despite flat or declining earnings — if liquidity is expanding, the allocation ratio toward equities increases.

### The Liquidity Cycle

Howell identified a **roughly 65-month (~5.4 year) Global Liquidity Cycle** using Fourier analysis on the Global Liquidity Index (GLI). This cycle represents the natural oscillation between central bank expansion and contraction phases across all major economies (Fed, ECB, BOJ, PBOC).

Our model reconstructs this global cycle from **8 publicly available series** spanning the Fed, ECB, and BOJ balance sheets plus US private credit and reserves. The merged composite detects a structural cycle of **C285 weekly bars (~66 months)** — matching Howell's C67. The scan range is minCycle=238 (~55 months), maxCycle=368 (~85 months), isolating the structural frequency band.

---

## 2. Net Fed Liquidity: The Core Derived Series

The most important series in the liquidity layer is **Net Fed Liquidity** — a derived measure of how much Fed-created liquidity is actually reaching financial markets.

### The Formula

```
Net Fed Liquidity = WALCL + SWPT - RRPONTSYD - WTREGEN
```

### Component Breakdown

**WALCL — Federal Reserve Total Assets (+ adds liquidity)**
The Fed's balance sheet. When the Fed conducts quantitative easing (QE), it purchases Treasury securities and MBS, expanding WALCL and injecting reserves into the banking system. When the Fed conducts quantitative tightening (QT), it lets securities roll off, shrinking WALCL and withdrawing reserves. This is the primary structural driver of Fed liquidity — it sets the baseline.

**SWPT — Central Bank Swap Lines (+ adds liquidity)**
Dollar liquidity swap lines between the Fed and foreign central banks. During crises (2008, 2020), foreign institutions face dollar funding stress and the Fed provides USD through swaps with the ECB, BOJ, etc. These injections add dollar liquidity globally. In normal markets, SWPT is near zero — it only spikes during acute stress events. We include it for completeness and to capture crisis dynamics.

**RRPONTSYD — Overnight Reverse Repo Facility (- drains liquidity)**
The Fed's reverse repo facility allows money market funds, banks, and GSEs to park cash at the Fed overnight. Money flowing INTO the RRP is money flowing OUT of financial markets — it drains liquidity. When RRP balances are high (peaked above $2 trillion in 2022-2023), an enormous amount of liquidity is sidelined. When RRP drains (as it did through 2023-2024), that cash flows back into markets — a significant liquidity tailwind.

**WTREGEN — Treasury General Account (- drains liquidity)**
The Treasury's checking account at the Fed. When the Treasury accumulates cash (through tax receipts or debt issuance exceeding spending), the TGA rises and liquidity is drained from the system — money moves from bank reserves to the government's account. When the Treasury spends down the TGA, liquidity is released. The TGA oscillates around quarterly tax deadlines, debt ceiling events, and spending patterns, creating short-term liquidity cycles of 4-12 weeks.

### Why This Formula Works

The formula captures the **net amount of Fed-created money that is actually circulating in financial markets**:

- WALCL is the gross amount the Fed has injected
- SWPT adds crisis-period foreign dollar provision
- RRPONTSYD subtracts what participants voluntarily parked back at the Fed
- WTREGEN subtracts what the government is holding idle

The result is the effective liquidity pool available to be deployed into bonds, equities, and other risk assets. When this number is rising, there is more money chasing assets. When it is falling, the pool is shrinking.

---

## 3. The Momentum Transformation (Critical Step)

> **Universal principle:** Every series in the liquidity framework is first converted into a **52-week Year-over-Year (YoY) momentum series** before any cycle analysis is performed. No raw level data is ever passed directly to the CycleScanner or CRSI. This applies to all 8 component series (WALCL, ECB$, BOJ$, NFL, TOTBKCR, COMPOUT, WRMFNS, WRESBAL) and to the merged composite used for structural cycle detection. The YoY transformation removes the structural upward trend inherent in all monetary/credit aggregates, producing a stationary oscillator where cyclical patterns can be detected.

### Why Raw Levels Don't Work

The raw dollar level of Net Fed Liquidity is a **non-stationary trending series** — it grows over time as the Fed's balance sheet structurally expands (from ~$800B pre-GFC to ~$7T+ post-COVID). No meaningful cycle can be extracted from a series that only goes up over the long term. Spectral analysis on raw levels is dominated by the trend component, producing spurious cycle detections that reflect data artifacts rather than real economic oscillations.

### The Solution: Year-over-Year Percentage Change

Following Howell's approach (his GLI "essentially captures momentum" and "is designed to have a 0-100 range, with a mean set at 50"), we transform the raw level into **52-week (Year-over-Year) percentage change**:

```
momentum[t] = (level[t] - level[t-52]) / |level[t-52]| × 100
```

This transformation:

1. **Removes the trend.** A series that grew from $2T to $6T becomes a series oscillating around zero — positive when liquidity is expanding faster than a year ago, negative when contracting.

2. **Creates a stationary oscillator.** The momentum series swings between roughly -15% to +25% in normal times, with extreme readings during QE (+50% to +75%) and QT (-10% to -20%).

3. **Makes the liquidity cycle visible.** The oscillation between expansion momentum and contraction momentum IS the liquidity cycle. Fourier analysis on this series detects the dominant cycle lengths.

4. **Smooths seasonal effects.** The 52-week lookback cancels out quarterly Treasury/TGA seasonality (tax deadlines produce the same TGA pattern each year, which nets out in YoY change).

### Why 52 Weeks Specifically

- Matches the standard Year-over-Year comparison economists use universally
- Long enough to smooth quarterly TGA oscillations and seasonal Treasury patterns
- Short enough to be responsive to genuine policy shifts (QE start, QT start)
- Produces a clean cyclical series where the dominant operational cycles and the ~66-month structural cycle are both detectable
- Shorter lookbacks (26 weeks, 13 weeks) produce noisier momentum with more sub-cycles but weaker long-cycle signal

### What the Momentum Tells You

| Momentum Range | Interpretation |
|----------------|---------------|
| > +20% | Aggressive expansion (QE era, crisis response) |
| +10% to +20% | Moderate expansion (normal easing cycle) |
| 0% to +10% | Mild expansion or transition |
| 0% to -5% | Mild contraction or transition |
| -5% to -15% | Moderate contraction (active QT) |
| < -15% | Aggressive contraction (peak QT impact) |

---

## 4. Cycle Detection on Momentum

### CycleScanner Configuration

The momentum series is fed into the Cycle Tools CycleScanner with:

- **`dtype=0` (HP filter)** — Although the 52-week YoY momentum already removes the gross trend, the HP filter applied by the scanner further isolates the cyclical component. This matches the WhenToTrade UI application behavior and produces consistent strength scales across all series. **The parameter name must be lowercase `dtype`** — the API may not recognize the capitalized `dType` variant.

Other parameters:
- `minCycleLength=10` (captures 2.5-month operational sub-cycles)
- `maxCycleLength=400` (covers the full ~87-month structural window)
- `bartelsLimit=49` (default Bartels confidence for component scoring)
- `dominantPeakFinder=true` and `useStability=true` for robust peak ranking

> **Note on bartelsLimit:** Component series scoring uses `bartelsLimit=49` (the default). The structural cycle scanner uses `bartelsLimit=10` (stricter confidence for the restricted 238-368 bar band). These are different values — using bartelsLimit=10 for component scoring selects different dominant cycles for some series.

### Expected Cycle Structure in US Fed Liquidity

The CycleScanner typically detects a hierarchy of cycles in the NFL momentum:

| Cycle | Length | Description |
|-------|--------|-------------|
| Structural | ~380 bars (~87 months) | Full Fed policy cycle (QE→QT→QE). Very high stability (>0.90). Too long for practical CRSI tuning but confirms the regime direction. |
| Intermediate | ~79 bars (~18 months) | Policy sub-cycle. Reflects mid-course adjustments, BTFP-type interventions, debt ceiling resolutions. |
| Operational (dominant) | ~39 bars (~9 months) | The primary actionable cycle. Driven by quarterly TGA oscillations, Treasury refunding patterns, and RRP flow dynamics. Highest Bartels score, used for CRSI tuning. |
| Short-term | ~20-34 bars (~5-8 months) | Noise from individual Fed operations, month-end effects, seasonal patterns. |

The **operational ~9-month cycle** is extracted as the dominant cycle because it has the strongest Bartels score (statistical significance) and the best balance of stability and responsiveness. This is the cycle the CRSI is tuned to.

### Dominant Cycle Extraction Logic

The extraction selects the strongest viable cycle that can produce valid CRSI bands:

1. Filter peaks to those with `cycleLength >= 20` AND `cycleLength <= dataLength / 3` AND (`stabilityScore >= 0.4` OR `stabilityScore === 0`)
2. Fallback: relax stability filter if no viable peaks, keeping the `dataLength / 3` cap
3. Sort by `strength` descending — select the peak with highest spectral power
4. If no peaks pass filters, use the first peak as ultimate fallback

The **`dataLength / 3` cap** is critical: the CRSI endpoint requires approximately 3 full cycle repetitions to compute valid Bollinger-style upper/lower bands. Cycles longer than one-third of the data length produce all-NaN band values, making band-relative scoring impossible.

**Strength-based selection** picks the cycle with the most spectral energy, which is the most prominent oscillation in the data regardless of the PeakFinder AI's visual ranking.

---

## 5. CRSI: Cycle-Tuned Oscillator

The **Cyclic Relative Strength Index (CRSI)** is computed on the momentum series, tuned to the dominant cycle length. For NFL with a 39-bar dominant cycle, the CRSI uses a 39-bar window.

### What CRSI on Momentum Means

Because the input is already momentum (first derivative of level), the CRSI is effectively measuring the **acceleration of liquidity change** — a second derivative.

### Score Architecture: Crossing Override + 6-State Base

The CRSI returns dynamic upper and lower bands that adapt to the cycle-tuned window. These bands define the overbought/oversold thresholds specific to the liquidity momentum's cyclical behavior. The scoring uses a **two-layer architecture** where band crossings override the base logic:

```
0 ──────── 10 ──────────────────── 90 ──────── 100
 ◄ bearish ►  ◄── 6-state base ──►  ◄ bullish ►
  crossing       (no crossing)       crossing
```

- **0–10**: Reserved for bearish crossings (CRSI dropped from above UB back into bands)
- **10–90**: 6-state base logic (current position + direction, no crossing active)
- **90–100**: Reserved for bullish crossings (CRSI rose from below LB back into bands)

### Layer 1 (checked first): Crossing Override — Score 0–10 or 90–100

A completed band crossing is the most decisive CRSI signal — it means an overbought or oversold condition has broken. When CRSI is currently within bands, the previous 1–4 bars are checked for a recent extreme. If found, the crossing **overrides** all base logic. Score is determined by recency — a fresh crossing is the strongest signal, fading over 4 bars.

**Bearish crossing** (was above UB, now within bands): `score = barsAgo × 2.5` → 2.5 (fresh) to 10 (4 bars ago).

**Bullish crossing** (was below LB, now within bands): `score = 100 − barsAgo × 2.5` → 97.5 (fresh) to 90 (4 bars ago).

### Layer 2 (fallback): 6-State Base Logic — Score 10–90

Only reached when no crossing is active. **Band position alone is not sufficient** — the direction of CRSI movement determines whether a band excursion represents acceleration, stalling, or reversal.

The critical insight: a CRSI above the upper band that is flat or weakly rising represents *stalling* momentum — the expansion is exhausting but hasn't reversed. Only confirmed strong rising qualifies as acceleration, and any falling at all triggers a reversal signal. The same asymmetric logic applies below the lower band.

**Direction thresholds are asymmetric:**
- **Reversals** trigger on ANY directional change — no threshold needed. If CRSI is extended and starts turning, even a small move is meaningful.
- **Accelerations** require direction above a **relative threshold** (5% of band width) to confirm real momentum, not noise.

| State | Condition | Interpretation | Score Range |
|-------|-----------|---------------|-------------|
| **Overbought Reversal** | Above UB, direction < 0 (any) | Expansion momentum has peaked, turning down. Most bearish above-band state. | 10–35 |
| **Upside Acceleration** | Above UB, direction > accelThreshold | Liquidity expansion momentum accelerating beyond normal bounds. Strong bullish. | 70–90 |
| **Overbought Stalling** | Above UB, flat/weak rise | Overbought but momentum exhausting — not falling yet, not rising enough to confirm acceleration. | 35–50 |
| **Oversold Reversal** | Below LB, direction > 0 (any) | Contraction exhausted, liquidity beginning to recover. Howell's earliest buy signal. | 65–90 |
| **Downside Acceleration** | Below LB, direction < −accelThreshold | Contraction accelerating — not yet showing signs of exhaustion. Not a buy signal despite being "oversold." | 10–30 |
| **Oversold Stalling** | Below LB, flat/weak fall | Oversold but momentum exhausting — not rising yet, not falling enough to confirm acceleration. | 50–65 |
| **Within Bands** | Between LB and UB (no crossing) | Normal oscillation range. Score interpolates linearly. | 35–65 |

### Direction Detection

Direction is determined via **linear regression slope** over the last 5 CRSI values:

```
slope = Σ((i - x̄)(crsi[i] - ȳ)) / Σ((i - x̄)²)   for i in last 5 bars
```

Using regression over 5 bars provides a more stable trend reading than simple bar-to-bar deltas. The slope is in CRSI points per bar.

### Acceleration Threshold

The threshold for confirming acceleration is **relative** — 5% of band width — so it scales with each series' volatility:

```
accelThreshold = bandWidth × 0.05
```

Examples: narrow bands (15pt) → threshold ~0.75; wide bands (50pt) → threshold ~2.5. This avoids the problem of an absolute threshold being too sensitive for volatile series or too insensitive for stable ones.

### Band-Width Scaling (Excess Ratio)

Beyond the initial band excursion, the score scales based on how many **band-widths** the CRSI has exceeded the band. Band-width = UB - LB. This normalizes across series — "1 band-width below the lower band" means the same severity for NFL (which may have bands at 43-77) as for COMPOUT (which may have bands at 43-58).

```
excess = (crsi − UB) / bandWidth     (when above upper band)
excess = (LB − crsi) / bandWidth     (when below lower band)
```

**Band boundary condition:** When CRSI is exactly equal to a band (`crsi >= UB` or `crsi <= LB`), the band logic triggers — not the within-bands interpolation.

**Exact scaling formulas:**

| State | Formula | Scaling Factor |
|-------|---------|----------------|
| Overbought Reversal | `max(10, 35 - excess × 15)` | 15 per band-width |
| Upside Acceleration | `min(90, 70 + excess × 10)` | 10 per band-width |
| Overbought Stalling | `max(35, 50 - excess × 10)` | 10 per band-width |
| Oversold Reversal | `min(90, 65 + excess × 15)` | 15 per band-width |
| Downside Acceleration | `max(10, 30 - excess × 10)` | 10 per band-width |
| Oversold Stalling | `min(65, 50 + excess × 10)` | 10 per band-width |
| Within Bands | `35 + ((crsi - LB) / bandWidth) × 30` | linear 35→65 |

All scores are rounded to 1 decimal place: `round(score × 10) / 10`.

### Why This Matters for Scoring

The band+direction+crossing scoring captures dynamics that simpler approaches miss. A CRSI of 42 "looks bearish" in absolute terms, but if the lower band is at 43 and the CRSI is still falling, it's in **downside acceleration** — much more bearish than the raw number suggests. If the same CRSI of 42 is below a lower band at 43 but flat, it's **oversold stalling** — momentum is exhausting. And if it just crossed above the lower band this bar, it triggers the **crossing override** at score 97.5 — the strongest bullish signal regardless of direction.

---

## 6. Phase Status Scoring

### Why Not Use avgPhaseScore Alone

The CycleScanner returns two independent phase measurements per peak. The **average phase** (`avgPhaseScore` + `avgPhaseStatus`) is averaged across all cycle repetitions and is the preferred measurement for scoring. The **current phase** (`phaseScore` + `phaseStatus`) reflects only the most recent cycle. These must always be used as matched pairs — never cross `avgPhaseScore` with `phaseStatus`. The `avgPhaseScore` ranges from -100 to +100. The numeric score alone is **ambiguous**: an avgPhaseScore of 95 could mean either "TOP_Arrival" (we're at the peak, hasn't turned yet) or "Downtrend_Starting" (we just left the peak, already turning down). These are fundamentally different situations for risk management.

However, the avgPhaseScore **within** a given phase status provides valuable granularity. For example, "Uptrend_Neutral" spans a wide arc of the cycle — an avgPhaseScore of -30 (just entered neutral zone, early mid-uptrend) is meaningfully more bullish than +60 (about to exit neutral into approaching-top zone). A fixed score of 70 for all Uptrend_Neutral readings would lose this information.

Our scoring therefore uses **both** the phase status string (for directional context) and the avgPhaseScore (for position within that phase), with linear interpolation.

### Phase Status → Score Mapping (0-100)

The CycleScanner's `avgPhaseStatus` + `avgPhaseScore` output maps to a **0-100 application score** where **0 = most bearish** (Downtrend_Starting) and **100 = most bullish** (Uptrend_Starting). This mapping follows the cycle clockwise from trough to peak to trough.

**CRITICAL:** Always use `avgPhaseStatus` with `avgPhaseScore` (the average phase pair). Never use `phaseStatus` with `avgPhaseScore` — they come from different calculations and mixing them produces incorrect results.

The `avgPhaseScore` does NOT sweep continuously from -100 to +100. It follows **two arcs with sign flips** at the peak and trough:
- **Rising arc** (trough → peak): -100 → -95 → [JUMP to +30] → +40 → +60 → +80 → +95 → +100
- **Falling arc** (peak → trough): +100 → +95 → [JUMP to -30] → -40 → -60 → -80 → -95 → -100

Most phases return a **fixed** avgPhaseScore value. Only `Uptrend_Neutral` and `Downtrend_Neutral` span a range requiring interpolation.

| Cycle Position | avgPhaseStatus | avgPhaseScore | App Score (0-100) | Type | Rationale |
|---|---|---|---|---|---|
| **Early uptrend** | Uptrend_Starting | -95 | **100** | fixed | Most bullish — confirmed turn from trough, ascending momentum building |
| Leaving trough | BOTTOM_Departure | -100 | **88** | fixed | Turn confirmed, cycle has left the bottom but ascent not yet started |
| At trough | BOTTOM_Arrival | -95 | **78** | fixed | Bottoming process — forward-looking bullish, worst is behind |
| Mid uptrend (early) | Uptrend_Neutral | 30 | **72** | interpolated | Early mid-uptrend, strong bullish momentum |
| Mid uptrend | Uptrend_Neutral | 40 | **66** | interpolated | Mid-uptrend, bullish but peak approaching |
| Mid uptrend | Uptrend_Neutral | 50 | **60** | interpolated | Mid-uptrend, halfway to peak |
| Mid uptrend (late) | Uptrend_Neutral | 60 | **54** | interpolated | Late mid-uptrend, decelerating toward top |
| Late uptrend | Uptrend_ApproachingTop | 80 | **48** | fixed | Approaching peak — caution, upside limited |
| At peak | TOP_Arrival | 95 | **42** | fixed | Topping process — prepare for reversal |
| Leaving peak | TOP_Departure | 100 | **30** | fixed | Turn confirmed bearish, cycle has left the top |
| Late downtrend | Downtrend_ApproachingBottom | -80 | **36** | fixed | Approaching trough — bearish but improving, bottom near |
| Mid downtrend (late) | Downtrend_Neutral | -60 | **30** | interpolated | Late mid-downtrend, conditions improving toward bottom |
| Mid downtrend | Downtrend_Neutral | -50 | **24** | interpolated | Mid-downtrend, bearish momentum |
| Mid downtrend | Downtrend_Neutral | -40 | **18** | interpolated | Early-mid downtrend, strong bearish |
| Mid downtrend (early) | Downtrend_Neutral | -30 | **12** | interpolated | Just entered neutral descent zone, most bearish within neutral |
| **Early downtrend** | Downtrend_Starting | 95 | **0** | fixed | Most bearish — confirmed turn from peak, descending momentum building |

### Design Principles

- **Uptrend_Starting (100) is the most bullish** — the confirmed turn from the trough with ascending momentum building. This is the earliest actionable buy signal.

- **Downtrend_Starting (0) is the most bearish** — the confirmed turn from the peak with descending momentum building. Howell's ~6-week lead means equity markets should feel maximum pain approximately 6 weeks after this phase begins.

- **BOTTOM_Arrival (78) scores higher than TOP_Arrival (42)** because arriving at a bottom is forward-looking bullish (worst is behind), while arriving at a top is forward-looking bearish (worst is ahead).

- **Downtrend_ApproachingBottom (36) overlaps with TOP_Departure (30) and late Downtrend_Neutral (30).** These are at similar risk levels despite different cycle positions — approaching the bottom is bearish but improving, while TOP_Departure is the beginning of the decline.

- **Only two phases interpolate.** Uptrend_Neutral (score 72→54 as avgPhaseScore goes 30→60) and Downtrend_Neutral (score 12→30 as avgPhaseScore goes -30→-60). All other phases are fixed-point lookups.

### Implementation

```
function getPhaseScore(avgPhaseStatus, avgPhaseScore):
    // Fixed-value phases: direct lookup
    if avgPhaseStatus in FIXED_PHASES:
        return FIXED_PHASES[avgPhaseStatus].appScore

    // Interpolated phases: Uptrend_Neutral and Downtrend_Neutral
    if avgPhaseStatus == "Uptrend_Neutral":
        return 72 - ((avgPhaseScore - 30) / 30) * 18  // 30→72, 60→54

    if avgPhaseStatus == "Downtrend_Neutral":
        return 12 + ((avgPhaseScore - (-30)) / (-30)) * 18  // -30→12, -60→30

    // Unknown phase
    return 50
```

If avgPhaseScore is unavailable, fall back to 50 (neutral).

---

## 7. Combined Score: Phase + CRSI Blend

Each series in the liquidity layer receives a **combined score** that blends the interpolated phase position with the band+direction adjusted CRSI:

```
crsiBandScore = getCrsiBandScore(crsi, upperBand, lowerBand, direction, crsiArr, ubArr, lbArr)
seriesScore   = 0.5 × phaseScore(phaseStatus, avgPhaseScore) + 0.5 × crsiBandScore
```

### Why Blend Both

**Phase score (interpolated)** captures *where* you are in the cycle — the structural direction and position within that direction. It is slow-moving and directional. A series in Downtrend_Starting is bearish regardless of whether CRSI is temporarily bouncing. The avgPhaseScore interpolation adds granularity: Downtrend_Starting with avgPhase=95 (just started, score=17) is slightly more bearish than avgPhase=60 (gathering steam, score=24).

**CRSI band score** captures *how stretched* the series is relative to its own adaptive bands, whether the stretch is accelerating, stalling, or reversing, and whether a decisive band crossing has just occurred. It is faster-moving and direction-aware. A below-band CRSI that is still falling (acceleration) is scored very differently from one that is flat (stalling) or turning up (reversal). A completed crossing back into bands produces the most extreme scores (0–10 or 90–100).

Using only phase misses the oscillator's acceleration/reversal signals. Using only CRSI misses the directional context. The 50/50 blend captures both:

- When phase and CRSI agree (Downtrend_Starting + below LB still falling), the combined score is very bearish — both structural direction and momentum acceleration confirm contraction.
- When they partially diverge (Downtrend_Starting + below LB but rising), the combined score moderates — the phase says we just topped, but the oscillator says contraction may be exhausting early. This is valuable nuance.
- When they fully diverge (Uptrend_Neutral + above UB turning down), the combined score reflects the mixed signal — structural support remains but near-term overbought reversal is underway.

### Example Calculations

**Strongly bearish — downside acceleration:** Phase=Downtrend_Starting, avgPhase=95 (phaseScore=17), CRSI=41.7, below LB (43.4), falling → crsiBandScore≈29.5 → Combined = 0.5×17 + 0.5×29.5 = **23.3**
The cycle just topped, and CRSI is below its lower band and still falling — contraction is accelerating. Both signals agree with maximum conviction.

**Strongly bullish — oversold reversal:** Phase=BOTTOM_Departure, avgPhase=-95 (phaseScore=94), CRSI=25, below LB (30), rising → crsiBandScore≈72 → Combined = 0.5×94 + 0.5×72 = **83.0**
The cycle has turned up from a deep bottom and CRSI, although still below its lower band, is rising — classic oversold reversal. Strongest buy signal.

**Bullish — upside acceleration:** Phase=Uptrend_Neutral, avgPhase=-20 (phaseScore=73), CRSI=68, above UB (60), rising → crsiBandScore≈72 → Combined = 0.5×73 + 0.5×72 = **72.5**
Mid-uptrend with CRSI breaking above its upper band and still rising — liquidity expansion is accelerating. Strong bullish momentum.

**Mixed — overbought reversal in uptrend:** Phase=Uptrend_Neutral, avgPhase=+50 (phaseScore=60), CRSI=68, above UB (60), falling → crsiBandScore≈32 → Combined = 0.5×60 + 0.5×32 = **46.0**
Late in the uptrend and CRSI has broken above its band but is turning down — the expansion phase may be peaking. Cautious despite structural support.

**Mixed — oversold reversal in early downtrend:** Phase=Downtrend_Neutral, avgPhase=+20 (phaseScore=17), CRSI=28, below LB (34), rising → crsiBandScore≈68 → Combined = 0.5×17 + 0.5×68 = **42.5**
Still bearish structurally but CRSI is turning up from oversold — a potential bear market rally in liquidity. The low phase score prevents overreacting to the reversal signal.

**Deep bearish — acceleration in late downtrend:** Phase=Downtrend_Neutral, avgPhase=-30 (phaseScore=28), CRSI=20, below LB (34), falling → crsiBandScore≈21 → Combined = 0.5×28 + 0.5×21 = **24.5**
Deep in the downtrend and contraction is still accelerating — no reversal signal yet. Maximum bearish reading from this phase.

---

## 8. Eight-Series Architecture with Dynamic Weighting

The liquidity layer comprises eight individually-scored series in a single unified panel, each representing a distinct component of global liquidity conditions. All eight are scored independently through the same pipeline (52-week YoY → CycleScanner → CRSI → phase+band score) and combined via a **dynamically-weighted average**.

### Series Definitions

| Series | Ticker | Weight | Role |
|--------|--------|--------|------|
| **WALCL** (Fed Total Assets) | WALCL-W:FDS | **3** | Dominant global CB — reserve currency issuer |
| **ECB Total Assets** (USD, FX-adjusted) | ECBASSETSW-W:FDS | **1** | Second-largest CB balance sheet |
| **BOJ Total Assets** (USD, FX-adjusted) | JPNASSETS-M:FDS | **1** | Third-largest CB balance sheet |
| **NFL** (Net Fed Liquidity) | derived | **1** | Net effect of Fed balance sheet after drains (WALCL + SWPT - RRP - TGA) |
| **TOTBKCR** (US Total Bank Credit) | TOTBKCR-W:FDS | **1** | Private credit transmission channel |
| **WRESBAL** (US Reserve Balances) | WRESBAL-W:FDS | **1** | Banking system plumbing — reserve scarcity/abundance |
| **COMPOUT** (Commercial Paper Outstanding) | COMPOUT-W:FDS | **1** | Shadow banking / market-based short-term funding |
| **WRMFNS** (Retail Money Market Funds) | WRMFNS-W:FDS | **1** | Cash pool available for deployment into risk assets |

**Total weight: 10** (3 + 1 + 1 + 1 + 1 + 1 + 1 + 1)

**Central bank balance sheets (WALCL + ECB + BOJ) = 5/10 = 50%** — the dominant block, reflecting Howell's thesis that CB operations are the primary driver of global liquidity.

#### Weight Rationale

- **WALCL at 3x** because the US dollar is the global reserve currency — Fed operations have outsized global impact.
- **ECB and BOJ at 1x** provide the cross-CB averaging that produces the ~66-month cycle. These are FX-adjusted to USD to match Howell's dollar-denominated methodology.
- **NFL at 1x** captures the net effect of the Fed balance sheet after drains (RRP, TGA). This is meaningfully different from gross WALCL — during periods when the RRP facility absorbs trillions or the TGA accumulates cash, WALCL overstates available liquidity.
- **TOTBKCR at 1x** adds private credit amplification — the transmission mechanism from CB reserves to the real economy.
- **WRESBAL at 1x** adds the reserve plumbing layer. Reserve balances show the turn in liquidity conditions before it appears in gross CB balance sheets.
- **COMPOUT at 1x** represents shadow banking and market-based short-term funding.
- **WRMFNS at 1x** adds the retail cash pool. Money market fund flows are somewhat ambiguous (cash sidelined vs. dry powder) but still contribute meaningful liquidity signal.

#### WALCL Overlap with NFL

WALCL appears directly (weight 3) AND inside NFL (which is WALCL + SWPT - RRP - TGA, weight 1). This overlap is intentional — WALCL is the dominant global driver and NFL captures the net effect after drains, which is meaningfully different from gross balance sheet. During QT with high RRP absorption, WALCL and NFL can diverge significantly, providing distinct signals.

#### M2 Exclusion

M2 money supply was tested but excluded — at weight 0.5 it had negligible impact on both the structural cycle detection (unchanged) and the component composite (less than 1 point difference). M2 largely duplicates information already captured by bank credit and reserve balances.

### Dynamic Weighting

The composite uses dynamic weighting to preserve the full ~22-year history needed for structural cycle detection:

- **Core CB series (WALCL, ECB, BOJ) must all have data** to start the composite (~December 2002). These three define the first common date.
- **Other series join dynamically** when their data becomes available. NFL, COMPOUT, and WRMFNS join from ~2014 (after RRPONTSYD becomes meaningful).
- **At each weekly bar**, only series with non-null data contribute. The composite is normalized by the sum of available weights at that bar.
- **Each series bases off its own first non-null value** — indexed to 100 at its own start date, not at the first common date.

This approach avoids the problem of truncating all series to the shortest common window. Without it, the composite would start in ~2014 — far too short for detecting the ~66-month structural cycle (which needs at least 2-3 full repetitions).

### Per-Series Scoring Pipeline

Each series goes through:
```
raw data → trim appropriately → 52-week YoY momentum
  → CycleScanner(dType=0, bartelsLimit=49)
  → extract dominant cycle (highest strength, capped at dataLength/3)
  → CRSI tuned to dominant cycle length
  → phase score from avgPhaseStatus + avgPhaseScore (Section 6)
  → CRSI band score from band+direction logic (Section 5)
  → combined_score = 0.5 × phaseScore + 0.5 × crsiBandScore
```

**CycleScanner uses `dtype=0`** (HP filter, lowercase parameter name) to match the WhenToTrade UI application behavior. Using `dtype=9` (no detrending) produces different strength scales and rankings. Note: the parameter must be lowercase `dtype` — the capitalized `dType` form may not be recognized by the API.

**Dominant cycle selection:** Highest strength peak from viable candidates (cycleLength >= 20, cycleLength <= dataLength/3, stabilityScore >= 0.4 or 0). The dataLength/3 cap ensures the CRSI endpoint can compute valid Bollinger-style bands — cycles longer than one-third of the data produce all-NaN bands.

### Component Composite Score

```
component_composite = weighted_average(combined_score(WALCL) × 3,
                                       combined_score(ECB$) × 1,
                                       combined_score(BOJ$) × 1,
                                       combined_score(NFL) × 1,
                                       combined_score(TOTBKCR) × 1,
                                       combined_score(WRESBAL) × 1,
                                       combined_score(COMPOUT) × 1,
                                       combined_score(WRMFNS) × 1)
                    / 10

component_composite = clamp(component_composite, 0, 100)
```

At each bar, only series with valid (non-null) scores contribute, and the denominator is the sum of their weights rather than the full 10.

Where each `combined_score = 0.5 × phaseScore(avgPhaseStatus, avgPhaseScore) + 0.5 × crsiBandScore`.
The phase score uses fixed-point lookup mapping (Section 6). The CRSI band score uses band+direction logic (Section 5).

### Display Score

The headline display score blends the structural cycle with the component composite:

```
structural_score = 0.5 × phaseScore(structural_cycle) + 0.5 × crsiBandScore(structural_cycle)
display_score = 0.8 × structural_score + 0.2 × component_composite
```

The 80/20 blend ensures the ~66-month Howell structural cycle dominates the reading, while individual component cycles provide a 20% modulation reflecting current conditions in each liquidity channel.

Fallback: if structural score unavailable, use component composite. If component composite unavailable, use structural score. If neither available, use raw percentile rank value.

---

## 9. Liquidity Regime Labels

The display score (80% structural + 20% component composite) maps to five regime labels. These thresholds are adjusted for the 80/20 blend, which compresses the score range compared to a pure component average:

| Score Range | Regime | Color | Market Interpretation |
|-------------|--------|-------|----------------------|
| 65-100 | Liquidity Expanding | Green | Global CB expansion confirmed, private credit growing. Risk-on tailwind. Equity cycle lows are high-confidence buying opportunities. |
| 50-64 | Liquidity Supportive | Light Green | Mild liquidity support. Cycles work normally. Favorable for risk assets but not aggressively so. |
| 35-49 | Liquidity Neutral | Yellow | No clear liquidity direction. Cross-currents between series. Rely on other composite layers for direction. |
| 20-34 | Liquidity Tightening | Orange | Drains building, credit slowing. Equity cycle rallies may underperform. Caution with long positions. |
| 0-19 | Liquidity Contracting | Red | Active contraction across major CBs, credit shrinking, reserves draining. Strongest macro headwind. Equity cycle patterns likely overridden. |

### Regime Reasoning (Dashboard Info Overlay)

Each regime label in the dashboard has an (i) icon that opens a full-screen modal explaining the economic reasoning behind the current reading:

| Regime | Reasoning Summary |
|--------|------------------|
| **Expanding** | Global CB balance sheets growing, net Fed liquidity expanding, private credit channels healthy, reserves ample. In Howell's framework, leads asset appreciation by 1-3 months and economic growth by 3-6 months. Most favorable backdrop for risk assets. |
| **Supportive** | Global liquidity growing modestly or stable, credit channels functioning normally, reserves adequate. Supportive but not exceptional — enough to sustain expansion but not drive aggressive risk-on behavior. Key watch is direction: improving toward expansion or plateauing before a turn? |
| **Neutral** | Balanced — neither clearly supportive nor restrictive. Often during transitions: QT pause, TGA rebuilding after debt ceiling, or ECB/BOJ policy shifts. Component series may send mixed signals (e.g., CB balance sheets stable but bank credit tightening). Macro must be driven by fundamentals rather than the liquidity tide. |
| **Tightening** | Net liquidity declining — likely QT, rising drains, or CB balance sheet contraction. Bank credit may be tightening. In Howell's framework, leads economic weakness by 3-6 months. Headwind for risk assets: even if the economy looks fine today, the plumbing is deteriorating beneath the surface. |
| **Contracting** | Broad-based contraction across CBs, bank credit shrinking, reserves approaching scarcity. The regime that breaks markets — 2019 repo crisis (reserve scarcity), 2008 (interbank lending freeze). Severe contraction is the most dangerous backdrop because it can turn economic slowdown into financial crisis. Fed typically responds with emergency facilities, marking the eventual bottom. |

### Per-Series Information Overlays

Each individual liquidity series in the dashboard has an (i) info icon that opens a full-screen modal showing:

1. **Current Status** — Dynamic interpretation of the series' current score, phase, and contribution to the liquidity composite
2. **What It Measures** — Plain-language description (e.g., NFL formula and its components, bank credit as transmission mechanism)
3. **Role in the Composite** — Weight assignment and signal it provides within the 8-series architecture
4. **How to Interpret** — Guidance on reading high vs. low scores in the liquidity context
5. **Timing** — Lead/lag characteristic relative to equity markets and the real economy

### Cycle Projection for Liquidity

The liquidity layer participates in the composite's cycle projection engine, which projects scores forward at +4, +8, and +12 week horizons using sinusoidal cycle models.

**Phase projection** uses the same sinusoidal model as L1-L4: derive the current phase angle from avgPhaseScore + avgPhaseStatus, advance by `2π / cycleLength` per bar (all liquidity series are weekly = 1 bar/week), and compute the projected phase score at each horizon.

**CRSI projection** cannot be modeled sinusoidally (it depends on future data), so the current CRSI band score decays toward neutral (50) over the horizon:
```
projectedCrsi[t] = currentCrsiBandScore + (50 - currentCrsiBandScore) × (t/12) × 0.5
projectedScore[t] = 0.5 × projectedPhaseScore + 0.5 × projectedCrsi
```

#### Structural Cycle Context

The structural cycle (~C285, ~66 months) is detected from the merged 8-series composite and provides the **structural cycle envelope** — the Howell Global Liquidity Cycle that frames whether operational sub-cycles in individual series are counter-trend bounces or genuine regime changes.

The structural cycle's phase determines the regime context:
- **Structural contraction** (structural score < 30): Operational bounces in individual series are counter-trend — they do not signal regime change
- **Structural expansion** (structural score >= 60): Operational dips are pullbacks within a supportive regime
- **Transition** (30-59): Direction uncertain — individual component cycles carry more weight

**Howell's framework:** The ~66-month cycle is the dominant driver of liquidity direction. A 4-6 week operational uptick during structural contraction signals "a brief pause in tightening," not "liquidity improving." The structural context prevents misinterpretation of short-term noise.

### Per-Series Interpretation and Data Sources

Each liquidity series has an economic interpretation and specific data sources for monitoring:

| Series | Improving Fragment | Confirmation Watch |
|--------|-------------------|-------------------|
| **WALCL** | "Fed total assets expanding — gross balance sheet growth providing dollar liquidity globally" | Weekly Fed H.4.1 balance sheet release. Primary structural driver of global liquidity. |
| **ECB** | "ECB balance sheet expanding — euro area CB contributing to global liquidity growth" | Weekly ECB balance sheet data. FX-adjusted to USD — watch EUR/USD for amplification/dampening of USD-denominated impact. |
| **BOJ** | "BOJ balance sheet expanding — Japanese CB adding to global liquidity pool" | Monthly BOJ balance sheet (interpolated to weekly). FX-adjusted to USD — JPY weakness can offset nominal expansion. |
| **NFL** | "Net Fed Liquidity momentum is projected to turn positive — Howell's earliest recovery signal" | Weekly Fed H.4.1 balance sheet, daily ON RRP (NY Fed), daily TGA. NFL = WALCL + SWPT - RRP - TGA. Watch for RRP below $200B and TGA drawdowns. |
| **TOTBKCR** | "Total bank credit is projected to expand — banks beginning to lend more aggressively" | Weekly Fed H.8 bank credit data and quarterly SLOOS for lending standards. |
| **COMPOUT** | "Commercial paper issuance is projected to recover — normalizing short-term funding markets" | Weekly Fed CP outstanding release. Watch for CP market stress alongside money market fund flows. |
| **WRMFNS** | "Retail money market fund flows projected to increase — building cash reserves for deployment" | Weekly ICI money market fund flow data and Fed money stock releases. |
| **WRESBAL** | "Bank reserve balances projected to increase — ensuring ample plumbing in the financial system" | Daily Fed reserve balance data. Watch SOFR and repo rates for funding stress — spikes above Fed funds target signal reserve scarcity. |

#### Interpretation Context

**Howell's timing framework** applies to all liquidity readings:
- Improving liquidity leads equity markets by **~6 weeks** and the real economy by **3-6 months**
- Deteriorating liquidity leads economic weakness by **3-6 months**, with equity markets feeling the impact within **~6 weeks**
- The structural cycle (~C285, detected from the merged composite) provides the regime context: short-term operational improvements during structural contraction are counter-trend bounces, not regime changes

### Regime Transition Signals

Regime changes are more significant than static readings. Watch for:

- **Expanding → Supportive:** Expansion decelerating. Peak liquidity tailwind may be behind. Not yet bearish, but upside momentum fading.
- **Supportive → Neutral:** Transition zone. The market often ignores this shift initially — liquidity support is withdrawing but not yet hurting.
- **Neutral → Tightening:** The critical bearish transition. Historically, this is where equity cycle peaks begin to fail. The Howell ~6-week lead means equities will feel this ~6 weeks after the liquidity score crosses into tightening.
- **Tightening → Contracting:** Deep bearish territory. Maximum risk reduction warranted. Cash and defensive positions outperform.
- **Contracting → Tightening:** First sign of a turn. Contraction decelerating. Not yet bullish, but the worst may be behind.
- **Tightening → Neutral:** Cautious optimism. Liquidity no longer actively draining. The foundation for recovery is forming.
- **Neutral → Supportive:** The bullish transition. Equity cycle lows in this environment are good buying opportunities.
- **Supportive → Expanding:** Full risk-on. Maximum liquidity tailwind. Cyclical dips are buying opportunities with high confidence.

---

## 10. Dashboard Architecture — Single Unified Panel

The liquidity dashboard displays a single unified panel combining all 8 series with the structural cycle.

### Panel Layout

**Top section:**
- Display score: 80% structural cycle score + 20% component composite (Section 8)
- Score breakdown: Composite (weighted average of 8 series) · Struct (structural cycle phase+CRSI) · raw (pctrank)
- Regime label (Expanding/Supportive/Neutral/Tightening/Contracting)
- Score bar
- (i) button with economic reasoning for the current regime

**Chart section:**
- Sine wave of the detected structural cycle (~C285, ~66 months)
- 2 past cycle iterations + 1 projected forward iteration
- Red dot at current position (derived from `minBarNum` average group)
- Date labels at historical and projected peaks/troughs
- Cycle info (length, ~months equivalent)

**Component section:**
- 8 series with individual cycle-based scores (Section 8 pipeline)
- Each shows: label, weight, phase status (bold), cycle length, score (color-coded), YoY %
- (i) detail button for full scoring breakdown (CRSI, bands, phase score, CRSI band score)

### Score Composition

```
structural_score    = 0.5 × phaseScore(structural_cycle) + 0.5 × crsiBandScore(structural_cycle)
component_composite = weighted_average(8 series scores, using series weights, total 10)
display_score       = 0.8 × structural_score + 0.2 × component_composite
```

The 80/20 blend ensures the ~66-month Howell structural cycle dominates the reading, while individual component cycles provide a 20% modulation reflecting current conditions in each liquidity channel.

> **Note:** All 8 series are converted to 52-week YoY momentum before cycle analysis (see Section 3). Cycle lengths shown with 'w' suffix (e.g., C39w) indicate weekly bars. To convert to approximate months: divide by 4.33.

### Title and Reasoning

The dashboard displays **"Global Liquidity Cycle Watch"** with a dynamic reasoning paragraph that synthesizes the structural cycle reading with the component consensus.

The reasoning is **rule-based** (no AI generation) — it selects from pre-written templates based on where the display score falls within its band structure, then interpolates the actual scores, regime label, and component details into the template.

### Structural Cycle Reasoning

The (i) button next to the regime label shows reasoning based on the structural cycle score:

| Score Range | Summary | Key Message |
|---|---|---|
| 0-15 | Early downtrend — most bearish phase | Confirmed turn from peak, structural envelope caps operational bounces |
| 16-35 | Downtrend — bearish, watch for bottom | Progressing through contraction, further in = closer to eventual trough |
| 36-50 | Transition — direction uncertain | Neither expansionary nor contractionary, operational cycles carry more weight |
| 51-70 | Supportive — mid-uptrend or bottoming | Improving or stable, operational dips are pullbacks not regime changes |
| 71-100 | Expansion — most bullish phase | Strongest macro tailwind, cyclical dips are buying opportunities |

### Blended Score Reasoning

The (i) button in the component footer shows reasoning about the 80/20 blend:

| Condition | Summary |
|---|---|
| Structural and components agree (both bullish or both bearish) | Highest conviction — macro tide and plumbing components aligned |
| Structural more bearish than components | Global cycle has turned down but components lag — structural view prevails with time |
| Structural more bullish than components | Global cycle turning up but components lagging — banks may still be tightening despite improving CB liquidity |

### Regime Thresholds

The unified panel uses regime thresholds adjusted for the 80/20 blend with the structural cycle, which compresses the score range:

| Score | Regime Label | Color |
|---|---|---|
| 65-100 | Liquidity Expanding | Green |
| 50-64 | Liquidity Supportive | Light Green |
| 35-49 | Liquidity Neutral | Yellow |
| 20-34 | Liquidity Tightening | Orange |
| 0-19 | Liquidity Contracting | Red |

---

## 11. Data Pipeline Summary

For reference and rebuilding, the complete unified pipeline from raw FRED data to display score:

### Step 1: Fetch All Series and FX Rates

Fetch 8 component series + NFL sub-components + 2 FX rates via GetDatasetSeries (with EnsureCompleteDataset + WaitUntilUpdateCompleted first):

**CB balance sheets:**
- `WALCL-W:FDS` (weekly)
- `ECBASSETSW-W:FDS` (weekly)
- `JPNASSETS-M:FDS` (monthly — interpolated to weekly)

**NFL sub-components:**
- `RRPONTSYD:FDS` (daily — must be downsampled)
- `WTREGEN-W:FDS` (weekly)
- `SWPT-W:FDS` (weekly)

**US credit and reserves:**
- `TOTBKCR-W:FDS`, `COMPOUT-W:FDS`, `WRMFNS-W:FDS`, `WRESBAL-W:FDS`

**FX rates:**
- `DEXUSEU:FDS` — USD per EUR (daily → aligned to Wednesdays)
- `DEXJPUS:FDS` — JPY per USD (daily → aligned to Wednesdays)

**Critical — fetch ALL available history (`maxbars=0`).** Do not truncate at fetch time. RRPONTSYD is a daily series; with a limited fetch (e.g., `maxbars=1000`), only ~4 years of daily data are returned. After downsampling to weekly, this bottlenecks the NFL derivation — far too short for reliable cycle detection. All history trimming is handled downstream where the rationale is data quality, not volume.

### Step 2: Downsample and Align

- Generate a Wednesday date grid from WALCL date range (~1200 Wednesdays from Dec 2002).
- RRPONTSYD (daily): pick Wednesday observation each week (or nearest prior business day).
- Weekly/daily series: for each Wednesday, find nearest observation within +/-5 days.
- Monthly BOJ: linear interpolation between surrounding monthly observations.
- FX rates: align to Wednesday grid.

### Step 3: Derive NFL and FX-Adjust Foreign CBs

```
NFL[t] = WALCL[t] + SWPT[t] - RRPONTSYD[t] - WTREGEN[t]
ECB_USD[t] = ECB_EUR[t] × DEXUSEU[t]
BOJ_USD[t] = BOJ_JPY[t] / DEXJPUS[t]
```

**Critical:** NFL must be trimmed to start from 2014 onward. Before 2013-2014, the Overnight Reverse Repo facility either did not exist or was at zero, creating extreme artifacts in the momentum calculation. COMPOUT and WRMFNS also join from ~2014 when their data becomes meaningful.

### Step 4: Index Each Series

Each series is indexed to 100 at its own first non-null value:
```
indexed[t] = (raw[t] / raw[first_non_null]) × 100
```

This allows series with different start dates to join the composite dynamically.

### Step 5: Compute Weighted Composite Level (Dynamic Weighting)

At each weekly bar, sum the indexed values of all series with non-null data, weighted by their assigned weights, and divide by the sum of available weights:

```
GLC_level[t] = Σ(indexed_i[t] × weight_i) / Σ(weight_i)
               for all i where indexed_i[t] is non-null
```

Core CB series (WALCL, ECB, BOJ) must all have data to start the composite (~December 2002). Other series join when available.

### Step 6: 52-week YoY Momentum

```
momentum[t] = (GLC_level[t] - GLC_level[t-52]) / |GLC_level[t-52]| × 100
```

Consumes 52 weekly bars. ~1200 level bars produce ~1150 momentum bars.

### Step 7: HP Filter Detrend

POST the weekly YoY array to the Detrend endpoint with dtype=0, ret=false. Returns the cyclical component with the low-frequency trend removed. Without this step, shorter cycles dominate the spectrum and the ~66-month structural cycle is not reliably detected.

### Step 8: Howell Pre-Seed + Rolling Percentile Rank (780-week window)

The percentile rank requires a trailing window of historical values. Since our composite starts in late 2003, the first ~780 weeks would rank against an incomplete window.

To solve this, prepend Howell's GLI-MOM data (1975-2003):
a) Calibrate Howell to our HP-detrended scale via linear regression on the overlapping period
b) Convert and expand monthly Howell values to weekly (~1500 bars)
c) Prepend: combined = [howell_weekly(1975-2003), our_hp_weekly(2003+)]
d) Apply rolling percentile rank (780-week window ≈ 180 months)
e) Extract only our portion (2003+) as the final output

The Howell pre-seed is a STATIC reference file (US-GLI-MOM.csv) that does not need updating — once the pctrank window is fully populated with our own data (~780 weeks from late 2003 ≈ mid-2018), the Howell values scroll out.

### Step 9: Structural Cycle Detection (55-85 month band)

Run a dedicated CycleScanner call with restricted range to isolate the Howell structural cycle:
- minCycleLength=238 (55 months × 4.33 weeks/month)
- maxCycleLength=368 (85 months × 4.33 weeks/month)
- dType=0, bartelsLimit=10, dominantPeakFinder=true, useStability=true

Expected result: C285 (~66 months), matching Howell's C67.

### Step 10: Score the Structural Cycle

Run CRSI tuned to the structural cycle length on the pctrank series:
```
structural_score = 0.5 × phaseScore(structural_cycle) + 0.5 × crsiBandScore(structural_cycle)
```

### Step 11: Score Each Component Series

For each of the 8 series (WALCL, ECB$, BOJ$, NFL, TOTBKCR, WRESBAL, COMPOUT, WRMFNS):
- Compute 52-week YoY on the raw weekly component data
- Run CycleScanner(dType=0), select highest-strength peak capped at dataLength/3
- Run CRSI tuned to the dominant cycle
- Compute combined_score = 0.5 × phaseScore + 0.5 × crsiBandScore

**Critical — maximum cycle length for valid CRSI bands:** The CRSI bands require approximately 3 full cycle repetitions. The dominant cycle length must not exceed `dataLength / 3`. Cycles longer than this threshold produce all-NaN band values.

### Step 12: Compute Component Composite

```
component_composite = weighted_average(8 series scores, using series weights)
                    / sum_of_available_weights
```

At each bar, only series with valid (non-null) scores contribute.

### Step 13: Compute Display Score

```
display_score = 0.8 × structural_score + 0.2 × component_composite
```

Fallback: if structural score unavailable, use component composite. If component composite unavailable, use structural score. If neither available, use raw pctrank value.

---

## 12. Structural Cycle Detection and Validation

The unified composite (Section 11) reconstructs Michael Howell's ~65-month Global Liquidity Cycle from the 8-series merged composite. This section covers the structural cycle detection methodology and its validation against Howell's proprietary data.

### Why a Multi-CB Composite Detects the ~66-Month Cycle

The ~65-month cycle that Howell identifies via Fourier analysis on his proprietary Global Liquidity Index (GLI) is a **multi-central-bank phenomenon**. It reflects the aggregate expansion and contraction of the world's major central banks, which operate on different policy timetables. US-only data (NFL) produces an ~87-month structural cycle — longer because the Fed maintains policy stances longer than smaller central banks, and contaminated by US-specific operational patterns (TGA, RRP).

Testing confirmed: when CycleScanner is run on US-only NFL momentum, the ~87-month cycle appears but is **not ranked as dominant** (typically rank=0). When run on the merged 8-series composite at weekly resolution, the **C285 (~66 months)** cycle emerges — matching Howell's C67.

### FX Adjustment Impact

FX adjustment of ECB and BOJ assets to USD is the single largest improvement in correlation with Howell. Converting to USD jumped correlation from 34.6% to 57.1%. This matches Howell's dollar-denominated methodology — global liquidity is measured in the reserve currency.

### Validation Against Howell's GLI-MOM

Tested against Howell's proprietary US GLI-MOM series (612 monthly observations, 1975-2025). Live pipeline result (April 2026):

| Metric | Our Composite (weekly pipeline) | Howell GLI-MOM |
|--------|--------------------------|----------------|
| Structural cycle | **C285 (~66 months)** | **C67 (67 months)** |
| Bartels significance | 88% | 86% (same window) |
| Correlation with Howell | 77.7% | — |
| Phase | Downtrend_Starting | Peaked mid-2025 |
| Weekly bars | ~1163 | — |

The C285 (~66 months) result matches Howell's C67. Both series read the current environment as turning down from a mid-2025 peak, confirming directional agreement.

### Why Each Pipeline Step Matters

- **Weekly resolution** enables faster updates (6 of 8 series update weekly) and better spectral resolution
- **FX adjustment** is the single largest improvement — converting ECB/BOJ to USD jumped correlation from 34.6% to 57.1%
- **Dynamic weighting** preserves the full ~22-year history: core CB series start in ~2002, other series join when available (~2014)
- **HP filter (dType=0)** is essential for cycle detection and must match the WhenToTrade UI configuration. Without it, shorter cycles dominate the spectrum
- **52-week YoY** removes the structural upward trend from the indexed level series, isolating the cyclical component
- **780-week rolling percentile rank** (≈180 months) normalizes to 0-100. The window captures at least two full ~66-month cycles
- **Howell pre-seed** eliminates the warm-up artifact by providing ~1500 calibrated weekly bars of historical context from 1975-2003

### Data Availability

| Series | Ticker | Start | End | Source Freq | Pipeline Freq |
|--------|--------|-------|-----|-------------|---------------|
| WALCL | WALCL-W:FDS | Dec 2002 | current | weekly | weekly |
| ECB | ECBASSETSW-W:FDS | Jan 1999 | current | weekly | weekly |
| BOJ | JPNASSETS-M:FDS | Apr 1998 | current | monthly | interpolated weekly |
| NFL | derived | ~2014 | current | weekly | weekly |
| TOTBKCR | TOTBKCR-W:FDS | Jan 1973 | current | weekly | weekly |
| WRESBAL | WRESBAL-W:FDS | varies | current | weekly | weekly |
| COMPOUT | COMPOUT-W:FDS | ~2001 | current | weekly | weekly (joins ~2014) |
| WRMFNS | WRMFNS-W:FDS | varies | current | weekly | weekly (joins ~2014) |
| DEXUSEU | DEXUSEU:FDS | Jan 1999 | current | daily | aligned weekly |
| DEXJPUS | DEXJPUS:FDS | Jan 1971 | current | daily | aligned weekly |
| Howell GLI-MOM | US-GLI-MOM.csv | Jan 1975 | Dec 2025 | monthly | expanded weekly (pre-seed only) |

WALCL is the binding constraint for the composite start. After 52-week YoY consumption, composite momentum begins approximately December 2003 (~1163 weekly bars to present).

**Note on EnsureCompleteDataset:** The `unixTo` parameter must be set to the current Unix timestamp in seconds (e.g., `Math.floor(Date.now() / 1000)`). Using `unixTo=0` will silently fail to fetch data for international series (ECB, BOJ) that haven't been previously loaded.

---

## 13. Equity Overlay Confluence

When combining the liquidity score with equity cycle timing:

| Equity Cycle Phase | Liquidity Regime | Confidence | Action |
|-------------------|-----------------|------------|--------|
| Cycle LOW | Expanding | HIGHEST | Strong buy — liquidity tailwind supports cycle turn |
| Cycle LOW | Supportive | HIGH | Buy — liquidity supportive of recovery |
| Cycle LOW | Neutral | MODERATE | Cautious buy — no liquidity headwind, but no tailwind |
| Cycle LOW | Tightening | LOW | Caution — liquidity headwind may prevent cycle turn |
| Cycle LOW | Contracting | LOWEST | Avoid — liquidity hostile, cycle low may not hold |
| Cycle TOP | Contracting | HIGHEST | Strong sell/hedge — liquidity confirms cycle peak |
| Cycle TOP | Tightening | HIGH | Sell — liquidity deterioration supports downside |
| Cycle TOP | Neutral | MODERATE | Reduce — no liquidity support to extend the cycle |
| Cycle TOP | Expanding | LOW | Hold — liquidity may extend the cycle despite timing |

**Key principle from Howell:** Liquidity is more likely to be correct about the next 6–12 weeks of market direction than economic indicators. Economic data reflects the past and present; liquidity reflects the future flow of funds.

---

## 13. Narrative Templates

When generating a verbal narrative for the liquidity score:

### Regime-based opening

**Expanding:** "The liquidity environment is firmly expansionary. Fed liquidity momentum is positive and private credit creation is accelerating, providing a strong tailwind for risk assets."

**Supportive:** "Liquidity conditions are supportive but not aggressively so. Fed operations and private credit growth are providing a mild tailwind."

**Neutral:** "The liquidity picture is mixed. Cross-currents between Fed operations and private credit creation leave no clear directional bias from the monetary plumbing."

**Tightening:** "Liquidity conditions are deteriorating. Fed liquidity momentum has turned negative and drains are building, creating headwinds for risk asset prices with an approximate 6-week lead."

**Contracting:** "The liquidity environment is hostile. Fed liquidity is actively contracting, private credit is tightening, and reserve availability is declining. This is the configuration historically associated with meaningful equity drawdowns."

### Component-level signals

Key phase signals to highlight in narratives:

- **Downtrend_Starting on NFL:** "Fed liquidity has just passed its cycle peak and contraction momentum is accelerating — historically the most dangerous phase for equity markets."
- **BOTTOM_Departure on NFL:** "Fed liquidity appears to be turning — the contraction cycle has bottomed and early expansion is underway. This is the signal Howell identifies as the earliest buy signal, approximately 6 weeks before equities respond."
- **TOP_Arrival on bank credit:** "Bank credit expansion is peaking. Lending standards are about to tighten, removing a key support for economic activity."
- **Downtrend_Starting on structural cycle:** "The global ~66-month Howell cycle has confirmed its turn from the peak — structural contraction is underway across major central banks."

---

## 14. Limitations and Open Questions

### Global Liquidity Proxy
Our composite reconstructs Howell's ~65-month cycle from 8 public FRED series — a proxy for his proprietary ~70-CB Global Liquidity Index. The correlation is ~78%, and the structural cycle (C285 ~66 months) matches Howell's C67. The proxy misses smaller central banks and cross-border capital flows that Howell tracks, but captures the dominant oscillation from the three largest CBs plus US private credit channels.

### WRMFNS Interpretation
Rising money market fund balances are ambiguous — they can signal cash sidelined (bearish: money leaving risk assets) or dry powder accumulated (bullish: capital waiting to deploy). The V1 implementation treats rising momentum as directionally positive. A V2 refinement could analyze the rate-of-change direction relative to the equity cycle phase.

### BTFP and Emergency Facilities
Emergency lending facilities (like the 2023 Bank Term Funding Program) are captured within WALCL but not broken out separately. During periods with active facilities, WALCL may overstate structural liquidity. A future enhancement could subtract known facility balances if granular FRED series are available.

### Pre-2014 Data Limitation for NFL, COMPOUT, WRMFNS
The Overnight Reverse Repo facility only became operationally significant in 2013-2014, so NFL data only starts around 2014. COMPOUT and WRMFNS also join from ~2014. The dynamic weighting mechanism handles this by starting the composite from the core CB series (~2002) and adding these series when they become available. The ~22-year composite history is sufficient for structural cycle detection (3+ full repetitions of the ~66-month cycle).

### WALCL Overlap
WALCL appears both directly (weight 3) and inside NFL (weight 1). While this creates overlap, it is intentional — the gross Fed balance sheet and the net liquidity available after drains (RRP, TGA) provide distinct signals. During periods with large RRP absorption or TGA accumulation, WALCL and NFL diverge meaningfully. The overlap means the composite is ~40% Fed-determined (WALCL direct 3/10 + WALCL within NFL ~1/10), which is appropriate given the dollar's reserve currency status.

---

## 15. Implementation Pitfalls (Lessons Learned)

This section documents critical implementation details discovered during cross-validation of the EconomicCycleComposite against the reference LiquidityModel. These are not obvious from the specification alone and caused significant score divergence until fixed.

### Howell Pre-Seed is Non-Optional for Structural Scoring

The specification describes the Howell pre-seed as "optional but important." In practice, **it is effectively required** for the structural score to match the reference. Without pre-seeding, the 780-week pctrank window lacks historical context for its first ~15 years, causing:

1. **Pctrank distribution compression** — Values cluster in a narrow range because the window doesn't contain enough cycle history to spread the distribution
2. **Extremely narrow CRSI Bollinger bands** — e.g., UB=54.0, LB=46.2 (width ~8) vs. expected UB=55.9, LB=47.0 (width ~9) with pre-seed
3. **Wrong phase detection** — The CycleScanner reading these compressed values detected TOP_Departure (score 30) instead of the correct Downtrend_Starting (score 0)
4. **15-20 point structural score error** — Which propagates through the 80% weight into a ~12-16 point display score error (e.g., 45.1 instead of 30.9)

**Fix:** Prepend ~1,388 calibrated weekly bars from Howell's GLI-MOM data (1975-2003). The calibration uses linear regression on the overlap period to scale Howell's values to match our HP-detrended series.

### API Parameter Casing: `dtype` Not `dType`

The Cycle Tools REST API expects **lowercase** `dtype` in query parameters. Using `dType` (capital T) may silently default to a different detrending mode. This affects both CycleScanner and Detrend endpoint calls. Always use: `dtype=0`.

### bartelsLimit Differs Between Structural and Component Paths

The reference implementation (`generate-data.mjs`) uses:
- **Structural CycleScanner:** `bartelsLimit=10` (explicit override for the restricted 238-368 bar band)
- **Component CycleScanner:** `bartelsLimit=49` (the function's default value — no override)

Setting bartelsLimit=10 for component scoring changes which peaks pass the Bartels significance test, selecting different dominant cycles for some series and causing individual score differences.

### Wednesday Alignment Must Use Priority Search, Not Nearest-Neighbor

The date alignment function must search outward from each Wednesday in a specific order:
```
day 0 → day -1 → day +1 → day -2 → day +2 → day -3 → day +3 → day -4 → day +4 → day -5 → day +5
```

**First match wins.** This is NOT the same as "find nearest observation within ±5 days." Nearest-neighbor selects the minimum-distance observation regardless of direction, which can pick a different data point when two observations are equidistant from the Wednesday. The priority search has a slight bias toward earlier dates (minus before plus), matching the reference.

### Null-Preserving Arrays for 52-Week YoY

When computing per-series 52-week YoY momentum, the arrays must preserve their Wednesday-grid-indexed positions. Stripping null entries from the array (to produce a compact array) shifts indices so that `array[i-52]` no longer points to exactly 52 weeks back. This can cause the YoY to compare values from different time periods.

**Correct approach:** Keep nulls in place. When computing `yoy[i] = (data[i] - data[i-52]) / |data[i-52]|`, skip the entry if either value is null, but do NOT remove it from the array. The CycleScanner receives only the non-null momentum values.

### CRSI Band Value Extraction

The reference reads UB/LB from the **last element** of the CRSI output arrays. Walking backward through previous bars to find non-NaN values (a "walkback" approach) can produce slightly different band values (~1-2 point score difference) when the CRSI endpoint returns trailing NaN values for the most recent bars.

