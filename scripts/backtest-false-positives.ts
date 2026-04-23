/**
 * False Positive Analysis — Rolling Composite Score
 *
 * Computes the composite score at monthly intervals across the full data range
 * (1997–2025) and identifies every period where the composite dropped below 48
 * (Neutral-Bearish). Cross-references against NBER recession dates to classify
 * each warning as a true positive or false positive.
 *
 * This answers: "How often did a sub-48 reading NOT lead to a recession?"
 *
 * Usage: npx tsx scripts/backtest-false-positives.ts <API_KEY>
 */

const BASE_URL = 'https://api.cycle.tools';

// ── NBER Recession Periods ─────────────────────────────────────
// All NBER recessions since 1990 (our data coverage starts ~1996)
const NBER_RECESSIONS = [
  { start: '2001-03-01', end: '2001-11-01', name: 'Dot-com' },
  { start: '2007-12-01', end: '2009-06-01', name: 'GFC' },
  { start: '2020-02-01', end: '2020-04-01', name: 'COVID' },
];

function isInOrNearRecession(date: string, leadMonths: number = 6): string | null {
  const d = new Date(date);
  for (const rec of NBER_RECESSIONS) {
    const start = new Date(rec.start);
    const end = new Date(rec.end);
    // Warning window: up to leadMonths before start through end of recession
    const warningStart = new Date(start);
    warningStart.setMonth(warningStart.getMonth() - leadMonths);
    if (d >= warningStart && d <= end) return rec.name;
  }
  return null;
}

// ── Series Configuration (matching current production weights) ──

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
  { fredId: 'USSLIND',  tickerId: 'USSLIND-M:FDS',    layer: 1, seriesName: 'Leading Econ Index',  invert: false, weight: 0.600 },
  { fredId: 'PERMIT',   tickerId: 'PERMIT-M:FDS',     layer: 1, seriesName: 'Building Permits',    invert: false, weight: 0.400 },
  { fredId: 'DGORDER',  tickerId: 'DGORDER-M:FDS',    layer: 1, seriesName: 'Durable Goods',       invert: false, weight: 0.800 },
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

// ── Generate monthly checkpoints ────────────────────────────────

