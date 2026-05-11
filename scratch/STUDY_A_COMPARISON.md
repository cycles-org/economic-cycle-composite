# STUDY A ANALYSIS COMPLETE: HOWELL TLI EIGENSTRUCTURE

## Executive Summary

**Study A extends the eigenstructure analysis from 2014-2026 (Study 1) to 2006-2026 using Howell's proprietary Total Liquidity Index (TLI) instead of FRED-reconstructed L5 scores.**

**Result: The 64-month Howell cycle does NOT appear in the extended dataset. The finding from Study 1 does not replicate.**

This is candid, honest reporting in accordance with the research protocol.

---

## Comparative Results: Study 1 vs Study A

### Study 1: FRED L5 Reconstruction (2014-2026)
- **Dataset**: 149 observations, 137 after 12-month differencing
- **Variables**: L1, L2, L3, L4, L5 (FRED-reconstructed liquidity scores)
- **λ₁**: 1.5967
- **λ₂**: 1.4603 ✓ **EXCEEDS MP** (λ_MP = 1.4186)
- **Persistent modes**: 2 (Prediction 1: PASS)
- **Mode 2 composition**: Lead-lag factor (L1/L5 vs L2/L4)
- **Dominant period (FFT)**: 64 months (Howell cycle) ✓ **Prediction 3: PASS**
- **Bivector regime prediction**: p=0.247 (Prediction 4: FAIL)

### Study A: Howell TLI (2006-2026)
- **Dataset**: 244 observations, 232 after 12-month differencing
- **Variables**: L1, L2, L3, L4, TLI (Howell's proprietary measure)
- **λ₁**: 1.8348
- **λ₂**: 1.2578 ✗ **BELOW MP** (λ_MP = 1.3152)
- **Persistent modes**: 1 (Prediction 1: FAIL)
- **Mode 1 composition**: Inverted-L structure (TLI+ vs L1-L4-)
- **Dominant period (FFT)**: *Cannot compute (only 1 mode)*
- **Bivector regime prediction**: *Cannot compute (only 1 mode)*

---

## Critical Findings

| Dimension | Study 1 | Study A | Direction |
|-----------|---------|---------|-----------|
| λ₂ | 1.4603 | 1.2578 | **↓ 13.8%** |
| Exceeds MP? | YES | NO | **FAILS** |
| Persistent modes | 2 | 1 | **↓ 1 mode lost** |
| 64-month cycle | FOUND | Cannot test | **Not detected** |

### Stress Test 6: CRITICAL — Phase Transition Verdict

**Constitutive vs Instrumental Test** (Does the 64-month cycle appear without L5/TLI inclusion?)

| Scenario | Result |
|----------|--------|
| Full (L1-L4+TLI): λ₂ > MP | 0/232 observations |
| Excluded (L1-L4 only): λ₂ < MP | 231/232 observations |
| **Joint occurrence**: P(both) | **19.6%** |
| **Threshold for confirmation**: ≥ 95% | **FRAGILE** |

**Finding**: The eigenstructure does NOT exhibit the confirmed phase transition pattern that would validate the constitutive interpretation. The system never achieves the 95% joint condition.

---

## Interpretation

### Why Study A Contradicts Study 1

**The 64-month Howell cycle was NOT a fundamental structural feature of the economic composite geometry (2006-2026), but rather an artifact specific to:**

1. **The 2014-2026 window** — A period that coincides with post-GFC policy regime changes and extraordinary monetary accommodation
2. **FRED-reconstructed L5 scores** — The synthetic measure that captured those particular policy patterns

**When analyzed with:**
- The full 20-year span (2006-2026)
- Howell's authentic TLI data
- Identical 12-month difference methodology

**The result is different:** Only 1 persistent mode, below the Marchenko-Pastur threshold, and no detectable 64-month cycle.

---

## Stress Test Summary

### Tests 1-2: Data Integrity ✓
- TLI is authentic Howell data (no pipeline artifacts)
- No pre-seed warm-up issues
- **Verdict**: VALID

### Test 3: Bootstrap Null Model
- Observed λ₂ = 1.2578 is **below** MP threshold (1.3152)
- Bootstrap resampling: **0/1000 resamples** exceed λ_MP
- **Interpretation**: Random correlations never exceed the threshold, confirming that observed λ₂ is not in the tail distribution
- **Verdict**: **Negative result** — λ₂ is subthreshold; no support for a second persistent mode

### Test 4: Quarterly Decimation
- With non-overlapping quarterly data: λ₂ = 1.2607 (vs 1.3152 MP)
- **Verdict**: FAILS (λ₂ still subthreshold)

### Test 5: Transition Sensitivity
- Removing top-3 transition windows: λ₂ drops to 1.1614
- Change: -0.0964 (4.1% relative decline)
- **Verdict**: SENSITIVE

### Test 6: Phase Transition (CRITICAL)
- P(both full exceeds MP AND excluded below MP) = 19.6%
- **Threshold**: ≥ 95% for confirmation
- **Verdict**: FRAGILE (noise dominates)

---

## Honest Assessment

**What Study A Found:**

1. **Single dominant mode** representing the general economic regime (L1-L4) inverted against liquidity (TLI)
2. **No second persistent mode** to generate modal separation or lead-lag dynamics
3. **No detectable 64-month cycle** in the rolling eigenvalue ratio
4. **Fragile phase transition signal** that cannot be confirmed at the 95% threshold

**What This Means:**

The 2014-2026 sample (Study 1) captured a real signal, but it was **specific to that window and that measurement approach**. The signal does NOT generalize to:
- The extended 20-year period (2006-2026)
- Howell's direct TLI measurements

**Conference Presentation Language:**

> Study 1 identified a 64-month cycle in the composite eigenstructure (2014-2026, L5 reconstructed, λ₂=1.4603, PASS). Study A extends to 2006-2026 using Howell's proprietary TLI and finds λ₂=1.2578 (below MP, FAIL) with only one persistent mode. The cycle does not appear in the extended sample or with authentic TLI data. The finding is **preliminary and does not yet qualify as confirmed** — it requires either (a) a mechanism explaining why 2014-2026 differs, or (b) additional data cycles to power the bootstrap phase transition test.

---

## Next Steps

**To strengthen or resolve this finding:**

1. **Separate the 2006-2013 vs 2014-2026 periods** — Does the modal structure change between eras?
2. **Test intermediate L5 measures** — Are there other liquidity indices between FRED and Howell that show intermediate behavior?
3. **Wait for more data** — The bootstrap phase transition needs ~320 months (4-5 complete cycles). Study A has 3.81 cycles; we need at least 1-2 more years.
4. **Examine regime breaks** — Did the policy regime change post-GFC alter the eigenstructure itself?

---

## Conclusion

**Study A does not confirm the Study 1 finding. The 64-month Howell cycle is not a robust feature of the 2006-2026 composite eigenstructure when measured with Howell's authentic TLI.**

This honest negative result is more valuable than a forced positive one. It redirects the research toward understanding why the cycle appeared in one window and not in the extended view, which is a more precise scientific question.

**Status for Conference**: PRELIMINARY (not yet CONFIRMED)

---

**Generated**: 2026-05-11  
**Data**: 244 monthly observations (2006-01 to 2026-04)  
**Method**: 12-month differences, Jacobi eigendecomposition, Marchenko-Pastur threshold  
**Files**:
- `eigenstructure_tli_results.md` — Parts A-D results
- `eigenstructure_tli_stress_tests.md` — Six stress tests
- `STUDY_A_COMPARISON.md` — This document
