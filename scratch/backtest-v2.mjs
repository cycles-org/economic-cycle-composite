/**
 * Backtest V2: Economic Cycle Composite with Layer 5 (Liquidity)
 *
 * For each historical event date:
 *   L1-L4: Truncate series to event date → CycleScanner → phase score
 *   L5:    Derive NFL + individual series → momentum → CycleScanner(dType=9) → CRSI bands → combined score
 */

const API_KEY = 'wttmaster5809';
const BASE_URL = 'https://api.cycle.tools';

// --- Series Registry (L1-L4, same as app) ---
const SERIES = [
  { fredId: 'T10Y2Y',       tickerId: 'T10Y2Y:FDS',       layer: 1, invert: false, name: '10Y-2Y Spread' },
  { fredId: 'T10Y3M',       tickerId: 'T10Y3M:FDS',       layer: 1, invert: false, name: '10Y-3M Spread' },
  { fredId: 'ICSA',         tickerId: 'ICSA-W:FDS',       layer: 1, invert: true,  name: 'Initial Claims' },
  { fredId: 'CCSA',         tickerId: 'CCSA-W:FDS',       layer: 1, invert: true,  name: 'Continued Claims' },
  { fredId: 'UMCSENT',      tickerId: 'UMCSENT-M:FDS',    layer: 1, invert: false, name: 'Consumer Sentiment' },
  { fredId: 'USSLIND',      tickerId: 'USSLIND-M:FDS',    layer: 1, invert: false, name: 'Leading Index' },
  { fredId: 'PERMIT',       tickerId: 'PERMIT-M:FDS',     layer: 1, invert: false, name: 'Building Permits' },
  { fredId: 'DGORDER',      tickerId: 'DGORDER-M:FDS',    layer: 1, invert: false, name: 'Durable Goods Orders' },
  { fredId: 'JTSJOL',       tickerId: 'JTSJOL-M:FDS',     layer: 1, invert: false, name: 'JOLTS Openings' },
  { fredId: 'INDPRO',       tickerId: 'INDPRO-M:FDS',     layer: 2, invert: false, name: 'Industrial Production' },
  { fredId: 'PAYEMS',       tickerId: 'PAYEMS-M:FDS',     layer: 2, invert: false, name: 'Nonfarm Payrolls' },
  { fredId: 'DSPIC96',      tickerId: 'DSPIC96-M:FDS',    layer: 2, invert: false, name: 'Real Disp. Income' },
  { fredId: 'UNRATE',       tickerId: 'UNRATE-M:FDS',     layer: 2, invert: true,  name: 'Unemployment Rate' },
  { fredId: 'VIXCLS',       tickerId: 'VIXCLS:FDS',       layer: 3, invert: true,  name: 'VIX' },
  { fredId: 'STLFSI4',      tickerId: 'STLFSI4-W:FDS',    layer: 3, invert: true,  name: 'Fin. Stress Index' },
  { fredId: 'BAA10Y',       tickerId: 'BAA10Y:FDS',       layer: 3, invert: true,  name: 'Baa-10Y Spread' },
  { fredId: 'BAMLH0A0HYM2', tickerId: 'BAMLH0A0HYM2:FDS', layer: 3, invert: true,  name: 'HY OAS Spread' },
  { fredId: 'DFF',          tickerId: 'DFF:FDS',          layer: 4, invert: true,  name: 'Fed Funds Rate' },
  { fredId: 'T5YIE',        tickerId: 'T5YIE:FDS',        layer: 4, invert: false, name: '5Y Breakeven Infl.' },
  { fredId: 'CPIAUCSL',     tickerId: 'CPIAUCSL-M:FDS',   layer: 4, invert: true,  name: 'CPI Headline' },
  { fredId: 'CPILFESL',     tickerId: 'CPILFESL-M:FDS',   layer: 4, invert: true,  name: 'Core CPI' },
  { fredId: 'M2SL',         tickerId: 'M2SL-M:FDS',       layer: 4, invert: false, name: 'M2 Money Supply' },
  { fredId: 'DTWEXBGS',     tickerId: 'DTWEXBGS:FDS',     layer: 4, invert: true,  name: 'USD Trade-Weighted' },
];

