/**
 * Liquidity Layer — Phase 1: Validate component data & derived series
 * Phase 2: Run CycleScanner on derived + individual series
 */

const API_KEY = 'wttmaster5809';
const BASE_URL = 'https://api.cycle.tools';

// ── Component series (for deriving Net Fed Liquidity) ──
const COMPONENTS = [
  { fredId: 'WALCL',     tickerId: 'WALCL-W:FDS',     freq: 'weekly',  role: '+', name: 'Fed Total Assets' },
  { fredId: 'SWPT',      tickerId: 'SWPT-W:FDS',      freq: 'weekly',  role: '+', name: 'CB Swap Lines' },
  { fredId: 'RRPONTSYD', tickerId: 'RRPONTSYD:FDS',    freq: 'daily',   role: '-', name: 'Reverse Repo (ON RRP)' },
  { fredId: 'WTREGEN',   tickerId: 'WTREGEN-W:FDS',    freq: 'weekly',  role: '-', name: 'Treasury General Account' },
];

// ── Individual liquidity series (Tier B + C) ──
const INDIVIDUAL = [
  { fredId: 'TOTBKCR', tickerId: 'TOTBKCR-W:FDS', tier: 'B', weight: 0.35, name: 'Total Bank Credit' },
  { fredId: 'COMPOUT', tickerId: 'COMPOUT-W:FDS', tier: 'B', weight: 0.35, name: 'Commercial Paper Outstanding' },
  { fredId: 'WRMFNS',  tickerId: 'WRMFNS-W:FDS',  tier: 'B', weight: 0.35, name: 'Retail Money Market Funds' },
  { fredId: 'WRESBAL', tickerId: 'WRESBAL-W:FDS', tier: 'C', weight: 0.15, name: 'Reserve Balances at Fed' },
];

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

async function ensureDataset(tickerId) {
  // Note: EnsureCompleteDataset uses tickerId (capital I)
  const url = `${BASE_URL}/api/data/EnsureCompleteDataset?api_key=${API_KEY}&tickerId=${encodeURIComponent(tickerId)}`;
  const resp = await fetch(url);
  const result = await resp.json();
  if (result.trackingId && !result.isComplete) {
    const waitUrl = `${BASE_URL}/api/data/WaitUntilUpdateCompleted?api_key=${API_KEY}&requestId=${result.trackingId}`;
    await fetch(waitUrl);
  }
}

