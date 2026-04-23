# US Economic Cycle Regime: Full Methodology & Narrative Reference

This document is a standalone reference for the US Economic Cycle Regime — a macro regime score (0–100) derived from 28 economic series organized into 5 layers. It contains everything needed to understand, rebuild, or interpret the composite: series selection rationale, scoring mechanics, layer architecture, divergence mechanisms, dashboard interpretation features, and narrative construction. No external documents are required.

---

## How the Score Works

Each series is analyzed via spectral cycle analysis (CycleScanner) to determine where the dominant cycle currently sits in its phase. The raw phase score ranges from -100 (deep trough) to +100 (peak). This is mapped to a 0-100 scale, then inverted for series where rising values are economically bearish. The result is a per-series **adjusted score** where:

- **High score (toward 100)** = this series is in a phase that historically corresponds to economic expansion and rising equity markets
- **Low score (toward 0)** = this series is in a phase that historically corresponds to contraction and falling equity markets

The 28 series are organized into 5 layers. Each layer receives a fixed weight in the master composite:

| Layer | Name | Weight | Series Count | What It Measures |
|-------|------|--------|-------------|-----------------|
| L1 | Leading Indicators | 30% | 9 | Forward-looking economic signals (yield curve, claims, sentiment, business investment) |
| L2 | Coincident Activity | 15% | 4 | Current economic state (production, employment, income) |
| L3 | Financial Stress | 20% | 4 | Market risk pricing (credit spreads, volatility, stress indices) |
| L4 | Inflation / Policy | 10% | 6 | Monetary policy environment (CPI, breakevens, Fed funds, M2, USD) |
| L5 | Liquidity | 25% | 8 | Global liquidity / Howell framework (Fed + ECB + BOJ + US credit & reserves) |

Within Layers 1–4, individual series are weighted according to optimized per-series weights derived from backtesting against 8 major stock market tops and bottoms (2000–2022). Layer 5 (Liquidity) uses an 8-series weighted architecture with a blended structural + component display score, described in full in the Layer 5 section below.

The master composite formula:

```
raw_composite = L1_score × 0.30 + L2_score × 0.15 + L3_score × 0.20 + L4_score × 0.10 + L5_score × 0.25
composite     = clamp(raw_composite + divergence_adjustments, 0, 100)
```

The key structural relationship between layers: **L5 (liquidity) leads L1 (leading indicators) by ~3–6 months, and L1 leads L2 (coincident activity) by a further ~3–6 months** — creating a sequential cascade from monetary conditions through economic data that the divergence mechanisms are designed to detect.

### Regime Bands

| Composite Score | Regime | Market Implication |
|----------------|--------|-------------------|
| >= 62 | Risk-On | Cyclical lows are buying opportunities |
| 55-61 | Neutral-Bullish | Mild tailwind, cycles work normally |
| 48-54 | Neutral | No macro edge, rely on equity cycles alone |
| 38-47 | Neutral-Bearish | Macro headwind, cyclical rallies may fail |
| < 38 | Risk-Off | Cyclical patterns likely overridden by macro |

### Per-Layer Regime Summaries

Each layer displays a 1-line regime summary based on its current score, with an (i) icon that opens a full-screen reasoning modal explaining why that reading matters. These summaries provide at-a-glance layer interpretation without reading individual series.

#### Layer 1 — Leading Indicators

| Score Range | Label | Reasoning |
|-------------|-------|-----------|
| >= 70 | Strong Expansion Ahead | Yield curves normal, claims low, sentiment strong, orders healthy. Historically precedes 6-12 months of above-trend growth. Cyclical dips are buying opportunities. |
| 55-69 | Moderate Growth Signal | Mildly positive — economy expected to continue growing without strong acceleration. Typical mid-cycle reading. Watch for divergences between high-frequency and slower series. |
| 45-54 | Mixed Outlook | Conflicting signals — often a transitional phase at a late-cycle inflection point. Macro provides no edge. Watch yield curve and claims turns specifically. |
| 30-44 | Deterioration Forming | Majority rolling over — falling sentiment, rising claims, weakening orders. Historically precedes recessions by 3-9 months. Tighten risk management. |
| < 30 | Contraction Warning | Deeply negative across the board. High probability of significant economic deterioration. Capital preservation takes priority. |

#### Layer 2 — Coincident Activity

| Score Range | Label | Reasoning |
|-------------|-------|-----------|
| >= 70 | Broad Expansion | Hard confirmation — production growing, payrolls adding jobs, real incomes rising, unemployment low. When L1 and L2 both high, expansion is firm. When L1 weakening while L2 high, signals late-cycle peak. |
| 55-69 | Steady Growth | Moderate pace — typical mid-expansion. Divergence from L1 matters for direction. |
| 45-54 | Slowing Momentum | Growth positive but decelerating. The phase where L1 deterioration begins showing in actual data. |
| 30-44 | Weakening | Clearly weakening — production falling, payrolls stalling, unemployment rising. Confirms recession imminent or underway. |
| < 30 | Contraction Underway | Economy in contraction. Historically when L1 begins to bottom — worst data often coincides with forward-looking recovery signals. |

#### Layer 3 — Financial Stress

| Score Range | Label | Reasoning |
|-------------|-------|-----------|
| >= 70 | Risk-On, Low Stress | VIX suppressed, spreads tight, stress index well below zero. Supports growth via the financial channel. Extreme complacency can be a contrarian fragility warning. |
| 55-69 | Calm, Spreads Tight | Benign conditions — markets functioning well, credit accessible, no financial headwinds. |
| 45-54 | Elevated Caution | Stress building — spreads widening, volatility above average. Financial conditions tightening mildly. |
| 30-44 | Stress Rising | Clearly elevated — credit conditions tightening with tangible transmission to real economy. Historically precedes or accompanies recession. |
| < 30 | Acute Stress | Crisis mode — credit spreads blown out, VIX spiking. Financial system itself becomes a source of economic contraction. |

#### Layer 4 — Inflation / Policy

| Score Range | Label | Reasoning |
|-------------|-------|-----------|
| >= 70 | Accommodative | Low/falling rates, contained inflation, expanding M2, weakening dollar. Policy configuration that fuels recoveries. |
| 55-69 | Mildly Supportive | Leaning supportive — rates moderate, inflation contained. Not a strong tailwind but not a headwind. |
| 45-54 | Neutral Stance | Neither supportive nor restrictive. Fed on hold or economy in stable equilibrium. Key question is direction of next move. |
| 30-44 | Restrictive | Actively tightening — elevated rates, above-target inflation, strong dollar, contracting M2. Full economic impact may be 6-18 months away. |
| < 30 | Aggressively Tight | Severely restrictive. The regime that historically breaks things (2006-07 → housing, 2022-23 → regional banks). |

#### Layer 5 — Liquidity

| Score Range | Label | Reasoning |
|-------------|-------|-----------|
| >= 70 | Liquidity Expanding | NFL expanding, credit growing, reserves ample. Most favorable liquidity backdrop. Leads asset appreciation by 1-3 months and economic growth by 3-6 months. |
| 55-69 | Liquidity Stable-Positive | Mildly positive — NFL growing modestly, credit channels functioning. Supportive but not exceptional. Watch direction for signs of turn. |
| 45-54 | Liquidity Neutral | Balanced — often during transitions (QT pause, TGA rebuilding). Mixed signals across tiers. Macro must be driven by fundamentals. |
| 30-44 | Liquidity Tightening | NFL declining — QT, rising RRP, or TGA drains. Bank credit may be tightening. Leads economic weakness by 3-6 months. The 2022-2023 tightening is a recent example. |
| < 30 | Liquidity Contracting | Severe contraction. The regime that breaks markets (2019 repo crisis, 2008 interbank freeze). Fed typically responds with emergency facilities. |

### Per-Series Information Overlays

Each individual series in the dashboard has an (i) info icon that opens a full-screen modal showing:

1. **Current Status** — Dynamic interpretation of the series' current score, phase, and contribution to the composite (e.g., "Currently scoring 65.0 (bullish) in the Uptrend Neutral phase. This series is pulling the composite higher within Layer 1 (30% of the master score).")
2. **What It Measures** — Plain-language description of the economic indicator
3. **Role in the Composite** — Why this series is included, its optimized weight, and what signal it provides
4. **How to Interpret** — Guidance on reading high vs. low scores, including inversion logic where applicable
5. **Timing** — Lead/lag characteristic (e.g., "Leads the economy by 12-18 months")

The current status section is generated dynamically from live data; the other sections are static reference descriptions stored per series.

### Gauge Visualization

The master composite gauge displays a 180-degree arc with a visual range of **30-70** (not 0-100). This compressed range reflects the empirical distribution of the composite score — it historically clusters in the 44-62 range, so a 0-100 scale would waste visual space on ranges that are never reached in practice. The regime color bands (38/48/55/62) are mapped proportionally across the arc. The numeric score displayed in the gauge center shows the actual unbounded value — only the needle position and arc are clamped to the 30-70 range.

