/**
 * Recession Backtest Script
 *
 * Validates the US Economic Cycle Regime model against NBER recession dates.
 * For each recession, truncates data to key lead times (-12m, -9m, -6m, -3m, onset)
 * and computes what the model would have scored at that moment.
 *
 * Usage: npx tsx scripts/backtest-recessions.ts <API_KEY>
 */

const BASE_URL = 'https://api.cycle.tools';

// ── NBER Recession Dates ────────────────────────────────────────
// Official start dates (determined after the fact by NBER)

interface RecessionEvent {
  name: string;
  start: string;       // NBER official start month
  end: string;         // NBER official end month
  checkpoints: string[]; // dates to evaluate (onset, -3m, -6m, -9m, -12m)
  notes: string;
}

const RECESSIONS: RecessionEvent[] = [
  {
    name: 'Dot-com Recession',
    start: '2001-03-01',
    end: '2001-11-01',
    checkpoints: [
      '2000-03-01',  // -12 months
      '2000-06-01',  // -9 months
      '2000-09-01',  // -6 months
      '2000-12-01',  // -3 months
      '2001-03-01',  // onset
    ],
    notes: 'Tech bubble burst, equity-led downturn. NBER declared Mar 2001 start.',
  },
  {
    name: 'Great Financial Crisis',
    start: '2007-12-01',
    end: '2009-06-01',
    checkpoints: [
      '2006-12-01',  // -12 months
      '2007-03-01',  // -9 months
      '2007-06-01',  // -6 months
      '2007-09-01',  // -3 months
      '2007-12-01',  // onset
    ],
    notes: 'Housing/credit crisis. NBER declared Dec 2007 start (announced Dec 2008).',
  },
  {
    name: 'COVID Recession',
    start: '2020-02-01',
    end: '2020-04-01',
    checkpoints: [
      '2019-02-01',  // -12 months
      '2019-05-01',  // -9 months
      '2019-08-01',  // -6 months
      '2019-11-01',  // -3 months
      '2020-02-01',  // onset
    ],
    notes: 'Exogenous shock. NBER declared Feb 2020 start. Note: model cannot predict pandemics, but may show pre-existing fragility.',
  },
];

// ── Series Configuration (matching production) ──────────────────

interface SeriesConfig {
  fredId: string;
  tickerId: string;
  layer: 1 | 2 | 3 | 4;
  seriesName: string;
  invert: boolean;
  weight: number;
}

const SERIES: SeriesConfig[] = [
  // L1 — Leading
  { fredId: 'T10Y2Y',   tickerId: 'T10Y2Y:FDS',       layer: 1, seriesName: '10Y-2Y Spread',       invert: false, weight: 0.100 },
  { fredId: 'T10Y3M',   tickerId: 'T10Y3M:FDS',       layer: 1, seriesName: '10Y-3M Spread',       invert: false, weight: 0.100 },
  { fredId: 'ICSA',     tickerId: 'ICSA-W:FDS',       layer: 1, seriesName: 'Initial Claims',      invert: true,  weight: 0.253 },
  { fredId: 'CCSA',     tickerId: 'CCSA-W:FDS',       layer: 1, seriesName: 'Continued Claims',    invert: true,  weight: 1.500 },
  { fredId: 'UMCSENT',  tickerId: 'UMCSENT-M:FDS',    layer: 1, seriesName: 'Consumer Sentiment',  invert: false, weight: 1.500 },
  { fredId: 'USSLIND',  tickerId: 'USSLIND-M:FDS',    layer: 1, seriesName: 'Leading Econ Index',  invert: false, weight: 0.100 },
  { fredId: 'PERMIT',   tickerId: 'PERMIT-M:FDS',     layer: 1, seriesName: 'Building Permits',    invert: false, weight: 0.100 },
  { fredId: 'DGORDER',  tickerId: 'DGORDER-M:FDS',    layer: 1, seriesName: 'Durable Goods',       invert: false, weight: 1.500 },
  { fredId: 'JTSJOL',   tickerId: 'JTSJOL-M:FDS',     layer: 1, seriesName: 'JOLTS Openings',      invert: false, weight: 0.896 },
  // L2 — Coincident
  { fredId: 'INDPRO',   tickerId: 'INDPRO-M:FDS',     layer: 2, seriesName: 'Industrial Prod',     invert: false, weight: 1.000 },
  { fredId: 'PAYEMS',   tickerId: 'PAYEMS-M:FDS',     layer: 2, seriesName: 'Nonfarm Payrolls',    invert: false, weight: 0.500 },
  { fredId: 'DSPIC96',  tickerId: 'DSPIC96-M:FDS',    layer: 2, seriesName: 'Real Disp Income',    invert: false, weight: 0.400 },
  { fredId: 'UNRATE',   tickerId: 'UNRATE-M:FDS',     layer: 2, seriesName: 'Unemployment Rate',   invert: true,  weight: 0.600 },
  // L3 — Stress
  { fredId: 'VIXCLS',   tickerId: 'VIXCLS:FDS',       layer: 3, seriesName: 'VIX',                 invert: true,  weight: 0.100 },
  { fredId: 'STLFSI4',  tickerId: 'STLFSI4-W:FDS',    layer: 3, seriesName: 'StL Fin Stress',      invert: true,  weight: 0.100 },
  { fredId: 'BAA10Y',   tickerId: 'BAA10Y:FDS',       layer: 3, seriesName: 'Baa-10Y Spread',      invert: true,  weight: 1.500 },
  { fredId: 'BAMLH0A0HYM2', tickerId: 'BAMLH0A0HYM2:FDS', layer: 3, seriesName: 'HY OAS Spread', invert: true,  weight: 1.349 },
  // L4 — Policy
  { fredId: 'DFF',      tickerId: 'DFF:FDS',          layer: 4, seriesName: 'Fed Funds Rate',      invert: true,  weight: 0.301 },
  { fredId: 'T5YIE',    tickerId: 'T5YIE:FDS',        layer: 4, seriesName: '5Y Breakeven',        invert: false, weight: 1.500 },
  { fredId: 'CPIAUCSL', tickerId: 'CPIAUCSL-M:FDS',   layer: 4, seriesName: 'CPI Headline',        invert: true,  weight: 0.400 },
  { fredId: 'CPILFESL', tickerId: 'CPILFESL-M:FDS',   layer: 4, seriesName: 'Core CPI',            invert: true,  weight: 0.307 },
  { fredId: 'M2SL',     tickerId: 'M2SL-M:FDS',       layer: 4, seriesName: 'M2 Money Supply',     invert: false, weight: 0.100 },
  { fredId: 'DTWEXBGS', tickerId: 'DTWEXBGS:FDS',     layer: 4, seriesName: 'Trade-Weighted USD',   invert: true,  weight: 0.100 },
];

const LAYER_WEIGHTS: Record<number, number> = { 1: 0.30, 2: 0.15, 3: 0.20, 4: 0.10 };
// L5 excluded — NFL data only from 2014, so only testable for COVID

// ── API Functions ───────────────────────────────────────────────

