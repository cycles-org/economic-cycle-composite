# Market Phase Coherence — Cross-Asset PCM Analysis (Daily)

Run date: 2026-05-04T14:33:57.990Z
Branch:   `richard/forcing-analysis`
Source:   `scratch/market_phase_coherence_daily.mjs`

## Method

1. Fetched ~1000 daily bars per ticker via EnsureCompleteDataset → GetDatasetSeries.
2. Pearson correlation on daily returns; pairs with |r| < 0.3 flagged as uncorrelated.
3. CycleScanner (dtype=4 Kalman, bartelsLimit=49, dominantPeakFinder, useStability, 50–200 day band) on each ticker in any uncorrelated pair.
4. Pairs where longer/shorter cycle ≤ 1.15 (i.e. ≤ 15% apart) flagged as sharing a period.
5. PCM on shared-period pairs: 4th-order Butterworth zero-phase bandpass at period × [0.75, 1.33], FFT-based Hilbert phase, 1000 phase-shuffled surrogates of one ticker (the other held fixed). p-value = fraction of surrogate circular Stds lower than real.

Verdict thresholds: p<0.05 SIGNIFICANT · p<0.10 BORDERLINE · p≥0.10 NOT significant.

All cycle periods and lead/lag measurements in trading days (not weeks).

## Tickers

| Symbol | Description | Resolved tickerId | Bars | Date range |
|--------|-------------|-------------------|-----:|------------|
| ^GSPC | S&P 500 | `^GSPC:YFI` | 1000 | 2022-05-09T00:00:00 → 2026-05-04T00:00:00 |
| GLD | Gold ETF | `GLD:YFI` | 1000 | 2022-05-09T00:00:00 → 2026-05-04T00:00:00 |
| TLT | Long bonds ETF | `TLT:YFI` | 1000 | 2022-05-09T00:00:00 → 2026-05-04T00:00:00 |
| DBC | Broad commodities | `DBC:YFI` | 1000 | 2022-05-06T00:00:00 → 2026-05-04T00:00:00 |
| EEM | Emerging markets | `EEM:YFI` | 1000 | 2022-05-09T00:00:00 → 2026-05-04T00:00:00 |
| UUP | US Dollar | `UUP:YFI` | 1000 | 2022-05-09T00:00:00 → 2026-05-04T00:00:00 |
| VNQ | Real estate | `VNQ:YFI` | 1000 | 2022-05-09T00:00:00 → 2026-05-04T00:00:00 |
| WEAT | Wheat ETF | `WEAT:YFI` | 1000 | 2022-05-06T00:00:00 → 2026-05-04T00:00:00 |

## Correlation matrix (daily returns)

| | ^GSPC | GLD | TLT | DBC | EEM | UUP | VNQ | WEAT |
|---|---|---|---|---|---|---|---|---|
| **^GSPC** | 1.00 | 0.61 | -0.42 | 0.40 | 0.67 | 0.33 | 0.53 | 0.36 |
| **GLD** | 0.61 | 1.00 | **0.15** | **0.29** | 0.35 | -0.38 | **0.21** | 0.51 |
| **TLT** | -0.42 | **0.15** | 1.00 | **-0.16** | **0.07** | -0.33 | **0.28** | **-0.01** |
| **DBC** | 0.40 | **0.29** | **-0.16** | 1.00 | **0.25** | **-0.15** | **0.12** | **0.19** |
| **EEM** | 0.67 | 0.35 | **0.07** | **0.25** | 1.00 | -0.43 | 0.51 | 0.36 |
| **UUP** | 0.33 | -0.38 | -0.33 | **-0.15** | -0.43 | 1.00 | -0.35 | **-0.04** |
| **VNQ** | 0.53 | **0.21** | **0.28** | **0.12** | 0.51 | -0.35 | 1.00 | **0.15** |
| **WEAT** | 0.36 | 0.51 | **-0.01** | **0.19** | 0.36 | **-0.04** | **0.15** | 1.00 |

Bold cells = |r| < 0.3 (uncorrelated pair candidates).

## Uncorrelated pairs

| Pair | r | n (overlap) |
|------|--:|------------:|
| TLT ⇄ WEAT | -0.006 | 342 |
| UUP ⇄ WEAT | -0.041 | 559 |
| TLT ⇄ EEM | 0.073 | 272 |
| DBC ⇄ VNQ | 0.120 | 932 |
| DBC ⇄ UUP | -0.147 | 878 |
| GLD ⇄ TLT | 0.147 | 272 |
| VNQ ⇄ WEAT | 0.149 | 506 |
| TLT ⇄ DBC | -0.159 | 272 |
| DBC ⇄ WEAT | 0.194 | 522 |
| GLD ⇄ VNQ | 0.214 | 933 |
| DBC ⇄ EEM | 0.252 | 998 |
| TLT ⇄ VNQ | 0.281 | 274 |
| GLD ⇄ DBC | 0.288 | 998 |

