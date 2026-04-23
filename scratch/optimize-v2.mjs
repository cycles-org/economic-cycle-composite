/**
 * Optimizer V2: Joint optimization of layer weights (5 layers) + per-series weights
 *
 * Reads per-series scores from backtest_scores_v2.json (produced by backtest-v2.mjs)
 * Optimizes:
 *   - 5 layer weights (L1-L5) that sum to 1.0
 *   - Per-series weights within L1-L4 (relative importance within each layer)
 *   - For events with no L5 data, L5 weight is redistributed proportionally to L1-L4
 *
 * Fitness: maximize separation between TOP and LOW composites + correct classification
 */

const fs = await import('fs');

const SCORES_FILE = 'backtest_scores_v2.json';

const SERIES = [
  { fredId: 'T10Y2Y',       layer: 1, invert: false, name: '10Y-2Y Spread' },
  { fredId: 'T10Y3M',       layer: 1, invert: false, name: '10Y-3M Spread' },
  { fredId: 'ICSA',         layer: 1, invert: true,  name: 'Initial Claims' },
  { fredId: 'CCSA',         layer: 1, invert: true,  name: 'Continued Claims' },
  { fredId: 'UMCSENT',      layer: 1, invert: false, name: 'Consumer Sentiment' },
  { fredId: 'USSLIND',      layer: 1, invert: false, name: 'Leading Index' },
  { fredId: 'PERMIT',       layer: 1, invert: false, name: 'Building Permits' },
  { fredId: 'DGORDER',      layer: 1, invert: false, name: 'Durable Goods Orders' },
  { fredId: 'JTSJOL',       layer: 1, invert: false, name: 'JOLTS Openings' },
  { fredId: 'INDPRO',       layer: 2, invert: false, name: 'Industrial Production' },
  { fredId: 'PAYEMS',       layer: 2, invert: false, name: 'Nonfarm Payrolls' },
  { fredId: 'DSPIC96',      layer: 2, invert: false, name: 'Real Disp. Income' },
  { fredId: 'UNRATE',       layer: 2, invert: true,  name: 'Unemployment Rate' },
  { fredId: 'VIXCLS',       layer: 3, invert: true,  name: 'VIX' },
  { fredId: 'STLFSI4',      layer: 3, invert: true,  name: 'Fin. Stress Index' },
  { fredId: 'BAA10Y',       layer: 3, invert: true,  name: 'Baa-10Y Spread' },
  { fredId: 'BAMLH0A0HYM2', layer: 3, invert: true,  name: 'HY OAS Spread' },
  { fredId: 'DFF',          layer: 4, invert: true,  name: 'Fed Funds Rate' },
  { fredId: 'T5YIE',        layer: 4, invert: false, name: '5Y Breakeven Infl.' },
  { fredId: 'CPIAUCSL',     layer: 4, invert: true,  name: 'CPI Headline' },
  { fredId: 'CPILFESL',     layer: 4, invert: true,  name: 'Core CPI' },
  { fredId: 'M2SL',         layer: 4, invert: false, name: 'M2 Money Supply' },
  { fredId: 'DTWEXBGS',     layer: 4, invert: true,  name: 'USD Trade-Weighted' },
];

const FRED_IDS = SERIES.map(s => s.fredId);

// --- Constraints ---
const MIN_SERIES_WEIGHT = 0.10;
const MAX_SERIES_WEIGHT = 1.5;
const MIN_LAYER_WEIGHT = 0.08;  // No layer can be zeroed
const MAX_LAYER_WEIGHT = 0.40;  // No single layer dominates

// Target layer weights (prior / anchor point for regularization)
const PRIOR_LW = { 1: 0.30, 2: 0.15, 3: 0.20, 4: 0.10, 5: 0.25 };

// --- Composite calculation ---

function normalizeLayerWeights(rawWeights, hasL5) {
  // Normalize layer weights to sum to 1.0
  // If no L5 data, redistribute L5's weight proportionally to L1-L4
  const layers = hasL5 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];
  const sum = layers.reduce((s, l) => s + rawWeights[l], 0);
  const normalized = {};
  for (const l of layers) {
    normalized[l] = rawWeights[l] / sum;
  }
  return normalized;
}

