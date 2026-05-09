/**
 * L5-Excluded Eigenstructure Analysis
 *
 * Constitutive vs Instrumental Test:
 * Is the 64-month Howell cycle a fundamental property of the 4-layer
 * economic geometry (constitutive), or an artifact of L5 measuring
 * the Howell cycle directly (instrumental)?
 *
 * Uses same 12-month differences variant that succeeded in full study.
 * N = 4 variables (L1-L4 only, L5 excluded)
 * T = 137 observations (12-month differences)
 * Q = 137/4 = 34.25
 * λ_MP = (1 + 1/√34.25)² = 1.370
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_FILE = path.join(__dirname, 'layer_scores_history.csv');
const OUTPUT_FILE = path.join(__dirname, 'eigenstructure_l1l4_results.md');

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

function correlationMatrix(dL1, dL2, dL3, dL4) {
  const layers = [dL1, dL2, dL3, dL4];
  const corr = Array(4).fill(0).map(() => Array(4).fill(0));
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
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

// ── FFT ──

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

// ── Main Analysis ──

let output = [];
function log(msg) {
  console.log(msg);
  output.push(msg);
}

async function main() {
  log('═'.repeat(70));
  log('L5-EXCLUDED EIGENSTRUCTURE ANALYSIS');
  log('CONSTITUTIVE VS INSTRUMENTAL TEST');
  log('═'.repeat(70));
  log('');

  // Load data
  const data = loadCSV(CSV_FILE);
  const T_total = data.length;
  log(`Loaded ${T_total} observations from ${CSV_FILE}`);
  log('');

  // Extract L1-L4 only (drop L5)
  const L1_raw = data.map(d => d.L1);
  const L2_raw = data.map(d => d.L2);
  const L3_raw = data.map(d => d.L3);
  const L4_raw = data.map(d => d.L4);

  log('**Excluded L5 (Liquidity layer entirely)**');
  log('Analysis: L1-L4 only (4 variables)');
  log('');

  // Compute 12-month differences
  const L1_12m = [], L2_12m = [], L3_12m = [], L4_12m = [];
  for (let i = 12; i < data.length; i++) {
    L1_12m.push(data[i].L1 - data[i-12].L1);
    L2_12m.push(data[i].L2 - data[i-12].L2);
    L3_12m.push(data[i].L3 - data[i-12].L3);
    L4_12m.push(data[i].L4 - data[i-12].L4);
  }

  const T = L1_12m.length;
  const Q = T / 4;
  const lambda_mp = Math.pow(1 + 1 / Math.sqrt(Q), 2);

  log(`Variant: 12-month differences`);
  log(`Sample size: T = ${T} (after dropping first 12)`);
  log(`Variables: N = 4 (L1, L2, L3, L4; L5 excluded)`);
  log(`Q = T/N = ${Q.toFixed(2)}`);
  log('');

  // ── Part A: Correlation Matrix ──
  log('## Part A: Correlation Matrix (12-Month Differences)');
  log('');

  const corr = correlationMatrix(L1_12m, L2_12m, L3_12m, L4_12m);
  log('4×4 Pearson Correlation Matrix:');
  log('');
  log('```');
  log('        L1      L2      L3      L4');
  for (let i = 0; i < 4; i++) {
    const row = ['L1', 'L2', 'L3', 'L4'][i];
    const vals = corr[i].map(v => v.toFixed(3).padStart(7)).join(' ');
    log(`${row}   ${vals}`);
  }
  log('```');
  log('');

  // ── Part B: Eigendecomposition ──
  log('## Part B: Eigendecomposition');
  log('');

  const { eigenvalues, eigenvectors } = jacobiEigenvalue(corr);

  log(`Marchenko-Pastur Threshold: λ_MP = (1 + 1/√Q)² = (1 + 1/√${Q.toFixed(1)})² = ${lambda_mp.toFixed(4)}`);
  log('');

  log('Eigenvalues (sorted descending):');
  log('');
  log('| k | λ_k     | Exceeds λ_MP? |');
  log('|---|---------|---------------|');
  const persistentModes = [];
  for (let k = 0; k < 4; k++) {
    const exceeds = eigenvalues[k] > lambda_mp ? 'YES' : 'NO';
    log(`| ${k+1} | ${eigenvalues[k].toFixed(4)} | ${exceeds.padEnd(13)} |`);
    if (eigenvalues[k] > lambda_mp) persistentModes.push(k);
  }
  log('');

  log(`**Persistent modes**: ${persistentModes.length} (exceeding λ_MP = ${lambda_mp.toFixed(4)})`);
  log('');

  // P1 Verdict
  const pred1Pass = persistentModes.length >= 2;
  log(`**P1 Verdict**: ${pred1Pass ? 'PASS' : 'FAIL'} — At least 2 modes (found ${persistentModes.length})`);
  log('');

  // ── Part C: Eigenvector Composition ──
  if (persistentModes.length > 0) {
    log('## Part C: Eigenvector Composition');
    log('');

    const names = ['L1', 'L2', 'L3', 'L4'];
    for (const k of persistentModes) {
      log(`### Mode ${k + 1} (λ = ${eigenvalues[k].toFixed(4)})`);
      log('');
      log('| Layer | Loading | Sign |');
      log('|-------|---------|------|');
      const vec = eigenvectors[k];
      const signs = vec.map(v => v >= 0 ? '+' : '-');

      for (let i = 0; i < 4; i++) {
        const load = vec[i].toFixed(2).padStart(7);
        const sign = signs[i].padStart(4);
        log(`| ${names[i]}    | ${load} | ${sign} |`);
      }
      log('');

      // Classification
      let classification = '';
      const allSameSign = signs.every(s => s === signs[0]);
      if (allSameSign) {
        classification = 'General regime factor';
      } else {
        const pos = names.filter((_, i) => vec[i] > 0).join(', ');
        const neg = names.filter((_, i) => vec[i] < 0).join(', ');
        classification = `Mixed — Positive: ${pos}, Negative: ${neg}`;
      }
      log(`**Classification**: ${classification}`);
      log('');
    }

    log(`**P2 Interpretation**: Without L5, modes show: ${persistentModes.length > 0 ? 'structure retained' : 'structure collapsed'}`);
    log('');
  }

  // ── Part D: Rolling Eigenvalue Ratio ──
  if (persistentModes.length >= 2) {
    log('## Part D: Rolling Eigenvalue Ratio & Spectral Analysis');
    log('');

    const ratios = [];
    const window = 24;
    const maxT = L1_12m.length;

    for (let t = 0; t + window <= maxT; t++) {
      const slices = [
        L1_12m.slice(t, t + window),
        L2_12m.slice(t, t + window),
        L3_12m.slice(t, t + window),
        L4_12m.slice(t, t + window),
      ];
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
    log(`**Dominant period: ${period_months.toFixed(1)} months**`);
    log(`Signal amplitude: ${mean_amplitude.toFixed(6)}`);
    log(`SNR: ${snr.toFixed(3)}`);
    log('');

    // ── THE KEY TEST: P3 ──
    log('**P3 — THE CRITICAL TEST: Does the 64-month cycle survive without L5?**');
    log('');

    const howell_range = period_months >= 53 && period_months <= 79;
    const howell_extended = period_months >= 42 && period_months <= 102;

    let p3_verdict = 'FAIL';
    let p3_interpretation = '';

    if (howell_range) {
      p3_verdict = 'CONSTITUTIVE';
      p3_interpretation = `Period ${period_months.toFixed(1)}mo matches Howell [53-79]. The 64-month cycle is a fundamental property of the L1-L4 economic geometry, NOT dependent on L5 liquidity measurement.`;
    } else if (howell_extended) {
      p3_verdict = 'BORDERLINE';
      p3_interpretation = `Period ${period_months.toFixed(1)}mo in extended range [42-102]. Suggestive but outside strict Howell range.`;
    } else {
      p3_verdict = 'INSTRUMENTAL';
      p3_interpretation = `Period ${period_months.toFixed(1)}mo outside [42-102]. The 64-month cycle DISAPPEARS without L5. This suggests the cycle is an artifact of L5 directly measuring the Howell liquidity cycle.`;
    }

    log(`**P3 Verdict**: ${p3_verdict}`);
    log('');
    log(`**Interpretation**: ${p3_interpretation}`);
    log('');
  } else {
    log('## Part D: SKIPPED');
    log('Rolling eigenvalue ratio analysis skipped (fewer than 2 persistent modes).');
    log('');
  }

  // Summary & Comparison
  log('═'.repeat(70));
  log('SUMMARY & COMPARISON');
  log('═'.repeat(70));
  log('');

  log('### Comparison: Full Study vs L5-Excluded');
  log('');
  log('| Metric | Full Study (L1-L5, N=5) | L5-Excluded (L1-L4, N=4) | Interpretation |');
  log('|---|---|---|---|');
  log(`| Variables | 5 | 4 | — |`);
  log(`| Observations (12m-diff) | 137 | 137 | Same |`);
  log(`| Q = T/N | 27.4 | ${Q.toFixed(1)} | Higher variance w/ fewer vars |`);
  log(`| λ_MP threshold | 1.4186 | ${lambda_mp.toFixed(4)} | Slightly lower with N=4 |`);
  log(`| Persistent modes | 2 | ${persistentModes.length} | ${persistentModes.length === 2 ? 'Same' : persistentModes.length > 2 ? 'Stronger' : 'Weaker'} |`);
  if (persistentModes.length >= 2) {
    log(`| Dominant period | 64.0 mo | ? | **CRITICAL COMPARISON** |`);
    log(`| Period ∈ [53-79] | ✓ PASS | ? | **Determines CONSTITUTIVE vs INSTRUMENTAL** |`);
  }
  log('');

  log('### Key Question Answered');
  log('');
  if (persistentModes.length >= 2) {
    if (period_months >= 53 && period_months <= 79) {
      log(`✓ **CONSTITUTIVE**: The 64-month Howell cycle is a fundamental property`);
      log(`  of the 4-layer economic geometry. It exists in the L1-L4 correlation`);
      log(`  structure independent of L5 liquidity measurement.`);
      log('');
      log(`  Implication: The cycle is not a data artifact but emerges from the`);
      log(`  intrinsic dynamics of leading, coincident, stress, and policy indicators.`);
    } else if (period_months >= 42 && period_months <= 102) {
      log(`⚠ **BORDERLINE**: Suggestive but weak evidence of constitutive structure.`);
      log(`  Period ${period_months.toFixed(1)}mo is plausible but outside [53-79].`);
    } else {
      log(`✗ **INSTRUMENTAL**: The 64-month cycle DISAPPEARS without L5.`);
      log(`  New dominant period: ${period_months.toFixed(1)} months.`);
      log('');
      log(`  Implication: The Howell cycle signal is driven by L5's direct measurement`);
      log(`  of Fed liquidity and global CB balance sheets, not by the underlying`);
      log(`  economic regime dynamics of the other four layers.`);
    }
  } else {
    log(`✗ **INCONCLUSIVE**: No persistent modes without L5 (eigenstructure collapsed).`);
    log(`  The 5-layer architecture requires all layers for signal extraction.`);
  }
  log('');

  // Write output
  fs.writeFileSync(OUTPUT_FILE, output.join('\n'));
  console.log(`\n✓ Results written to ${OUTPUT_FILE}`);
}

main().catch(e => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
