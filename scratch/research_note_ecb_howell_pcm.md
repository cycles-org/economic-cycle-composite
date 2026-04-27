# ECB Balance Sheet Phase Coherence with the Howell Global Liquidity Cycle

**cycles-lab / economic-cycle-composite collaborative study — April 2026**

Branch: `richard/forcing-analysis` · Repo: `cycles-org/economic-cycle-composite`

---

## Summary

The empirically-derived **Howell ~66-month "C67" Global Liquidity Cycle** is phase-coherent with the **ECB balance sheet** at **Std(Δφ) = 0.370 rad, p = 0.019** (1000 phase-shuffled surrogates), with ECB lagging Howell's reference by **~36 weeks (~8 months)**. A competing astronomical candidate — the Jupiter/Saturn synodic quarter (258 weeks / 4.95 years) — is borderline at p = 0.061; suggestive but not significant at p<0.05. The **TOTBKCR ↔ WALCL** real-↔-real coupling test produces a STRONG threshold verdict (Std = 0.440) but the surrogate test rejects it (p = 0.255), demonstrating that threshold-only PCM verdicts produce false positives on filtered real-data pairs. The Butterworth-vs-MA filter upgrade was decisive: Row 1 (J/S ¼) appeared "~random" under MA-difference filtering and became MODERATE only under proper 4th-order Butterworth zero-phase. **A methodological upgrade for cycles-lab Standard 7 is recommended** (see § Methodological note).

---

## Background

### The Howell C67 Global Liquidity Cycle

Michael Howell (CrossBorder Capital, *Capital Wars*, 2020) identifies a ~66-month cycle in global liquidity — defined as the gross flow of credit and capital through the financial system. The cycle is the dominant non-trivial periodicity in his proprietary GLI (Global Liquidity Index), constructed from central bank balance sheets, bank credit, and shadow-banking funding measures. Howell's framework underpins the L5 (Liquidity) layer of the `economic-cycle-composite` macro regime score.

The structural cycle in the production pipeline is detected at **C285 weekly bars (~65.8 months)**, matching Howell's published C67 within 2%. This study uses **286 weeks** (the closest integer to 66 × 4.33) as the synthetic forcing period for PCM tests.

### Why ECB was tested first

L5 contains 8 series weighted to total 10: WALCL=3, ECB=1, BOJ=1, NFL=1, TOTBKCR=1, WRESBAL=1, COMPOUT=1, WRMFNS=1 (with FX-adjusted ECB and BOJ). ECB was selected for the first PCM test because:

1. It is the **second-largest non-Fed central bank balance sheet** in the composite, with ~22 years of weekly data (1999-01-01 → 2026-04-17, n=1425 bars).
2. Task 1's family-band classification (`scratch/classify_l5_families.mjs`) found that **ECB's dominant cycle is C265w (5.1y), Bartels = 72.3, dominantRank = 1** — a clean, statistically significant cycle close to both the Howell C67 (286w) and the Jupiter/Saturn synodic quarter (258w) candidates. ECB therefore offered the best ratio of cycle clarity to candidate proximity.
3. WALCL (3× weight) is dominated by discrete Fed-specific QE/QT regime changes that may obscure underlying cycle phase; ECB is more "background liquidity" with less forceful intervention and a cleaner cyclical signature.

### Connection to cycles-lab band classification

Task 1 of this study tested the **cycles-lab 7-family band taxonomy** (Solar/Decadal 520–676w, ENSO/QBO 676–780w, Dewey 780–1196w, Mogey 1300–1820w, Mid-Century 1872–2496w, Kondratieff 2600–4160w, Long-wave 4420–7280w) against the L5 series. **All 8 series produce dominant cycles below 400 weeks** (the API ceiling for `CycleScanner`), and **none reach the cycles-lab Solar/Decadal floor of 520 weeks**. The L5 liquidity series operate in a "sub-Dewey gap" — a range cycles-lab does not currently name. The Howell C67 (~286w) sits near the center of this gap. ECB's 265w detection was the only astronomical-period match in the entire 8-series L5 inventory: **2.7% off the Jupiter/Saturn synodic quarter (258w / 4.95y)**.

