/**
 * Backtest: Economic Cycle Composite at major stock market tops/bottoms.
 *
 * For each historical event date:
 *   1. Fetch full data for each series
 *   2. Truncate to bars on or before event date
 *   3. Run CycleScanner on truncated data
 *   4. Extract dominant peak avgPhaseScore → map to 0-100
 *   5. Apply inversion, compute layer scores and master composite
 */

const API_KEY = 'wttmaster5809';
const BASE_URL = 'https://api.cycle.tools';

// --- Series Registry (same as app) ---
const SERIES = [
  { fredId: 'T10Y2Y',       tickerId: 'T10Y2Y:FDS',       layer: 1, invert: false, name: '10Y-2Y Spread' },
  { fredId: 'T10Y3M',       tickerId: 'T10Y3M:FDS',       layer: 1, invert: false, name: '10Y-3M Spread' },
  { fredId: 'ICSA',         tickerId: 'ICSA-W:FDS',       layer: 1, invert: true,  name: 'Initial Claims' },
  { fredId: 'CCSA',         tickerId: 'CCSA-W:FDS',       layer: 1, invert: true,  name: 'Continued Claims' },
  { fredId: 'UMCSENT',      tickerId: 'UMCSENT-M:FDS',    layer: 1, invert: false, name: 'Consumer Sentiment' },
  { fredId: 'USSLIND',      tickerId: 'USSLIND-M:FDS',    layer: 1, invert: false, name: 'Leading Index' },
  { fredId: 'PERMIT',       tickerId: 'PERMIT-M:FDS',     layer: 1, invert: false, name: 'Building Permits' },
  { fredId: 'DGORDER',      tickerId: 'DGORDER-M:FDS',    layer: 1, invert: false, name: 'Durable Goods Orders' },
  { fredId: 'JTSJOL',       tickerId: 'JTSJOL-M:FDS',     layer: 1, invert: false, name: 'JOLTS Openings' },
  { fredId: 'INDPRO',       tickerId: 'INDPRO-M:FDS',     layer: 2, invert: false, name: 'Industrial Production' },
  { fredId: 'PAYEMS',       tickerId: 'PAYEMS-M:FDS',     layer: 2, invert: false, name: 'Nonfarm Payrolls' },
  { fredId: 'DSPIC96',      tickerId: 'DSPIC96-M:FDS',    layer: 2, invert: false, name: 'Real Disp. Income' },
  { fredId: 'UNRATE',       tickerId: 'UNRATE-M:FDS',     layer: 2, invert: true,  name: 'Unemployment Rate' },
  { fredId: 'VIXCLS',       tickerId: 'VIXCLS:FDS',       layer: 3, invert: true,  name: 'VIX' },
  { fredId: 'STLFSI4',      tickerId: 'STLFSI4-W:FDS',    layer: 3, invert: true,  name: 'Fin. Stress Index' },
  { fredId: 'BAA10Y',       tickerId: 'BAA10Y:FDS',       layer: 3, invert: true,  name: 'Baa-10Y Spread' },
  { fredId: 'BAMLH0A0HYM2', tickerId: 'BAMLH0A0HYM2:FDS', layer: 3, invert: true,  name: 'HY OAS Spread' },
  { fredId: 'DFF',          tickerId: 'DFF:FDS',          layer: 4, invert: true,  name: 'Fed Funds Rate' },
  { fredId: 'T5YIE',        tickerId: 'T5YIE:FDS',        layer: 4, invert: false, name: '5Y Breakeven Infl.' },
  { fredId: 'CPIAUCSL',     tickerId: 'CPIAUCSL-M:FDS',   layer: 4, invert: true,  name: 'CPI Headline' },
  { fredId: 'CPILFESL',     tickerId: 'CPILFESL-M:FDS',   layer: 4, invert: true,  name: 'Core CPI' },
  { fredId: 'M2SL',         tickerId: 'M2SL-M:FDS',       layer: 4, invert: false, name: 'M2 Money Supply' },
  { fredId: 'DTWEXBGS',     tickerId: 'DTWEXBGS:FDS',     layer: 4, invert: true,  name: 'USD Trade-Weighted' },
];

const LAYER_WEIGHTS = { 1: 0.45, 2: 0.15, 3: 0.25, 4: 0.15 };

const EVENTS = [
  { date: '2000-03-24', label: 'Dot-com Peak',       type: 'TOP' },
  { date: '2002-10-09', label: 'Post-Dot-com Bottom', type: 'LOW' },
  { date: '2007-10-09', label: 'Pre-GFC Peak',        type: 'TOP' },
  { date: '2009-03-09', label: 'GFC Bottom',          type: 'LOW' },
  { date: '2020-02-19', label: 'Pre-COVID Peak',      type: 'TOP' },
  { date: '2020-03-23', label: 'COVID Bottom',        type: 'LOW' },
  { date: '2022-01-04', label: 'Post-COVID Peak',     type: 'TOP' },
  { date: '2022-10-13', label: '2022 Bear Bottom',    type: 'LOW' },
];

