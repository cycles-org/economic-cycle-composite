---
name: economic-cycle-composite
description: Hand-off skill for working on the Economic Cycle Composite project. Gives Claude Code enough context to navigate the codebase, run the pipeline locally, and extend/modify it without re-deriving the architecture. Use whenever the user is editing, debugging, or extending this project.
---

# Economic Cycle Composite — Claude Code Skill

This skill is a hand-off document for anyone (or any Claude Code session) picking up this codebase. It is **not** a replacement for the methodology documents in `docs/`; it is an index and a set of working notes that point you at the right doc for the question you have.

## Companion Skill (Required)

This project depends on the **`cycle-tools-api`** skill, a private Anthropic-Claude skill that wraps the Cycle Tools REST API at `api.cycle.tools`. Install that skill before doing any cycle-related work here — it contains:

- Authoritative endpoint reference (`/api/cycles/CycleScanner`, `/api/cycles/CRSI`, `/api/DSP/Detrend`, etc.)
- The canonical phase-scoring lookup tables (PHASE_FIXED, PHASE_INTERPOLATED)
- Correct parameter names (notably `dtype` lowercase, **not** `dType`)
- CRSI band+direction scoring spec (Method A: crossing override + 6-state base)

If you do not have the `cycle-tools-api` skill, request it from the repository owner before continuing. Without it, you will re-derive details that are already specified and likely get subtle parameters wrong.

## Read These Three Documents First

In this order:

1. **`docs/composite-methodology.md`** — The overall 5-layer model (L1-L5) with weights, divergence overlays, regime bands, narrative templates. This is the 30,000-foot view.
2. **`docs/liquidity-layer-methodology.md`** — Deep dive on the L5 liquidity layer (Howell's framework, 8-series architecture, phase scoring, CRSI band scoring, Section 15 implementation pitfalls).
3. **`docs/liquidity-pipeline-specification.md`** — The authoritative step-by-step specification for the L5 pipeline. When the methodology doc and the spec disagree, **the spec is canonical**.

## Code Map

| File | Responsibility |
|------|---------------|
| `src/App.tsx` | Top-level state, pipeline orchestration, run button |
| `src/services/pipeline.ts` | Per-series pipeline for L1-L4 (fetch → CycleScanner → score) |
| `src/services/liquidityPipeline.ts` | **L5 — the one to read carefully.** 8-series GLC pipeline, structural cycle detection, Howell pre-seed, display score |
| `src/services/cycleToolsApi.ts` | REST API wrappers (`cycleScanner`, `cycleScannerNoDetrend`, `getCrsi`, `hpDetrend`, `ensureDataset`) |
| `src/services/composite.ts` | Master composite formula + divergence overlays |
| `src/services/phaseScoring.ts` | `interpolatePhaseScore(avgPhaseStatus, avgPhaseScore)` → 0-100 |
| `src/services/projection.ts` | Forward projection engine (sinusoidal cycle model) |
| `src/services/narrative.ts` | Rule-based reasoning text generation |
| `src/config/seriesRegistry.ts` | All series config: `L1_SERIES`, ..., `LIQUIDITY_SCORED_SERIES`, `LIQUIDITY_NFL_COMPONENTS`, `LIQUIDITY_FX_TICKERS` |
| `src/config/layerSummaries.ts` | Per-layer regime labels & reasoning text |
| `public/US-GLI-MOM.csv` | **Historical liquidity-momentum pre-seed (1975-2025) — runtime data, not committed to the public repo.** Obtain it from the maintainer and drop into `public/` before running the L5 pipeline. Listed in `.gitignore` so it stays out of git. Without it the structural cycle score will be off by 15-20 points. |

## Running Locally

```bash
npm install
npm run dev
```

Open the Vite URL, paste your Cycle Tools API key, click "Run Pipeline". All data fetches happen client-side. The pipeline takes ~15–20 seconds depending on API latency.

## The 4 Critical Implementation Pitfalls

These each cost significant debugging time during initial implementation. They are documented in `docs/liquidity-layer-methodology.md` Section 15, but repeated here because they are easy to regress:

### 1. Howell pre-seed is REQUIRED, not optional

`liquidityPipeline.ts` fetches `public/US-GLI-MOM.csv`, calibrates it via linear regression against our HP-detrended composite YoY, expands monthly to weekly (×4.33), and prepends to the HP series **before** running `rollingPctRank(780)`. The pre-seed bars are then stripped from the output.

Without this, the 780-week pctrank window has ~15 years of warm-up artifacts. Narrow CRSI bands (width ~8 instead of ~9) cause the CycleScanner to return wrong phase (TOP_Departure instead of Downtrend_Starting). Structural score off by 15–20 points. Display score off by 12–16 points.

### 2. API parameter casing: `dtype`, not `dType`

The Cycle Tools REST API expects **lowercase** `dtype` in query parameters. Using `dType` (capital T) may silently fall back to a different detrending mode. Always lowercase.

### 3. `bartelsLimit` differs between the structural and component paths

- **Structural CycleScanner** (restricted 238–368 bar band): `bartelsLimit=10`
- **Component CycleScanner** (individual 8 series): `bartelsLimit=49` (default)

Using 10 for components selects different dominant cycles for several series and produces score divergence vs the reference.

### 4. Wednesday alignment is priority search, not nearest-neighbor

For each Wednesday, search: day 0 → day −1 → day +1 → day −2 → day +2 → ... → day −5 → day +5. **First match wins.** Not "closest observation within ±5 days." The priority order has a slight earlier-date bias, matching the reference.

## Validation Targets

When modifying L5, verify against the reference LiquidityModel (separate project). Expected outputs as of Apr 2026:

- Structural cycle: **C285 weekly bars (~66 months)** — matches Howell's published C67
- Structural phase: Downtrend_Starting (score ~28)
- Individual series scores are the primary regression signal — drifts of >3pts on any individual series mean something fundamental changed

## Common Extension Tasks

### Adding a new series to L1-L4

1. Add config to `src/config/seriesRegistry.ts` in the appropriate layer array
2. Add per-series description to `src/config/seriesDescriptions.ts` if creating UI detail cards
3. Re-run backtest to re-optimize weights if needed (`scripts/backtest-v2.ts`)
4. Update `docs/composite-methodology.md` series inventory table

### Changing L5 weights or adding a liquidity series

Do not change L5 weights casually. The 8-series weights (WALCL=3, rest=1) are tied to Howell's dollar-dominance principle. If you must:

1. Update `LIQUIDITY_SCORED_SERIES` in `seriesRegistry.ts`
2. Update all three liquidity docs in `docs/` (weights, total weight, percentages)
3. Re-validate structural cycle detection produces ~C285 (adding a series with different amplitude can shift the detected cycle length)

### Tweaking CRSI band scoring

The algorithm is in `src/services/liquidityPipeline.ts` functions `detectBandCrossing`, `bandRelativeCrsiScore`, `getCrsiDirection`. Match changes to `docs/liquidity-layer-methodology.md` Section 5.

## Don'ts

- **Don't** rewrite `liquidityPipeline.ts` from scratch based on "common sense" — the exact pipeline matters for matching the reference.
- **Don't** remove the Howell pre-seed to "simplify." It's load-bearing.
- **Don't** use `dType` (capital T) anywhere.
- **Don't** strip nulls from Wednesday-grid-indexed arrays before computing 52w YoY — index `i-52` must point to exactly 52 weeks back.
- **Don't** commit API keys. The app is designed to take them from user input at runtime.

## When Docs Disagree

Authority order, highest to lowest:

1. `docs/liquidity-pipeline-specification.md` (step-by-step spec)
2. Reference implementation in the companion `LiquidityModel` repository (if available)
3. `docs/liquidity-layer-methodology.md` (conceptual document)
4. `docs/composite-methodology.md` (top-level summary)
5. This SKILL.md file
6. Code comments

If the spec and the methodology disagree, fix the methodology. If the spec and the code disagree, figure out which is correct and sync the other.
