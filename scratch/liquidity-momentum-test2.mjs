/**
 * Liquidity Momentum Pipeline v2 — Fix outliers & test multiple windows
 *
 * Issues found in v1:
 *   - Early momentum data has extreme outliers (433% YoY) from RRP starting near zero
 *   - Short-term operational cycles dominate
 *
 * Fixes:
 *   1. Trim data to start from 2015+ (when all components are well-established)
 *   2. Test 52-week, 26-week, and 39-week momentum windows
 *   3. Test with and without SWPT
 */

import { readFileSync } from 'fs';

const API_KEY = 'wttmaster5809';
const BASE_URL = 'https://api.cycle.tools';

// ── Load Howell GLI for comparison ──

function loadGli() {
  const csv = readFileSync('C:\\Users\\LARS\\Downloads\\gliraw.csv', 'utf-8');
  const lines = csv.trim().split('\n').slice(1);
  return lines.map(line => {
    const [dateStr, valStr] = line.split(',');
    const parts = dateStr.split('/');
    const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    return { date, dateStr: date.toISOString().substring(0, 10), close: parseFloat(valStr) };
  }).filter(d => !isNaN(d.close));
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

async function runCycleScanner(closes, dType = 9) {
  const url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}&minCycleLength=10&maxCycleLength=400&sortByStrength=true&includeSpectrum=false&dominantPeakFinder=true&useStability=true&dType=${dType}`;
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

function momentum(series, lookback) {
  const result = [];
  for (let i = lookback; i < series.length; i++) {
    const prev = series[i - lookback].close;
    const curr = series[i].close;
    if (prev !== 0) {
      result.push({
        date: series[i].date,
        dateStr: (typeof series[i].date === 'string' ? series[i].date : series[i].date.toISOString()).substring(0, 10),
        close: ((curr - prev) / Math.abs(prev)) * 100,
      });
    }
  }
  return result;
}

function showPeaks(label, scan) {
  console.log(`\n  ${label}: ${scan.peaks?.length ?? 0} peaks`);
  if (!scan.peaks?.length) return null;
  const sorted = [...scan.peaks].sort((a, b) => b.strength - a.strength).slice(0, 10);
  console.log('    ' + 'Len'.padEnd(6) + 'Mo'.padEnd(8) + 'Str'.padEnd(10) + 'Bartels'.padEnd(9) + 'Stab'.padEnd(7) + 'Dom'.padEnd(5) + 'Phase'.padEnd(28) + 'AvgPh');
  console.log('    ' + '-'.repeat(80));
  for (const p of sorted) {
    const mo = (p.cycleLength * 7 / 30.44).toFixed(1);
    console.log('    ' + String(p.cycleLength).padEnd(6) + mo.padEnd(8) + p.strength.toFixed(1).padEnd(10) + p.bartelsValue.toFixed(1).padEnd(9) + p.stabilityScore.toFixed(2).padEnd(7) + String(p.dominantRank).padEnd(5) + p.phaseStatus.padEnd(28) + (p.avgPhaseScore?.toFixed(1) ?? 'N/A'));
  }

  // Howell 65-month range: 230-330 bars
  const howell = scan.peaks.filter(p => p.cycleLength >= 230 && p.cycleLength <= 330);
  if (howell.length) {
    const best = howell.sort((a, b) => b.bartelsValue - a.bartelsValue)[0];
    console.log(`\n    ► 65-MONTH MATCH: ${best.cycleLength} bars (${(best.cycleLength * 7 / 30.44).toFixed(1)} months)  Bartels=${best.bartelsValue.toFixed(1)}  Stab=${best.stabilityScore.toFixed(2)}  Phase=${best.phaseStatus}`);
    return best;
  }
  const broader = scan.peaks.filter(p => p.cycleLength >= 150 && p.cycleLength <= 400);
  if (broader.length) {
    const best = broader.sort((a, b) => b.bartelsValue - a.bartelsValue)[0];
    console.log(`\n    ► Nearest long: ${best.cycleLength} bars (${(best.cycleLength * 7 / 30.44).toFixed(1)} months)  Bartels=${best.bartelsValue.toFixed(1)}  Phase=${best.phaseStatus}`);
    return best;
  }
  console.log(`\n    ► No long cycle detected`);
  return null;
}

// ── Main ──

async function main() {
  console.log('=== Liquidity Momentum v2 — Outlier Fix + Multiple Windows ===\n');

  // ── Fetch components ──
  console.log('Fetching FRED components...');
  const [walcl, swpt, rrpDaily, wtregen] = await Promise.all([
    ensureAndFetch('WALCL-W:FDS'),
    ensureAndFetch('SWPT-W:FDS'),
    ensureAndFetch('RRPONTSYD:FDS'),
    ensureAndFetch('WTREGEN-W:FDS'),
  ]);
  console.log(`  WALCL: ${walcl.length}  SWPT: ${swpt.length}  RRPONTSYD: ${rrpDaily.length}  WTREGEN: ${wtregen.length}`);

  // ── Derive level ──
  const rrpWeekly = downsampleToWeekly(rrpDaily);
  const level = [];
  for (const wBar of walcl) {
    const r = findNearest(rrpWeekly, wBar.date);
    const t = findNearest(wtregen, wBar.date);
    const s = findNearest(swpt, wBar.date);
    if (r && t && s && wBar.close != null) {
      level.push({
        date: wBar.date,
        dateStr: wBar.date.substring(0, 10),
        close: wBar.close + (s.close || 0) - (r.close || 0) - (t.close || 0),
      });
    }
  }
  console.log(`\nFull level: ${level.length} points (${level[0]?.dateStr} → ${level[level.length - 1]?.dateStr})`);

  // ── Show data distribution to understand the outlier issue ──
  console.log('\n--- Level series stats by year ---');
  const byYear = {};
  for (const pt of level) {
    const yr = pt.dateStr.substring(0, 4);
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(pt.close);
  }
  for (const [yr, vals] of Object.entries(byYear)) {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    console.log(`  ${yr}: ${vals.length} pts  min=${(min / 1e6).toFixed(2)}T  max=${(max / 1e6).toFixed(2)}T  avg=${(avg / 1e6).toFixed(2)}T`);
  }

  // ── TEST A: Full data, different momentum windows ──
  console.log('\n\n' + '='.repeat(70));
  console.log('TEST A: FULL DATA — Multiple Momentum Windows');
  console.log('='.repeat(70));

  for (const lookback of [52, 39, 26]) {
    const mom = momentum(level, lookback);
    console.log(`\n  --- ${lookback}-week momentum (${(lookback / 52 * 12).toFixed(0)}mo lookback) ---`);
    console.log(`  Points: ${mom.length}  Range: ${mom[0]?.dateStr} → ${mom[mom.length - 1]?.dateStr}`);
    console.log(`  Current: ${mom[mom.length - 1]?.close.toFixed(2)}%`);

    // Check for extreme outliers
    const vals = mom.map(m => m.close);
    const sorted = [...vals].sort((a, b) => a - b);
    const p5 = sorted[Math.floor(sorted.length * 0.05)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const max = sorted[sorted.length - 1];
    const min = sorted[0];
    console.log(`  Min: ${min.toFixed(1)}%  P5: ${p5.toFixed(1)}%  P95: ${p95.toFixed(1)}%  Max: ${max.toFixed(1)}%`);

    const scan = await runCycleScanner(vals);
    showPeaks(`${lookback}w momentum — full data`, scan);
  }

  // ── TEST B: Trimmed data (2015+), remove early RRP artifact ──
  console.log('\n\n' + '='.repeat(70));
  console.log('TEST B: TRIMMED DATA (levels from 2014+) — 52-week momentum');
  console.log('='.repeat(70));
  console.log('(Reason: RRPONTSYD only meaningful from mid-2013, need 1yr lookback → trim to 2014+)');

  const level2014 = level.filter(l => l.dateStr >= '2014-01-01');
  console.log(`  Level from 2014: ${level2014.length} points (${level2014[0]?.dateStr} → ${level2014[level2014.length - 1]?.dateStr})`);

  const mom52_trimmed = momentum(level2014, 52);
  console.log(`  52w momentum: ${mom52_trimmed.length} points (${mom52_trimmed[0]?.dateStr} → ${mom52_trimmed[mom52_trimmed.length - 1]?.dateStr})`);

  const vals52t = mom52_trimmed.map(m => m.close);
  const sorted52t = [...vals52t].sort((a, b) => a - b);
  console.log(`  Min: ${sorted52t[0].toFixed(1)}%  Max: ${sorted52t[sorted52t.length - 1].toFixed(1)}%`);

  const scan52t = await runCycleScanner(vals52t);
  showPeaks('52w momentum — trimmed 2014+', scan52t);

  // Also try 26-week on trimmed
  const mom26_trimmed = momentum(level2014, 26);
  console.log(`\n  26w momentum: ${mom26_trimmed.length} points`);
  const vals26t = mom26_trimmed.map(m => m.close);
  const scan26t = await runCycleScanner(vals26t);
  showPeaks('26w momentum — trimmed 2014+', scan26t);

  // ── TEST C: Simplified formula (no SWPT) ──
  console.log('\n\n' + '='.repeat(70));
  console.log('TEST C: SIMPLIFIED NFL (WALCL - RRP - TGA, no SWPT)');
  console.log('='.repeat(70));

  const levelSimple = [];
  for (const wBar of walcl) {
    const r = findNearest(rrpWeekly, wBar.date);
    const t = findNearest(wtregen, wBar.date);
    if (r && t && wBar.close != null) {
      levelSimple.push({
        date: wBar.date,
        dateStr: wBar.date.substring(0, 10),
        close: wBar.close - (r.close || 0) - (t.close || 0),
      });
    }
  }
  const levelSimple2014 = levelSimple.filter(l => l.dateStr >= '2014-01-01');
  const momSimple = momentum(levelSimple2014, 52);
  console.log(`  Simple NFL 52w momentum: ${momSimple.length} points`);
  const valsSimple = momSimple.map(m => m.close);
  const scanSimple = await runCycleScanner(valsSimple);
  showPeaks('Simplified NFL 52w momentum', scanSimple);

  // ── TEST D: Raw level with HP detrend (for comparison) ──
  console.log('\n\n' + '='.repeat(70));
  console.log('TEST D: RAW LEVEL with CycleScanner HP detrend (dType=0)');
  console.log('='.repeat(70));

  const level2014closes = level2014.map(l => l.close);
  console.log(`  Level 2014+: ${level2014closes.length} points`);
  const scanHP = await runCycleScanner(level2014closes, 0);
  showPeaks('Level dType=0 (HP detrend by engine)', scanHP);

  // ── TEST E: GLI comparison with same window ──
  console.log('\n\n' + '='.repeat(70));
  console.log('TEST E: GLI MOMENTUM (for reference)');
  console.log('='.repeat(70));

  const gli = loadGli();
  const gliMom52 = momentum(gli, 52);
  console.log(`  GLI 52w momentum: ${gliMom52.length} points`);
  const gliVals = gliMom52.map(g => g.close);
  const gliScan = await runCycleScanner(gliVals);
  showPeaks('GLI 52w momentum', gliScan);

  // GLI trimmed to same period as NFL
  const gliTrimmed = gliMom52.filter(g => g.dateStr >= mom52_trimmed[0]?.dateStr);
  console.log(`\n  GLI trimmed to NFL range: ${gliTrimmed.length} points`);
  const gliTrimVals = gliTrimmed.map(g => g.close);
  if (gliTrimVals.length > 50) {
    const gliTrimScan = await runCycleScanner(gliTrimVals);
    showPeaks('GLI 52w — same period as NFL', gliTrimScan);
  }

  // ── Summary ──
  console.log('\n\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log('\nGoal: Detect ~283-bar (65-month) dominant cycle in NFL momentum');
  console.log('If not detected, the US-only series may not exhibit Howell\'s global cycle');
  console.log('In that case: use the best available cycle detected for CRSI tuning');
}

main().catch(e => console.error('Fatal:', e));
