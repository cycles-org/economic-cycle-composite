/**
 * Two-phase optimizer:
 *   Phase 1 — Fetch data & run CycleScanner for all events, save scores to JSON
 *   Phase 2 — Hill-climbing optimization of per-series weights against saved scores
 */

const API_KEY = 'wttmaster5809';
const BASE_URL = 'https://api.cycle.tools';
const fs = await import('fs');

const SERIES = [
  { fredId: 'T10Y2Y',       tickerId: 'T10Y2Y:FDS',       layer: 1, invert: false },
  { fredId: 'T10Y3M',       tickerId: 'T10Y3M:FDS',       layer: 1, invert: false },
  { fredId: 'ICSA',         tickerId: 'ICSA-W:FDS',       layer: 1, invert: true },
  { fredId: 'CCSA',         tickerId: 'CCSA-W:FDS',       layer: 1, invert: true },
  { fredId: 'UMCSENT',      tickerId: 'UMCSENT-M:FDS',    layer: 1, invert: false },
  { fredId: 'USSLIND',      tickerId: 'USSLIND-M:FDS',    layer: 1, invert: false },
  { fredId: 'PERMIT',       tickerId: 'PERMIT-M:FDS',     layer: 1, invert: false },
  { fredId: 'DGORDER',      tickerId: 'DGORDER-M:FDS',    layer: 1, invert: false },
  { fredId: 'JTSJOL',       tickerId: 'JTSJOL-M:FDS',     layer: 1, invert: false },
  { fredId: 'INDPRO',       tickerId: 'INDPRO-M:FDS',     layer: 2, invert: false },
  { fredId: 'PAYEMS',       tickerId: 'PAYEMS-M:FDS',     layer: 2, invert: false },
  { fredId: 'DSPIC96',      tickerId: 'DSPIC96-M:FDS',    layer: 2, invert: false },
  { fredId: 'UNRATE',       tickerId: 'UNRATE-M:FDS',     layer: 2, invert: true },
  { fredId: 'VIXCLS',       tickerId: 'VIXCLS:FDS',       layer: 3, invert: true },
  { fredId: 'STLFSI4',      tickerId: 'STLFSI4-W:FDS',    layer: 3, invert: true },
  { fredId: 'BAA10Y',       tickerId: 'BAA10Y:FDS',       layer: 3, invert: true },
  { fredId: 'BAMLH0A0HYM2', tickerId: 'BAMLH0A0HYM2:FDS', layer: 3, invert: true },
  { fredId: 'DFF',          tickerId: 'DFF:FDS',          layer: 4, invert: true },
  { fredId: 'T5YIE',        tickerId: 'T5YIE:FDS',        layer: 4, invert: false },
  { fredId: 'CPIAUCSL',     tickerId: 'CPIAUCSL-M:FDS',   layer: 4, invert: true },
  { fredId: 'CPILFESL',     tickerId: 'CPILFESL-M:FDS',   layer: 4, invert: true },
  { fredId: 'M2SL',         tickerId: 'M2SL-M:FDS',       layer: 4, invert: false },
  { fredId: 'DTWEXBGS',     tickerId: 'DTWEXBGS:FDS',     layer: 4, invert: true },
];

const EVENTS = [
  { date: '2000-03-24', label: 'Dot-com Peak',        type: 'TOP' },
  { date: '2002-10-09', label: 'Post-Dot-com Bottom',  type: 'LOW' },
  { date: '2007-10-09', label: 'Pre-GFC Peak',         type: 'TOP' },
  { date: '2009-03-09', label: 'GFC Bottom',           type: 'LOW' },
  { date: '2020-02-19', label: 'Pre-COVID Peak',       type: 'TOP' },
  { date: '2020-03-23', label: 'COVID Bottom',         type: 'LOW' },
  { date: '2022-01-04', label: 'Post-COVID Peak',      type: 'TOP' },
  { date: '2022-10-13', label: '2022 Bear Bottom',     type: 'LOW' },
];

const SCORES_FILE = 'backtest_scores.json';

// ============================================================
// Phase 1: Compute & save per-series scores for each event
// ============================================================

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

async function runCycleScanner(closes) {
  const url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}&minCycleLength=5&maxCycleLength=400&sortByStrength=true&includeSpectrum=false&dominantPeakFinder=true&useStability=true`;
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
  const viable = peaks.filter(p => p.cycleLength >= 30 && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  const pool = viable.length > 0 ? viable : peaks.filter(p => p.cycleLength >= 30);
  if (pool.length === 0) return peaks[0] || null;
  const ranked = pool.filter(p => p.dominantRank > 0);
  if (ranked.length > 0) return ranked.sort((a, b) => a.dominantRank - b.dominantRank)[0];
  return pool.sort((a, b) => b.strength - a.strength)[0];
}

async function buildScores() {
  console.log('Phase 1: Building per-series scores for all events...\n');

  // Fetch all data
  const seriesData = {};
  await Promise.all(SERIES.map(async (s) => {
    try {
      const url = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${API_KEY}&tickerid=${encodeURIComponent(s.tickerId)}&maxbars=0`;
      seriesData[s.fredId] = await fetchJson(url);
      console.log(`  ${s.fredId}: ${seriesData[s.fredId].length} bars`);
    } catch {
      seriesData[s.fredId] = [];
      console.log(`  ${s.fredId}: FAILED`);
    }
  }));

  // For each event, compute adjusted scores
  const eventScores = [];

  for (const event of EVENTS) {
    console.log(`\n  Processing ${event.label}...`);
    const eventDate = new Date(event.date);
    const scores = {}; // fredId → adjustedScore (or null)

    await Promise.all(SERIES.map(async (s) => {
      const bars = seriesData[s.fredId] || [];
      const truncated = bars.filter(b => new Date(b.date) <= eventDate);
      const closes = truncated.map(b => b.close).filter(v => v != null);

      if (closes.length < 100) {
        scores[s.fredId] = null;
        return;
      }

      try {
        const scan = await runCycleScanner(closes);
        if (!scan.peaks?.length) { scores[s.fredId] = null; return; }
        const dom = extractDominant(scan.peaks);
        if (!dom) { scores[s.fredId] = null; return; }

        const rawPhase = dom.avgPhaseScore ?? 0;
        const phaseScore = Math.max(0, Math.min(100, (rawPhase + 100) / 2));
        scores[s.fredId] = Math.round((s.invert ? 100 - phaseScore : phaseScore) * 10) / 10;
      } catch {
        scores[s.fredId] = null;
      }
    }));

    eventScores.push({
      label: event.label,
      date: event.date,
      type: event.type,
      scores,
    });

    const validCount = Object.values(scores).filter(v => v !== null).length;
    console.log(`    ${validCount}/${SERIES.length} series with data`);
  }

  fs.writeFileSync(SCORES_FILE, JSON.stringify(eventScores, null, 2));
  console.log(`\nSaved to ${SCORES_FILE}`);
  return eventScores;
}

// ============================================================
// Phase 2: Constrained optimization of per-series weights
// ============================================================

const MIN_WEIGHT = 0.10;   // No series can be zeroed out
const MAX_WEIGHT = 1.5;    // Slightly more room for top series
const MIN_LAYER_ANCHOR = 0.3; // Each layer needs at least 1 series >= this

const LAYER_WEIGHTS = { 1: 0.45, 2: 0.15, 3: 0.25, 4: 0.15 };

function computeComposite(eventScores, weights) {
  // Must match the app's two-tier calculation:
  // 1. Per-series weighted average within each layer
  // 2. Layer scores combined with fixed LAYER_WEIGHTS
  const layerScores = {};

  for (const layer of [1, 2, 3, 4]) {
    const layerSeries = SERIES.filter(s => s.layer === layer);
    let wSum = 0;
    let wTotal = 0;

    for (const s of layerSeries) {
      const adjScore = eventScores[s.fredId];
      if (adjScore === null || adjScore === undefined) continue;
      const w = weights[s.fredId] ?? MIN_WEIGHT;
      wSum += adjScore * w;
      wTotal += w;
    }

    layerScores[layer] = wTotal > 0 ? wSum / wTotal : 50;
  }

  // Combine layers with fixed weights
  let composite = 0;
  for (const layer of [1, 2, 3, 4]) {
    composite += layerScores[layer] * LAYER_WEIGHTS[layer];
  }

  return Math.max(0, Math.min(100, composite));
}

