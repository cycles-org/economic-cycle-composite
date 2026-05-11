# Study A: Executive Brief

## What Was Built
Study A extended the eigenstructure analysis from 2014-2026 (Study 1) to the full 20-year period (2006-2026) using Howell's proprietary Total Liquidity Index (TLI) instead of FRED-reconstructed L5 scores.

## What Was Found
**The 64-month Howell cycle does not appear in the extended dataset.**

| Metric | Study 1 (2014-26, L5) | Study A (2006-26, TLI) | Result |
|--------|----------------------|----------------------|--------|
| λ₂ | 1.4603 | 1.2578 | **13.8% decline** |
| Exceeds MP? | YES ✓ | NO ✗ | **Mode lost** |
| Modes | 2 | 1 | **Signal collapse** |
| FFT period | 64 months ✓ | Cannot compute | **Cycle absent** |

## Why This Matters

**Study 1 found a 64-month cycle (PASS) in a specific 12-year window (2014-2026) with synthetic L5 data.**

**Study A tests whether this cycle is:**
- **Constitutive** (fundamental to economic structure) → Would replicate with TLI
- **Instrumental** (artifact of measurement method) → Would disappear with authentic data

**Result: The cycle disappeared.** This suggests it was specific to that window and that measurement approach.

## Stress Test Verdicts

| Test | What It Tests | Result |
|------|---------------|--------|
| 1-2 | Data integrity | ✓ Valid |
| 3 | Statistical robustness | ✗ Subthreshold |
| 4 | Decimation robustness | ✗ Fails |
| 5 | Transition sensitivity | ✗ Sensitive |
| 6 | Phase transition | ✗ Fragile (19.6% vs 95% required) |

## What Changed Between Study 1 and Study A?

### Data Differences
1. **Time window**: 2014-2026 (post-GFC) vs 2006-2026 (includes pre-crisis)
2. **L5 measure**: FRED reconstruction vs Howell's direct TLI
3. **Sample size**: 137 differenced obs vs 232 differenced obs

### Which Was Decisive?
The analysis shows that **adding 2006-2013 data with authentic TLI breaks the signal**. The mode that existed in 2014-2026 (with L5) does not persist when:
- Extended backward to include 2006-2013
- Measured with Howell's actual TLI

This suggests the cycle was **window-dependent, not structure-dependent**.

## For the Conference Talk

### Honest Version (Recommended)
> "Study 1 identified a 64-month eigenstructure in 2014-2026 with FRED-reconstructed L5 scores. Study A extends to 2006-2026 using Howell's authentic TLI, and finds that the mode collapses below the Marchenko-Pastur threshold. The cycle is preliminary and does not replicate in the extended data with direct TLI measurement."

### Key Talking Points
1. **This is not a failure — it's a successful negative result**
   - Negative results are more valuable than false positives
   - They teach us about the limits of the hypothesis

2. **The hypothesis was testable and got tested honestly**
   - Six specific stress tests were pre-registered
   - All results reported, both positive and negative
   - The phase transition test hit the hardest: only 19.6% when we need 95%

3. **Next steps are now clear**
   - Why does 2014-2026 differ from 2006-2026?
   - Is there a regime break in the financial crisis?
   - What if we use different liquidity proxies?
   - How much longer must we wait for more complete cycles?

## Conclusion

**Study A does not confirm Study 1.** The 64-month Howell cycle appears to be specific to the 2014-2026 window and the FRED L5 reconstruction, not a robust feature of the economic composite eigenstructure across the full 20-year span with authentic TLI data.

**Status**: PRELIMINARY (not confirmed)

**Next checkpoint**: 2028-2029, when we'll have ~4 complete Howell cycles for the bootstrap phase transition test.

---

**Files Generated**:
- `eigenstructure_tli.mjs` — Analysis code
- `eigenstructure_tli_results.md` — Parts A-C (correlation, eigendecomposition, composition)
- `eigenstructure_tli_stress_tests.md` — Six stress tests with verdicts
- `STUDY_A_COMPARISON.md` — Detailed comparison with Study 1
- `STUDY_A_BRIEF.md` — This executive summary

