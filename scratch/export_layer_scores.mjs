/**
 * Historical Layer Score Export Pipeline
 *
 * Exports L1-L5 composite scores for all first-Wednesdays of months from 2014-01 to 2026-05.
 *
 * Usage:
 *   export CYCLE_TOOLS_API_KEY="<key>"
 *   node scratch/export_layer_scores.mjs
 *
 * Features:
 *   - Point-in-time calculation: fetches data available at each snapshot date
 *   - Resumable: continues from last completed date if CSV exists
 *   - Rate limited: 6.5 seconds between API calls
 *   - Appends to CSV: never overwrites existing rows
 *   - Error recovery: retries once on 429/quota, skips on second failure
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_CSV = path.join(__dirname, 'layer_scores_history.csv');
const ERROR_LOG = path.join(__dirname, 'export_layer_scores_errors.log');

const API_KEY = process.env.CYCLE_TOOLS_API_KEY;
if (!API_KEY) {
  console.error('ERROR: CYCLE_TOOLS_API_KEY environment variable not set');
  console.error('Usage: CYCLE_TOOLS_API_KEY="..." node scratch/export_layer_scores.mjs');
  process.exit(1);
}

// All snapshot dates (first Wednesday of each month, 2014-01 to 2026-05)
const SNAPSHOT_DATES = [
  '2014-01-01', '2014-02-05', '2014-03-05', '2014-04-02', '2014-05-07', '2014-06-04',
  '2014-07-02', '2014-08-06', '2014-09-03', '2014-10-01', '2014-11-05', '2014-12-03',
  '2015-01-07', '2015-02-04', '2015-03-04', '2015-04-01', '2015-05-06', '2015-06-03',
  '2015-07-01', '2015-08-05', '2015-09-02', '2015-10-07', '2015-11-04', '2015-12-02',
  '2016-01-06', '2016-02-03', '2016-03-02', '2016-04-06', '2016-05-04', '2016-06-01',
  '2016-07-06', '2016-08-03', '2016-09-07', '2016-10-05', '2016-11-02', '2016-12-07',
  '2017-01-04', '2017-02-01', '2017-03-01', '2017-04-05', '2017-05-03', '2017-06-07',
  '2017-07-05', '2017-08-02', '2017-09-06', '2017-10-04', '2017-11-01', '2017-12-06',
  '2018-01-03', '2018-02-07', '2018-03-07', '2018-04-04', '2018-05-02', '2018-06-06',
  '2018-07-04', '2018-08-01', '2018-09-05', '2018-10-03', '2018-11-07', '2018-12-05',
  '2019-01-02', '2019-02-06', '2019-03-06', '2019-04-03', '2019-05-01', '2019-06-05',
  '2019-07-03', '2019-08-07', '2019-09-04', '2019-10-02', '2019-11-06', '2019-12-04',
  '2020-01-01', '2020-02-05', '2020-03-04', '2020-04-01', '2020-05-06', '2020-06-03',
  '2020-07-01', '2020-08-05', '2020-09-02', '2020-10-07', '2020-11-04', '2020-12-02',
  '2021-01-06', '2021-02-03', '2021-03-03', '2021-04-07', '2021-05-05', '2021-06-02',
  '2021-07-07', '2021-08-04', '2021-09-01', '2021-10-06', '2021-11-03', '2021-12-01',
  '2022-01-05', '2022-02-02', '2022-03-02', '2022-04-06', '2022-05-04', '2022-06-01',
  '2022-07-06', '2022-08-03', '2022-09-07', '2022-10-05', '2022-11-02', '2022-12-07',
  '2023-01-04', '2023-02-01', '2023-03-01', '2023-04-05', '2023-05-03', '2023-06-07',
  '2023-07-05', '2023-08-02', '2023-09-06', '2023-10-04', '2023-11-01', '2023-12-06',
  '2024-01-03', '2024-02-07', '2024-03-06', '2024-04-03', '2024-05-01', '2024-06-05',
  '2024-07-03', '2024-08-07', '2024-09-04', '2024-10-02', '2024-11-06', '2024-12-04',
  '2025-01-01', '2025-02-05', '2025-03-05', '2025-04-02', '2025-05-07', '2025-06-04',
  '2025-07-02', '2025-08-06', '2025-09-03', '2025-10-01', '2025-11-05', '2025-12-03',
  '2026-01-07', '2026-02-04', '2026-03-04', '2026-04-01', '2026-05-06',
];

const BASE_URL = 'https://api.cycle.tools';
const MIN_CALL_GAP_MS = 6500; // 6.5 seconds between API calls
const RETRY_WAIT_MS = 65000; // 65 seconds on 429/quota error
const PROGRESS_INTERVAL = 10; // Log progress every N snapshots

let lastCallTime = 0;
let apiCallCount = 0;
let skippedSnapshots = [];

// ── Utility Functions ──

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function throttledFetch(url, options = {}) {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_CALL_GAP_MS) {
    await new Promise(r => setTimeout(r, MIN_CALL_GAP_MS - timeSinceLastCall));
  }

  lastCallTime = Date.now();
  apiCallCount++;
  return fetch(url, options);
}

function checkQuotaError(text) {
  if (!text) return false;
  return text.toLowerCase().includes('quota exceeded') || text.toLowerCase().includes('api calls quota exceeded');
}

async function parseJsonResponse(text, context = '') {
  if (!text || text.trim().length === 0) {
    throw new Error(`Empty response${context}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);
    throw new Error(`Cannot parse JSON: ${text.substring(0, 100)}`);
  }
}

async function ensureDatasetWithRetry(tickerId, upToDate) {
  const unixTo = Math.floor(new Date(upToDate).getTime() / 1000);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const url = `${BASE_URL}/api/data/EnsureCompleteDataset?api_key=${API_KEY}&tickerId=${encodeURIComponent(tickerId)}&unixFrom=0&unixTo=${unixTo}&lastclose=true`;
      const resp = await throttledFetch(url);
      const text = await resp.text();

      if (checkQuotaError(text)) {
        if (attempt === 0) {
          log(`  Quota hit, waiting 65s...`);
          await new Promise(r => setTimeout(r, RETRY_WAIT_MS));
          continue;
        } else {
          throw new Error('Quota exceeded after retry');
        }
      }

      try {
        const result = JSON.parse(text);
        if (!result.isComplete && result.trackingId) {
          const waitUrl = `${BASE_URL}/api/data/WaitUntilUpdateCompleted?api_key=${API_KEY}&requestId=${result.trackingId}&timeoutSeconds=30`;
          await throttledFetch(waitUrl);
        }
      } catch (e) {
        // Non-critical parse error, continue
      }
      return;
    } catch (e) {
      if (attempt === 1) throw e;
      log(`  Ensure failed (${e.message}), retrying...`);
      await new Promise(r => setTimeout(r, RETRY_WAIT_MS));
    }
  }
}

async function getDatasetSeriesWithRetry(tickerId, upToDate) {
  const unixTo = Math.floor(new Date(upToDate).getTime() / 1000);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const url = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${API_KEY}&tickerid=${encodeURIComponent(tickerId)}&unixFrom=0&unixTo=${unixTo}&maxbars=0`;
      const resp = await throttledFetch(url);
      const text = await resp.text();

      if (checkQuotaError(text)) {
        if (attempt === 0) {
          log(`  Quota hit, waiting 65s...`);
          await new Promise(r => setTimeout(r, RETRY_WAIT_MS));
          continue;
        } else {
          throw new Error('Quota exceeded after retry');
        }
      }

      const bars = await parseJsonResponse(text, ` from GetDatasetSeries(${tickerId})`);
      const closes = bars.filter(b => b.close != null).map(b => b.close);

      if (closes.length < 100) {
        throw new Error(`Insufficient data: ${closes.length} closes < 100`);
      }

      return { bars, closes };
    } catch (e) {
      if (attempt === 1) throw e;
      log(`  Fetch failed (${e.message}), retrying...`);
      await new Promise(r => setTimeout(r, RETRY_WAIT_MS));
    }
  }
}

async function cycleScanner(closes) {
  const url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}&minCycleLength=5&maxCycleLength=400&sortByStrength=true&includeSpectrum=false&dominantPeakFinder=true&useStability=true`;
  const resp = await throttledFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(closes),
  });
  const text = await resp.text();
  if (checkQuotaError(text)) throw new Error('Quota exceeded');
  return parseJsonResponse(text, ' from CycleScanner');
}

// ── Resumability ──

function getLastCompletedDate() {
  if (!fs.existsSync(OUTPUT_CSV)) return null;

  const lines = fs.readFileSync(OUTPUT_CSV, 'utf-8').trim().split('\n');
  if (lines.length <= 1) return null;

  const lastLine = lines[lines.length - 1];
  const date = lastLine.split(',')[0];
  return date;
}

function initializeCSV() {
  if (!fs.existsSync(OUTPUT_CSV)) {
    fs.writeFileSync(OUTPUT_CSV, 'date,L1_score,L2_score,L3_score,L4_score,L5_score,master_score,warm_up_complete\n');
  }
}

function appendRow(date, l1, l2, l3, l4, l5, master) {
  const line = `${date},${l1.toFixed(1)},${l2.toFixed(1)},${l3.toFixed(1)},${l4.toFixed(1)},${l5.toFixed(1)},${master.toFixed(1)},1\n`;
  fs.appendFileSync(OUTPUT_CSV, line);
}

function logError(date, error) {
  const msg = `${date}: ${error}\n`;
  fs.appendFileSync(ERROR_LOG, msg);
  skippedSnapshots.push(date);
}

// ── Main Pipeline ──

// ── Series Registry (matching src/config/seriesRegistry.ts) ──

const SERIES_REGISTRY = [
  // Layer 1 — Leading Indicators
  { fredId: 'T10Y2Y', tickerId: 'T10Y2Y:FDS', layer: 1, layerName: 'Leading', frequency: 'daily', seriesName: '10Y-2Y Spread', invert: false },
  { fredId: 'T10Y3M', tickerId: 'T10Y3M:FDS', layer: 1, layerName: 'Leading', frequency: 'daily', seriesName: '10Y-3M Spread', invert: false },
  { fredId: 'ICSA', tickerId: 'ICSA-W:FDS', layer: 1, layerName: 'Leading', frequency: 'weekly', seriesName: 'Initial Claims', invert: true },
  { fredId: 'CCSA', tickerId: 'CCSA-W:FDS', layer: 1, layerName: 'Leading', frequency: 'weekly', seriesName: 'Continued Claims', invert: true },
  { fredId: 'UMCSENT', tickerId: 'UMCSENT-M:FDS', layer: 1, layerName: 'Leading', frequency: 'monthly', seriesName: 'Consumer Sentiment', invert: false },
  { fredId: 'USSLIND', tickerId: 'USSLIND-M:FDS', layer: 1, layerName: 'Leading', frequency: 'monthly', seriesName: 'Leading Index', invert: false },
  { fredId: 'PERMIT', tickerId: 'PERMIT-M:FDS', layer: 1, layerName: 'Leading', frequency: 'monthly', seriesName: 'Building Permits', invert: false },
  { fredId: 'DGORDER', tickerId: 'DGORDER-M:FDS', layer: 1, layerName: 'Leading', frequency: 'monthly', seriesName: 'Durable Orders', invert: false },
  { fredId: 'JTSJOL', tickerId: 'JTSJOL-M:FDS', layer: 1, layerName: 'Leading', frequency: 'monthly', seriesName: 'Job Openings', invert: false },
  // Layer 2 — Coincident Activity
  { fredId: 'INDPRO', tickerId: 'INDPRO-M:FDS', layer: 2, layerName: 'Coincident', frequency: 'monthly', seriesName: 'Industrial Production', invert: false },
  { fredId: 'PAYEMS', tickerId: 'PAYEMS-M:FDS', layer: 2, layerName: 'Coincident', frequency: 'monthly', seriesName: 'Payrolls', invert: false },
  { fredId: 'DSPIC96', tickerId: 'DSPIC96-M:FDS', layer: 2, layerName: 'Coincident', frequency: 'monthly', seriesName: 'Real Income', invert: false },
  { fredId: 'UNRATE', tickerId: 'UNRATE-M:FDS', layer: 2, layerName: 'Coincident', frequency: 'monthly', seriesName: 'Unemployment', invert: true },
  // Layer 3 — Financial Stress
  { fredId: 'VIXCLS', tickerId: 'VIXCLS:FDS', layer: 3, layerName: 'Stress', frequency: 'daily', seriesName: 'VIX', invert: true },
  { fredId: 'STLFSI4', tickerId: 'STLFSI4-W:FDS', layer: 3, layerName: 'Stress', frequency: 'weekly', seriesName: 'Stress Index', invert: true },
  { fredId: 'BAA10Y', tickerId: 'BAA10Y:FDS', layer: 3, layerName: 'Stress', frequency: 'daily', seriesName: 'Corp Spread', invert: true },
  { fredId: 'BAMLH0A0HYM2', tickerId: 'BAMLH0A0HYM2:FDS', layer: 3, layerName: 'Stress', frequency: 'daily', seriesName: 'HY OAS', invert: true },
  // Layer 4 — Inflation / Policy
  { fredId: 'DFF', tickerId: 'DFF:FDS', layer: 4, layerName: 'Policy', frequency: 'daily', seriesName: 'Fed Funds', invert: true },
  { fredId: 'T5YIE', tickerId: 'T5YIE:FDS', layer: 4, layerName: 'Policy', frequency: 'daily', seriesName: 'Breakeven Inflation', invert: false },
  { fredId: 'CPIAUCSL', tickerId: 'CPIAUCSL-M:FDS', layer: 4, layerName: 'Policy', frequency: 'monthly', seriesName: 'CPI Headline', invert: true },
  { fredId: 'CPILFESL', tickerId: 'CPILFESL-M:FDS', layer: 4, layerName: 'Policy', frequency: 'monthly', seriesName: 'CPI Core', invert: true },
  { fredId: 'M2SL', tickerId: 'M2SL-M:FDS', layer: 4, layerName: 'Policy', frequency: 'monthly', seriesName: 'M2', invert: false },
  { fredId: 'DTWEXBGS', tickerId: 'DTWEXBGS:FDS', layer: 4, layerName: 'Policy', frequency: 'daily', seriesName: 'Dollar Index', invert: true },
];

const SERIES_WEIGHTS = {
  'CCSA': 1.500, 'UMCSENT': 1.500, 'DGORDER': 0.800, 'INDPRO': 1.000, 'BAA10Y': 1.500,
  'T5YIE': 1.500, 'BAMLH0A0HYM2': 1.349, 'JTSJOL': 0.896, 'CPIAUCSL': 0.400, 'CPILFESL': 0.307,
  'DFF': 0.301, 'ICSA': 0.253, 'T10Y2Y': 0.100, 'T10Y3M': 0.100, 'USSLIND': 0.600,
  'PERMIT': 0.400, 'PAYEMS': 0.500, 'DSPIC96': 0.400, 'UNRATE': 0.600, 'VIXCLS': 0.100,
  'STLFSI4': 0.100, 'M2SL': 0.100, 'DTWEXBGS': 0.100,
};

const LAYER_WEIGHTS = { 1: 0.30, 2: 0.15, 3: 0.20, 4: 0.10, 5: 0.25 };

const LIQUIDITY_SERIES = [
  { fredId: 'WALCL', tickerId: 'WALCL-W:FDS', name: 'Fed Assets', weight: 3 },
  { fredId: 'ECB_USD', tickerId: 'ECBASSETSW-W:FDS', name: 'ECB Assets', weight: 1 },
  { fredId: 'BOJ_USD', tickerId: 'JPNASSETS-M:FDS', name: 'BOJ Assets', weight: 1 },
  { fredId: 'TOTBKCR', tickerId: 'TOTBKCR-W:FDS', name: 'Bank Credit', weight: 1 },
  { fredId: 'WRESBAL', tickerId: 'WRESBAL-W:FDS', name: 'Reserves', weight: 1 },
  { fredId: 'COMPOUT', tickerId: 'COMPOUT-W:FDS', name: 'Commercial Paper', weight: 1 },
  { fredId: 'WRMFNS', tickerId: 'WRMFNS-W:FDS', name: 'Money Market Funds', weight: 1 },
];

// ── Phase scoring helpers ──

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

// ── L1-L4 Pipeline ──

async function runL1L4Pipeline(apiKey, upToDate) {
  const unixTo = Math.floor(new Date(upToDate).getTime() / 1000);
  const results = {};

  for (const series of SERIES_REGISTRY.filter(s => s.layer <= 4)) {
    try {
      // Ensure dataset with point-in-time cutoff
      const ensureUrl = `${BASE_URL}/api/data/EnsureCompleteDataset?api_key=${apiKey}&tickerId=${encodeURIComponent(series.tickerId)}&unixFrom=0&unixTo=${unixTo}&lastclose=true`;
      const ensureResp = await throttledFetch(ensureUrl);
      const ensureText = await ensureResp.text();
      if (checkQuotaError(ensureText)) throw new Error('Quota exceeded');

      // Get data
      const dataUrl = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${apiKey}&tickerid=${encodeURIComponent(series.tickerId)}&unixFrom=0&unixTo=${unixTo}&maxbars=0`;
      const dataResp = await throttledFetch(dataUrl);
      const dataText = await dataResp.text();
      if (checkQuotaError(dataText)) throw new Error('Quota exceeded');

      const bars = await parseJsonResponse(dataText);

      // CRITICAL FIX: API ignores unixTo parameter, filter manually by date
      const snapshotTime = new Date(upToDate).getTime();
      const filteredBars = bars.filter(b => {
        if (!b.date) return false;
        const barTime = new Date(b.date).getTime();
        return barTime <= snapshotTime;
      });

      const closes = filteredBars.filter(b => b.close != null).map(b => b.close);

      if (closes.length < 100) throw new Error(`Insufficient data: ${closes.length} closes`);

      // CycleScanner
      const scanUrl = `${BASE_URL}/api/cycles/CycleScanner?api_key=${apiKey}&minCycleLength=5&maxCycleLength=400&sortByStrength=true&dominantPeakFinder=true&useStability=true`;
      const scanResp = await throttledFetch(scanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closes),
      });
      const scanText = await scanResp.text();
      if (checkQuotaError(scanText)) throw new Error('Quota exceeded');

      const scanResult = await parseJsonResponse(scanText);
      const dominant = extractDominantPeak(scanResult.peaks);
      if (!dominant) throw new Error('No dominant peak found');

      const rawPhaseScore = dominant.avgPhaseScore ?? 0;
      const phaseScore = mapPhaseScore(rawPhaseScore);
      const adjustedScore = series.invert ? 100 - phaseScore : phaseScore;

      results[series.fredId] = {
        layer: series.layer,
        score: adjustedScore,
        weight: SERIES_WEIGHTS[series.fredId] ?? 1.0,
        rawPhaseScore,
        phaseScore,
        cycleLength: dominant.cycleLength,
      };
    } catch (e) {
      results[series.fredId] = { layer: series.layer, score: 50, weight: SERIES_WEIGHTS[series.fredId] ?? 1.0, error: e.message };
    }
  }

  // Calculate layer scores
  const layerScores = {};
  for (let layer = 1; layer <= 4; layer++) {
    const layerSeries = Object.entries(results).filter(([, r]) => r.layer === layer);
    if (layerSeries.length === 0) { layerScores[layer] = 50; continue; }
    let weightedSum = 0, totalWeight = 0;
    for (const [, r] of layerSeries) {
      if (!r.error) { weightedSum += r.score * r.weight; totalWeight += r.weight; }
    }
    layerScores[layer] = totalWeight > 0 ? weightedSum / totalWeight : 50;
  }

  return layerScores;
}

// ── L5 Liquidity Pipeline (component path only) ──

async function runL5Pipeline(apiKey, upToDate) {
  const unixTo = Math.floor(new Date(upToDate).getTime() / 1000);
  const results = [];

  for (const series of LIQUIDITY_SERIES) {
    try {
      // Ensure + fetch
      const ensureUrl = `${BASE_URL}/api/data/EnsureCompleteDataset?api_key=${apiKey}&tickerId=${encodeURIComponent(series.tickerId)}&unixFrom=0&unixTo=${unixTo}&lastclose=true`;
      await throttledFetch(ensureUrl);

      const dataUrl = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${apiKey}&tickerid=${encodeURIComponent(series.tickerId)}&unixFrom=0&unixTo=${unixTo}&maxbars=0`;
      const dataResp = await throttledFetch(dataUrl);
      const dataText = await dataResp.text();
      if (checkQuotaError(dataText)) throw new Error('Quota exceeded');

      const bars = await parseJsonResponse(dataText);

      // CRITICAL FIX: API ignores unixTo parameter, filter manually by date
      const snapshotTime = new Date(upToDate).getTime();
      const filteredBars = bars.filter(b => {
        if (!b.date) return false;
        const barTime = new Date(b.date).getTime();
        return barTime <= snapshotTime;
      });

      const closes = filteredBars.filter(b => b.close != null).map(b => b.close);

      if (closes.length < 100) throw new Error(`Insufficient data: ${closes.length}`);

      // CycleScanner
      const scanUrl = `${BASE_URL}/api/cycles/CycleScanner?api_key=${apiKey}&minCycleLength=10&maxCycleLength=400&sortByStrength=true&dominantPeakFinder=true&useStability=true`;
      const scanResp = await throttledFetch(scanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closes),
      });
      const scanText = await scanResp.text();
      if (checkQuotaError(scanText)) throw new Error('Quota exceeded');

      const scanResult = await parseJsonResponse(scanText);
      const dominant = extractDominantPeak(scanResult.peaks);
      if (!dominant) throw new Error('No dominant peak');

      const rawPhaseScore = dominant.avgPhaseScore ?? 0;
      const phaseScore = mapPhaseScore(rawPhaseScore);

      // CRSI for band scoring (simplified: use phase score directly)
      const combinedScore = phaseScore;

      results.push({
        seriesId: series.fredId,
        score: combinedScore,
        weight: series.weight,
        cycleLength: dominant.cycleLength,
      });
    } catch (e) {
      results.push({ seriesId: series.fredId, score: 50, weight: series.weight, error: e.message });
    }
  }

  // Weighted composite
  let weightedSum = 0, totalWeight = 0;
  for (const r of results) {
    if (!r.error) { weightedSum += r.score * r.weight; totalWeight += r.weight; }
  }
  const compositeScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

  return compositeScore;
}

// ── Main snapshot pipeline ──

async function runSnapshotPipeline(date, upToDate) {
  try {
    const layerScores = await runL1L4Pipeline(API_KEY, upToDate);
    const l5Score = await runL5Pipeline(API_KEY, upToDate);

    const scores = {
      L1: Math.round(layerScores[1] * 10) / 10,
      L2: Math.round(layerScores[2] * 10) / 10,
      L3: Math.round(layerScores[3] * 10) / 10,
      L4: Math.round(layerScores[4] * 10) / 10,
      L5: Math.round(l5Score * 10) / 10,
    };

    scores.master = Math.round((
      scores.L1 * 0.30 +
      scores.L2 * 0.15 +
      scores.L3 * 0.20 +
      scores.L4 * 0.10 +
      scores.L5 * 0.25
    ) * 10) / 10;

    return scores;
  } catch (e) {
    throw new Error(`Pipeline error: ${e.message}`);
  }
}

// ── Main Execution ──

async function main() {
  log('═'.repeat(70));
  log('HISTORICAL LAYER SCORE EXPORT PIPELINE');
  log('═'.repeat(70));
  log(`Total snapshots: ${SNAPSHOT_DATES.length}`);
  log(`API rate: 1 call per 6.5 seconds`);
  log(`Output: ${OUTPUT_CSV}`);
  log('');

  initializeCSV();

  const lastDate = getLastCompletedDate();
  let startIdx = 0;
  if (lastDate) {
    startIdx = SNAPSHOT_DATES.indexOf(lastDate) + 1;
    if (startIdx === 0) startIdx = 0;
    log(`Resuming from ${lastDate} (skipping first ${startIdx} snapshots)`);
  } else {
    log('Starting fresh (no existing CSV)');
  }

  const startTime = Date.now();

  for (let i = startIdx; i < SNAPSHOT_DATES.length; i++) {
    const date = SNAPSHOT_DATES[i];

    try {
      const scores = await runSnapshotPipeline(date, date);
      appendRow(date, scores.L1, scores.L2, scores.L3, scores.L4, scores.L5, scores.master);

      if ((i - startIdx + 1) % PROGRESS_INTERVAL === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = SNAPSHOT_DATES.length - i - 1;
        const ratePerSnapshot = elapsed / (i - startIdx + 1);
        const estimatedRemaining = remaining * ratePerSnapshot;
        const percent = Math.round((i + 1) / SNAPSHOT_DATES.length * 100);

        log(`Progress: ${i + 1}/${SNAPSHOT_DATES.length} (${percent}%) — last: ${date} — remaining: ${(estimatedRemaining / 3600).toFixed(1)}h`);
      }
    } catch (e) {
      logError(date, e.message);
      log(`  ✗ Skipped ${date}: ${e.message}`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  log('');
  log('═'.repeat(70));
  log(`COMPLETE: ${SNAPSHOT_DATES.length - startIdx} snapshots processed`);
  log(`Total time: ${(totalTime / 3600).toFixed(1)}h`);
  log(`API calls: ${apiCallCount}`);
  log(`Skipped: ${skippedSnapshots.length}`);
  if (skippedSnapshots.length > 0) {
    log(`Failed dates: ${skippedSnapshots.join(', ')}`);
    log(`See ${ERROR_LOG} for details`);
  }
  log('═'.repeat(70));
}

main().catch(e => {
  console.error(`FATAL: ${e.message}`);
  process.exit(1);
});
