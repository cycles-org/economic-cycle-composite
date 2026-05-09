# Market Phase Coherence — Cross-Asset PCM Analysis

Run date: 2026-05-04T14:17:46.849Z
Branch:   `richard/forcing-analysis`
Source:   `scratch/market_phase_coherence.mjs`

## Method

1. Fetched ~850 weekly bars per ticker via SearchSymbols → EnsureCompleteDataset → GetDatasetSeries.
2. Pearson correlation on weekly returns; pairs with |r| < 0.3 flagged as uncorrelated.
3. CycleScanner (dtype=4 Kalman, bartelsLimit=49, dominantPeakFinder, useStability) on each ticker in any uncorrelated pair.
4. Pairs where longer/shorter cycle ≤ 1.15 (i.e. ≤ 15% apart) flagged as sharing a period.
5. PCM on shared-period pairs: 4th-order Butterworth zero-phase bandpass at period × [0.75, 1.33], FFT-based Hilbert phase, 1000 phase-shuffled surrogates of one ticker (the other held fixed). p-value = fraction of surrogate circular Stds lower than real.

Verdict thresholds: p<0.05 SIGNIFICANT · p<0.10 BORDERLINE · p≥0.10 NOT significant.

## Tickers

| Symbol | Description | Resolved tickerId | Bars | Date range |
|--------|-------------|-------------------|-----:|------------|
| ^GSPC | S&P 500 | `^GSPC-W:YFI` | 850 | 2010-02-15T00:00:00 → 2026-05-04T00:00:00 |
| GLD | Gold ETF | `GLD-W:YFI` | 850 | 2010-02-15T00:00:00 → 2026-05-04T00:00:00 |
| TLT | Long bonds ETF | `TLT-W:YFI` | 850 | 2010-02-08T00:00:00 → 2026-05-04T00:00:00 |
| DBC | Broad commodities | `DBC-W:YFI` | 850 | 2010-01-25T00:00:00 → 2026-05-04T00:00:00 |
| EEM | Emerging markets | `EEM-W:YFI` | 850 | 2010-01-25T00:00:00 → 2026-05-04T00:00:00 |
| UUP | US Dollar | `UUP-W:YFI` | 850 | 2010-02-08T00:00:00 → 2026-05-04T00:00:00 |
| VNQ | Real estate | `VNQ-W:YFI` | 850 | 2010-01-25T05:00:00 → 2026-05-04T00:00:00 |
| WEAT | Wheat ETF | `WEAT-W:YFI` | 766 | 2011-09-19T00:00:00 → 2026-05-04T00:00:00 |

## Correlation matrix (weekly returns)

| | ^GSPC | GLD | TLT | DBC | EEM | UUP | VNQ | WEAT |
|---|---|---|---|---|---|---|---|---|
| **^GSPC** | 1.00 | **0.26** | -0.36 | 0.40 | 0.71 | **-0.25** | 0.67 | **0.13** |
| **GLD** | **0.26** | 1.00 | **0.18** | **0.28** | **0.27** | -0.43 | **0.26** | **0.23** |
| **TLT** | -0.36 | **0.18** | 1.00 | **-0.26** | **-0.15** | **-0.09** | **0.22** | **0.01** |
| **DBC** | 0.40 | **0.28** | **-0.26** | 1.00 | 0.45 | **-0.20** | 0.31 | **0.09** |
| **EEM** | 0.71 | **0.27** | **-0.15** | 0.45 | 1.00 | -0.37 | 0.55 | **-0.01** |
| **UUP** | **-0.25** | -0.43 | **-0.09** | **-0.20** | -0.37 | 1.00 | -0.31 | **-0.01** |
| **VNQ** | 0.67 | **0.26** | **0.22** | 0.31 | 0.55 | -0.31 | 1.00 | **0.04** |
| **WEAT** | **0.13** | **0.23** | **0.01** | **0.09** | **-0.01** | **-0.01** | **0.04** | 1.00 |

Bold cells = |r| < 0.3 (uncorrelated pair candidates).

## Uncorrelated pairs

| Pair | r | n (overlap) |
|------|--:|------------:|
| UUP ⇄ WEAT | -0.005 | 702 |
| EEM ⇄ WEAT | -0.008 | 721 |
| TLT ⇄ WEAT | 0.009 | 672 |
| VNQ ⇄ WEAT | 0.039 | 438 |
| DBC ⇄ WEAT | 0.088 | 721 |
| TLT ⇄ UUP | -0.095 | 760 |
| ^GSPC ⇄ WEAT | 0.127 | 618 |
| TLT ⇄ EEM | -0.154 | 771 |
| GLD ⇄ TLT | 0.180 | 744 |
| DBC ⇄ UUP | -0.196 | 816 |
| TLT ⇄ VNQ | 0.215 | 405 |
| GLD ⇄ WEAT | 0.228 | 691 |
| ^GSPC ⇄ UUP | -0.245 | 701 |
| ^GSPC ⇄ GLD | 0.257 | 701 |
| GLD ⇄ VNQ | 0.262 | 427 |
| TLT ⇄ DBC | -0.263 | 771 |
| GLD ⇄ EEM | 0.267 | 793 |
| GLD ⇄ DBC | 0.282 | 793 |

