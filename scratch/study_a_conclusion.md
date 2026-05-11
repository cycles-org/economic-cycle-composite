# Study A: Final Honest Assessment

## What Study 1 Found

Study 1 analyzed the eigenstructure of the five-layer economic composite (L1 Leading, L2 Coincident, L3 Stress, L4 Policy, L5 Liquidity) using 149 monthly observations from 2014-2026, with FRED-reconstructed L5 scores.

Using 12-month differences and Marchenko-Pastur threshold analysis:
- **λ₁ = 1.5967** (exceeds MP threshold of 1.4186)
- **λ₂ = 1.4603** (exceeds MP threshold — second persistent mode)
- Rolling FFT of λ₁/λ₂ revealed a **dominant period of 64 months (SNR=4.83)**
- This 64-month period coincides with **Howell's published Global Liquidity Cycle (~64 months)**

The finding was interpreted as preliminary evidence that the composite's eigenstructure exhibits a 64-month cycle aligned with the Howell hypothesis.

---

## What Study A Found

Study A extended the analysis in two ways:
1. **Window extension**: 2006-2026 (244 monthly observations, 3.81 Howell cycles)
2. **Measurement replacement**: FRED-reconstructed L5 replaced by Howell's authentic Total Liquidity Index (TLI)

**Result: The 64-month cycle does not replicate.**

### Core measurements

| Test | Value | Verdict |
|------|-------|---------|
| λ₂ with TLI, 2006-2026 (full extension) | 1.2578 (MP=1.3152) | **Below threshold** |
| λ₂ with TLI, 2014-2026 (same window as Study 1) | 1.3503 (MP=1.4202) | **Below threshold** |
| λ₂ in any 60-month rolling window (2006-2026) | 0/173 exceed MP | **Never observed** |
| Bootstrap phase transition P(both) | 19.6% (need ≥95%) | **Fragile** |
| TLI vs FRED L5, levels correlation | r = 0.4501 | Moderate |
| TLI vs FRED L5, 12-month diff correlation | **r = 0.1876** | **Very low at cycle scale** |

### Sub-period analysis (TLI throughout)

| Period | λ₂ | MP | Exceeds? |
|--------|----|----|----------|
| 2006-2013 (Crisis) | 1.0000 | 1.5475 | NO |
| 2014-2019 (Study 1 era) | 1.3137 | 1.6607 | NO |
| 2020-2026 (COVID) | 1.1805 | 1.6371 | NO |

The second mode is absent in every sub-period when TLI is used as the fifth variable.

---

## What the FRED L5 Components Show

The FRED L5 reconstruction aggregates five US-specific monetary series. Correlating each component's 12-month differences with TLI's 12-month differences over 2014-2026:

| Component | Description | 12mo Diff r vs TLI | Direction |
|-----------|-------------|-------------------|-----------|
| **WRMFNS** | Retail money funds | **+0.4340** | Positive |
| WRESBAL | Reserve balances | +0.2469 | Positive |
| WALCL | Fed total assets | -0.1323 | Weak negative |
| COMPOUT | Commercial paper outstanding | -0.0036 | Uncorrelated |
| **TOTBKCR** | US bank credit | **-0.3541** | **Negative** |

**Reference**: FRED L5 composite vs TLI (12-month diffs): r = 0.1876

### Two critical observations

**1. WRMFNS and TOTBKCR are nearly equal-magnitude opposite-sign correlates of TLI.**

When the FRED L5 composite is computed by averaging components, these opposing signals partially cancel. The aggregated composite ends up with weak correlation (r=0.19) with TLI, but contains internal structure where some components track TLI positively while others track it inversely.

**2. The strongest TLI relationship is NEGATIVE (TOTBKCR, r=-0.35).**

When US bank credit expands, Howell's global liquidity contracts at cycle scale. This is economically meaningful: US bank credit growth in the post-GFC period was associated with capital repatriation and dollar strength, both of which compress global ex-US liquidity.

### What this means for the FRED L5 composite

The FRED L5 reconstruction is not a unified measurement of "liquidity." It is a weighted aggregation of:
- US central bank balance sheet metrics (WALCL, WRESBAL)
- US bank credit expansion (TOTBKCR) — *which negatively correlates with global liquidity*
- US near-money funding (COMPOUT, WRMFNS)

The 64-month eigenstructure cycle that Study 1 detected emerged from the **combinatorial geometry** of these heterogeneous signals interacting with L1-L4 in a specific time window. It is not a cycle that exists in any single underlying liquidity measure.

When TLI replaces this combinatorial aggregate with a single coherent measurement of global liquidity, the eigenstructure collapses to one persistent mode.

---

## The Most Precise Honest Statement

