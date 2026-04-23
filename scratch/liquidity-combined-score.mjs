/**
 * Liquidity Layer — Combined Score (Phase Status + CRSI blend)
 *
 * Score = 0.5 × phaseStatusScore + 0.5 × crsi
 * Phase score derived from verbal phase status (not avgPhaseScore number)
 */

const API_KEY = 'wttmaster5809';
const BASE_URL = 'https://api.cycle.tools';

// ── Phase Status → Score mapping ──

const PHASE_SCORE = {
  'BOTTOM_Departure':            90,
  'Uptrend_Starting':            80,
  'Uptrend_Neutral':             70,
  'Uptrend_ApproachingTop':      55,
  'TOP_Arrival':                 40,
  'TOP_Departure':               30,
  'Downtrend_Starting':          20,
  'Downtrend_Neutral':           15,
  'Downtrend_ApproachingBottom': 40,
  'BOTTOM_Arrival':              60,
};

function getPhaseScore(phaseStatus) {
  return PHASE_SCORE[phaseStatus] ?? 50;
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

// ── Series helpers ──

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
      result.push({
        date: series[i].date,
        close: ((curr - prev) / Math.abs(prev)) * 100,
      });
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
  if (!dom) {
    console.log(`  ${label}: No dominant cycle`);
    return null;
  }

  const crsiResult = await getCrsi(closes, dom.cycleLength);
  const crsiArr = Array.isArray(crsiResult.crsi || crsiResult) ? (crsiResult.crsi || crsiResult) : [];
  const crsi = crsiArr[crsiArr.length - 1] ?? 50;

  const phaseScore = getPhaseScore(dom.phaseStatus);
  const combinedScore = 0.5 * phaseScore + 0.5 * crsi;

  const mo = (dom.cycleLength * 7 / 30.44).toFixed(1);

  console.log(`\n  ${label}`);
  console.log(`    Dominant: ${dom.cycleLength} bars (~${mo} mo)  Bartels=${dom.bartelsValue.toFixed(1)}  Stab=${dom.stabilityScore.toFixed(2)}`);
  console.log(`    Phase: ${dom.phaseStatus.padEnd(30)} → Phase Score: ${phaseScore}`);
  console.log(`    CRSI: ${crsi.toFixed(1)}`);
  console.log(`    Combined: 0.5 × ${phaseScore} + 0.5 × ${crsi.toFixed(1)} = ${combinedScore.toFixed(1)}`);

  return { label, dom, crsi, phaseScore, combinedScore, bartels: dom.bartelsValue };
}

// ── Main ──

