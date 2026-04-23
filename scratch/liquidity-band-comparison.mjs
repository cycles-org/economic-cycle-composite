/**
 * Compare CRSI scoring methods:
 *   1. Raw CRSI (current)
 *   2. Band-relative CRSI (proposed)
 *
 * Shows side-by-side for all 5 liquidity series.
 */

const API_KEY = 'wttmaster5809';
const BASE_URL = 'https://api.cycle.tools';

// ── Phase scoring (same as production) ──

const PHASE_RANGES = {
  'BOTTOM_Departure':            { scoreRange: [85, 95],  phaseRange: [-100, -60], invertDirection: true },
  'Uptrend_Starting':            { scoreRange: [76, 84],  phaseRange: [-80, -30],  invertDirection: true },
  'Uptrend_Neutral':             { scoreRange: [58, 75],  phaseRange: [-30, 60],   invertDirection: true },
  'Uptrend_ApproachingTop':      { scoreRange: [52, 58],  phaseRange: [30, 80],    invertDirection: true },
  'TOP_Arrival':                 { scoreRange: [36, 44],  phaseRange: [60, 100],   invertDirection: true },
  'TOP_Departure':               { scoreRange: [26, 34],  phaseRange: [80, 100],   invertDirection: true },
  'Downtrend_Starting':          { scoreRange: [16, 24],  phaseRange: [60, 100],   invertDirection: true },
  'Downtrend_Neutral':           { scoreRange: [15, 35],  phaseRange: [-60, 30],   invertDirection: false },
  'Downtrend_ApproachingBottom': { scoreRange: [36, 44],  phaseRange: [-80, -30],  invertDirection: false },
  'BOTTOM_Arrival':              { scoreRange: [56, 64],  phaseRange: [-100, -60], invertDirection: true },
};

function interpolatePhaseScore(phaseStatus, avgPhaseScore) {
  const range = PHASE_RANGES[phaseStatus];
  if (!range) return 50;
  const [scoreLow, scoreHigh] = range.scoreRange;
  if (avgPhaseScore === undefined || avgPhaseScore === null) return (scoreLow + scoreHigh) / 2;
  const [phaseLow, phaseHigh] = range.phaseRange;
  const clamped = Math.max(phaseLow, Math.min(phaseHigh, avgPhaseScore));
  const t = phaseHigh !== phaseLow ? (clamped - phaseLow) / (phaseHigh - phaseLow) : 0.5;
  const score = range.invertDirection
    ? scoreHigh - t * (scoreHigh - scoreLow)
    : scoreLow + (1 - t) * (scoreHigh - scoreLow);
  return Math.round(score * 10) / 10;
}

// ── Band-relative CRSI scoring (proposed) ──
//
// Scoring logic:
//   - Above UB + still rising  → strong bullish momentum (high score)
//   - Above UB + turning down  → overbought reversal / contrarian bearish (lower score)
//   - Below LB + still falling → strong bearish momentum / acceleration (low score)
//   - Below LB + turning up    → oversold reversal / contrarian bullish (higher score)
//   - Within bands             → neutral zone, linear interpolation
//
// Direction is determined by comparing recent CRSI values (last 3).

function getCrsiDirection(crsiArr) {
  if (crsiArr.length < 3) return 0;
  const n = crsiArr.length;
  const recent3 = [crsiArr[n - 3], crsiArr[n - 2], crsiArr[n - 1]];
  // Simple: average of last 2 deltas
  const d1 = recent3[1] - recent3[0];
  const d2 = recent3[2] - recent3[1];
  const avgDelta = (d1 + d2) / 2;
  return avgDelta; // positive = rising, negative = falling
}

function bandRelativeCrsiScore(crsiLast, ub, lb, direction) {
  const bandWidth = ub - lb;
  if (bandWidth <= 0) return 50;

  const isRising = direction > 0.5;   // meaningful upward movement
  const isFalling = direction < -0.5; // meaningful downward movement

  if (crsiLast >= ub) {
    // Above upper band
    const excess = (crsiLast - ub) / bandWidth;

    if (isFalling) {
      // CONTRARIAN: above UB but turning down → overbought reversal → bearish
      // The further above + the more it's turning, the stronger the signal
      const score = Math.max(15, 35 - excess * 15);
      return Math.round(score * 10) / 10;
    } else {
      // Still rising or flat above UB → strong bullish momentum (not yet reversing)
      const score = Math.min(85, 70 + excess * 10);
      return Math.round(score * 10) / 10;
    }
  }

  if (crsiLast <= lb) {
    // Below lower band
    const excess = (lb - crsiLast) / bandWidth;

    if (isRising) {
      // CONTRARIAN: below LB but turning up → oversold reversal → bullish
      const score = Math.min(85, 65 + excess * 15);
      return Math.round(score * 10) / 10;
    } else {
      // Still falling or flat below LB → bearish acceleration (NOT contrarian)
      const score = Math.max(15, 30 - excess * 10);
      return Math.round(score * 10) / 10;
    }
  }

  // Within bands: linear map from LB→UB = 35→65
  // Higher CRSI within band = more bullish momentum
  const t = (crsiLast - lb) / bandWidth; // 0 = at LB, 1 = at UB
  const score = 35 + t * 30; // 35 at LB, 65 at UB
  return Math.round(score * 10) / 10;
}