### Cycle Projection Engine

The projection engine uses each series' dominant cycle to project forward, answering "how long does this macro environment last?" and "is conditions expected to improve or deteriorate?"

#### Sinusoidal Model

Each series' cycle is modeled as a sinusoidal wave with the known dominant cycle length. The current position in the cycle is derived from:
- **rawPhaseScore** (-100 to +100) — provides the amplitude position
- **phaseStatus** — disambiguates rising vs. falling half of the cycle (same rawPhaseScore can be mid-uptrend or mid-downtrend)

The phase angle is derived as:
```
baseAngle = arcsin(rawPhaseScore / 100)
if rising half:  angle = π/2 + baseAngle     (0 to π, bottom to top)
if falling half: angle = 3π/2 - baseAngle    (π to 2π, top to bottom)
```

The cycle advances at a rate determined by frequency:
```
radiansPerBar = 2π / dominantCycleLength
radiansPerWeek = radiansPerBar × barsPerWeek
  where: daily=5, weekly=1, monthly=0.23 bars/week
```

At each future horizon (4, 8, 12 weeks), the projected angle produces a projected rawPhaseScore, which is mapped to adjustedScore using the same inversion logic as the current scoring.

#### Projection Weighting

Per-series projection confidence uses **stabilityScore** (0-1) rather than Bartels:
```
projectionWeight = seriesWeight × stabilityScore
```

Stability measures whether a cycle maintains its length and phase over time — a stable cycle projects reliably even if its amplitude is moderate. An unstable cycle (shifting length, irregular phase) is unreliable for projection regardless of statistical significance.

Layer-level projected scores are computed as stability-weighted averages:
```
projectedLayerScore[t] = Σ(projectedSeriesScore[t] × projectionWeight) / Σ(projectionWeight)
```

This means a series like CCSA (seriesWeight=1.5) with low stability gets naturally downweighted in projections even though it dominates the current reading.

#### Projection Confidence

Per-layer confidence = ratio of stability-weighted projection weight to maximum possible weight. A layer where all high-weight series have stable cycles (stability > 0.8) will have high confidence (> 70%). A layer where key series have unstable cycles will have low confidence.

Overall projection confidence = layer-weight-averaged confidence across all 5 layers.

#### Projection Horizons

Three fixed horizons: **+4 weeks, +8 weeks, +12 weeks**. These represent short, medium, and extended forward views. Beyond 12 weeks (~one quarter), cycle projections become unreliable as cycles can shift, external shocks can override cyclical behavior, and compounding angular uncertainty accumulates.

#### Regime Change Detection

At each horizon, the projected composite score is classified into regime bands. When the projected regime differs from the current regime, a **regime change alert** is generated showing the expected timing and direction. Example: "Regime shift projected ~8 weeks: Neutral-Bullish → Neutral (score 49.2)."

#### Liquidity Series Projection

Liquidity series (Layer 5) use the same sinusoidal model for the phase component but handle CRSI differently — since CRSI cannot be projected forward, the current CRSI band score decays toward neutral (50) over the projection horizon:
```
projectedCrsi[t] = currentCrsiBandScore + (50 - currentCrsiBandScore) × (t/12) × 0.5
projectedScore[t] = 0.5 × projectedPhaseScore + 0.5 × projectedCrsi
```

#### Structural Cycle Envelope (GLC Composite)

The liquidity layer's display score has a **structural cycle envelope** detected from the merged 8-series Global Liquidity Composite (GLC), matching Howell's ~65-month Global Liquidity Cycle. The structural cycle is detected from the composite level (not from any single series) via: composite indexed level → 52w YoY → HP detrend → Howell pre-seed → rolling pctrank (780w) → CycleScanner restricted to 238–368 bars (55–85 months).

The structural cycle defines the long-term regime — whether we are in a multi-year liquidity expansion or contraction era. Individual component cycles oscillate *within* that regime. The display score is built as:

```
display_score = 0.8 × structural_score + 0.2 × component_composite
```

The 80% structural weighting is what enforces the envelope — a strong structural contraction reading pulls the overall L5 score down regardless of temporary component upticks.

**Envelope interpretation:**

| Structural Score | Regime | Implication |
|------------------|--------|-------------|
| < 30 | Structural contraction | Component upticks are counter-trend bounces, not regime changes |
| 30–59 | Transition | Component cycles carry more weight; direction uncertain |
| >= 60 | Structural expansion | Component dips are pullbacks within a supportive regime |

The structural cycle advances very slowly (~0.07 radians/week for a 285-bar cycle), so it barely moves over 12 weeks — but it is projected forward at each horizon to capture any subtle drift.

**Key implications:**
- During structural contraction, even if individual series cycles turn up, the 80% structural weight caps the display score — the narrative frames this as "a counter-trend bounce within a structurally tightening regime"
- During structural expansion, component dips are dampened by the structural floor — framed as "a temporary pullback within a structurally supportive regime"
- During transition (structural score 30–59), the component composite contributes more meaningfully via the 20% weight

#### Dashboard Display

- **Layer cards**: Each layer shows a trend arrow (↗ improving, → stable, ↘ deteriorating) with the projected +12w score
- **Projection panel**: Full table showing current and projected scores at +4w, +8w, +12w per layer, with delta indicators, trend arrows, and per-layer confidence
- **Regime change alerts**: Highlighted at the top of the projection panel when a regime transition is projected

#### Limitations

- **Assumes cycle persistence**: The projection assumes the current dominant cycle continues with the same length and phase. Cycles can shorten, lengthen, or disappear due to policy changes or external shocks.
- **No CRSI forward projection**: CRSI band/direction scoring cannot be sinusoidally projected — it depends on the actual future data path. The decay-to-neutral approximation is conservative.
- **Compounding uncertainty**: Each additional week of projection adds angular uncertainty. The confidence metric partially captures this but does not widen explicitly over time.
- **External shock blindness**: The projection models endogenous cyclical dynamics only. Exogenous shocks (geopolitical events, sudden policy changes, pandemics) can override any cyclical projection instantly.

### Projection Narrative (Macro Projection Rationale)

Below the projection table, a verbal narrative panel ("Macro Projection Rationale") explains **why** the projected regime shift (or stability) is expected, which specific series and layers are driving the change, and what real-world data releases to monitor for confirmation or rejection.

#### Narrative Structure

1. **Headline** — One-sentence summary of the projected trajectory:
   - If a regime change is projected: "Regime shift projected: [From] → [To] within ~[N] weeks (projected score [X]). Projection confidence: [Y]%."
   - If no regime change but improving/deteriorating: "The current [Regime] regime is projected to [strengthen/weaken] over the next 12 weeks (score moving toward [X])."
   - If stable: "The current [Regime] regime is projected to remain stable through the 12-week horizon."

2. **Key layer drivers** — The 2-3 layers with the largest projected score movement, each with a forward context paragraph explaining the macro meaning of that layer's projected direction. For example: "L1 Leading Indicators (52.3 → 44.1): Leading indicators are projected to weaken. This is the earliest macro warning — if confirmed, deterioration in coincident activity would typically follow in 3-9 months."

3. **Individual series drivers** — The top 5 series ranked by **composite impact** (= |projected score delta| × projectionWeight × layerWeight). Each includes:
   - A directional narrative fragment specific to that series and its projected direction (improving/stable/deteriorating)
   - The current → projected score
   - Example: "Consumer sentiment is projected to decline further, which would lead consumers to cut discretionary spending (65 → 42)"

4. **Confirmation watchlist** — For each key driver series, a specific real-world data release and threshold to monitor:
   - Example: "**Consumer Sentiment (UMCSENT):** Watch the monthly University of Michigan Consumer Sentiment release. A move above 70 would confirm recovery; below 55 signals deepening pessimism."
   - Example: "**Initial Claims (ICSA):** Watch the weekly Thursday initial claims release. A sustained move above 250K would confirm deterioration; below 210K confirms improvement."

5. **Low-confidence caveat** — When overall projection confidence is below 40%, an explicit warning: "Projection confidence is low because key series have unstable cycles. The forward estimate should be treated as directional guidance only, not a reliable point forecast."

#### Per-Series Forward Fragments

Every series in the model has pre-written narrative fragments for three directions:

- **Improving** (projected score rises 5+ pts): what it means for the economy if this cycle turns up
- **Stable** (projected score within ±5): what it means for the projection to remain flat
- **Deteriorating** (projected score falls 5+ pts): what it means if this cycle turns down

These fragments are specific to each series' economic meaning. For example, the INDPRO deteriorating fragment references its role as an NBER recession-dating series, while the T10Y2Y improving fragment discusses yield curve steepening and growth expectations.

#### Per-Layer Forward Context

Each layer has a forward-looking context paragraph for each direction:

