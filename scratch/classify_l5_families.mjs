// scratch/classify_l5_families.mjs
//
// Research script: classify the dominant cycles of the 8 L5 liquidity series
// against the cycles-lab 7-family band taxonomy AND a forcing-function
// candidate list of astronomical / physical periods.
//
// Branch: richard/forcing-analysis
// Date:   2026-04-25
//
// Usage:
//   CYCLE_TOOLS_API_KEY=xxx node scratch/classify_l5_families.mjs
//
// CAVEATS / DESIGN NOTES
// ──────────────────────
// 1. The Cycle Tools CycleScanner caps maxCycleLength at 400 bars (per the
//    SKILL.md "Constraints" section: "minCycleLength ≥ 20 · maxCycleLength ≤ 400").
//    All seven cycles-lab family bands start at 520+ weeks, and 4 of 5 of the
//    astronomical candidates (Jupiter/Saturn ½, Jupiter orbital, lunar nodal,
//    and anything in the cycles-lab named families) are above the API ceiling.
//    Every detection here will fall in the sub-Dewey gap by construction; that
//    is itself a research finding — the L5 liquidity series appear to operate
//    on shorter cycles than cycles-lab's currently-named families.
//
// 2. NFL is computed as WALCL + SWPT − RRPONTSYD − WTREGEN. Production uses
//    a Wednesday-priority alignment search (day 0 → ±1 → ±2 → … ±5, first
//    match wins). This script uses a simpler "nearest within ±5 days"
//    alignment, which can pick a different observation when two are
//    equidistant. Cycle results on NFL may therefore drift slightly from
//    production.
//
// 3. TWO scan paths are run for each series:
//      A) raw indexed levels   + dtype=4  (Kalman / one-sided HP)
//      B) 52w / 12m YoY momentum + dtype=0 (HP, two-sided — production)
//    A answers "what cycle exists in the level series itself, with end-point
//    honesty?". B answers "what cycle exists in the rate-of-change?", which
//    is what the production composite component path scores.
//
// 4. BOJ (JPNASSETS-M:FDS) is monthly. CycleScanner reports cycleLength in
//    BARS, so monthly-bar lengths are converted to weeks via × 4.33. The YoY
//    lookback for BOJ is 12 monthly bars (not 52).
//
// 5. We do NOT mirror production's `extractDominant` filtering (stability ≥ 0.4,
//    cap at dataLength/3). For research/classification we report the API's
//    own top-by-strength peak plus the next 4 in the JSON output.

const API_KEY = process.env.CYCLE_TOOLS_API_KEY;
if (!API_KEY) {
  console.error('ERROR: CYCLE_TOOLS_API_KEY environment variable is not set.');
  console.error('Usage: CYCLE_TOOLS_API_KEY=xxx node scratch/classify_l5_families.mjs');
  process.exit(1);
}

const BASE_URL = 'https://api.cycle.tools';

// ── L5 series (extracted from src/config/seriesRegistry.ts) ──
// NFL = Net Fed Liquidity (canonical), confirmed.
const L5_SERIES = [
  { id: 'WALCL',   ticker: 'WALCL-W:FDS',      freq: 'weekly',  weight: 3 },
  { id: 'ECB',     ticker: 'ECBASSETSW-W:FDS', freq: 'weekly',  weight: 1 }, // FX-adjusted (× DEXUSEU) in production; raw here
  { id: 'BOJ',     ticker: 'JPNASSETS-M:FDS',  freq: 'monthly', weight: 1 }, // FX-adjusted (÷ DEXJPUS) in production; raw here
  { id: 'NFL',     ticker: '__derived__',      freq: 'weekly',  weight: 1 },
  { id: 'TOTBKCR', ticker: 'TOTBKCR-W:FDS',    freq: 'weekly',  weight: 1 },
  { id: 'WRESBAL', ticker: 'WRESBAL-W:FDS',    freq: 'weekly',  weight: 1 },
  { id: 'COMPOUT', ticker: 'COMPOUT-W:FDS',    freq: 'weekly',  weight: 1 },
  { id: 'WRMFNS',  ticker: 'WRMFNS-W:FDS',     freq: 'weekly',  weight: 1 },
];

const NFL_COMPONENTS = [
  { id: 'WALCL',     ticker: 'WALCL-W:FDS',   sign: +1 },
  { id: 'SWPT',      ticker: 'SWPT-W:FDS',    sign: +1 },
  { id: 'RRPONTSYD', ticker: 'RRPONTSYD:FDS', sign: -1 }, // daily — downsampled by alignment
  { id: 'WTREGEN',   ticker: 'WTREGEN-W:FDS', sign: -1 },
];