async function getSeriesData(tickerId, maxbars = 0) {
  // First ensure the dataset is loaded
  await ensureDataset(tickerId);
  // Note: GetDatasetSeries uses tickerid (lowercase)
  const url = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${API_KEY}&tickerid=${encodeURIComponent(tickerId)}&maxbars=${maxbars}`;
  return fetchJson(url);
}

async function runCycleScanner(closes) {
  const url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}&minCycleLength=10&maxCycleLength=400&sortByStrength=true&includeSpectrum=false&dominantPeakFinder=true&useStability=true`;
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

function extractDominant(peaks) {
  const viable = peaks.filter(p => p.cycleLength >= 20 && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  const pool = viable.length > 0 ? viable : peaks.filter(p => p.cycleLength >= 20);
  if (pool.length === 0) return peaks[0] || null;
  const ranked = pool.filter(p => p.dominantRank > 0);
  if (ranked.length > 0) return ranked.sort((a, b) => a.dominantRank - b.dominantRank)[0];
  return pool.sort((a, b) => b.strength - a.strength)[0];
}

// ── Phase 1: Fetch & derive ──

async function phase1() {
  console.log('=== PHASE 1: Fetch Component Data ===\n');

  const data = {};

  // Fetch all components
  for (const c of COMPONENTS) {
    try {
      const bars = await getSeriesData(c.tickerId);
      data[c.fredId] = bars;
      const first = bars[0]?.date?.substring(0, 10) ?? '?';
      const last = bars[bars.length - 1]?.date?.substring(0, 10) ?? '?';
      console.log(`  ${c.fredId.padEnd(12)} ${c.name.padEnd(30)} ${bars.length} bars  ${first} → ${last}  (${c.freq})`);
    } catch (e) {
      console.log(`  ${c.fredId.padEnd(12)} FAILED: ${e.message}`);
      data[c.fredId] = [];
    }
  }

  // Fetch individual series
  console.log('\n  Individual liquidity series:');
  for (const s of INDIVIDUAL) {
    try {
      const bars = await getSeriesData(s.tickerId);
      data[s.fredId] = bars;
      const first = bars[0]?.date?.substring(0, 10) ?? '?';
      const last = bars[bars.length - 1]?.date?.substring(0, 10) ?? '?';
      console.log(`  ${s.fredId.padEnd(12)} ${s.name.padEnd(30)} ${bars.length} bars  ${first} → ${last}`);
    } catch (e) {
      console.log(`  ${s.fredId.padEnd(12)} FAILED: ${e.message}`);
      data[s.fredId] = [];
    }
  }

  return data;
}

// ── Downsample daily RRPONTSYD to weekly (Wednesday) ──

function downsampleToWeekly(dailyBars) {
  // Group by ISO week, pick Wednesday (or nearest prior business day)
  const byWeek = new Map();

  for (const bar of dailyBars) {
    const d = new Date(bar.date);
    // ISO week key: year + week number
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key).push({ date: bar.date, close: bar.close, dayOfWeek: d.getDay() });
  }

  const result = [];
  for (const [, days] of byWeek) {
    // Wednesday = 3, find it or nearest prior
    const wed = days.find(d => d.dayOfWeek === 3);
    if (wed) {
      result.push({ date: wed.date, close: wed.close });
    } else {
      // Pick latest day that's <= Wednesday
      const prior = days.filter(d => d.dayOfWeek <= 3).sort((a, b) => b.dayOfWeek - a.dayOfWeek);
      const pick = prior[0] || days[days.length - 1];
      result.push({ date: pick.date, close: pick.close });
    }
  }

  return result.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ── Align to common date index & derive Net Fed Liquidity ──

function findNearest(bars, targetDate, maxDaysDiff = 5) {
  const target = new Date(targetDate).getTime();
  let best = null;
  let bestDiff = Infinity;

  for (const bar of bars) {
    const diff = Math.abs(new Date(bar.date).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = bar;
    }
  }

  if (bestDiff > maxDaysDiff * 86400000) return null;
  return best;
}

function deriveNetFedLiquidity(data) {
  console.log('\n=== DERIVING NET FED LIQUIDITY ===\n');

  const walcl = data.WALCL;
  const swpt = data.SWPT || [];
  const wtregen = data.WTREGEN;
  const hasSwpt = swpt.length > 0;

  // Downsample RRPONTSYD
  const rrpWeekly = downsampleToWeekly(data.RRPONTSYD);
  console.log(`  RRPONTSYD: ${data.RRPONTSYD.length} daily → ${rrpWeekly.length} weekly`);
  console.log(`  Formula: WALCL ${hasSwpt ? '+ SWPT ' : ''}- RRPONTSYD - WTREGEN`);

  // Use WALCL dates as reference
  const derived = [];
  let skipped = 0;

  for (const wBar of walcl) {
    const w = wBar.close;
    const r = findNearest(rrpWeekly, wBar.date);
    const t = findNearest(wtregen, wBar.date);
    const s = hasSwpt ? findNearest(swpt, wBar.date) : { close: 0 };

    if (r && t && s && w != null && r.close != null && t.close != null && s.close != null) {
      const net = w + s.close - r.close - t.close;
      derived.push({ date: wBar.date, close: net, walcl: w, swpt: s.close, rrp: r.close, tga: t.close });
    } else {
      skipped++;
    }
  }

  console.log(`  Derived series: ${derived.length} points (${skipped} skipped due to missing alignment)`);

  if (derived.length > 0) {
    const first = derived[0];
    const last = derived[derived.length - 1];
    console.log(`  Range: ${first.date.substring(0, 10)} → ${last.date.substring(0, 10)}`);
    console.log(`  Latest Net Fed Liquidity: ${(last.close / 1e6).toFixed(2)}T`);
    console.log(`    WALCL: ${(last.walcl / 1e6).toFixed(2)}T`);
    console.log(`    SWPT:  ${(last.swpt / 1e3).toFixed(1)}B`);
    console.log(`    RRP:   ${(last.rrp / 1e3).toFixed(1)}B`);
    console.log(`    TGA:   ${(last.tga / 1e3).toFixed(1)}B`);

    // Show a few data points for sanity
    console.log('\n  Sample points (most recent 5):');
    for (const d of derived.slice(-5)) {
      console.log(`    ${d.date.substring(0, 10)}  Net: ${(d.close / 1e6).toFixed(3)}T  (WALCL ${(d.walcl / 1e6).toFixed(2)}T - RRP ${(d.rrp / 1e3).toFixed(0)}B - TGA ${(d.tga / 1e3).toFixed(0)}B + SWPT ${(d.swpt / 1e3).toFixed(1)}B)`);
    }
  }

  return derived;
}

// ── Phase 2: Cycle analysis ──

async function phase2(derived, data) {
  console.log('\n\n=== PHASE 2: Cycle Analysis ===\n');

  // 2a. Net Fed Liquidity (derived)
  const netCloses = derived.map(d => d.close);
  console.log(`--- Net Fed Liquidity (${netCloses.length} points) ---`);

  try {
    const scan = await runCycleScanner(netCloses);
    console.log(`  Peaks found: ${scan.peaks?.length ?? 0}`);

    if (scan.peaks?.length) {
      // Show top 5 peaks
      console.log('\n  Top 5 peaks:');
      const sorted = [...scan.peaks].sort((a, b) => b.strength - a.strength).slice(0, 5);
      for (const p of sorted) {
        const months = (p.cycleLength * 7 / 30.44).toFixed(1);
        console.log(`    Length: ${p.cycleLength} bars (~${months} mo)  Str: ${p.strength.toFixed(1)}  Bartels: ${p.bartelsValue.toFixed(1)}  Stability: ${p.stabilityScore.toFixed(2)}  DomRank: ${p.dominantRank}  Phase: ${p.phaseStatus}  AvgPhase: ${p.avgPhaseScore?.toFixed(1) ?? 'N/A'}`);
      }

      // Dominant extraction
      const dom = extractDominant(scan.peaks);
      if (dom) {
        const domMonths = (dom.cycleLength * 7 / 30.44).toFixed(1);
        console.log(`\n  ► DOMINANT: ${dom.cycleLength} bars (~${domMonths} months)  Phase: ${dom.phaseStatus}  AvgPhase: ${dom.avgPhaseScore?.toFixed(1) ?? 'N/A'}`);
        console.log(`    Howell theoretical: ~283 bars (~65 months)`);
        console.log(`    Match: ${Math.abs(dom.cycleLength - 283) < 50 ? 'CLOSE' : 'DIVERGENT'} (${dom.cycleLength} vs 283)`);
      }
    }
  } catch (e) {
    console.log(`  FAILED: ${e.message}`);
  }

  // 2b. Individual series
  console.log('\n--- Individual Liquidity Series ---\n');

  for (const s of INDIVIDUAL) {
    const bars = data[s.fredId];
    if (!bars || bars.length === 0) {
      console.log(`  ${s.fredId}: No data`);
      continue;
    }

    const closes = bars.map(b => b.close).filter(v => v != null);
    console.log(`  ${s.fredId} (${s.name}): ${closes.length} points`);

    try {
      const scan = await runCycleScanner(closes);
      if (scan.peaks?.length) {
        const dom = extractDominant(scan.peaks);
        if (dom) {
          const rawPhase = dom.avgPhaseScore ?? 0;
          const phaseScore = Math.max(0, Math.min(100, (rawPhase + 100) / 2));
          console.log(`    Dominant: ${dom.cycleLength} bars  Phase: ${dom.phaseStatus}  AvgPhase: ${rawPhase.toFixed(1)} → Score: ${phaseScore.toFixed(1)}  Bartels: ${dom.bartelsValue.toFixed(1)}  Stability: ${dom.stabilityScore.toFixed(2)}`);
        }
      } else {
        console.log(`    No peaks found`);
      }
    } catch (e) {
      console.log(`    Scanner FAILED: ${e.message}`);
    }
  }

  // 2c. Net Fed Liquidity phase score
  console.log('\n--- Liquidity Layer Summary ---\n');
  try {
    const scan = await runCycleScanner(netCloses);
    const dom = extractDominant(scan.peaks);
    if (dom) {
      const rawPhase = dom.avgPhaseScore ?? 0;
      const phaseScore = Math.max(0, Math.min(100, (rawPhase + 100) / 2));
      console.log(`  Net Fed Liquidity phase score: ${phaseScore.toFixed(1)} (raw: ${rawPhase.toFixed(1)})`);

      let regime;
      if (phaseScore >= 70) regime = 'Liquidity Expanding';
      else if (phaseScore >= 55) regime = 'Liquidity Stable-Positive';
      else if (phaseScore >= 45) regime = 'Liquidity Neutral';
      else if (phaseScore >= 30) regime = 'Liquidity Tightening';
      else regime = 'Liquidity Contracting';
      console.log(`  Regime: ${regime}`);
    }
  } catch (e) {
    console.log(`  Failed: ${e.message}`);
  }
}

// ── Main ──

async function main() {
  const data = await phase1();

  // Check we have required components (SWPT is optional — near-zero in normal markets)
  const required = ['WALCL', 'RRPONTSYD', 'WTREGEN'];
  const missing = required.filter(id => !data[id]?.length);
  if (missing.length > 0) {
    console.log(`\nMissing required components: ${missing.join(', ')}`);
    console.log('Cannot derive Net Fed Liquidity. Aborting.');
    return;
  }
  if (!data.SWPT?.length) {
    console.log('\n  Note: SWPT (CB Swap Lines) unavailable — using simplified formula: WALCL - RRP - TGA');
  }

  const derived = deriveNetFedLiquidity(data);
  if (derived.length < 100) {
    console.log('Too few derived points. Aborting.');
    return;
  }

  await phase2(derived, data);
}

main().catch(e => console.error('Fatal:', e));