// --- Liquidity series ---
const NFL_COMPONENTS = [
  { fredId: 'WALCL',     tickerId: 'WALCL-W:FDS',     role: '+' },
  { fredId: 'SWPT',      tickerId: 'SWPT-W:FDS',      role: '+' },
  { fredId: 'RRPONTSYD', tickerId: 'RRPONTSYD:FDS',    role: '-', daily: true },
  { fredId: 'WTREGEN',   tickerId: 'WTREGEN-W:FDS',    role: '-' },
];

const LIQUIDITY_SERIES = [
  { fredId: 'TOTBKCR', tickerId: 'TOTBKCR-W:FDS', tier: 'B', name: 'Total Bank Credit' },
  { fredId: 'COMPOUT', tickerId: 'COMPOUT-W:FDS', tier: 'B', name: 'Commercial Paper' },
  { fredId: 'WRMFNS',  tickerId: 'WRMFNS-W:FDS',  tier: 'B', name: 'Money Market Funds' },
  { fredId: 'WRESBAL', tickerId: 'WRESBAL-W:FDS', tier: 'C', name: 'Reserve Balances' },
];

const LAYER_WEIGHTS = { 1: 0.30, 2: 0.15, 3: 0.20, 4: 0.10, 5: 0.25 };

const EVENTS = [
  { date: '2000-03-24', label: 'Dot-com Peak',        type: 'TOP' },
  { date: '2002-10-09', label: 'Post-Dot-com Bottom',  type: 'LOW' },
  { date: '2007-10-09', label: 'Pre-GFC Peak',         type: 'TOP' },
  { date: '2009-03-09', label: 'GFC Bottom',           type: 'LOW' },
  { date: '2020-02-19', label: 'Pre-COVID Peak',       type: 'TOP' },
  { date: '2020-03-23', label: 'COVID Bottom',         type: 'LOW' },
  { date: '2022-01-04', label: 'Post-COVID Peak',      type: 'TOP' },
  { date: '2022-10-13', label: '2022 Bear Bottom',     type: 'LOW' },
];

// --- Phase scoring (interpolated, matches production) ---

const PHASE_RANGES = {
  'BOTTOM_Departure':            { scoreRange: [85, 95],  phaseRange: [-100, -60], inv: true },
  'Uptrend_Starting':            { scoreRange: [76, 84],  phaseRange: [-80, -30],  inv: true },
  'Uptrend_Neutral':             { scoreRange: [58, 75],  phaseRange: [-30, 60],   inv: true },
  'Uptrend_ApproachingTop':      { scoreRange: [52, 58],  phaseRange: [30, 80],    inv: true },
  'TOP_Arrival':                 { scoreRange: [36, 44],  phaseRange: [60, 100],   inv: true },
  'TOP_Departure':               { scoreRange: [26, 34],  phaseRange: [80, 100],   inv: true },
  'Downtrend_Starting':          { scoreRange: [16, 24],  phaseRange: [60, 100],   inv: true },
  'Downtrend_Neutral':           { scoreRange: [15, 35],  phaseRange: [-60, 30],   inv: false },
  'Downtrend_ApproachingBottom': { scoreRange: [36, 44],  phaseRange: [-80, -30],  inv: false },
  'BOTTOM_Arrival':              { scoreRange: [56, 64],  phaseRange: [-100, -60], inv: true },
};

function interpolatePhaseScore(phaseStatus, avgPhaseScore) {
  const range = PHASE_RANGES[phaseStatus];
  if (!range) return 50;
  const [scoreLow, scoreHigh] = range.scoreRange;
  if (avgPhaseScore === undefined || avgPhaseScore === null) return (scoreLow + scoreHigh) / 2;
  const [phaseLow, phaseHigh] = range.phaseRange;
  const clamped = Math.max(phaseLow, Math.min(phaseHigh, avgPhaseScore));
  const t = phaseHigh !== phaseLow ? (clamped - phaseLow) / (phaseHigh - phaseLow) : 0.5;
  return Math.round((range.inv ? scoreHigh - t * (scoreHigh - scoreLow) : scoreLow + (1 - t) * (scoreHigh - scoreLow)) * 10) / 10;
}

// --- CRSI band+direction scoring ---

function getCrsiDirection(crsiArr) {
  if (crsiArr.length < 3) return 0;
  const n = crsiArr.length;
  return ((crsiArr[n - 2] - crsiArr[n - 3]) + (crsiArr[n - 1] - crsiArr[n - 2])) / 2;
}