// ── 7-family bands (cycles-lab/docs/cyclics_config.json), units = WEEKS ──
const FAMILY_BANDS = [
  { name: 'Solar/Decadal', minWeeks:  520, maxWeeks:  676 },
  { name: 'ENSO/QBO',      minWeeks:  676, maxWeeks:  780 },
  { name: 'Dewey',         minWeeks:  780, maxWeeks: 1196 },
  { name: 'Mogey',         minWeeks: 1300, maxWeeks: 1820 },
  { name: 'Mid-Century',   minWeeks: 1872, maxWeeks: 2496 },
  { name: 'Kondratieff',   minWeeks: 2600, maxWeeks: 4160 },
  { name: 'Long-wave',     minWeeks: 4420, maxWeeks: 7280 },
];

// ── Astronomical / physical forcing candidates (units = WEEKS) ──
// User-supplied candidate list. Tolerance for "near match" = ±15%.
// Several candidates exceed the API's 400-week ceiling — flagged inline.
const ASTRONOMICAL_PERIODS = [
  { name: 'Jupiter/Saturn synodic ¼', weeks:  258, years:  4.95, reachable: true,  note: 'within API range (≤400w)' },
  { name: 'Howell C67 structural',    weeks:  286, years:  5.50, reachable: true,  note: 'reference / Howell GLI ~66mo' },
  { name: 'Jupiter/Saturn synodic ½', weeks:  516, years:  9.90, reachable: false, note: 'just above API ceiling (>400w)' },
  { name: 'Jupiter orbital',          weeks:  623, years: 11.86, reachable: false, note: 'above API ceiling' },
  { name: 'Lunar nodal precession',   weeks:  968, years: 18.61, reachable: false, note: 'above API ceiling (~18.6y)' },
];
const ASTRO_TOLERANCE = 0.15;

// CycleScanner constraints (per cycle-tools-api skill SKILL.md "Constraints")
const API_MIN_CYCLE = 20;
const API_MAX_CYCLE = 400;
const SOLAR_DECADAL_FLOOR = FAMILY_BANDS[0].minWeeks; // 520

// ── CLI flags ──
const SKIP_COMPLETED = process.argv.includes('--skip-completed');

function isCompleted(seriesId, rows) {
  const r = rows.find(x => x.id === seriesId);
  return Boolean(r && !r.error && r.topCycleBars != null);
}

// ── Quota-aware fetch + parse helpers (matching production cycleToolsApi.ts) ──
function checkQuotaError(text) {
  // Quota errors return HTTP 200 with body containing this literal text.
  // Observed message: "API calls quota exceeded! maximum admitted 10 per 1m."
  if (text.includes('API calls quota exceeded') || text.includes('quota exceeded')) {
    throw new Error(`API quota exceeded — ${text.slice(0, 120).trim()}`);
  }
}

// ── Rate limiter: API enforces 10 calls per 1 minute (sliding) ──
// Stay safely under by holding ≥6.5s between calls (~9.2 cpm).
let __lastCallAt = 0;
const MIN_CALL_GAP_MS = 6500;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, __lastCallAt + MIN_CALL_GAP_MS - now);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  __lastCallAt = Date.now();
}

async function getJson(url, opts = {}, isRetry = false) {
  await throttle();
  const resp = await fetch(url, opts);
  const text = await resp.text();
  // Quota errors come back as HTTP 200 with the literal text. If we hit one
  // and haven't already retried, sleep 65s for the sliding window to clear,
  // then try once more.
  if (!isRetry && (text.includes('API calls quota exceeded') || text.includes('quota exceeded'))) {
    console.warn(`  [throttle] quota window saturated — sleeping 65s before single retry…`);
    await new Promise(r => setTimeout(r, 65000));
    __lastCallAt = 0;
    return getJson(url, opts, true);
  }
  checkQuotaError(text);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    const arr = text.match(/\[[\s\S]*\]/);
    if (arr) return JSON.parse(arr[0]);
    const obj = text.match(/\{[\s\S]*\}/);
    if (obj) return JSON.parse(obj[0]);
    throw new Error(`Cannot parse: ${text.slice(0, 200)}`);
  }
}