// ── API helpers ──

async function fetchJson(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  if (text.includes('quota exceeded')) throw new Error('Quota exceeded');
  try { return JSON.parse(text); }
  catch {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    const o = text.match(/\{[\s\S]*\}/);
    if (o) return JSON.parse(o[0]);
    throw new Error(`Parse error: ${text.substring(0, 100)}`);
  }
}

async function ensureAndFetch(tickerId) {
  const eUrl = `${BASE_URL}/api/data/EnsureCompleteDataset?api_key=${API_KEY}&tickerId=${encodeURIComponent(tickerId)}`;
  const eResp = await fetch(eUrl);
  const eResult = await eResp.json();
  if (eResult.trackingId && !eResult.isComplete) {
    await fetch(`${BASE_URL}/api/data/WaitUntilUpdateCompleted?api_key=${API_KEY}&requestId=${eResult.trackingId}`);
  }
  return fetchJson(`${BASE_URL}/api/data/GetDatasetSeries?api_key=${API_KEY}&tickerid=${encodeURIComponent(tickerId)}&maxbars=0`);
}

async function runCycleScanner(closes) {
  const url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}&minCycleLength=10&maxCycleLength=400&sortByStrength=true&includeSpectrum=false&dominantPeakFinder=true&useStability=true&dType=9`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(closes),
  });
  const text = await resp.text();
  return parseText(text);
}

async function getCrsi(closes, length) {
  const url = `${BASE_URL}/api/DSP/CRSI?api_key=${API_KEY}&length=${length}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(closes),
  });
  const text = await resp.text();
  return parseText(text);
}

function parseText(text) {
  if (text.includes('quota exceeded')) throw new Error('Quota exceeded');
  try { return JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    const a = text.match(/\[[\s\S]*\]/);
    if (a) return JSON.parse(a[0]);
    throw new Error(`Parse error: ${text.substring(0, 100)}`);
  }
}

function downsampleToWeekly(dailyBars) {
  const byWeek = new Map();
  for (const bar of dailyBars) {
    const d = new Date(bar.date);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key).push({ date: bar.date, close: bar.close, dayOfWeek: d.getDay() });
  }
  const result = [];
  for (const [, days] of byWeek) {
    const wed = days.find(d => d.dayOfWeek === 3);
    const pick = wed || days.filter(d => d.dayOfWeek <= 3).sort((a, b) => b.dayOfWeek - a.dayOfWeek)[0] || days[days.length - 1];
    result.push({ date: pick.date, close: pick.close });
  }
  return result.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function findNearest(bars, targetDate, maxDaysDiff = 5) {
  const target = new Date(targetDate).getTime();
  let best = null, bestDiff = Infinity;
  for (const bar of bars) {
    const diff = Math.abs(new Date(bar.date).getTime() - target);
    if (diff < bestDiff) { bestDiff = diff; best = bar; }
  }
  return bestDiff <= maxDaysDiff * 86400000 ? best : null;
}

function momentum52w(series) {
  const result = [];
  for (let i = 52; i < series.length; i++) {
    const prev = series[i - 52].close;
    const curr = series[i].close;
    if (prev !== 0) result.push({ date: series[i].date, close: ((curr - prev) / Math.abs(prev)) * 100 });
  }
  return result;
}