## Cycle detection on uncorrelated tickers (dtype=4 Kalman)

| Ticker | Cycle | Strength | Bartels | Stability | Phase status |
|--------|------:|---------:|--------:|----------:|--------------|
| ^GSPC | C37w | 2.6 | 95.9 | 0.46 | Downtrend_Starting |
| GLD | C69w | 3.3 | 89.4 | 0.59 | Downtrend_Neutral |
| TLT | C74w | 1.8 | 79.4 | 0.69 | Downtrend_Neutral |
| DBC | C34w | 2.1 | 77.1 | 0.68 | Downtrend_Starting |
| EEM | C27w | 1.8 | 58.2 | 0.15 | Downtrend_Neutral |
| UUP | C28w | 1.3 | 68.6 | 0.22 | Uptrend_Neutral |
| VNQ | C36w | 3.0 | 91.1 | 0.51 | Downtrend_Neutral |
| WEAT | C41w | 2.5 | 67.8 | 0.43 | Downtrend_Neutral |

## Shared-period table

| Ticker A | Ticker B | r | Shared? | Period A | Period B | Ratio |
|----------|----------|--:|:-------:|---------:|---------:|------:|
| UUP | WEAT | -0.005 | ✗ | C28w | C41w | 1.46 |
| EEM | WEAT | -0.008 | ✗ | C27w | C41w | 1.52 |
| TLT | WEAT | 0.009 | ✗ | C74w | C41w | 1.80 |
| VNQ | WEAT | 0.039 | **✓** | C36w | C41w | 1.14 |
| DBC | WEAT | 0.088 | ✗ | C34w | C41w | 1.21 |
| TLT | UUP | -0.095 | ✗ | C74w | C28w | 2.64 |
| ^GSPC | WEAT | 0.127 | **✓** | C37w | C41w | 1.11 |
| TLT | EEM | -0.154 | ✗ | C74w | C27w | 2.74 |
| GLD | TLT | 0.180 | **✓** | C69w | C74w | 1.07 |
| DBC | UUP | -0.196 | ✗ | C34w | C28w | 1.21 |
| TLT | VNQ | 0.215 | ✗ | C74w | C36w | 2.06 |
| GLD | WEAT | 0.228 | ✗ | C69w | C41w | 1.68 |
| ^GSPC | UUP | -0.245 | ✗ | C37w | C28w | 1.32 |
| ^GSPC | GLD | 0.257 | ✗ | C37w | C69w | 1.86 |
| GLD | VNQ | 0.262 | ✗ | C69w | C36w | 1.92 |
| TLT | DBC | -0.263 | ✗ | C74w | C34w | 2.18 |
| GLD | EEM | 0.267 | ✗ | C69w | C27w | 2.56 |
| GLD | DBC | 0.282 | ✗ | C69w | C34w | 2.03 |

## PCM results — shared-period pairs

| Pair | Corr | Mean period | Band (w) | n trimmed | Std linear | Std circular | p-value | Verdict |
|------|-----:|------------:|---------:|----------:|-----------:|-------------:|--------:|---------|
| VNQ ⇄ WEAT | 0.039 | C39w | [29, 51] | 335 | 1.294 | 1.288 | 0.3020 | **NOT significant** |
| ^GSPC ⇄ WEAT | 0.127 | C39w | [29, 52] | 515 | 1.980 | 1.782 | 0.7340 | **NOT significant** |
| GLD ⇄ TLT | 0.180 | C72w | [54, 95] | 553 | 1.127 | 1.009 | 0.3080 | **NOT significant** |

## Surrogate distribution detail

| Pair | Mean | q05 | median | q95 | Real circ Std | p-value |
|------|-----:|----:|-------:|----:|--------------:|--------:|
| VNQ ⇄ WEAT | 1.486 | 0.901 | 1.469 | 2.185 | 1.288 | 0.3020 |
| ^GSPC ⇄ WEAT | 1.556 | 0.983 | 1.535 | 2.194 | 1.782 | 0.7340 |
| GLD ⇄ TLT | 1.247 | 0.585 | 1.199 | 2.049 | 1.009 | 0.3080 |

## Method caveats

- **PCM verdicts are surrogate-test-based** (not threshold-only). Threshold STRONG/MODERATE/WEAK labels do not reliably indicate significance on filtered real-data pairs — see `scratch/research_note_ecb_howell_pcm.md` for rationale.
- **Surrogate**: phase-shuffle preserves amplitude spectrum, randomizes phase, maintains real-conjugate symmetry. Only ticker A is shuffled; ticker B holds fixed.
- **Edge trim** = upper-band period (covers IIR settling + Hilbert FFT zero-pad edges).
- **Date alignment**: pairwise intersection by exact date string match. Dates that don't appear in both series are dropped.
- **Returns vs prices**: correlation on returns; PCM on prices (filtered to band).