function computeComposite(eventScores, l5Score, seriesWeights, layerWeightsRaw) {
  const hasL5 = l5Score !== null && !isNaN(l5Score);
  const layerWeights = normalizeLayerWeights(layerWeightsRaw, hasL5);

  const layerScores = {};

  for (const layer of [1, 2, 3, 4]) {
    const layerSeries = SERIES.filter(s => s.layer === layer);
    let wSum = 0, wTotal = 0;
    for (const s of layerSeries) {
      const adj = eventScores[s.fredId];
      if (adj === null || adj === undefined) continue;
      const w = seriesWeights[s.fredId] ?? MIN_SERIES_WEIGHT;
      wSum += adj * w;
      wTotal += w;
    }
    layerScores[layer] = wTotal > 0 ? wSum / wTotal : 50;
  }

  let composite = 0;
  for (const l of [1, 2, 3, 4]) {
    composite += layerScores[l] * layerWeights[l];
  }
  if (hasL5) {
    composite += l5Score * layerWeights[5];
  }

  return Math.max(0, Math.min(100, composite));
}

// --- Fitness function ---

function evaluateFitness(events, seriesWeights, layerWeights) {
  const topScores = [];
  const lowScores = [];

  for (const event of events) {
    const comp = computeComposite(event.scores, event.l5Score, seriesWeights, layerWeights);
    if (event.type === 'TOP') topScores.push(comp);
    else lowScores.push(comp);
  }

  const avgTop = topScores.reduce((a, b) => a + b, 0) / topScores.length;
  const avgLow = lowScores.reduce((a, b) => a + b, 0) / lowScores.length;
  const separation = avgTop - avgLow;

  // Classification: TOP should be >= 55, LOW should be < 48
  let correctCount = 0;
  let violations = 0;
  for (const t of topScores) {
    if (t >= 55) correctCount++;
    else violations++;
  }
  for (const l of lowScores) {
    if (l < 48) correctCount++;
    else violations++;
  }

  // Margin bonus: reward distance from thresholds in the right direction
  let marginSum = 0;
  for (const t of topScores) marginSum += Math.max(0, t - 55);
  for (const l of lowScores) marginSum += Math.max(0, 48 - l);

  // Regularization: penalize extreme weight variance in series
  const allSW = Object.values(seriesWeights);
  const meanSW = allSW.reduce((s, w) => s + w, 0) / allSW.length;
  const varianceSW = allSW.reduce((s, w) => s + (w - meanSW) ** 2, 0) / allSW.length;

  // Diversity: count active series (weight >= 0.25)
  const activeCount = allSW.filter(w => w >= 0.25).length;
  const diversityBonus = Math.min(activeCount, 18) * 0.8;

  // Layer weight regularization: penalize deviation from prior architecture
  // This prevents the optimizer from collapsing layers to near-zero
  const lwSum = [1, 2, 3, 4, 5].reduce((s, l) => s + layerWeights[l], 0);
  let lwDeviationPenalty = 0;
  for (const l of [1, 2, 3, 4, 5]) {
    const normalized = layerWeights[l] / lwSum;
    const deviation = Math.abs(normalized - PRIOR_LW[l]);
    lwDeviationPenalty += deviation * deviation; // squared penalty for large deviations
  }

  return separation * 10
    + correctCount * 8
    - violations * 15
    + marginSum * 0.5
    + diversityBonus
    - varianceSW * 2
    - lwDeviationPenalty * 500;  // very strong anchor to prior architecture
}

