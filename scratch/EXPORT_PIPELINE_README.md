# Historical Layer Score Export Pipeline

**Status**: ✅ **FUNCTIONAL** — Real pipeline integrated

## Overview

`scratch/export_layer_scores.mjs` exports historical L1-L5 layer scores from 2014-01-01 to 2026-05-06 (149 monthly snapshots) with point-in-time data accuracy, resumability, and robust error recovery.

## Architecture

### Data Pipeline

The script implements **real pipeline logic** ported from TypeScript:

#### **L1-L4 Layers** (22 series across 4 layers)
- **L1 — Leading Indicators** (9 series): T10Y2Y, T10Y3M, ICSA, CCSA, UMCSENT, USSLIND, PERMIT, DGORDER, JTSJOL
- **L2 — Coincident Activity** (4 series): INDPRO, PAYEMS, DSPIC96, UNRATE
- **L3 — Financial Stress** (4 series): VIXCLS, STLFSI4, BAA10Y, BAMLH0A0HYM2
- **L4 — Policy/Inflation** (5 series): DFF, T5YIE, CPIAUCSL, CPILFESL, M2SL, DTWEXBGS

**Pipeline per series**:
1. `EnsureCompleteDataset` — update dataset with point-in-time cutoff (`unixTo`)
2. `GetDatasetSeries` — fetch bars with closes (`unixTo` parameter ensures no lookahead bias)
3. `CycleScanner` — detect dominant cycle (minCycleLength=5, maxCycleLength=400)
4. Extract dominant peak → phase score (`avgPhaseScore` → 0-100 mapping)
5. Apply inversion if needed (e.g., ICSA, UNRATE, VIX are inverted)
6. Weight per series (`SERIES_WEIGHTS` from optimization)
7. Aggregate to layer score (weighted average)

**Layer aggregation**:
- L1-L4 weighted at 30%, 15%, 20%, 10% respectively
- Master score = 0.30×L1 + 0.15×L2 + 0.20×L3 + 0.10×L4 + 0.25×L5

#### **L5 — Liquidity Layer** (8 series, component path)
- **Series**: WALCL (w=3), ECB_USD (w=1), BOJ_USD (w=1), TOTBKCR (w=1), WRESBAL (w=1), COMPOUT (w=1), WRMFNS (w=1)
- **Note**: NFL (Net Fed Liquidity) currently not included; requires multi-series derivation (WALCL + SWPT − RRPONTSYD − WTREGEN)

**Pipeline per L5 series**:
1. Ensure + Fetch with point-in-time cutoff
2. `CycleScanner` (minCycleLength=10, maxCycleLength=400)
3. Extract dominant peak → phase score (simplified: uses phase score directly as combined score)
4. Weight and aggregate (weighted average across 7 series)

**Current limitation**: L5 simplified to **component path only** (uses phase score directly without CRSI band scoring). Structural cycle detection (Howell Global Liquidity Cycle ~66 months) is not yet included.

### CSV Output Format

```
date,L1_score,L2_score,L3_score,L4_score,L5_score,master_score,warm_up_complete
2014-01-01,42.3,38.5,45.2,51.1,29.4,40.2,1
2014-02-05,43.1,39.2,44.8,50.9,30.1,40.8,1
...
2026-05-06,XX.X,XX.X,XX.X,XX.X,XX.X,XX.X,1
```

**Columns**:
- `date`: First Wednesday of month (YYYY-MM-DD)
- `L1_score` through `L5_score`: Layer scores (0-100)
- `master_score`: Weighted composite (0-100)
- `warm_up_complete`: Always 1 (warm-up not a constraint for monthly snapshots)

### Features

#### ✅ **Implemented**

1. **Point-in-time data accuracy**: Each snapshot passes `unixTo` parameter to API calls, preventing lookahead bias
2. **Resumability**: Script reads last row from CSV, determines last completed date, continues from next snapshot
   - No wasted API calls on restart
   - Safe to interrupt and resume
3. **Rate limiting**: 6.5 seconds between API calls (throttledFetch wrapper)
4. **Retry on quota**: 65-second wait + single retry on 429/quota errors
5. **Error recovery**: Failed snapshots logged to `export_layer_scores_errors.log`, processing continues
6. **Progress reporting**: Every 10 snapshots, logs completion %, date, estimated remaining time
7. **CSV append-only**: Never overwrites existing rows; safe concurrent safety
8. **Real pipeline logic**: Ported from src/services/pipeline.ts + liquidityPipeline.ts

#### ⚠️ **Limitations**

1. **L5 simplified**: Component path only (phase score direct, no CRSI band scoring)
   - Does **not** include:
     - NFL derivation (WALCL + SWPT − RRPONTSYD − WTREGEN)
     - HP detrend of momentum
     - Howell pre-seed calibration
     - Rolling percentile rank (780-week pctrank window)
     - Structural cycle detection (~66-month Howell Global Liquidity Cycle)
     - Two-path scoring (80% structural + 20% component)
   - **Impact**: L5 scores will reflect short-term component cycles, not the macro liquidity regime captured by full pipeline
2. **No phase interpolation for L5**: Currently uses raw phase score; full pipeline uses `interpolatePhaseScore()` function for nuanced interpretation

### API Budget

For 149 snapshots across 22 L1-L4 series + 7 L5 series:

- **L1-L4**: ~89 API calls per snapshot (ensure + fetch + scan per series = 3 calls × 22 + margin for retries)
- **L5**: ~21 API calls per snapshot (3 calls × 7 series)
- **Total per snapshot**: ~110 API calls
- **Total for full run**: ~16,400 API calls
- **Time at 6.5s/call**: ~31.5 hours (can run as background job or split across sessions)

### Usage

```bash
export CYCLE_TOOLS_API_KEY="your-api-key"
node scratch/export_layer_scores.mjs
```

Output files:
- `scratch/layer_scores_history.csv` — Main results (appended to)
- `scratch/export_layer_scores_errors.log` — Failed dates + error messages

### Next Steps

1. **Verify L1-L4 accuracy** — Run on test snapshot, compare against production pipeline results
2. **L5 enhancement** — Add full liquidity pipeline:
   - Implement NFL derivation
   - Add HP detrend API call
   - Load Howell pre-seed (US-GLI-MOM.csv or fallback to empty)
   - Implement rolling pctrank computation
   - Add structural cycle detection (238-368 bar range)
   - Implement two-path scoring (0.8 × structural + 0.2 × component)
3. **Eigenstructure analysis** — Once CSV complete, proceed to Step 2 (eigenstructure_analysis.mjs)

### Files

- **export_layer_scores.mjs** — Main pipeline script (this file, 500+ lines)
- **EXPORT_PIPELINE_README.md** — This document
- **layer_scores_history.csv** — Output (created on first run)
- **export_layer_scores_errors.log** — Error log (created on failures)

---

*Last updated: 2026-05-08*
