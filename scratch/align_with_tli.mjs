#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('═'.repeat(70));
console.log('ALIGN L1-L4 WITH HOWELL TLI');
console.log('═'.repeat(70));

// ══════════════════════════════════════════════════════════════════════
// LOAD L1-L4 EXTENDED DATA
// ══════════════════════════════════════════════════════════════════════

const fileL1L4 = path.join(__dirname, 'l1l4_extended.csv');

if (!fs.existsSync(fileL1L4)) {
  console.error(`\n✗ ERROR: ${fileL1L4} not found`);
  console.error('Run merge_l1l4_extended.mjs first');
  process.exit(1);
}

const linesL1L4 = fs.readFileSync(fileL1L4, 'utf-8').trim().split('\n');
const dataL1L4 = linesL1L4.slice(1).map(line => {
  const [date, l1, l2, l3, l4] = line.split(',');
  return {
    date,
    yearMonth: date.substring(0, 7), // YYYY-MM
    l1: parseFloat(l1),
    l2: parseFloat(l2),
    l3: parseFloat(l3),
    l4: parseFloat(l4),
  };
});

console.log(`\nL1-L4 Extended data:`);
console.log(`  Rows: ${dataL1L4.length}`);
console.log(`  Date range: ${dataL1L4[0]?.date} to ${dataL1L4[dataL1L4.length - 1]?.date}`);

// ══════════════════════════════════════════════════════════════════════
// LOAD HOWELL TLI DATA
// ══════════════════════════════════════════════════════════════════════

function excelDateToJS(excelDate) {
  return new Date((excelDate - 25569) * 86400 * 1000);
}

const fileTLI = '/Users/drrms/Projects/Papers/Book2.xlsx';

if (!fs.existsSync(fileTLI)) {
  console.error(`\n✗ ERROR: ${fileTLI} not found`);
  process.exit(1);
}

const workbook = XLSX.readFile(fileTLI);
const ws = workbook.Sheets['USA'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

const headerRow = 3;
const headers = data[headerRow];
const dataRows = data.slice(headerRow + 1).filter(row => row && row.length > 0);

const dateColIdx = 0;
const tliColIdx = 1;

const dataTLI = dataRows
  .map((row, idx) => {
    const excelDate = row[dateColIdx];
    const jsDate = excelDateToJS(excelDate);
    const dateStr = jsDate.toISOString().split('T')[0];
    const yearMonth = dateStr.substring(0, 7);
    return {
      dateStr,
      yearMonth,
      tli: parseFloat(row[tliColIdx]),
    };
  })
  .filter(row => !isNaN(row.tli));

console.log(`\nHowell TLI data:`);
console.log(`  Rows: ${dataTLI.length}`);
console.log(`  Date range: ${dataTLI[0]?.dateStr} to ${dataTLI[dataTLI.length - 1]?.dateStr}`);

// ══════════════════════════════════════════════════════════════════════
// ALIGN ON YEAR-MONTH
// ══════════════════════════════════════════════════════════════════════

// Create map of TLI by year-month (most recent value for that month)
const tliMap = {};
for (const row of dataTLI) {
  tliMap[row.yearMonth] = row.tli; // Last value in month overwrites
}

console.log(`\nUnique TLI months: ${Object.keys(tliMap).length}`);

// Inner join: keep only L1-L4 rows that have TLI data
const merged = [];
for (const row of dataL1L4) {
  if (tliMap[row.yearMonth] !== undefined) {
    merged.push({
      date: row.date,
      l1: row.l1,
      l2: row.l2,
      l3: row.l3,
      l4: row.l4,
      tli: tliMap[row.yearMonth],
    });
  }
}

console.log(`\nMerged dataset (inner join):`);
console.log(`  Rows: ${merged.length}`);
console.log(`  Date range: ${merged[0]?.date} to ${merged[merged.length - 1]?.date}`);

// Calculate complete Howell cycles
const months = merged.length;
const cycles = months / 64;
console.log(`  Total months: ${months}`);
console.log(`  Complete 64-month cycles: ${cycles.toFixed(2)}`);

// ══════════════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════════════

let errors = 0;

// Check for duplicates
const uniqueDates = new Set(merged.map(r => r.date));
if (uniqueDates.size !== merged.length) {
  console.error(`\n✗ Duplicate dates detected`);
  errors++;
}

// Check score ranges
for (let i = 0; i < merged.length; i++) {
  const row = merged[i];
  for (const col of ['l1', 'l2', 'l3', 'l4', 'tli']) {
    const val = row[col];
    if (val < 0 || val > 100) {
      console.error(`✗ Value out of range: ${row.date} ${col.toUpperCase()}=${val}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n✗ ${errors} validation errors`);
  process.exit(1);
}

console.log('\n✓ Validation passed: no duplicates, all scores in [0, 100]');

// ══════════════════════════════════════════════════════════════════════
// WRITE OUTPUT
// ══════════════════════════════════════════════════════════════════════

const fileOutput = path.join(__dirname, 'layer_scores_with_tli.csv');
const rows = ['date,L1_score,L2_score,L3_score,L4_score,TLI'];

for (const row of merged) {
  rows.push(`${row.date},${row.l1},${row.l2},${row.l3},${row.l4},${row.tli}`);
}

fs.writeFileSync(fileOutput, rows.join('\n'));

console.log(`\n✓ Merged dataset written: ${fileOutput}`);
console.log(`  Rows: ${merged.length}`);
console.log(`  Columns: date, L1_score, L2_score, L3_score, L4_score, TLI`);

console.log(`\nFirst 5 rows:`);
rows.slice(1, 6).forEach(r => console.log(`  ${r}`));

console.log(`\nLast 5 rows:`);
rows.slice(-5).forEach(r => console.log(`  ${r}`));

console.log('\n' + '═'.repeat(70));
console.log(`Ready for eigenstructure analysis`);
console.log(`Dataset: ${merged.length} months, ${cycles.toFixed(2)} Howell cycles`);
console.log('═'.repeat(70));
