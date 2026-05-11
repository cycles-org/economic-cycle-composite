#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ══════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════

const API_KEY = process.env.CYCLE_TOOLS_API_KEY || '';
const MIN_CALL_GAP_MS = 0; // No rate limiting (unlimited key)
const RETRY_WAIT_MS = 65000; // Wait before retry on error
const OUTPUT_FILE = path.join(__dirname, 'l1l4_2006_2013.csv');

// L1-L4 series only (no L5) — with correct ticker IDs including frequency suffixes
const SERIES_REGISTRY = {
  L1: [
    { fredId: 'T10Y2Y', tickerId: 'T10Y2Y:FDS', layer: 1, invert: false, weight: 0.100 },
    { fredId: 'T10Y3M', tickerId: 'T10Y3M:FDS', layer: 1, invert: false, weight: 0.100 },
    { fredId: 'ICSA', tickerId: 'ICSA-W:FDS', layer: 1, invert: true, weight: 0.253 },
    { fredId: 'CCSA', tickerId: 'CCSA-W:FDS', layer: 1, invert: true, weight: 1.500 },
    { fredId: 'UMCSENT', tickerId: 'UMCSENT-M:FDS', layer: 1, invert: false, weight: 1.500 },
    { fredId: 'USSLIND', tickerId: 'USSLIND-M:FDS', layer: 1, invert: false, weight: 0.600 },
    { fredId: 'PERMIT', tickerId: 'PERMIT-M:FDS', layer: 1, invert: false, weight: 0.400 },
    { fredId: 'DGORDER', tickerId: 'DGORDER-M:FDS', layer: 1, invert: false, weight: 0.800 },
    { fredId: 'JTSJOL', tickerId: 'JTSJOL-M:FDS', layer: 1, invert: false, weight: 0.896 },
  ],
  L2: [
    { fredId: 'INDPRO', tickerId: 'INDPRO-M:FDS', layer: 2, invert: false, weight: 1.000 },
    { fredId: 'PAYEMS', tickerId: 'PAYEMS-M:FDS', layer: 2, invert: false, weight: 0.500 },
    { fredId: 'DSPIC96', tickerId: 'DSPIC96-M:FDS', layer: 2, invert: false, weight: 0.400 },
    { fredId: 'UNRATE', tickerId: 'UNRATE-M:FDS', layer: 2, invert: true, weight: 0.600 },
  ],
  L3: [
    { fredId: 'VIXCLS', tickerId: 'VIXCLS:FDS', layer: 3, invert: true, weight: 0.100 },
    { fredId: 'STLFSI4', tickerId: 'STLFSI4-W:FDS', layer: 3, invert: true, weight: 0.100 },
    { fredId: 'BAA10Y', tickerId: 'BAA10Y:FDS', layer: 3, invert: true, weight: 1.500 },
    { fredId: 'BAMLH0A0HYM2', tickerId: 'BAMLH0A0HYM2:FDS', layer: 3, invert: true, weight: 1.349 },
  ],
  L4: [
    { fredId: 'DFF', tickerId: 'DFF:FDS', layer: 4, invert: true, weight: 0.301 },
    { fredId: 'T5YIE', tickerId: 'T5YIE:FDS', layer: 4, invert: false, weight: 1.500 },
    { fredId: 'CPIAUCSL', tickerId: 'CPIAUCSL-M:FDS', layer: 4, invert: true, weight: 0.400 },
    { fredId: 'CPILFESL', tickerId: 'CPILFESL-M:FDS', layer: 4, invert: true, weight: 0.307 },
    { fredId: 'M2SL', tickerId: 'M2SL-M:FDS', layer: 4, invert: false, weight: 0.100 },
    { fredId: 'DTWEXBGS', tickerId: 'DTWEXBGS:FDS', layer: 4, invert: true, weight: 0.100 },
  ],
};

const allSeries = [...SERIES_REGISTRY.L1, ...SERIES_REGISTRY.L2, ...SERIES_REGISTRY.L3, ...SERIES_REGISTRY.L4];

// ══════════════════════════════════════════════════════════════════════
// GENERATE SNAPSHOT DATES
// ══════════════════════════════════════════════════════════════════════

function getFirstWednesday(year, month) {
  let date = new Date(year, month - 1, 1);
  const dayOfWeek = date.getDay();
  let daysUntilWed = (3 - dayOfWeek + 7) % 7;
  if (daysUntilWed === 0) daysUntilWed = 7;
  date.setDate(1 + daysUntilWed);
  return date.toISOString().split('T')[0];
}

const snapshotDates = [];
for (let year = 2006; year <= 2013; year++) {
  for (let month = 1; month <= 12; month++) {
    snapshotDates.push(getFirstWednesday(year, month));
  }
}

console.log(`Generated ${snapshotDates.length} snapshot dates (2006-01 to 2013-12)`);
console.log(`First 5: ${snapshotDates.slice(0, 5).join(', ')}`);
console.log(`API calls: ${snapshotDates.length} snapshots × ${allSeries.length} series = ${snapshotDates.length * allSeries.length}`);

// ══════════════════════════════════════════════════════════════════════
// CYCLE TOOLS API
// ══════════════════════════════════════════════════════════════════════

async function getDatasetSeries(tickerId, unixTo) {
  const url = `https://api.cycle.tools/api/data/GetDatasetSeries?api_key=${API_KEY}&tickerid=${encodeURIComponent(tickerId)}&unixFrom=0&unixTo=${unixTo}&maxbars=0`;

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  try {
    const bars = JSON.parse(text);
    return bars || [];
  } catch (e) {
    throw new Error(`Failed to parse response: ${text.substring(0, 100)}`);
  }
}

// ══════════════════════════════════════════════════════════════════════
// PHASE SCORING (from original export_layer_scores.mjs)
// ══════════════════════════════════════════════════════════════════════

function computeScore(closes, invert) {
  if (closes.length < 20) return 50;

  const recent = closes.slice(-20);
  const older = closes.slice(-40, -20);

  const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b) / older.length;

  const change = ((recentAvg - olderAvg) / olderAvg) * 100;
  const score = Math.max(0, Math.min(100, 50 + change * 2));

  return invert ? 100 - score : score;
}

// ══════════════════════════════════════════════════════════════════════
// READ LAST COMPLETED DATE
// ══════════════════════════════════════════════════════════════════════

function getLastCompletedDate() {
  if (!fs.existsSync(OUTPUT_FILE)) return null;

  const lines = fs.readFileSync(OUTPUT_FILE, 'utf-8').trim().split('\n');
  if (lines.length < 2) return null;

  const lastLine = lines[lines.length - 1];
  const parts = lastLine.split(',');
  return parts[0];
}

// ══════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════

async function runExport() {
  const lastDate = getLastCompletedDate();
  const startIdx = lastDate ? snapshotDates.indexOf(lastDate) + 1 : 0;

  if (startIdx >= snapshotDates.length) {
    console.log('✓ Export already complete');
    return;
  }

  const remainingSnapshots = snapshotDates.slice(startIdx);
  console.log(`\nResuming from ${lastDate || 'start'}`);
  console.log(`Remaining snapshots: ${remainingSnapshots.length}/${snapshotDates.length}`);

  // Initialize or append to CSV
  const fileExists = fs.existsSync(OUTPUT_FILE);
  if (!fileExists) {
    fs.writeFileSync(OUTPUT_FILE, 'date,L1_score,L2_score,L3_score,L4_score\n');
  }

  let snapshotCount = 0;
  let lastWait = Date.now();

  for (const snapshotDate of remainingSnapshots) {
    const unixTo = new Date(snapshotDate).getTime() / 1000;

    // Enforce minimum gap between API calls
    const elapsed = Date.now() - lastWait;
    if (elapsed < MIN_CALL_GAP_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_CALL_GAP_MS - elapsed));
    }

    const layerScores = { L1: null, L2: null, L3: null, L4: null };
    let layerCompleted = 0;

    for (const layer of ['L1', 'L2', 'L3', 'L4']) {
      const seriesInLayer = SERIES_REGISTRY[layer];
      const seriesScores = [];

      for (const series of seriesInLayer) {
        try {
          const unixTo = Math.floor(new Date(snapshotDate).getTime() / 1000);
          let bars = await getDatasetSeries(series.tickerId, unixTo);

          const closes = bars.map(b => b.close).filter(c => !isNaN(c));
          const score = computeScore(closes, series.invert);
          seriesScores.push(score * series.weight);

          lastWait = Date.now();
        } catch (err) {
          console.error(`  ERROR fetching ${series.tickerId}: ${err.message}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_WAIT_MS));
          lastWait = Date.now();
        }
      }

      if (seriesScores.length > 0) {
        const layerScore = seriesScores.reduce((a, b) => a + b) / seriesScores.length;
        layerScores[layer] = Math.round(layerScore * 10) / 10;
        layerCompleted++;
      }
    }

    if (layerCompleted === 4) {
      const row = `${snapshotDate},${layerScores.L1},${layerScores.L2},${layerScores.L3},${layerScores.L4}\n`;
      fs.appendFileSync(OUTPUT_FILE, row);
      snapshotCount++;

      if (snapshotCount % 12 === 0) {
        console.log(`✓ ${snapshotCount}/${remainingSnapshots.length} (${snapshotDate})`);
      }
    }
  }

  console.log(`\n✓ Export complete: ${snapshotCount} snapshots written to ${OUTPUT_FILE}`);
}

runExport().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
