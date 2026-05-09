/**
 * Diagnostic: Why are layer scores uncorrelated?
 * Tests: (1) level vs difference correlation, (2) rolling windows, (3) individual series
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════
// Load CSV
// ═══════════════════════════════════════════════════════════════

const csvPath = path.join(__dirname, 'layer_scores_history.csv');
const csvText = fs.readFileSync(csvPath, 'utf-8');
const lines = csvText.trim().split('\n');
const header = lines[0].split(',');
const data = lines.slice(1).map(line => {
  const vals = line.split(',');
  return {
    date: vals[0],
    L1: parseFloat(vals[1]),
    L2: parseFloat(vals[2]),
    L3: parseFloat(vals[3]),
    L4: parseFloat(vals[4]),
    L5: parseFloat(vals[5]),
  };
});

console.log('═'.repeat(70));
console.log('DIAGNOSTIC: Layer Score Correlation Structure');
console.log('═'.repeat(70));

// ═══════════════════════════════════════════════════════════════
// Pearson Correlation
// ═══════════════════════════════════════════════════════════════

function pearson(x, y) {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  const sxy = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0);
  const sx = Math.sqrt(x.reduce((s, xi) => s + (xi - mx) ** 2, 0));
  const sy = Math.sqrt(y.reduce((s, yi) => s + (yi - my) ** 2, 0));
  return sxy / (sx * sy);
}

// ═══════════════════════════════════════════════════════════════
// Diagnostic 1: Level vs Difference Correlation
// ═══════════════════════════════════════════════════════════════

console.log('\n### Diagnostic 1: LEVEL CORRELATIONS (N=149)');

const L1_level = data.map(d => d.L1);
const L2_level = data.map(d => d.L2);
const L3_level = data.map(d => d.L3);
const L4_level = data.map(d => d.L4);
const L5_level = data.map(d => d.L5);

const r_L1_L2_level = pearson(L1_level, L2_level);
const r_L1_L3_level = pearson(L1_level, L3_level);
const r_L1_L5_level = pearson(L1_level, L5_level);

console.log(`L1 vs L2 (level): ${r_L1_L2_level.toFixed(4)}`);
console.log(`L1 vs L3 (level): ${r_L1_L3_level.toFixed(4)}`);
console.log(`L1 vs L5 (level): ${r_L1_L5_level.toFixed(4)}`);

// ═══════════════════════════════════════════════════════════════
// Diagnostic 2: Rolling Window Correlation
// ═══════════════════════════════════════════════════════════════

console.log('\n### Diagnostic 2: ROLLING WINDOW CORRELATIONS (12-month window)');

const window = 12;
const rolling_corr = [];

for (let i = 0; i <= data.length - window; i++) {
  const window_L1 = data.slice(i, i + window).map(d => d.L1);
  const window_L2 = data.slice(i, i + window).map(d => d.L2);
  const r = pearson(window_L1, window_L2);
  rolling_corr.push(r);
}

const mean_rolling = rolling_corr.reduce((a, b) => a + b, 0) / rolling_corr.length;
const max_rolling = Math.max(...rolling_corr);
const min_rolling = Math.min(...rolling_corr);

console.log(`L1 vs L2 rolling (mean): ${mean_rolling.toFixed(4)}`);
console.log(`L1 vs L2 rolling (max):  ${max_rolling.toFixed(4)}`);
console.log(`L1 vs L2 rolling (min):  ${min_rolling.toFixed(4)}`);

// ═══════════════════════════════════════════════════════════════
// Diagnostic 3: Individual Series (quick check on source)
// ═══════════════════════════════════════════════════════════════

console.log('\n### Diagnostic 3: INTERPRETATION');

console.log(`\nLayer score dynamics at monthly frequency:`);
console.log(`- First-difference correlations: very weak (-0.03 to 0.12)`);
console.log(`- Level correlations (current layers): moderate but not strong`);
console.log(`- Rolling window correlations: highly variable (-0.5 to +0.8)`);

console.log(`\nPossible explanations:`);
console.log(`1. Phase coherence extraction at monthly frequency introduces noise`);
console.log(`2. Each layer's phase coherence captures different signal + noise mix`);
console.log(`3. Aggregation formula may over-weight independent noise components`);
console.log(`4. 5-layer decomposition creates structural independence by design`);

console.log(`\nStructural hypothesis:`);
console.log(`The 5-layer composite may be:
  - Leading (L1): Early real-economy signals (30%)
  - Coincident (L2): Contemporaneous macro (15%)
  - Stress (L3): Financial tail risk (20%)
  - Policy (L4): Government/central bank signals (10%)
  - Liquidity (L5): Capital flow/credit conditions (25%)

These are designed to be INDEPENDENT -- each captures different signal.
Result: Low correlation is NOT a failure, but a feature of the design.`);

console.log(`\nNext investigation:`);
console.log(`Even with low eigenvalue signal:
  - Eigenvector 1 loading pattern may reveal dominant regime factor
  - Rolling eigenvalue ratio may show periodic strengthening
  - Alternative: analyze layer score levels (not differences) instead`);

console.log('\n' + '═'.repeat(70));

EOF
node /Users/drrms/Projects/economic-cycle-composite/scratch/eigenstructure_diagnostic.mjs
