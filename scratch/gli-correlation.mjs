/**
 * GLI Correlation Test — Compare Howell's raw GLI against our
 * Net Fed Liquidity series using various transforms to find
 * the best match.
 */

import { readFileSync } from 'fs';

const API_KEY = 'wttmaster5809';
const BASE_URL = 'https://api.cycle.tools';

// ── Load GLI data ──

function loadGli() {
  const csv = readFileSync('C:\\Users\\LARS\\Downloads\\gliraw.csv', 'utf-8');
  const lines = csv.trim().split('\n').slice(1);
  const data = [];
  for (const line of lines) {
    const [dateStr, valStr] = line.split(',');
    const parts = dateStr.split('/');
    // M/D/YYYY format
    const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    const value = parseFloat(valStr);
    if (!isNaN(value)) data.push({ date, dateStr: date.toISOString().substring(0, 10), value });
  }
  return data;
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

// ── Correlation ──

function pearsonCorrelation(x, y) {
  const n = x.length;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  return num / Math.sqrt(denX * denY);
}

// Align two weekly series by finding nearest date matches
function alignSeries(seriesA, seriesB, maxDaysDiff = 5) {
  const aligned = [];
  for (const a of seriesA) {
    const aDate = a.date instanceof Date ? a.date : new Date(a.date);
    let bestB = null, bestDiff = Infinity;
    for (const b of seriesB) {
      const bDate = b.date instanceof Date ? b.date : new Date(b.date);
      const diff = Math.abs(aDate.getTime() - bDate.getTime());
      if (diff < bestDiff) { bestDiff = diff; bestB = b; }
    }
    if (bestB && bestDiff <= maxDaysDiff * 86400000) {
      aligned.push({ dateA: a.dateStr || aDate.toISOString().substring(0, 10), valA: a.value ?? a.close, valB: bestB.value ?? bestB.close });
    }
  }
  return aligned;
}

function yoyChange(series) {
  const result = [];
  for (let i = 52; i < series.length; i++) {
    result.push({
      date: series[i].date,
      dateStr: series[i].dateStr || new Date(series[i].date).toISOString().substring(0, 10),
      value: series[i - 52].value !== 0 ? ((series[i].value - series[i - 52].value) / Math.abs(series[i - 52].value)) * 100 : 0,
    });
  }
  return result;
}

// ── Analyze peaks ──

function showTopPeaks(label, scan) {
  console.log(`\n  ${label}: ${scan.peaks?.length ?? 0} peaks`);
  if (!scan.peaks?.length) return;
  const sorted = [...scan.peaks].sort((a, b) => b.strength - a.strength).slice(0, 6);
  console.log('    ' + 'Length'.padEnd(8) + 'Months'.padEnd(9) + 'Bartels'.padEnd(10) + 'Stab'.padEnd(8) + 'DomRank'.padEnd(9) + 'Phase'.padEnd(24) + 'AvgPhase');
  for (const p of sorted) {
    console.log('    ' + String(p.cycleLength).padEnd(8) + (p.cycleLength * 7 / 30.44).toFixed(1).padEnd(9) + p.bartelsValue.toFixed(1).padEnd(10) + p.stabilityScore.toFixed(2).padEnd(8) + String(p.dominantRank).padEnd(9) + p.phaseStatus.padEnd(24) + (p.avgPhaseScore?.toFixed(1) ?? 'N/A'));
  }
  // Howell range
  const howell = scan.peaks.filter(p => p.cycleLength >= 230 && p.cycleLength <= 330);
  if (howell.length) {
    const best = howell.sort((a, b) => b.bartelsValue - a.bartelsValue)[0];
    console.log(`    ► ~65mo match: ${best.cycleLength} bars (${(best.cycleLength * 7 / 30.44).toFixed(1)}mo) Bartels=${best.bartelsValue.toFixed(1)} Phase=${best.phaseStatus} AvgPhase=${best.avgPhaseScore?.toFixed(1)}`);
  }
}

// ── Main ──

async function main() {
  console.log('=== GLI vs Net Fed Liquidity Correlation ===\n');

  // Load GLI
  const gli = loadGli();
  console.log(`GLI: ${gli.length} points, ${gli[0].dateStr} → ${gli[gli.length - 1].dateStr}`);
  console.log(`  Range: ${gli[0].value.toFixed(0)} → ${gli[gli.length - 1].value.toFixed(0)}\n`);

  // Fetch & derive Net Fed Liquidity
  console.log('Fetching FRED components...');
  const [walcl, swpt, rrpDaily, wtregen] = await Promise.all([
    ensureAndFetch('WALCL-W:FDS'),
    ensureAndFetch('SWPT-W:FDS'),
    ensureAndFetch('RRPONTSYD:FDS'),
    ensureAndFetch('WTREGEN-W:FDS'),
  ]);

  const rrpWeekly = downsampleToWeekly(rrpDaily);
  const nfl = [];
  for (const wBar of walcl) {
    const r = findNearest(rrpWeekly, wBar.date);
    const t = findNearest(wtregen, wBar.date);
    const s = findNearest(swpt, wBar.date);
    if (r && t && s && wBar.close != null) {
      nfl.push({
        date: new Date(wBar.date),
        dateStr: wBar.date.substring(0, 10),
        value: wBar.close + (s.close || 0) - (r.close || 0) - (t.close || 0),
        close: wBar.close + (s.close || 0) - (r.close || 0) - (t.close || 0),
      });
    }
  }
  console.log(`Net Fed Liquidity: ${nfl.length} points, ${nfl[0].dateStr} → ${nfl[nfl.length - 1].dateStr}`);
  console.log(`  Range: ${(nfl[0].value / 1e6).toFixed(3)}T → ${(nfl[nfl.length - 1].value / 1e6).toFixed(3)}T\n`);

  // ── 1. Raw levels correlation ──
  console.log('=' .repeat(70));
  console.log('1. RAW LEVELS: GLI vs Net Fed Liquidity');
  console.log('=' .repeat(70));
  const rawAligned = alignSeries(gli, nfl, 5);
  console.log(`  Aligned points: ${rawAligned.length}`);
  if (rawAligned.length > 10) {
    const corr = pearsonCorrelation(rawAligned.map(a => a.valA), rawAligned.map(a => a.valB));
    console.log(`  Pearson correlation: ${corr.toFixed(4)}`);
    console.log(`  First: GLI=${rawAligned[0].valA.toFixed(0)} NFL=${(rawAligned[0].valB / 1e3).toFixed(0)}B  Date=${rawAligned[0].dateA}`);
    console.log(`  Last:  GLI=${rawAligned[rawAligned.length - 1].valA.toFixed(0)} NFL=${(rawAligned[rawAligned.length - 1].valB / 1e3).toFixed(0)}B  Date=${rawAligned[rawAligned.length - 1].dateA}`);
  }

  // ── 2. YoY momentum correlation ──
  console.log('\n' + '=' .repeat(70));
  console.log('2. YoY % CHANGE: GLI momentum vs NFL momentum');
  console.log('=' .repeat(70));
  const gliYoy = yoyChange(gli);
  const nflYoy = yoyChange(nfl);
  console.log(`  GLI YoY: ${gliYoy.length} pts, NFL YoY: ${nflYoy.length} pts`);
  const yoyAligned = alignSeries(gliYoy, nflYoy, 5);
  console.log(`  Aligned: ${yoyAligned.length}`);
  if (yoyAligned.length > 10) {
    const corr = pearsonCorrelation(yoyAligned.map(a => a.valA), yoyAligned.map(a => a.valB));
    console.log(`  Pearson correlation: ${corr.toFixed(4)}`);
    console.log(`  Latest GLI YoY: ${gliYoy[gliYoy.length - 1].value.toFixed(2)}%`);
    console.log(`  Latest NFL YoY: ${nflYoy[nflYoy.length - 1].value.toFixed(2)}%`);
  }

  // ── 3. Lag analysis ──
  console.log('\n' + '=' .repeat(70));
  console.log('3. LAG ANALYSIS: Does NFL lead or lag GLI?');
  console.log('=' .repeat(70));
  // Test correlations at various lag offsets (NFL shifted relative to GLI)
  const lagResults = [];
  for (let lag = -26; lag <= 26; lag += 2) {
    const shifted = [];
    for (const g of gliYoy) {
      const targetDate = new Date(g.date.getTime() + lag * 7 * 86400000);
      let bestN = null, bestDiff = Infinity;
      for (const n of nflYoy) {
        const diff = Math.abs(n.date.getTime() - targetDate.getTime());
        if (diff < bestDiff) { bestDiff = diff; bestN = n; }
      }
      if (bestN && bestDiff <= 7 * 86400000) {
        shifted.push({ a: g.value, b: bestN.value });
      }
    }
    if (shifted.length > 50) {
      const corr = pearsonCorrelation(shifted.map(s => s.a), shifted.map(s => s.b));
      lagResults.push({ lag, corr, n: shifted.length });
    }
  }
  lagResults.sort((a, b) => b.corr - a.corr);
  console.log('  Top 5 correlations by lag (+ = NFL leads GLI):');
  for (const r of lagResults.slice(0, 5)) {
    console.log(`    Lag ${String(r.lag).padStart(3)} weeks: r = ${r.corr.toFixed(4)}  (n=${r.n})`);
  }
  console.log('  Worst correlation:');
  console.log(`    Lag ${String(lagResults[lagResults.length - 1].lag).padStart(3)} weeks: r = ${lagResults[lagResults.length - 1].corr.toFixed(4)}`);

  // ── 4. Cycle analysis on GLI itself ──
  console.log('\n' + '=' .repeat(70));
  console.log('4. CYCLE ANALYSIS ON HOWELL\'S RAW GLI');
  console.log('=' .repeat(70));
  const gliCloses = gli.map(g => g.value);
  const gliScan = await runCycleScanner(gliCloses);
  showTopPeaks('GLI Raw Levels', gliScan);

  // GLI YoY
  const gliYoyCloses = gliYoy.map(g => g.value);
  const gliYoyScan = await runCycleScanner(gliYoyCloses);
  showTopPeaks('GLI YoY % Change', gliYoyScan);

  // ── 5. Cycle analysis on NFL ──
  console.log('\n' + '=' .repeat(70));
  console.log('5. CYCLE ANALYSIS ON NET FED LIQUIDITY (overlapping period only)');
  console.log('=' .repeat(70));
  // Filter NFL to same date range as GLI
  const gliStart = gli[0].date.getTime();
  const gliEnd = gli[gli.length - 1].date.getTime();
  const nflOverlap = nfl.filter(n => n.date.getTime() >= gliStart && n.date.getTime() <= gliEnd);
  console.log(`  NFL overlap: ${nflOverlap.length} points (${nflOverlap[0]?.dateStr} → ${nflOverlap[nflOverlap.length - 1]?.dateStr})`);

  const nflOverlapCloses = nflOverlap.map(n => n.value);
  const nflScan = await runCycleScanner(nflOverlapCloses);
  showTopPeaks('NFL Raw Levels (2010-2026)', nflScan);

  const nflOverlapYoy = yoyChange(nflOverlap);
  const nflOverlapYoyCloses = nflOverlapYoy.map(n => n.value);
  const nflYoyScan = await runCycleScanner(nflOverlapYoyCloses);
  showTopPeaks('NFL YoY % Change (2011-2026)', nflYoyScan);

  // ── 6. Visual comparison: print aligned time series (sampled) ──
  console.log('\n' + '=' .repeat(70));
  console.log('6. ALIGNED SERIES SAMPLE (every 26 weeks)');
  console.log('=' .repeat(70));
  console.log('  ' + 'Date'.padEnd(13) + 'GLI'.padStart(10) + 'GLI YoY%'.padStart(10) + '  NFL($T)'.padStart(10) + 'NFL YoY%'.padStart(10));
  console.log('  ' + '-'.repeat(55));
  for (let i = 0; i < rawAligned.length; i += 26) {
    const a = rawAligned[i];
    // Find matching YoY values
    const gYoy = gliYoy.find(g => g.dateStr === a.dateA);
    const nYoy = nflYoy.find(n => Math.abs(new Date(n.dateStr).getTime() - new Date(a.dateA).getTime()) < 7 * 86400000);
    console.log(
      '  ' + a.dateA.padEnd(13) +
      a.valA.toFixed(0).padStart(10) +
      (gYoy ? (gYoy.value.toFixed(1) + '%').padStart(10) : 'N/A'.padStart(10)) +
      (a.valB / 1e6).toFixed(3).padStart(10) +
      (nYoy ? (nYoy.value.toFixed(1) + '%').padStart(10) : 'N/A'.padStart(10))
    );
  }
}

main().catch(e => console.error('Fatal:', e));