function evaluateFitness(events, weights) {
  const topScores = [];
  const lowScores = [];

  for (const event of events) {
    const comp = computeComposite(event.scores, weights);
    if (event.type === 'TOP') topScores.push(comp);
    else lowScores.push(comp);
  }

  const avgTop = topScores.reduce((a, b) => a + b, 0) / topScores.length;
  const avgLow = lowScores.reduce((a, b) => a + b, 0) / lowScores.length;

  // Primary: separation between avg top and avg low
  const separation = avgTop - avgLow;

  // Secondary: penalize individual misclassifications
  const threshold = (avgTop + avgLow) / 2;
  let violations = 0;
  for (const t of topScores) if (t < threshold) violations++;
  for (const l of lowScores) if (l > threshold) violations++;

  // Bonus for each correctly classified event (encourages 8/8)
  let correctCount = 0;
  for (const t of topScores) if (t >= threshold) correctCount++;
  for (const l of lowScores) if (l < threshold) correctCount++;

  // Regularization: encourage spread of weights (not concentration)
  const allW = Object.values(weights);
  const meanW = allW.reduce((s, w) => s + w, 0) / allW.length;
  const variance = allW.reduce((s, w) => s + (w - meanW) ** 2, 0) / allW.length;

  // Layer coverage penalty: each layer must have at least 1 series >= MIN_LAYER_ANCHOR
  let layerPenalty = 0;
  for (const layer of [1, 2, 3, 4]) {
    const layerSeries = SERIES.filter(s => s.layer === layer);
    const maxInLayer = Math.max(...layerSeries.map(s => weights[s.fredId] ?? MIN_WEIGHT));
    if (maxInLayer < MIN_LAYER_ANCHOR) layerPenalty += 10;
  }

  // Diversity bonus: count series with weight >= 0.25
  const activeCount = allW.filter(w => w >= 0.25).length;
  const diversityBonus = Math.min(activeCount, 18) * 1.0; // strong reward for active series

  // Penalize floor-hugging: count how many are at min weight
  const floorCount = allW.filter(w => w < MIN_WEIGHT + 0.05).length;
  const floorPenalty = floorCount * 0.8;

  return separation * 10
    - violations * 12
    + correctCount * 5
    + diversityBonus
    - variance * 3      // penalize weight concentration
    - floorPenalty
    - layerPenalty;
}

function clampWeight(w) {
  return Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, w));
}

function optimize(events) {
  console.log('\nPhase 2: Constrained optimization of per-series weights...\n');
  console.log(`  Constraints: min=${MIN_WEIGHT}, max=${MAX_WEIGHT}, layer anchor=${MIN_LAYER_ANCHOR}`);

  const fredIds = SERIES.map(s => s.fredId);

  // Start with equal weights
  const weights = {};
  for (const id of fredIds) weights[id] = 0.5;

  let bestFitness = evaluateFitness(events, weights);
  let bestWeights = { ...weights };
  let temperature = 0.8;
  const coolingRate = 0.99998;
  const iterations = 500000;

  for (let i = 0; i < iterations; i++) {
    // Pick a random series and perturb its weight
    const idx = Math.floor(Math.random() * fredIds.length);
    const id = fredIds[idx];
    const oldW = weights[id];

    // Random perturbation scaled by temperature
    const delta = (Math.random() - 0.5) * 1.5 * temperature;
    weights[id] = clampWeight(oldW + delta);

    const fitness = evaluateFitness(events, weights);

    if (fitness > bestFitness) {
      bestFitness = fitness;
      bestWeights = { ...weights };
    } else {
      const acceptProb = Math.exp((fitness - bestFitness) / (temperature + 0.01));
      if (Math.random() > acceptProb) {
        weights[id] = oldW; // revert
      }
    }

    temperature *= coolingRate;

    if (i % 50000 === 0) {
      console.log(`  Iteration ${i}: fitness=${bestFitness.toFixed(2)}, temp=${temperature.toFixed(4)}`);
    }
  }

  // Run 3 independent restarts and keep the best
  console.log('\n  Running 4 additional restarts...');
  for (let restart = 0; restart < 4; restart++) {
    const w2 = {};
    for (const id of fredIds) w2[id] = MIN_WEIGHT + Math.random() * (MAX_WEIGHT - MIN_WEIGHT);

    let fit2 = evaluateFitness(events, w2);
    let best2 = { ...w2 };
    let bestFit2 = fit2;
    let temp2 = 0.6;

    for (let i = 0; i < 400000; i++) {
      const idx = Math.floor(Math.random() * fredIds.length);
      const id = fredIds[idx];
      const oldW = w2[id];
      w2[id] = clampWeight(oldW + (Math.random() - 0.5) * 1.2 * temp2);

      fit2 = evaluateFitness(events, w2);
      if (fit2 > bestFit2) {
        bestFit2 = fit2;
        best2 = { ...w2 };
      } else {
        const ap = Math.exp((fit2 - bestFit2) / (temp2 + 0.01));
        if (Math.random() > ap) w2[id] = oldW;
      }
      temp2 *= 0.99995;
    }

    console.log(`  Restart ${restart + 1}: fitness=${bestFit2.toFixed(2)}`);
    if (bestFit2 > bestFitness) {
      bestFitness = bestFit2;
      bestWeights = best2;
      console.log(`    → New best!`);
    }
  }

  return bestWeights;
}