function generateMonthlyDates(startYear: number, startMonth: number, endYear: number, endMonth: number): string[] {
  const dates: string[] = [];
  let y = startYear, m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    dates.push(`${y}-${String(m).padStart(2, '0')}-01`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return dates;
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.argv[2];
  if (!apiKey) {
    console.error('Usage: npx tsx scripts/backtest-false-positives.ts <API_KEY>');
    process.exit(1);
  }

  console.log('═'.repeat(90));
  console.log('US ECONOMIC CYCLE REGIME — FALSE POSITIVE ANALYSIS');
  console.log('Rolling monthly composite from 1997 to 2025');
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

  // Step 2: Rolling monthly computation
  // Start from 1997 (need ~100 bars of history for cycle analysis)
  const checkpoints = generateMonthlyDates(1997, 1, 2025, 12);

  console.log(`\nComputing composite at ${checkpoints.length} monthly checkpoints...\n`);

  interface MonthResult {
    date: string;
    composite: number;
    regime: string;
    layerScores: Record<number, number>;
    seriesCount: number;
  }

  const results: MonthResult[] = [];
  let processed = 0;

  for (const cpDate of checkpoints) {
    const layerData: Record<number, { total: number; weight: number; series: { fredId: string; adjustedScore: number }[] }> = {
      1: { total: 0, weight: 0, series: [] },
      2: { total: 0, weight: 0, series: [] },
      3: { total: 0, weight: 0, series: [] },
      4: { total: 0, weight: 0, series: [] },
    };
    let availableCount = 0;

    for (const s of SERIES) {
      const bars = allData[s.fredId] ?? [];
      const truncated = bars.filter(b => b.date <= cpDate);
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
        availableCount++;
      } catch (e: any) {
        if (e.message === 'QUOTA') { console.error('\n*** QUOTA EXCEEDED ***'); process.exit(1); }
        // skip series for this checkpoint
      }
      // Rate limit
      await new Promise(r => setTimeout(r, 100));
    }

    // Compute layer scores and composite
    const layerScores: Record<number, number> = {};
    let compositeNum = 0;
    let compositeDen = 0;

    for (const layer of [1, 2, 3, 4]) {
      const ld = layerData[layer];
      if (ld.weight === 0) continue;
      let raw = ld.total / ld.weight;
      const divPenalty = intraLayerDivergencePenalty(ld.series);
      raw = Math.max(0, Math.min(100, raw + divPenalty));
      layerScores[layer] = raw;
      compositeNum += raw * LAYER_WEIGHTS[layer];
      compositeDen += LAYER_WEIGHTS[layer];
    }

    const composite = compositeDen > 0 ? compositeNum / compositeDen : 50;
    const regime = classifyRegime(composite);

    results.push({ date: cpDate, composite, regime, layerScores, seriesCount: availableCount });

    processed++;
    const icon = regimeIcon(composite);
    const recLabel = isInOrNearRecession(cpDate, 6);
    const recTag = recLabel ? ` [${recLabel}]` : '';
    process.stdout.write(`\r  ${cpDate}  ${icon} ${composite.toFixed(1).padStart(5)} ${regime.padEnd(10)} (${availableCount} series)${recTag}    `);
  }

  // Step 3: Analysis
  console.log('\n\n' + '═'.repeat(90));
  console.log('  ANALYSIS: ALL SUB-48 EPISODES');
  console.log('═'.repeat(90));

  // Find contiguous episodes where composite was < 48
  interface Episode {
    startDate: string;
    endDate: string;
    minScore: number;
    minDate: string;
    months: number;
    recession: string | null;
    avgScore: number;
  }

  const episodes: Episode[] = [];
  let currentEpisode: { start: string; scores: { date: string; score: number }[] } | null = null;

  for (const r of results) {
    if (r.composite < 48) {
      if (!currentEpisode) {
        currentEpisode = { start: r.date, scores: [] };
      }
      currentEpisode.scores.push({ date: r.date, score: r.composite });
    } else {
      if (currentEpisode) {
        const scores = currentEpisode.scores;
        const minEntry = scores.reduce((a, b) => a.score < b.score ? a : b);
        const avgScore = scores.reduce((s, x) => s + x.score, 0) / scores.length;
        // Check if any month in this episode is within 6 months before a recession
        let recession: string | null = null;
        for (const s of scores) {
          const rec = isInOrNearRecession(s.date, 6);
          if (rec) { recession = rec; break; }
        }
        episodes.push({
          startDate: currentEpisode.start,
          endDate: scores[scores.length - 1].date,
          minScore: minEntry.score,
          minDate: minEntry.date,
          months: scores.length,
          recession,
          avgScore,
        });
        currentEpisode = null;
      }
    }
  }
  // Close any open episode
  if (currentEpisode) {
    const scores = currentEpisode.scores;
    const minEntry = scores.reduce((a, b) => a.score < b.score ? a : b);
    const avgScore = scores.reduce((s, x) => s + x.score, 0) / scores.length;
    let recession: string | null = null;
    for (const s of scores) {
      const rec = isInOrNearRecession(s.date, 6);
      if (rec) { recession = rec; break; }
    }
    episodes.push({
      startDate: currentEpisode.start,
      endDate: scores[scores.length - 1].date,
      minScore: minEntry.score,
      minDate: minEntry.date,
      months: scores.length,
      recession,
      avgScore,
    });
  }

  const truePositives = episodes.filter(e => e.recession);
  const falsePositives = episodes.filter(e => !e.recession);

  console.log(`\n  Total sub-48 episodes: ${episodes.length}`);
  console.log(`  True positives (recession within 6m): ${truePositives.length}`);
  console.log(`  False positives (no recession): ${falsePositives.length}`);
  console.log(`  Precision: ${episodes.length > 0 ? ((truePositives.length / episodes.length) * 100).toFixed(0) : 'N/A'}%`);
  console.log(`  Recall: ${truePositives.length}/3 recessions detected`);

  console.log('\n┌──────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ ALL SUB-48 EPISODES                                                                  │');
  console.log('├───────┬──────────────┬──────────────┬────────┬──────────┬──────────┬──────────────────┤');
  console.log('│ #     │ Start        │ End          │ Months │ Min      │ Avg      │ Classification   │');
  console.log('├───────┼──────────────┼──────────────┼────────┼──────────┼──────────┼──────────────────┤');
  episodes.forEach((e, i) => {
    const cls = e.recession ? `✅ TP (${e.recession})` : '❌ FALSE POSITIVE';
    console.log(`│ ${String(i + 1).padStart(4)}  │ ${e.startDate}   │ ${e.endDate}   │ ${String(e.months).padStart(5)}  │ ${e.minScore.toFixed(1).padStart(7)}  │ ${e.avgScore.toFixed(1).padStart(7)}  │ ${cls.padEnd(17)}│`);
  });
  console.log('└───────┴──────────────┴──────────────┴────────┴──────────┴──────────┴──────────────────┘');

  if (falsePositives.length > 0) {
    console.log('\n' + '─'.repeat(90));
    console.log('  FALSE POSITIVE EPISODES — What was happening?');
    console.log('─'.repeat(90));
    for (const fp of falsePositives) {
      console.log(`\n  📅 ${fp.startDate} → ${fp.endDate} (${fp.months} months, low: ${fp.minScore.toFixed(1)})`);
      // Find the month with lowest score and show layer breakdown
      const lowestMonth = results.find(r => r.date === fp.minDate);
      if (lowestMonth) {
        console.log(`     Lowest point: ${fp.minDate} — Composite ${fp.minScore.toFixed(1)}`);
        for (const layer of [1, 2, 3, 4]) {
          if (lowestMonth.layerScores[layer] !== undefined) {
            const layerNames: Record<number, string> = { 1: 'Leading', 2: 'Coincident', 3: 'Stress', 4: 'Policy' };
            console.log(`       L${layer} ${layerNames[layer].padEnd(11)}: ${lowestMonth.layerScores[layer].toFixed(1)}`);
          }
        }
      }
    }
  }

  // Step 4: Full timeline (condensed)
  console.log('\n\n' + '═'.repeat(90));
  console.log('  FULL COMPOSITE TIMELINE (quarterly summary)');
  console.log('═'.repeat(90));
  console.log('');

  // Show quarterly (every 3 months) for readability
  for (let i = 0; i < results.length; i += 3) {
    const r = results[i];
    const icon = regimeIcon(r.composite);
    const bar = '█'.repeat(Math.max(1, Math.round(r.composite / 2)));
    const recLabel = isInOrNearRecession(r.date, 0);
    const recTag = recLabel ? ` ◄ ${recLabel}` : '';
    const l1 = r.layerScores[1]?.toFixed(0) ?? '--';
    const l2 = r.layerScores[2]?.toFixed(0) ?? '--';
    const l3 = r.layerScores[3]?.toFixed(0) ?? '--';
    const l4 = r.layerScores[4]?.toFixed(0) ?? '--';
    console.log(`  ${r.date}  ${icon} ${r.composite.toFixed(1).padStart(5)}  L1:${l1.padStart(3)} L2:${l2.padStart(3)} L3:${l3.padStart(3)} L4:${l4.padStart(3)}  ${bar}${recTag}`);
  }

  // Summary
  console.log('\n' + '═'.repeat(90));
  console.log('  SUMMARY');
  console.log('═'.repeat(90));
  const totalMonths = results.length;
  const bearishMonths = results.filter(r => r.composite < 48).length;
  console.log(`\n  Data range: ${results[0]?.date} → ${results[results.length - 1]?.date} (${totalMonths} months)`);
  console.log(`  Months below 48: ${bearishMonths} (${((bearishMonths / totalMonths) * 100).toFixed(1)}% of time)`);
  console.log(`  Sub-48 episodes: ${episodes.length}`);
  console.log(`  True positives: ${truePositives.length} (pre-recession warnings)`);
  console.log(`  False positives: ${falsePositives.length} (no recession followed)`);
  console.log(`  Precision: ${episodes.length > 0 ? ((truePositives.length / episodes.length) * 100).toFixed(0) : 'N/A'}%`);
  console.log(`  Recall: ${truePositives.length}/3 (${((truePositives.length / 3) * 100).toFixed(0)}%)`);
  console.log('');
  if (falsePositives.length === 0) {
    console.log('  ✅ PERFECT PRECISION: Every sub-48 episode was followed by a recession.');
  } else {
    console.log(`  ⚠️  ${falsePositives.length} false positive(s) identified. Review whether these`);
    console.log('     episodes correspond to significant slowdowns, market corrections, or');
    console.log('     near-recession events that merit investigation.');
  }
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });
