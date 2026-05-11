#!/usr/bin/env node

/**
 * FRED L5 Component Cycle Decomposition vs TLI
 *
 * Fetches the 5 individual FRED L5 component series for 2014-2026:
 *   WALCL    — Fed total assets (weekly)
 *   TOTBKCR  — US bank credit (weekly)
 *   WRESBAL  — Reserve balances (weekly)
 *   COMPOUT  — Commercial paper outstanding (weekly)
 *   WRMFNS   — Retail money funds (weekly)
 *
 * For each component:
 *   Sample at monthly snapshot dates (first Wednesday)
 *   Compute 12-month differences
 *   Compute Pearson correlation with 12-month TLI differences
 *
 * This identifies which FRED L5 components carry the 64-month
 * eigenstructure cycle and how they relate to Howell's TLI.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.CYCLE_TOOLS_API_KEY || 'RiWeMaster2o23lKopxiq507w';
const CSV_TLI = path.join(__dirname, 'layer_scores_with_tli.csv');
const OUTPUT_FILE = path.join(__dirname, 'fred_l5_component_analysis.md');

// FRED L5 components with weekly tickers
const COMPONENTS = [
  { name: 'WALCL',   ticker: 'WALCL-W:FDS',   description: 'Fed total assets' },
  { name: 'TOTBKCR', ticker: 'TOTBKCR-W:FDS', description: 'US bank credit' },
  { name: 'WRESBAL', ticker: 'WRESBAL-W:FDS', description: 'Reserve balances' },
  { name: 'COMPOUT', ticker: 'COMPOUT-W:FDS', description: 'Commercial paper outstanding' },
  { name: 'WRMFNS',  ticker: 'WRMFNS-W:FDS',  description: 'Retail money funds' },
];

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

// ── API Fetch ──

async function getDatasetSeries(tickerId, unixTo) {
  const url = `https://api.cycle.tools/api/data/GetDatasetSeries?api_key=${API_KEY}&tickerid=${encodeURIComponent(tickerId)}&unixFrom=0&unixTo=${unixTo}&maxbars=0`;
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  try {
    return JSON.parse(text) || [];
  } catch (e) {
    throw new Error(`Parse error: ${text.substring(0, 100)}`);
  }
}

// ── Load TLI Dataset ──

function loadCSV_TLI(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      date: values[0],
      TLI: parseFloat(values[5]),
    };
  });
}

// ── Sample series at snapshot dates ──

function sampleAtDates(bars, snapshotDates) {
  // For each snapshot date, find the closest bar at or before that date
  const sampled = [];
  for (const targetDate of snapshotDates) {
    const targetTime = new Date(targetDate).getTime();
    let bestBar = null;
    for (const bar of bars) {
      if (!bar.date) continue;
      const barTime = new Date(bar.date).getTime();
      if (barTime <= targetTime) {
        if (!bestBar || new Date(bestBar.date).getTime() < barTime) {
          bestBar = bar;
        }
      }
    }
    sampled.push(bestBar ? bestBar.close : null);
  }
  return sampled;
}

// ── Main ──

let output = [];
function log(msg) {
  console.log(msg);
  output.push(msg);
}

async function main() {
  log('═'.repeat(70));
  log('FRED L5 COMPONENT CYCLE DECOMPOSITION vs TLI');
  log('═'.repeat(70));
  log('');

  // Load TLI data filtered to 2014-2026
  const data_tli = loadCSV_TLI(CSV_TLI).filter(d => d.date >= '2014-01-01');
  log(`TLI observations (2014-2026): ${data_tli.length}`);
  log(`Date range: ${data_tli[0].date} to ${data_tli[data_tli.length-1].date}`);
  log('');

  // Extract snapshot dates
  const snapshotDates = data_tli.map(d => d.date);
  const tli_levels = data_tli.map(d => d.TLI);

  // Compute 12-month TLI differences
  const tli_diffs = [];
  for (let i = 12; i < tli_levels.length; i++) {
    tli_diffs.push(tli_levels[i] - tli_levels[i - 12]);
  }
  log(`TLI 12-month differences: ${tli_diffs.length} observations`);
  log('');

  // Fetch each FRED L5 component
  const componentResults = [];
  const componentSeries = {};

  log('## Fetching FRED L5 Components');
  log('');

  for (const comp of COMPONENTS) {
    log(`Fetching ${comp.name} (${comp.ticker}) — ${comp.description}...`);

    try {
      // Fetch all data up to end of 2026
      const unixTo = Math.floor(new Date('2026-12-31').getTime() / 1000);
      const bars = await getDatasetSeries(comp.ticker, unixTo);

      log(`  Retrieved ${bars.length} bars`);

      // Sample at snapshot dates
      const sampled = sampleAtDates(bars, snapshotDates);
      const nonNull = sampled.filter(v => v !== null);
      log(`  Sampled at ${nonNull.length}/${snapshotDates.length} snapshot dates`);

      // Compute 12-month differences (only where both endpoints available)
      const comp_diffs = [];
      const tli_diffs_aligned = [];
      const sample_indices = [];

      for (let i = 12; i < sampled.length; i++) {
        if (sampled[i] !== null && sampled[i - 12] !== null) {
          comp_diffs.push(sampled[i] - sampled[i - 12]);
          tli_diffs_aligned.push(tli_levels[i] - tli_levels[i - 12]);
          sample_indices.push(i);
        }
      }

      log(`  Valid 12-month diff pairs: ${comp_diffs.length}`);

      // Correlation
      const corr_diffs = pearsonCorrelation(comp_diffs, tli_diffs_aligned);
      const corr_levels = pearsonCorrelation(
        sampled.filter((v, i) => v !== null).map(v => v),
        sampled.map((v, i) => v !== null ? tli_levels[i] : null).filter(v => v !== null)
      );

      log(`  Level corr with TLI: ${corr_levels.toFixed(4)}`);
      log(`  12-month diff corr with TLI: ${corr_diffs.toFixed(4)}`);
      log('');

      componentResults.push({
        name: comp.name,
        description: comp.description,
        corr_levels,
        corr_diffs,
        n_diff_pairs: comp_diffs.length,
        bars_count: bars.length,
      });

      componentSeries[comp.name] = { levels: sampled, diffs: comp_diffs };

    } catch (err) {
      log(`  ERROR: ${err.message}`);
      componentResults.push({
        name: comp.name,
        description: comp.description,
        error: err.message,
      });
    }
  }

  log('');
  log('═'.repeat(70));
  log('COMPONENT CORRELATIONS WITH TLI (2014-2026)');
  log('═'.repeat(70));
  log('');

  log('| Component | Description | Level r | 12mo Diff r | N |');
  log('|-----------|-------------|---------|-------------|---|');

  // Sort by abs(diff correlation) descending
  const valid = componentResults.filter(r => !r.error);
  valid.sort((a, b) => Math.abs(b.corr_diffs) - Math.abs(a.corr_diffs));

  for (const r of valid) {
    log(`| ${r.name} | ${r.description} | ${r.corr_levels.toFixed(4)} | ${r.corr_diffs.toFixed(4)} | ${r.n_diff_pairs} |`);
  }

  log('');

  // Compare to FRED L5 composite correlation (r=0.19 with TLI at cycle scale)
  log('**Reference**: FRED L5 composite vs TLI (12-month diffs): r = 0.1876');
  log('');

  // Identify highest and lowest
  if (valid.length > 0) {
    const highest = valid[0];
    const lowest = valid[valid.length - 1];

    log(`**Most correlated with TLI at cycle scale**: ${highest.name} (r=${highest.corr_diffs.toFixed(4)})`);
    log(`  → ${highest.description}`);
    log('');
    log(`**Least correlated with TLI at cycle scale**: ${lowest.name} (r=${lowest.corr_diffs.toFixed(4)})`);
    log(`  → ${lowest.description}`);
    log('');
  }

  // ─────────────────────────────────────────────────────────────────
  // INTERPRETATION
  // ─────────────────────────────────────────────────────────────────

  log('═'.repeat(70));
  log('INTERPRETATION');
  log('═'.repeat(70));
  log('');

  log('### Which FRED L5 components diverge most from TLI?');
  log('');

  // Components with very low diff correlation
  const low_corr = valid.filter(r => Math.abs(r.corr_diffs) < 0.3);
  const high_corr = valid.filter(r => Math.abs(r.corr_diffs) >= 0.3);

  log(`Components with |r_diff| < 0.3 (diverge from TLI): ${low_corr.length}/${valid.length}`);
  for (const r of low_corr) {
    log(`  - ${r.name} (r=${r.corr_diffs.toFixed(4)}): ${r.description}`);
  }
  log('');

  log(`Components with |r_diff| >= 0.3 (share dynamics with TLI): ${high_corr.length}/${valid.length}`);
  for (const r of high_corr) {
    log(`  - ${r.name} (r=${r.corr_diffs.toFixed(4)}): ${r.description}`);
  }
  log('');

  log('### What is FRED L5 capturing that TLI is not?');
  log('');
  log('The FRED L5 reconstruction combines US-specific monetary metrics:');
  log('  - WALCL: Fed balance sheet (US central bank policy)');
  log('  - TOTBKCR: US bank credit (US banking sector)');
  log('  - WRESBAL: US reserve balances (US monetary base)');
  log('  - COMPOUT: US commercial paper (US short-term funding)');
  log('  - WRMFNS: US retail money funds (US near-money)');
  log('');
  log('Howell\'s TLI measures GLOBAL liquidity flows:');
  log('  - Multi-currency, cross-border capital flows');
  log('  - Includes non-US central banks, sovereign debt cycles');
  log('  - Captures Eurodollar funding markets');
  log('  - Different aggregation methodology entirely');
  log('');
  log('At cycle scale, these are fundamentally different signals.');
  log('FRED L5 ≈ "US monetary policy footprint"');
  log('TLI     ≈ "Global liquidity availability"');
  log('');

  // Write output
  fs.writeFileSync(OUTPUT_FILE, output.join('\n'));
  console.log(`\n✓ Component analysis complete. Results: ${OUTPUT_FILE}`);
}

main().catch(e => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