function bandRelativeCrsiScore(crsiLast, ub, lb, direction) {
  const bw = ub - lb;
  if (bw <= 0) return 50;
  const isRising = direction > 0.5;
  const isFalling = direction < -0.5;

  if (crsiLast >= ub) {
    const excess = (crsiLast - ub) / bw;
    return isFalling
      ? Math.round(Math.max(15, 35 - excess * 15) * 10) / 10
      : Math.round(Math.min(85, 70 + excess * 10) * 10) / 10;
  }
  if (crsiLast <= lb) {
    const excess = (lb - crsiLast) / bw;
    return isRising
      ? Math.round(Math.min(85, 65 + excess * 15) * 10) / 10
      : Math.round(Math.max(15, 30 - excess * 10) * 10) / 10;
  }
  const t = (crsiLast - lb) / bw;
  return Math.round((35 + t * 30) * 10) / 10;
}

// --- API helpers ---

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

async function getSeriesData(tickerId) {
  return fetchJson(`${BASE_URL}/api/data/GetDatasetSeries?api_key=${API_KEY}&tickerid=${encodeURIComponent(tickerId)}&maxbars=0`);
}

async function runCycleScanner(closes, dType = null) {
  let url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}&minCycleLength=${dType === 9 ? 10 : 5}&maxCycleLength=400&sortByStrength=true&includeSpectrum=false&dominantPeakFinder=true&useStability=true`;
  if (dType !== null) url += `&dType=${dType}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(closes),
  });
  const text = await resp.text();
  try { return JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`Parse: ${text.substring(0, 80)}`);
  }
}

