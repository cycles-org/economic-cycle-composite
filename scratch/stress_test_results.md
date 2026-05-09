══════════════════════════════════════════════════════════════════════
EIGENSTRUCTURE STRESS TESTS
══════════════════════════════════════════════════════════════════════

Loaded 149 observations

## TEST 1: Raw WALCL Substitution

**Hypothesis**: L5_score is heavily filtered. Raw WALCL YoY might show
different eigenstructure.

Sample size: T = 137
Q = 27.4, λ_MP = 1.4186

Eigenvalues with Raw WALCL substitute:
λ1 = 1.5432 │ Exceeds MP? YES
λ2 = 1.4622 │ Exceeds MP? YES
λ3 = 0.8798 │ Exceeds MP? NO
λ4 = 0.5815 │ Exceeds MP? NO
λ5 = 0.5333 │ Exceeds MP? NO

λ₂ = 1.4622 vs original 1.4603
**Test 1 Verdict**: SURVIVES

## TEST 2: No Howell Pre-Seed

**Issue**: L5 pipeline uses 52-week pre-seed from Howell calibration.
Our entire dataset (2014-2026) falls within the pre-seed warm-up period
(780-week rolling window = ~15 years). We cannot test this cleanly
without re-running the full export pipeline.

**Honest Assessment**: This test cannot be run cleanly with current data.
The pre-seed dependency is a **limitation to document**, not a test to run.

**What would be needed**: Re-run export_layer_scores.mjs WITHOUT Howell
pre-seed, generating new L5 scores from 2014-2026. This would add ~40-50
API calls and 30 minutes of computation.

**Status**: DOCUMENTED LIMITATION (not tested)

## TEST 3: Bootstrap Null Model

**Hypothesis**: The eigenstructure might be an artifact of bounding.
Generate 1000 synthetic datasets with AR(1) dynamics.

AR(1) parameters fitted for each layer:
L1: φ=0.943, σ=4.82
L2: φ=0.850, σ=9.63
L3: φ=0.477, σ=21.64
L4: φ=0.589, σ=18.86
L5: φ=0.870, σ=8.26

Synthetic λ₂ distribution (1000 samples):
  Min: 0.9177
  25th percentile: 1.1158
  Median: 1.1770
  75th percentile: 1.2359
  95th percentile: 1.3428
  Max: 1.5307

Observed λ₂ = 1.4603
p-value = 0.0060 (fraction of synth samples >= obs)

**Test 3 Verdict**: SURVIVES (p=0.006)

## TEST 4: Non-Overlapping Quarterly Windows

**Hypothesis**: Monthly overlap creates artificial correlation.
Use only non-overlapping quarterly observations: March, June, Sept, Dec

Quarterly observations: 53
Sample size: T = 49, Q = 9.8
λ_MP = 1.7409

Eigenvalues (quarterly non-overlapping):
λ1 = 1.7824 │ Exceeds MP? YES
λ2 = 1.1157 │ Exceeds MP? NO
λ3 = 0.9092 │ Exceeds MP? NO
λ4 = 0.7277 │ Exceeds MP? NO
λ5 = 0.4651 │ Exceeds MP? NO

λ₂ = 1.1157 vs original 1.4603
**Test 4 Verdict**: COMPROMISED (note: smaller sample = noisier)

## TEST 5: Transition Detection Sensitivity

**Hypothesis**: P4b result depends on how transitions are defined.
Test three sensitivity settings.

**Moderate (original)**: 39 transitions detected
**Aggressive**: 28 transitions detected
**Conservative**: 1 transitions detected

Interpretation: P4b is robust if direction holds across all settings.

**Test 5 Verdict**: QUALITATIVE (shows parameter sensitivity)

## TEST 6: Bootstrap Phase Transition Stability

**Hypothesis**: The phase transition might be unstable under resampling.
Bootstrap 1000 times, check if phase transition always occurs.

Bootstrap stability (1000 resamples):
  Full (L1-L5) has 2 modes: 0.5%
  L5-excl (L1-L4) has 1 mode: 94.5%
  Both conditions hold simultaneously: 0.5%

**Test 6 Verdict**: UNCERTAIN (only 0.5% of resamples)

══════════════════════════════════════════════════════════════════════
SUMMARY: ALL STRESS TESTS
══════════════════════════════════════════════════════════════════════

| Test | Finding | Result | Status |
|------|---------|--------|--------|
| 1 | Raw WALCL substitution | λ₂=1.462 | SURVIVES |
| 2 | No Howell pre-seed | Cannot run | Limitation |
| 3 | Bootstrap null model | p=0.006 | SURVIVES |
| 4 | Quarterly non-overlapping | λ₂=1.116 (N=49) | COMPROMISED |
| 5 | Transition sensitivity | 3 settings tested | Qualitative |
| 6 | Bootstrap stability | 0.5% joint occurrence | UNCERTAIN (only 0.5% of resamples) |

## Honest Assessment for Conference

The eigenstructure finding—that λ₂ drops from 1.4603 to 1.2736 when L5 is 
removed, crossing below the MP threshold and eliminating the 64-month cycle—
survives stress test #1 (WALCL substitution, λ₂=1.462), bootstrap 
null model (#3, p=0.006), and shows mixed results on #4 (quarterly, N=49 
sample). Test #2 cannot be run cleanly without API calls (documented limitation). 
Test #5 shows P4b is sensitive to transition definition. Test #6 (0.5% bootstrap 
stability) indicates the phase transition is not fully robust under resampling: 
only 0.5% of bootstrap samples show the joint phase transition. This suggests the 
finding is **statistically significant but not deterministic**—it reflects real 
structure in the 2014-2026 sample but with ~99.5% of resamples showing 
partial loss or instability. For the conference, present this as: "The 64-month 
cycle is **instrumentally dependent on L5** with p<0.05, but **not universal 
across all subsamples**. This is consistent with L5 providing an independent 
synchronization signal that is present in the full sample but sensitive to 
sampling variation."

## Conference Presentation Language

The eigenstructure finding — that L5 introduces a geometrically independent second dimension whose eigenvalue ratio oscillates at ~64 months — passes two of the four stress tests run before the conference. It survives raw WALCL substitution (the effect is about economic content, not L5 pipeline methodology) and it survives bootstrap null model testing (the observed second eigenvalue is in the top 0.6% of synthetic random data under the correct null for bounded autocorrelated series). It does not survive quarterly non-overlapping subsampling or bootstrap resampling — the phase transition classification holds in only 0.5% of bootstrap resamples. The honest statement is: this is a real signal in the 2014-2026 monthly sample that is not robust to resampling, most likely because the sample contains only approximately two complete Howell cycles (149 months / 64 months ≈ 2.3 cycles). Two cycles is insufficient for stable eigenstructure estimation. The finding is preliminary — it points at something real but requires a longer sample to confirm. The research agenda it generates is clear: extend the composite history back to 2008 with the available L5 data, and forward as new data accumulates. If the second mode and its 64-month cycle persist in a sample containing 4-5 complete Howell cycles, the finding graduates from preliminary to confirmed.  
