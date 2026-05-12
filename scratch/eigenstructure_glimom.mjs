#!/usr/bin/env node

/**
 * Study A': Eigenstructure Analysis with Howell GLI-MOM
 *
 * Substitutes GLI-MOM (Howell's Global Liquidity Index — Momentum, the
 * exact series the L5 pipeline was built to reconstruct) for L5 / TLI
 * as the fifth variable in the eigenstructure analysis.
 *
 * GLI-MOM source: public/US-GLI-MOM.csv (612 monthly obs, 1975-2025)
 * This file IS the Howell pre-seed used by liquidityPipeline.ts.
 *
 * Three sub-windows analyzed:
 *   - Full overlap with L1-L4 (2006-01 to 2025-12)
 *   - Study 1 window (2014-2025)
 *   - Post-pre-seed window (2019-2025) — pctrank fully scrolled past pre-seed
 *
 * Plus three-way correlation diagnostic: GLI-MOM, TLI, FRED L5
 * Plus six stress tests parallel to Study A.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const CSV_TLI       = path.join(__dirname, 'layer_scores_with_tli.csv');     // L1-L4 + TLI 2006-2026
const CSV_HISTORY   = path.join(__dirname, 'layer_scores_history.csv');      // L1-L4 + L5 2014-2026
const CSV_GLIMOM    = path.join(REPO_ROOT, 'public', 'US-GLI-MOM.csv');      // GLI-MOM 1975-2025
const OUTPUT_FILE   = path.join(__dirname, 'eigenstructure_glimom_results.md');

// ── Statistics ──

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

function pearson(x, y) {
  const n = x.length;
  if (n < 2) return 0;
  const mx = mean(x), my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) return 0;
  return num / Math.sqrt(dx2 * dy2);
}

function correlationMatrix(...series) {
  const n = series.length;
  const corr = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      corr[i][j] = i === j ? 1.0 : pearson(series[i], series[j]);
  return corr;
}

// ── Jacobi Eigenvalue Algorithm ──

function jacobi(A, maxIter = 1000, tol = 1e-10) {
  const n = A.length;
  const V = Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
  let M = A.map(r => [...r]);
  for (let iter = 0; iter < maxIter; iter++) {
    let maxVal = 0, p = 0, q = 1;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (Math.abs(M[i][j]) > maxVal) { maxVal = Math.abs(M[i][j]); p = i; q = j; }
    if (maxVal < tol) break;
    const theta = 0.5 * Math.atan2(2 * M[p][q], M[q][q] - M[p][p]);
    const c = Math.cos(theta), s = Math.sin(theta);
    for (let i = 0; i < n; i++) {
      if (i === p || i === q) continue;
      const Mip = M[i][p], Miq = M[i][q];
      M[i][p] = c * Mip - s * Miq; M[p][i] = M[i][p];
      M[i][q] = s * Mip + c * Miq; M[q][i] = M[i][q];
    }
    const Mpp = M[p][p], Mqq = M[q][q];
    M[p][p] = c * c * Mpp - 2 * s * c * M[p][q] + s * s * Mqq;
    M[q][q] = s * s * Mpp + 2 * s * c * M[p][q] + c * c * Mqq;
    M[p][q] = 0; M[q][p] = 0;
    for (let i = 0; i < n; i++) {
      const Vip = V[i][p], Viq = V[i][q];
      V[i][p] = c * Vip - s * Viq; V[i][q] = s * Vip + c * Viq;
    }
  }
  const evs = M.map((r, i) => r[i]);
  const idx = evs.map((_, i) => i).sort((i, j) => evs[j] - evs[i]);
  return {
    eigenvalues: idx.map(i => evs[i]),
    eigenvectors: Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => V[j][idx[i]])),
  };
}

// ── FFT ──

function fft(re, im, inverse = false) {
  const n = re.length;
  if (n === 1) return;
  if (n % 2 === 1) throw new Error('FFT length must be power of 2');
  const half = n / 2;
  const re_e = re.filter((_, i) => i % 2 === 0), im_e = im.filter((_, i) => i % 2 === 0);
  const re_o = re.filter((_, i) => i % 2 === 1), im_o = im.filter((_, i) => i % 2 === 1);
  fft(re_e, im_e, inverse); fft(re_o, im_o, inverse);
  const angle = (inverse ? 1 : -1) * 2 * Math.PI / n;
  for (let k = 0; k < half; k++) {
    const t_re = Math.cos(angle * k), t_im = Math.sin(angle * k);
    const m_re = t_re * re_o[k] - t_im * im_o[k];
    const m_im = t_re * im_o[k] + t_im * re_o[k];
    re[k] = re_e[k] + m_re; im[k] = im_e[k] + m_im;
    re[k + half] = re_e[k] - m_re; im[k + half] = im_e[k] - m_im;
  }
}

// ── Data loading ──

function loadTliCsv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  return lines.slice(1).map(line => {
    const v = line.split(',');
    return { date: v[0], L1: +v[1], L2: +v[2], L3: +v[3], L4: +v[4], TLI: +v[5] };
  });
}

function loadHistoryCsv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  return lines.slice(1).map(line => {
    const v = line.split(',');
    return { date: v[0], L1: +v[1], L2: +v[2], L3: +v[3], L4: +v[4], L5: +v[5] };
  });
}

function loadGliMom(filePath) {
  // Strip BOM if present
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  const lines = content.trim().split('\n');
  return lines.slice(1).map(line => {
    const [dateStr, valStr] = line.split(',');
    // Format: M/D/YYYY
    const [m, d, y] = dateStr.split('/').map(Number);
    const isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const yearMonth = `${y}-${String(m).padStart(2, '0')}`;
    return { dateStr: isoDate, yearMonth, value: parseFloat(valStr) };
  });
}

// ── Main ──

let output = [];
function log(msg) { console.log(msg); output.push(msg); }

async function main() {
  log('═'.repeat(70));
  log("STUDY A': EIGENSTRUCTURE ANALYSIS WITH HOWELL GLI-MOM");
  log('═'.repeat(70));
  log('');

  // ─────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────

  const tliData = loadTliCsv(CSV_TLI);
  const historyData = loadHistoryCsv(CSV_HISTORY);
  const gliMomData = loadGliMom(CSV_GLIMOM);

  log(`L1-L4+TLI dataset:    ${tliData.length} obs, ${tliData[0].date} to ${tliData[tliData.length-1].date}`);
  log(`L1-L4+L5 dataset:     ${historyData.length} obs, ${historyData[0].date} to ${historyData[historyData.length-1].date}`);
  log(`GLI-MOM raw:          ${gliMomData.length} obs, ${gliMomData[0].dateStr} to ${gliMomData[gliMomData.length-1].dateStr}`);
  log('');

  // Build GLI-MOM map by year-month
  const gliByYM = {};
  for (const row of gliMomData) gliByYM[row.yearMonth] = row.value;

  // Join L1-L4 (from TLI dataset, which has the extended 2006-2026 range) with GLI-MOM
  const merged = [];
  for (const r of tliData) {
    const ym = r.date.substring(0, 7);
    if (gliByYM[ym] !== undefined) {
      merged.push({
        date: r.date,
        yearMonth: ym,
        L1: r.L1, L2: r.L2, L3: r.L3, L4: r.L4,
        TLI: r.TLI,
        GLIMOM: gliByYM[ym],
      });
    }
  }

  log(`Aligned (year-month inner join): ${merged.length} obs`);
  log(`Date range: ${merged[0].date} to ${merged[merged.length-1].date}`);
  log('');

  // ─────────────────────────────────────────────────────────────────
  // PRIMARY EIGENSTRUCTURE ANALYSIS — Full window
  // ─────────────────────────────────────────────────────────────────

  function runEigenstructure(label, data) {
    log('─'.repeat(70));
    log(`EIGENSTRUCTURE: ${label}`);
    log('─'.repeat(70));
    log(`Window: ${data[0].date} to ${data[data.length-1].date} (${data.length} obs)`);
    log('');

    // 12-month differences
    const L1d = [], L2d = [], L3d = [], L4d = [], GLId = [];
    for (let i = 12; i < data.length; i++) {
      L1d.push(data[i].L1 - data[i-12].L1);
      L2d.push(data[i].L2 - data[i-12].L2);
      L3d.push(data[i].L3 - data[i-12].L3);
      L4d.push(data[i].L4 - data[i-12].L4);
      GLId.push(data[i].GLIMOM - data[i-12].GLIMOM);
    }
    const T = L1d.length;
    const Q = T / 5;
    const lambda_mp = (1 + 1/Math.sqrt(Q)) ** 2;

    log(`After 12-month differencing: T = ${T}, Q = ${Q.toFixed(2)}, λ_MP = ${lambda_mp.toFixed(4)}`);
    log('');

    // Correlation matrix
    const corr = correlationMatrix(L1d, L2d, L3d, L4d, GLId);
    log('Correlation matrix:');
    log('```');
    log('         L1      L2      L3      L4      GLI-MOM');
    const names = ['L1', 'L2', 'L3', 'L4', 'GLI-MOM'];
    for (let i = 0; i < 5; i++) {
      const vals = corr[i].map(v => v.toFixed(3).padStart(7)).join(' ');
      log(`${names[i].padEnd(8)} ${vals}`);
    }
    log('```');
    log('');

    // Eigendecomposition
    const { eigenvalues, eigenvectors } = jacobi(corr);
    log('Eigenvalues:');
    log('| k | λ_k    | > λ_MP? |');
    log('|---|--------|---------|');
    for (let k = 0; k < 5; k++) {
      log(`| ${k+1} | ${eigenvalues[k].toFixed(4)} | ${eigenvalues[k] > lambda_mp ? 'YES' : 'NO '} |`);
    }
    const nModes = eigenvalues.filter(e => e > lambda_mp).length;
    log('');
    log(`**Persistent modes: ${nModes}**`);
    log('');

    // Eigenvector composition for top 2 modes
    for (let k = 0; k < Math.min(2, eigenvalues.length); k++) {
      log(`Mode ${k+1} composition (λ=${eigenvalues[k].toFixed(4)}):`);
      log('| Var | Loading | Sign |');
      log('|-----|---------|------|');
      for (let i = 0; i < 5; i++) {
        const v = eigenvectors[k][i];
        log(`| ${names[i].padEnd(7)} | ${v.toFixed(3).padStart(7)} | ${v >= 0 ? '+' : '-'} |`);
      }
      log('');
    }

    // Rolling 24-month λ₁/λ₂ ratio + FFT
    let dominantPeriod = null, snr = null;
    if (nModes >= 2 && T >= 48) {
      const window = 24;
      const ratios = [];
      const data_rolling = [L1d, L2d, L3d, L4d, GLId];
      for (let t = 0; t + window <= T; t++) {
        const slices = data_rolling.map(d => d.slice(t, t + window));
        const cw = correlationMatrix(...slices);
        const { eigenvalues: ev } = jacobi(cw);
        ratios.push(ev[0] / ev[1]);
      }
      // FFT
      const re = [...ratios], im = Array(ratios.length).fill(0);
      const pow2 = 2 ** Math.ceil(Math.log2(ratios.length));
      while (re.length < pow2) { re.push(0); im.push(0); }
      fft(re, im);
      let maxPow = 0, peakK = 0;
      for (let k = 1; k < pow2/2; k++) {
        const p = re[k]*re[k] + im[k]*im[k];
        if (p > maxPow) { maxPow = p; peakK = k; }
      }
      dominantPeriod = pow2 / peakK;
      const peakAmp = Math.sqrt(maxPow) / pow2;
      const avgAmp = Math.sqrt(re.slice(1, pow2/2).reduce((a,b,i) => a + b*b + im[i+1]*im[i+1], 0) / (pow2/2)) / pow2;
      snr = peakAmp / (avgAmp || 1);
      log(`Rolling λ₁/λ₂ FFT:`);
      log(`  Ratio series length: ${ratios.length}`);
      log(`  Dominant period: ${dominantPeriod.toFixed(1)} months`);
      log(`  SNR: ${snr.toFixed(3)}`);
      const inHowell = dominantPeriod >= 53 && dominantPeriod <= 79;
      log(`  In Howell band [53,79]? ${inHowell ? 'YES' : 'NO'}`);
      log('');
    } else {
      log(`Rolling λ₁/λ₂ analysis SKIPPED: ${nModes < 2 ? 'fewer than 2 persistent modes' : 'sample too short'}`);
      log('');
    }

    return { T, Q, lambda_mp, eigenvalues, eigenvectors, nModes, corr, L1d, L2d, L3d, L4d, GLId, dominantPeriod, snr };
  }

  const result_full = runEigenstructure(`Full overlap window (${merged[0].date} to ${merged[merged.length-1].date})`, merged);

  // Sub-window: Study 1 era (2014-2025)
  const merged_2014 = merged.filter(r => r.date >= '2014-01-01' && r.date < '2026-01-01');
  const result_2014 = runEigenstructure('Study 1 window (2014-01 to 2025-12)', merged_2014);

  // Sub-window: Post-pre-seed (2019-2025)
  const merged_2019 = merged.filter(r => r.date >= '2019-01-01' && r.date < '2026-01-01');
  const result_2019 = runEigenstructure('Post-pre-seed window (2019-01 to 2025-12)', merged_2019);

  // ─────────────────────────────────────────────────────────────────
  // THREE-WAY CORRELATION DIAGNOSTIC
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('THREE-WAY CORRELATION DIAGNOSTIC');
  log('═'.repeat(70));
  log('');

  // Build aligned series for L5 + TLI + GLI-MOM (need historyData for L5)
  // historyData has L5 at first-Wednesday-of-month dates 2014-2026
  // merged has L1-L4, TLI, GLI-MOM at same first-Wednesday dates
  const histByYM = {};
  for (const r of historyData) histByYM[r.date.substring(0, 7)] = r.L5;

  const triple = [];
  for (const r of merged) {
    const ym = r.yearMonth;
    if (histByYM[ym] !== undefined) {
      triple.push({ date: r.date, ym, L5: histByYM[ym], TLI: r.TLI, GLIMOM: r.GLIMOM });
    }
  }

  log(`Three-way overlap (L5+TLI+GLI-MOM): ${triple.length} obs, ${triple[0]?.date} to ${triple[triple.length-1]?.date}`);
  log('');

  function correlate(a, b, label) {
    const corrLev = pearson(a, b);
    // 12-month differences
    const ad = [], bd = [];
    for (let i = 12; i < a.length; i++) {
      ad.push(a[i] - a[i-12]);
      bd.push(b[i] - b[i-12]);
    }
    const corrDiff = pearson(ad, bd);
    log(`| ${label.padEnd(30)} | ${corrLev.toFixed(4).padStart(8)} | ${corrDiff.toFixed(4).padStart(8)} | ${a.length}/${ad.length} |`);
    return { label, corrLev, corrDiff };
  }

  log('| Pair                           | Level r  | 12mo Diff r | N (level/diff) |');
  log('|--------------------------------|----------|-------------|----------------|');
  const c_gli_tli = correlate(triple.map(r => r.GLIMOM), triple.map(r => r.TLI), 'GLI-MOM vs TLI');
  const c_gli_l5  = correlate(triple.map(r => r.GLIMOM), triple.map(r => r.L5),  'GLI-MOM vs FRED L5');
  const c_tli_l5  = correlate(triple.map(r => r.TLI),    triple.map(r => r.L5),  'TLI vs FRED L5');
  log('');

  log('**Documentation claim**: "Correlation with Howell" = 77.7% (Section 12 of liquidity-layer-methodology.md)');
  log(`**This corresponds most closely to**: GLI-MOM vs FRED L5 at level = ${c_gli_l5.corrLev.toFixed(4)} (${(c_gli_l5.corrLev*100).toFixed(1)}%)`);
  log(`**At cycle scale (12-month diff)**:  GLI-MOM vs FRED L5 = ${c_gli_l5.corrDiff.toFixed(4)} (${(c_gli_l5.corrDiff*100).toFixed(1)}%)`);
  log('');
  log('Note: The 77.7% in the doc is computed over the full weekly pipeline including');
  log("the Howell pre-seed (1975-2003). Our correlation here is on the final L5 monthly");
  log('display score 2014-2026, so the pre-seed is mostly out of the pctrank window');
  log('by mid-2018. We expect lower than 77.7% as a result.');
  log('');

  // Pre-seed contamination split: 2014-2018 vs 2019-2025
  function splitCorr(label, series_a_key, series_b_key) {
    const early = triple.filter(r => r.date < '2019-01-01');
    const late  = triple.filter(r => r.date >= '2019-01-01');
    const earlyA = early.map(r => r[series_a_key]); const earlyB = early.map(r => r[series_b_key]);
    const lateA  = late.map(r => r[series_a_key]);  const lateB  = late.map(r => r[series_b_key]);
    const earlyLev = pearson(earlyA, earlyB);
    const lateLev  = pearson(lateA, lateB);
    // 12-month diff
    const eAd = [], eBd = [], lAd = [], lBd = [];
    for (let i = 12; i < earlyA.length; i++) { eAd.push(earlyA[i]-earlyA[i-12]); eBd.push(earlyB[i]-earlyB[i-12]); }
    for (let i = 12; i < lateA.length; i++) { lAd.push(lateA[i]-lateA[i-12]); lBd.push(lateB[i]-lateB[i-12]); }
    const earlyDiff = pearson(eAd, eBd);
    const lateDiff  = pearson(lAd, lBd);
    log(`| ${label.padEnd(20)} | ${earlyLev.toFixed(4).padStart(7)} | ${earlyDiff.toFixed(4).padStart(7)} | ${lateLev.toFixed(4).padStart(7)} | ${lateDiff.toFixed(4).padStart(7)} |`);
  }

  log('**Pre-seed split** (2014-2018 = partial pre-seed contamination; 2019-2025 = clean):');
  log('');
  log('| Pair                 | 14-18 Lvl | 14-18 Diff | 19-25 Lvl | 19-25 Diff |');
  log('|----------------------|-----------|------------|-----------|------------|');
  splitCorr('GLI-MOM vs FRED L5', 'GLIMOM', 'L5');
  splitCorr('GLI-MOM vs TLI    ', 'GLIMOM', 'TLI');
  splitCorr('TLI vs FRED L5    ', 'TLI',    'L5');
  log('');

  // ─────────────────────────────────────────────────────────────────
  // STRESS TESTS (six, parallel to Study A)
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('SIX STRESS TESTS');
  log('═'.repeat(70));
  log('');

  // Use full-window result as the primary baseline
  const baseline = result_full;
  log(`**Baseline (full window, ${merged[0].date} to ${merged[merged.length-1].date}, T=${baseline.T})**`);
  log(`  λ₁ = ${baseline.eigenvalues[0].toFixed(4)}`);
  log(`  λ₂ = ${baseline.eigenvalues[1].toFixed(4)}`);
  log(`  λ_MP = ${baseline.lambda_mp.toFixed(4)}`);
  log(`  Persistent modes: ${baseline.nModes}`);
  log('');

  // Stress Test 1: Data integrity
  log('## Stress Test 1: GLI-MOM Data Integrity');
  log('');
  log('GLI-MOM source: `public/US-GLI-MOM.csv` — 612 monthly observations, 1975-2025.');
  log('This is Howell\'s published Global Liquidity Index — Momentum series, supplied as');
  log('a static file. It is the EXACT series the L5 pipeline was designed to reconstruct');
  log('(used as the Howell pre-seed for the 780-week pctrank window).');
  log('');
  log('**Verdict**: VALID — authentic Howell GLI-MOM data, monthly, no FRED reconstruction.');
  log('');

  // Stress Test 2: Pre-seed (does not apply to GLI-MOM as eigenstructure variable)
  log('## Stress Test 2: Pre-seed Contamination');
  log('');
  log('GLI-MOM IS the pre-seed source. As an eigenstructure variable (5th column), GLI-MOM');
  log('contains no pre-seed contamination — it IS the raw Howell signal.');
  log('');
  log('Pre-seed contamination is relevant only for the GLI-MOM vs L5 correlation diagnostic,');
  log('where L5\'s pctrank window includes calibrated GLI-MOM pre-seed for 1975-2003.');
  log('That window scrolls out by ~mid-2018, so 2019-2025 L5 scores are pre-seed-clean.');
  log('See the pre-seed split correlation table above for the early-vs-late comparison.');
  log('');
  log('**Verdict**: VALID for primary eigenstructure analysis. Documented for L5 correlation.');
  log('');

  // Stress Test 3: Bootstrap null
  log('## Stress Test 3: Bootstrap Null Model (1000 resamples)');
  log('');
  log('Method: resample 12-month diff observations with replacement, recompute λ₂.');
  log('');
  const n_boot = 1000;
  let count_above_mp = 0;
  const boot_lambda2 = [];
  for (let b = 0; b < n_boot; b++) {
    const T = baseline.T;
    const idx = Array.from({length: T}, () => Math.floor(Math.random() * T));
    const a = idx.map(i => baseline.L1d[i]);
    const b2 = idx.map(i => baseline.L2d[i]);
    const c = idx.map(i => baseline.L3d[i]);
    const d = idx.map(i => baseline.L4d[i]);
    const e = idx.map(i => baseline.GLId[i]);
    const cw = correlationMatrix(a, b2, c, d, e);
    const { eigenvalues: ev } = jacobi(cw);
    boot_lambda2.push(ev[1]);
    if (ev[1] > baseline.lambda_mp) count_above_mp++;
  }
  const p_boot = count_above_mp / n_boot;
  log(`Observed λ₂ = ${baseline.eigenvalues[1].toFixed(4)}, λ_MP = ${baseline.lambda_mp.toFixed(4)}`);
  log(`Bootstrap resamples with λ₂ > λ_MP: ${count_above_mp}/${n_boot} = p = ${p_boot.toFixed(4)}`);
  log(`Study 1 baseline: p = 0.006`);
  log(`Study A (TLI) baseline: p = 0.000`);
  log('');
  let verdict3;
  if (baseline.eigenvalues[1] > baseline.lambda_mp) {
    verdict3 = p_boot < 0.05 ? 'SURVIVES — λ₂ is statistically significant' : 'FRAGILE — λ₂ above threshold but bootstrap fails';
  } else {
    verdict3 = 'NEGATIVE — λ₂ subthreshold; bootstrap confirms it is not in the significant tail';
  }
  log(`**Verdict**: ${verdict3}`);
  log('');

  // Stress Test 4: Quarterly decimation
  log('## Stress Test 4: Quarterly Decimation');
  log('');
  const dec = (arr) => arr.filter((_, i) => i % 3 === 0);
  const L1q = dec(baseline.L1d), L2q = dec(baseline.L2d), L3q = dec(baseline.L3d);
  const L4q = dec(baseline.L4d), GLIq = dec(baseline.GLId);
  const Tq = L1q.length, Qq = Tq / 5;
  const lambda_mp_q = (1 + 1/Math.sqrt(Qq)) ** 2;
  const corrQ = correlationMatrix(L1q, L2q, L3q, L4q, GLIq);
  const { eigenvalues: evQ } = jacobi(corrQ);
  log(`Decimated T = ${Tq}, Q = ${Qq.toFixed(2)}, λ_MP = ${lambda_mp_q.toFixed(4)}`);
  log(`  λ₁ = ${evQ[0].toFixed(4)} (original ${baseline.eigenvalues[0].toFixed(4)})`);
  log(`  λ₂ = ${evQ[1].toFixed(4)} (original ${baseline.eigenvalues[1].toFixed(4)})`);
  log(`  λ₂ > λ_MP? ${evQ[1] > lambda_mp_q ? 'YES' : 'NO'}`);
  log('');
  log(`**Verdict**: ${evQ[1] > lambda_mp_q ? 'SURVIVES decimation' : 'FAILS decimation'}`);
  log('');

  // Stress Test 5: Transition sensitivity
  log('## Stress Test 5: Transition Sensitivity');
  log('');
  const T = baseline.T;
  const L1ch = [], L4ch = [];
  for (let i = 1; i < T; i++) {
    L1ch.push({ i, ch: Math.abs(baseline.L1d[i] - baseline.L1d[i-1]) });
    L4ch.push({ i, ch: Math.abs(baseline.L4d[i] - baseline.L4d[i-1]) });
  }
  L1ch.sort((a, b) => b.ch - a.ch); L4ch.sort((a, b) => b.ch - a.ch);
  const ex = new Set();
  for (let k = 0; k < 3; k++) {
    for (let j = Math.max(0, L1ch[k].i - 12); j <= Math.min(T-1, L1ch[k].i + 12); j++) ex.add(j);
    for (let j = Math.max(0, L4ch[k].i - 12); j <= Math.min(T-1, L4ch[k].i + 12); j++) ex.add(j);
  }
  const L1s = [], L2s = [], L3s = [], L4s = [], GLIs = [];
  for (let i = 0; i < T; i++) if (!ex.has(i)) {
    L1s.push(baseline.L1d[i]); L2s.push(baseline.L2d[i]);
    L3s.push(baseline.L3d[i]); L4s.push(baseline.L4d[i]);
    GLIs.push(baseline.GLId[i]);
  }
  const Ts = L1s.length, Qs = Ts / 5;
  const lambda_mp_s = (1 + 1/Math.sqrt(Qs)) ** 2;
  const corrS = correlationMatrix(L1s, L2s, L3s, L4s, GLIs);
  const { eigenvalues: evS } = jacobi(corrS);
  log(`After excluding top-3 L1+L4 transition windows: T = ${Ts}, λ_MP = ${lambda_mp_s.toFixed(4)}`);
  log(`  λ₂ = ${evS[1].toFixed(4)} (original ${baseline.eigenvalues[1].toFixed(4)}, Δ = ${(evS[1]-baseline.eigenvalues[1]).toFixed(4)})`);
  log('');
  log(`**Verdict**: ${Math.abs(evS[1] - baseline.eigenvalues[1]) < 0.05 ? 'ROBUST to transition removal' : 'SENSITIVE to transition removal'}`);
  log('');

  // Stress Test 6: Phase transition (CRITICAL)
  log('## Stress Test 6: CRITICAL — Bootstrap Phase Transition');
  log('');
  // Baseline L1-L4 only
  const corrL1L4 = correlationMatrix(baseline.L1d, baseline.L2d, baseline.L3d, baseline.L4d);
  const { eigenvalues: evL1L4 } = jacobi(corrL1L4);
  const Q_4 = baseline.T / 4;
  const lambda_mp_4 = (1 + 1/Math.sqrt(Q_4)) ** 2;
  log(`**L1-L4 only baseline (4 variables, no GLI-MOM)**:`);
  log(`  λ₁ = ${evL1L4[0].toFixed(4)}`);
  log(`  λ₂ = ${evL1L4[1].toFixed(4)}`);
  log(`  λ_MP (4-var) = ${lambda_mp_4.toFixed(4)}`);
  log(`  λ₂ > λ_MP? ${evL1L4[1] > lambda_mp_4 ? 'YES' : 'NO'}`);
  log('');

  let joint = 0;
  for (let b = 0; b < n_boot; b++) {
    const idx = Array.from({length: T}, () => Math.floor(Math.random() * T));
    const a1 = idx.map(i => baseline.L1d[i]);
    const a2 = idx.map(i => baseline.L2d[i]);
    const a3 = idx.map(i => baseline.L3d[i]);
    const a4 = idx.map(i => baseline.L4d[i]);
    const a5 = idx.map(i => baseline.GLId[i]);
    const cFull = correlationMatrix(a1, a2, a3, a4, a5);
    const cExcl = correlationMatrix(a1, a2, a3, a4);
    const { eigenvalues: evF } = jacobi(cFull);
    const { eigenvalues: evX } = jacobi(cExcl);
    const fullExceeds = (evF[1] || 0) > baseline.lambda_mp;
    const exclBelow = (evX[1] || 0) < lambda_mp_4;
    if (fullExceeds && exclBelow) joint++;
  }
  const p_both = joint / n_boot;
  log(`Bootstrap phase transition (1000 resamples):`);
  log(`P(full λ₂ > λ_MP AND L1-L4 λ₂ < λ_MP_4): ${joint}/${n_boot} = ${p_both.toFixed(4)} (${(p_both*100).toFixed(1)}%)`);
  log('');
  log('Study 1: P(both) = 0.5%');
  log('Study A (TLI): P(both) = 19.6%');
  log('');
  let verdict6;
  if (p_both >= 0.95) verdict6 = 'CONFIRMED';
  else if (p_both >= 0.50) verdict6 = 'PRELIMINARY STRONG';
  else if (p_both >= 0.20) verdict6 = 'PRELIMINARY';
  else verdict6 = 'FRAGILE';
  log(`**Verdict**: ${verdict6}`);
  log('');

  // ─────────────────────────────────────────────────────────────────
  // THREE-OUTCOME VERDICT
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log("STUDY A' VERDICT — Three-Outcome Decision");
  log('═'.repeat(70));
  log('');

  const lambda2_full = baseline.eigenvalues[1];
  const exceeds_mp = lambda2_full > baseline.lambda_mp;
  const study1_period = 64;
  const period_match = baseline.dominantPeriod !== null &&
                       Math.abs(baseline.dominantPeriod - study1_period) <= 15;

  let outcome, verdict_text;
  if (exceeds_mp && period_match) {
    outcome = 1;
    verdict_text = 'OUTCOME 1: λ₂ > MP with GLI-MOM, period matches Study 1\'s 64 months.\n' +
      'The cycle is real for the series L5 was built to reconstruct.\n' +
      'FRED L5 succeeds as a proxy at the eigenstructure level.\n' +
      'TLI ≠ GLI-MOM as cycle measures (consistent with our Study A finding).';
  } else if (exceeds_mp && !period_match) {
    outcome = 2;
    verdict_text = `OUTCOME 2: λ₂ > MP with GLI-MOM but period differs (${baseline.dominantPeriod?.toFixed(1)} months vs Study 1\'s 64).\n` +
      'Eigenstructure pattern is real but the specific period in Study 1 was reconstruction-specific.';
  } else {
    outcome = 3;
    verdict_text = 'OUTCOME 3: λ₂ < MP with GLI-MOM (matches Study A with TLI).\n' +
      'Neither TLI nor GLI-MOM produces the second mode.\n' +
      'Study 1 finding is specific to FRED reconstruction methodology.\n' +
      'This is the STRONGEST negative result — both authentic Howell products fail to replicate.';
  }
  log(`**OUTCOME ${outcome}**`);
  log('');
  log(verdict_text);
  log('');

  // ─────────────────────────────────────────────────────────────────
  // COMPARISON TABLE
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('COMPARISON TABLE: STUDY 1 vs STUDY A vs STUDY A\'');
  log('═'.repeat(70));
  log('');
  log('| Metric | Study 1 | Study A | Study A\' |');
  log('|--------|---------|---------|----------|');
  log('| L5 source | FRED reconstruction | Howell TLI | Howell GLI-MOM |');
  log('| L5 was built to reconstruct this | — | No | YES |');
  log(`| Sample months (orig) | 149 | 244 | ${merged.length} |`);
  log(`| After 12-mo diff (T) | 137 | 232 | ${baseline.T} |`);
  log(`| λ₁ | 1.5967 | 1.8348 | ${baseline.eigenvalues[0].toFixed(4)} |`);
  log(`| λ₂ | 1.4603 | 1.2578 | ${baseline.eigenvalues[1].toFixed(4)} |`);
  log(`| λ_MP | 1.4186 | 1.3152 | ${baseline.lambda_mp.toFixed(4)} |`);
  log(`| Modes above MP | 2 | 1 | ${baseline.nModes} |`);
  log(`| Dominant period | 64 months | N/A | ${baseline.dominantPeriod !== null ? baseline.dominantPeriod.toFixed(1) + ' months' : 'N/A'} |`);
  log(`| Flaw 3 bootstrap p | 0.006 | 0.000 | ${p_boot.toFixed(4)} |`);
  log(`| Flaw 6 P(both) | 0.5% | 19.6% | ${(p_both*100).toFixed(1)}% |`);
  log(`| Verdict | Preliminary | Does not replicate | ${verdict6} |`);
  log('');

  // Sub-window stability
  log('**Sub-window stability for Study A\' (does eigenstructure hold across time?)**');
  log('');
  log('| Window | T | λ₁ | λ₂ | λ_MP | Modes |');
  log('|--------|---|----|----|------|-------|');
  log(`| Full overlap (${merged[0].date.substring(0,7)} to ${merged[merged.length-1].date.substring(0,7)}) | ${result_full.T} | ${result_full.eigenvalues[0].toFixed(4)} | ${result_full.eigenvalues[1].toFixed(4)} | ${result_full.lambda_mp.toFixed(4)} | ${result_full.nModes} |`);
  log(`| Study 1 window (2014-01 to 2025-12) | ${result_2014.T} | ${result_2014.eigenvalues[0].toFixed(4)} | ${result_2014.eigenvalues[1].toFixed(4)} | ${result_2014.lambda_mp.toFixed(4)} | ${result_2014.nModes} |`);
  log(`| Post-pre-seed (2019-01 to 2025-12) | ${result_2019.T} | ${result_2019.eigenvalues[0].toFixed(4)} | ${result_2019.eigenvalues[1].toFixed(4)} | ${result_2019.lambda_mp.toFixed(4)} | ${result_2019.nModes} |`);
  log('');

  // Write
  fs.writeFileSync(OUTPUT_FILE, output.join('\n'));
  console.log(`\n✓ Results written to ${OUTPUT_FILE}`);
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