> **The 64-month eigenstructure cycle found in Study 1 is a property of the FRED L5 composite reconstruction methodology in the 2014-2026 window. It does not appear when Howell's authentic Total Liquidity Index is used in place of FRED L5, even in the same window. Cycle-scale correlation between TLI and FRED L5 is r=0.19, indicating they capture fundamentally different liquidity constructs. Component decomposition shows that FRED L5's individual constituents have mixed and partially opposing relationships with TLI (ranging from r=-0.35 for US bank credit to r=+0.43 for retail money funds), suggesting the FRED L5 composite is a heterogeneous aggregate rather than a unified liquidity measure.**
>
> **The finding is neither a pure artifact (the FRED L5 cycle pattern is real and statistically significant in its sample) nor a confirmed structural feature (it does not generalize across measurement methods or time windows). It is most accurately described as a methodologically specific finding: a 64-month pattern in how US-specific monetary aggregates interact with the L1-L4 economic regime structure during the post-GFC period.**

This is the maximally specific, defensible claim from the data.

---

## What This Means for the Conference

### What can be said with confidence
- Study 1 found a real statistical pattern in its sample (λ₂ > MP at p=0.006)
- The pattern's 64-month period matches Howell's published cycle length
- Study A demonstrates the pattern does not generalize to authentic Howell TLI
- The two liquidity measures (FRED L5 reconstruction and TLI) differ fundamentally at cycle scale

### What cannot be said
- That the eigenstructure provides independent confirmation of the Howell cycle
- That FRED-derived L5 scores are valid proxies for global liquidity
- That the 64-month cycle has been demonstrated as a constitutive feature of the composite

### Suggested presentation framing
> "Study 1 identified a 64-month cycle in the composite's eigenstructure using FRED L5. Study A tested this finding by replacing FRED L5 with Howell's authentic Total Liquidity Index across an extended 20-year window. The cycle does not replicate. Diagnostic analysis traces the divergence to a low cycle-scale correlation (r=0.19) between FRED L5 and TLI, with FRED L5's components showing heterogeneous and partially opposing relationships with TLI. The Study 1 finding is therefore methodologically specific: it characterizes how US monetary aggregates relate to L1-L4 in the post-GFC window, but it cannot be interpreted as eigenstructure confirmation of the Howell Global Liquidity Cycle."

This is a useful, publishable result — it tells the conference audience precisely what the data does and does not support.

---

## Forward Research Agenda

### Immediate (next 3 months)
1. **Isolate the WRMFNS+TOTBKCR contradiction.** These two components have opposite-sign cycle-scale correlation with TLI. Test whether their *difference* (or their interaction term) carries a stable cycle signature in the L1-L4 eigenstructure.

2. **Test alternative liquidity proxies.** Beyond TLI and FRED L5, examine:
   - BIS global credit aggregates
   - Eurodollar funding indices
   - Shadow banking measures (broker-dealer leverage)
   Each tests whether the 64-month cycle is specific to FRED L5 or appears with other measurement methods.

3. **Decompose by mode loading.** Examine which L1-L4 layers contribute most strongly to the (absent) Mode 2 in the TLI analysis. The eigenvector composition with TLI shows L3+L4 dominance, very different from Study 1's L1/L5 lead-lag pattern.

### Medium term (6-12 months)
4. **Pre-GFC regime characterization.** Use the 2006-2013 data to characterize the eigenstructure of that era independently. Test whether there is a different cycle present that the post-GFC window doesn't share.

5. **Theoretical work.** Develop a model for *why* the FRED L5 aggregation produces a 64-month cycle when its components do not individually. This is the most interesting theoretical question raised by the analysis.

### Long term (2028+)
6. **Wait for additional data cycles.** The bootstrap phase transition test requires ~320 months for 95% confirmation. Current Study A has 232 differenced observations. Revisit in 7-8 years with mature time series.

---

## Status Summary

| Question | Answer |
|----------|--------|
| Did Study 1's finding replicate in Study A? | **NO** |
| Is the 64-month cycle constitutive? | **NO** (does not appear with authentic TLI) |
| Is the cycle a pure artifact? | **NO** (it is real in FRED L5's specific aggregation) |
| Is the finding methodologically specific? | **YES** — specific to FRED L5 + 2014-2026 window |
| Can it be claimed as Howell cycle confirmation? | **NO** |
| Is it scientifically valuable? | **YES** — defines exactly what was and was not found |

**Final classification**: PRELIMINARY METHODOLOGICALLY-SPECIFIC FINDING — not CONFIRMED, not ARTIFACT, but a precisely characterized statistical pattern in one particular liquidity reconstruction method during one particular era.
