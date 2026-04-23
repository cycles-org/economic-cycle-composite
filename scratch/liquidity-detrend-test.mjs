/**
 * Liquidity Detrend Test — Compare cycle detection on:
 *   1. Raw Net Fed Liquidity levels
 *   2. HP-filtered cyclical component
 *   3. YoY % change (momentum)
 *   4. 13-week rate of change (quarterly momentum)
 *
 * Goal: Find the ~65-month (~283 weekly bars) Howell liquidity cycle
 */

const API_KEY = 'wttmaster5809';
const BASE_URL = 'https://api.cycle.tools';

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
  const ensureUrl = `${BASE_URL}/api/data/EnsureCompleteDataset?api_key=${API_KEY}&tickerId=${encodeURIComponent(tickerId)}`;
  const ensureResp = await fetch(ensureUrl);
  const ensureResult = await ensureResp.json();
  if (ensureResult.trackingId && !ensureResult.isComplete) {
    await fetch(`${BASE_URL}/api/data/WaitUntilUpdateCompleted?api_key=${API_KEY}&requestId=${ensureResult.trackingId}`);
  }
  const url = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${API_KEY}&tickerid=${encodeURIComponent(tickerId)}&maxbars=0`;
  return fetchJson(url);
}

async function runCycleScanner(closes, minCycle = 10, maxCycle = 400) {
  const url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}&minCycleLength=${minCycle}&maxCycleLength=${maxCycle}&sortByStrength=true&includeSpectrum=false&dominantPeakFinder=true&useStability=true`;
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

async function hpDetrend(closes, lambda = 0) {
  const url = `${BASE_URL}/api/DSP/Detrend?api_key=${API_KEY}&dtype=0&lbda=${lambda}&ret=false`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(closes),
  });
  const text = await resp.text();
  try { return JSON.parse(text); }
  catch {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`Detrend parse: ${text.substring(0, 100)}`);
  }
}

async function boostedHpDetrend(closes) {
  const url = `${BASE_URL}/api/DSP/Detrend?api_key=${API_KEY}&dtype=1&lbda=0&ret=false`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(closes),
  });
  const text = await resp.text();
  try { return JSON.parse(text); }
  catch {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`Detrend parse: ${text.substring(0, 100)}`);
  }
}

// ── Derive Net Fed Liquidity ──

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
    if (wed) { result.push({ date: wed.date, close: wed.close }); }
    else {
      const prior = days.filter(d => d.dayOfWeek <= 3).sort((a, b) => b.dayOfWeek - a.dayOfWeek);
      result.push((prior[0] || days[days.length - 1]));
    }
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

// ── Analyze peaks ──