async function getCrsi(closes, length) {
  const url = `${BASE_URL}/api/DSP/CRSI?api_key=${API_KEY}&length=${length}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(closes),
  });
  const text = await resp.text();
  try { return JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`CRSI parse: ${text.substring(0, 100)}`);
  }
}

function extractDominant(peaks, minLen = 30) {
  const viable = peaks.filter(p => p.cycleLength >= minLen && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  const pool = viable.length > 0 ? viable : peaks.filter(p => p.cycleLength >= minLen);
  if (pool.length === 0) return peaks[0] || null;
  const ranked = pool.filter(p => p.dominantRank > 0);
  if (ranked.length > 0) return ranked.sort((a, b) => a.dominantRank - b.dominantRank)[0];
  return pool.sort((a, b) => b.strength - a.strength)[0];
}

// --- Liquidity helpers ---

function downsampleToWeekly(dailyBars) {
  const byWeek = new Map();
  for (const bar of dailyBars) {
    if (!bar.date) continue;
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
    if (!bar.date) continue;
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

async function processLiquiditySeries(label, momentumCloses) {
  if (momentumCloses.length < 50) return null;

  try {
    const scan = await runCycleScanner(momentumCloses, 9);
    if (!scan.peaks?.length) return null;
    const dom = extractDominant(scan.peaks, 20);
    if (!dom) return null;

    const crsiResult = await getCrsi(momentumCloses, dom.cycleLength);
    const crsiArr = crsiResult.crsi ?? [];
    const ubArr = crsiResult.ub ?? [];
    const lbArr = crsiResult.lb ?? [];

    let crsiLast = crsiArr[crsiArr.length - 1] ?? 50;
    let ubLast = ubArr[ubArr.length - 1] ?? 70;
    let lbLast = lbArr[lbArr.length - 1] ?? 30;
    const direction = getCrsiDirection(crsiArr);

    // NaN guard: if CRSI returned NaN (happens with very long cycle lengths), fall back to phase-only
    const crsiValid = !isNaN(crsiLast) && !isNaN(ubLast) && !isNaN(lbLast);
    if (!crsiValid) {
      crsiLast = 50; ubLast = 70; lbLast = 30;
      console.log(`    ${label}: CRSI returned NaN (cycleLen=${dom.cycleLength}), using phase-only`);
    }

    const phaseScore = interpolatePhaseScore(dom.phaseStatus, dom.avgPhaseScore);
    const crsiBandScore = crsiValid ? bandRelativeCrsiScore(crsiLast, ubLast, lbLast, direction) : phaseScore;
    const combinedScore = Math.round((0.5 * phaseScore + 0.5 * crsiBandScore) * 10) / 10;

    return { label, combinedScore, phaseScore, crsiBandScore, bartels: dom.bartelsValue, phase: dom.phaseStatus, cycleLen: dom.cycleLength };
  } catch (e) {
    console.log(`    ${label}: ERROR — ${e.message}`);
    return null;
  }
}

// --- Main ---

async function main() {
  console.log('=== FRED Economic Cycle Composite V2 — Backtest with Liquidity ===\n');

  // Step 1: Fetch all data
  console.log('Fetching L1-L4 series data...');
  const seriesData = {};
  await Promise.all(SERIES.map(async (s) => {
    try {
      seriesData[s.fredId] = await getSeriesData(s.tickerId);
      console.log(`  ${s.fredId}: ${seriesData[s.fredId].length} bars`);
    } catch (e) {
      console.log(`  ${s.fredId}: FAILED — ${e.message}`);
      seriesData[s.fredId] = [];
    }
  }));

  console.log('\nFetching L5 liquidity component data...');
  const liqData = {};
  const allLiqTickers = [...NFL_COMPONENTS, ...LIQUIDITY_SERIES];
  await Promise.all(allLiqTickers.map(async (s) => {
    try {
      liqData[s.fredId] = await getSeriesData(s.tickerId);
      console.log(`  ${s.fredId}: ${liqData[s.fredId].length} bars`);
    } catch (e) {
      console.log(`  ${s.fredId}: FAILED — ${e.message}`);
      liqData[s.fredId] = [];
    }
  }));

  // Pre-compute NFL level and weekly RRP
  const rrpWeekly = downsampleToWeekly(liqData['RRPONTSYD'] || []);

  console.log('\n--- Running backtest across 8 events ---\n');

  const results = [];
  const allEventData = []; // per-series scores for optimizer

  for (const event of EVENTS) {
    const eventDate = new Date(event.date);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`${event.label} (${event.date}) — ${event.type}`);
    console.log('='.repeat(70));

    // ── L1-L4 scores ──
    const seriesResults = [];
    await Promise.all(SERIES.map(async (s) => {
      const bars = seriesData[s.fredId] || [];
      const truncated = bars.filter(b => new Date(b.date) <= eventDate);
      const closes = truncated.map(b => b.close).filter(v => v != null);

      if (closes.length < 100) {
        seriesResults.push({ fredId: s.fredId, layer: s.layer, error: `Only ${closes.length} bars`, adjustedScore: null });
        return;
      }

      try {
        const scan = await runCycleScanner(closes);
        if (!scan.peaks?.length) { seriesResults.push({ fredId: s.fredId, layer: s.layer, error: 'No peaks', adjustedScore: null }); return; }
        const dom = extractDominant(scan.peaks);
        if (!dom) { seriesResults.push({ fredId: s.fredId, layer: s.layer, error: 'No dominant', adjustedScore: null }); return; }

        const rawPhase = dom.avgPhaseScore ?? 0;
        const phaseScore = Math.max(0, Math.min(100, (rawPhase + 100) / 2));
        const adjusted = s.invert ? 100 - phaseScore : phaseScore;

        seriesResults.push({
          fredId: s.fredId, name: s.name, layer: s.layer, invert: s.invert,
          rawPhase, phaseScore: Math.round(phaseScore * 10) / 10,
          adjustedScore: Math.round(adjusted * 10) / 10,
          cycleLen: Math.round(dom.cycleLength), phase: dom.phaseStatus,
          bars: closes.length, error: null,
        });
      } catch (e) {
        seriesResults.push({ fredId: s.fredId, layer: s.layer, error: e.message, adjustedScore: null });
      }
    }));

    // ── L5 Liquidity score ──
    let l5Score = null;
    let l5Detail = null;

    // Derive NFL level truncated to event date
    const walclTrunc = (liqData['WALCL'] || []).filter(b => b.date && new Date(b.date) <= eventDate);
    const rrpTrunc = rrpWeekly.filter(b => b.date && new Date(b.date) <= eventDate);
    const wtregenTrunc = (liqData['WTREGEN'] || []).filter(b => b.date && new Date(b.date) <= eventDate);
    const swptTrunc = (liqData['SWPT'] || []).filter(b => b.date && new Date(b.date) <= eventDate);

    const nflLevel = [];
    for (const wBar of walclTrunc) {
      if (!wBar.date) continue;
      const r = findNearest(rrpTrunc, wBar.date);
      const t = findNearest(wtregenTrunc, wBar.date);
      const s = findNearest(swptTrunc, wBar.date);
      if (r && t && s && wBar.close != null) {
        nflLevel.push({ date: wBar.date, close: wBar.close + (s.close || 0) - (r.close || 0) - (t.close || 0) });
      }
    }

    const nflTrimmed = nflLevel.filter(l => l.date >= '2014-01-01');
    const nflMomentum = momentum52w(nflTrimmed);

    if (nflMomentum.length >= 50) {
      console.log(`  L5: NFL momentum ${nflMomentum.length} points`);

      // Tier A
      const nflResult = await processLiquiditySeries('NFL', nflMomentum.map(m => m.close));

      // Tier B
      const tierBResults = [];
      for (const ls of LIQUIDITY_SERIES.filter(s => s.tier === 'B')) {
        const bars = (liqData[ls.fredId] || []).filter(b => b.date && new Date(b.date) <= eventDate && b.date >= '2014-01-01');
        const mom = momentum52w(bars);
        if (mom.length >= 50) {
          const result = await processLiquiditySeries(ls.fredId, mom.map(m => m.close));
          if (result) tierBResults.push(result);
        }
      }

      // Tier C
      const wresbalBars = (liqData['WRESBAL'] || []).filter(b => b.date && new Date(b.date) <= eventDate && b.date >= '2014-01-01');
      const wresbalMom = momentum52w(wresbalBars);
      const tierCResult = wresbalMom.length >= 50 ? await processLiquiditySeries('WRESBAL', wresbalMom.map(m => m.close)) : null;

      // Composite — with NaN guards on all tiers
      const tierA = isNaN(nflResult?.combinedScore) ? 50 : (nflResult?.combinedScore ?? 50);
      let tierB = 50;
      if (tierBResults.length > 0) {
        const validB = tierBResults.filter(r => !isNaN(r.combinedScore) && !isNaN(r.bartels));
        if (validB.length > 0) {
          const bSum = validB.reduce((s, r) => s + r.bartels, 0);
          tierB = bSum > 0
            ? validB.reduce((s, r) => s + r.combinedScore * (r.bartels / bSum), 0)
            : validB.reduce((s, r) => s + r.combinedScore, 0) / validB.length;
        }
      }
      const tierC = isNaN(tierCResult?.combinedScore) ? 50 : (tierCResult?.combinedScore ?? 50);

      const rawL5 = 0.50 * tierA + 0.35 * tierB + 0.15 * tierC;
      l5Score = isNaN(rawL5) ? 50 : Math.round(rawL5 * 10) / 10;
      l5Detail = { tierA: Math.round(tierA * 10) / 10, tierB: Math.round(tierB * 10) / 10, tierC: Math.round(tierC * 10) / 10 };

      console.log(`  L5: Tier A=${l5Detail.tierA}  Tier B=${l5Detail.tierB}  Tier C=${l5Detail.tierC}  → L5=${l5Score}`);
      if (nflResult) console.log(`      NFL: ${nflResult.phase} (${nflResult.cycleLen} bars) ph=${nflResult.phaseScore} crsi=${nflResult.crsiBandScore} → ${nflResult.combinedScore}`);
    } else {
      console.log(`  L5: Insufficient data (${nflMomentum.length} momentum points, need 50+) — using neutral`);
    }

    // ── Compute layer scores (L1-L4 equal weight, L5 from pipeline) ──
    const layerScores = {};
    for (const l of [1, 2, 3, 4]) {
      const valid = seriesResults.filter(r => r.layer === l && r.adjustedScore !== null);
      layerScores[l] = valid.length > 0 ? valid.reduce((s, r) => s + r.adjustedScore, 0) / valid.length : 50;
    }
    layerScores[5] = l5Score ?? 50;

    // Master composite (5 layers)
    const composite = Math.max(0, Math.min(100,
      LAYER_WEIGHTS[1] * layerScores[1] +
      LAYER_WEIGHTS[2] * layerScores[2] +
      LAYER_WEIGHTS[3] * layerScores[3] +
      LAYER_WEIGHTS[4] * layerScores[4] +
      LAYER_WEIGHTS[5] * layerScores[5]
    ));

    // L1-L2 divergence
    const l1l2spread = Math.round((layerScores[1] - layerScores[2]) * 10) / 10;
    let divSignal = 'none';
    if (l1l2spread <= -25) divSignal = 'WARNING';
    else if (l1l2spread <= -15) divSignal = 'CAUTION';
    const downgrade = divSignal === 'WARNING';

    // Regime
    let regime;
    if (composite >= 62 && !downgrade) regime = 'Risk-On';
    else if (composite >= 55 && !downgrade) regime = 'Neutral-Bullish';
    else if (composite >= 62 && downgrade) regime = 'Neutral-Bullish*';
    else if (composite >= 55 && downgrade) regime = 'Neutral*';
    else if (composite >= 48) regime = 'Neutral';
    else if (composite >= 38) regime = 'Neutral-Bearish';
    else regime = 'Risk-Off';

    // Print per-series
    for (const r of seriesResults.sort((a, b) => a.layer - b.layer)) {
      if (r.error) {
        console.log(`  L${r.layer} ${r.fredId.padEnd(14)} — ${r.error}`);
      } else {
        console.log(`  L${r.layer} ${r.fredId.padEnd(14)} ${r.phase.padEnd(18)} raw:${String(r.rawPhase).padStart(5)} → adj:${String(r.adjustedScore).padStart(5)}  (${r.cycleLen} bars)`);
      }
    }

    console.log(`\n  Layer scores:  L1=${layerScores[1].toFixed(1)}  L2=${layerScores[2].toFixed(1)}  L3=${layerScores[3].toFixed(1)}  L4=${layerScores[4].toFixed(1)}  L5=${layerScores[5].toFixed(1)}${l5Score === null ? ' (no data)' : ''}`);
    console.log(`  L1-L2 spread: ${l1l2spread > 0 ? '+' : ''}${l1l2spread}  ${divSignal !== 'none' ? '⚠ ' + divSignal : ''}`);
    console.log(`  ► COMPOSITE: ${composite.toFixed(1)}  →  ${regime}  (event: ${event.type})`);

    const matchTop = event.type === 'TOP' && (composite >= 55 || downgrade);
    const matchLow = event.type === 'LOW' && composite < 48;
    const match = matchTop || matchLow;
    console.log(`  ► ${match ? '✓ MATCH' : '✗ MISMATCH'}`);

    // Collect per-series scores for optimizer
    const perSeriesScores = {};
    for (const r of seriesResults) {
      perSeriesScores[r.fredId] = r.adjustedScore; // null if error
    }
    allEventData.push({
      label: event.label, date: event.date, type: event.type,
      scores: perSeriesScores,
      l5Score: l5Score,
    });

    results.push({
      event: event.label, date: event.date, type: event.type,
      composite: Math.round(composite * 10) / 10, regime,
      l1: Math.round(layerScores[1] * 10) / 10,
      l2: Math.round(layerScores[2] * 10) / 10,
      l3: Math.round(layerScores[3] * 10) / 10,
      l4: Math.round(layerScores[4] * 10) / 10,
      l5: l5Score ?? 'N/A',
      spread: l1l2spread, div: divSignal, match,
    });
  }

  // Summary table
  console.log('\n\n' + '='.repeat(100));
  console.log('SUMMARY');
  console.log('='.repeat(100));
  console.log('Event'.padEnd(24) + 'Date'.padEnd(13) + 'Type'.padEnd(6) + 'Comp'.padStart(6) + '  Regime'.padEnd(20) + '  L1'.padStart(6) + '  L2'.padStart(6) + '  L3'.padStart(6) + '  L4'.padStart(6) + '  L5'.padStart(6) + '  Sprd'.padStart(6) + '  Div'.padEnd(10) + ' Match');
  console.log('-'.repeat(130));
  for (const r of results) {
    console.log(
      r.event.padEnd(24) +
      r.date.padEnd(13) +
      r.type.padEnd(6) +
      String(r.composite).padStart(6) +
      `  ${r.regime}`.padEnd(20) +
      String(r.l1).padStart(6) +
      String(r.l2).padStart(6) +
      String(r.l3).padStart(6) +
      String(r.l4).padStart(6) +
      String(r.l5).padStart(6) +
      String(r.spread).padStart(6) +
      `  ${r.div}`.padEnd(10) +
      ` ${r.match ? '✓' : '✗'}`
    );
  }

  const matches = results.filter(r => r.match).length;
  console.log(`\nScore: ${matches}/${results.length} events matched (${((matches / results.length) * 100).toFixed(0)}%)`);

  // Save per-series scores for optimizer (needed for per-series weight optimization)
  const fs = await import('fs');
  // Build per-event per-series data
  const scoreData = [];
  // Re-run events to collect per-series scores — we already have them in the loop above
  // We'll store them during the main loop instead
  fs.writeFileSync('backtest_scores_v2.json', JSON.stringify(allEventData, null, 2));
  console.log('\nSaved per-series scores to backtest_scores_v2.json');
}

main().catch(e => console.error('Fatal:', e));
