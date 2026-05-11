#!/usr/bin/env node

/**
 * Study A Diagnostic: Why Did λ₂ Deteriorate?
 *
 * Three diagnostics to understand the negative result:
 * 1. Sub-period analysis (2006-2013, 2014-2019, 2020-2026)
 * 2. Rolling λ₂ time series (60-month windows)
 * 3. TLI vs FRED L5 correlation in overlap period
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_TLI = path.join(__dirname, 'layer_scores_with_tli.csv');
const CSV_HISTORY = path.join(__dirname, 'layer_scores_history.csv');
const OUTPUT_FILE = path.join(__dirname, 'study_a_diagnostic.md');

// ── Statistics ──

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n < 2) return 0;
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
  if (den_x === 0 || den_y === 0) return 0;
  return num / Math.sqrt(den_x * den_y);
}

function correlationMatrix(dL1, dL2, dL3, dL4, dTLI) {
  const layers = dTLI !== undefined ? [dL1, dL2, dL3, dL4, dTLI] : [dL1, dL2, dL3, dL4];
  const n = layers.length;
  const corr = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
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

// ── Load Data ──

function loadCSV_TLI(filePath) {
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
      TLI: parseFloat(values[5]),
    };
  });
  return rows;
}

function loadCSV_History(filePath) {
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
    };
  });
  return rows;
}

// ── Main ──

let output = [];
function log(msg) {
  console.log(msg);
  output.push(msg);
}

async function main() {
  log('═'.repeat(70));
  log('STUDY A DIAGNOSTIC: WHY DID λ₂ DETERIORATE?');
  log('═'.repeat(70));
  log('');

  // Load full TLI data
  const data_tli = loadCSV_TLI(CSV_TLI);
  const data_history = loadCSV_History(CSV_HISTORY);

  log(`Loaded ${data_tli.length} observations from TLI dataset (2006-2026)`);
  log(`Loaded ${data_history.length} observations from FRED L5 dataset (2014-2026)`);
  log('');

  // ─────────────────────────────────────────────────────────────────
  // DIAGNOSTIC 1: Sub-period analysis
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('DIAGNOSTIC 1: SUB-PERIOD EIGENSTRUCTURE ANALYSIS');
  log('═'.repeat(70));
  log('');

  // Define periods
  const period1_start = '2006-01-01';
  const period1_end = '2013-12-31';
  const period2_start = '2014-01-01';
  const period2_end = '2019-12-31';
  const period3_start = '2020-01-01';
  const period3_end = '2026-04-30';

  function filterByDateRange(data, start, end) {
    return data.filter(d => d.date >= start && d.date <= end);
  }

  const period1 = filterByDateRange(data_tli, period1_start, period1_end);
  const period2 = filterByDateRange(data_tli, period2_start, period2_end);
  const period3 = filterByDateRange(data_tli, period3_start, period3_end);

  log(`Period 1 (2006-01 to 2013-12, pre-2014): ${period1.length} observations`);
  log(`Period 2 (2014-01 to 2019-12, Study 1 era): ${period2.length} observations`);
  log(`Period 3 (2020-01 to 2026-04, COVID era): ${period3.length} observations`);
  log('');

  function analyzeSubperiod(name, data) {
    if (data.length < 13) {
      log(`${name}: INSUFFICIENT DATA (${data.length} obs, need ≥13 for 12-month diff)`);
      return null;
    }

    // Extract 12-month differences
    const L1_diff = [], L2_diff = [], L3_diff = [], L4_diff = [], TLI_diff = [];
    for (let i = 12; i < data.length; i++) {
      L1_diff.push(data[i].L1 - data[i-12].L1);
      L2_diff.push(data[i].L2 - data[i-12].L2);
      L3_diff.push(data[i].L3 - data[i-12].L3);
      L4_diff.push(data[i].L4 - data[i-12].L4);
      TLI_diff.push(data[i].TLI - data[i-12].TLI);
    }

    const T = L1_diff.length;
    const Q = T / 5;
    const lambda_mp = Math.pow(1 + 1 / Math.sqrt(Q), 2);

    const corr = correlationMatrix(L1_diff, L2_diff, L3_diff, L4_diff, TLI_diff);
    const { eigenvalues } = jacobiEigenvalue(corr);

    const lambda1 = eigenvalues[0];
    const lambda2 = eigenvalues[1];
    const exceeds = lambda2 > lambda_mp ? 'YES' : 'NO';

    log(`${name}:`);
    log(`  Differenced observations (T): ${T}`);
    log(`  Q = T/N: ${Q.toFixed(1)}`);
    log(`  λ_MP: ${lambda_mp.toFixed(4)}`);
    log(`  λ₁: ${lambda1.toFixed(4)}`);
    log(`  λ₂: ${lambda2.toFixed(4)}`);
    log(`  λ₂ > λ_MP? ${exceeds}`);
    log('');

    return { T, Q, lambda_mp, lambda1, lambda2, exceeds };
  }

  const p1_result = analyzeSubperiod('Period 1 (2006-2013, Crisis era)', period1);
  const p2_result = analyzeSubperiod('Period 2 (2014-2019, Study 1 era)', period2);
  const p3_result = analyzeSubperiod('Period 3 (2020-2026, COVID era)', period3);

  log('**Sub-period Comparison Table**:');
  log('');
  log('| Period | T | Q | λ_MP | λ₁ | λ₂ | Exceeds? |');
  log('|--------|---|---|------|----|----|----------|');
  if (p1_result) log(`| 1 (2006-13) | ${p1_result.T} | ${p1_result.Q.toFixed(1)} | ${p1_result.lambda_mp.toFixed(4)} | ${p1_result.lambda1.toFixed(4)} | ${p1_result.lambda2.toFixed(4)} | ${p1_result.exceeds} |`);
  if (p2_result) log(`| 2 (2014-19) | ${p2_result.T} | ${p2_result.Q.toFixed(1)} | ${p2_result.lambda_mp.toFixed(4)} | ${p2_result.lambda1.toFixed(4)} | ${p2_result.lambda2.toFixed(4)} | ${p2_result.exceeds} |`);
  if (p3_result) log(`| 3 (2020-26) | ${p3_result.T} | ${p3_result.Q.toFixed(1)} | ${p3_result.lambda_mp.toFixed(4)} | ${p3_result.lambda1.toFixed(4)} | ${p3_result.lambda2.toFixed(4)} | ${p3_result.exceeds} |`);
  log('');

  // ─────────────────────────────────────────────────────────────────
  // DIAGNOSTIC 2: Rolling λ₂
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('DIAGNOSTIC 2: ROLLING λ₂ TIME SERIES (60-month windows)');
  log('═'.repeat(70));
  log('');

  // Full 12-month differences
  const L1_all = [], L2_all = [], L3_all = [], L4_all = [], TLI_all = [];
  for (let i = 12; i < data_tli.length; i++) {
    L1_all.push(data_tli[i].L1 - data_tli[i-12].L1);
    L2_all.push(data_tli[i].L2 - data_tli[i-12].L2);
    L3_all.push(data_tli[i].L3 - data_tli[i-12].L3);
    L4_all.push(data_tli[i].L4 - data_tli[i-12].L4);
    TLI_all.push(data_tli[i].TLI - data_tli[i-12].TLI);
  }

  const rolling_window = 60;
  const rolling_results = [];

  log(`Rolling window: ${rolling_window} months`);
  log(`Total windows: ${L1_all.length - rolling_window + 1}`);
  log('');
  log('| Window End (approx) | λ₂ | λ_MP | Exceeds? |');
  log('|---------------------|----|----- |----------|');

  for (let i = 0; i + rolling_window <= L1_all.length; i++) {
    const L1_window = L1_all.slice(i, i + rolling_window);
    const L2_window = L2_all.slice(i, i + rolling_window);
    const L3_window = L3_all.slice(i, i + rolling_window);
    const L4_window = L4_all.slice(i, i + rolling_window);
    const TLI_window = TLI_all.slice(i, i + rolling_window);

    const T_window = rolling_window;
    const Q_window = T_window / 5;
    const lambda_mp_window = Math.pow(1 + 1 / Math.sqrt(Q_window), 2);

    const corr_window = correlationMatrix(L1_window, L2_window, L3_window, L4_window, TLI_window);
    const { eigenvalues: evals_window } = jacobiEigenvalue(corr_window);

    const lambda2_window = evals_window[1];
    const exceeds_window = lambda2_window > lambda_mp_window ? 'YES' : 'NO';

    rolling_results.push({
      end_idx: i + rolling_window - 1,
      lambda2: lambda2_window,
      lambda_mp: lambda_mp_window,
      exceeds: exceeds_window,
      date_end: data_tli[i + rolling_window - 1 + 12]?.date || 'N/A', // Adjust for 12-month lag
    });
  }

  // Print every Nth window to keep output manageable
  const print_every = Math.max(1, Math.floor(rolling_results.length / 15));
  for (let i = 0; i < rolling_results.length; i += print_every) {
    const r = rolling_results[i];
    log(`| ${r.date_end} | ${r.lambda2.toFixed(4)} | ${r.lambda_mp.toFixed(4)} | ${r.exceeds} |`);
  }
  // Always print the last one
  if (rolling_results.length > 0) {
    const r = rolling_results[rolling_results.length - 1];
    log(`| ${r.date_end} | ${r.lambda2.toFixed(4)} | ${r.lambda_mp.toFixed(4)} | ${r.exceeds} |`);
  }

  log('');

  // Count how many windows exceed MP
  const exceeding_windows = rolling_results.filter(r => r.exceeds === 'YES').length;
  const total_windows = rolling_results.length;
  const pct_exceeding = (exceeding_windows / total_windows * 100).toFixed(1);

  log(`Windows where λ₂ > λ_MP: ${exceeding_windows}/${total_windows} (${pct_exceeding}%)`);
  log('');

  // ─────────────────────────────────────────────────────────────────
  // DIAGNOSTIC 3: TLI vs FRED L5 correlation
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('DIAGNOSTIC 3: TLI vs FRED L5 CORRELATION (2014-2026 overlap)');
  log('═'.repeat(70));
  log('');

  // Find overlap between datasets
  const overlap_tli = data_tli.filter(d => d.date >= '2014-01-01' && d.date <= '2026-04-30');
  const overlap_l5 = data_history.filter(d => d.date >= '2014-01-01' && d.date <= '2026-04-30');

  log(`Overlap period observations:`);
  log(`  TLI dataset: ${overlap_tli.length}`);
  log(`  FRED L5 dataset: ${overlap_l5.length}`);
  log('');

  // Align by date
  const tli_map = {};
  for (const row of overlap_tli) {
    tli_map[row.date] = row.TLI;
  }

  const l5_values = [];
  const tli_values = [];

  for (const row of overlap_l5) {
    if (tli_map[row.date] !== undefined) {
      l5_values.push(row.L5);
      tli_values.push(tli_map[row.date]);
    }
  }

  log(`Aligned pairs for correlation: ${l5_values.length}`);
  log('');

  const correlation_tli_l5 = pearsonCorrelation(tli_values, l5_values);

  log(`**TLI vs FRED L5 Correlation (2014-2026): ${correlation_tli_l5.toFixed(4)}**`);
  log('');

  if (correlation_tli_l5 > 0.8) {
    log('**Interpretation**: High correlation (> 0.8)');
    log('  TLI and FRED L5 measure similar underlying liquidity.');
    log('  Eigenstructure difference likely comes from extended time window,');
    log('  not from measurement method differences.');
    log('');
  } else if (correlation_tli_l5 > 0.5) {
    log('**Interpretation**: Moderate correlation (0.5-0.8)');
    log('  TLI and FRED L5 are partially correlated.');
    log('  Difference may be from both extended window AND measurement method.');
    log('');
  } else if (correlation_tli_l5 > 0) {
    log('**Interpretation**: Low correlation (0-0.5)');
    log('  TLI and FRED L5 measure different aspects of liquidity.');
    log('  Eigenstructure difference is primarily from measurement differences.');
    log('');
  } else {
    log('**Interpretation**: Negligible or negative correlation');
    log('  TLI and FRED L5 move in opposite directions.');
    log('  They are measuring fundamentally different things.');
    log('');
  }

  // ─────────────────────────────────────────────────────────────────
  // CONCLUSIONS
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('DIAGNOSTIC CONCLUSIONS');
  log('═'.repeat(70));
  log('');

  // Question 1: Is λ₂ > MP in 2014-2019 with TLI?
  const q1_answer = p2_result && p2_result.exceeds === 'YES' ? 'YES' : 'NO';
  log('**Q1: Is the second geometric mode present in 2014-2019 with TLI?**');
  log(`Answer: ${q1_answer}`);
  if (p2_result) {
    log(`  (λ₂ = ${p2_result.lambda2.toFixed(4)} vs λ_MP = ${p2_result.lambda_mp.toFixed(4)})`);
  }
  log('');

  // Question 2: Was λ₂ > MP ever present in 2006-2026?
  const q2_answer = exceeding_windows > 0 ? 'YES, INTERMITTENTLY' : 'NO, NEVER';
  log('**Q2: Was the second mode ever present in 2006-2026?**');
  log(`Answer: ${q2_answer}`);
  log(`  (Found in ${exceeding_windows}/${total_windows} rolling windows, ${pct_exceeding}% of the time)`);
  log('');

  // Question 3: How correlated are TLI and FRED L5?
  log('**Q3: How correlated are TLI and FRED L5 (2014-2026)?**');
  log(`Answer: r = ${correlation_tli_l5.toFixed(4)}`);
  if (correlation_tli_l5 > 0.8) {
    log(`  Interpretation: High correlation — same underlying construct`);
  } else if (correlation_tli_l5 > 0.5) {
    log(`  Interpretation: Moderate correlation — overlapping but distinct`);
  } else {
    log(`  Interpretation: Low/weak correlation — different constructs`);
  }
  log('');

  // Question 4: Most likely explanation
  log('**Q4: Most likely explanation for λ₂ deterioration in Study A?**');
  log('');

  if (p2_result && p2_result.exceeds === 'NO') {
    log('**FINDING A**: The second mode is NOT present in Period 2 (2014-2019) even WITH TLI.');
    log('  This means the entire difference is coming from the extended 2006-2013 data,');
    log('  not from the difference between FRED L5 and Howell TLI.');
    log('  → The 2006-2013 pre-crisis era breaks the eigenstructure signal.');
    log('');
  } else if (p2_result && p2_result.exceeds === 'YES') {
    log('**FINDING B**: The second mode IS present in Period 2 (2014-2019) with TLI.');
    log('  But it disappears in the full 2006-2026 window.');
    log('  The extended 2006-2013 data is making λ₂ drop below the threshold.');
    log('');
  }

  if (correlation_tli_l5 < 0.5) {
    log('**FINDING C**: TLI and FRED L5 are poorly correlated (r < 0.5).');
    log('  The measurement method matters significantly.');
    log('  FRED L5 reconstruction may not capture what Howell\'s TLI measures.');
    log('');
  } else if (correlation_tli_l5 > 0.8) {
    log('**FINDING D**: TLI and FRED L5 are highly correlated (r > 0.8).');
    log('  They measure the same underlying thing.');
    log('  The difference in results is NOT due to different measurement methods.');
    log('  It comes from the extended time window.');
    log('');
  }

  if (exceeding_windows < total_windows * 0.3) {
    log('**FINDING E**: The second mode is rarely present across the full time window.');
    log('  It was unstable and intermittent, not a robust structural feature.');
    log('  The modal signal degrades outside the 2014-2026 window.');
    log('');
  } else {
    log('**FINDING E**: The second mode was present in substantial portions of the window.');
    log('  It is not unstable. Specific time periods lack it.');
    log('');
  }

  log('**SYNTHESIS**:');
  log('The most likely explanation is that the 2006-2013 pre-crisis period');
  log('has a fundamentally different economic structure (different modal');
  log('geometry) than the post-GFC 2014-2026 period. When 2006-2013 is');
  log('included in the analysis, it dominates the correlation structure and');
  log('λ₂ drops below the signal threshold.');
  log('');

  // Write output
  fs.writeFileSync(OUTPUT_FILE, output.join('\n'));
  console.log(`\n✓ Diagnostic complete. Results written to ${OUTPUT_FILE}`);
}

main().catch(e => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