// --- API helpers ---

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

async function getSeriesData(tickerId) {
  const url = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${API_KEY}&tickerid=${encodeURIComponent(tickerId)}&maxbars=0`;
  return fetchJson(url);
}

async function runCycleScanner(closes) {
  const url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}&minCycleLength=5&maxCycleLength=400&sortByStrength=true&includeSpectrum=false&dominantPeakFinder=true&useStability=true`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(closes),
  });
  const text = await resp.text();
  if (text.includes('quota exceeded')) throw new Error('Quota exceeded');
  try { return JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`Parse error: ${text.substring(0, 100)}`);
  }
}

function extractDominant(peaks) {
  const viable = peaks.filter(p => p.cycleLength >= 30 && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  const pool = viable.length > 0 ? viable : peaks.filter(p => p.cycleLength >= 30);
  if (pool.length === 0) return peaks[0] || null;
  const ranked = pool.filter(p => p.dominantRank > 0);
  if (ranked.length > 0) return ranked.sort((a, b) => a.dominantRank - b.dominantRank)[0];
  return pool.sort((a, b) => b.strength - a.strength)[0];
}

// --- Main ---

async function main() {
  console.log('=== FRED Economic Cycle Composite — Historical Backtest ===\n');

  // Step 1: Fetch all series data (full history)
  console.log('Fetching full historical data for all series...');
  const seriesData = {};
  const fetchPromises = SERIES.map(async (s) => {
    try {
      const bars = await getSeriesData(s.tickerId);
      seriesData[s.fredId] = bars;
      console.log(`  ${s.fredId}: ${bars.length} bars (${bars.length > 0 ? bars[0].date?.substring(0, 10) : '?'} → ${bars.length > 0 ? bars[bars.length - 1].date?.substring(0, 10) : '?'})`);
    } catch (e) {
      console.log(`  ${s.fredId}: FAILED — ${e.message}`);
      seriesData[s.fredId] = [];
    }
  });
  await Promise.all(fetchPromises);

  console.log('\n--- Running backtest across 8 events ---\n');

  // Step 2: For each event, truncate & compute composite
  const results = [];

  for (const event of EVENTS) {
    const eventDate = new Date(event.date);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${event.label} (${event.date}) — ${event.type}`);
    console.log('='.repeat(60));

    const seriesResults = [];
    const scanPromises = SERIES.map(async (s) => {
      const bars = seriesData[s.fredId];
      if (!bars || bars.length === 0) return null;

      // Truncate to bars on or before event date
      const truncated = bars.filter(b => {
        const d = new Date(b.date);
        return d <= eventDate;
      });
      const closes = truncated.map(b => b.close).filter(v => v != null);

      if (closes.length < 100) {
        return { fredId: s.fredId, layer: s.layer, error: `Only ${closes.length} bars`, adjustedScore: null };
      }

      try {
        const scan = await runCycleScanner(closes);
        if (!scan.peaks || scan.peaks.length === 0) {
          return { fredId: s.fredId, layer: s.layer, error: 'No peaks', adjustedScore: null };
        }
        const dom = extractDominant(scan.peaks);
        if (!dom) return { fredId: s.fredId, layer: s.layer, error: 'No dominant', adjustedScore: null };

        const rawPhase = dom.avgPhaseScore ?? 0;
        const phaseScore = Math.max(0, Math.min(100, (rawPhase + 100) / 2));
        const adjusted = s.invert ? 100 - phaseScore : phaseScore;

        return {
          fredId: s.fredId,
          name: s.name,
          layer: s.layer,
          invert: s.invert,
          rawPhase,
          phaseScore: Math.round(phaseScore * 10) / 10,
          adjustedScore: Math.round(adjusted * 10) / 10,
          cycleLen: Math.round(dom.cycleLength),
          phase: dom.phaseStatus,
          bars: closes.length,
          error: null,
        };
      } catch (e) {
        return { fredId: s.fredId, layer: s.layer, error: e.message, adjustedScore: null };
      }
    });

    const rawResults = await Promise.all(scanPromises);
    for (const r of rawResults) {
      if (r) seriesResults.push(r);
    }

    // Compute layer scores (equal weight)
    const layerScores = {};
    for (const l of [1, 2, 3, 4]) {
      const valid = seriesResults.filter(r => r.layer === l && r.adjustedScore !== null);
      if (valid.length === 0) {
        layerScores[l] = 50;
      } else {
        layerScores[l] = valid.reduce((s, r) => s + r.adjustedScore, 0) / valid.length;
      }
    }

    // Master composite
    const composite = Math.max(0, Math.min(100,
      LAYER_WEIGHTS[1] * layerScores[1] +
      LAYER_WEIGHTS[2] * layerScores[2] +
      LAYER_WEIGHTS[3] * layerScores[3] +
      LAYER_WEIGHTS[4] * layerScores[4]
    ));

    // L1-L2 divergence
    const l1l2spread = Math.round((layerScores[1] - layerScores[2]) * 10) / 10;
    let divSignal = 'none';
    if (l1l2spread <= -25) divSignal = 'WARNING';
    else if (l1l2spread <= -15) divSignal = 'CAUTION';
    const downgrade = divSignal === 'WARNING';

    // Regime (tightened bands + divergence override)
    let regime;
    if (composite >= 62 && !downgrade) regime = 'Risk-On';
    else if (composite >= 55 && !downgrade) regime = 'Neutral-Bullish';
    else if (composite >= 62 && downgrade) regime = 'Neutral-Bullish*';
    else if (composite >= 55 && downgrade) regime = 'Neutral*';
    else if (composite >= 48) regime = 'Neutral';
    else if (composite >= 38) regime = 'Neutral-Bearish';
    else regime = 'Risk-Off';

    // Print per-series
    for (const r of seriesResults.sort((a, b) => a.layer - b.layer)) {
      if (r.error) {
        console.log(`  L${r.layer} ${r.fredId.padEnd(14)} — ${r.error}`);
      } else {
        console.log(`  L${r.layer} ${r.fredId.padEnd(14)} ${r.phase.padEnd(18)} raw:${String(r.rawPhase).padStart(5)} → adj:${String(r.adjustedScore).padStart(5)}  (${r.cycleLen} bars, ${r.bars} pts)`);
      }
    }

    console.log(`\n  Layer scores:  L1=${layerScores[1].toFixed(1)}  L2=${layerScores[2].toFixed(1)}  L3=${layerScores[3].toFixed(1)}  L4=${layerScores[4].toFixed(1)}`);
    console.log(`  L1-L2 spread: ${l1l2spread > 0 ? '+' : ''}${l1l2spread}  ${divSignal !== 'none' ? '⚠ ' + divSignal : ''}`);
    console.log(`  ► COMPOSITE: ${composite.toFixed(1)}  →  ${regime}  (event: ${event.type})`);

    // Match criteria: TOP should be >= 55 OR divergence warning; LOW should be < 48
    const matchTop = event.type === 'TOP' && (composite >= 55 || downgrade);
    const matchLow = event.type === 'LOW' && composite < 48;
    const match = matchTop || matchLow;
    const signal = match ? '✓ MATCH' : '✗ MISMATCH';
    console.log(`  ► ${signal}`);

    results.push({
      event: event.label,
      date: event.date,
      type: event.type,
      composite: Math.round(composite * 10) / 10,
      regime,
      l1: Math.round(layerScores[1] * 10) / 10,
      l2: Math.round(layerScores[2] * 10) / 10,
      l3: Math.round(layerScores[3] * 10) / 10,
      l4: Math.round(layerScores[4] * 10) / 10,
      spread: l1l2spread,
      div: divSignal,
      match,
    });
  }

  // Summary table
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('Event'.padEnd(24) + 'Date'.padEnd(13) + 'Type'.padEnd(6) + 'Comp'.padStart(6) + '  Regime'.padEnd(20) + '  L1'.padStart(6) + '  L2'.padStart(6) + '  L3'.padStart(6) + '  L4'.padStart(6) + '  Sprd'.padStart(6) + '  Div'.padEnd(10) + ' Match');
  console.log('-'.repeat(125));
  for (const r of results) {
    console.log(
      r.event.padEnd(24) +
      r.date.padEnd(13) +
      r.type.padEnd(6) +
      String(r.composite).padStart(6) +
      `  ${r.regime}`.padEnd(20) +
      String(r.l1).padStart(6) +
      String(r.l2).padStart(6) +
      String(r.l3).padStart(6) +
      String(r.l4).padStart(6) +
      String(r.spread).padStart(6) +
      `  ${r.div}`.padEnd(10) +
      ` ${r.match ? '✓' : '✗'}`
    );
  }

  const matches = results.filter(r => r.match).length;
  console.log(`\nScore: ${matches}/${results.length} events matched (${((matches / results.length) * 100).toFixed(0)}%)`);
}

main().catch(e => console.error('Fatal:', e));