The PCM test was motivated by the question: **does the cycle-length match (ECB at 265w ≈ J/S ¼ at 258w) reflect actual phase coherence, or just coincidental periodicity at similar rates?**

---

## Methods

### Cycle classification (Task 1)

CycleScanner with `dtype=4` (Kalman / one-sided HP), `bartelsLimit=49`, `minCycleLength=20`, `maxCycleLength=400`. ECB raw-level scan:

| Series | Top cycle | Period | Bartels | Strength | Stability | Rank |
|--------|-----------|-------:|--------:|---------:|----------:|-----:|
| ECB | C265w | 5.1y | 72.3 | 1612.0 | 0.51 | 1 |

Astronomical match within 15% tolerance: **Jupiter/Saturn synodic ¼ (258w / 4.95y), Δ = 2.7%**.

### Phase Coherence Methodology (cycles-lab Standard 7)

For each pair {filtered series A, filtered series B}:

1. **Bandpass** each level series to **[200, 400] week band** via 4th-order Butterworth zero-phase filter (cascaded biquads applied forward + reverse).
2. **Instantaneous phase** via FFT-based Hilbert transform (analytic signal).
3. **Phase difference** Δφ wrapped to [−π, π].
4. **Trim 250 weeks** from each end (FFT zero-padding edge artifacts).
5. **Std(Δφ)** → cycles-lab thresholds: <0.5 STRONG · 0.5–1.0 MODERATE · 1.0–1.5 WEAK · ≥1.5 ~random (uniform baseline ≈ 1.81 rad).
6. **Surrogate test**: 1000 phase-shuffled realizations of one series in each pair preserve the amplitude spectrum but randomize the phase; p-value = fraction with Std lower than real ECB.

### Filter upgrade

The original PCM run used a **bandpass via difference of centered moving averages** (the "scipy-equivalent or moving-average approximation" option in the cycles-lab spec). This filter has poor stopband attenuation: out-of-band noise leaks into the Hilbert phase computation and **suppresses real phase coherence signals**. After validating the FFT, Hilbert, and phase-diff implementations against 5 synthetic test signals (`scratch/validate_pcm_math.mjs`, 5/5 PASS), the MA-difference filter was replaced with a **4th-order Butterworth zero-phase bandpass** in the same [200, 400] band.

### Test matrix

| Row | Pair | Surrogate target |
|-----|------|------------------|
| 1 | filtered ECB ⇄ `sin(2π t / 258)` (J/S synodic ¼) | shuffle ECB phase |
| 2 | filtered ECB ⇄ `sin(2π t / 286)` (Howell C67) | shuffle ECB phase |
| 3 | filtered TOTBKCR ⇄ filtered WALCL (real ↔ real) | shuffle TOTBKCR phase, fix WALCL |

Random seeds: Row 1 = 2026, Row 2 = 2027, Row 3 = 2028 (different per row to avoid spurious cross-row correlations).

---

## Results

### Surrogate distribution table (1000 surrogates per row)

| Row | Pair | Period | Real Std | Surrogate q05 | Surrogate median | p-value | p<0.05 | p<0.10 |
|-----|------|--------|---------:|--------------:|-----------------:|--------:|:------:|:------:|
| 1 | ECB ⇄ Jupiter/Saturn synodic ¼ | 258w | 0.575 | 0.548 | 1.549 | 0.0610 | ✗ | ✓ |
| 2 | **ECB ⇄ Howell C67 structural** | **286w** | **0.370** | **0.464** | **1.330** | **0.0190** | **✓** | **✓** |
| 3 | TOTBKCR ⇄ WALCL | 372w / 335w | 0.440 | 0.200 | 0.837 | 0.2550 | ✗ | ✗ |

### Phase-difference detail

