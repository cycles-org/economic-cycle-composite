// Test version - stops after 3 snapshots for resumability testing
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_CSV = path.join(__dirname, 'layer_scores_history_TEST_RESUME.csv');

const SNAPSHOT_DATES = [
  '2014-01-01', '2014-02-05', '2014-03-05', '2014-04-02', '2014-05-07',
];

const API_KEY = process.env.CYCLE_TOOLS_API_KEY;
if (!API_KEY) {
  console.error('ERROR: CYCLE_TOOLS_API_KEY not set');
  process.exit(1);
}

const BASE_URL = 'https://api.cycle.tools';
let lastCallTime = 0;
let apiCallCount = 0;

async function throttledFetch(url, options = {}) {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < 100) {
    await new Promise(r => setTimeout(r, 100 - timeSinceLastCall));
  }
  lastCallTime = Date.now();
  apiCallCount++;
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

function getLastCompletedDate() {
  if (!fs.existsSync(OUTPUT_CSV)) return null;
  const lines = fs.readFileSync(OUTPUT_CSV, 'utf-8').trim().split('\n');
  if (lines.length <= 1) return null;
  const lastLine = lines[lines.length - 1];
  return lastLine.split(',')[0];
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

async function runDummyPipeline(date) {
  // Return fixed dummy scores
  return {
    L1: 28.0 + Math.random() * 2,
    L2: 47.8 + Math.random() * 2,
    L3: 85.1 + Math.random() * 2,
    L4: 61.1 + Math.random() * 2,
    L5: 36.7 + Math.random() * 2,
  };
}

async function main() {
  console.log(`[${new Date().toISOString()}] RESUMABILITY TEST (stops after 3 snapshots)`);
  initializeCSV();

  const lastDate = getLastCompletedDate();
  let startIdx = 0;
  if (lastDate) {
    startIdx = SNAPSHOT_DATES.indexOf(lastDate) + 1;
    console.log(`[${new Date().toISOString()}] Resuming from ${lastDate} (starting at index ${startIdx})`);
  } else {
    console.log(`[${new Date().toISOString()}] Starting fresh`);
  }

  // STOP AFTER 3 SNAPSHOTS (for testing resumability)
  const STOP_AFTER = 3;
  let processedCount = 0;

  for (let i = startIdx; i < SNAPSHOT_DATES.length; i++) {
    if (processedCount >= STOP_AFTER) {
      console.log(`[${new Date().toISOString()}] STOPPING after ${processedCount} snapshots (resumability test)`);
      break;
    }

    const date = SNAPSHOT_DATES[i];
    const scores = await runDummyPipeline(date);
    scores.master = Math.round((scores.L1*0.30 + scores.L2*0.15 + scores.L3*0.20 + scores.L4*0.10 + scores.L5*0.25) * 10) / 10;
    appendRow(date, scores.L1, scores.L2, scores.L3, scores.L4, scores.L5, scores.master);
    console.log(`[${new Date().toISOString()}] ✓ ${date}: L1=${scores.L1.toFixed(1)} L2=${scores.L2.toFixed(1)} L3=${scores.L3.toFixed(1)} L4=${scores.L4.toFixed(1)} L5=${scores.L5.toFixed(1)} Master=${scores.master}`);
    processedCount++;
  }

  console.log(`\n[${new Date().toISOString()}] CSV state:`);
  console.log(fs.readFileSync(OUTPUT_CSV, 'utf-8'));
}

main().catch(e => {
  console.error(`FATAL: ${e.message}`);
  process.exit(1);
});
