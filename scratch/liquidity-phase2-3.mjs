/**
 * Liquidity Layer — Phase 2 + 3: Full pipeline validation
 *
 * Phase 2: NFL momentum → CycleScanner(dType=9) → CRSI
 * Phase 3: Tier B/C series momentum → CycleScanner(dType=9) → CRSI
 * Final: Composite liquidity score (50/35/15 weighting)
 *
 * Using trimmed data (2014+) and 52-week momentum per spec section 6d
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

function extractDominant(peaks) {
  if (!peaks?.length) return null;
  const viable = peaks.filter(p => p.cycleLength >= 20 && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  const pool = viable.length > 0 ? viable : peaks.filter(p => p.cycleLength >= 20);
  if (pool.length === 0) return peaks[0] || null;
  const ranked = pool.filter(p => p.dominantRank > 0);
  if (ranked.length > 0) return ranked.sort((a, b) => a.dominantRank - b.dominantRank)[0];
  return pool.sort((a, b) => b.strength - a.strength)[0];
}

// ── Main ──

async function main() {
  console.log('=== Liquidity Layer — Full Pipeline (Phase 2 + 3) ===\n');
  console.log('Pipeline: Fetch → Level → 52w Momentum → CycleScanner(dType=9) → CRSI\n');

  // ═════════════════════════════════════════════════════════
  // PHASE 2: Net Fed Liquidity (Tier A — 50% weight)
  // ═════════════════════════════════════════════════════════

  console.log('=' .repeat(70));
  console.log('PHASE 2: NET FED LIQUIDITY (Tier A — 50% of liquidity score)');
  console.log('=' .repeat(70));

  // Fetch components
  console.log('\nFetching components...');
  const [walcl, swpt, rrpDaily, wtregen] = await Promise.all([
    ensureAndFetch('WALCL-W:FDS'),
    ensureAndFetch('SWPT-W:FDS'),
    ensureAndFetch('RRPONTSYD:FDS'),
    ensureAndFetch('WTREGEN-W:FDS'),
  ]);

  // Derive level (trimmed to 2014+)
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
  console.log(`  NFL level (2014+): ${level.length} points`);

  // 52w momentum
  const nflMom = momentum52w(level);
  console.log(`  NFL momentum: ${nflMom.length} points`);
  console.log(`  Current: ${nflMom[nflMom.length - 1]?.close.toFixed(2)}%`);

  // CycleScanner
  const nflCloses = nflMom.map(m => m.close);
  const nflScan = await runCycleScanner(nflCloses);
  const nflDom = extractDominant(nflScan.peaks);

  console.log(`\n  Scanner: ${nflScan.peaks?.length} peaks`);
  if (nflDom) {
    const mo = (nflDom.cycleLength * 7 / 30.44).toFixed(1);
    console.log(`  Dominant: ${nflDom.cycleLength} bars (~${mo} months)  Bartels=${nflDom.bartelsValue.toFixed(1)}  Stab=${nflDom.stabilityScore.toFixed(2)}  Phase=${nflDom.phaseStatus}  AvgPhase=${nflDom.avgPhaseScore?.toFixed(1)}`);

    // CRSI tuned to dominant cycle
    const nflCrsi = await getCrsi(nflCloses, nflDom.cycleLength);
    const crsiValues = nflCrsi.crsi || nflCrsi;
    const crsiLast = Array.isArray(crsiValues) ? crsiValues[crsiValues.length - 1] : null;
    const ubValues = nflCrsi.ub || [];
    const lbValues = nflCrsi.lb || [];
    const ubLast = ubValues[ubValues.length - 1];
    const lbLast = lbValues[lbValues.length - 1];

    console.log(`\n  CRSI (tuned to ${nflDom.cycleLength} bars):`);
    console.log(`    Current CRSI: ${crsiLast?.toFixed(1)}`);
    console.log(`    Upper Band: ${ubLast?.toFixed(1)}  Lower Band: ${lbLast?.toFixed(1)}`);
    console.log(`    CRSI values: ${(Array.isArray(crsiValues) ? crsiValues : []).length} points`);

    // Last 10 CRSI values
    if (Array.isArray(crsiValues) && crsiValues.length >= 10) {
      console.log(`    Last 10: ${crsiValues.slice(-10).map(v => v.toFixed(1)).join(', ')}`);
    }

    // Regime
    let regime;
    if (crsiLast >= 70) regime = 'Liquidity Expanding';
    else if (crsiLast >= 55) regime = 'Liquidity Stable-Positive';
    else if (crsiLast >= 45) regime = 'Liquidity Neutral';
    else if (crsiLast >= 30) regime = 'Liquidity Tightening';
    else regime = 'Liquidity Contracting';
    console.log(`    Regime: ${regime}`);

    var nflResult = {
      name: 'Net Fed Liquidity',
      tier: 'A',
      weight: 0.50,
      cycleLength: nflDom.cycleLength,
      crsi: crsiLast,
      phase: nflDom.phaseStatus,
      avgPhase: nflDom.avgPhaseScore,
      bartels: nflDom.bartelsValue,
      stability: nflDom.stabilityScore,
      regime,
    };
  }

  // ═════════════════════════════════════════════════════════
  // PHASE 3: Tier B + C Individual Series
  // ═════════════════════════════════════════════════════════

  console.log('\n\n' + '=' .repeat(70));
  console.log('PHASE 3: TIER B + C INDIVIDUAL SERIES (momentum pipeline)');
  console.log('=' .repeat(70));

  const INDIVIDUAL = [
    { fredId: 'TOTBKCR', tickerId: 'TOTBKCR-W:FDS', tier: 'B', name: 'Total Bank Credit' },
    { fredId: 'COMPOUT', tickerId: 'COMPOUT-W:FDS', tier: 'B', name: 'Commercial Paper Outstanding' },
    { fredId: 'WRMFNS',  tickerId: 'WRMFNS-W:FDS',  tier: 'B', name: 'Retail Money Market Funds' },
    { fredId: 'WRESBAL', tickerId: 'WRESBAL-W:FDS', tier: 'C', name: 'Reserve Balances at Fed' },
  ];

  const seriesResults = [];

  for (const s of INDIVIDUAL) {
    console.log(`\n--- ${s.fredId} (${s.name}) — Tier ${s.tier} ---`);

    try {
      const bars = await ensureAndFetch(s.tickerId);
      console.log(`  Raw: ${bars.length} bars`);

      // Trim to 2014+
      const trimmed = bars.filter(b => b.date >= '2014-01-01');
      console.log(`  Trimmed (2014+): ${trimmed.length} bars`);

      if (trimmed.length < 60) {
        console.log(`  Skipped: not enough data`);
        continue;
      }

      // 52w momentum
      const mom = momentum52w(trimmed);
      console.log(`  Momentum: ${mom.length} points  Current: ${mom[mom.length - 1]?.close.toFixed(2)}%`);

      if (mom.length < 50) {
        console.log(`  Skipped: not enough momentum data`);
        continue;
      }

      // CycleScanner (dType=9)
      const closes = mom.map(m => m.close);
      const scan = await runCycleScanner(closes);
      const dom = extractDominant(scan.peaks);

      if (dom) {
        const mo = (dom.cycleLength * 7 / 30.44).toFixed(1);
        console.log(`  Dominant: ${dom.cycleLength} bars (~${mo} months)  Bartels=${dom.bartelsValue.toFixed(1)}  Stab=${dom.stabilityScore.toFixed(2)}  Phase=${dom.phaseStatus}`);

        // CRSI
        const crsiResult = await getCrsi(closes, dom.cycleLength);
        const crsiValues = crsiResult.crsi || crsiResult;
        const crsiLast = Array.isArray(crsiValues) ? crsiValues[crsiValues.length - 1] : null;
        const ubValues = crsiResult.ub || [];
        const lbValues = crsiResult.lb || [];

        console.log(`  CRSI (${dom.cycleLength}): ${crsiLast?.toFixed(1)}  UB=${ubValues[ubValues.length - 1]?.toFixed(1)}  LB=${lbValues[lbValues.length - 1]?.toFixed(1)}`);

        seriesResults.push({
          fredId: s.fredId,
          name: s.name,
          tier: s.tier,
          cycleLength: dom.cycleLength,
          crsi: crsiLast,
          phase: dom.phaseStatus,
          avgPhase: dom.avgPhaseScore,
          bartels: dom.bartelsValue,
          stability: dom.stabilityScore,
        });
      } else {
        console.log(`  No dominant cycle found`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  // ═════════════════════════════════════════════════════════
  // COMPOSITE LIQUIDITY SCORE
  // ═════════════════════════════════════════════════════════

  console.log('\n\n' + '=' .repeat(70));
  console.log('LIQUIDITY LAYER COMPOSITE SCORE');
  console.log('=' .repeat(70));

  // Tier A (50%)
  console.log(`\nTier A — Net Fed Liquidity (50%):`);
  if (nflResult) {
    console.log(`  CRSI: ${nflResult.crsi?.toFixed(1)}  Phase: ${nflResult.phase}  Regime: ${nflResult.regime}`);
  }

  // Tier B (35%) — bartels-weighted average of TOTBKCR, COMPOUT, WRMFNS
  const tierB = seriesResults.filter(r => r.tier === 'B');
  console.log(`\nTier B — Private Sector Liquidity (35%):`);
  let tierBScore = 50;
  if (tierB.length > 0) {
    const bartelsSum = tierB.reduce((s, r) => s + r.bartels, 0);
    tierBScore = tierB.reduce((s, r) => s + (r.crsi ?? 50) * (r.bartels / bartelsSum), 0);
    for (const r of tierB) {
      console.log(`  ${r.fredId.padEnd(10)} CRSI: ${r.crsi?.toFixed(1).padStart(5)}  Bartels: ${r.bartels.toFixed(1)}  Phase: ${r.phase}`);
    }
    console.log(`  Bartels-weighted avg: ${tierBScore.toFixed(1)}`);
  } else {
    console.log(`  No Tier B data available`);
  }

  // Tier C (15%) — WRESBAL
  const tierC = seriesResults.filter(r => r.tier === 'C');
  console.log(`\nTier C — Reserve Availability (15%):`);
  let tierCScore = 50;
  if (tierC.length > 0) {
    tierCScore = tierC[0].crsi ?? 50;
    console.log(`  ${tierC[0].fredId.padEnd(10)} CRSI: ${tierCScore.toFixed(1)}  Phase: ${tierC[0].phase}`);
  } else {
    console.log(`  No Tier C data available`);
  }

  // Composite
  const tierAScore = nflResult?.crsi ?? 50;
  const liquidityScore = 0.50 * tierAScore + 0.35 * tierBScore + 0.15 * tierCScore;

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Tier A (50%): ${tierAScore.toFixed(1)} × 0.50 = ${(tierAScore * 0.50).toFixed(1)}`);
  console.log(`  Tier B (35%): ${tierBScore.toFixed(1)} × 0.35 = ${(tierBScore * 0.35).toFixed(1)}`);
  console.log(`  Tier C (15%): ${tierCScore.toFixed(1)} × 0.15 = ${(tierCScore * 0.15).toFixed(1)}`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`  ► LIQUIDITY LAYER SCORE: ${liquidityScore.toFixed(1)}`);

  // Regime from composite
  let regime;
  if (liquidityScore >= 70) regime = 'Liquidity Expanding';
  else if (liquidityScore >= 55) regime = 'Liquidity Stable-Positive';
  else if (liquidityScore >= 45) regime = 'Liquidity Neutral';
  else if (liquidityScore >= 30) regime = 'Liquidity Tightening';
  else regime = 'Liquidity Contracting';
  console.log(`  ► REGIME: ${regime}`);

  // ── Validation check ──
  console.log('\n\n' + '=' .repeat(70));
  console.log('VALIDATION');
  console.log('=' .repeat(70));
  console.log('\nExpected regime assessment:');
  console.log('  - Fed is in QT (WALCL declining) → tightening');
  console.log('  - RRP has drained substantially (bullish offset)');
  console.log('  - TGA is elevated → draining');
  console.log('  - NFL YoY momentum is negative (-9.08%) → contracting');
  console.log(`\n  Does CRSI=${tierAScore.toFixed(1)} + regime="${regime}" match? ${liquidityScore < 45 ? 'YES — correctly showing tightening/contracting' : liquidityScore < 55 ? 'PLAUSIBLE — neutral with cross-currents' : 'CHECK — may be reading too bullish given QT'}`);
}

main().catch(e => console.error('Fatal:', e));