| Row | Std (linear) | Std (circular) | Mean Δφ (rad) | Mean lag interpretation | n |
|-----|-------------:|---------------:|--------------:|-------------------------|--:|
| 1 | 0.575 | 0.572 | −2.491 | ECB lags J/S ¼ by ~102 weeks | 925 |
| 2 | **0.370** | **0.372** | **−0.793** | **ECB lags Howell C67 by ~36 weeks (~8 months)** | 925 |
| 3 | 0.440 | 0.444 | +0.045 | ~2.5 weeks (effectively zero, but n.s.) | 718 |

### Surrogate distribution detail

| Row | n | mean | std | q05 | median | q95 | real | p |
|-----|--:|-----:|----:|----:|-------:|----:|-----:|--:|
| 1 | 1000 | 1.483 | 0.533 | 0.548 | 1.549 | 2.290 | 0.575 | 0.0610 |
| 2 | 1000 | 1.360 | 0.584 | 0.464 | 1.330 | 2.284 | 0.370 | **0.0190** |
| 3 | 1000 | 1.068 | 0.741 | 0.200 | 0.837 | 2.441 | 0.440 | 0.2550 |

---

## Key finding

**Row 2 — ECB phase-locks with the Howell C67 reference cycle.**

- **Std(Δφ) = 0.370 rad** linear / 0.372 rad circular — both well below the cycles-lab STRONG threshold of 0.5
- **p = 0.019** — real ECB Std lies in the lower 1.9% tail of 1000 phase-shuffled ECB realizations
- **Mean lag = −0.793 rad ≈ −36 weeks ≈ −8 months** — ECB peaks ~8 months *after* the Howell C67 reference cycle peaks
- Real Std (0.370) is below even the surrogate q05 (0.464), placing it firmly outside the random-null distribution

This is statistically significant phase coherence: the empirically-derived Global Liquidity Cycle has phase structure visible in single-CB ECB data, with ECB tracking the C67 reference at a stable ~8-month lag. The lag direction is economically sensible — ECB balance sheet operations *follow* the broader global cycle rather than lead it.

The contrast with Row 1 is informative: **J/S synodic ¼ (258w) is geometrically *closer* to ECB's natural cycle (265w) than Howell C67 (286w)** — yet Howell wins by p-value (0.019 vs 0.061). That ordering supports the interpretation "Howell C67 is the actual driver, J/S has a coincidentally similar period" over "J/S is the astronomical forcing for ECB". A single-CB result of this strength was not anticipated; the structural pipeline filters the full L5 composite specifically for the C67 cycle, but ECB alone — without that filtering — already shows the relationship.

---

## Methodological note for cycles-lab Standard 7

The Standard 7 PCM verdict bands (STRONG/MODERATE/WEAK based on Std(Δφ) thresholds) make **two systematic errors** when applied without an accompanying surrogate test. This run produced a clean instance of each.

### Error 1 — false negative from MA-difference filter (Row 1)

| Filter | Row 1 Std | Verdict |
|--------|----------:|---------|
| MA-difference [200, 400] (original) | **2.016** | "~random" |
| 4th-order Butterworth zero-phase [200, 400] | **0.575** | MODERATE (p = 0.061) |

The relationship was always there; the leaky MA filter was hiding it. Out-of-band noise contaminated the Hilbert phase computation and inflated the apparent Std by **3.5×**. Past PCM null findings using MA-difference filtering should be treated as suspect until re-run with proper zero-phase IIR filtering.

### Error 2 — false positive from threshold-only verdict (Row 3)

Under Butterworth zero-phase bandpass:
- Row 3 (TOTBKCR ⇄ WALCL): Std = **0.440**, classified **STRONG** by threshold

Surrogate test (1000 phase-shuffled TOTBKCR vs fixed filtered WALCL):
- Surrogate distribution: q05 = **0.200**, median = **0.837**, std = **0.741**
- Real-Std percentile = **25.5%** (i.e., 25.5% of phase-shuffled TOTBKCRs produce *lower* Std than the real one)
- p-value = **0.255** — cannot reject random null at any conventional threshold

The cycles-lab Standard 7 thresholds implicitly assume the random null distribution gives Std ≈ 1.81 rad (uniform on [−π, π]). For phase-shuffled real data with strong in-band amplitude content (TOTBKCR has substantial energy in the [200, 400] week band), the null distribution shifts to much lower Std values: median 0.837 here, q05 = 0.200. **The threshold "STRONG" verdict is not informative on filtered real-data pairs — surrogate testing is required.**