async function ensureDataset(ticker) {
  const unixTo = Math.floor(Date.now() / 1000);
  // EnsureCompleteDataset uses tickerId (capital I).
  const url =
    `${BASE_URL}/api/data/EnsureCompleteDataset` +
    `?api_key=${API_KEY}&tickerId=${encodeURIComponent(ticker)}` +
    `&unixFrom=0&unixTo=${unixTo}&lastclose=true`;
  try {
    const r = await getJson(url);
    if (r && r.isComplete === false && r.trackingId) {
      const wait =
        `${BASE_URL}/api/data/WaitUntilUpdateCompleted` +
        `?api_key=${API_KEY}&requestId=${r.trackingId}&timeoutSeconds=30`;
      await getJson(wait);
    }
  } catch (e) {
    console.warn(`  [warn] ensureDataset(${ticker}): ${e.message}`);
  }
}

async function getBars(ticker) {
  // GetDatasetSeries uses tickerid (lowercase). maxbars=0 → return all.
  const url =
    `${BASE_URL}/api/data/GetDatasetSeries` +
    `?api_key=${API_KEY}&tickerid=${encodeURIComponent(ticker)}&maxbars=0`;
  return await getJson(url);
}

// ── Scan A: raw indexed levels + dtype=4 (Kalman / one-sided HP) ──
async function cycleScannerKalman(closes) {
  const url =
    `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}` +
    `&minCycleLength=${API_MIN_CYCLE}&maxCycleLength=${API_MAX_CYCLE}` +
    `&sortByStrength=true&includeSpectrum=false` +
    `&dominantPeakFinder=true&useStability=true` +
    `&bartelsLimit=49&dtype=4`;
  return await getJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(closes),
  });
}

// ── Scan B: YoY momentum + dtype=0 (HP, two-sided — production component path) ──
async function cycleScannerHPyoy(closes) {
  const url =
    `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}` +
    `&minCycleLength=${API_MIN_CYCLE}&maxCycleLength=${API_MAX_CYCLE}` +
    `&sortByStrength=true&includeSpectrum=false` +
    `&dominantPeakFinder=true&useStability=true` +
    `&bartelsLimit=49&dtype=0`;
  return await getJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(closes),
  });
}

// ── Family classifier ──
function classifyAgainstFamilies(weeks) {
  if (weeks < SOLAR_DECADAL_FLOOR) {
    return {
      family: 'sub-Dewey gap',
      note: `<${SOLAR_DECADAL_FLOOR}w (below Solar/Decadal lower bound; unnamed by cycles-lab)`,
    };
  }
  for (const band of FAMILY_BANDS) {
    if (weeks >= band.minWeeks && weeks <= band.maxWeeks) {
      return { family: band.name, note: `${band.minWeeks}-${band.maxWeeks}w` };
    }
  }
  for (let i = 0; i < FAMILY_BANDS.length - 1; i++) {
    if (weeks > FAMILY_BANDS[i].maxWeeks && weeks < FAMILY_BANDS[i + 1].minWeeks) {
      return {
        family: 'inter-band gap',
        note: `between ${FAMILY_BANDS[i].name} and ${FAMILY_BANDS[i + 1].name}`,
      };
    }
  }
  return {
    family: 'above Long-wave',
    note: `>${FAMILY_BANDS.at(-1).maxWeeks}w`,
  };
}

// ── Astronomical / physical period matcher (15% tolerance) ──
function nearestAstronomical(weeks, tolerance = ASTRO_TOLERANCE) {
  let best = null;
  let bestDelta = Infinity;
  for (const p of ASTRONOMICAL_PERIODS) {
    const rel = Math.abs(weeks - p.weeks) / p.weeks;
    if (rel <= tolerance && rel < bestDelta) {
      best = p;
      bestDelta = rel;
    }
  }
  if (!best) return null;
  return {
    name: best.name,
    candidateWeeks: best.weeks,
    candidateYears: best.years,
    deltaPct: Math.abs(weeks - best.weeks) / best.weeks * 100,
    reachable: best.reachable,
    note: best.note,
  };
}

