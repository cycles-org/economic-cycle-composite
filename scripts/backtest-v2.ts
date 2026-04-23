/**
 * Recession Backtest V2 — Tight Window Analysis
 *
 * Focuses on -6m to +1m with monthly granularity.
 * Maximizes series coverage, includes L5 for COVID.
 * Per-series breakdown to identify best/worst predictors.
 *
 * Usage: npx tsx scripts/backtest-v2.ts <API_KEY>
 */

const BASE_URL = 'https://api.cycle.tools';

// ── NBER Recession Dates ────────────────────────────────────────

interface RecessionEvent {
  name: string;
  start: string;
  end: string;
  checkpoints: { label: string; date: string }[];
  notes: string;
}

function monthlyCheckpoints(startDate: string): { label: string; date: string }[] {
  const d = new Date(startDate);
  const points: { label: string; date: string }[] = [];
  for (let offset = -6; offset <= 1; offset++) {
    const cp = new Date(d);
    cp.setMonth(cp.getMonth() + offset);
    const label = offset < 0 ? `${offset}m` : offset === 0 ? 'Onset' : `+${offset}m`;
    points.push({ label, date: cp.toISOString().slice(0, 10) });
  }
  return points;
}

const RECESSIONS: RecessionEvent[] = [
  {
    name: 'Dot-com Recession',
    start: '2001-03-01',
    end: '2001-11-01',
    checkpoints: monthlyCheckpoints('2001-03-01'),
    notes: 'Tech bubble burst. NBER announced Nov 2001 (8 months after start).',
  },
  {
    name: 'Great Financial Crisis',
    start: '2007-12-01',
    end: '2009-06-01',
    checkpoints: monthlyCheckpoints('2007-12-01'),
    notes: 'Housing/credit crisis. NBER announced Dec 2008 (12 months after start).',
  },
  {
    name: 'COVID Recession',
    start: '2020-02-01',
    end: '2020-04-01',
    checkpoints: monthlyCheckpoints('2020-02-01'),
    notes: 'Exogenous pandemic shock. Shortest recession on record. Tests pre-existing fragility.',
  },
];

// ── Series Configuration ────────────────────────────────────────

interface SeriesConfig {
  fredId: string;
  tickerId: string;
  layer: 1 | 2 | 3 | 4;
  seriesName: string;
  invert: boolean;
  weight: number;
  dataStart?: string; // approximate start of data availability
}