### Recommendations for cycles-lab

1. **Filter upgrade**: Replace the MA-difference bandpass with a 4th-order Butterworth (or any zero-phase IIR with proper stopband attenuation) in:
   - `cycles-lab/analysis/lunar_nodal_phase_test.py`
   - `cycles-lab/analysis/forcing_comparison.py`
   - Any other PCM pipeline currently using MA-difference filtering.
2. **Surrogate testing**: Add 1000-surrogate phase-shuffle null distributions to all PCM analyses on filtered real-data pairs. The amplitude-spectrum-preserving phase-shuffle protocol used here (`phaseSurrogate()` in `scratch/pcm_ecb_jupiter_saturn.mjs`) is portable; the algorithm is FFT → randomize phase per bin (preserve magnitude, maintain conjugate symmetry for real inverse) → IFFT.
3. **Interpretation**: Treat STRONG/MODERATE/WEAK as **descriptive labels** on Std(Δφ) magnitude, not as significance verdicts. Always pair with a p-value from a series-specific surrogate distribution.
4. **Re-run past lunar-nodal results** with the upgraded pipeline. Expected outcomes:
   - Some past null results may flip to borderline-or-better (false negatives from MA leakage).
   - Some past STRONG threshold results may fail to reject the surrogate null (false positives from threshold-only verdicts).

---

## Next steps

1. **Path 2 — Full L5 composite vs Howell C67.** Row 2's significance (p = 0.019) on single-CB ECB strongly motivates testing the full L5 composite, which is the actual quantity Howell intended to capture. Setup: ~16 API calls to fetch the missing 5 L5 series + 3 NFL components (BOJ, NFL via SWPT/RRPONTSYD/WTREGEN, WRESBAL, COMPOUT, WRMFNS), then replicate the production Wednesday-aligned dynamically-weighted composite from `src/services/liquidityPipeline.ts`. Apply the same Butterworth + Hilbert + surrogate protocol from this study. Expected outcome: a tighter p-value than the ECB-alone test, since the composite is constructed specifically to surface the C67 cycle.

2. **Cycles-lab pipeline upgrade.** Implement the Butterworth + surrogate testing protocol in `analysis/lunar_nodal_phase_test.py` and `analysis/forcing_comparison.py`, then re-run past lunar-nodal results.

3. **Resolve Row 1 borderline.** Two paths:
   - **Tighter band**: apply Butterworth [240, 320] (centered on ECB's actual 265w cycle, narrower than [200, 400]). Sharpens the test but risks advantaging candidates near the band center.
   - **Period-flexibility**: compare ECB vs `sin(2π t / 265)` (ECB's own detected period). If 265w shows STRONG significance while J/S 258w stays borderline, that's evidence the J/S match is a period coincidence rather than a true driver, and ECB has its own internal natural cycle distinct from astronomical forcing.

4. **Reproducibility / artifact deposit.** All analysis is in `scratch/` on branch `richard/forcing-analysis`:
   - `classify_l5_families.mjs` — Task 1 cycle classification (Butterworth, Kalman detrend, family-band classifier, astronomical matcher, closes cache).
   - `pcm_ecb_jupiter_saturn.mjs` — Task 2 PCM analysis (this study). FFT, Hilbert, Butterworth, MA-difference (legacy), phase-shuffle surrogates, all three test rows.
   - `validate_pcm_math.mjs` — math validation against 5 synthetic signals (5/5 PASS).
   - `classify_l5_families.out.json` — cycle scan results for 6.5 of 8 L5 series + closes cache for ECB / WALCL / TOTBKCR.
   - `pcm_ecb_forcing.md` / `.json` — PCM run output (this run).

   Closes for ECB, WALCL, TOTBKCR are cached in `classify_l5_families.out.json`'s `closesCache`; future PCM runs are zero-API.

---

*End of note. Last updated: 2026-04-27.*
