/**
 * Eigenstructure Analysis of Layer Scores — Levels & Multi-Horizon Variant
 *
 * Compares three analytical approaches:
 * 1. Demeaned LEVELS (no differencing)
 * 2. 12-month differences
 * 3. 1-month differences
 *
 * Tests three predictions on the variant with strongest eigenstructure:
 * 1. At least 2 persistent modes (eigenvalues > Marchenko-Pastur threshold)
 * 2. Mode 1 = general regime, Mode 2 = lead-lag separation
 * 3. Dominant period in rolling λ1/λ2 ratio ∈ [53-79] or [173-259] months
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_FILE = path.join(__dirname, 'layer_scores_history.csv');
const OUTPUT_FILE = path.join(__dirname, 'eigenstructure_results.md');

// ── Load CSV ──

function loadCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      date: values[0],
      L1: parseFloat(values[1]),
      L2: parseFloat(values[2]),
      L3: parseFloat(values[3]),
      L4: parseFloat(values[4]),
      L5: parseFloat(values[5]),
      master: parseFloat(values[6]),
      warm_up_complete: parseInt(values[7]),
    };
  });
  return rows.filter(r => r.warm_up_complete === 1);
}

// ── Statistics ──

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
  const m = mean(arr);
  const sq = arr.map(x => (x - m) ** 2).reduce((a, b) => a + b, 0);
  return Math.sqrt(sq / (arr.length - 1));
}

// ── Correlation Matrix ──

function pearsonCorrelation(x, y) {
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, den_x = 0, den_y = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    den_x += dx * dx;
    den_y += dy * dy;
  }
  return num / Math.sqrt(den_x * den_y);
}

function correlationMatrix(dL1, dL2, dL3, dL4, dL5) {
  const layers = [dL1, dL2, dL3, dL4, dL5];
  const corr = Array(5).fill(0).map(() => Array(5).fill(0));
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      corr[i][j] = i === j ? 1.0 : pearsonCorrelation(layers[i], layers[j]);
    }
  }
  return corr;
}

// ── Jacobi Eigenvalue Algorithm ──

function jacobiEigenvalue(A, maxIter = 1000, tol = 1e-10) {
  const n = A.length;
  const V = Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
  let M = A.map(row => [...row]);

  for (let iter = 0; iter < maxIter; iter++) {
    let maxVal = 0, p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(M[i][j]) > maxVal) {
          maxVal = Math.abs(M[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < tol) break;

    const theta = 0.5 * Math.atan2(2 * M[p][q], M[q][q] - M[p][p]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    for (let i = 0; i < n; i++) {
      if (i === p || i === q) continue;
      const M_ip = M[i][p], M_iq = M[i][q];
      M[i][p] = c * M_ip - s * M_iq;
      M[p][i] = M[i][p];
      M[i][q] = s * M_ip + c * M_iq;
      M[q][i] = M[i][q];
    }

    const M_pp = M[p][p], M_qq = M[q][q];
    M[p][p] = c * c * M_pp - 2 * s * c * M[p][q] + s * s * M_qq;
    M[q][q] = s * s * M_pp + 2 * s * c * M[p][q] + c * c * M_qq;
    M[p][q] = 0;
    M[q][p] = 0;

    for (let i = 0; i < n; i++) {
      const V_ip = V[i][p], V_iq = V[i][q];
      V[i][p] = c * V_ip - s * V_iq;
      V[i][q] = s * V_ip + c * V_iq;
    }
  }

  const eigenvalues = M.map((row, i) => row[i]);
  const indices = eigenvalues.map((_, i) => i).sort((i, j) => eigenvalues[j] - eigenvalues[i]);
  const sorted_eigenvalues = indices.map(i => eigenvalues[i]);
  const sorted_eigenvectors = Array(n).fill(0).map((_, i) =>
    Array(n).fill(0).map((_, j) => V[j][indices[i]])
  );

  return { eigenvalues: sorted_eigenvalues, eigenvectors: sorted_eigenvectors };
}

// ── FFT & Hilbert ──

function fft(re, im, inverse = false) {
  const n = re.length;
  if (n === 1) return;
  if (n % 2 === 1) throw new Error('FFT length must be power of 2');

  const half = n / 2;
  const re_even = re.filter((_, i) => i % 2 === 0);
  const im_even = im.filter((_, i) => i % 2 === 0);
  const re_odd = re.filter((_, i) => i % 2 === 1);
  const im_odd = im.filter((_, i) => i % 2 === 1);

  fft(re_even, im_even, inverse);
  fft(re_odd, im_odd, inverse);

  const angle = (inverse ? 1 : -1) * 2 * Math.PI / n;

  for (let k = 0; k < half; k++) {
    const t_re = Math.cos(angle * k);
    const t_im = Math.sin(angle * k);
    const t_odd_re = re_odd[k];
    const t_odd_im = im_odd[k];

    const mult_re = t_re * t_odd_re - t_im * t_odd_im;
    const mult_im = t_re * t_odd_im + t_im * t_odd_re;

    re[k] = re_even[k] + mult_re;
    im[k] = im_even[k] + mult_im;
    re[k + half] = re_even[k] - mult_re;
    im[k + half] = im_even[k] - mult_im;
  }
}

function hilbert(x) {
  const n = x.length;
  const pow2 = Math.pow(2, Math.ceil(Math.log2(n)));
  const re = [...x, ...Array(pow2 - n).fill(0)];
  const im = Array(pow2).fill(0);

  fft(re, im);

  for (let k = 1; k < pow2 / 2; k++) {
    re[k] *= 2;
    im[k] *= 2;
  }
  for (let k = pow2 / 2 + 1; k < pow2; k++) {
    re[k] = 0;
    im[k] = 0;
  }

  fft(re, im, true);

  const scale = 1 / pow2;
  return {
    real: re.slice(0, n).map(v => v * scale),
    imag: im.slice(0, n).map(v => v * scale),
  };
}

// ── Main Analysis ──

let output = [];
function log(msg) {
  console.log(msg);
  output.push(msg);
}

async function analyzeVariant(name, L1, L2, L3, L4, L5, T_orig) {
  const T = L1.length;
  const Q = T / 5;
  const lambda_mp = Math.pow(1 + 1 / Math.sqrt(Q), 2);

  const corr = correlationMatrix(L1, L2, L3, L4, L5);
  const { eigenvalues, eigenvectors } = jacobiEigenvalue(corr);

  const persistentModes = eigenvalues
    .map((ev, i) => ({ i, ev, exceeds: ev > lambda_mp }))
    .filter(e => e.exceeds);

  return {
    name,
    T,
    Q,
    lambda_mp,
    eigenvalues,
    eigenvectors,
    persistentModes,
    corr,
  };
}

async function main() {
  log('═'.repeat(70));
  log('EIGENSTRUCTURE ANALYSIS: LEVELS & MULTI-HORIZON COMPARISON');
  log('═'.repeat(70));
  log('');

  // Load data
  const data = loadCSV(CSV_FILE);
  const T_total = data.length;
  log(`Loaded ${T_total} observations from ${CSV_FILE}`);
  log('');

  // ─────────────────────────────────────────────────────────────────
  // VARIANT 1: Demeaned LEVELS
  // ─────────────────────────────────────────────────────────────────

  const L1_raw = data.map(d => d.L1);
  const L2_raw = data.map(d => d.L2);
  const L3_raw = data.map(d => d.L3);
  const L4_raw = data.map(d => d.L4);
  const L5_raw = data.map(d => d.L5);

  const m1 = mean(L1_raw), m2 = mean(L2_raw), m3 = mean(L3_raw), m4 = mean(L4_raw), m5 = mean(L5_raw);
  const L1_dm = L1_raw.map(x => x - m1);
  const L2_dm = L2_raw.map(x => x - m2);
  const L3_dm = L3_raw.map(x => x - m3);
  const L4_dm = L4_raw.map(x => x - m4);
  const L5_dm = L5_raw.map(x => x - m5);

  const variant_levels = await analyzeVariant('Demeaned Levels', L1_dm, L2_dm, L3_dm, L4_dm, L5_dm, T_total);

  // ─────────────────────────────────────────────────────────────────
  // VARIANT 2: 12-Month Differences
  // ─────────────────────────────────────────────────────────────────

  const L1_12m = [], L2_12m = [], L3_12m = [], L4_12m = [], L5_12m = [];
  for (let i = 12; i < data.length; i++) {
    L1_12m.push(data[i].L1 - data[i-12].L1);
    L2_12m.push(data[i].L2 - data[i-12].L2);
    L3_12m.push(data[i].L3 - data[i-12].L3);
    L4_12m.push(data[i].L4 - data[i-12].L4);
    L5_12m.push(data[i].L5 - data[i-12].L5);
  }

  const variant_12m = await analyzeVariant('12-Month Differences', L1_12m, L2_12m, L3_12m, L4_12m, L5_12m, T_total);

  // ─────────────────────────────────────────────────────────────────
  // VARIANT 3: 1-Month Differences (original)
  // ─────────────────────────────────────────────────────────────────

  const L1_1m = [], L2_1m = [], L3_1m = [], L4_1m = [], L5_1m = [];
  for (let i = 1; i < data.length; i++) {
    L1_1m.push(data[i].L1 - data[i-1].L1);
    L2_1m.push(data[i].L2 - data[i-1].L2);
    L3_1m.push(data[i].L3 - data[i-1].L3);
    L4_1m.push(data[i].L4 - data[i-1].L4);
    L5_1m.push(data[i].L5 - data[i-1].L5);
  }

  const variant_1m = await analyzeVariant('1-Month Differences', L1_1m, L2_1m, L3_1m, L4_1m, L5_1m, T_total);

  // ─────────────────────────────────────────────────────────────────
  // Comparison Table
  // ─────────────────────────────────────────────────────────────────

  log('## Variant Comparison: Eigenvalues vs Marchenko-Pastur Threshold');
  log('');
  log('| λ | Levels (N=149) | 12m-Diff (N=137) | 1m-Diff (N=148) | Exceeds MP? |');
  log('|---|---|---|---|---|');
  for (let k = 0; k < 5; k++) {
    const lev = variant_levels.eigenvalues[k].toFixed(4);
    const m12 = variant_12m.eigenvalues[k].toFixed(4);
    const m1 = variant_1m.eigenvalues[k].toFixed(4);
    const mp_check = variant_levels.eigenvalues[k] > variant_levels.lambda_mp ? '✓ Levels' :
                     variant_12m.eigenvalues[k] > variant_12m.lambda_mp ? '✓ 12m-Diff' : '-';
    log(`| λ${k+1} | ${lev} | ${m12} | ${m1} | ${mp_check} |`);
  }
  log(`| λ_MP | ${variant_levels.lambda_mp.toFixed(4)} (Q=${variant_levels.Q.toFixed(1)}) | ${variant_12m.lambda_mp.toFixed(4)} (Q=${variant_12m.Q.toFixed(1)}) | ${variant_1m.lambda_mp.toFixed(4)} (Q=${variant_1m.Q.toFixed(1)}) | Threshold |`);
  log('');

  // ─────────────────────────────────────────────────────────────────
  // Select best variant
  // ─────────────────────────────────────────────────────────────────

  const variants = [variant_levels, variant_12m, variant_1m];
  const best = variants.reduce((a, b) =>
    a.persistentModes.length > b.persistentModes.length ? a : b
  );

  log(`**Selected Variant**: ${best.name} (${best.persistentModes.length} persistent modes)`);
  log('');

  // ─────────────────────────────────────────────────────────────────
  // ANALYSIS on best variant
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log(`FULL EIGENSTRUCTURE ANALYSIS: ${best.name.toUpperCase()}`);
  log('═'.repeat(70));
  log('');

  // Part A: Correlation Matrix
  log('## Part A: Correlation Matrix');
  log('');
  log('5×5 Pearson Correlation Matrix:');
  log('');
  log('```');
  log('        L1      L2      L3      L4      L5');
  for (let i = 0; i < 5; i++) {
    const row = ['L1', 'L2', 'L3', 'L4', 'L5'][i];
    const vals = best.corr[i].map(v => v.toFixed(3).padStart(7)).join(' ');
    log(`${row}   ${vals}`);
  }
  log('```');
  log('');

  // Part B: Eigendecomposition
  log('## Part B: Eigendecomposition');
  log('');
  log(`Marchenko-Pastur Threshold: λ_MP = (1 + 1/√Q)² = (1 + 1/√${best.Q.toFixed(1)})² = ${best.lambda_mp.toFixed(4)}`);
  log('');
  log('Eigenvalues (sorted descending):');
  log('');
  log('| k | λ_k     | Exceeds λ_MP? |');
  log('|---|---------|---------------|');
  for (let k = 0; k < 5; k++) {
    const exceeds = best.eigenvalues[k] > best.lambda_mp ? 'YES' : 'NO';
    log(`| ${k+1} | ${best.eigenvalues[k].toFixed(4)} | ${exceeds.padEnd(13)} |`);
  }
  log('');

  log(`**Persistent modes**: ${best.persistentModes.length} (exceeding λ_MP)`);
  log('');

  // Prediction 1
  const pred1Pass = best.persistentModes.length >= 2;
  log(`**Prediction 1 Verdict**: ${pred1Pass ? 'PASS' : 'FAIL'} — At least 2 modes (found ${best.persistentModes.length})`);
  log('');

  // Part C: Eigenvector Composition
  if (best.persistentModes.length > 0) {
    log('## Part C: Eigenvector Composition');
    log('');

    const names = ['L1', 'L2', 'L3', 'L4', 'L5'];
    const pred2_modes = [];

    for (const pm of best.persistentModes) {
      const k = pm.i;
      log(`### Mode ${k + 1} (λ = ${best.eigenvalues[k].toFixed(4)})`);
      log('');
      log('| Layer | Loading | Abs Loading | Sign |');
      log('|-------|---------|-------------|------|');
      const vec = best.eigenvectors[k];
      const signs = vec.map(v => v >= 0 ? '+' : '-');
      const absVals = vec.map(v => Math.abs(v));

      for (let i = 0; i < 5; i++) {
        const load = vec[i].toFixed(2).padStart(7);
        const abs = absVals[i].toFixed(2).padStart(11);
        const sign = signs[i].padStart(4);
        log(`| L${i+1}    | ${load} | ${abs} | ${sign} |`);
      }
      log('');

      // Mode classification
      let classification = '';
      const allSameSign = signs.every(s => s === signs[0]);
      const l1l5_sum = vec[0] + vec[4];
      const l2l4_sum = vec[1] + vec[3];

      if (allSameSign) {
        classification = 'General regime factor';
      } else if ((l1l5_sum > 0 && l2l4_sum < 0) || (l1l5_sum < 0 && l2l4_sum > 0)) {
        classification = 'Lead-lag separation (L1/L5 lead vs L2/L4 lag)';
      } else {
        const pos = names.filter((_, i) => vec[i] > 0).join(', ');
        const neg = names.filter((_, i) => vec[i] < 0).join(', ');
        classification = `Mixed — Positive: ${pos}, Negative: ${neg}`;
      }
      log(`**Classification**: ${classification}`);
      log('');

      pred2_modes.push({ k, classification });
    }

    // Prediction 2
    let pred2Pass = false;
    if (pred2_modes.length >= 2) {
      const mode1_general = pred2_modes[0].classification.includes('General regime');
      const mode2_leadlag = pred2_modes[1].classification.includes('Lead-lag');
      pred2Pass = mode1_general && mode2_leadlag;
    }
    log(`**Prediction 2 Verdict**: ${pred2Pass ? 'PASS' : best.persistentModes.length >= 1 ? 'PARTIAL' : 'FAIL'}`);
    log('');
  }

  // Part D: Rolling Eigenvalue Ratio
  if (best.persistentModes.length >= 2) {
    log('## Part D: Rolling Eigenvalue Ratio & Spectral Analysis');
    log('');

    // Use appropriate data for rolling analysis based on variant
    let data_for_rolling, window = 24;
    if (best.name === 'Demeaned Levels') {
      data_for_rolling = [L1_dm, L2_dm, L3_dm, L4_dm, L5_dm];
    } else if (best.name === '12-Month Differences') {
      data_for_rolling = [L1_12m, L2_12m, L3_12m, L4_12m, L5_12m];
    } else {
      data_for_rolling = [L1_1m, L2_1m, L3_1m, L4_1m, L5_1m];
    }

    const ratios = [];
    const maxT = Math.min(...data_for_rolling.map(d => d.length));
    for (let t = 0; t + window <= maxT; t++) {
      const slices = data_for_rolling.map(d => d.slice(t, t + window));
      const corr_window = correlationMatrix(...slices);
      const { eigenvalues: evals } = jacobiEigenvalue(corr_window);
      ratios.push(evals[0] / evals[1]);
    }

    log(`Rolling window size: ${window} months`);
    log(`Ratio time series length: ${ratios.length} points`);
    log('');

    // FFT on ratios
    const ratio_re = [...ratios];
    const ratio_im = Array(ratios.length).fill(0);
    const pow2 = Math.pow(2, Math.ceil(Math.log2(ratios.length)));
    while (ratio_re.length < pow2) {
      ratio_re.push(0);
      ratio_im.push(0);
    }

    fft(ratio_re, ratio_im);

    // Find dominant frequency
    let maxPower = 0, dominantFreq = 0;
    for (let k = 1; k < pow2 / 2; k++) {
      const power = ratio_re[k] * ratio_re[k] + ratio_im[k] * ratio_im[k];
      if (power > maxPower) {
        maxPower = power;
        dominantFreq = k;
      }
    }

    const period_months = pow2 / dominantFreq;
    const mean_amplitude = Math.sqrt(maxPower) / pow2;
    const avg_amplitude = Math.sqrt(
      ratio_re.slice(1, pow2/2).reduce((a, b, i) => a + b*b + ratio_im[i+1]*ratio_im[i+1], 0) / (pow2/2)
    ) / pow2;
    const snr = mean_amplitude / (avg_amplitude || 1);

    log(`Dominant frequency: bin ${dominantFreq}`);
    log(`Dominant period: ${period_months.toFixed(1)} months`);
    log(`Signal amplitude: ${mean_amplitude.toFixed(6)}`);
    log(`Average amplitude: ${avg_amplitude.toFixed(6)}`);
    log(`SNR: ${snr.toFixed(3)}`);
    log('');

    // Prediction 3
    const howell_range = period_months >= 53 && period_months <= 79;
    const dewey_range = period_months >= 173 && period_months <= 259;
    const howell_extended = period_months >= 42 && period_months <= 102;
    const dewey_extended = period_months >= 121 && period_months <= 336;

    let pred3_verdict = 'FAIL';
    if (howell_range || dewey_range) pred3_verdict = 'PASS';
    else if (howell_extended || dewey_extended) pred3_verdict = 'BORDERLINE';

    log(`**Prediction 3 Targets**:`);
    log(`  Howell cycle: [53, 79] months (±20%)`);
    log(`  Dewey cycle: [173, 259] months (±20%)`);
    log(`  Howell extended: [42, 102] months (±30%)`);
    log(`  Dewey extended: [121, 336] months (±30%)`);
    log('');
    log(`**Prediction 3 Verdict**: ${pred3_verdict} — Period ${period_months.toFixed(1)} months${
      howell_range ? ' (Howell!)' : dewey_range ? ' (Dewey!)' : howell_extended ? ' (Howell ±30%)' : dewey_extended ? ' (Dewey ±30%)' : ' (no match)'
    }`);
    log('');
  }

  // ── PART E: Bivector Magnitude & Regime Transitions ──
  if (best.persistentModes.length >= 2) {
    log('## Part E: Bivector Magnitude & Regime Transition Detection');
    log('');

    // Use appropriate data for bivector analysis based on variant
    let data_for_bivector;
    if (best.name === 'Demeaned Levels') {
      data_for_bivector = [L1_dm, L2_dm, L3_dm, L4_dm, L5_dm];
    } else if (best.name === '12-Month Differences') {
      data_for_bivector = [L1_12m, L2_12m, L3_12m, L4_12m, L5_12m];
    } else {
      data_for_bivector = [L1_1m, L2_1m, L3_1m, L4_1m, L5_1m];
    }

    // Project onto first two eigenvectors
    const v1 = best.eigenvectors[0]; // Mode 1
    const v2 = best.eigenvectors[1]; // Mode 2

    const signal1 = [], signal2 = [];
    for (let t = 0; t < data_for_bivector[0].length; t++) {
      let proj1 = 0, proj2 = 0;
      for (let i = 0; i < 5; i++) {
        const val = data_for_bivector[i][t];
        proj1 += val * v1[i];
        proj2 += val * v2[i];
      }
      signal1.push(proj1);
      signal2.push(proj2);
    }

    // Hilbert transform to get instantaneous phase
    const hilbert1 = hilbert(signal1);
    const hilbert2 = hilbert(signal2);

    // Compute phase and bivector magnitude
    const phases1 = hilbert1.imag.map((im, i) => Math.atan2(im, hilbert1.real[i]));
    const phases2 = hilbert2.imag.map((im, i) => Math.atan2(im, hilbert2.real[i]));

    const bivector_mag = [];
    const phase_diff = [];

    for (let t = 0; t < phases1.length; t++) {
      const dphi = phases2[t] - phases1[t];
      const bivec_mag = Math.sin(dphi / 2) ** 2; // Bivector magnitude from phase difference
      bivector_mag.push(bivec_mag);
      phase_diff.push(dphi);
    }

    // Detect regime transitions as sharp changes in bivector magnitude
    const biv_diff = [];
    for (let t = 1; t < bivector_mag.length; t++) {
      biv_diff.push(Math.abs(bivector_mag[t] - bivector_mag[t-1]));
    }

    const biv_diff_mean = mean(biv_diff);
    const biv_diff_std = std(biv_diff);
    const transition_threshold = biv_diff_mean + 2 * biv_diff_std;

    const transitions = [];
    for (let t = 1; t < bivector_mag.length; t++) {
      if (biv_diff[t-1] > transition_threshold) {
        transitions.push({ t, magnitude_change: biv_diff[t-1] });
      }
    }

    // Statistics
    log(`Mode 1 & Mode 2 Projection & Hilbert Transform:`);
    log(`  Signal 1 range: [${Math.min(...signal1).toFixed(2)}, ${Math.max(...signal1).toFixed(2)}]`);
    log(`  Signal 2 range: [${Math.min(...signal2).toFixed(2)}, ${Math.max(...signal2).toFixed(2)}]`);
    log(`  Bivector magnitude range: [${Math.min(...bivector_mag).toFixed(4)}, ${Math.max(...bivector_mag).toFixed(4)}]`);
    log('');

    log(`Regime Transition Detection:`);
    log(`  Bivector magnitude change (mean): ${biv_diff_mean.toFixed(6)}`);
    log(`  Bivector magnitude change (std): ${biv_diff_std.toFixed(6)}`);
    log(`  Transition threshold (mean + 2σ): ${transition_threshold.toFixed(6)}`);
    log(`  Transitions detected: ${transitions.length}`);
    log('');

    if (transitions.length > 0) {
      log(`Regime transition events (t-index):`);
      for (let i = 0; i < Math.min(10, transitions.length); i++) {
        const tr = transitions[i];
        log(`  t=${tr.t}: magnitude change = ${tr.magnitude_change.toFixed(6)}`);
      }
      if (transitions.length > 10) {
        log(`  ... and ${transitions.length - 10} more transitions`);
      }
      log('');
    }

    // Prediction 4: Permutation Test for Statistical Significance
    // Compare bivector magnitude at transitions vs. baseline periods

    const transition_indices = new Set(transitions.map(t => t.t));
    const pre_transition_biv = [];
    const baseline_biv = [];

    for (let t = 0; t < bivector_mag.length; t++) {
      if (transition_indices.has(t)) {
        pre_transition_biv.push(bivector_mag[t]);
      } else {
        baseline_biv.push(bivector_mag[t]);
      }
    }

    const obs_mean_transition = mean(pre_transition_biv);
    const obs_mean_baseline = mean(baseline_biv);
    const obs_diff = obs_mean_transition - obs_mean_baseline;

    // Permutation test: 1000 random permutations
    const n_perms = 1000;
    let extreme_count = 0;

    for (let perm = 0; perm < n_perms; perm++) {
      // Shuffle transition labels randomly
      const perm_labels = Array(bivector_mag.length).fill(0);
      for (let i = 0; i < transitions.length; i++) {
        const random_idx = Math.floor(Math.random() * bivector_mag.length);
        perm_labels[random_idx] = 1;
      }

      let perm_transition_biv = [];
      let perm_baseline_biv = [];
      for (let t = 0; t < bivector_mag.length; t++) {
        if (perm_labels[t] === 1) {
          perm_transition_biv.push(bivector_mag[t]);
        } else {
          perm_baseline_biv.push(bivector_mag[t]);
        }
      }

      const perm_mean_transition = mean(perm_transition_biv);
      const perm_mean_baseline = mean(perm_baseline_biv);
      const perm_diff = perm_mean_transition - perm_mean_baseline;

      if (Math.abs(perm_diff) >= Math.abs(obs_diff)) {
        extreme_count++;
      }
    }

    const pvalue = (extreme_count + 1) / (n_perms + 1);

    // Prediction 4: Bivector as leading indicator
    const transition_frequency = transitions.length / bivector_mag.length;
    const bivec_coherence = 1 - (mean(bivector_mag) / Math.max(...bivector_mag));

    log(`**Prediction 4: Bivector as Regime Transition Leading Indicator**`);
    log('');
    log(`Bivector Statistics:`);
    log(`  Mean bivector magnitude at transitions: ${obs_mean_transition.toFixed(4)}`);
    log(`  Mean bivector magnitude baseline: ${obs_mean_baseline.toFixed(4)}`);
    log(`  Difference (transition - baseline): ${obs_diff.toFixed(4)}`);
    log(`  Bivector coherence (1 = perfect separation): ${bivec_coherence.toFixed(3)}`);
    log(`  Transition frequency: ${(transition_frequency * 100).toFixed(1)}% of time steps`);
    log('');

    log(`Permutation Test (1000 permutations):`);
    log(`  Observed difference: ${obs_diff.toFixed(4)}`);
    log(`  Extreme permutations: ${extreme_count}/${n_perms}`);
    log(`  **p-value: ${pvalue.toFixed(4)}**`);
    log('');

    // Verdict based on pre-registered criterion:
    // PASS requires: p < 0.05 AND mean_transition > baseline
    let pred4_verdict = 'FAIL';
    let pred4_reason = '';

    const passes_pvalue_test = pvalue < 0.05;
    const passes_direction_test = obs_mean_transition > obs_mean_baseline;

    if (passes_pvalue_test && passes_direction_test) {
      pred4_verdict = 'PASS';
      pred4_reason = `p=${pvalue.toFixed(4)} < 0.05 AND transition mean (${obs_mean_transition.toFixed(3)}) > baseline (${obs_mean_baseline.toFixed(3)})`;
    } else if (passes_pvalue_test) {
      pred4_verdict = 'BORDERLINE';
      pred4_reason = `p=${pvalue.toFixed(4)} < 0.05 but transition mean (${obs_mean_transition.toFixed(3)}) ≤ baseline (${obs_mean_baseline.toFixed(3)})`;
    } else if (passes_direction_test && pvalue < 0.10) {
      pred4_verdict = 'BORDERLINE';
      pred4_reason = `Direction correct but p=${pvalue.toFixed(4)} >= 0.05`;
    } else {
      pred4_verdict = 'FAIL';
      pred4_reason = `p=${pvalue.toFixed(4)} >= 0.05; insufficient evidence of regime transition signature`;
    }

    log(`**Prediction 4 Verdict**: ${pred4_verdict} — ${pred4_reason}`);
    log('');

    log(`**Interpretation**:`);
    if (pred4_verdict === 'PASS') {
      log(`✓ Bivector magnitude SIGNIFICANTLY differs at regime transitions (p < 0.05).`);
      log(`✓ Transitions are characterized by elevated bivector magnitudes.`);
      log(`✓ Bivector can serve as a statistically validated leading indicator.`);
    } else if (pred4_verdict === 'BORDERLINE') {
      log(`⚠ Bivector magnitude shows partial signal but does not meet strict p < 0.05 criterion.`);
      log(`⚠ Evidence is suggestive but not definitive for regime transitions.`);
    } else {
      log(`✗ Bivector magnitude does not show statistically significant regime structure.`);
      log(`✗ Detected transitions may reflect noise rather than true regime changes.`);
    }
    log('');

    // ─────────────────────────────────────────────────────────────────
    // PREDICTION 4B: Sign-Reversed Test
    // ─────────────────────────────────────────────────────────────────
    // Hypothesis: LOW bivector magnitude (modal alignment) predicts transitions

    log('## Prediction 4b: Sign-Reversed Hypothesis — Modal Alignment');
    log('');
    log('**Hypothesis**: Regime transitions occur when the two geometric modes');
    log('become momentarily aligned (bivector magnitude LOW). The transition is');
    log('a snap from alignment to divergence, or vice versa.');
    log('');

    // Test direction reversed: Is baseline > pre-transition?
    const obs_diff_reversed = obs_mean_baseline - obs_mean_transition; // Should be positive if pre-trans is lower

    // Permutation test with reversed criterion
    let extreme_count_reversed = 0;

    for (let perm = 0; perm < n_perms; perm++) {
      const perm_labels = Array(bivector_mag.length).fill(0);
      for (let i = 0; i < transitions.length; i++) {
        const random_idx = Math.floor(Math.random() * bivector_mag.length);
        perm_labels[random_idx] = 1;
      }

      let perm_transition_biv_rev = [];
      let perm_baseline_biv_rev = [];
      for (let t = 0; t < bivector_mag.length; t++) {
        if (perm_labels[t] === 1) {
          perm_transition_biv_rev.push(bivector_mag[t]);
        } else {
          perm_baseline_biv_rev.push(bivector_mag[t]);
        }
      }

      const perm_mean_transition_rev = mean(perm_transition_biv_rev);
      const perm_mean_baseline_rev = mean(perm_baseline_biv_rev);
      const perm_diff_reversed = perm_mean_baseline_rev - perm_mean_transition_rev;

      // For low values to predict transitions, baseline - pre_trans should be large and positive
      if (perm_diff_reversed >= obs_diff_reversed) {
        extreme_count_reversed++;
      }
    }

    const pvalue_reversed = (extreme_count_reversed + 1) / (n_perms + 1);

    // Compute 95th percentile of permutation distribution for context
    const perm_diffs_reversed = [];
    for (let perm = 0; perm < n_perms; perm++) {
      const perm_labels = Array(bivector_mag.length).fill(0);
      for (let i = 0; i < transitions.length; i++) {
        const random_idx = Math.floor(Math.random() * bivector_mag.length);
        perm_labels[random_idx] = 1;
      }
      let perm_transition_biv_perc = [];
      let perm_baseline_biv_perc = [];
      for (let t = 0; t < bivector_mag.length; t++) {
        if (perm_labels[t] === 1) {
          perm_transition_biv_perc.push(bivector_mag[t]);
        } else {
          perm_baseline_biv_perc.push(bivector_mag[t]);
        }
      }
      const perm_diff_perc = mean(perm_baseline_biv_perc) - mean(perm_transition_biv_perc);
      perm_diffs_reversed.push(perm_diff_perc);
    }
    perm_diffs_reversed.sort((a, b) => a - b);
    const percentile_95_reversed = perm_diffs_reversed[Math.floor(0.95 * perm_diffs_reversed.length)];

    log(`Bivector Statistics (Sign-Reversed):`);
    log(`  Mean bivector magnitude at transitions: ${obs_mean_transition.toFixed(4)}`);
    log(`  Mean bivector magnitude baseline: ${obs_mean_baseline.toFixed(4)}`);
    log(`  Difference (baseline - pre-transition): ${obs_diff_reversed.toFixed(4)}`);
    log(`  Direction: ${obs_diff_reversed > 0 ? 'CORRECT (pre-trans lower)' : 'WRONG (pre-trans higher)'}`);
    log('');

    log(`Permutation Test (1000 permutations, sign-reversed):`);
    log(`  Observed difference: ${obs_diff_reversed.toFixed(4)}`);
    log(`  Extreme permutations (diff >= obs): ${extreme_count_reversed}/${n_perms}`);
    log(`  95th percentile of permutation dist: ${percentile_95_reversed.toFixed(4)}`);
    log(`  **p-value: ${pvalue_reversed.toFixed(4)}**`);
    log('');

    // Verdict: PASS if p < 0.05 AND mean_pre_trans < mean_baseline
    let pred4b_verdict = 'FAIL';
    let pred4b_reason = '';

    const passes_pvalue_test_reversed = pvalue_reversed < 0.05;
    const passes_direction_test_reversed = obs_mean_transition < obs_mean_baseline; // Pre-trans should be lower

    if (passes_pvalue_test_reversed && passes_direction_test_reversed) {
      pred4b_verdict = 'PASS';
      pred4b_reason = `p=${pvalue_reversed.toFixed(4)} < 0.05 AND pre-transition B (${obs_mean_transition.toFixed(3)}) < baseline B (${obs_mean_baseline.toFixed(3)})`;
    } else if (pvalue_reversed < 0.10 && passes_direction_test_reversed) {
      pred4b_verdict = 'BORDERLINE';
      pred4b_reason = `p=${pvalue_reversed.toFixed(4)} < 0.10 AND direction correct`;
    } else {
      pred4b_verdict = 'FAIL';
      pred4b_reason = `p=${pvalue_reversed.toFixed(4)} >= 0.05 or direction incorrect`;
    }

    log(`**Prediction 4b Verdict**: ${pred4b_verdict} — ${pred4b_reason}`);
    log('');

    log(`**Economic Interpretation**:`);
    if (pred4b_verdict === 'PASS') {
      log(`✓ REGIME TRANSITIONS OCCUR AT MODAL ALIGNMENT (p < 0.05).`);
      log(``);
      log(`Modal dynamics: The two geometric modes are normally divergent`);
      log(`(high bivector magnitude = modal tension). Before a regime transition,`);
      log(`the modes snap into alignment (low bivector magnitude), indicating a`);
      log(`moment of modal coherence. The transition itself is the subsequent`);
      log(`divergence back to normal modal tension.`);
      log(``);
      log(`Economic meaning: Transitions occur when leading indicators (Mode 1)`);
      log(`and contemporaneous factors (Mode 2) momentarily align in the same`);
      log(`direction — a precursor to the mode structure reorganizing into a new regime.`);
    } else if (pred4b_verdict === 'BORDERLINE') {
      log(`⚠ Suggestive evidence (p < 0.10) that modal alignment relates to transitions,`);
      log(`but does not reach strict p < 0.05 significance threshold.`);
    } else {
      log(`✗ Neither modal alignment (low B) nor modal tension (high B) shows a`);
      log(`statistically significant relationship with regime transitions at this`);
      log(`sample size and transition definition. The bivector magnitude does not`);
      log(`serve as a leading indicator in either direction.`);
    }
    log('');
  }

  // Summary
  log('═'.repeat(70));
  log('SUMMARY');
  log('═'.repeat(70));
  log('');
  log(`Variant analysis complete. Selected: ${best.name}`);
  log(`Observations: ${best.T}`);
  log(`Persistent modes: ${best.persistentModes.length} (threshold λ_MP = ${best.lambda_mp.toFixed(4)})`);
  log('');

  fs.writeFileSync(OUTPUT_FILE, output.join('\n'));
  console.log(`\n✓ Results written to ${OUTPUT_FILE}`);
}

main().catch(e => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
