/**
 * Liquidity Layer — Interpolated Phase+CRSI scoring
 *
 * Phase score derived from BOTH phaseStatus string AND avgPhaseScore,
 * using linear interpolation within each phase's score range.
 * This gives finer granularity for broad phases like Uptrend_Neutral and Downtrend_Neutral.
 */

const API_KEY = 'wttmaster5809';
const BASE_URL = 'https://api.cycle.tools';

// ── Phase Scoring with Interpolation ──
// Each phase defines: [minScore, maxScore, minAvgPhase, maxAvgPhase]
// Interpolation: maps avgPhaseScore within [minAvgPhase, maxAvgPhase] → [minScore, maxScore]

const PHASE_RANGES = {
  //                            scoreHigh  scoreLow  avgPhLow  avgPhHigh
  // (scoreHigh is for the "better" end of the phase, scoreLow for the "worse" end)
  'BOTTOM_Departure':          { scoreRange: [85, 95],  phaseRange: [-100, -60] },  // more negative avgPh = deeper bottom = higher score
  'Uptrend_Starting':          { scoreRange: [76, 84],  phaseRange: [-80, -30] },
  'Uptrend_Neutral':           { scoreRange: [58, 75],  phaseRange: [-30, 60] },    // wide range — key interpolation target
  'Uptrend_ApproachingTop':    { scoreRange: [52, 58],  phaseRange: [30, 80] },
  'TOP_Arrival':               { scoreRange: [36, 44],  phaseRange: [60, 100] },
  'TOP_Departure':             { scoreRange: [26, 34],  phaseRange: [80, 100] },
  'Downtrend_Starting':        { scoreRange: [16, 24],  phaseRange: [60, 100] },
  'Downtrend_Neutral':         { scoreRange: [15, 35],  phaseRange: [-60, 30] },    // wide range — key interpolation target
  'Downtrend_ApproachingBottom': { scoreRange: [36, 44], phaseRange: [-80, -30] },
  'BOTTOM_Arrival':            { scoreRange: [56, 64],  phaseRange: [-100, -60] },
};

function getPhaseScore(phaseStatus, avgPhaseScore) {
  const range = PHASE_RANGES[phaseStatus];
  if (!range) return 50; // fallback

  const [scoreLow, scoreHigh] = range.scoreRange;
  const [phaseLow, phaseHigh] = range.phaseRange;

  if (avgPhaseScore === null || avgPhaseScore === undefined) {
    return (scoreLow + scoreHigh) / 2; // midpoint fallback
  }

  // Determine interpolation direction based on phase type
  // Uptrend phases: lower avgPhaseScore = earlier in uptrend = MORE bullish = HIGHER score
  // Downtrend phases: lower avgPhaseScore = later in downtrend = closer to bottom = HIGHER score
  // Transition phases: direction depends on whether it's a top or bottom transition

  const isUptrendOrBottomPhase = [
    'BOTTOM_Departure', 'Uptrend_Starting', 'Uptrend_Neutral',
    'Uptrend_ApproachingTop', 'BOTTOM_Arrival'
  ].includes(phaseStatus);

  const isDowntrendOrTopPhase = [
    'TOP_Arrival', 'TOP_Departure', 'Downtrend_Starting',
    'Downtrend_Neutral', 'Downtrend_ApproachingBottom'
  ].includes(phaseStatus);

  // Clamp avgPhaseScore to expected range
  const clamped = Math.max(phaseLow, Math.min(phaseHigh, avgPhaseScore));

  // Normalize to 0-1 within the phase's avgPhaseScore range
  const t = (phaseHigh !== phaseLow) ? (clamped - phaseLow) / (phaseHigh - phaseLow) : 0.5;

  let score;
  if (phaseStatus === 'Uptrend_Neutral') {
    // Higher avgPhase (closer to top) → lower score
    score = scoreHigh - t * (scoreHigh - scoreLow);
  } else if (phaseStatus === 'Downtrend_Neutral') {
    // Lower avgPhase (closer to bottom) → higher score (improving)
    score = scoreLow + (1 - t) * (scoreHigh - scoreLow);
  } else if (phaseStatus === 'BOTTOM_Departure') {
    // More negative avgPhase (deeper departure) → higher score (stronger signal)
    score = scoreHigh - t * (scoreHigh - scoreLow);
  } else if (phaseStatus === 'Uptrend_Starting') {
    score = scoreHigh - t * (scoreHigh - scoreLow);
  } else if (phaseStatus === 'Uptrend_ApproachingTop') {
    // Higher avgPhase (closer to top) → lower score
    score = scoreHigh - t * (scoreHigh - scoreLow);
  } else if (phaseStatus === 'TOP_Arrival') {
    // Higher avgPhase → deeper into top → lower score
    score = scoreHigh - t * (scoreHigh - scoreLow);
  } else if (phaseStatus === 'TOP_Departure') {
    // Higher avgPhase → just left top → slightly higher score (not as bad yet)
    score = scoreHigh - t * (scoreHigh - scoreLow);
  } else if (phaseStatus === 'Downtrend_Starting') {
    // Higher avgPhase → just started → slightly higher score
    score = scoreHigh - t * (scoreHigh - scoreLow);
  } else if (phaseStatus === 'Downtrend_ApproachingBottom') {
    // Lower avgPhase → closer to bottom → higher score (hopeful)
    score = scoreLow + (1 - t) * (scoreHigh - scoreLow);
  } else if (phaseStatus === 'BOTTOM_Arrival') {
    // More negative → deeper arrival → higher score
    score = scoreHigh - t * (scoreHigh - scoreLow);
  } else {
    score = (scoreLow + scoreHigh) / 2;
  }

  return Math.round(score * 10) / 10;
}