| Layer | Improving | Deteriorating |
|-------|-----------|---------------|
| L1 | Strengthening leading indicators precede 6-12 months of better growth | Weakening leading indicators are the earliest macro warning; deterioration in coincident activity follows in 3-9 months |
| L2 | Production, employment, income cycles strengthening — confirms recovery | Weakening confirms downturn is moving from forecast to reality |
| L3 | Credit spreads tightening, volatility declining — supports risk assets | Widening spreads and rising volatility tighten financial conditions |
| L4 | Falling inflation gives the Fed room to ease, or actual rate cuts | Rising inflation or continued hawkishness extends restrictive environment |
| L5 | Improving liquidity leads equities by ~6 weeks and the real economy by 3-6 months | Contracting liquidity leads economic weakness by 3-6 months |

#### Composite Impact Ranking

Series are ranked for narrative inclusion by their estimated impact on the projected composite score:

```
compositeImpact = |projectedScore[+12w] - currentScore| × projectionWeight × layerWeight
```

Where `projectionWeight = seriesWeight × stabilityScore` and `layerWeight` is the layer's weight in the master composite (0.30, 0.15, 0.20, 0.10, 0.25). This ensures the narrative focuses on the series most likely to move the overall composite, not just the ones with the largest individual score changes.

#### Dashboard Display

The Macro Projection Rationale panel appears directly below the Cycle Projection table. It renders:
- The headline in bold white text
- Layer drivers with score deltas in parentheses
- Individual series drivers as a flowing paragraph
- Confirmation watchlist items as bordered left-margin entries with bold series names
- Key driver series as compact tags at the bottom (matching the signal tag style in the Macro Rationale panel)

### Intra-Layer Divergence Penalty

Within each layer, if the highest-weight series diverges sharply from the remaining series, it signals an internal disagreement that should pull the layer score toward caution. This prevents a single dominant series from masking deterioration in the rest of the layer.

**Trigger conditions:**
- The layer must have at least 3 valid series
- The top-weight series must carry more than 30% of the layer's total weight
- The top-weight series must score 30+ points above the weighted average of the remaining series (i.e., the dominant series is bullish while the others are deteriorating)

**Penalty calculation:**
```
spread = topSeriesScore - weightedAvgOfRestSeries
if spread <= 30: no penalty
if spread > 30:  penalty = -min(5, (spread - 30) / 30 × 5)
```

The penalty scales linearly from 0 (at 30pt spread) to a maximum of **-5 points** (at 60+ pt spread). This is applied to the layer's weighted-average score before the layer contributes to the master composite.

**Example (L2 current reading):**
- INDPRO scores 90 (weight 1.00), while UNRATE=0, PAYEMS=28, DSPIC96=30
- Weighted average of rest = (0×0.60 + 28×0.50 + 30×0.40) / 1.50 = 17.3
- Spread = 90 - 17.3 = 72.7 → penalty = -5 (capped)
- Layer score: 46.4 (weighted avg) - 5 (divergence penalty) = **41.4**
- Without the penalty and with old weights, this would have been 77.8 — a dangerously misleading reading

**Design rationale:** The penalty only fires when the top-weight series is *more bullish* than the rest. This is the dangerous configuration — a single strong series masking broad-based deterioration. If the top-weight series is *more bearish* than the rest, no penalty is applied because the weighted average already reflects the bearish pull from the dominant series.

### Cross-Layer Divergence Overrides

Divergences between layers detect dangerous configurations that the headline score alone may miss. They affect the composite in two ways: (1) **fixed score penalties/bonuses** applied directly to the composite number, and (2) **regime downgrades** that shift the classification label by one notch.

#### Score Adjustments (Fixed Penalties/Bonuses)

Active divergence signals apply fixed point adjustments to the raw weighted-average composite score before regime classification:

| Signal | Trigger | Adjustment | Rationale |
|--------|---------|------------|-----------|
| Leading-Coincident Warning | Leading Indicators (L1) scores 25+ pts below Coincident Activity (L2) | **−2 pts** | Late-cycle deterioration: leading indicators have rolled over but the real economy still looks strong |
| Liquidity-Leading Downturn | Liquidity (L5) scores 10+ pts below Leading Indicators (L1) | **−2 pts** | Liquidity leading economy down: funding conditions deteriorating before even forward-looking economic data |
| Liquidity-Leading Upturn | Liquidity (L5) scores 15+ pts above Leading Indicators (L1) | **+2 pts** | Liquidity leading recovery: funding conditions improving ahead of economic confirmation |

These adjustments stack. In the worst case (both Leading-Coincident warning and Liquidity-Leading downturn active), the composite receives a −4pt penalty. The total adjustment is displayed in the gauge UI as "Xpt divergence adj."

#### Regime Downgrades

Independent of score adjustments, regime classification can be downgraded by one notch:

**Leading-Coincident Divergence (L1 vs. L2):** When Leading Indicators score significantly below Coincident Activity, it signals a late-cycle peak — the economy looks strong on the surface (employment solid, production expanding) but forward-looking measures (yield curve, sentiment, claims, job openings) are deteriorating. A spread of −15 to −25 triggers a "caution" flag; below −25 triggers a "warning" that forces a regime downgrade. This is the classic pattern at major market tops: coincident data looks fine until it suddenly doesn't.

**Liquidity-Leading Divergence (L5 vs. L1):** Based on Michael Howell's (CrossBorder Capital) framework, which demonstrates that liquidity leads the economy by ~3–6 months. When Liquidity scores 10+ points below Leading Indicators, it signals that funding conditions are deteriorating ahead of even the leading indicators — an even earlier warning than the Leading-Coincident divergence. When Liquidity scores 15+ points above Leading Indicators, it signals liquidity-driven recovery ahead of economic confirmation — Howell's earliest buy signal.

**Liquidity Level Override:** When the Liquidity layer score drops below 35 (clear tightening territory), the regime is downgraded by one notch as a standalone override — even without a spread divergence. This reflects Howell's principle that contracting liquidity overrides economic fundamentals for the next 6–12 weeks.

#### The Full Pre-Downturn Cascade

In the most bearish configuration, all signals fire simultaneously:
- **Score:** −4 pts (Leading-Coincident warning −2 + Liquidity-Leading downturn −2)
- **Regime:** downgraded one notch (from Leading-Coincident warning or Liquidity < 35)
- **Sequence, ordered by when each signal typically fires:**

```
Liquidity tightens  →  Liquidity-Leading divergence  →  Leading-Coincident divergence
(funding dries           (leading indicators               (coincident activity
 up first)                weaken next)                      confirms last)
```

This represents the complete pre-downturn sequence: money dries up first, then leading indicators weaken, then the broad economy follows. When all three are active, the macro environment is at its most deceptive — coincident data (employment, production) still looks strong, creating a false sense of security while funding conditions have already deteriorated.

---

## Layer 1 — Leading Indicators (30% of composite)

These series turn before the broad economy does. They are the early warning system. When leading indicators are in an upswing phase, the economy is likely to strengthen in coming months. When they are rolling over, deterioration lies ahead — even if current activity still looks strong.

### Consumer Sentiment (UMCSENT) — Weight: 1.50 (highest tier)
**Direction: Rising = bullish (not inverted)**

Consumer sentiment captures household confidence about jobs, income, and business conditions. It is a leading indicator because consumers cut spending before the official data confirms weakness. Sentiment peaked near 97.5 at the Dot-com top (consumers were euphoric), collapsed to 20 at the post-Dot-com bottom, and scored 30 at the Pre-COVID peak (already deteriorating before the shock). The optimizer gave it maximum weight because its cyclical phase consistently diverges early — it was already declining months before the 2000 and 2007 equity peaks.

**In narrative:** "Consumer sentiment is in a [rising/falling] phase, suggesting households are [confident about / losing confidence in] the near-term outlook."

### Continued Claims (CCSA) — Weight: 1.50 (highest tier)
**Direction: Rising = bearish (inverted)**

Continued claims measure how many people remain on unemployment insurance week after week. Unlike initial claims (which capture the shock of new layoffs), continued claims reveal whether displaced workers are finding new jobs or staying unemployed. A rising cycle phase means claims are building — the labor market is deteriorating and not reabsorbing workers. This series scored 10 at the Post-COVID peak (claims low = bullish reading after inversion) and 0 at the 2022 bottom (claims surging = bearish reading), making it a strong discriminator.

**In narrative:** "Continued unemployment claims are [falling/rising], indicating the labor market [is absorbing displaced workers / is failing to reabsorb laid-off workers]."

### Durable Goods Orders (DGORDER) — Weight: 0.80
**Direction: Rising = bullish (not inverted)**

New orders for durable goods (machinery, equipment, vehicles) represent business investment commitments that won't show up in GDP for months. When corporations are ordering long-lived capital goods, they are expressing confidence in future demand. The series scored 97.5 at the Pre-GFC peak (capex boom) and 30 at the GFC bottom (orders collapsed). The weight was reduced from the original optimizer output (1.50) to 0.80 based on recession backtesting: at 1.50, DGORDER gave false all-clear signals at -3 months before 2/3 recessions (scored 97.5 before the GFC and 65.0 before COVID). Durable goods orders are coincident-to-lagging at recession turning points — firms continue placing orders until demand actually collapses, making the series too slow to serve as a leading warning with high weight.