function extractDominant(peaks) {
  if (!peaks?.length) return null;
  const viable = peaks.filter(p => p.cycleLength >= 20 && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  const pool = viable.length > 0 ? viable : peaks.filter(p => p.cycleLength >= 20);
  if (pool.length === 0) return peaks[0] || null;
  const ranked = pool.filter(p => p.dominantRank > 0);
  if (ranked.length > 0) return ranked.sort((a, b) => a.dominantRank - b.dominantRank)[0];
  return pool.sort((a, b) => b.strength - a.strength)[0];
}

// ── Process one series with both scoring methods ──

async function processSeries(label, closes) {
  const scan = await runCycleScanner(closes);
  const dom = extractDominant(scan.peaks);
  if (!dom) { console.log(`  ${label}: No dominant cycle`); return null; }

  const crsiResult = await getCrsi(closes, dom.cycleLength);
  const crsiArr = crsiResult.crsi ?? [];
  const ubArr = crsiResult.ub ?? [];
  const lbArr = crsiResult.lb ?? [];

  const crsiLast = crsiArr[crsiArr.length - 1] ?? 50;
  const ubLast = ubArr[ubArr.length - 1] ?? 70;
  const lbLast = lbArr[lbArr.length - 1] ?? 30;

  const phaseScore = interpolatePhaseScore(dom.phaseStatus, dom.avgPhaseScore);

  // CRSI direction (last 3 values)
  const direction = getCrsiDirection(crsiArr);
  const dirLabel = direction > 0.5 ? 'RISING' : direction < -0.5 ? 'FALLING' : 'FLAT';

  // Method A: Raw CRSI (current)
  const rawCrsiScore = crsiLast;
  const combinedA = 0.5 * phaseScore + 0.5 * rawCrsiScore;

  // Method B: Band-relative CRSI with direction (proposed)
  const bandScore = bandRelativeCrsiScore(crsiLast, ubLast, lbLast, direction);
  const combinedB = 0.5 * phaseScore + 0.5 * bandScore;

  const mo = (dom.cycleLength * 7 / 30.44).toFixed(1);
  const bandWidth = ubLast - lbLast;
  const bandPosition = crsiLast >= ubLast ? `${((crsiLast - ubLast) / bandWidth).toFixed(2)} BW above UB`
    : crsiLast <= lbLast ? `${((lbLast - crsiLast) / bandWidth).toFixed(2)} BW below LB`
    : `within bands (${((crsiLast - lbLast) / bandWidth * 100).toFixed(0)}% from LB)`;

  // Determine which scoring path was taken
  let scoringPath = '';
  if (crsiLast >= ubLast) {
    scoringPath = direction < -0.5 ? 'ABOVE UB + FALLING → contrarian bearish' : 'ABOVE UB + rising/flat → bullish momentum';
  } else if (crsiLast <= lbLast) {
    scoringPath = direction > 0.5 ? 'BELOW LB + RISING → contrarian bullish' : 'BELOW LB + falling/flat → bearish acceleration';
  } else {
    scoringPath = 'WITHIN BANDS → linear interpolation';
  }

  console.log(`\n  ${label}`);
  console.log(`    Cycle: ${dom.cycleLength} bars (~${mo} mo)  Bartels=${dom.bartelsValue.toFixed(1)}  Phase: ${dom.phaseStatus} (avg=${dom.avgPhaseScore})`);
  console.log(`    Phase Score: ${phaseScore.toFixed(1)}`);
  console.log(`    CRSI: ${crsiLast.toFixed(1)}  UB: ${ubLast.toFixed(1)}  LB: ${lbLast.toFixed(1)}  BandWidth: ${bandWidth.toFixed(1)}`);
  console.log(`    Band Position: ${bandPosition}  Direction: ${dirLabel} (delta=${direction.toFixed(2)})`);
  console.log(`    Scoring Path: ${scoringPath}`);
  console.log(`    ┌─────────────────────────────────┬────────────┬────────────┐`);
  console.log(`    │ Method                          │ CRSI Score │ Combined   │`);
  console.log(`    ├─────────────────────────────────┼────────────┼────────────┤`);
  console.log(`    │ A: Raw CRSI (current)           │ ${rawCrsiScore.toFixed(1).padStart(7)}    │ ${combinedA.toFixed(1).padStart(7)}    │`);
  console.log(`    │ B: Band+Direction (proposed)    │ ${bandScore.toFixed(1).padStart(7)}    │ ${combinedB.toFixed(1).padStart(7)}    │`);
  console.log(`    └─────────────────────────────────┴────────────┴────────────┘`);

  return { label, dom, crsiLast, ubLast, lbLast, direction, phaseScore, rawCrsiScore, bandScore, combinedA, combinedB, bartels: dom.bartelsValue };
}

// ── Main ──

async function main() {
  console.log('=== CRSI Band-Relative Scoring Comparison ===\n');

  // Fetch NFL components
  console.log('Fetching data...');
  const [walcl, swpt, rrpDaily, wtregen] = await Promise.all([
    ensureAndFetch('WALCL-W:FDS'),
    ensureAndFetch('SWPT-W:FDS'),
    ensureAndFetch('RRPONTSYD:FDS'),
    ensureAndFetch('WTREGEN-W:FDS'),
  ]);

  const rrpWeekly = downsampleToWeekly(rrpDaily);
  const allLevel = [];
  for (const wBar of walcl) {
    const r = findNearest(rrpWeekly, wBar.date);
    const t = findNearest(wtregen, wBar.date);
    const s = findNearest(swpt, wBar.date);
    if (r && t && s && wBar.close != null) {
      allLevel.push({ date: wBar.date, close: wBar.close + (s.close || 0) - (r.close || 0) - (t.close || 0) });
    }
  }
  const level = allLevel.filter(l => l.date >= '2014-01-01');
  const nflMom = momentum52w(level);
  console.log(`NFL momentum: ${nflMom.length} points, current: ${nflMom[nflMom.length - 1]?.close.toFixed(2)}%\n`);

  // Tier A
  console.log('═'.repeat(65));
  console.log('TIER A — Net Fed Liquidity (50%)');
  console.log('═'.repeat(65));
  const nflResult = await processSeries('Net Fed Liquidity', nflMom.map(m => m.close));

  // Tier B
  console.log('\n' + '═'.repeat(65));
  console.log('TIER B — Private Sector Liquidity (35%)');
  console.log('═'.repeat(65));

  const TIER_B = [
    { id: 'TOTBKCR', ticker: 'TOTBKCR-W:FDS', name: 'Total Bank Credit' },
    { id: 'COMPOUT', ticker: 'COMPOUT-W:FDS', name: 'Commercial Paper' },
    { id: 'WRMFNS', ticker: 'WRMFNS-W:FDS', name: 'Money Market Funds' },
  ];

  const tierBResults = [];
  for (const s of TIER_B) {
    const bars = await ensureAndFetch(s.ticker);
    const trimmed = bars.filter(b => b.date >= '2014-01-01');
    const mom = momentum52w(trimmed);
    if (mom.length < 50) continue;
    const result = await processSeries(`${s.id} (${s.name})`, mom.map(m => m.close));
    if (result) tierBResults.push(result);
  }

  // Tier C
  console.log('\n' + '═'.repeat(65));
  console.log('TIER C — Reserve Availability (15%)');
  console.log('═'.repeat(65));

  const wresbalBars = await ensureAndFetch('WRESBAL-W:FDS');
  const wresbalMom = momentum52w(wresbalBars.filter(b => b.date >= '2014-01-01'));
  const tierCResult = await processSeries('WRESBAL (Reserve Balances)', wresbalMom.map(m => m.close));

  // ── Composite comparison ──
  console.log('\n\n' + '═'.repeat(65));
  console.log('COMPOSITE COMPARISON');
  console.log('═'.repeat(65));

  function computeComposite(field) {
    const tierA = nflResult?.[field] ?? 50;
    let tierB = 50;
    if (tierBResults.length > 0) {
      const bSum = tierBResults.reduce((s, r) => s + r.bartels, 0);
      tierB = tierBResults.reduce((s, r) => s + r[field] * (r.bartels / bSum), 0);
    }
    const tierC = tierCResult?.[field] ?? 50;
    return { tierA, tierB, tierC, composite: 0.50 * tierA + 0.35 * tierB + 0.15 * tierC };
  }

  const methodA = computeComposite('combinedA');
  const methodB = computeComposite('combinedB');

  function regime(s) {
    if (s >= 70) return 'Liquidity Expanding';
    if (s >= 55) return 'Liquidity Stable-Positive';
    if (s >= 45) return 'Liquidity Neutral';
    if (s >= 30) return 'Liquidity Tightening';
    return 'Liquidity Contracting';
  }

  console.log(`\n  ┌───────────────────────┬──────────────────────────┬──────────────────────────┐`);
  console.log(`  │                       │ A: Raw CRSI (current)    │ B: Band+Direction (new)  │`);
  console.log(`  ├───────────────────────┼──────────────────────────┼──────────────────────────┤`);
  console.log(`  │ Tier A (NFL, 50%)     │ ${methodA.tierA.toFixed(1).padStart(10)}               │ ${methodB.tierA.toFixed(1).padStart(10)}               │`);
  console.log(`  │ Tier B (Credit, 35%)  │ ${methodA.tierB.toFixed(1).padStart(10)}               │ ${methodB.tierB.toFixed(1).padStart(10)}               │`);
  console.log(`  │ Tier C (Res., 15%)    │ ${methodA.tierC.toFixed(1).padStart(10)}               │ ${methodB.tierC.toFixed(1).padStart(10)}               │`);
  console.log(`  ├───────────────────────┼──────────────────────────┼──────────────────────────┤`);
  console.log(`  │ COMPOSITE             │ ${methodA.composite.toFixed(1).padStart(10)}               │ ${methodB.composite.toFixed(1).padStart(10)}               │`);
  console.log(`  │ REGIME                │ ${regime(methodA.composite).padEnd(25)}│ ${regime(methodB.composite).padEnd(25)}│`);
  console.log(`  └───────────────────────┴──────────────────────────┴──────────────────────────┘`);

  console.log(`\n  Previous readings for reference:`);
  console.log(`    CRSI-only (no phase):           43.6 — Liquidity Tightening`);
  console.log(`    Fixed phase + CRSI:             35.2 — Liquidity Tightening`);
  console.log(`    Interpolated phase + raw CRSI:  34.4 — Liquidity Tightening`);
}

main().catch(e => console.error('Fatal:', e));
