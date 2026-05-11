#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('═'.repeat(70));
console.log('MERGE: L1-L4 Extended Dataset (2006-2026)');
console.log('═'.repeat(70));

// ══════════════════════════════════════════════════════════════════════
// STEP 1: Load new export (2006-2013)
// ══════════════════════════════════════════════════════════════════════

const file2006_2013 = path.join(__dirname, 'l1l4_2006_2013.csv');

if (!fs.existsSync(file2006_2013)) {
  console.error(`\n✗ ERROR: ${file2006_2013} not found`);
  console.error('Run export_l1l4_2006_2013.mjs first');
  process.exit(1);
}

const lines2006_2013 = fs.readFileSync(file2006_2013, 'utf-8').trim().split('\n');
const data2006_2013 = lines2006_2013.slice(1).map(line => {
  const [date, l1, l2, l3, l4] = line.split(',');
  return { date, l1: parseFloat(l1), l2: parseFloat(l2), l3: parseFloat(l3), l4: parseFloat(l4) };
});

console.log(`\n2006-2013 export:`);
console.log(`  Rows: ${data2006_2013.length}`);
console.log(`  First date: ${data2006_2013[0]?.date}`);
console.log(`  Last date: ${data2006_2013[data2006_2013.length - 1]?.date}`);

// ══════════════════════════════════════════════════════════════════════
// STEP 2: Extract L1-L4 from existing history (2014-2026)
// ══════════════════════════════════════════════════════════════════════

const fileHistory = path.join(__dirname, 'layer_scores_history.csv');

if (!fs.existsSync(fileHistory)) {
  console.error(`\n✗ ERROR: ${fileHistory} not found`);
  process.exit(1);
}

const linesHistory = fs.readFileSync(fileHistory, 'utf-8').trim().split('\n');
const data2014_2026 = linesHistory.slice(1).map(line => {
  const parts = line.split(',');
  const date = parts[0];
  const l1 = parseFloat(parts[1]);
  const l2 = parseFloat(parts[2]);
  const l3 = parseFloat(parts[3]);
  const l4 = parseFloat(parts[4]);
  return { date, l1, l2, l3, l4 };
});

console.log(`\n2014-2026 history (L1-L4 extracted):`);
console.log(`  Rows: ${data2014_2026.length}`);
console.log(`  First date: ${data2014_2026[0]?.date}`);
console.log(`  Last date: ${data2014_2026[data2014_2026.length - 1]?.date}`);

// ══════════════════════════════════════════════════════════════════════
// STEP 3: Concatenate
// ══════════════════════════════════════════════════════════════════════

const combined = [...data2006_2013, ...data2014_2026];

// Sort by date
combined.sort((a, b) => new Date(a.date) - new Date(b.date));

console.log(`\nCombined dataset:`);
console.log(`  Total rows: ${combined.length}`);
console.log(`  Date range: ${combined[0]?.date} to ${combined[combined.length - 1]?.date}`);

// ══════════════════════════════════════════════════════════════════════
// STEP 4: Validation
// ══════════════════════════════════════════════════════════════════════

let errors = 0;

// Check for duplicates
const uniqueDates = new Set(combined.map(r => r.date));
if (uniqueDates.size !== combined.length) {
  console.error(`\n✗ Duplicate dates detected: ${combined.length} rows, ${uniqueDates.size} unique dates`);
  errors++;
}

// Check score ranges
for (let i = 0; i < combined.length; i++) {
  const row = combined[i];
  for (const layer of ['l1', 'l2', 'l3', 'l4']) {
    const val = row[layer];
    if (val < 0 || val > 100) {
      console.error(`\n✗ Score out of range: ${row.date} ${layer.toUpperCase()}=${val}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n✗ ${errors} validation errors found`);
  process.exit(1);
}

console.log('\n✓ Validation passed: no duplicates, all scores in [0, 100]');

// ══════════════════════════════════════════════════════════════════════
// STEP 5: Write extended dataset
// ══════════════════════════════════════════════════════════════════════

const fileExtended = path.join(__dirname, 'l1l4_extended.csv');
const rows = ['date,L1_score,L2_score,L3_score,L4_score'];

for (const row of combined) {
  rows.push(`${row.date},${row.l1},${row.l2},${row.l3},${row.l4}`);
}

fs.writeFileSync(fileExtended, rows.join('\n'));

console.log(`\n✓ Extended dataset written: ${fileExtended}`);
console.log(`  Rows: ${combined.length}`);
console.log(`  Columns: date, L1_score, L2_score, L3_score, L4_score`);
console.log(`\nFirst 5 rows:`);
rows.slice(1, 6).forEach(r => console.log(`  ${r}`));
console.log(`\nLast 5 rows:`);
rows.slice(-5).forEach(r => console.log(`  ${r}`));

console.log('\n' + '═'.repeat(70));
console.log('Ready for TLI alignment');
console.log('═'.repeat(70));