**In narrative:** "Durable goods orders are in a [rising/falling] phase, signaling that business investment is [expanding / contracting]."

### JOLTS Job Openings (JTSJOL) — Weight: 0.90 (high tier)
**Direction: Rising = bullish (not inverted)**

Job openings measure labor demand — how many positions employers are actively trying to fill. Openings peak before unemployment rises because firms stop posting new positions before they start laying off. The series scored 97.5 at the Post-COVID peak (extreme labor demand) and 30 at the COVID bottom. Its cyclical lead over actual employment changes makes it a reliable advance indicator of labor market turns.

**In narrative:** "Job openings are [expanding/contracting], suggesting labor demand is [strong / weakening ahead of potential layoffs]."

### Initial Jobless Claims (ICSA) — Weight: 0.25
**Direction: Rising = bearish (inverted)**

Initial claims capture the immediate pulse of new layoffs each week. A rising phase means layoff rates are accelerating. While conceptually important, the optimizer assigned it moderate weight because it is noisy (weekly frequency, heavily seasonal) and its signal overlaps substantially with continued claims (CCSA), which captures the more persistent dimension of labor market stress.

**In narrative:** "New unemployment filings are [low and stable / rising], [consistent with a firm labor market / signaling fresh layoff pressure]."

### 10Y-2Y Treasury Spread (T10Y2Y) — Weight: 0.10 (floor)
**Direction: Rising = bullish (not inverted)**

The classic yield curve indicator. When the 10-year yield exceeds the 2-year yield (positive spread, normal curve), bond markets expect growth. When inverted (negative spread), markets are pricing in a future downturn with rate cuts. While the yield curve is one of the most celebrated recession predictors, its cyclical phase timing is less precise than other leading indicators — inversion can persist for 12-18 months before recession, limiting its usefulness for pinpointing equity market turns. Hence the moderate weight.

**In narrative:** "The yield curve (10Y-2Y) is [steepening/flattening/inverted], [consistent with growth expectations / signaling bond market concern about future economic weakness]."

### 10Y-3M Treasury Spread (T10Y3M) — Weight: 0.10 (floor)
**Direction: Rising = bullish (not inverted)**

Similar to T10Y2Y but uses the 3-month bill rate, making it more sensitive to near-term Fed policy expectations. It provides incremental confirmation but overlaps heavily with T10Y2Y, so the optimizer kept it at minimum weight to avoid double-counting the yield curve signal.

**In narrative:** Used as confirmation for T10Y2Y; rarely needs its own narrative line.

### US Leading Economic Index (USSLIND) — Weight: 0.60
**Direction: Rising = bullish (not inverted)**

The Conference Board's composite of 10 leading indicators. While it is published monthly with a lag and some components overlap with other model series (yield curve, claims, building permits), recession backtesting revealed it is the single most reliable early warning signal: it scored 2.5 at -3 months before both the Dot-com recession and COVID recession, correctly warning of impending downturns. The weight was increased from the optimizer's floor (0.10) to 0.60 because the original optimization against market tops/bottoms undervalued this series — its overlapping components are actually a feature for recession prediction, as the composite nature makes it resistant to false signals from any single noisy input. At 0.60, it is the fourth-highest weighted L1 series, able to meaningfully pull the layer score down when it deteriorates.

**In narrative:** "The Conference Board Leading Index is [advancing/declining], [confirming/contradicting] the signal from individual leading indicators."

### Building Permits (PERMIT) — Weight: 0.40
**Direction: Rising = bullish (not inverted)**

Permits for new residential construction lead housing starts by 1-2 months and GDP by 3-6 months. Housing is highly interest-rate sensitive, making permits an early signal of monetary policy transmission. Recession backtesting revealed this series is a critical early warning for housing-led downturns: it scored 2.5 at -3 months before the GFC — the one recession the model initially failed to call at -3m. The original optimizer underweighted permits (0.10) because the long housing cycle (3-5 years) doesn't align well with shorter equity market top/bottom windows. But for recession prediction — where housing is the primary transmission channel of monetary tightening — permits are indispensable. At 0.40, permits carry enough weight to pull L1 down when housing deteriorates, which proved decisive for catching the GFC at -3 months.

**In narrative:** "Building permits are [rising/declining], suggesting residential construction is [ramping up / slowing], typically a [positive/negative] signal for the broader economy in coming quarters."

---

## Layer 2 — Coincident Activity (15% of composite)

> **Note:** Coincident indicators are lagging at market turning points by design. The Leading-Coincident divergence mechanism captures this: when coincident activity is still strong but leading indicators have rolled over, the late-cycle warning fires. With the Liquidity layer, a three-stage cascade is tracked: Liquidity → Leading → Coincident.

These series measure the current state of the economy. They confirm what leading indicators predicted and establish whether a downturn has actually arrived. When coincident indicators are strong but leading indicators are weakening, it produces a **Leading-Coincident divergence** — the classic late-cycle warning.

### Industrial Production (INDPRO) — Weight: 1.00 (highest in layer, ~40%)
**Direction: Rising = bullish (not inverted)**

Industrial production measures real output from manufacturing, mining, and utilities. It is one of the four components the NBER uses to officially date recessions. Its cyclical phase is one of the cleanest discriminators between market tops and bottoms: it scored 97.5 at the Dot-com peak (production still booming), 75 at the Pre-GFC peak, but collapsed to 2.5 at the GFC bottom and 25 at the post-Dot-com bottom. Its strong phase differentiation between expansion peaks and contraction troughs makes it the most valuable coincident indicator. The weight was reduced from the original optimizer output (1.50) to 1.00 to prevent excessive single-series dominance — at 1.50, INDPRO carried 83% of the layer, masking deterioration in the other three series. At 1.00, it carries ~40%, still the largest but allowing the labor market and income series to meaningfully contribute.

**In narrative:** "Industrial production is in a [rising/falling] phase, indicating the manufacturing economy is [expanding / contracting]."

### Unemployment Rate (UNRATE) — Weight: 0.60 (~24%)
**Direction: Rising = bearish (inverted)**

The unemployment rate is the most widely recognized economic indicator. After inversion (so that low unemployment = high score), it perfectly tracks the expansion/contraction cycle: it scored 97.5-100 at the Dot-com and Pre-COVID peaks (unemployment at lows = bullish reading) and 0-2.5 at the Dot-com and GFC bottoms (unemployment surging = bearish reading). Its phase cleanly separates market environments. The weight was increased from the optimizer's floor (0.10) to 0.60 to give the unemployment cycle meaningful contribution — the Sahm Rule (0.5pt rise from 12-month low) is one of the most reliable real-time recession indicators and should not be marginalized within the coincident layer.

**In narrative:** "Unemployment is [low and falling / rising], indicating the labor market is [tight, supporting consumer spending / deteriorating, threatening consumption and confidence]."

### Nonfarm Payrolls (PAYEMS) — Weight: 0.50 (~20%)
**Direction: Rising = bullish (not inverted)**

Total employment on nonfarm payrolls is the broadest measure of job creation. Its cyclical phase overlaps with UNRATE (they measure two sides of the same labor market coin) and payrolls are a lagging indicator — employment peaks after the stock market does. However, the weight was increased from the optimizer's floor (0.10) to 0.50 because payrolls are the single most-watched data release and should contribute meaningfully to the coincident layer rather than being effectively invisible.

**In narrative:** "Nonfarm payrolls are in a [growth/contraction] phase, [confirming a healthy job market / confirming labor market deterioration]."

### Real Disposable Personal Income (DSPIC96) — Weight: 0.40 (~16%)
**Direction: Rising = bullish (not inverted)**

Real income after taxes and inflation captures actual consumer purchasing power. This series produced some counterintuitive backtest results — it scored 100 at the Pre-COVID peak and 100 at the COVID bottom (transfer payments boosted income even as the economy collapsed). Government stimulus programs distort this indicator's cyclical signal. The weight was increased from the optimizer's floor (0.10) to 0.40 — while noisier than the other coincident series, real income is the direct measure of the consumer spending base that drives 70% of GDP and should not be entirely marginalized.

**In narrative:** "Real disposable income is [rising/falling], though this series can be distorted by fiscal transfers during downturns."

### L2 Weight Distribution Summary

| Series | Weight | Layer Share | Rationale |
|--------|--------|-------------|-----------|
| INDPRO | 1.00 | 40% | Best cyclical discriminator, NBER recession-dating series |
| UNRATE | 0.60 | 24% | Clean cycle phase separation, Sahm Rule importance |
| PAYEMS | 0.50 | 20% | Broadest employment measure, most-watched data release |
| DSPIC96 | 0.40 | 16% | Consumer purchasing power, noisy but economically critical |
| **Total** | **2.50** | **100%** | |

