/**
 * Diagnostic version WITH FIX: 2 snapshots to verify point-in-time filtering works
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_LOG = path.join(__dirname, 'diagnostic_output_fixed.log');

const API_KEY = process.env.CYCLE_TOOLS_API_KEY;
if (!API_KEY) {
  console.error('ERROR: CYCLE_TOOLS_API_KEY not set');
  process.exit(1);
}

const BASE_URL = 'https://api.cycle.tools';

// DIAGNOSTIC: Only 2 snapshots
const SNAPSHOT_DATES = ['2014-01-01', '2014-02-05'];

let lastCallTime = 0;
let diagnosticLog = [];

function log(msg) {
  const ts = new Date().toISOString();
  const fullMsg = `[${ts}] ${msg}`;
  console.log(fullMsg);
  diagnosticLog.push(fullMsg);
}

async function throttledFetch(url, options = {}) {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < 100) {
    await new Promise(r => setTimeout(r, 100 - timeSinceLastCall));
  }
  lastCallTime = Date.now();
  return fetch(url, options);
}

function checkQuotaError(text) {
  if (!text) return false;
  return text.toLowerCase().includes('quota exceeded');
}

async function parseJsonResponse(text) {
  if (!text || text.trim().length === 0) throw new Error('Empty response');
  try {
    return JSON.parse(text);
  } catch {
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    throw new Error('Cannot parse JSON');
  }
}

function mapPhaseScore(avgPhaseScore) {
  return Math.max(0, Math.min(100, (avgPhaseScore + 100) / 2));
}

function extractDominantPeak(peaks) {
  if (!peaks || peaks.length === 0) return null;
  const viable = peaks.filter(p => p.cycleLength >= 30 && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  if (viable.length === 0) {
    const fallback = peaks.filter(p => p.cycleLength >= 30);
    if (fallback.length === 0) return peaks[0] ?? null;
    return fallback.sort((a, b) => b.strength - a.strength)[0];
  }
  const ranked = viable.filter(p => p.dominantRank > 0);
  if (ranked.length > 0) return ranked.sort((a, b) => a.dominantRank - b.dominantRank)[0];
  return viable.sort((a, b) => b.strength - a.strength)[0];
}

// DIAGNOSTIC WITH FIX: Focus on single series (UMCSENT) for detailed inspection
async function diagnosticFetchUMCSENT(apiKey, snapshotDate, upToDate) {
  log(`\n${'='.repeat(70)}`);
  log(`DIAGNOSTIC (WITH FIX): UMCSENT for snapshot ${snapshotDate}`);
  log(`${'='.repeat(70)}`);

  const unixTo = Math.floor(new Date(upToDate).getTime() / 1000);
  const unixFrom = 0;
  const snapshotTime = new Date(upToDate).getTime();

  log(`Date: ${upToDate}`);
  log(`unixTo: ${unixTo}`);
  log(`snapshotTime (ms): ${snapshotTime}`);

  const tickerId = 'UMCSENT-M:FDS';

  // ── EnsureCompleteDataset ──
  log(`\n[Step 1] EnsureCompleteDataset`);
  const ensureUrl = `${BASE_URL}/api/data/EnsureCompleteDataset?api_key=${apiKey}&tickerId=${encodeURIComponent(tickerId)}&unixFrom=${unixFrom}&unixTo=${unixTo}&lastclose=true`;
  const ensureResp = await throttledFetch(ensureUrl);
  const ensureText = await ensureResp.text();
  log(`Response status: ${ensureResp.status}`);

  // ── GetDatasetSeries ──
  log(`\n[Step 2] GetDatasetSeries`);
  const dataUrl = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${apiKey}&tickerid=${encodeURIComponent(tickerId)}&unixFrom=${unixFrom}&unixTo=${unixTo}&maxbars=0`;
  const dataResp = await throttledFetch(dataUrl);
  const dataText = await dataResp.text();

  const bars = await parseJsonResponse(dataText);

  log(`\n[Step 3] Raw Data Analysis (before fix)`);
  log(`Total bars returned by API: ${bars.length}`);
  log(`First bar date: ${bars[0]?.date}`);
  log(`Last bar date: ${bars[bars.length - 1]?.date}`);

  // ── APPLY THE FIX ──
  log(`\n[Step 4] Apply Point-in-Time Filter (THE FIX)`);
  const filteredBars = bars.filter(b => {
    if (!b.date) return false;
    const barTime = new Date(b.date).getTime();
    return barTime <= snapshotTime;
  });

  log(`Bars after filtering (date <= ${upToDate}): ${filteredBars.length}`);
  log(`First bar date (after filter): ${filteredBars[0]?.date}`);
  log(`Last bar date (after filter): ${filteredBars[filteredBars.length - 1]?.date}`);

  const closes = filteredBars.filter(b => b.close != null).map(b => b.close);

  log(`\n[Step 5] Data Analysis`);
  log(`Valid closes (close != null): ${closes.length}`);
  log(`First 5 closes: ${closes.slice(0, 5).join(', ')}`);
  log(`Last 5 closes: ${closes.slice(-5).join(', ')}`);

  if (closes.length < 100) {
    throw new Error(`Insufficient data: ${closes.length} closes`);
  }

  // ── CycleScanner ──
  log(`\n[Step 6] CycleScanner on filtered data`);
  const scanUrl = `${BASE_URL}/api/cycles/CycleScanner?api_key=${apiKey}&minCycleLength=5&maxCycleLength=400&sortByStrength=true&dominantPeakFinder=true&useStability=true`;

  const scanResp = await throttledFetch(scanUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(closes),
  });
  const scanText = await scanResp.text();

  const scanResult = await parseJsonResponse(scanText);
  const dominant = extractDominantPeak(scanResult.peaks);

  if (!dominant) {
    throw new Error('No dominant peak found');
  }

  log(`\n[Step 7] Results`);
  log(`Raw avgPhaseScore: ${dominant.avgPhaseScore}`);
  log(`Raw phaseStatus: ${dominant.phaseStatus}`);
  log(`Dominant cycle length: ${dominant.cycleLength} bars`);
  log(`Bartels: ${dominant.bartelsValue}`);

  const mappedScore = mapPhaseScore(dominant.avgPhaseScore ?? 0);
  log(`Mapped phase score (0-100): ${mappedScore}`);

  return {
    snapshotDate,
    closesLength: closes.length,
    rawPhaseScore: dominant.avgPhaseScore ?? 0,
    mappedPhaseScore: mappedScore,
    lastBarDate: filteredBars[filteredBars.length - 1]?.date,
    cycleLength: dominant.cycleLength,
  };
}

async function main() {
  log('═'.repeat(70));
  log('DIAGNOSTIC TEST WITH FIX: UMCSENT CLOSES & PHASE SCORES');
  log('═'.repeat(70));
  log('Fix: Filter returned bars to only include data up to snapshot date');
  log('═'.repeat(70));

  const results = [];

  for (const date of SNAPSHOT_DATES) {
    try {
      const result = await diagnosticFetchUMCSENT(API_KEY, date, date);
      results.push(result);
    } catch (e) {
      log(`ERROR: ${e.message}`);
      results.push({ snapshotDate: date, error: e.message });
    }
  }

  // ── Comparison ──
  log(`\n${'='.repeat(70)}`);
  log('COMPARISON (WITH FIX APPLIED)');
  log(`${'='.repeat(70)}`);

  if (results.length === 2 && !results[0].error && !results[1].error) {
    const r1 = results[0];
    const r2 = results[1];

    log(`\nSnapshot 1 (2014-01-01):`);
    log(`  Closes length: ${r1.closesLength}`);
    log(`  Raw phase score: ${r1.rawPhaseScore}`);
    log(`  Mapped score: ${r1.mappedPhaseScore}`);
    log(`  Last bar date: ${r1.lastBarDate}`);

    log(`\nSnapshot 2 (2014-02-05):`);
    log(`  Closes length: ${r2.closesLength}`);
    log(`  Raw phase score: ${r2.rawPhaseScore}`);
    log(`  Mapped score: ${r2.mappedPhaseScore}`);
    log(`  Last bar date: ${r2.lastBarDate}`);

    log(`\nDifference (Snapshot 2 - Snapshot 1):`);
    log(`  Closes length diff: ${r2.closesLength - r1.closesLength} bars (expected ~1 for monthly data)`);
    log(`  Raw phase score diff: ${r2.rawPhaseScore - r1.rawPhaseScore}`);
    log(`  Mapped score diff: ${r2.mappedPhaseScore - r1.mappedPhaseScore}`);

    if (r1.closesLength !== r2.closesLength) {
      log(`\n✅ FIX SUCCESSFUL: Snapshots now have different closes lengths!`);
      log(`   Snapshot 2 has ${r2.closesLength - r1.closesLength} more bars than Snapshot 1`);
    } else {
      log(`\n❌ FIX FAILED: Both snapshots still have same closes length`);
    }

    if (r1.mappedPhaseScore !== r2.mappedPhaseScore) {
      log(`\n✅ FIX SUCCESSFUL: Phase scores now differ!`);
      log(`   Point-in-time filtering is working correctly`);
    } else {
      log(`\n⚠️ Phase scores still identical (but this could be coincidence if cycles align)`);
    }
  }

  // ── Write log to file ──
  log(`\n${'='.repeat(70)}`);
  log(`Diagnostic log saved to: ${OUTPUT_LOG}`);
  fs.writeFileSync(OUTPUT_LOG, diagnosticLog.join('\n'));
}

main().catch(e => {
  console.error(`FATAL: ${e.message}`);
  process.exit(1);
});
