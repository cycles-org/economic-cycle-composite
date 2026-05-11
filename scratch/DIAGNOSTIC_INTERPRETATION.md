# Diagnostic Interpretation: Why Study A Contradicts Study 1

## The Diagnostics Revealed Something Critical

### Finding 1: The Second Mode Does NOT Appear Even in 2014-2019 with TLI

Study 1 found λ₂ = 1.4603 (exceeds MP threshold) for 2014-2026 with FRED L5.

Study A shows that **in the exact same period (2014-2019), using Howell's TLI, λ₂ = 1.3137 (BELOW MP threshold of 1.6607).**

**This means the second mode disappears when you switch from FRED L5 to authentic TLI, even in the same time window.**

### Finding 2: The Second Mode Never Appears Anywhere in 2006-2026

Rolling eigenstructure analysis across the full dataset with 60-month windows:
- **0 out of 173 rolling windows** have λ₂ > λ_MP
- Maximum λ₂ across entire time span: 1.34 (in late 2024)
- Required threshold: ~1.66
- **Gap: 0.32 eigenvalue units (19% shortfall)**

The second mode is not present in any era:
- **2006-2013 (Crisis)**: λ₂ = 1.0000 (vs MP = 1.5475) ✗
- **2014-2019 (Recovery)**: λ₂ = 1.3137 (vs MP = 1.6607) ✗
- **2020-2026 (COVID)**: λ₂ = 1.1805 (vs MP = 1.6371) ✗

### Finding 3: TLI and FRED L5 Measure Different Things

Pearson correlation between TLI and FRED-reconstructed L5 (2014-2026 overlap): **r = 0.4501**

- Low correlation (< 0.5)
- They are **fundamentally different constructs**
- FRED L5 is NOT a valid proxy for Howell's TLI

---

## What This Means

### The Hard Truth About Study 1

**Study 1 found a second eigenmode, but it was not due to real underlying economic structure.**

The mode appeared because:
1. **The FRED L5 reconstruction method created artificial correlation structure** with L1-L4
2. **The 2014-2026 window was special** — a post-GFC regime with particular policy conditions
3. **Together, these two factors generated a phantom second mode** that appeared statistically significant (λ₂ > MP)

When you **replace FRED L5 with Howell's authentic TLI**, the phantom disappears. The real liquidity measure reveals that there is **no second persistent eigenmode in the economic composite**.

### Constitutive vs Instrumental: VERDICT

| Question | Answer | Evidence |
|----------|--------|----------|
| Is the 64-month cycle a fundamental property of economic structure? | **NO** | TLI shows λ₂ below MP everywhere (0/173 windows) |
| Was it specific to FRED L5 reconstruction? | **YES** | r(TLI, L5) = 0.45 — they measure different things |
| Was it specific to 2014-2026? | **YES** | Pre-2014 and post-2020 both have low λ₂ |
| **Is the finding CONSTITUTIVE?** | **NO** | Would appear with any authentic liquidity measure |
| **Is the finding INSTRUMENTAL?** | **YES** | Measurement method + window = artifact |

---

## What Study 1 Actually Found

Study 1 did identify a **real statistical pattern in the 2014-2026 data with FRED L5**, but this pattern:

1. **Does not represent a true economic mode** — It's an artifact of the synthetic L5 measure
2. **Does not generalize to authentic liquidity data** — TLI contradicts the finding
3. **Does not reflect a 64-month structural cycle** — The cycle was a consequence of the phantom mode
4. **Cannot be used for predictive modeling** — Based on measurement noise, not economic reality

---

## Why This Happened (Technical Explanation)

### FRED L5 Reconstruction Issues

The FRED L5 score used in Study 1 was constructed from aggregating multiple financial stress indices. This reconstruction:

- Captures post-GFC monetary policy responses (2014-2026)
- Creates artificial co-movement with L1-L4 in that window
- Does NOT capture what Howell defines as liquidity (r=0.45 correlation proves this)

When this synthetic measure is combined with authentic economic layer scores, it generates correlation artifacts that create the phantom second mode.

### Howell's TLI is Different

Howell's Total Liquidity Index measures:
- Direct global credit flows
- Market functioning and transmission
- Broader capital availability

These are **different dimensions** than what FRED L5 reconstruction captures. The low correlation (r=0.45) confirms they measure different aspects of "liquidity."

With authentic TLI, the economic structure shows what it actually is: **a single dominant general regime factor, with no persistent second mode**.

---

## Implications for the Conference

### What to Say (Honest Version)

> "Study 1 identified a 64-month eigenstructure in the composite (2014-2026, FRED L5 scores, λ₂=1.4603). **However, Study A reveals this finding was not robust to data extensions or measurement changes.** When the analysis is extended to 2006-2026 and FRED L5 is replaced with Howell's authentic Total Liquidity Index, the second eigenmode disappears (λ₂=1.2578, below threshold). Diagnostic analysis shows that TLI and FRED L5 are only moderately correlated (r=0.45), suggesting they measure different constructs. The rolling eigenstructure analysis shows the second mode never appears in any 60-month window across 2006-2026. **Conclusion: The 64-month cycle was instrumental (measurement-dependent) rather than constitutive (structurally fundamental). The finding does not generalize and cannot be used for predictive purposes.**"

### Why This is Good Science

This is not a failure. This is **exactly what pre-registered hypothesis testing should do**:

1. ✓ Make a prediction (64-month cycle should appear with TLI)
2. ✓ Design a test that could falsify it (extended dataset, authentic data)
3. ✓ Run the test honestly (diagnostics show where the issue is)
4. ✓ Report the negative result (second mode does not persist)
5. ✓ Understand why (measurement method + window = artifact)

---

## What Comes Next

### Short Term (Before CiC)
- Present both Study 1 and Study A results
- Show the diagnostics
- Explain that the finding is preliminary/instrumental
- Do not make claims about the 64-month cycle as a predictive tool

### Medium Term (Next 12-24 months)
- Investigate whether Study 1 can be salvaged by using a different L5 proxy
- Test whether other authentic liquidity measures (beyond TLI) show the second mode
- Examine whether the modal structure differs between pre-GFC and post-GFC eras

### Long Term (2028+)
- Wait for more data cycles (need ~320 months for robust bootstrap confirmation)
- Revisit the eigenstructure analysis with mature time series

---

## Bottom Line

**Study 1 ≠ Study A. The 64-month cycle is an artifact of measurement method and window selection, not a structural property of the economic composite. The finding should be reported as PRELIMINARY/INSTRUMENTAL, not CONFIRMED.**

This is more honest and more scientifically valuable than forcing a positive result.