function printResults(events, weights) {
  console.log('\n' + '='.repeat(80));
  console.log('OPTIMIZED WEIGHTS');
  console.log('='.repeat(80));

  // Sort by weight descending
  const sorted = Object.entries(weights).sort((a, b) => b[1] - a[1]);
  for (const [id, w] of sorted) {
    const s = SERIES.find(s => s.fredId === id);
    const bar = '█'.repeat(Math.round(w * 10));
    console.log(`  ${id.padEnd(14)} L${s.layer} ${s.invert ? 'inv' : '   '} w=${w.toFixed(3).padStart(6)}  ${bar}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('BACKTEST WITH OPTIMIZED WEIGHTS');
  console.log('='.repeat(80));
  console.log('Event'.padEnd(24) + 'Type'.padEnd(6) + 'Composite'.padStart(10) + '  Result');
  console.log('-'.repeat(60));

  let matches = 0;
  const topScores = [];
  const lowScores = [];

  for (const event of events) {
    const comp = computeComposite(event.scores, weights);
    if (event.type === 'TOP') topScores.push(comp);
    else lowScores.push(comp);
  }

  const avgTop = topScores.reduce((a, b) => a + b, 0) / topScores.length;
  const avgLow = lowScores.reduce((a, b) => a + b, 0) / lowScores.length;
  const threshold = (avgTop + avgLow) / 2;

  let topIdx = 0, lowIdx = 0;
  for (const event of events) {
    const comp = event.type === 'TOP' ? topScores[topIdx++] : lowScores[lowIdx++];
    const correct = (event.type === 'TOP' && comp >= threshold) || (event.type === 'LOW' && comp < threshold);
    if (correct) matches++;
    console.log(
      event.label.padEnd(24) +
      event.type.padEnd(6) +
      comp.toFixed(1).padStart(10) +
      `  ${correct ? '✓' : '✗'}  ${event.type === 'TOP' ? '(should be >' : '(should be <'} ${threshold.toFixed(1)})`
    );
  }

  console.log(`\nThreshold: ${threshold.toFixed(1)} (midpoint of avg TOP ${avgTop.toFixed(1)} and avg LOW ${avgLow.toFixed(1)})`);
  console.log(`Separation: ${(avgTop - avgLow).toFixed(1)} pts`);
  console.log(`Score: ${matches}/${events.length} (${((matches / events.length) * 100).toFixed(0)}%)`);

  // Export weights for use in the app
  console.log('\n// For seriesRegistry.ts:');
  console.log('export const SERIES_WEIGHTS: Record<string, number> = {');
  for (const [id, w] of sorted) {
    if (w >= 0.01) console.log(`  '${id}': ${w.toFixed(3)},`);
  }
  console.log('};');
}

// ============================================================
// Main
// ============================================================

async function main() {
  let events;

  // Check if scores already cached
  if (fs.existsSync(SCORES_FILE)) {
    console.log(`Loading cached scores from ${SCORES_FILE}...`);
    events = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf-8'));
  } else {
    events = await buildScores();
  }

  const optimizedWeights = optimize(events);
  printResults(events, optimizedWeights);
}

main().catch(e => console.error('Fatal:', e));