function analyzePeaks(label, scan) {
  console.log(`\n  --- ${label} ---`);
  if (!scan.peaks?.length) { console.log('    No peaks found'); return; }

  console.log(`  ${scan.peaks.length} peaks found. Top 8 by strength:`);
  const sorted = [...scan.peaks].sort((a, b) => b.strength - a.strength).slice(0, 8);

  console.log('    ' + 'Length'.padEnd(8) + 'Months'.padEnd(9) + 'Str'.padEnd(10) + 'Bartels'.padEnd(10) + 'Stab'.padEnd(8) + 'DomRank'.padEnd(9) + 'Phase'.padEnd(22) + 'AvgPhase');
  console.log('    ' + '-'.repeat(90));

  for (const p of sorted) {
    const months = (p.cycleLength * 7 / 30.44).toFixed(1);
    console.log(
      '    ' +
      String(p.cycleLength).padEnd(8) +
      months.padEnd(9) +
      p.strength.toFixed(1).padEnd(10) +
      p.bartelsValue.toFixed(1).padEnd(10) +
      p.stabilityScore.toFixed(2).padEnd(8) +
      String(p.dominantRank).padEnd(9) +
      p.phaseStatus.padEnd(22) +
      (p.avgPhaseScore?.toFixed(1) ?? 'N/A')
    );
  }

  // Check for Howell's ~65-month cycle (250-320 bars)
  const howellRange = scan.peaks.filter(p => p.cycleLength >= 250 && p.cycleLength <= 320);
  if (howellRange.length > 0) {
    const best = howellRange.sort((a, b) => b.strength - a.strength)[0];
    console.log(`\n  ► HOWELL MATCH: ${best.cycleLength} bars (~${(best.cycleLength * 7 / 30.44).toFixed(1)} months)  Bartels: ${best.bartelsValue.toFixed(1)}  Stability: ${best.stabilityScore.toFixed(2)}  Phase: ${best.phaseStatus}`);
  } else {
    // Check broader range
    const broader = scan.peaks.filter(p => p.cycleLength >= 200 && p.cycleLength <= 400);
    if (broader.length > 0) {
      const best = broader.sort((a, b) => b.strength - a.strength)[0];
      console.log(`\n  ► Nearest to Howell: ${best.cycleLength} bars (~${(best.cycleLength * 7 / 30.44).toFixed(1)} months)  Bartels: ${best.bartelsValue.toFixed(1)}  Phase: ${best.phaseStatus}`);
    } else {
      console.log(`\n  ► No cycle in 200-400 bar range detected`);
    }
  }

  // Dominant by our extraction logic
  const viable = scan.peaks.filter(p => p.cycleLength >= 20 && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  const pool = viable.length > 0 ? viable : scan.peaks.filter(p => p.cycleLength >= 20);
  const ranked = pool.filter(p => p.dominantRank > 0);
  const dom = ranked.length > 0 ? ranked.sort((a, b) => a.dominantRank - b.dominantRank)[0] : pool.sort((a, b) => b.strength - a.strength)[0];
  if (dom) {
    console.log(`  ► Extracted dominant: ${dom.cycleLength} bars (~${(dom.cycleLength * 7 / 30.44).toFixed(1)} months)  Phase: ${dom.phaseStatus}  AvgPhase: ${dom.avgPhaseScore?.toFixed(1) ?? 'N/A'}`);
  }
}

// ── Transforms ──

function yoyChange(series) {
  // 52-week (1 year) percent change
  const result = [];
  for (let i = 52; i < series.length; i++) {
    if (series[i - 52] !== 0) {
      result.push(((series[i] - series[i - 52]) / Math.abs(series[i - 52])) * 100);
    } else {
      result.push(0);
    }
  }
  return result;
}

function quarterlyRoc(series) {
  // 13-week rate of change
  const result = [];
  for (let i = 13; i < series.length; i++) {
    if (series[i - 13] !== 0) {
      result.push(((series[i] - series[i - 13]) / Math.abs(series[i - 13])) * 100);
    } else {
      result.push(0);
    }
  }
  return result;
}

// ── Main ──

async function main() {
  console.log('=== Liquidity Detrend Comparison ===\n');
  console.log('Goal: Detect Howell\'s ~65-month (~283 weekly bars) liquidity cycle\n');

  // Fetch components
  console.log('Fetching components...');
  const [walcl, swpt, rrpDaily, wtregen] = await Promise.all([
    ensureAndFetch('WALCL-W:FDS'),
    ensureAndFetch('SWPT-W:FDS'),
    ensureAndFetch('RRPONTSYD:FDS'),
    ensureAndFetch('WTREGEN-W:FDS'),
  ]);
  console.log(`  WALCL: ${walcl.length}, SWPT: ${swpt.length}, RRPONTSYD: ${rrpDaily.length}, WTREGEN: ${wtregen.length}`);

  // Derive
  const rrpWeekly = downsampleToWeekly(rrpDaily);
  const derived = [];
  for (const wBar of walcl) {
    const r = findNearest(rrpWeekly, wBar.date);
    const t = findNearest(wtregen, wBar.date);
    const s = findNearest(swpt, wBar.date);
    if (r && t && s && wBar.close != null) {
      derived.push({ date: wBar.date, close: wBar.close + (s.close || 0) - (r.close || 0) - (t.close || 0) });
    }
  }
  const rawCloses = derived.map(d => d.close);
  console.log(`\nDerived Net Fed Liquidity: ${rawCloses.length} weekly points\n`);

  // ── Test 1: Raw levels ──
  console.log('=' .repeat(70));
  console.log('TEST 1: RAW LEVELS (current approach)');
  console.log('=' .repeat(70));
  const scan1 = await runCycleScanner(rawCloses);
  analyzePeaks('Raw Net Fed Liquidity', scan1);

  // ── Test 2: HP filter (standard) ──
  console.log('\n\n' + '=' .repeat(70));
  console.log('TEST 2: HP FILTER (cyclical component, auto lambda)');
  console.log('=' .repeat(70));
  try {
    const hpCyclical = await hpDetrend(rawCloses);
    console.log(`  HP cyclical component: ${hpCyclical.length} points`);
    console.log(`  Sample (last 5): ${hpCyclical.slice(-5).map(v => v.toFixed(1)).join(', ')}`);
    const scan2 = await runCycleScanner(hpCyclical);
    analyzePeaks('HP-Filtered Cyclical Component', scan2);
  } catch (e) {
    console.log(`  HP detrend failed: ${e.message}`);
  }

  // ── Test 3: Boosted HP filter ──
  console.log('\n\n' + '=' .repeat(70));
  console.log('TEST 3: BOOSTED HP FILTER');
  console.log('=' .repeat(70));
  try {
    const bhpCyclical = await boostedHpDetrend(rawCloses);
    console.log(`  Boosted HP cyclical: ${bhpCyclical.length} points`);
    console.log(`  Sample (last 5): ${bhpCyclical.slice(-5).map(v => v.toFixed(1)).join(', ')}`);
    const scan3 = await runCycleScanner(bhpCyclical);
    analyzePeaks('Boosted HP-Filtered Cyclical Component', scan3);
  } catch (e) {
    console.log(`  Boosted HP failed: ${e.message}`);
  }

  // ── Test 4: YoY % change ──
  console.log('\n\n' + '=' .repeat(70));
  console.log('TEST 4: YEAR-OVER-YEAR % CHANGE (52-week momentum)');
  console.log('=' .repeat(70));
  const yoy = yoyChange(rawCloses);
  console.log(`  YoY series: ${yoy.length} points`);
  console.log(`  Current YoY: ${yoy[yoy.length - 1]?.toFixed(2)}%`);
  console.log(`  Sample (last 5): ${yoy.slice(-5).map(v => v.toFixed(2) + '%').join(', ')}`);
  const scan4 = await runCycleScanner(yoy);
  analyzePeaks('YoY % Change', scan4);

  // ── Test 5: 13-week ROC ──
  console.log('\n\n' + '=' .repeat(70));
  console.log('TEST 5: 13-WEEK RATE OF CHANGE (quarterly momentum)');
  console.log('=' .repeat(70));
  const roc13 = quarterlyRoc(rawCloses);
  console.log(`  13w ROC series: ${roc13.length} points`);
  console.log(`  Current 13w ROC: ${roc13[roc13.length - 1]?.toFixed(2)}%`);
  const scan5 = await runCycleScanner(roc13);
  analyzePeaks('13-Week ROC', scan5);

  // ── Summary ──
  console.log('\n\n' + '=' .repeat(70));
  console.log('SUMMARY: Which transform best detects Howell\'s 65-month cycle?');
  console.log('=' .repeat(70));
}

main().catch(e => console.error('Fatal:', e));