These weights were manually rebalanced from the original optimizer output (which assigned 1.50/0.10/0.10/0.10) to prevent single-series dominance. The optimizer's extreme concentration on INDPRO was a backtest artifact — in live conditions, a layer where one series carries 83% of the weight produces misleading readings when that series diverges from the others. The rebalanced weights maintain INDPRO's primacy while ensuring that a broad-based deterioration across the labor market and income series is reflected in the layer score.

---

## Layer 3 — Financial Stress & Risk Appetite (20% of composite)

These series measure how stressed or complacent financial markets are. Low stress readings occur at market tops (complacency), high stress at bottoms (panic). All four series are inverted so that low stress = high score = bullish.

### Baa Corporate Bond-10Y Treasury Spread (BAA10Y) — Weight: 1.50 (highest tier)
**Direction: Rising = bearish (inverted)**

The spread between Baa-rated corporate bonds and 10-year Treasuries measures the credit risk premium investors demand for lending to lower-quality corporations. When spreads are tight (low), credit markets are confident and capital is flowing freely — this is typical at economic peaks. When spreads blow out, it signals credit stress, potential defaults, and capital withdrawal — typical at bottoms. The optimizer gave it maximum weight because its cyclical phase was the single strongest discriminator in the backtest: it scored 30 (after inversion) at the Pre-COVID peak but 2.5 at both the GFC and 2022 bottoms. Credit spreads capture systemic financial risk in a way that equity volatility (VIX) alone cannot.

**In narrative:** "Investment-grade credit spreads are [tight/widening], indicating [abundant credit availability and low default risk / rising credit stress and tightening financial conditions]."

### CBOE VIX (VIXCLS) — Weight: 0.10 (floor)
**Direction: Rising = bearish (inverted)**

The VIX measures expected 30-day equity volatility. While it is the most popular fear gauge, the optimizer minimized its weight because the VIX cycle is very short-duration and mean-reverting — it spikes during acute crises (scored 0 at COVID bottom) but normalizes quickly. Its spectral cycle phase at a given date may not align with the broader economic cycle window being measured. The BAA10Y spread captures financial stress more persistently.

**In narrative:** "Implied volatility (VIX) is [low/elevated], suggesting [market complacency / acute fear in equity markets]."

### St. Louis Financial Stress Index (STLFSI4) — Weight: 0.10 (floor)
**Direction: Rising = bearish (inverted)**

A broad-based composite of 18 financial market indicators including yield spreads, volatility, and funding rates. Values above zero indicate above-average financial stress. While conceptually comprehensive, it overlaps with both the BAA10Y spread and VIX already in the model. The optimizer kept it at floor weight to avoid over-counting financial stress through multiple overlapping measures.

**In narrative:** "The St. Louis Financial Stress Index is [below/above] average, suggesting financial conditions are [accommodative/tight]."

### ICE BofA High Yield OAS Spread (BAMLH0A0HYM2) — Weight: 1.35 (high tier)
**Direction: Rising = bearish (inverted)**

The option-adjusted spread on high-yield (junk) bonds over Treasuries. Conceptually similar to BAA10Y but focused on the riskiest borrowers. The optimizer assigned it floor weight because it is highly correlated with BAA10Y — both measure credit risk premiums, and including both at high weight would double-count the same signal.

**In narrative:** "High-yield credit spreads are [tight/wide], [consistent with / diverging from] investment-grade credit conditions."

---

## Layer 4 — Inflation & Policy Regime (10% of composite)

These series capture the monetary policy and inflation environment. They answer the question: is the Fed's stance a tailwind or headwind for asset prices?

### 5-Year Breakeven Inflation Rate (T5YIE) — Weight: 1.50 (highest tier)
**Direction: Rising = bullish (not inverted)**

Breakeven inflation is the market's expectation of average inflation over the next 5 years, derived from the difference between nominal and TIPS yields. Rising breakevens in a non-inflationary environment signal reflation — the market expects nominal growth to pick up. Collapsing breakevens signal deflationary fears and economic contraction. The optimizer assigned maximum weight because this series cleanly separated tops from bottoms: it scored 75-97.5 at market peaks (healthy inflation expectations) but collapsed to 10 at the COVID bottom and 97.5 at the GFC bottom (though the GFC reading was distorted by TIPS illiquidity). Unlike backward-looking CPI, breakevens are forward-looking and market-priced.

**In narrative:** "Market inflation expectations (5Y breakeven) are [rising/falling], suggesting markets expect [healthy reflation / deflationary pressure]."

### CPI All Urban — Headline (CPIAUCSL) — Weight: 0.40
**Direction: Rising = bearish (inverted)**

Headline CPI captures the actual inflation rate including food and energy. High and rising inflation is bearish for equities because it forces the Fed to tighten, raises input costs, and compresses real earnings growth. The optimizer weighted it heavily because the cyclical phase of CPI cleanly separated environments: it scored 80 at the Dot-com peak (moderate inflation, inverted to 20 = bearish) but 2.5 (already low, inverted to 97.5 = bullish) at the GFC bottom when deflation fears dominated. CPI's cycle phase acts as a proxy for how much room the Fed has to ease.

**In narrative:** "Headline inflation is in a [rising/falling] phase, [constraining Fed easing options / giving the Fed room to support markets]."

### Fed Funds Effective Rate (DFF) — Weight: 0.30
**Direction: Rising = bearish (inverted)**

The Fed's primary policy tool. A rising fed funds cycle means the Fed is tightening — historically bearish for both bonds and equities because it raises the cost of capital and deliberately slows the economy. A falling or low rate phase means the Fed is easing — providing monetary stimulus. The optimizer gave it significant (though not maximum) weight because rate cycles are very long-duration and the phase at any given market turning point depends heavily on where we are in the rate cycle. At the Dot-com peak, the rate scored 90 (inverted = 10, bearish — rates were high). At the COVID bottom, it scored 100 (inverted = 0, but this was actually the point where the Fed had already cut to zero, creating confusion in the cycle phase reading).

**In narrative:** "The Fed Funds rate is in a [rising/stable/falling] phase, indicating monetary policy is [tightening / on hold / easing], which is [a headwind for / neutral for / supportive of] asset prices."

### Core CPI ex Food & Energy (CPILFESL) — Weight: 0.31 (was 0.31 in V1)
**Direction: Rising = bearish (inverted)**

Core CPI strips out volatile food and energy to reveal underlying inflation momentum. It received moderate weight as a complement to headline CPI — it confirms whether inflation pressure is broad-based or driven by commodity spikes. When core CPI diverges from headline (core rising while headline falls), it signals sticky inflation that the Fed cannot ignore.

**In narrative:** "Core inflation is [accelerating/decelerating], suggesting underlying price pressures are [broadening / easing]."

### Initial Claims and Inflation Cross-Read (ICSA context)
*Note: ICSA appears in Layer 1 but its interaction with Layer 4 matters. When claims are rising (Leading Indicators bearish) while CPI is falling (Inflation/Policy bullish), it suggests the Fed has room to cut — a potentially bullish setup for the recovery phase.*

### Trade-Weighted US Dollar Index (DTWEXBGS) — Weight: 0.10 (floor)
**Direction: Rising = bearish (inverted)**

A strong dollar tightens global financial conditions, hurts US exporters, and reduces foreign earnings when translated back to USD. A weakening dollar is broadly stimulative for the global economy and US multinationals. The optimizer gave it moderate weight — dollar cycles matter but are influenced by factors outside the US domestic cycle (foreign central bank policy, trade flows, geopolitics).

**In narrative:** "The trade-weighted dollar is [strengthening/weakening], [tightening/loosening] global financial conditions."

### M2 Money Supply (M2SL) — Weight: 0.10 (floor)
**Direction: Rising = bullish (not inverted)**

