# Economic Cycle Composite

A client-side React + TypeScript SPA that analyzes **23 macro series + 8 liquidity series (31 total)** across 5 layers to produce a macro regime score (0–100) for equity cycle positioning.

The liquidity layer (L5) reconstructs a Global Liquidity Cycle from 8 public FRED/central-bank series and detects a ~66-month structural cycle.

## Architecture

### 5-Layer Composite

| Layer | Name | Weight | Series | Description |
|-------|------|--------|--------|-------------|
| L1 | Leading Indicators | 30% | 9 | Yield curve, claims, sentiment, JOLTS, permits, durable goods |
| L2 | Coincident Activity | 15% | 4 | Industrial production, payrolls, income, unemployment |
| L3 | Financial Stress | 20% | 4 | VIX, credit spreads (Baa, HY OAS), financial stress index |
| L4 | Inflation / Policy | 10% | 6 | CPI, core CPI, breakevens, Fed funds, M2, USD |
| L5 | Liquidity | 25% | 8 | WALCL, ECB, BOJ, NFL, TOTBKCR, WRESBAL, COMPOUT, WRMFNS |

### Regime Classification

| Score | Regime | Implication |
|-------|--------|-------------|
| >= 62 | Risk-On | Cyclical lows are buying opportunities |
| 55–61 | Neutral-Bullish | Mild tailwind, cycles work normally |
| 48–54 | Neutral | No macro edge |
| 38–47 | Neutral-Bearish | Macro headwind, rallies may fail |
| < 38 | Risk-Off | Cyclical patterns overridden by macro |

### Divergence Overlays

- **L1-L2 Divergence**: Leading indicators 25+ pts below coincident activity → regime downgrade (late-cycle warning)
- **L5-L1 Liquidity Divergence**: Liquidity 10+ pts below leading indicators → "liquidity-leading-downturn" flag (earliest pre-downturn signal)
- **L5 Regime Downgrade**: When L5 < 35, regime downgrades one notch (liquidity tightening override)

Full pre-downturn cascade: L5 tightens → L5-L1 diverges → L1-L2 diverges → regime deteriorates.

### Liquidity Layer (L5) — 8-Series Global Liquidity Composite

Reconstructs a ~65-month Global Liquidity Cycle from 8 dynamically-weighted series:

| Series | Weight | Role |
|--------|--------|------|
| WALCL (Fed Total Assets) | 3 | Dominant global CB |
| ECB Total Assets (USD, FX-adj) | 1 | Euro area CB |
| BOJ Total Assets (USD, FX-adj) | 1 | Japan CB |
| NFL (Net Fed Liquidity, derived) | 1 | WALCL+SWPT−RRP−TGA |
| TOTBKCR (US Total Bank Credit) | 1 | Private credit channel |
| WRESBAL (US Reserve Balances) | 1 | Banking system plumbing |
| COMPOUT (Commercial Paper) | 1 | Shadow banking |
| WRMFNS (Retail Money Markets) | 1 | Cash / dry powder |

**Display score** = `0.8 × structural_score + 0.2 × component_composite` — the 80% structural weighting anchors the reading to the ~66-month cycle detected from the merged composite, while individual components provide a 20% modulation.

See `docs/liquidity-pipeline-specification.md` for the full pipeline.

## Pipeline

All analysis runs client-side via the [Cycle Tools REST API](https://cycle.tools) at `api.cycle.tools`:

1. `EnsureCompleteDataset` + `WaitUntilUpdateCompleted` per ticker
2. `GetDatasetSeries` to fetch OHLCV bars
3. `CycleScanner` for spectral cycle detection (dominant cycle extraction)
4. Phase scoring + CRSI band+direction scoring per series
5. Per-series weighted average within layers, fixed layer weights for master composite

## Getting Started

### Prerequisites

- Node.js 18+
- A Cycle Tools API key from <https://cycle.tools>. The key is entered in the browser UI at runtime; it is not stored in the repo or committed anywhere.
- (Optional) The historical liquidity-momentum pre-seed file `public/US-GLI-MOM.csv`. **This file is not committed to the public repo** — request it from the maintainer and drop it into `public/` before running the pipeline. Without it the L5 structural cycle score can drift by 15–20 points; the pipeline still runs and L1–L4 are unaffected.

### Install and run

```bash
npm install
# Drop the pre-seed CSV into public/US-GLI-MOM.csv if you have it
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). Paste your Cycle Tools API key into the app and click "Run Pipeline".

### Build for production

```bash
npm run build
npm run preview    # serve the built assets locally
```

## Project Layout

```
EconomicCycleComposite/
├── src/
│   ├── App.tsx                  Pipeline orchestration, state
│   ├── components/              Dashboard, LiquidityCard, CompositeGauge, etc.
│   ├── services/
│   │   ├── pipeline.ts          Per-series CycleScanner + scoring for L1–L4
│   │   ├── liquidityPipeline.ts L5 8-series liquidity pipeline (this is the core)
│   │   ├── cycleToolsApi.ts     REST API wrappers
│   │   ├── composite.ts         Master composite + divergence overlays
│   │   ├── phaseScoring.ts      Interpolated phase score lookup
│   │   ├── projection.ts        Forward projection engine
│   │   └── narrative.ts         Rule-based reasoning text
│   ├── config/
│   │   ├── seriesRegistry.ts    28 FRED series + 8 liquidity series config
│   │   └── layerSummaries.ts    Per-layer regime labels & reasoning
│   └── types/                   Shared type definitions
├── public/
│   ├── US-GLI-MOM.csv           Historical liquidity-momentum pre-seed (not in public repo; request separately)
│   └── brand/                   FSC logo + cosmos background assets
├── src/styles/brand/             FSC design tokens + theme (from the webapp-design skill)
├── docs/
│   ├── composite-methodology.md        Overall 5-layer methodology (entry point)
│   ├── liquidity-layer-methodology.md  L5 deep dive (liquidity framework)
│   └── liquidity-pipeline-specification.md  L5 step-by-step spec (authoritative)
├── scripts/                     Backtest scripts (Node/ts-node)
├── scratch/                     Prototype/exploration scripts (historical; kept for reference)
└── SKILL.md                     Claude Code skill / hand-off notes
```

## Documentation

Start with `docs/composite-methodology.md` for the full 5-layer architecture. For the L5 liquidity layer specifically, read `docs/liquidity-layer-methodology.md` (conceptual) and `docs/liquidity-pipeline-specification.md` (authoritative step-by-step spec).

## Working with Claude Code

If you use Claude Code, read `SKILL.md` first. It points to the authoritative docs, documents the 4 critical implementation pitfalls, and references the companion `cycle-tools-api` Claude skill that wraps the Cycle Tools REST API.

## Tech Stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS
- Recharts for visualization
- No backend — all computation is client-side via the Cycle Tools API

## Visual Design

The UI is themed with the **Foundation for the Study of Cycles (FSC)** editorial-research system from the [`webapp-design`](https://github.com/cycles-org/cycle-tools-plugins/tree/main/skills/webapp-design) Claude skill. Two modes ship by default:

- **Paper / academic** (light) — cream surface, warm-slate ink, gold accent. Optimized for reading dense composite tables.
- **Cosmos / hero** (dark) — near-black navy, cream ink, gold accent. Same tokens, inverted surface.

Brand layer lives in `src/styles/brand/` and `public/brand/`. Swap themes by editing `src/styles/brand/theme.css` to import a different file under `themes/`. The app's existing `--th-*` Tailwind tokens are remapped onto FSC semantic tokens, so component JSX never references the brand directly.

## License

MIT. See `LICENSE`.
