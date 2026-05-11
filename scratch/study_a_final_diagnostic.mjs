#!/usr/bin/env node

/**
 * Study A Final Diagnostic: TLI in Study 1 Window
 *
 * Tests:
 * 1. Run eigenstructure on ONLY 2014-2026 with TLI (same window as Study 1)
 *    → Does the second mode appear with TLI in the same window?
 *
 * 2. Correlate 12-month DIFFERENCES of TLI vs FRED L5 (not levels)
 *    → Do they share cycle-scale dynamics?
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_TLI = path.join(__dirname, 'layer_scores_with_tli.csv');
const CSV_HISTORY = path.join(__dirname, 'layer_scores_history.csv');
const OUTPUT_FILE = path.join(__dirname, 'study_a_final_diagnostic.md');

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

function correlationMatrix(...series) {
  const n = series.length;
  const corr = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      corr[i][j] = i === j ? 1.0 : pearsonCorrelation(series[i], series[j]);
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
  return lines.slice(1).map(line => {
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
}

function loadCSV_History(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  return lines.slice(1).map(line => {
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
}

// ── Main ──

let output = [];
function log(msg) {
  console.log(msg);
  output.push(msg);
}

async function main() {
  log('═'.repeat(70));
  log('STUDY A FINAL DIAGNOSTIC: TLI IN STUDY 1 WINDOW');
  log('═'.repeat(70));
  log('');

  const data_tli = loadCSV_TLI(CSV_TLI);
  const data_history = loadCSV_History(CSV_HISTORY);

  log(`TLI dataset: ${data_tli.length} obs (2006-2026)`);
  log(`FRED L5 dataset: ${data_history.length} obs (2014-2026)`);
  log('');

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: Eigenstructure on 2014-2026 with TLI only
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('TEST 1: EIGENSTRUCTURE ON 2014-2026 WITH TLI (Study 1 Window)');
  log('═'.repeat(70));
  log('');

  // Filter to 2014-01 onwards
  const tli_2014plus = data_tli.filter(d => d.date >= '2014-01-01');
  log(`TLI observations from 2014-01: ${tli_2014plus.length}`);
  log(`Date range: ${tli_2014plus[0].date} to ${tli_2014plus[tli_2014plus.length-1].date}`);
  log('');

  // Compute 12-month differences
  const L1_diff = [], L2_diff = [], L3_diff = [], L4_diff = [], TLI_diff = [];
  for (let i = 12; i < tli_2014plus.length; i++) {
    L1_diff.push(tli_2014plus[i].L1 - tli_2014plus[i-12].L1);
    L2_diff.push(tli_2014plus[i].L2 - tli_2014plus[i-12].L2);
    L3_diff.push(tli_2014plus[i].L3 - tli_2014plus[i-12].L3);
    L4_diff.push(tli_2014plus[i].L4 - tli_2014plus[i-12].L4);
    TLI_diff.push(tli_2014plus[i].TLI - tli_2014plus[i-12].TLI);
  }

  const T = L1_diff.length;
  const Q = T / 5;
  const lambda_mp = Math.pow(1 + 1 / Math.sqrt(Q), 2);

  log(`Sample after 12-month differencing:`);
  log(`  T = ${T} observations`);
  log(`  Q = T/N = ${Q.toFixed(2)}`);
  log(`  λ_MP = (1 + 1/√Q)² = ${lambda_mp.toFixed(4)}`);
  log('');

  // Correlation matrix
  const corr = correlationMatrix(L1_diff, L2_diff, L3_diff, L4_diff, TLI_diff);
  const names = ['L1', 'L2', 'L3', 'L4', 'TLI'];

  log('Correlation Matrix (12-month diffs, 2014-2026):');
  log('```');
  log('       L1      L2      L3      L4      TLI');
  for (let i = 0; i < 5; i++) {
    const vals = corr[i].map(v => v.toFixed(3).padStart(7)).join(' ');
    log(`${names[i].padEnd(3)}   ${vals}`);
  }
  log('```');
  log('');

  // Eigendecomposition
  const { eigenvalues, eigenvectors } = jacobiEigenvalue(corr);

  log('Eigenvalues (sorted descending):');
  log('');
  log('| k | λ_k     | Exceeds λ_MP? |');
  log('|---|---------|---------------|');
  for (let k = 0; k < 5; k++) {
    const exceeds = eigenvalues[k] > lambda_mp ? 'YES' : 'NO';
    log(`| ${k+1} | ${eigenvalues[k].toFixed(4)} | ${exceeds.padEnd(13)} |`);
  }
  log('');

  const lambda2_tli_2014 = eigenvalues[1];
  const second_mode_present = lambda2_tli_2014 > lambda_mp;

  log(`**TEST 1 RESULT**:`);
  log(`  λ₂ (TLI, 2014-2026) = ${lambda2_tli_2014.toFixed(4)}`);
  log(`  λ_MP threshold = ${lambda_mp.toFixed(4)}`);
  log(`  Second mode present? ${second_mode_present ? 'YES' : 'NO'}`);
  log('');

  // Compare to Study 1
  log(`**Study 1 comparison (2014-2026, FRED L5)**:`);
  log(`  λ₂ (FRED L5) = 1.4603 (PASS - exceeds MP=1.4186)`);
  log(`  λ₂ (TLI)     = ${lambda2_tli_2014.toFixed(4)} (${second_mode_present ? 'PASS' : 'FAIL'} - ${second_mode_present ? 'exceeds' : 'below'} MP=${lambda_mp.toFixed(4)})`);
  log(`  Difference: ${(lambda2_tli_2014 - 1.4603).toFixed(4)}`);
  log('');

  // Print eigenvectors of top 2 modes for inspection
  log('Eigenvector composition (Mode 1):');
  log('| Var | Loading | Sign |');
  log('|-----|---------|------|');
  for (let i = 0; i < 5; i++) {
    const v = eigenvectors[0][i];
    log(`| ${names[i]}  | ${v.toFixed(3).padStart(7)} | ${v >= 0 ? '+' : '-'} |`);
  }
  log('');

  log('Eigenvector composition (Mode 2):');
  log('| Var | Loading | Sign |');
  log('|-----|---------|------|');
  for (let i = 0; i < 5; i++) {
    const v = eigenvectors[1][i];
    log(`| ${names[i]}  | ${v.toFixed(3).padStart(7)} | ${v >= 0 ? '+' : '-'} |`);
  }
  log('');

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: 12-month differences correlation between TLI and FRED L5
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('TEST 2: 12-MONTH DIFFERENCE CORRELATION (TLI vs FRED L5)');
  log('═'.repeat(70));
  log('');

  // Align dates between TLI and FRED L5
  const tli_overlap = data_tli.filter(d => d.date >= '2014-01-01');
  const l5_overlap = data_history.filter(d => d.date >= '2014-01-01');

  log(`Overlap period observations:`);
  log(`  TLI: ${tli_overlap.length}`);
  log(`  FRED L5: ${l5_overlap.length}`);
  log('');

  // Align by date
  const tli_by_date = {};
  for (const row of tli_overlap) {
    tli_by_date[row.date] = row.TLI;
  }

  // Build aligned series of LEVELS
  const aligned_dates = [];
  const tli_levels = [];
  const l5_levels = [];

  for (const row of l5_overlap) {
    if (tli_by_date[row.date] !== undefined) {
      aligned_dates.push(row.date);
      tli_levels.push(tli_by_date[row.date]);
      l5_levels.push(row.L5);
    }
  }

  log(`Aligned date pairs: ${aligned_dates.length}`);
  log('');

  // Level correlation
  const corr_levels = pearsonCorrelation(tli_levels, l5_levels);
  log(`**Level correlation (TLI vs FRED L5, 2014-2026)**: r = ${corr_levels.toFixed(4)}`);
  log('');

  // Compute 12-month differences from aligned series
  const tli_diffs = [];
  const l5_diffs = [];

  // Need to track positions for differencing
  // Strategy: difference each series in its own date order, then re-align
  // Since TLI may have different dates than L5, we need to use snapshot positions

  // Simpler approach: build series indexed by position, compute diff with i-12
  // But this requires equal spacing — use 12 positions back since data is monthly snapshots
  for (let i = 12; i < aligned_dates.length; i++) {
    tli_diffs.push(tli_levels[i] - tli_levels[i - 12]);
    l5_diffs.push(l5_levels[i] - l5_levels[i - 12]);
  }

  log(`12-month difference pairs: ${tli_diffs.length}`);
  log('');

  // Difference correlation
  const corr_diffs = pearsonCorrelation(tli_diffs, l5_diffs);
  log(`**12-month difference correlation (TLI vs FRED L5)**: r = ${corr_diffs.toFixed(4)}`);
  log('');

  // Compare
  log('**Correlation Comparison**:');
  log('');
  log('| Series       | Pearson r |');
  log('|--------------|-----------|');
  log(`| TLI vs L5 (levels)        | ${corr_levels.toFixed(4)} |`);
  log(`| TLI vs L5 (12-month diffs) | ${corr_diffs.toFixed(4)} |`);
  log('');

  // Interpretation
  log('**Interpretation**:');
  log('');
  if (corr_diffs > corr_levels + 0.15) {
    log(`✓ Difference correlation (${corr_diffs.toFixed(2)}) substantially HIGHER than level correlation (${corr_levels.toFixed(2)}).`);
    log('  → The two series share CYCLE-SCALE dynamics but differ in trend/level.');
    log('  → They measure the same underlying phenomenon with different baselines.');
    log('  → Interpretation (B): Measurement differences, not different constructs.');
  } else if (corr_diffs > 0.7) {
    log(`✓ High difference correlation (${corr_diffs.toFixed(2)}).`);
    log('  → The two series have similar cycle-scale dynamics.');
    log('  → They likely measure the same underlying phenomenon.');
    log('  → Interpretation (B): Same construct, different noise/scale.');
  } else if (corr_diffs > 0.4) {
    log(`⚠ Moderate difference correlation (${corr_diffs.toFixed(2)}).`);
    log('  → Partial overlap in cycle dynamics.');
    log('  → Some common signal but substantial unique variation.');
    log('  → Ambiguous interpretation — both A and B partially apply.');
  } else {
    log(`✗ Low difference correlation (${corr_diffs.toFixed(2)}).`);
    log('  → The two series have genuinely different cycle dynamics.');
    log('  → They measure different aspects of liquidity at cycle scale.');
    log('  → Interpretation (A): Different constructs, not just different noise.');
  }
  log('');

  // ─────────────────────────────────────────────────────────────────
  // FINAL VERDICT
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('FINAL VERDICT: TWO KEY NUMBERS');
  log('═'.repeat(70));
  log('');

  log(`**Number 1: λ₂ with TLI in 2014-2026 only**`);
  log(`  λ₂ = ${lambda2_tli_2014.toFixed(4)}`);
  log(`  λ_MP = ${lambda_mp.toFixed(4)}`);
  log(`  Second mode present? ${second_mode_present ? 'YES (exceeds threshold)' : 'NO (below threshold)'}`);
  log('');

  log(`**Number 2: Correlation of 12-month diffs (TLI vs FRED L5)**`);
  log(`  r = ${corr_diffs.toFixed(4)}`);
  log('');

  log('**Conference Narrative Decision Tree**:');
  log('');

  if (second_mode_present && corr_diffs > 0.7) {
    log('**NARRATIVE 1**: The Second Mode is Real (Both measures confirm)');
    log('');
    log('TLI confirms the second mode exists in 2014-2026 (λ₂ > MP).');
    log('TLI and FRED L5 share cycle dynamics (r > 0.7).');
    log('The mode is real but period-specific (not constitutive for 2006-2026).');
    log('Honest message: "Real mode in 2014-2026, requires more data to confirm long-run."');
  } else if (second_mode_present && corr_diffs <= 0.7) {
    log('**NARRATIVE 2**: TLI Independently Confirms a Different Mode');
    log('');
    log('TLI shows λ₂ > MP in 2014-2026 even though TLI ≠ FRED L5.');
    log('Two different liquidity measures both produce a second mode.');
    log('Strong support for real signal (not measurement artifact).');
    log('Window specificity remains a concern.');
  } else if (!second_mode_present && corr_diffs > 0.7) {
    log('**NARRATIVE 3**: FRED L5 Reconstruction Artifact');
    log('');
    log('TLI cannot reproduce second mode in same 2014-2026 window.');
    log('But TLI and FRED L5 share cycle dynamics at high level (r > 0.7).');
    log('The reconstruction methodology must be amplifying noise specific to L5.');
    log('Strong evidence the original mode was instrumental.');
  } else {
    log('**NARRATIVE 4**: Construct Specificity (TLI ≠ L5 fundamentally)');
    log('');
    log('TLI cannot reproduce second mode in 2014-2026.');
    log('TLI and FRED L5 do not share cycle dynamics (r < 0.7).');
    log('They measure different aspects of "liquidity."');
    log('Study 1 captured what FRED L5 measures; that pattern does not generalize.');
    log('Honest message: "Window-specific to FRED L5 methodology; not structural."');
  }
  log('');

  // Write output
  fs.writeFileSync(OUTPUT_FILE, output.join('\n'));
  console.log(`\n✓ Final diagnostic complete. Results written to ${OUTPUT_FILE}`);
}

main().catch(e => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