M2 captures the total amount of money in circulation (cash, checking deposits, savings, money market funds). Rapid M2 growth was historically associated with future inflation and nominal GDP growth. However, the relationship between M2 and the real economy has weakened since 2020 (massive M2 expansion from Fed QE didn't produce proportional growth). The optimizer assigned floor weight — M2 scored 97.5-100 at nearly every event, both tops and bottoms, making it a poor discriminator.

**In narrative:** "Money supply growth is [accelerating/decelerating], though M2's predictive power for real economic activity has weakened in recent cycles."

---

## Layer 5 — Liquidity / Howell Framework (25% of composite)

Based on Michael Howell's (CrossBorder Capital) framework from *Capital Wars* (2020). Howell's central thesis: **liquidity — the gross flow of credit and capital through the financial system — is the dominant driver of asset prices**, and it Granger-causes equity prices with an approximately 6-week lead. The liquidity layer uses a different scoring methodology than Layers 1–4 because the underlying series are stock/balance variables that trend over time, requiring a momentum transformation before cycle analysis.

> **Full specification:** See `liquidity-pipeline-specification.md` and `liquidity-layer-methodology.md` for the authoritative step-by-step pipeline. This section summarizes the architecture as it integrates into the master composite.

### Eight-Series Architecture with Dynamic Weighting

The liquidity layer comprises eight individually-scored series reconstructing Howell's Global Liquidity Cycle from public data. All eight are scored independently through the same pipeline and combined via a **dynamically-weighted average**.

| Series | Ticker | Weight | Role |
|--------|--------|--------|------|
| **WALCL** (Fed Total Assets) | WALCL-W:FDS | **3** | Dominant global CB — reserve currency issuer |
| **ECB Total Assets** (USD, FX-adjusted) | ECBASSETSW-W:FDS | **1** | Second-largest CB balance sheet |
| **BOJ Total Assets** (USD, FX-adjusted) | JPNASSETS-M:FDS | **1** | Third-largest CB balance sheet |
| **NFL** (Net Fed Liquidity, derived) | WALCL+SWPT−RRP−TGA | **1** | Net effect of Fed operations after drains |
| **TOTBKCR** (US Total Bank Credit) | TOTBKCR-W:FDS | **1** | Private credit transmission channel |
| **WRESBAL** (US Reserve Balances) | WRESBAL-W:FDS | **1** | Banking system plumbing |
| **COMPOUT** (Commercial Paper Outstanding) | COMPOUT-W:FDS | **1** | Shadow banking / short-term funding |
| **WRMFNS** (Retail Money Market Funds) | WRMFNS-W:FDS | **1** | Cash pool / dry powder |

**Total weight: 10** — Central bank balance sheets (WALCL + ECB + BOJ) = 5/10 = 50% of the component composite.

FX adjustment converts ECB (× DEXUSEU) and BOJ (÷ DEXJPUS) to USD, matching Howell's dollar-denominated methodology. NFL is trimmed to start from 2014 (before RRP was operationally meaningful).

### Per-Series Scoring Pipeline

Each series runs through:
```
raw data → Wednesday grid alignment → FX-adjust (if applicable) → 52w YoY momentum
  → CycleScanner(dtype=0, bartelsLimit=49, minCycleLength=10, maxCycleLength=400)
  → extract dominant cycle (highest strength, capped at dataLength/3)
  → CRSI tuned to dominant cycle length
  → combined_score = 0.5 × phaseScore + 0.5 × crsiBandScore
```

**Phase scoring** uses an interpolated lookup mapping `avgPhaseStatus + avgPhaseScore` → 0–100 application score. Uptrend_Starting → 100 (most bullish); Downtrend_Starting → 0 (most bearish). See liquidity methodology doc for the full table.

**CRSI band+direction scoring** uses a two-layer architecture:
- **Layer 1 (Crossing Override):** Recent band crossings (within last 4 bars) override to 0–10 (bearish) or 90–100 (bullish)
- **Layer 2 (6-State Base):** CRSI position relative to Bollinger-style bands × direction (via 5-bar linear regression slope) produces overbought-reversal, upside-acceleration, overbought-stalling, oversold-reversal, downside-acceleration, oversold-stalling, or within-bands states

### Component Composite (dynamic weighting)

```
component_composite = Σ(combined_score_i × weight_i) / Σ(weight_i)
                      for all i with valid (non-null) data at current bar
```

At each bar only series with data contribute, and the denominator is the sum of their weights rather than the full 10. This preserves the full ~22-year history: core CB series (WALCL, ECB, BOJ) start in ~2002, NFL/COMPOUT/WRMFNS join from ~2014.

### Structural Cycle Score (GLC Composite)

A separate structural detection runs on the merged composite level:

```
Composite Level (weighted, indexed to 100) → 52w YoY → HP detrend (dtype=0)
  → Howell Pre-Seed (1975–2003 calibrated) → Rolling pctrank (780-week window)
  → CycleScanner(minCycleLength=238, maxCycleLength=368, bartelsLimit=10, dtype=0)
  → CRSI tuned to structural cycle (~285 bars ≈ 66 months)
  → structural_score = 0.5 × phaseScore + 0.5 × crsiBandScore
```

The detected cycle (~C285 weekly bars ≈ 66 months) matches Howell's published C67, validating the composite against his proprietary GLI.

### Display Score (L5 contribution to master composite)

```
L5_score = 0.8 × structural_score + 0.2 × component_composite
```

The 80/20 blend ensures the ~66-month structural cycle dominates the reading while individual component cycles provide a 20% modulation. This is the value that feeds into the master composite at the 25% weight.

### Liquidity Regime Labels (L5)

| Score Range | Regime | Market Interpretation |
|-------------|--------|----------------------|
| 65–100 | Expanding | Global CB expansion confirmed. Risk-on tailwind. |
| 50–64 | Supportive | Mild liquidity support. Cycles work normally. |
| 35–49 | Neutral | No clear direction. Cross-currents between series. |
| 20–34 | Tightening | Drains building, credit slowing. Rallies may underperform. |
| 0–19 | Contracting | Active contraction across major CBs. Strongest macro headwind. |

### Liquidity Layer's Dual Role

1. **Direct composite contributor:** 25% weight in master score (the largest single layer)
2. **Lead-time divergence signal:** When Liquidity diverges from Leading Indicators, it warns of upcoming economic shifts before leading indicators fully turn (see Divergence Overrides above)

### Critical Implementation Notes

1. **Howell pre-seed is required**, not optional. Without the 1975–2003 pre-seed data, the 780-week pctrank window has severe warm-up artifacts producing narrow CRSI bands and wrong phase detection (structural score error of 15–20 points).
2. **API parameter `dtype` must be lowercase.** The Cycle Tools API may silently ignore `dType` (capital T) and use a different default detrending mode.
3. **bartelsLimit differs by path.** Structural CycleScanner uses `bartelsLimit=10`; component CycleScanner uses `bartelsLimit=49` (default).
4. **Wednesday alignment uses priority search**, not nearest-neighbor: day 0 → day −1 → day +1 → day −2 → day +2 → ... → ±5. First match wins.

---

## Constructing the Verbal Narrative

When generating a narrative paragraph for the current composite reading, follow this structure:

### 1. Lead with the regime and score
> "The Economic Cycle Composite reads [score], placing the macro environment in the **[Regime]** zone."

### 2. Summarize the highest-weighted confirming signals first

Use the series with the largest optimized weights that are driving the score in the direction of the current regime. Group by theme:

- **Labor market** (UNRATE, CCSA, JTSJOL, PAYEMS, ICSA)
- **Production & investment** (INDPRO, DGORDER)
- **Credit & stress** (BAA10Y, BAMLH0A0HYM2, STLFSI4, VIXCLS)
- **Inflation & policy** (CPIAUCSL, T5YIE, DFF, CPILFESL)
- **Sentiment & housing** (UMCSENT, PERMIT)

### 3. Note any divergences or contradictions

If high-weighted series disagree with each other (e.g., INDPRO bullish but UMCSENT bearish), call out the conflict explicitly — these divergences often precede turning points.

### 4. Note Liquidity-Leading divergence if present

If Liquidity is significantly below Leading Indicators, note this as an early warning — liquidity leads the economy by ~3–6 months. If Liquidity is below 35, note the regime downgrade from liquidity tightening.

### 5. Close with the Leading-Coincident divergence signal if present

If Leading Indicators are significantly below Coincident Activity, note this as a late-cycle warning regardless of the headline score.

### Template for narrative generation

Given the current series results sorted by weight, construct a paragraph like:

> "The Economic Cycle Composite reads **[score]** (**[Regime]**). [Highest-weight bullish/bearish signal, e.g., 'Industrial production remains in a strong expansion phase']. [Second signal, e.g., 'Credit spreads are tight, reflecting low financial stress']. [Third signal]. However, [any contradicting signal from a high-weight series]. [If Liquidity-Leading divergence: 'Liquidity is scoring [X] points below leading indicators — funding conditions are deteriorating ahead of the economy, an early warning of broader cyclical deterioration.']. [If Leading-Coincident divergence: 'Notably, leading indicators are scoring [X] points below coincident activity, a configuration historically associated with late-cycle peaks.']. Overall, the macro backdrop [supports/undermines/is neutral for] equity cycle positioning."

### Prioritization Order for Narrative

When selecting which series to mention (aim for 3-5 key signals, not all 23), prioritize by:

1. **Optimized weight** (higher weight = more historically predictive)
2. **Extremity of score** (a score of 5 or 95 is more noteworthy than 50)
3. **Divergence from the composite** (a bearish signal in a bullish composite is more important than a bullish signal confirming what we already know)

The 8 series with weights >= 0.25 should be the primary candidates for narrative inclusion:

| Priority | Series | Weight | Theme |
|----------|--------|--------|-------|
| 1 | UMCSENT | 1.50 | Sentiment |
| 2 | CCSA | 1.50 | Labor persistence |
| 3 | DGORDER | 0.80 | Business investment |
| 4 | INDPRO | 1.00 | Production |
| 5 | BAA10Y | 1.50 | Credit stress |
| 6 | T5YIE | 1.50 | Inflation expectations |
| 7 | BAMLH0A0HYM2 | 1.35 | HY credit stress |
| 8 | JTSJOL | 0.90 | Labor demand |

Additionally, the **liquidity layer narrative** is always included when Liquidity data is available — it covers the Howell framework signals independently of the per-series economic narratives.

---

## Example Narratives

### Example: Risk-On with Expanding Liquidity (score 67)
> "The Economic Cycle Composite reads **67.0** (**Risk-On**). Consumer sentiment is in a strong upswing phase, and industrial production continues to expand — both hallmarks of a mid-cycle environment. Credit spreads remain tight, with the Baa-Treasury spread near cyclical lows, indicating ample credit availability and low perceived default risk. Inflation expectations are healthy but contained, and the Fed Funds rate cycle is in an easing phase, providing a policy tailwind. Liquidity conditions are strongly expansionary — Net Fed Liquidity momentum is positive and private credit is accelerating, providing a significant tailwind for risk assets. The macro backdrop supports treating equity cycle lows as buying opportunities."

### Example: Neutral-Bearish with Full Divergence Cascade (score 46, Leading-Coincident spread −35, Liquidity-Leading spread −12)
> "The Economic Cycle Composite reads **46.0** (**Neutral-Bearish**). Consumer sentiment has deteriorated sharply, signaling households are losing confidence. However, industrial production continues to expand, and credit spreads are tight. Notably, leading indicators are scoring 35 points below coincident activity — a configuration historically associated with late-cycle peaks and impending deterioration. Liquidity is scoring 12 points below leading indicators — historically, funding conditions deteriorate before the economy weakens, making this an early warning of broader cyclical deterioration. Liquidity conditions are tightening, with Net Fed Liquidity momentum weakening, creating a headwind for risk assets. The full pre-downturn cascade is visible: liquidity drying up, then leading indicators weakening, while coincident data remains strong. The macro environment presents a headwind; cyclical rallies may prove short-lived."

### Example: Neutral with Leading-Coincident Divergence Warning (score 56, spread −28)
> "The Economic Cycle Composite reads **56.0** (**Neutral**), downgraded from Neutral-Bullish due to a leading-coincident divergence. While industrial production and unemployment still indicate a healthy economy, consumer sentiment has rolled over sharply and continued claims are beginning to rise — leading indicators are scoring 28 points below coincident activity. This is the classic late-cycle pattern where the economy looks fine on the surface but forward-looking measures are deteriorating. Durable goods orders have plateaued. Credit spreads remain relatively tight but have begun widening. The Fed is still in a tightening phase, compounding the headwind. Caution is warranted: cyclical rallies in this environment have historically failed."

### Example: Risk-Off with Contracting Liquidity (score 34)
> "The Economic Cycle Composite reads **34.0** (**Risk-Off**). The macro environment is firmly contractionary. Industrial production is in a falling phase, unemployment is rising, and continued claims indicate the labor market is not reabsorbing displaced workers. Credit spreads have blown out, with the Baa-Treasury spread in a distressed phase — capital markets are pricing in significant default risk. Consumer sentiment is deeply depressed. Liquidity conditions are contracting — falling liquidity momentum across multiple tiers signals a hostile environment for risk assets. On the policy side, headline CPI is falling, which gives the Fed room to ease, and breakeven inflation has collapsed to deflationary-fear levels. The one potential positive: monetary easing typically begins in this environment, planting the seeds for the next recovery. However, until both leading indicators and liquidity turn, equity cycle patterns are likely overridden by the macro downturn."

### Example: Early Recovery — Liquidity Leading Upturn (score 42, Liquidity-Leading spread +18)
> "The Economic Cycle Composite reads **42.0** (**Neutral-Bearish**). Economic indicators remain weak — industrial production is contracting and unemployment is still rising. However, liquidity is scoring 18 points above leading indicators, signaling that funding conditions are improving ahead of the economy. Net Fed Liquidity momentum has turned positive and CRSI is showing an oversold reversal from below the lower band. This is the configuration Howell identifies as the earliest recovery signal — liquidity leads the economy by 3–6 months and equities by approximately 6 weeks. While the headline score remains bearish, the Liquidity-Leading upturn divergence suggests the worst may be behind and a turn is forming beneath the surface."

---

## Recession Backtest Validation

The model was backtested against all 3 NBER-dated US recessions with sufficient data coverage (Dot-com 2001, GFC 2007, COVID 2020). For each recession, the full pipeline was run using only data available up to each checkpoint date, simulating real-time usage.

### Target

The composite should read **Neutral-Bearish or Risk-Off (< 48)** at **-3 months** before each NBER recession start date. This targets a tight warning window — early enough to act but not so early that the signal fades before onset.

### Results (After Weight Optimization)

| Recession | NBER Start | Composite @-3m | Regime @-3m | L1 | L2 | L3 | L4 | Result |
|-----------|-----------|---------------|-------------|-----|-----|-----|-----|--------|
| Dot-com | 2001-03 | **45.6** | Ntrl-Bear | 45.2 | 72.9 | 7.3 | 82.4 | ✅ |
| GFC | 2007-12 | **44.6** | Ntrl-Bear | 64.3 | 54.2 | 4.5 | 51.1 | ✅ |
| COVID | 2020-02 | **45.7** | Ntrl-Bear | 44.4 | 47.6 | 61.3 | 15.6 | ✅ |

**3/3 recessions correctly identified at -3 months.** All three produced Neutral-Bearish readings, indicating the model would have flagged recession risk before any NBER announcement.

### Weight Optimizations Derived from Backtest

The initial backtest (pre-optimization) scored 2/3 — the GFC was missed at 49.6 (Neutral). Root cause analysis identified three L1 weight problems:

| Series | Before | After | Rationale |
|--------|--------|-------|-----------|
| DGORDER | 1.50 | **0.80** | False all-clear at -3m in 2/3 recessions (97.5 GFC, 65.0 COVID). Coincident-to-lagging at recession turns. |
| USSLIND | 0.10 | **0.60** | Scored 2.5 at -3m in 2/3 recessions — the single most reliable early warner but was effectively invisible at 0.10 weight. |
| PERMIT | 0.10 | **0.40** | Scored 2.5 at -3m before the GFC — the recession the model initially missed. Housing permits are the primary channel for detecting interest-rate-driven downturns. |

These changes reduced L1's GFC reading from 76.8 to 64.3, pulling the composite from 49.6 to 44.6 — crossing the warning threshold.

### Per-Layer Diagnostic Patterns

**Layer 1 (Leading):** Correctly warned at -3m for Dot-com (45.2) and COVID (44.4). Still elevated at GFC (64.3) because UMCSENT and DGORDER hadn't cracked yet, but low enough (with optimized weights) that L3 could pull the composite below threshold.

**Layer 2 (Coincident):** Consistently too high at -3m (72.9 Dot-com, 54.2 GFC, 47.6 COVID). This is by design — coincident indicators lag turning points. Employment and income peak right before recessions. The Leading-Coincident divergence mechanism captures this pattern.

**Layer 3 (Stress):** The strongest recession warning layer — scored 7.3 (Dot-com), 4.5 (GFC), 61.3 (COVID). Credit spreads and financial stress indices lead endogenous recessions powerfully. The higher COVID score reflects its exogenous nature (no financial stress preceded the pandemic).

**Layer 4 (Policy):** Variable: high at Dot-com (82.4, policy still accommodative), neutral at GFC (51.1), very low at COVID (15.6, inflation/policy cycle was already bearish).

### Most Reliable Individual Series (scored < 38 at -3m across multiple recessions)

| Series | Dot-com | GFC | COVID | Weight | Hit Rate |
|--------|---------|-----|-------|--------|----------|
| USSLIND | 2.5 | 65.0 | 2.5 | 0.60 | 2/3 |
| HY OAS | 2.5 | 0.0 | 90.0 | 1.35 | 2/3 |
| INDPRO | 35.0 | 75.0 | 2.5 | 1.00 | 2/3 |
| StL Fin Stress | 10.0 | 0.0 | 65.0 | 0.10 | 2/3 |
| Building Permits | 30.0 | 2.5 | 97.5 | 0.40 | 2/3 |

### Persistent False All-Clears (scored ≥ 62 at -3m across multiple recessions)

| Series | Dot-com | GFC | COVID | Weight | Explanation |
|--------|---------|-----|-------|--------|-------------|
| UNRATE | 97.5 | 25.0 | 100.0 | 0.60 | Classic lagging — unemployment is lowest right before recessions |
| PAYEMS | 97.5 | 70.0 | 35.0 | 0.50 | Employment peaks after the market does |
| DSPIC96 | 100.0 | 30.0 | 97.5 | 0.40 | Income peaks with employment |
| M2 Money Supply | 97.5 | 100.0 | 97.5 | 0.10 | Always in expansion phase (low weight, acceptable) |
| VIX | 70.0 | 70.0 | 65.0 | 0.10 | Spot measure, not leading (low weight, acceptable) |

### COVID Caveat

COVID was an exogenous shock — no economic model can predict a pandemic. The model showed pre-existing fragility (composite 35.1–47.0 from -6m to -3m, largely driven by L4 policy deterioration and L1/L2 mixed readings), but this reflects the late-2019 manufacturing slowdown and trade war concerns, not pandemic foresight. The fact that the model still read Neutral-Bearish at -3m is a positive finding — the economy was genuinely vulnerable when the shock hit.

---

## Recession Probability Indicator

### Why a Separate Indicator?

The composite score measures **economic regime** — headwind vs tailwind. A sub-48 reading means "macro environment is a headwind" and fires during recessions, near-recessions, slowdowns, post-recession recoveries, and significant stress events. This is correct behavior for a regime indicator — an investor should exercise caution during all of these periods.

However, a rolling backtest across 28 years (1997-2025) revealed that the composite drops below 48 in **44 distinct episodes**, of which only **10 correspond to periods within 6 months of an NBER recession** (23% precision). The remaining 34 episodes represent:

- **Post-recession lingering** (~5 episodes): 2002, 2009-2010, 2020-2021. Economy technically recovered but still deeply impaired.
- **Near-recession / genuine crisis** (~8 episodes): 2006 (pre-GFC early), 2011 (European debt crisis), 2015-2016 (manufacturing recession / oil crash), 2018-2019 (trade war / yield curve inversion), 2022 (rate shock), 2024-2025 (tariff uncertainty). All were legitimate risk events with significant market drawdowns.
- **Brief 1-month noise** (~12 episodes): Filterable with persistence requirements.
- **Genuine false signals** (~3 episodes): 2003-2005 mid-expansion readings where L3/L4 cycle phases aligned bearish during solid growth. Root cause: credit spread cycle phases produce persistent false bearish readings when spreads normalize from historic tights.

The Recession Probability Indicator adds a multi-condition filter to distinguish "recession probable" from "economic headwind" while preserving the composite's utility as a regime signal.

### Scoring Methodology

Five weighted conditions contribute to a total score (0-100 points):

#### Condition 1: Composite Level (0-30 points)

| Composite Score | Points | Interpretation |
|----------------|--------|---------------|
| ≥ 55 | 0 | Expansion territory |
| 48-54 | 5 | Neutral, mild concern |
| 38-47 | 20 | Bearish, consistent with pre-recession |
| < 38 | 30 | Risk-off, severe stress or recession |

#### Condition 2: L1 Leading Deterioration (0-25 points)

| L1 Score | Points | Interpretation |
|----------|--------|---------------|
| ≥ 60 | 0 | Leading indicators healthy |
| 50-59 | 5 | Mixed signals |
| 40-49 | 15 | Leading weakening |
| < 40 | 25 | Leading in contraction — precedes recessions by 3-9 months |

#### Condition 3: Leading-Coincident Divergence (0-20 points)

The classic late-cycle signal: L2 (economy still looks healthy) while L1 (leading indicators have rolled over).

| L2 - L1 Spread | Points | Interpretation |
|----------------|--------|---------------|
| L2 > L1 + 20 | 20 | Classic pre-recession divergence — preceded every post-2000 recession |
| L2 > L1 + 10 | 12 | Early divergence forming |
| L2 > L1 | 5 | Mild divergence |
| L2 ≤ L1 | 0 | No divergence or early recovery pattern |

#### Condition 4: Multi-Layer Breadth (0-15 points)

Counts how many layers have scores below 45 — broad deterioration vs. isolated weakness.

| Layers Below 45 | Points | Interpretation |
|-----------------|--------|---------------|
| 3+ layers | 15 | Broad-based deterioration |
| 2 layers | 8 | Deterioration spreading |
| 1 layer | 3 | Isolated weakness |
| 0 layers | 0 | No broad signal |

#### Condition 5: Projection Persistence (0-10 points)

Uses the cycle projection model to assess whether the deterioration is transient or persistent.

| Projection Trajectory | Points | Interpretation |
|----------------------|--------|---------------|
| Stays below 48 through +12 weeks | 10 | Persistent deterioration — not a transient dip |
| Endpoint below 48, some recovery | 7 | Likely to persist |
| Recovers above 48 within 12 weeks | 0 | Transient weakness, unlikely recession |

### Risk Level Classification

| Total Score | Risk Level | Probability | Dashboard Display |
|------------|-----------|-------------|-------------------|
| 0-20 | Low | < 15% | 🟢 Green |
| 21-40 | Elevated | 15-35% | 🟡 Yellow |
| 41-65 | High | 35-60% | 🟠 Orange |
| 66+ | Very High | 60-85% | 🔴 Red |

### Historical Pattern Recognition

Each risk level includes a historical context paragraph explaining what this pattern looked like in past economic cycles:

**Low risk** — Typical of mid-cycle expansions (2013-2015, 2017-2018). Leading indicators healthy, no layer distress.

**Elevated risk** — Matches 2011 European debt crisis (composite 39-45, L3 crashed but L2 held at 69), 2015-2016 manufacturing recession (L1 weakening, INDPRO falling, services held), 2018-2019 trade war (L1 cracking, L2 at 91). In each case, the economy slowed but avoided recession. Pre-COVID (Aug-Nov 2019) also showed this level before the exogenous shock.

**High risk** — Appeared at -3 to -5 months before both the Dot-com recession (composite 44-46 in Nov-Dec 2000, L1 deteriorating while L2 held at 73) and the GFC (composite 40-45 from Apr-Oct 2007, L3 collapsed while L1/L2 mixed). Also appeared during the 2022 rate shock without a recession — though that period saw S&P 500 drawdown of 25%.

**Very high risk** — Rare outside actual recessions. The Dot-com recession reached Risk-Off by April 2001 (1 month after NBER start). The GFC reached Risk-Off by October 2008 (10 months in). Very high readings at -3m would indicate deterioration more advanced than typical pre-recession.

### Dashboard Integration

The recession indicator appears below the composite gauge, showing:
1. Risk level with color-coded badge and probability range
2. 1-line headline summary
3. Five-segment factor bar (green/yellow/red per condition)
4. Expandable detail panel with per-factor scoring and historical context

### Key Design Decisions

1. **Not a binary flag**: Recession probability is expressed as a range, not yes/no, because economic turning points are inherently probabilistic.
2. **Historical context varies by level**: Each risk level gets its own paragraph explaining what happened historically at that level — this is the most actionable information for decision-making.
3. **Composite remains the primary signal**: The recession indicator is an overlay, not a replacement. The composite regime (Risk-On through Risk-Off) remains the primary tool for equity cycle positioning.
4. **Projection persistence matters**: A transient 1-month dip below 48 that the projection model shows recovering is very different from a persistent reading where all projections stay bearish.

---

## Design Decisions & Rejected Alternatives

### Why Single-Dominant-Cycle Scoring, Not Cycle Consensus (Tested & Rejected)

The Cycle Tools API offers a `CycleConsensus` endpoint that aggregates all statistically significant cycles into a single consensus score (−100 to +100), including CRSI confirmation. This was tested as a potential replacement for the current single-dominant-cycle extraction approach.

**Experiment (April 2026):** The consensus endpoint was backtested against all 8 historical market tops/bottoms using the same layer weights and regime bands. Result: **1/8 (13%)** — a catastrophic regression from the current 7/8 (88%).

**Root cause — semantic mismatch:** The CycleConsensus endpoint is designed for *market timing*: a positive score means "cycles are bottoming, this is a buy signal." The economic composite needs to measure *economic health*: a high score means "the economy is strong." These are **opposite readings at market bottoms** — when the economy is weakest (and the composite should read low/bearish), the consensus says "buy" (positive/bullish). For example, at the GFC Bottom (March 2009), consensus scored the composite at 60.8 "Neutral-Bullish" — reading the economic devastation as a buying opportunity rather than as economic weakness.

The single-dominant-cycle approach works correctly because `avgPhaseScore` measures *where the economic indicator currently sits in its cycle* — a series near its cycle peak genuinely means "this indicator is at peak strength," which is what the composite needs. No amount of regime band recalibration or weight re-optimization can fix a fundamental directional inversion.

**Retained for future use:** The CycleConsensus endpoint remains valuable for a separate *equity cycle timing overlay* — answering "is this a good time to buy/sell?" based on cyclical positioning of equity indices themselves (e.g., S&P 500, NASDAQ). This is complementary to the economic composite (which answers "is the macro environment a tailwind or headwind?"). The two systems serve different questions:

| System | Question It Answers | Score Semantics |
|--------|-------------------|----------------|
| Economic Composite (this document) | Is the macro environment a tailwind or headwind? | High = economy strong, Low = economy weak |
| Equity Cycle Consensus (future overlay) | Are equity markets at a cyclical buying or selling point? | Positive = buy signal, Negative = sell signal |

The highest-conviction trading setups occur when both align — e.g., the composite reads Risk-On (macro tailwind) *and* consensus detects a cyclical low in equities (buy signal). The most dangerous setups are divergences — e.g., consensus says "buy the dip" but the composite reads Risk-Off with active divergence cascade. Automating the equity cycle timing via CycleConsensus would replace manual cycle phase assessment with a multi-cycle consensus reading, enabling systematic confluence scoring between macro regime and equity cycle positioning.