// --- Simulated annealing ---

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function optimize(events) {
  console.log('\nJoint optimization: 5 layer weights + 23 per-series weights\n');

  // Initialize
  const seriesWeights = {};
  for (const id of FRED_IDS) seriesWeights[id] = 0.5;

  const layerWeights = { 1: 0.30, 2: 0.15, 3: 0.20, 4: 0.10, 5: 0.25 };

  let bestFitness = evaluateFitness(events, seriesWeights, layerWeights);
  let bestSW = { ...seriesWeights };
  let bestLW = { ...layerWeights };

  const totalIter = 800000;
  let temperature = 0.8;
  const coolingRate = 0.999993;

  for (let i = 0; i < totalIter; i++) {
    // 70% chance: perturb a series weight; 30% chance: perturb a layer weight
    if (Math.random() < 0.7) {
      // Series weight perturbation
      const idx = Math.floor(Math.random() * FRED_IDS.length);
      const id = FRED_IDS[idx];
      const oldW = seriesWeights[id];
      seriesWeights[id] = clamp(oldW + (Math.random() - 0.5) * 1.5 * temperature, MIN_SERIES_WEIGHT, MAX_SERIES_WEIGHT);

      const fitness = evaluateFitness(events, seriesWeights, layerWeights);
      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestSW = { ...seriesWeights };
        bestLW = { ...layerWeights };
      } else {
        const ap = Math.exp((fitness - bestFitness) / (temperature + 0.01));
        if (Math.random() > ap) seriesWeights[id] = oldW;
      }
    } else {
      // Layer weight perturbation
      const layer = [1, 2, 3, 4, 5][Math.floor(Math.random() * 5)];
      const oldW = layerWeights[layer];
      layerWeights[layer] = clamp(oldW + (Math.random() - 0.5) * 0.3 * temperature, MIN_LAYER_WEIGHT, MAX_LAYER_WEIGHT);

      const fitness = evaluateFitness(events, seriesWeights, layerWeights);
      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestSW = { ...seriesWeights };
        bestLW = { ...layerWeights };
      } else {
        const ap = Math.exp((fitness - bestFitness) / (temperature + 0.01));
        if (Math.random() > ap) layerWeights[layer] = oldW;
      }
    }

    temperature *= coolingRate;

    if (i % 100000 === 0) {
      console.log(`  Iteration ${i}: fitness=${bestFitness.toFixed(2)}, temp=${temperature.toFixed(4)}`);
    }
  }

  // 4 additional restarts
  console.log('\n  Running 4 additional restarts...');
  for (let restart = 0; restart < 4; restart++) {
    const sw2 = {};
    for (const id of FRED_IDS) sw2[id] = MIN_SERIES_WEIGHT + Math.random() * (MAX_SERIES_WEIGHT - MIN_SERIES_WEIGHT);
    const lw2 = {
      1: 0.10 + Math.random() * 0.35,
      2: 0.05 + Math.random() * 0.25,
      3: 0.05 + Math.random() * 0.30,
      4: 0.05 + Math.random() * 0.20,
      5: 0.05 + Math.random() * 0.35,
    };

    let bestFit2 = evaluateFitness(events, sw2, lw2);
    let bestSW2 = { ...sw2 };
    let bestLW2 = { ...lw2 };
    let temp2 = 0.6;

    for (let i = 0; i < 600000; i++) {
      if (Math.random() < 0.7) {
        const idx = Math.floor(Math.random() * FRED_IDS.length);
        const id = FRED_IDS[idx];
        const oldW = sw2[id];
        sw2[id] = clamp(oldW + (Math.random() - 0.5) * 1.2 * temp2, MIN_SERIES_WEIGHT, MAX_SERIES_WEIGHT);

        const fit = evaluateFitness(events, sw2, lw2);
        if (fit > bestFit2) { bestFit2 = fit; bestSW2 = { ...sw2 }; bestLW2 = { ...lw2 }; }
        else { const ap = Math.exp((fit - bestFit2) / (temp2 + 0.01)); if (Math.random() > ap) sw2[id] = oldW; }
      } else {
        const layer = [1, 2, 3, 4, 5][Math.floor(Math.random() * 5)];
        const oldW = lw2[layer];
        lw2[layer] = clamp(oldW + (Math.random() - 0.5) * 0.25 * temp2, MIN_LAYER_WEIGHT, MAX_LAYER_WEIGHT);

        const fit = evaluateFitness(events, sw2, lw2);
        if (fit > bestFit2) { bestFit2 = fit; bestSW2 = { ...sw2 }; bestLW2 = { ...lw2 }; }
        else { const ap = Math.exp((fit - bestFit2) / (temp2 + 0.01)); if (Math.random() > ap) lw2[layer] = oldW; }
      }
      temp2 *= 0.999995;
    }

    console.log(`  Restart ${restart + 1}: fitness=${bestFit2.toFixed(2)}`);
    if (bestFit2 > bestFitness) {
      bestFitness = bestFit2;
      bestSW = bestSW2;
      bestLW = bestLW2;
      console.log(`    → New best!`);
    }
  }

  return { seriesWeights: bestSW, layerWeights: bestLW, fitness: bestFitness };
}

// --- Print results ---

function printResults(events, seriesWeights, layerWeights) {
  // Normalize layer weights for display
  const lwSum = [1, 2, 3, 4, 5].reduce((s, l) => s + layerWeights[l], 0);
  const normLW = {};
  for (const l of [1, 2, 3, 4, 5]) normLW[l] = layerWeights[l] / lwSum;

  console.log('\n' + '='.repeat(80));
  console.log('OPTIMIZED LAYER WEIGHTS (normalized to 100%)');
  console.log('='.repeat(80));
  const layerNames = { 1: 'Leading', 2: 'Coincident', 3: 'Risk/Stress', 4: 'Monetary', 5: 'Liquidity' };
  for (const l of [1, 2, 3, 4, 5]) {
    const pct = (normLW[l] * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(normLW[l] * 50));
    console.log(`  L${l} ${layerNames[l].padEnd(14)} ${pct.padStart(5)}%  ${bar}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('OPTIMIZED PER-SERIES WEIGHTS');
  console.log('='.repeat(80));
  const sorted = Object.entries(seriesWeights).sort((a, b) => b[1] - a[1]);
  for (const [id, w] of sorted) {
    const s = SERIES.find(s => s.fredId === id);
    const bar = '█'.repeat(Math.round(w * 10));
    console.log(`  ${id.padEnd(14)} L${s.layer} ${s.invert ? 'inv' : '   '} w=${w.toFixed(3).padStart(6)}  ${bar}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('BACKTEST WITH OPTIMIZED WEIGHTS');
  console.log('='.repeat(80));
  console.log('Event'.padEnd(24) + 'Type'.padEnd(6) + 'Comp'.padStart(8) + '  L1'.padStart(6) + '  L2'.padStart(6) + '  L3'.padStart(6) + '  L4'.padStart(6) + '  L5'.padStart(6) + '  Result');
  console.log('-'.repeat(90));

  let matches = 0;

  for (const event of events) {
    const hasL5 = event.l5Score !== null && !isNaN(event.l5Score);
    const lw = normalizeLayerWeights(layerWeights, hasL5);

    // Compute layer scores for display
    const layerScores = {};
    for (const layer of [1, 2, 3, 4]) {
      const layerSeries = SERIES.filter(s => s.layer === layer);
      let wSum = 0, wTotal = 0;
      for (const s of layerSeries) {
        const adj = event.scores[s.fredId];
        if (adj === null || adj === undefined) continue;
        const w = seriesWeights[s.fredId] ?? MIN_SERIES_WEIGHT;
        wSum += adj * w;
        wTotal += w;
      }
      layerScores[layer] = wTotal > 0 ? wSum / wTotal : 50;
    }
    layerScores[5] = hasL5 ? event.l5Score : 50;

    const comp = computeComposite(event.scores, event.l5Score, seriesWeights, layerWeights);
    const correct = (event.type === 'TOP' && comp >= 55) || (event.type === 'LOW' && comp < 48);
    if (correct) matches++;

    console.log(
      event.label.padEnd(24) +
      event.type.padEnd(6) +
      comp.toFixed(1).padStart(8) +
      layerScores[1].toFixed(1).padStart(6) +
      layerScores[2].toFixed(1).padStart(6) +
      layerScores[3].toFixed(1).padStart(6) +
      layerScores[4].toFixed(1).padStart(6) +
      (hasL5 ? layerScores[5].toFixed(1) : 'N/A').padStart(6) +
      `  ${correct ? '✓' : '✗'}  ${event.type === 'TOP' ? '(≥55)' : '(<48)'}`
    );
  }

  console.log(`\nScore: ${matches}/${events.length} (${((matches / events.length) * 100).toFixed(0)}%)`);

  // Export for seriesRegistry.ts
  console.log('\n// For seriesRegistry.ts — layer weights:');
  console.log('export const LAYER_WEIGHTS: Record<number, number> = {');
  for (const l of [1, 2, 3, 4, 5]) {
    console.log(`  ${l}: ${normLW[l].toFixed(4)},  // ${layerNames[l]}`);
  }
  console.log('};');

  console.log('\n// For seriesRegistry.ts — per-series weights:');
  console.log('export const SERIES_WEIGHTS: Record<string, number> = {');
  for (const [id, w] of sorted) {
    if (w >= 0.01) console.log(`  '${id}': ${w.toFixed(3)},`);
  }
  console.log('};');
}

// --- Main ---

async function main() {
  if (!fs.existsSync(SCORES_FILE)) {
    console.error(`Error: ${SCORES_FILE} not found. Run backtest-v2.mjs first.`);
    process.exit(1);
  }

  console.log(`Loading scores from ${SCORES_FILE}...`);
  const events = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf-8'));
  console.log(`Loaded ${events.length} events`);

  // Show data availability
  for (const e of events) {
    const validSeries = Object.values(e.scores).filter(v => v !== null).length;
    const l5Label = e.l5Score !== null ? e.l5Score.toFixed(1) : 'N/A';
    console.log(`  ${e.label.padEnd(24)} ${validSeries} series, L5=${l5Label}`);
  }

  const result = optimize(events);
  printResults(events, result.seriesWeights, result.layerWeights);
}

main().catch(e => console.error('Fatal:', e));