const SERIES: SeriesConfig[] = [
  // L1 — Leading
  { fredId: 'T10Y2Y',   tickerId: 'T10Y2Y:FDS',       layer: 1, seriesName: '10Y-2Y Spread',       invert: false, weight: 0.100, dataStart: '1994' },
  { fredId: 'T10Y3M',   tickerId: 'T10Y3M:FDS',       layer: 1, seriesName: '10Y-3M Spread',       invert: false, weight: 0.100, dataStart: '2017' },
  { fredId: 'ICSA',     tickerId: 'ICSA-W:FDS',       layer: 1, seriesName: 'Initial Claims',      invert: true,  weight: 0.253, dataStart: '2017' },
  { fredId: 'CCSA',     tickerId: 'CCSA-W:FDS',       layer: 1, seriesName: 'Continued Claims',    invert: true,  weight: 1.500, dataStart: '2019' },
  { fredId: 'UMCSENT',  tickerId: 'UMCSENT-M:FDS',    layer: 1, seriesName: 'Consumer Sentiment',  invert: false, weight: 1.500, dataStart: '1952' },
  { fredId: 'USSLIND',  tickerId: 'USSLIND-M:FDS',    layer: 1, seriesName: 'Leading Econ Index',  invert: false, weight: 0.600, dataStart: '1982' },
  { fredId: 'PERMIT',   tickerId: 'PERMIT-M:FDS',     layer: 1, seriesName: 'Building Permits',    invert: false, weight: 0.400, dataStart: '1970' },
  { fredId: 'DGORDER',  tickerId: 'DGORDER-M:FDS',    layer: 1, seriesName: 'Durable Goods',       invert: false, weight: 0.800, dataStart: '1992' },
  { fredId: 'JTSJOL',   tickerId: 'JTSJOL-M:FDS',     layer: 1, seriesName: 'JOLTS Openings',      invert: false, weight: 0.896, dataStart: '2000' },
  // L2 — Coincident
  { fredId: 'INDPRO',   tickerId: 'INDPRO-M:FDS',     layer: 2, seriesName: 'Industrial Prod',     invert: false, weight: 1.000, dataStart: '1953' },
  { fredId: 'PAYEMS',   tickerId: 'PAYEMS-M:FDS',     layer: 2, seriesName: 'Nonfarm Payrolls',    invert: false, weight: 0.500, dataStart: '1953' },
  { fredId: 'DSPIC96',  tickerId: 'DSPIC96-M:FDS',    layer: 2, seriesName: 'Real Disp Income',    invert: false, weight: 0.400, dataStart: '1970' },
  { fredId: 'UNRATE',   tickerId: 'UNRATE-M:FDS',     layer: 2, seriesName: 'Unemployment Rate',   invert: true,  weight: 0.600, dataStart: '1950' },
  // L3 — Stress
  { fredId: 'VIXCLS',   tickerId: 'VIXCLS:FDS',       layer: 3, seriesName: 'VIX',                 invert: true,  weight: 0.100, dataStart: '1990' },
  { fredId: 'STLFSI4',  tickerId: 'STLFSI4-W:FDS',    layer: 3, seriesName: 'StL Fin Stress',      invert: true,  weight: 0.100, dataStart: '1993' },
  { fredId: 'BAA10Y',   tickerId: 'BAA10Y:FDS',       layer: 3, seriesName: 'Baa-10Y Spread',      invert: true,  weight: 1.500, dataStart: '2018' },
  { fredId: 'BAMLH0A0HYM2', tickerId: 'BAMLH0A0HYM2:FDS', layer: 3, seriesName: 'HY OAS Spread', invert: true,  weight: 1.349, dataStart: '1996' },
  // L4 — Policy
  { fredId: 'DFF',      tickerId: 'DFF:FDS',          layer: 4, seriesName: 'Fed Funds Rate',      invert: true,  weight: 0.301, dataStart: '1970' },
  { fredId: 'T5YIE',    tickerId: 'T5YIE:FDS',        layer: 4, seriesName: '5Y Breakeven',        invert: false, weight: 1.500, dataStart: '2003' },
  { fredId: 'CPIAUCSL', tickerId: 'CPIAUCSL-M:FDS',   layer: 4, seriesName: 'CPI Headline',        invert: true,  weight: 0.400, dataStart: '1952' },
  { fredId: 'CPILFESL', tickerId: 'CPILFESL-M:FDS',   layer: 4, seriesName: 'Core CPI',            invert: true,  weight: 0.307, dataStart: '1957' },
  { fredId: 'M2SL',     tickerId: 'M2SL-M:FDS',       layer: 4, seriesName: 'M2 Money Supply',     invert: false, weight: 0.100, dataStart: '1959' },
  { fredId: 'DTWEXBGS', tickerId: 'DTWEXBGS:FDS',     layer: 4, seriesName: 'Trade-Weighted USD',   invert: true,  weight: 0.100, dataStart: '2011' },
];

const LAYER_WEIGHTS: Record<number, number> = { 1: 0.30, 2: 0.15, 3: 0.20, 4: 0.10 };
const LAYER_NAMES: Record<number, string> = { 1: 'Leading', 2: 'Coincident', 3: 'Stress', 4: 'Policy' };

// ── API Functions ───────────────────────────────────────────────

async function fetchBars(apiKey: string, tickerId: string): Promise<{ date: string; close: number }[]> {
  const ensureUrl = `${BASE_URL}/api/data/EnsureCompleteDataset?api_key=${apiKey}&tickerId=${encodeURIComponent(tickerId)}&unixFrom=0&unixTo=0&lastclose=true`;
  const ensureResp = await fetch(ensureUrl);
  const ensureText = await ensureResp.text();
  if (ensureText.includes('quota exceeded')) throw new Error('QUOTA');
  try {
    const result = JSON.parse(ensureText);
    if (!result.isComplete && result.trackingId) {
      await fetch(`${BASE_URL}/api/data/WaitUntilUpdateCompleted?api_key=${apiKey}&requestId=${result.trackingId}&timeoutSeconds=30`);
    }
  } catch { /* ok */ }

  const url = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${apiKey}&tickerid=${encodeURIComponent(tickerId)}&maxbars=0`;
  const resp = await fetch(url);
  const text = await resp.text();
  if (text.includes('quota exceeded')) throw new Error('QUOTA');
  let bars: any[];
  try { bars = JSON.parse(text); } catch {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) bars = JSON.parse(m[0]); else throw new Error(`Parse fail: ${tickerId}`);
  }
  return bars.filter((b: any) => b.date && b.close != null).map((b: any) => ({ date: b.date, close: b.close }));
}

interface CyclePeak {
  cycleLength: number;
  phaseStatus: string;
  avgPhaseScore?: number;
  avgPhaseStatus?: string;
  bartelsValue: number;
  strength: number;
  stabilityScore: number;
  dominantRank: number;
}

async function runCycleScanner(apiKey: string, closes: number[]): Promise<{ peaks: CyclePeak[] }> {
  const url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${apiKey}&minCycleLength=5&maxCycleLength=400&sortByStrength=true&includeSpectrum=false&dominantPeakFinder=true&useStability=true`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(closes),
  });
  const text = await resp.text();
  if (text.includes('quota exceeded')) throw new Error('QUOTA');
  try { return JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Parse fail: CycleScanner');
  }
}

