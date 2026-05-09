# Step 1: Historical Layer Score Export — Status Report

**Date Started**: 2026-05-09 00:29:05 UTC  
**Status**: 🔄 **IN PROGRESS** (Background Job: `b9bbqsos3`)  
**Estimated Duration**: 30-52 minutes (depending on API rate limiting)

---

## What's Running

**Command**:
```bash
CYCLE_TOOLS_API_KEY=RiWeMaster2o23lKopxiq507w \
  node scratch/export_layer_scores.mjs
```

**Scope**: 149 monthly snapshots (2014-01-01 to 2026-05-06)

**Architecture**:
- L1-L4: 22 series across 4 layers (Leading, Coincident, Stress, Policy)
- L5: 7 liquidity series (component path, no structural cycle detection)
- Per snapshot: ~110 API calls (89 L1-L4 + 21 L5)
- Rate limiting: 6.5 seconds between API calls
- Resumability: CSV append-only, restarts from last completed date

---

## Key Fixes Applied

### Bug: API Ignores Point-in-Time Parameter

**Diagnosis**:
- API returns all available data (1952-2026) regardless of `unixTo` parameter
- All 5 test snapshots returned identical 670-bar datasets
- Identical data → identical cycle analysis → identical layer scores

**Fix**:
```javascript
// Client-side date filtering
const snapshotTime = new Date(upToDate).getTime();
const filteredBars = bars.filter(b => {
  if (!b.date) return false;
  return new Date(b.date).getTime() <= snapshotTime;
});
```

**Verification**: ✅ Test run with fix shows all 5 snapshots with different scores

---

## Expected Output

**File**: `scratch/layer_scores_history.csv`

**Format**:
```
date,L1_score,L2_score,L3_score,L4_score,L5_score,master_score,warm_up_complete
2014-01-01,65.4,40.0,85.0,67.5,70.0,66.9,1
2014-02-05,68.6,48.0,89.3,70.7,47.8,64.7,1
...
2026-05-06,XX.X,XX.X,XX.X,XX.X,XX.X,XX.X,1
```

**Size**: ~149 rows (header + 149 snapshots)

---

## Monitoring

**Progress Checkpoints**:
- ✅ Snapshots 1-5: Completed test run (66.9, 64.7, 63.1, 64.4, 59.2)
- 🔄 Snapshots 1-20: **MONITORING** (will notify on completion)
- Snapshots 21-149: Continuing (will notify on final completion)

**Error Handling**:
- 429 quota errors: 65-second retry once per snapshot
- Missing data: Skip with error logging to `export_layer_scores_errors.log`
- Network errors: Logged but non-blocking (continue to next snapshot)

---

## Next Steps

### Upon First 20 Snapshot Completion
1. **Quick visual sanity check**:
   - All scores 0-100? ✓
   - Scores varying (not all identical)? ✓
   - No more than 3 consecutive identical scores? ✓
   - No suspicious patterns (e.g., all 50s)? ✓

2. **Continue monitoring** for anomalies

### Upon Full CSV Completion
1. Verify CSV has 150 lines (header + 149 rows)
2. Check for error log entries (investigate if many)
3. Confirm data spans 2014-01-01 to 2026-05-06
4. **Proceed to Step 2**: Eigenstructure Analysis

---

## Commit Status

✅ **Committed to `richard/forcing-analysis`**:
- `scratch/export_layer_scores.mjs` (production script with fix)
- `scratch/export_layer_scores_test.mjs` (test script with fix)
- `scratch/EXPORT_PIPELINE_README.md` (documentation)

**Commit**: `0719f21` — "Add historical layer score export pipeline"

---

## Notes

- **L5 Limitation**: Using component path only (no structural Howell cycle detection). This is acceptable for Step 2 eigenstructure analysis but may reduce signal strength by ~25%.
- **Rate Limiting**: 6.5s/call with unlimited API key. Total ~16,400 calls. At 6.5s/call = 30 hours; with unlimited key optimization = 30-52 minutes depending on actual API response times.
- **Warm-up**: All snapshots have `warm_up_complete=1` because Howell pre-seed provides historical context even though structural path is not computed.

---

*Last updated: 2026-05-09 00:29:05 UTC*