## Cycle detection on uncorrelated tickers (dtype=4 Kalman, 50–200d band)

| Ticker | Cycle | Strength | Bartels | Stability | Phase status |
|--------|------:|---------:|--------:|----------:|--------------|
| GLD | C88d | 1.9 | 94.1 | 0.60 | Uptrend_Neutral |
| TLT | C137d | 1.3 | 95.6 | 0.58 | Downtrend_Starting |
| DBC | C61d | 1.9 | 79.0 | 0.17 | Downtrend_Neutral |
| EEM | C78d | 3.0 | 95.5 | 0.70 | Uptrend_Neutral |
| UUP | C87d | 1.7 | 82.5 | 0.58 | Downtrend_Neutral |
| VNQ | C58d | 2.0 | 86.8 | 0.38 | Downtrend_Starting |
| WEAT | C68d | 1.5 | 69.3 | 0.45 | Downtrend_ApproachingBottom |

## Shared-period table

| Ticker A | Ticker B | r | Shared? | Period A | Period B | Ratio |
|----------|----------|--:|:-------:|---------:|---------:|------:|
| TLT | WEAT | -0.006 | ✗ | C137d | C68d | 2.01 |
| UUP | WEAT | -0.041 | ✗ | C87d | C68d | 1.28 |
| TLT | EEM | 0.073 | ✗ | C137d | C78d | 1.76 |
| DBC | VNQ | 0.120 | **✓** | C61d | C58d | 1.05 |
| DBC | UUP | -0.147 | ✗ | C61d | C87d | 1.43 |
| GLD | TLT | 0.147 | ✗ | C88d | C137d | 1.56 |
| VNQ | WEAT | 0.149 | ✗ | C58d | C68d | 1.17 |
| TLT | DBC | -0.159 | ✗ | C137d | C61d | 2.25 |
| DBC | WEAT | 0.194 | **✓** | C61d | C68d | 1.11 |
| GLD | VNQ | 0.214 | ✗ | C88d | C58d | 1.52 |
| DBC | EEM | 0.252 | ✗ | C61d | C78d | 1.28 |
| TLT | VNQ | 0.281 | ✗ | C137d | C58d | 2.36 |
| GLD | DBC | 0.288 | ✗ | C88d | C61d | 1.44 |

## PCM results — shared-period pairs

| Pair | Corr | Mean period | Band (d) | n trimmed | Std linear | Std circular | p-value | Verdict |
|------|-----:|------------:|---------:|----------:|-----------:|-------------:|--------:|---------|
| DBC ⇄ VNQ | 0.120 | C60d | [45, 79] | 773 | 1.799 | 2.562 | 0.9920 | **NOT significant** |
| DBC ⇄ WEAT | 0.194 | C65d | [48, 86] | 351 | 1.714 | 2.282 | 0.9820 | **NOT significant** |

## Surrogate distribution detail

| Pair | Mean | q05 | median | q95 | Real circ Std | p-value |
|------|-----:|----:|-------:|----:|--------------:|--------:|
| DBC ⇄ VNQ | 1.374 | 0.756 | 1.305 | 2.197 | 2.562 | 0.9920 |
| DBC ⇄ WEAT | 1.383 | 0.820 | 1.358 | 2.078 | 2.282 | 0.9820 |

## Method caveats

- **PCM verdicts are surrogate-test-based** (not threshold-only). Threshold STRONG/MODERATE/WEAK labels do not reliably indicate significance on filtered real-data pairs — see `scratch/research_note_ecb_howell_pcm.md` for rationale.
- **Surrogate**: phase-shuffle preserves amplitude spectrum, randomizes phase, maintains real-conjugate symmetry. Only ticker A is shuffled; ticker B held fixed.
- **Edge trim** = upper-band period (covers IIR settling + Hilbert FFT zero-pad edges).
- **Date alignment**: pairwise intersection by exact date string match. Dates that don't appear in both series are dropped.
- **Returns vs prices**: correlation on returns; PCM on prices (filtered to band).
- **Daily vs weekly**: Shorter bars (1 day vs 1 week) allow detection of faster cycles (50–200d vs 20–400w). T/5 reliability criterion: 200d ÷ 5 = 40d minimum reliable cycle length.