// ── Scoring Logic ───────────────────────────────────────────────

function extractDominant(peaks: CyclePeak[]): CyclePeak | null {
  if (!peaks?.length) return null;
  const viable = peaks.filter(p => p.cycleLength >= 30 && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  const pool = viable.length > 0 ? viable : peaks.filter(p => p.cycleLength >= 20);
  if (pool.length === 0) return peaks[0] ?? null;
  const ranked = pool.filter(p => p.dominantRank > 0);
  if (ranked.length > 0) return ranked.sort((a, b) => a.dominantRank - b.dominantRank)[0];
  return pool.sort((a, b) => b.strength - a.strength)[0];
}

function computeAdjustedScore(rawPhaseScore: number, invert: boolean): number {
  const phaseScore = (rawPhaseScore + 100) / 2;
  return invert ? 100 - phaseScore : phaseScore;
}

function classifyRegime(score: number): string {
  if (score >= 62) return 'Risk-On';
  if (score >= 55) return 'Ntrl-Bull';
  if (score >= 48) return 'Neutral';
  if (score >= 38) return 'Ntrl-Bear';
  return 'Risk-Off';
}

function regimeIcon(score: number): string {
  if (score >= 62) return '🟢';
  if (score >= 55) return '🟡';
  if (score >= 48) return '⚪';
  if (score >= 38) return '🟠';
  return '🔴';
}

function intraLayerDivergencePenalty(seriesScores: { fredId: string; adjustedScore: number }[]): number {
  if (seriesScores.length < 3) return 0;
  const sorted = [...seriesScores].sort((a, b) =>
    (SERIES.find(s => s.fredId === b.fredId)?.weight ?? 0.10) -
    (SERIES.find(s => s.fredId === a.fredId)?.weight ?? 0.10)
  );
  const top = sorted[0];
  const rest = sorted.slice(1);
  const topW = SERIES.find(s => s.fredId === top.fredId)?.weight ?? 0.10;
  const restW = rest.reduce((s, r) => s + (SERIES.find(x => x.fredId === r.fredId)?.weight ?? 0.10), 0);
  if (topW / (topW + restW) < 0.30) return 0;
  const restAvg = rest.reduce((s, r) => s + r.adjustedScore * (SERIES.find(x => x.fredId === r.fredId)?.weight ?? 0.10), 0) / restW;
  const spread = top.adjustedScore - restAvg;
  if (spread <= 30) return 0;
  return -Math.min(5, ((spread - 30) / 30) * 5);
}

// ── Types for results ───────────────────────────────────────────

interface SeriesScore {
  fredId: string;
  seriesName: string;
  layer: number;
  adjustedScore: number;
  weight: number;
  phaseStatus: string;
}

interface CheckpointResult {
  label: string;
  date: string;
  layerScores: Record<number, number>;
  composite: number;
  regime: string;
  seriesScores: SeriesScore[];
  availableCount: number;
  totalCount: number;
}

// ── Main Backtest ───────────────────────────────────────────────

async function main() {
  const apiKey = process.argv[2];
  if (!apiKey) {
    console.error('Usage: npx tsx scripts/backtest-v2.ts <API_KEY>');
    process.exit(1);
  }

  console.log('═'.repeat(90));
  console.log('US ECONOMIC CYCLE REGIME — RECESSION BACKTEST V2 (TIGHT WINDOW)');
  console.log('═'.repeat(90));

  // Step 1: Fetch all data
  console.log('\nFetching all series data...');
  const allData: Record<string, { date: string; close: number }[]> = {};
  for (const s of SERIES) {
    try {
      process.stdout.write(`  ${s.fredId.padEnd(16)}`);
      allData[s.fredId] = await fetchBars(apiKey, s.tickerId);
      const d = allData[s.fredId];
      console.log(`${String(d.length).padStart(6)} bars  ${d[0]?.date?.slice(0, 10)} → ${d[d.length - 1]?.date?.slice(0, 10)}`);
    } catch (e: any) {
      if (e.message === 'QUOTA') { console.error('\n*** QUOTA EXCEEDED ***'); process.exit(1); }
      console.log(`  ERROR: ${e.message}`);
      allData[s.fredId] = [];
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // Step 2: Run each recession
  for (const recession of RECESSIONS) {
    console.log('\n\n' + '═'.repeat(90));
    console.log(`  ${recession.name.toUpperCase()}`);
    console.log(`  NBER: ${recession.start} to ${recession.end}`);
    console.log(`  ${recession.notes}`);
    console.log('═'.repeat(90));

    const results: CheckpointResult[] = [];

    for (const cp of recession.checkpoints) {
      const layerData: Record<number, { total: number; weight: number; series: { fredId: string; adjustedScore: number }[] }> = {
        1: { total: 0, weight: 0, series: [] },
        2: { total: 0, weight: 0, series: [] },
        3: { total: 0, weight: 0, series: [] },
        4: { total: 0, weight: 0, series: [] },
      };
      const seriesScores: SeriesScore[] = [];
      let available = 0;

      for (const s of SERIES) {
        const bars = allData[s.fredId] ?? [];
        const truncated = bars.filter(b => b.date <= cp.date);
        if (truncated.length < 100) continue;

        const closes = truncated.map(b => b.close);
        try {
          const scan = await runCycleScanner(apiKey, closes);
          const dom = extractDominant(scan.peaks);
          if (!dom) continue;

          const rawPhase = dom.avgPhaseScore ?? 0;
          const adj = computeAdjustedScore(rawPhase, s.invert);

          layerData[s.layer].total += adj * s.weight;
          layerData[s.layer].weight += s.weight;
          layerData[s.layer].series.push({ fredId: s.fredId, adjustedScore: adj });

          seriesScores.push({
            fredId: s.fredId,
            seriesName: s.seriesName,
            layer: s.layer,
            adjustedScore: Math.round(adj * 10) / 10,
            weight: s.weight,
            phaseStatus: dom.avgPhaseStatus || dom.phaseStatus,
          });
          available++;
          await new Promise(r => setTimeout(r, 150));
        } catch (e: any) {
          if (e.message === 'QUOTA') { console.error('\n*** QUOTA EXCEEDED ***'); process.exit(1); }
        }
      }

      // Compute layer scores
      const layerScores: Record<number, number> = {};
      for (const layer of [1, 2, 3, 4]) {
        const ls = layerData[layer];
        if (ls.weight > 0) {
          const raw = ls.total / ls.weight;
          const pen = intraLayerDivergencePenalty(ls.series);
          layerScores[layer] = Math.round(Math.max(0, Math.min(100, raw + pen)) * 10) / 10;
        } else {
          layerScores[layer] = 50;
        }
      }

      // Composite (renormalized L1-L4)
      const totalLW = Object.values(LAYER_WEIGHTS).reduce((a, b) => a + b, 0);
      const compRaw = Object.entries(LAYER_WEIGHTS).reduce((s, [l, w]) => s + layerScores[Number(l)] * w, 0) / totalLW;
      const composite = Math.round(Math.max(0, Math.min(100, compRaw)) * 10) / 10;

      results.push({
        label: cp.label,
        date: cp.date,
        layerScores,
        composite,
        regime: classifyRegime(composite),
        seriesScores,
        availableCount: available,
        totalCount: SERIES.length,
      });

      process.stdout.write(`  ${cp.label.padEnd(7)} ${cp.date}  Comp: ${composite.toFixed(1).padStart(5)}  ${classifyRegime(composite).padEnd(10)} (${available}/${SERIES.length} series)\n`);
    }

    // ── Composite Timeline ──
    console.log('\n┌─────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ COMPOSITE TIMELINE                                                              │');
    console.log('├─────────┬────────────┬────────┬────────┬────────┬────────┬────────┬─────────────┤');
    console.log('│ Period  │ Date       │ L1-Led │ L2-Cnc │ L3-Str │ L4-Pol │ Comp   │ Regime      │');
    console.log('├─────────┼────────────┼────────┼────────┼────────┼────────┼────────┼─────────────┤');
    for (const r of results) {
      const icon = regimeIcon(r.composite);
      console.log(
        `│ ${r.label.padEnd(7)} │ ${r.date} │ ${r.layerScores[1].toFixed(1).padStart(6)} │ ${r.layerScores[2].toFixed(1).padStart(6)} │ ${r.layerScores[3].toFixed(1).padStart(6)} │ ${r.layerScores[4].toFixed(1).padStart(6)} │ ${r.composite.toFixed(1).padStart(6)} │ ${icon} ${r.regime.padEnd(10)}│`
      );
    }
    console.log('└─────────┴────────────┴────────┴────────┴────────┴────────┴────────┴─────────────┘');

    // ── Per-Series Detail at -3m and Onset ──
    const minus3 = results.find(r => r.label === '-3m');
    const onset = results.find(r => r.label === 'Onset');

    if (minus3 && onset) {
      console.log('\n┌───────────────────────────────────────────────────────────────────────────┐');
      console.log('│ PER-SERIES SCORES: -3 Months vs Onset                                     │');
      console.log('├────┬──────────────────────┬────────┬────────────┬────────────┬─────────────┤');
      console.log('│ L  │ Series               │ Weight │ Score @-3m │ Score @0   │ Delta       │');
      console.log('├────┼──────────────────────┼────────┼────────────┼────────────┼─────────────┤');

      // Merge series from both checkpoints
      const allFredIds = [...new Set([...minus3.seriesScores.map(s => s.fredId), ...onset.seriesScores.map(s => s.fredId)])];
      allFredIds.sort((a, b) => {
        const sa = SERIES.find(s => s.fredId === a)!;
        const sb = SERIES.find(s => s.fredId === b)!;
        if (sa.layer !== sb.layer) return sa.layer - sb.layer;
        return sb.weight - sa.weight;
      });

      for (const fid of allFredIds) {
        const cfg = SERIES.find(s => s.fredId === fid)!;
        const m3 = minus3.seriesScores.find(s => s.fredId === fid);
        const on = onset.seriesScores.find(s => s.fredId === fid);
        const m3s = m3 ? m3.adjustedScore.toFixed(1) : '  n/a';
        const ons = on ? on.adjustedScore.toFixed(1) : '  n/a';
        const delta = (m3 && on) ? (on.adjustedScore - m3.adjustedScore).toFixed(1) : '  n/a';
        const warn = m3 && m3.adjustedScore < 38 ? ' ⚠' : '';
        console.log(
          `│ L${cfg.layer} │ ${cfg.seriesName.padEnd(20).slice(0, 20)} │ ${cfg.weight.toFixed(2).padStart(6)} │ ${m3s.padStart(8)}${warn.padEnd(2)} │ ${ons.padStart(8)}   │ ${delta.padStart(8)}    │`
        );
      }
      console.log('└────┴──────────────────────┴────────┴────────────┴────────────┴─────────────┘');
    }

    // ── Best/Worst Predictors at -3m ──
    if (minus3) {
      const sorted = [...minus3.seriesScores].sort((a, b) => a.adjustedScore - b.adjustedScore);
      const bearish = sorted.filter(s => s.adjustedScore < 38);
      const bullish = sorted.filter(s => s.adjustedScore >= 62);

      console.log('\n  BEST EARLY WARNING SIGNALS at -3m (score < 38):');
      if (bearish.length > 0) {
        for (const s of bearish) {
          console.log(`    🔴 ${s.seriesName} (L${s.layer}): ${s.adjustedScore.toFixed(1)} — weight ${s.weight.toFixed(2)}`);
        }
      } else {
        console.log('    (none — no series in warning territory at -3m)');
      }

      console.log('\n  FALSE ALL-CLEAR SIGNALS at -3m (score >= 62):');
      if (bullish.length > 0) {
        for (const s of bullish) {
          console.log(`    🟢 ${s.seriesName} (L${s.layer}): ${s.adjustedScore.toFixed(1)} — weight ${s.weight.toFixed(2)}`);
        }
      } else {
        console.log('    (none)');
      }
    }
  }

  // ── Cross-Recession Analysis ──
  console.log('\n\n' + '═'.repeat(90));
  console.log('  CROSS-RECESSION OPTIMIZATION ANALYSIS');
  console.log('═'.repeat(90));
  console.log(`
  TARGET: Composite should be Neutral-Bearish or Risk-Off (< 48) at -3 months
          before each NBER recession start.

  QUESTIONS TO ANSWER:
  1. Which series consistently warned early?
  2. Which series gave false all-clears?
  3. What weight adjustments would improve prediction?
  4. Which layers carried the warning vs. masked it?

  The detailed per-series tables above provide the raw data.
  Review each recession's -3m column to identify:
  - Series that scored < 38 at -3m across multiple recessions = reliable warners
  - Series that scored > 62 at -3m across multiple recessions = need weight reduction or lag adjustment
  - Layers where the layer score was > 55 at -3m = the layer is too slow

  NOTE: COVID is a special case (exogenous shock) — the model should show
  pre-existing fragility but cannot predict a pandemic. Focus optimization
  on Dot-com and GFC which were endogenous economic/financial recessions.
  `);
}

main().catch(console.error);
