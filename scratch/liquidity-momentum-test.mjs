/**
 * Liquidity Momentum Pipeline — Rebuild Howell's 65-month cycle
 *
 * Pipeline:
 *   1. Fetch WALCL, RRPONTSYD, WTREGEN, SWPT
 *   2. Align to weekly, compute: level[t] = WALCL + SWPT - RRP - TGA
 *   3. Momentum: mom[t] = (level[t] - level[t-52]) / level[t-52] × 100
 *   4. CycleScanner(momentum[], dType=9, minCycle=10, maxCycle=400)
 *   5. Compare detected cycles against Howell's GLI
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
    return { date, dateStr: date.toISOString().substring(0, 10), value: parseFloat(valStr) };
  }).filter(d => !isNaN(d.value));
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

async function runCycleScanner(closes, minCycle = 10, maxCycle = 400) {
  // dType=9 means no detrending — we already detrended via momentum transform
  const url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}&minCycleLength=${minCycle}&maxCycleLength=${maxCycle}&sortByStrength=true&includeSpectrum=false&dominantPeakFinder=true&useStability=true&dType=9`;
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

function yoyMomentum(levelSeries) {
  // 52-week % change: mom[t] = (level[t] - level[t-52]) / level[t-52] × 100
  const result = [];
  for (let i = 52; i < levelSeries.length; i++) {
    const prev = levelSeries[i - 52];
    const curr = levelSeries[i];
    if (prev.close !== 0) {
      result.push({
        date: curr.date,
        dateStr: (typeof curr.date === 'string' ? curr.date : curr.date.toISOString()).substring(0, 10),
        close: ((curr.close - prev.close) / Math.abs(prev.close)) * 100,
        level: curr.close,
      });
    }
  }
  return result;
}

function pearsonCorrelation(x, y) {
  const n = x.length;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  return num / Math.sqrt(dx2 * dy2);
}

function showPeaks(label, scan) {
  console.log(`\n  ${label}: ${scan.peaks?.length ?? 0} peaks`);
  if (!scan.peaks?.length) return null;
  const sorted = [...scan.peaks].sort((a, b) => b.strength - a.strength).slice(0, 8);
  console.log('    ' + 'Len'.padEnd(6) + 'Mo'.padEnd(8) + 'Str'.padEnd(10) + 'Bartels'.padEnd(9) + 'Stab'.padEnd(7) + 'Dom'.padEnd(5) + 'Phase'.padEnd(28) + 'AvgPh');
  console.log('    ' + '-'.repeat(80));
  for (const p of sorted) {
    const mo = (p.cycleLength * 7 / 30.44).toFixed(1);
    console.log('    ' + String(p.cycleLength).padEnd(6) + mo.padEnd(8) + p.strength.toFixed(1).padEnd(10) + p.bartelsValue.toFixed(1).padEnd(9) + p.stabilityScore.toFixed(2).padEnd(7) + String(p.dominantRank).padEnd(5) + p.phaseStatus.padEnd(28) + (p.avgPhaseScore?.toFixed(1) ?? 'N/A'));
  }

  // Howell 65-month range: 250-320 bars
  const howell = scan.peaks.filter(p => p.cycleLength >= 230 && p.cycleLength <= 330);
  if (howell.length) {
    const best = howell.sort((a, b) => b.bartelsValue - a.bartelsValue)[0];
    console.log(`\n    ► 65-MONTH MATCH: ${best.cycleLength} bars (${(best.cycleLength * 7 / 30.44).toFixed(1)} months)  Bartels=${best.bartelsValue.toFixed(1)}  Stab=${best.stabilityScore.toFixed(2)}  Phase=${best.phaseStatus}  AvgPhase=${best.avgPhaseScore?.toFixed(1)}`);
    return best;
  }
  // Broader range
  const broader = scan.peaks.filter(p => p.cycleLength >= 150 && p.cycleLength <= 400);
  if (broader.length) {
    const best = broader.sort((a, b) => b.bartelsValue - a.bartelsValue)[0];
    console.log(`\n    ► Nearest long cycle: ${best.cycleLength} bars (${(best.cycleLength * 7 / 30.44).toFixed(1)} months)  Bartels=${best.bartelsValue.toFixed(1)}  Phase=${best.phaseStatus}`);
    return best;
  }
  return null;
}

// ── Main ──

async function main() {
  console.log('=== Liquidity Momentum Pipeline Test ===\n');
  console.log('Pipeline: Level → YoY Momentum → CycleScanner(dType=9)\n');

  // ── Step 1: Fetch components ──
  console.log('Step 1: Fetching FRED components...');
  const [walcl, swpt, rrpDaily, wtregen] = await Promise.all([
    ensureAndFetch('WALCL-W:FDS'),
    ensureAndFetch('SWPT-W:FDS'),
    ensureAndFetch('RRPONTSYD:FDS'),
    ensureAndFetch('WTREGEN-W:FDS'),
  ]);
  console.log(`  WALCL: ${walcl.length}  SWPT: ${swpt.length}  RRPONTSYD: ${rrpDaily.length}  WTREGEN: ${wtregen.length}`);

  // ── Step 2: Align & derive level ──
  console.log('\nStep 2: Align to weekly & compute Net Fed Liquidity level...');
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
  console.log(`  Level series: ${level.length} weekly points (${level[0]?.dateStr} → ${level[level.length - 1]?.dateStr})`);

  // ── Step 3: YoY momentum ──
  console.log('\nStep 3: Compute YoY % change (52-week momentum)...');
  const momentum = yoyMomentum(level);
  console.log(`  Momentum series: ${momentum.length} points (${momentum[0]?.dateStr} → ${momentum[momentum.length - 1]?.dateStr})`);
  console.log(`  Current momentum: ${momentum[momentum.length - 1]?.close.toFixed(2)}%`);
  console.log(`  Sample (last 5): ${momentum.slice(-5).map(m => m.close.toFixed(2) + '%').join(', ')}`);

  // ── Step 4: CycleScanner on momentum (dType=9 = no additional detrending) ──
  console.log('\n' + '='.repeat(70));
  console.log('Step 4: CycleScanner on NFL MOMENTUM (dType=9)');
  console.log('='.repeat(70));
  const momCloses = momentum.map(m => m.close);
  const nflMomScan = await runCycleScanner(momCloses);
  const nflHowell = showPeaks('NFL YoY Momentum', nflMomScan);

  // ── Step 5: Compare with GLI ──
  console.log('\n\n' + '='.repeat(70));
  console.log('Step 5: CycleScanner on HOWELL GLI (raw levels + YoY momentum)');
  console.log('='.repeat(70));

  const gli = loadGli();
  console.log(`  GLI: ${gli.length} points (${gli[0].dateStr} → ${gli[gli.length - 1].dateStr})`);

  // GLI raw levels
  const gliScan = await runCycleScanner(gli.map(g => g.value));
  showPeaks('GLI Raw Levels', gliScan);

  // GLI YoY momentum
  const gliMom = yoyMomentum(gli.map(g => ({ date: g.date, dateStr: g.dateStr, close: g.value })));
  console.log(`\n  GLI momentum: ${gliMom.length} points`);
  console.log(`  Current GLI momentum: ${gliMom[gliMom.length - 1]?.close.toFixed(2)}%`);
  const gliMomScan = await runCycleScanner(gliMom.map(g => g.close));
  const gliHowell = showPeaks('GLI YoY Momentum', gliMomScan);

  // ── Step 6: Momentum correlation ──
  console.log('\n\n' + '='.repeat(70));
  console.log('Step 6: Momentum Correlation — GLI YoY vs NFL YoY');
  console.log('='.repeat(70));

  // Align by date
  const aligned = [];
  for (const g of gliMom) {
    const gTime = g.date.getTime();
    let bestN = null, bestDiff = Infinity;
    for (const n of momentum) {
      const nTime = new Date(n.date).getTime();
      const diff = Math.abs(gTime - nTime);
      if (diff < bestDiff) { bestDiff = diff; bestN = n; }
    }
    if (bestN && bestDiff <= 7 * 86400000) {
      aligned.push({ date: g.dateStr, gli: g.close, nfl: bestN.close });
    }
  }
  console.log(`  Aligned points: ${aligned.length}`);

  if (aligned.length > 50) {
    const corr = pearsonCorrelation(aligned.map(a => a.gli), aligned.map(a => a.nfl));
    console.log(`  Pearson correlation (YoY momentum): ${corr.toFixed(4)}`);

    // Lag analysis on momentum
    console.log('\n  Lag analysis (NFL shifted vs GLI):');
    const lags = [];
    for (let lag = -26; lag <= 26; lag += 2) {
      const shifted = [];
      for (const g of gliMom) {
        const targetTime = g.date.getTime() + lag * 7 * 86400000;
        let bestN = null, bestDiff = Infinity;
        for (const n of momentum) {
          const diff = Math.abs(new Date(n.date).getTime() - targetTime);
          if (diff < bestDiff) { bestDiff = diff; bestN = n; }
        }
        if (bestN && bestDiff <= 7 * 86400000) shifted.push({ a: g.close, b: bestN.close });
      }
      if (shifted.length > 50) {
        lags.push({ lag, corr: pearsonCorrelation(shifted.map(s => s.a), shifted.map(s => s.b)), n: shifted.length });
      }
    }
    lags.sort((a, b) => b.corr - a.corr);
    for (const l of lags.slice(0, 5)) {
      console.log(`    Lag ${String(l.lag).padStart(4)} weeks: r = ${l.corr.toFixed(4)}`);
    }
  }

  // ── Step 7: Side-by-side sample ──
  console.log('\n\n' + '='.repeat(70));
  console.log('Step 7: Side-by-side momentum sample (every 26 weeks)');
  console.log('='.repeat(70));
  console.log('  ' + 'Date'.padEnd(13) + 'GLI YoY%'.padStart(10) + 'NFL YoY%'.padStart(10) + '  Direction Match');
  console.log('  ' + '-'.repeat(50));
  for (let i = 0; i < aligned.length; i += 26) {
    const a = aligned[i];
    const match = (a.gli > 0 && a.nfl > 0) || (a.gli < 0 && a.nfl < 0);
    console.log(
      '  ' + a.date.padEnd(13) +
      (a.gli.toFixed(1) + '%').padStart(10) +
      (a.nfl.toFixed(1) + '%').padStart(10) +
      `  ${match ? '✓ same' : '✗ OPPOSED'}`
    );
  }

  // ── Summary ──
  console.log('\n\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  if (nflHowell) {
    console.log(`\n  NFL Momentum ~65mo cycle: ${nflHowell.cycleLength} bars (${(nflHowell.cycleLength * 7 / 30.44).toFixed(1)} months)`);
    console.log(`    Phase: ${nflHowell.phaseStatus}  AvgPhase: ${nflHowell.avgPhaseScore?.toFixed(1)}`);
    console.log(`    Bartels: ${nflHowell.bartelsValue.toFixed(1)}  Stability: ${nflHowell.stabilityScore.toFixed(2)}`);
  }
  if (gliHowell) {
    console.log(`\n  GLI Momentum ~65mo cycle: ${gliHowell.cycleLength} bars (${(gliHowell.cycleLength * 7 / 30.44).toFixed(1)} months)`);
    console.log(`    Phase: ${gliHowell.phaseStatus}  AvgPhase: ${gliHowell.avgPhaseScore?.toFixed(1)}`);
    console.log(`    Bartels: ${gliHowell.bartelsValue.toFixed(1)}  Stability: ${gliHowell.stabilityScore.toFixed(2)}`);
  }
}

main().catch(e => console.error('Fatal:', e));