async function main() {
  console.log('=== Liquidity Layer — Combined Score (Phase + CRSI) ===\n');
  console.log('Formula: seriesScore = 0.5 × phaseStatusScore + 0.5 × crsi\n');
  console.log('Phase Status Mapping:');
  for (const [phase, score] of Object.entries(PHASE_SCORE)) {
    console.log(`  ${phase.padEnd(30)} → ${score}`);
  }

  // ── Fetch & derive NFL ──
  console.log('\nFetching components...');
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

  // ── Tier A ──
  console.log('\n' + '═'.repeat(60));
  console.log('TIER A — Net Fed Liquidity (50%)');
  console.log('═'.repeat(60));
  const nflResult = await processSeries('Net Fed Liquidity', nflCloses);

  // ── Tier B ──
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

  // ── Tier C ──
  console.log('\n' + '═'.repeat(60));
  console.log('TIER C — Reserve Availability (15%)');
  console.log('═'.repeat(60));

  const wresbalBars = await ensureAndFetch('WRESBAL-W:FDS');
  const wresbalTrimmed = wresbalBars.filter(b => b.date >= '2014-01-01');
  const wresbalMom = momentum52w(wresbalTrimmed);
  const tierCResult = await processSeries('WRESBAL (Reserve Balances)', wresbalMom.map(m => m.close));

  // ═══════════════════════════════════════════════════════
  // COMPOSITE — Compare old (CRSI-only) vs new (combined)
  // ═══════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(60));
  console.log('LIQUIDITY LAYER COMPOSITE — OLD vs NEW');
  console.log('═'.repeat(60));

  // Tier A score
  const tierAOld = nflResult?.crsi ?? 50;
  const tierANew = nflResult?.combinedScore ?? 50;

  // Tier B: bartels-weighted average
  let tierBOld = 50, tierBNew = 50;
  if (tierBResults.length > 0) {
    const bartelsSum = tierBResults.reduce((s, r) => s + r.bartels, 0);
    tierBOld = tierBResults.reduce((s, r) => s + r.crsi * (r.bartels / bartelsSum), 0);
    tierBNew = tierBResults.reduce((s, r) => s + r.combinedScore * (r.bartels / bartelsSum), 0);
  }

  // Tier C score
  const tierCOld = tierCResult?.crsi ?? 50;
  const tierCNew = tierCResult?.combinedScore ?? 50;

  // Composites
  const oldScore = 0.50 * tierAOld + 0.35 * tierBOld + 0.15 * tierCOld;
  const newScore = 0.50 * tierANew + 0.35 * tierBNew + 0.15 * tierCNew;

  console.log('\n  OLD METHOD (CRSI only):');
  console.log(`    Tier A: ${tierAOld.toFixed(1)} × 0.50 = ${(tierAOld * 0.50).toFixed(1)}`);
  console.log(`    Tier B: ${tierBOld.toFixed(1)} × 0.35 = ${(tierBOld * 0.35).toFixed(1)}`);
  console.log(`    Tier C: ${tierCOld.toFixed(1)} × 0.15 = ${(tierCOld * 0.15).toFixed(1)}`);
  console.log(`    ► SCORE: ${oldScore.toFixed(1)}`);

  console.log('\n  NEW METHOD (0.5 × Phase + 0.5 × CRSI):');
  console.log(`    Tier A: ${tierANew.toFixed(1)} × 0.50 = ${(tierANew * 0.50).toFixed(1)}`);
  console.log(`    Tier B: ${tierBNew.toFixed(1)} × 0.35 = ${(tierBNew * 0.35).toFixed(1)}`);
  console.log(`    Tier C: ${tierCNew.toFixed(1)} × 0.15 = ${(tierCNew * 0.15).toFixed(1)}`);
  console.log(`    ► SCORE: ${newScore.toFixed(1)}`);

  // Regime labels
  function regime(score) {
    if (score >= 70) return 'Liquidity Expanding';
    if (score >= 55) return 'Liquidity Stable-Positive';
    if (score >= 45) return 'Liquidity Neutral';
    if (score >= 30) return 'Liquidity Tightening';
    return 'Liquidity Contracting';
  }

  console.log(`\n  OLD Regime: ${regime(oldScore)}`);
  console.log(`  NEW Regime: ${regime(newScore)}`);
  console.log(`  Difference: ${(newScore - oldScore).toFixed(1)} points`);

  // ── Detail breakdown ──
  console.log('\n\n' + '═'.repeat(60));
  console.log('DETAIL: Per-series Phase vs CRSI breakdown');
  console.log('═'.repeat(60));
  console.log('  ' + 'Series'.padEnd(25) + 'Phase'.padEnd(30) + 'PhSc'.padEnd(6) + 'CRSI'.padEnd(7) + 'Combined');
  console.log('  ' + '─'.repeat(75));

  if (nflResult) {
    console.log('  ' + 'Net Fed Liquidity'.padEnd(25) + nflResult.dom.phaseStatus.padEnd(30) + String(nflResult.phaseScore).padEnd(6) + nflResult.crsi.toFixed(1).padEnd(7) + nflResult.combinedScore.toFixed(1));
  }
  for (const r of tierBResults) {
    console.log('  ' + r.label.substring(0, 24).padEnd(25) + r.dom.phaseStatus.padEnd(30) + String(r.phaseScore).padEnd(6) + r.crsi.toFixed(1).padEnd(7) + r.combinedScore.toFixed(1));
  }
  if (tierCResult) {
    console.log('  ' + tierCResult.label.substring(0, 24).padEnd(25) + tierCResult.dom.phaseStatus.padEnd(30) + String(tierCResult.phaseScore).padEnd(6) + tierCResult.crsi.toFixed(1).padEnd(7) + tierCResult.combinedScore.toFixed(1));
  }
}

main().catch(e => console.error('Fatal:', e));