async function fetchBars(apiKey: string, tickerId: string): Promise<{ date: string; close: number }[]> {
  // Ensure dataset
  const ensureUrl = `${BASE_URL}/api/data/EnsureCompleteDataset?api_key=${apiKey}&tickerId=${encodeURIComponent(tickerId)}&unixFrom=0&unixTo=0&lastclose=true`;
  const ensureResp = await fetch(ensureUrl);
  const ensureText = await ensureResp.text();
  if (ensureText.includes('quota exceeded')) throw new Error('API quota exceeded');

  try {
    const result = JSON.parse(ensureText);
    if (!result.isComplete && result.trackingId) {
      const waitUrl = `${BASE_URL}/api/data/WaitUntilUpdateCompleted?api_key=${apiKey}&requestId=${result.trackingId}&timeoutSeconds=30`;
      await fetch(waitUrl);
    }
  } catch { /* ok */ }

  // Fetch full history
  const url = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${apiKey}&tickerid=${encodeURIComponent(tickerId)}&maxbars=0`;
  const resp = await fetch(url);
  const text = await resp.text();
  if (text.includes('quota exceeded')) throw new Error('API quota exceeded');

  let bars: any[];
  try {
    bars = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) bars = JSON.parse(match[0]);
    else throw new Error(`Cannot parse response for ${tickerId}`);
  }

  return bars
    .filter((b: any) => b.date && b.close != null)
    .map((b: any) => ({ date: b.date, close: b.close }));
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
  if (text.includes('quota exceeded')) throw new Error('API quota exceeded');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Cannot parse CycleScanner response');
  }
}

// ── Scoring Logic (matching production composite.ts) ────────────

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
  const phaseScore = (rawPhaseScore + 100) / 2;  // -100..+100 → 0..100
  return invert ? 100 - phaseScore : phaseScore;
}

function classifyRegime(score: number): string {
  if (score >= 62) return 'Risk-On';
  if (score >= 55) return 'Neutral-Bullish';
  if (score >= 48) return 'Neutral';
  if (score >= 38) return 'Neutral-Bearish';
  return 'Risk-Off';
}

// ── Intra-layer divergence (matching production) ────────────────

function intraLayerDivergencePenalty(
  seriesScores: { fredId: string; adjustedScore: number }[]
): number {
  if (seriesScores.length < 3) return 0;
  const sorted = [...seriesScores].sort((a, b) =>
    (SERIES.find(s => s.fredId === b.fredId)?.weight ?? 0.10) -
    (SERIES.find(s => s.fredId === a.fredId)?.weight ?? 0.10)
  );
  const top = sorted[0];
  const rest = sorted.slice(1);
  const topWeight = SERIES.find(s => s.fredId === top.fredId)?.weight ?? 0.10;
  const restTotalWeight = rest.reduce((s, r) => s + (SERIES.find(x => x.fredId === r.fredId)?.weight ?? 0.10), 0);
  if (topWeight / (topWeight + restTotalWeight) < 0.30) return 0;
  const restAvg = rest.reduce((s, r) => s + r.adjustedScore * (SERIES.find(x => x.fredId === r.fredId)?.weight ?? 0.10), 0) / restTotalWeight;
  const spread = top.adjustedScore - restAvg;
  if (spread <= 30) return 0;
  return -Math.min(5, ((spread - 30) / 30) * 5);
}

// ── Main Backtest ───────────────────────────────────────────────

async function main() {
  const apiKey = process.argv[2];
  if (!apiKey) {
    console.error('Usage: npx tsx scripts/backtest-recessions.ts <API_KEY>');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('US ECONOMIC CYCLE REGIME — RECESSION BACKTEST');
  console.log('='.repeat(80));
  console.log(`Testing ${SERIES.length} series across ${RECESSIONS.length} recessions\n`);

  // Step 1: Fetch all series data (full history)
  console.log('Fetching historical data for all series...');
  const allData: Record<string, { date: string; close: number }[]> = {};

  for (const s of SERIES) {
    try {
      process.stdout.write(`  ${s.fredId}...`);
      allData[s.fredId] = await fetchBars(apiKey, s.tickerId);
      console.log(` ${allData[s.fredId].length} bars (${allData[s.fredId][0]?.date} → ${allData[s.fredId][allData[s.fredId].length - 1]?.date})`);
    } catch (e: any) {
      console.log(` ERROR: ${e.message}`);
      allData[s.fredId] = [];
    }
    // Rate limit courtesy
    await new Promise(r => setTimeout(r, 200));
  }

  // Step 2: For each recession, evaluate at each checkpoint
  for (const recession of RECESSIONS) {
    console.log('\n' + '═'.repeat(80));
    console.log(`\n${recession.name.toUpperCase()}`);
    console.log(`NBER Period: ${recession.start} to ${recession.end}`);
    console.log(recession.notes);
    console.log('─'.repeat(80));

    const leadLabels = ['-12m', '-9m', '-6m', '-3m', 'Onset'];

    // Header
    console.log(`\n${'Checkpoint'.padEnd(14)} ${'Date'.padEnd(12)} ${'L1-Lead'.padEnd(10)} ${'L2-Coin'.padEnd(10)} ${'L3-Strss'.padEnd(10)} ${'L4-Pol'.padEnd(10)} ${'Compos'.padEnd(10)} Regime`);
    console.log('─'.repeat(90));

    for (let ci = 0; ci < recession.checkpoints.length; ci++) {
      const cutoffDate = recession.checkpoints[ci];
      const label = leadLabels[ci];

      // Compute scores for each series at this cutoff
      const layerScores: Record<number, { total: number; weight: number; series: { fredId: string; adjustedScore: number }[] }> = {
        1: { total: 0, weight: 0, series: [] },
        2: { total: 0, weight: 0, series: [] },
        3: { total: 0, weight: 0, series: [] },
        4: { total: 0, weight: 0, series: [] },
      };

      let seriesErrors = 0;

      for (const s of SERIES) {
        const bars = allData[s.fredId];
        if (!bars || bars.length === 0) {
          seriesErrors++;
          continue;
        }

        // Truncate to cutoff date
        const truncated = bars.filter(b => b.date <= cutoffDate);
        if (truncated.length < 100) {
          seriesErrors++;
          continue;
        }

        const closes = truncated.map(b => b.close);

        try {
          const scan = await runCycleScanner(apiKey, closes);
          const dom = extractDominant(scan.peaks);

          if (!dom) {
            seriesErrors++;
            continue;
          }

          const rawPhase = dom.avgPhaseScore ?? 0;
          const adjustedScore = computeAdjustedScore(rawPhase, s.invert);

          layerScores[s.layer].total += adjustedScore * s.weight;
          layerScores[s.layer].weight += s.weight;
          layerScores[s.layer].series.push({ fredId: s.fredId, adjustedScore });

          // Rate limit
          await new Promise(r => setTimeout(r, 150));
        } catch (e: any) {
          if (e.message.includes('quota')) {
            console.error('\n\n*** API QUOTA EXCEEDED — stopping backtest ***');
            process.exit(1);
          }
          seriesErrors++;
        }
      }

      // Compute layer averages with intra-layer divergence
      const layerResults: Record<number, number> = {};
      for (const layer of [1, 2, 3, 4]) {
        const ls = layerScores[layer];
        if (ls.weight > 0) {
          const rawScore = ls.total / ls.weight;
          const penalty = intraLayerDivergencePenalty(ls.series);
          layerResults[layer] = Math.max(0, Math.min(100, rawScore + penalty));
        } else {
          layerResults[layer] = 50; // neutral if no data
        }
      }

      // Composite (L1-L4 only, renormalized without L5)
      const l14Weight = 0.30 + 0.15 + 0.20 + 0.10; // = 0.75
      const compositeRaw =
        (layerResults[1] * 0.30 + layerResults[2] * 0.15 + layerResults[3] * 0.20 + layerResults[4] * 0.10) / l14Weight;
      const composite = Math.round(Math.max(0, Math.min(100, compositeRaw)) * 10) / 10;
      const regime = classifyRegime(composite);

      console.log(
        `${label.padEnd(14)} ${cutoffDate.padEnd(12)} ` +
        `${layerResults[1].toFixed(1).padStart(6)}    ` +
        `${layerResults[2].toFixed(1).padStart(6)}    ` +
        `${layerResults[3].toFixed(1).padStart(6)}    ` +
        `${layerResults[4].toFixed(1).padStart(6)}    ` +
        `${composite.toFixed(1).padStart(6)}    ` +
        `${regime}` +
        (seriesErrors > 0 ? ` (${seriesErrors} series unavailable)` : '')
      );
    }

    // Summary analysis
    console.log('\n' + '─'.repeat(80));
    console.log(`Assessment for ${recession.name}:`);

    // Did the model warn?
    // We'll check if score dropped below 48 (Neutral) before onset
    const onsetDate = recession.checkpoints[recession.checkpoints.length - 1];
    console.log('(See scores above — did L1 and composite drop into Neutral-Bearish or Risk-Off before the official onset?)\n');
  }

  // ── Summary ──
  console.log('\n' + '═'.repeat(80));
  console.log('BACKTEST METHODOLOGY NOTES');
  console.log('═'.repeat(80));
  console.log(`
1. Scoring uses production model weights (L1: 30%, L2: 15%, L3: 20%, L4: 10%)
2. L5 (Liquidity) excluded — NFL data only available from 2014
3. Composite is renormalized across L1-L4 (dividing by 0.75 total weight)
4. Intra-layer divergence penalties are applied (same as production)
5. Phase score = (avgPhaseScore + 100) / 2, then inverted where applicable
6. Each checkpoint uses data ONLY up to that date (simulating real-time)
7. CycleScanner runs with full default settings (dominantPeakFinder, stability)
8. Some series may be unavailable for earlier periods (JTSJOL starts 2001, etc.)

KEY QUESTION: Did the composite and L1 (Leading) drop into warning territory
(Neutral-Bearish or Risk-Off, score < 48) BEFORE the NBER-declared recession onset?
The NBER typically announces recessions 6-12 months AFTER the fact.
Our model should ideally flag deterioration 3-9 months in advance.
  `);
}

main().catch(console.error);