// ── API helpers (same as before) ──

async function fetchJson(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  if (text.includes('quota exceeded')) throw new Error('Quota exceeded');
  try { return JSON.parse(text); }
  catch {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
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
    if (prev !== 0) {
      result.push({ date: series[i].date, close: ((curr - prev) / Math.abs(prev)) * 100 });
    }
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

// ── Process one series ──

async function processSeries(label, closes) {
  const scan = await runCycleScanner(closes);
  const dom = extractDominant(scan.peaks);
  if (!dom) { console.log(`  ${label}: No dominant cycle`); return null; }

  const crsiResult = await getCrsi(closes, dom.cycleLength);
  const crsiArr = Array.isArray(crsiResult.crsi || crsiResult) ? (crsiResult.crsi || crsiResult) : [];
  const crsi = crsiArr[crsiArr.length - 1] ?? 50;

  const phaseScore = getPhaseScore(dom.phaseStatus, dom.avgPhaseScore);
  const fixedPhaseScore = getPhaseScore(dom.phaseStatus, null); // midpoint for comparison
  const combinedScore = 0.5 * phaseScore + 0.5 * crsi;

  const mo = (dom.cycleLength * 7 / 30.44).toFixed(1);

  console.log(`\n  ${label}`);
  console.log(`    Dominant: ${dom.cycleLength} bars (~${mo} mo)  Bartels=${dom.bartelsValue.toFixed(1)}`);
  console.log(`    Phase: ${dom.phaseStatus}  avgPhaseScore: ${dom.avgPhaseScore}`);
  console.log(`    Phase Score: ${phaseScore} (fixed midpoint would be: ${fixedPhaseScore})`);
  console.log(`    CRSI: ${crsi.toFixed(1)}`);
  console.log(`    Combined: 0.5 × ${phaseScore} + 0.5 × ${crsi.toFixed(1)} = ${combinedScore.toFixed(1)}`);

  return { label, dom, crsi, phaseScore, combinedScore, bartels: dom.bartelsValue };
}

// ── Test the interpolation logic ──

function testInterpolation() {
  console.log('=== Phase Score Interpolation Test ===\n');
  console.log('Demonstrating how avgPhaseScore differentiates within each phase:\n');

  const testCases = [
    // Uptrend_Neutral — the key wide phase
    ['Uptrend_Neutral', -30, 'early mid-uptrend (just entered neutral zone)'],
    ['Uptrend_Neutral', -10, 'early-mid uptrend'],
    ['Uptrend_Neutral', 10, 'mid uptrend'],
    ['Uptrend_Neutral', 30, 'mid-late uptrend'],
    ['Uptrend_Neutral', 50, 'late mid-uptrend (approaching top zone)'],
    ['Uptrend_Neutral', 60, 'very late mid-uptrend'],
    ['', '', ''],
    // Downtrend_Neutral — the other key wide phase
    ['Downtrend_Neutral', 30, 'early mid-downtrend (just entered neutral)'],
    ['Downtrend_Neutral', 10, 'early-mid downtrend'],
    ['Downtrend_Neutral', -10, 'mid downtrend'],
    ['Downtrend_Neutral', -30, 'mid-late downtrend'],
    ['Downtrend_Neutral', -50, 'late mid-downtrend (approaching bottom zone)'],
    ['Downtrend_Neutral', -60, 'very late mid-downtrend'],
    ['', '', ''],
    // Transition phases — narrow ranges, less interpolation
    ['BOTTOM_Departure', -95, 'deep departure from bottom'],
    ['BOTTOM_Departure', -60, 'shallow departure from bottom'],
    ['TOP_Arrival', 95, 'deep into top'],
    ['TOP_Arrival', 60, 'just arriving at top'],
    ['Downtrend_Starting', 95, 'just started downtrend'],
    ['Downtrend_Starting', 60, 'downtrend gaining steam'],
    ['Downtrend_ApproachingBottom', -30, 'early approach to bottom'],
    ['Downtrend_ApproachingBottom', -80, 'close to bottom'],
  ];

  console.log('  ' + 'Phase'.padEnd(30) + 'AvgPh'.padEnd(8) + 'Score'.padEnd(8) + 'Context');
  console.log('  ' + '─'.repeat(85));

  for (const [phase, avgPh, desc] of testCases) {
    if (!phase) { console.log(''); continue; }
    const score = getPhaseScore(phase, avgPh);
    console.log('  ' + phase.padEnd(30) + String(avgPh).padEnd(8) + score.toFixed(1).padEnd(8) + desc);
  }
}

// ── Main ──

async function main() {
  testInterpolation();

  console.log('\n\n=== Live Liquidity Scores — Interpolated vs Fixed ===\n');

  // Fetch & derive NFL
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
  const nflCloses = nflMom.map(m => m.close);

  // Tier A
  console.log('═'.repeat(60));
  console.log('TIER A — Net Fed Liquidity (50%)');
  console.log('═'.repeat(60));
  const nflResult = await processSeries('Net Fed Liquidity', nflCloses);

  // Tier B
  console.log('\n' + '═'.repeat(60));
  console.log('TIER B — Private Sector Liquidity (35%)');
  console.log('═'.repeat(60));

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
  console.log('\n' + '═'.repeat(60));
  console.log('TIER C — Reserve Availability (15%)');
  console.log('═'.repeat(60));

  const wresbalBars = await ensureAndFetch('WRESBAL-W:FDS');
  const wresbalTrimmed = wresbalBars.filter(b => b.date >= '2014-01-01');
  const wresbalMom = momentum52w(wresbalTrimmed);
  const tierCResult = await processSeries('WRESBAL (Reserve Balances)', wresbalMom.map(m => m.close));

  // Composite
  console.log('\n\n' + '═'.repeat(60));
  console.log('COMPOSITE LIQUIDITY SCORE');
  console.log('═'.repeat(60));

  const tierA = nflResult?.combinedScore ?? 50;
  let tierB = 50;
  if (tierBResults.length > 0) {
    const bSum = tierBResults.reduce((s, r) => s + r.bartels, 0);
    tierB = tierBResults.reduce((s, r) => s + r.combinedScore * (r.bartels / bSum), 0);
  }
  const tierC = tierCResult?.combinedScore ?? 50;

  const score = 0.50 * tierA + 0.35 * tierB + 0.15 * tierC;

  console.log(`\n  Tier A: ${tierA.toFixed(1)} × 0.50 = ${(tierA * 0.50).toFixed(1)}`);
  console.log(`  Tier B: ${tierB.toFixed(1)} × 0.35 = ${(tierB * 0.35).toFixed(1)}`);
  console.log(`  Tier C: ${tierC.toFixed(1)} × 0.15 = ${(tierC * 0.15).toFixed(1)}`);
  console.log(`\n  ► LIQUIDITY SCORE: ${score.toFixed(1)}`);

  function regime(s) {
    if (s >= 70) return 'Liquidity Expanding';
    if (s >= 55) return 'Liquidity Stable-Positive';
    if (s >= 45) return 'Liquidity Neutral';
    if (s >= 30) return 'Liquidity Tightening';
    return 'Liquidity Contracting';
  }
  console.log(`  ► REGIME: ${regime(score)}`);

  // Compare with previous methods
  console.log('\n  Comparison:');
  const crsiOnly = 0.50 * (nflResult?.crsi ?? 50)
    + 0.35 * (tierBResults.length > 0 ? tierBResults.reduce((s, r) => s + r.crsi * (r.bartels / tierBResults.reduce((s2, r2) => s2 + r2.bartels, 0)), 0) : 50)
    + 0.15 * (tierCResult?.crsi ?? 50);
  console.log(`    CRSI-only method:      ${crsiOnly.toFixed(1)} (${regime(crsiOnly)})`);
  console.log(`    Fixed phase+CRSI:      (previous run was 35.2)`);
  console.log(`    Interpolated phase+CRSI: ${score.toFixed(1)} (${regime(score)})`);
}

main().catch(e => console.error('Fatal:', e));