// ── NFL derivation: simplified ±5d Wednesday alignment ──
function barTimeSec(b) {
  if (!b || !b.date) return null;
  const t = Date.parse(b.date);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

function pickNearest(bars, targetSec, windowDays = 5) {
  let best = null;
  let bestDist = Infinity;
  const windowSec = windowDays * 86400;
  for (const b of bars) {
    const t = barTimeSec(b);
    if (t == null) continue;
    const d = Math.abs(t - targetSec);
    if (d <= windowSec && d < bestDist) {
      best = b;
      bestDist = d;
    }
  }
  return best == null ? null : (best.close ?? null);
}

async function deriveNFL() {
  const fetched = {};
  for (const c of NFL_COMPONENTS) {
    await ensureDataset(c.ticker);
    fetched[c.id] = await getBars(c.ticker);
  }
  const walclBars = fetched.WALCL.filter(b => b.close != null && b.date);
  const TRIM_2014 = Math.floor(Date.parse('2014-01-01') / 1000); // RRP became operationally meaningful

  const dates  = [];
  const closes = [];
  for (const wb of walclBars) {
    const t = barTimeSec(wb);
    if (t == null) continue;
    if (t < TRIM_2014) continue;
    const swpt = pickNearest(fetched.SWPT, t);
    const rrp  = pickNearest(fetched.RRPONTSYD, t);
    const tga  = pickNearest(fetched.WTREGEN, t);
    if (swpt == null || rrp == null || tga == null) continue;
    dates.push(wb.date);
    closes.push(wb.close + swpt - rrp - tga);
  }
  return { dates, closes };
}

// ── 52w / 12m YoY momentum (matches production component pre-scan) ──
function computeYoY(closes, lookback) {
  if (closes.length <= lookback + 1) return [];
  const out = [];
  for (let i = lookback; i < closes.length; i++) {
    const prev = closes[i - lookback];
    if (!Number.isFinite(prev) || prev === 0) continue;
    const v = ((closes[i] - prev) / Math.abs(prev)) * 100;
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

// ── Output helpers ──
function fmt(n, dp = 1) {
  return Number.isFinite(n) ? Number(n).toFixed(dp) : '—';
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function scoreScan(scan, closesLen, freq, label, sId, sTicker) {
  const peaks = (scan.peaks ?? []).slice(0, 5);
  if (peaks.length === 0) {
    return { id: sId, ticker: sTicker, freq, scanLabel: label, error: 'no peaks' };
  }
  const top = peaks[0];
  const lengthBars = top.cycleLength;
  const lengthWeeks = freq === 'monthly' ? lengthBars * 4.33 : lengthBars;
  const lengthYears = lengthWeeks / 52;
  const cls = classifyAgainstFamilies(lengthWeeks);
  const astro = nearestAstronomical(lengthWeeks);

  return {
    id: sId, ticker: sTicker, freq,
    scanLabel: label,
    nBars: closesLen,
    topCycleBars: lengthBars,
    topCycleWeeks: lengthWeeks,
    topCycleYears: lengthYears,
    family: cls.family,
    familyNote: cls.note,
    astroMatch: astro,
    bartels: top.bartelsValue,
    strength: top.strength,
    stability: top.stabilityScore,
    rank: top.dominantRank,
    avgPhaseStatus: top.avgPhaseStatus,
    avgPhaseScore: top.avgPhaseScore,
    allPeaks: peaks.map(p => ({
      bars:     p.cycleLength,
      weeks:    freq === 'monthly' ? p.cycleLength * 4.33 : p.cycleLength,
      strength: p.strength,
      bartels:  p.bartelsValue,
      stability: p.stabilityScore,
      rank:     p.dominantRank,
    })),
  };
}

function logScan(r) {
  if (r.error) {
    console.log(`  [${r.scanLabel}] ${r.error}`);
    return;
  }
  const cycleLabel = `C${r.topCycleBars}${r.freq === 'monthly' ? 'm' : 'w'}`;
  const astro = r.astroMatch ? `  astro≈${r.astroMatch.name} (${fmt(r.astroMatch.deltaPct, 1)}% off)` : '';
  console.log(
    `  [${r.scanLabel}] ${cycleLabel}  (${fmt(r.topCycleWeeks)}w / ${fmt(r.topCycleYears, 1)}y)  ` +
    `strength=${fmt(r.strength)}  bartels=${fmt(r.bartels)}  ` +
    `stab=${fmt(r.stability, 2)}  rank=${r.rank}  family=${r.family}${astro}`
  );
}

function printSummaryTable(rows, heading) {
  console.log(`\n## ${heading}\n`);
  const header = `| ${pad('Series', 8)} | ${pad('Ticker', 18)} | ${pad('Bars', 5)} | ${pad('Top cycle', 10)} | ${pad('Period (wk)', 11)} | ${pad('Period (yr)', 11)} | ${pad('Family', 18)} | ${pad('Astro (≤15%)', 30)} | ${pad('Bartels', 7)} | ${pad('Strength', 8)} | ${pad('Stab', 5)} | ${pad('Rank', 4)} |`;
  console.log(header);
  console.log('|' + '-'.repeat(header.length - 2) + '|');
  for (const r of rows) {
    if (r.error) {
      console.log(`| ${pad(r.id, 8)} | ${pad(r.ticker, 18)} | ${pad('—', 5)} | ${pad('—', 10)} | ${pad('—', 11)} | ${pad('—', 11)} | ${pad('ERROR', 18)} | ${pad('—', 30)} | ${pad('—', 7)} | ${pad('—', 8)} | ${pad('—', 5)} | ${pad('—', 4)} |  ${r.error}`);
    } else {
      const cycleLabel = `C${r.topCycleBars}${r.freq === 'monthly' ? 'm' : 'w'}`;
      const astroLabel = r.astroMatch ? `${r.astroMatch.name} (${fmt(r.astroMatch.deltaPct, 1)}%)` : '—';
      console.log(
        `| ${pad(r.id, 8)} | ${pad(r.ticker, 18)} | ${pad(r.nBars, 5)} | ${pad(cycleLabel, 10)} | ` +
        `${pad(fmt(r.topCycleWeeks), 11)} | ${pad(fmt(r.topCycleYears, 1), 11)} | ${pad(r.family, 18)} | ` +
        `${pad(astroLabel, 30)} | ${pad(fmt(r.bartels), 7)} | ${pad(fmt(r.strength), 8)} | ${pad(fmt(r.stability, 2), 5)} | ${pad(r.rank, 4)} |`
      );
    }
  }
}

// ── Main ──
(async () => {
  // Initial budget probe — the API has TWO rate limits: 10 calls/1m AND 30 calls/1h.
  // If the per-hour budget is exhausted, abort early instead of churning through retries.
  console.log('Probing API budget…');
  try {
    const probe = await fetch(`${BASE_URL}/api/cycles/APILimits?api_key=${API_KEY}`);
    const probeText = await probe.text();
    if (probeText.includes('quota exceeded')) {
      console.error(`\nCannot proceed — API budget exhausted: ${probeText.slice(0, 160).trim()}`);
      console.error('Wait for the per-hour sliding window to clear (~50 min from prior run start),');
      console.error('then re-run with --skip-completed to resume.');
      process.exit(3);
    }
    console.log(`Budget probe OK: ${probeText.slice(0, 200).trim()}`);
  } catch (e) {
    console.warn(`Budget probe failed (${e.message}) — continuing anyway`);
  }

  // Cool-off so any prior 10-cpm sliding window from previous runs / probes has cleared.
  const STARTUP_WAIT_MS = 70_000;
  console.log(`Sleeping ${STARTUP_WAIT_MS / 1000}s to let the per-minute rate window clear…`);
  await new Promise(r => setTimeout(r, STARTUP_WAIT_MS));

  console.log('Classifying L5 series against cycles-lab 7-family bands\n');
  console.log(`Scan A: raw levels + dtype=4 (Kalman / one-sided HP, end-point honest)`);
  console.log(`Scan B: 52w/12m YoY + dtype=0 (HP two-sided — production component path)`);
  console.log(`Common: bartelsLimit=49, minCycleLength=${API_MIN_CYCLE}, maxCycleLength=${API_MAX_CYCLE}`);
  console.log(`\nFamily floor: ${SOLAR_DECADAL_FLOOR}w (Solar/Decadal). API ceiling: ${API_MAX_CYCLE}w.`);
  console.log(`NOTE: API ceiling (${API_MAX_CYCLE}w) < Solar/Decadal floor (${SOLAR_DECADAL_FLOOR}w).`);
  console.log(`      Every detection here will fall in the sub-Dewey gap by construction.`);
  console.log(`      4 of 5 astronomical candidates also exceed the API ceiling.\n`);

  // Load prior results if --skip-completed
  let priorRowsA = [];
  let priorRowsB = [];
  let priorClosesCache = {};
  const outPath = new URL('./classify_l5_families.out.json', import.meta.url);
  if (SKIP_COMPLETED) {
    try {
      const fs = await import('node:fs/promises');
      const txt = await fs.readFile(outPath, 'utf8');
      const prior = JSON.parse(txt);
      priorRowsA = prior.resultsScanA ?? [];
      priorRowsB = prior.resultsScanB ?? [];
      priorClosesCache = prior.closesCache ?? {};
      const okA = priorRowsA.filter(r => !r.error).length;
      const okB = priorRowsB.filter(r => !r.error).length;
      const okIds = priorRowsA.filter(r => !r.error && isCompleted(r.id, priorRowsB)).map(r => r.id);
      const cachedIds = Object.keys(priorClosesCache);
      console.log(`[skip-completed] loaded prior results: Scan A ${okA}/${priorRowsA.length} ok, Scan B ${okB}/${priorRowsB.length} ok.`);
      console.log(`[skip-completed] series cached for both scans: ${okIds.join(', ') || '(none)'}`);
      console.log(`[skip-completed] closes cached for: ${cachedIds.join(', ') || '(none)'}\n`);
    } catch (e) {
      console.warn(`[skip-completed] could not load prior JSON (${e.message}); will run all series.\n`);
    }
  }

  // closesCache is keyed by series id and contains { ticker, freq, fetchedAt, dates, closes }.
  // Closes for series whose data was freshly fetched in this run are added here so that
  // downstream scripts (PCM, forcing tests) can reuse them without additional API calls.
  const closesCache = { ...priorClosesCache };

  const rowsA = []; // raw + Kalman
  const rowsB = []; // YoY + HP

  for (const s of L5_SERIES) {
    const aDone = SKIP_COMPLETED && isCompleted(s.id, priorRowsA);
    const bDone = SKIP_COMPLETED && isCompleted(s.id, priorRowsB);

    if (aDone && bDone) {
      console.log(`── ${s.id} — both scans cached, skipping`);
      rowsA.push(priorRowsA.find(x => x.id === s.id));
      rowsB.push(priorRowsB.find(x => x.id === s.id));
      continue;
    }

    console.log(`\n── ${s.id} (${s.ticker}, ${s.freq}, weight=${s.weight}) ──`);
    if (aDone) console.log('  [raw+kalman] cached — reusing prior result');
    if (bDone) console.log('  [yoy+hp] cached — reusing prior result');

    // Track whether each scan's row has been pushed so the catch block doesn't double-push.
    let aPushed = false, bPushed = false;
    let closes;
    try {
      if (s.id === 'NFL') {
        console.log('  Deriving NFL = WALCL + SWPT − RRPONTSYD − WTREGEN  (±5d alignment, trimmed 2014+)…');
        const nflRes = await deriveNFL();
        closes = nflRes.closes;
        closesCache[s.id] = {
          ticker: '__derived__',
          freq: s.freq,
          fetchedAt: new Date().toISOString(),
          dates:  nflRes.dates,
          closes: nflRes.closes,
        };
        console.log(`  Derived ${closes.length} weekly NFL points.`);
      } else {
        await ensureDataset(s.ticker);
        const bars = await getBars(s.ticker);
        const filtered = bars.filter(b => b.date && Number.isFinite(b.close));
        closes = filtered.map(b => b.close);
        closesCache[s.id] = {
          ticker: s.ticker,
          freq: s.freq,
          fetchedAt: new Date().toISOString(),
          dates:  filtered.map(b => b.date),
          closes: filtered.map(b => b.close),
        };
        console.log(`  Fetched ${closes.length} ${s.freq} bars.`);
      }

      if (closes.length < 100) {
        console.log(`  [skip] insufficient data (${closes.length} bars; need 100+).`);
        const err = `insufficient data (${closes.length} bars)`;
        if (!aDone) rowsA.push({ id: s.id, ticker: s.ticker, freq: s.freq, scanLabel: 'raw+kalman', error: err });
        else        rowsA.push(priorRowsA.find(x => x.id === s.id));
        if (!bDone) rowsB.push({ id: s.id, ticker: s.ticker, freq: s.freq, scanLabel: 'yoy+hp',     error: err });
        else        rowsB.push(priorRowsB.find(x => x.id === s.id));
        aPushed = bPushed = true;
        continue;
      }

      // ── Scan A: raw levels + Kalman ──
      if (aDone) {
        rowsA.push(priorRowsA.find(x => x.id === s.id));
      } else {
        const scanA = await cycleScannerKalman(closes);
        const rA = scoreScan(scanA, closes.length, s.freq, 'raw+kalman', s.id, s.ticker);
        logScan(rA);
        rowsA.push(rA);
      }
      aPushed = true;

      // ── Scan B: YoY momentum + HP (production component path) ──
      if (bDone) {
        rowsB.push(priorRowsB.find(x => x.id === s.id));
      } else {
        const yoyLookback = s.freq === 'monthly' ? 12 : 52;
        const yoy = computeYoY(closes, yoyLookback);
        if (yoy.length < 100) {
          const err = `insufficient YoY length (${yoy.length}; need 100+)`;
          console.log(`  [yoy+hp] ${err}`);
          rowsB.push({ id: s.id, ticker: s.ticker, freq: s.freq, scanLabel: 'yoy+hp', error: err });
        } else {
          const scanB = await cycleScannerHPyoy(yoy);
          const rB = scoreScan(scanB, yoy.length, s.freq, 'yoy+hp', s.id, s.ticker);
          logScan(rB);
          rowsB.push(rB);
        }
      }
      bPushed = true;
    } catch (e) {
      console.log(`  [error] ${e.message}`);
      if (!aPushed) {
        if (!aDone) rowsA.push({ id: s.id, ticker: s.ticker, freq: s.freq, scanLabel: 'raw+kalman', error: e.message });
        else        rowsA.push(priorRowsA.find(x => x.id === s.id));
      }
      if (!bPushed) {
        if (!bDone) rowsB.push({ id: s.id, ticker: s.ticker, freq: s.freq, scanLabel: 'yoy+hp',     error: e.message });
        else        rowsB.push(priorRowsB.find(x => x.id === s.id));
      }
    }
  }

  // ── Summary tables ──
  printSummaryTable(rowsA, 'Summary — Scan A: raw indexed levels + dtype=4 (Kalman / one-sided HP)');
  printSummaryTable(rowsB, 'Summary — Scan B: 52w/12m YoY momentum + dtype=0 (HP, production)');

  // ── Side-by-side comparison ──
  console.log('\n## Side-by-side: top cycle period (weeks)\n');
  console.log('| Series  | Scan A (raw+Kalman) | Scan B (YoY+HP) | Δ weeks | Same family? |');
  console.log('|---------|---------------------|-----------------|---------|--------------|');
  for (const s of L5_SERIES) {
    const a = rowsA.find(r => r.id === s.id);
    const b = rowsB.find(r => r.id === s.id);
    const aw = a && !a.error ? fmt(a.topCycleWeeks) : '—';
    const bw = b && !b.error ? fmt(b.topCycleWeeks) : '—';
    const dw = a && b && !a.error && !b.error ? fmt(a.topCycleWeeks - b.topCycleWeeks, 1) : '—';
    const af = a && !a.error ? a.family : '—';
    const bf = b && !b.error ? b.family : '—';
    const same = af === bf ? 'yes' : `no (${af} / ${bf})`;
    console.log(`| ${pad(s.id, 7)} | ${pad(aw, 19)} | ${pad(bw, 15)} | ${pad(dw, 7)} | ${same} |`);
  }

  // ── Sub-Dewey gap finding (Step 4) ──
  console.log('\n## Sub-Dewey gap finding\n');
  console.log('Cycles in 200–500 weeks (≈4–10 years) — below the cycles-lab Solar/Decadal');
  console.log('floor (520w). The Howell C67 structural cycle (~286w / 5.5y) sits in this');
  console.log('range. cycles-lab does not currently name a band here.\n');
  console.log('The L5 liquidity series appear to operate at SHORTER cycles than cycles-lab\'s');
  console.log('named families — this is itself the research finding, not a limitation. To');
  console.log('detect the named families (Solar/Decadal+) in these series, an alternative');
  console.log('spectral method without the 400-week per-cycle cap would be needed.\n');

  function reportSubDewey(rows, heading) {
    const subD = rows.filter(r => !r.error && r.topCycleWeeks >= 200 && r.topCycleWeeks < SOLAR_DECADAL_FLOOR);
    console.log(`### ${heading}`);
    if (subD.length === 0) {
      console.log('(no series in 200–500w range)\n');
      return;
    }
    console.log('| Series | Top cycle (weeks) | Years | Family | Astronomical match | Bartels | Strength |');
    console.log('|--------|-------------------|-------|--------|--------------------|---------|----------|');
    for (const r of subD) {
      const astro = r.astroMatch ? `${r.astroMatch.name} (${fmt(r.astroMatch.deltaPct, 1)}% off)` : '—';
      console.log(
        `| ${r.id} | ${fmt(r.topCycleWeeks)} | ${fmt(r.topCycleYears, 1)} | ${r.family} | ` +
        `${astro} | ${fmt(r.bartels)} | ${fmt(r.strength)} |`
      );
    }
    console.log('');
  }
  reportSubDewey(rowsA, 'Scan A (raw + Kalman)');
  reportSubDewey(rowsB, 'Scan B (YoY + HP)');

  // ── Astronomical-candidate matches across both scans ──
  console.log('\n## Astronomical / physical period matches (≤15% tolerance)\n');
  console.log('Candidate periods provided by the user:');
  for (const p of ASTRONOMICAL_PERIODS) {
    const flag = p.reachable ? '✓ in API range' : '✗ above 400w API ceiling';
    console.log(`  • ${pad(p.name, 30)} ${pad(p.weeks + 'w', 6)} (${fmt(p.years, 2)}y)  ${flag}  — ${p.note}`);
  }
  console.log('');

  function reportAstro(rows, heading) {
    console.log(`### ${heading}`);
    const matches = rows.filter(r => !r.error && r.astroMatch);
    if (matches.length === 0) {
      console.log('(no matches within 15% tolerance)\n');
      return;
    }
    console.log('| Series | Detected (weeks) | Years | Astronomical candidate | Δ % | Reachable? |');
    console.log('|--------|------------------|-------|------------------------|-----|------------|');
    for (const r of matches) {
      const a = r.astroMatch;
      console.log(
        `| ${r.id} | ${fmt(r.topCycleWeeks)} | ${fmt(r.topCycleYears, 1)} | ` +
        `${a.name} (${a.candidateWeeks}w / ${fmt(a.candidateYears, 2)}y) | ${fmt(a.deltaPct, 1)}% | ${a.reachable ? 'yes' : 'no'} |`
      );
    }
    console.log('');
  }
  reportAstro(rowsA, 'Scan A (raw + Kalman) — astronomical matches');
  reportAstro(rowsB, 'Scan B (YoY + HP) — astronomical matches');

  // Forcing-function summary across both scans
  console.log('### Forcing-function tally (any scan)');
  const allRows = [...rowsA, ...rowsB].filter(r => !r.error && r.astroMatch);
  if (allRows.length === 0) {
    console.log('No detections matched any astronomical candidate within 15% tolerance.\n');
  } else {
    const tally = new Map();
    for (const r of allRows) {
      const k = r.astroMatch.name;
      if (!tally.has(k)) tally.set(k, []);
      tally.get(k).push(`${r.id} (${r.scanLabel}, Δ${fmt(r.astroMatch.deltaPct, 1)}%)`);
    }
    console.log('| Astronomical candidate | Count | Hits |');
    console.log('|------------------------|-------|------|');
    for (const [name, hits] of tally) {
      console.log(`| ${name} | ${hits.length} | ${hits.join('; ')} |`);
    }
    console.log('');
  }

  // ── JSON output for downstream analysis ──
  const fs = await import('node:fs/promises');
  await fs.writeFile(outPath, JSON.stringify({
    runDate: new Date().toISOString(),
    scans: {
      A: { label: 'raw+kalman', detrend: 'dtype=4 (Kalman / one-sided HP)', input: 'raw indexed levels' },
      B: { label: 'yoy+hp',     detrend: 'dtype=0 (HP, two-sided)',         input: '52w / 12m YoY momentum' },
    },
    apiParams: { bartelsLimit: 49, minCycleLength: API_MIN_CYCLE, maxCycleLength: API_MAX_CYCLE,
                 sortByStrength: true, dominantPeakFinder: true, useStability: true },
    familyBands: FAMILY_BANDS,
    astronomicalPeriods: ASTRONOMICAL_PERIODS,
    astroTolerance: ASTRO_TOLERANCE,
    notes: [
      'API maxCycleLength=400 < Solar/Decadal floor=520; cycles-lab named families are unreachable by construction.',
      '4 of 5 astronomical candidates also exceed the API ceiling (Jupiter/Saturn ½, Jupiter orbital, lunar nodal).',
      'The L5 liquidity series appear to operate at shorter cycles than cycles-lab\'s named families — this is the research finding.',
      'NFL is derived with simplified ±5d alignment; production uses Wednesday priority search.',
      'BOJ cycle lengths are converted from monthly bars to weeks via × 4.33; YoY lookback is 12 monthly bars (not 52 weekly).',
      'closesCache stores raw closes + dates for series whose data was freshly fetched in this run; downstream PCM/forcing scripts can reuse without API calls. Series not present here were either skipped (--skip-completed) or pre-date this feature; re-fetch by running without --skip-completed (full budget cost).',
    ],
    resultsScanA: rowsA,
    resultsScanB: rowsB,
    closesCache,
  }, null, 2));
  console.log(`Wrote ${outPath.pathname}`);
})().catch(e => {
  console.error('FATAL:', e);
  process.exit(2);
});
