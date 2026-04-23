/**
 * Liquidity Cycle State — Full cycle details for all liquidity series
 * Shows: all detected cycles, phase positions, projected turns
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

function phaseToPosition(phaseStatus) {
  // Map phase status to approximate clock position
  const map = {
    'BOTTOM_Departure': '6→7 o\'clock (just left the bottom, early uptrend)',
    'Uptrend_Starting': '7→8 o\'clock (uptrend gaining steam)',
    'Uptrend_Neutral': '8→9 o\'clock (mid-uptrend)',
    'Uptrend_ApproachingTop': '9→10 o\'clock (approaching peak)',
    'TOP_Arrival': '10→11 o\'clock (arriving at peak)',
    'TOP_Departure': '12→1 o\'clock (just left peak, early downturn)',
    'Downtrend_Starting': '1→2 o\'clock (downturn gaining steam)',
    'Downtrend_Neutral': '2→3 o\'clock (mid-downtrend)',
    'Downtrend_ApproachingBottom': '4→5 o\'clock (approaching trough)',
    'BOTTOM_Arrival': '5→6 o\'clock (arriving at trough)',
  };
  return map[phaseStatus] || phaseStatus;
}

function estimateNextTurn(phaseStatus, cycleLength, currentBar) {
  // Rough estimate of bars until next major turn based on phase position
  // AvgPhaseScore: -100 = bottom, 0 = mid, +100 = top
  // Phase cycle: bottom → uptrend → top → downtrend → bottom
  const phaseOrder = [
    'BOTTOM_Departure', 'Uptrend_Starting', 'Uptrend_Neutral',
    'Uptrend_ApproachingTop', 'TOP_Arrival', 'TOP_Departure',
    'Downtrend_Starting', 'Downtrend_Neutral',
    'Downtrend_ApproachingBottom', 'BOTTOM_Arrival',
  ];
  const idx = phaseOrder.indexOf(phaseStatus);
  if (idx < 0) return null;

  // Each phase spans roughly cycleLength/10 bars
  const barPerPhase = cycleLength / 10;

  if (idx <= 4) {
    // Between bottom and top: estimate bars to next top
    const phasesToTop = 4 - idx;
    return { event: 'TOP', barsAway: Math.round(phasesToTop * barPerPhase), weeksAway: Math.round(phasesToTop * barPerPhase) };
  } else {
    // Between top and bottom: estimate bars to next bottom
    const phasesToBottom = 9 - idx;
    return { event: 'BOTTOM', barsAway: Math.round(phasesToBottom * barPerPhase), weeksAway: Math.round(phasesToBottom * barPerPhase) };
  }
}

async function analyzeSeries(label, closes, lastDate) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Data: ${closes.length} momentum points, last date: ${lastDate}`);
  console.log(`  Current YoY momentum: ${closes[closes.length - 1].toFixed(2)}%`);

  const scan = await runCycleScanner(closes);
  if (!scan.peaks?.length) {
    console.log('  No cycles detected');
    return null;
  }

  // Show ALL peaks sorted by dominantRank then strength
  const ranked = [...scan.peaks].sort((a, b) => {
    if (a.dominantRank > 0 && b.dominantRank > 0) return a.dominantRank - b.dominantRank;
    if (a.dominantRank > 0) return -1;
    if (b.dominantRank > 0) return 1;
    return b.strength - a.strength;
  });

  console.log(`\n  ALL ${scan.peaks.length} DETECTED CYCLES (sorted by dominance):`);
  console.log('  ' + '#'.padEnd(4) + 'Len'.padEnd(6) + 'Months'.padEnd(8) + 'Str'.padEnd(8) + 'Bartels'.padEnd(9) + 'Stab'.padEnd(7) + 'DomRk'.padEnd(7) + 'Phase'.padEnd(30) + 'AvgPh'.padEnd(8) + 'Position');
  console.log('  ' + '─'.repeat(110));

  for (let i = 0; i < ranked.length; i++) {
    const p = ranked[i];
    const mo = (p.cycleLength * 7 / 30.44).toFixed(1);
    const pos = phaseToPosition(p.phaseStatus);
    const isDom = p.dominantRank > 0 ? `★` : ' ';
    console.log(
      '  ' + isDom + String(i + 1).padEnd(3) +
      String(p.cycleLength).padEnd(6) +
      mo.padEnd(8) +
      p.strength.toFixed(1).padEnd(8) +
      p.bartelsValue.toFixed(1).padEnd(9) +
      p.stabilityScore.toFixed(2).padEnd(7) +
      String(p.dominantRank || '-').padEnd(7) +
      p.phaseStatus.padEnd(30) +
      (p.avgPhaseScore?.toFixed(0) ?? 'N/A').padEnd(8) +
      pos
    );
  }

  // Dominant cycle detail
  const viable = scan.peaks.filter(p => p.cycleLength >= 20 && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  const pool = viable.length > 0 ? viable : scan.peaks.filter(p => p.cycleLength >= 20);
  const domRanked = pool.filter(p => p.dominantRank > 0);
  const dom = domRanked.length > 0 ? domRanked.sort((a, b) => a.dominantRank - b.dominantRank)[0] : pool.sort((a, b) => b.strength - a.strength)[0];

  if (dom) {
    const mo = (dom.cycleLength * 7 / 30.44).toFixed(1);
    const nextTurn = estimateNextTurn(dom.phaseStatus, dom.cycleLength, closes.length);

    console.log(`\n  ► DOMINANT CYCLE: ${dom.cycleLength} bars (~${mo} months)`);
    console.log(`    Bartels: ${dom.bartelsValue.toFixed(1)}  Stability: ${dom.stabilityScore.toFixed(2)}  Strength: ${dom.strength.toFixed(1)}`);
    console.log(`    Phase: ${dom.phaseStatus}`);
    console.log(`    AvgPhaseScore: ${dom.avgPhaseScore?.toFixed(1)} (-100=bottom, 0=mid, +100=top)`);
    console.log(`    Position: ${phaseToPosition(dom.phaseStatus)}`);

    if (nextTurn) {
      const weeksToDate = new Date(lastDate);
      weeksToDate.setDate(weeksToDate.getDate() + nextTurn.weeksAway * 7);
      const projDate = weeksToDate.toISOString().substring(0, 10);
      console.log(`    Next ${nextTurn.event}: ~${nextTurn.weeksAway} weeks away → ~${projDate}`);
    }

    // CRSI
    const crsiResult = await getCrsi(closes, dom.cycleLength);
    const crsiValues = crsiResult.crsi || crsiResult;
    const crsiArr = Array.isArray(crsiValues) ? crsiValues : [];
    const crsiLast = crsiArr[crsiArr.length - 1];
    const ub = (crsiResult.ub || []); const ubLast = ub[ub.length - 1];
    const lb = (crsiResult.lb || []); const lbLast = lb[lb.length - 1];

    console.log(`\n    CRSI (tuned to ${dom.cycleLength} bars): ${crsiLast?.toFixed(1)}`);
    console.log(`    Bands: UB=${ubLast?.toFixed(1)}  LB=${lbLast?.toFixed(1)}`);
    if (crsiLast > ubLast) console.log(`    ⚠ OVERBOUGHT — above upper band`);
    else if (crsiLast < lbLast) console.log(`    ⚠ OVERSOLD — below lower band`);
    else console.log(`    ○ Within bands`);

    if (crsiArr.length >= 5) {
      console.log(`    Last 5: ${crsiArr.slice(-5).map(v => v.toFixed(1)).join(' → ')}`);
      const trend = crsiArr[crsiArr.length - 1] - crsiArr[crsiArr.length - 5];
      console.log(`    5-week trend: ${trend > 0 ? '↑' : '↓'} ${trend.toFixed(1)}`);
    }

    return { dom, crsi: crsiLast, ub: ubLast, lb: lbLast };
  }
  return null;
}

// ── Main ──

async function main() {
  console.log('=== LIQUIDITY CYCLE STATE — Full Detail ===');
  console.log(`    Date: ${new Date().toISOString().substring(0, 10)}\n`);

  // ── Fetch & derive NFL ──
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
  const nflLastDate = nflMom[nflMom.length - 1]?.date?.substring(0, 10);

  // ── NFL ──
  const nflResult = await analyzeSeries('NET FED LIQUIDITY (Tier A — 50%)', nflCloses, nflLastDate);

  // ── Individual series ──
  const SERIES = [
    { id: 'TOTBKCR', ticker: 'TOTBKCR-W:FDS', name: 'Total Bank Credit', tier: 'B' },
    { id: 'COMPOUT', ticker: 'COMPOUT-W:FDS', name: 'Commercial Paper Outstanding', tier: 'B' },
    { id: 'WRMFNS', ticker: 'WRMFNS-W:FDS', name: 'Retail Money Market Funds', tier: 'B' },
    { id: 'WRESBAL', ticker: 'WRESBAL-W:FDS', name: 'Reserve Balances at Fed', tier: 'C' },
  ];

  for (const s of SERIES) {
    const bars = await ensureAndFetch(s.ticker);
    const trimmed = bars.filter(b => b.date >= '2014-01-01');
    const mom = momentum52w(trimmed);
    if (mom.length < 50) {
      console.log(`\n  ${s.id}: Insufficient data (${mom.length} momentum points)`);
      continue;
    }
    const closes = mom.map(m => m.close);
    const lastDate = mom[mom.length - 1]?.date?.substring(0, 10);
    await analyzeSeries(`${s.id} — ${s.name} (Tier ${s.tier})`, closes, lastDate);
  }

  // ── Composite cycle state summary ──
  console.log('\n\n' + '═'.repeat(60));
  console.log('  LIQUIDITY CYCLE STATE SUMMARY');
  console.log('═'.repeat(60));
  console.log('\n  All series analyzed on 52-week YoY momentum, CycleScanner dType=9');
  console.log('  Phase convention: -100 = cycle bottom, 0 = mid-cycle, +100 = cycle top');
}

main().catch(e => console.error('Fatal:', e));
