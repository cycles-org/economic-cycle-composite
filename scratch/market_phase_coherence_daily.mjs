// scratch/market_phase_coherence_daily.mjs
//
// CyclesTV episode analysis (DAILY): find uncorrelated pairs across major asset
// classes, detect shared cycle periods, and test phase coherence with
// the validated PCM pipeline (Butterworth + Hilbert + 1000 surrogates).
//
// Key differences from weekly version:
// - 1000 daily bars per ticker (not 850 weekly)
// - Cycle detection band: 50–200 days (not 20–400 weeks)
// - Daily returns for correlation (not weekly)
// - All cycle/period values in trading days (not weeks)
//
// Pipeline:
//   1. Fetch ~1000 daily bars per ticker (EnsureCompleteDataset → GetBars)
//   2. Pearson correlation on daily returns; identify |r| < 0.3 pairs
//   3. CycleScanner (dtype=4 Kalman, 50–200d band) on each ticker in any uncorrelated pair
//   4. Detect shared periods (within 15% tolerance) within uncorrelated pairs
//   5. PCM (Butterworth band centered on shared period × [0.75, 1.33] +
//      1000 phase-shuffled surrogates) on shared-period pairs
//
// Output: scratch/market_phase_coherence_daily.md  +  scratch/market_phase_coherence_daily.json
//
// Usage:
//   CYCLE_TOOLS_API_KEY=xxx node scratch/market_phase_coherence_daily.mjs

const API_KEY = process.env.CYCLE_TOOLS_API_KEY;
if (!API_KEY) {
  console.error('ERROR: CYCLE_TOOLS_API_KEY not set.');
  process.exit(1);
}

const BASE_URL = 'https://api.cycle.tools';
const REPORT_PATH = new URL('./market_phase_coherence_daily.md',   import.meta.url);
const JSON_PATH   = new URL('./market_phase_coherence_daily.json', import.meta.url);

// User-supplied Yahoo-style symbols → cycle.tools tickerIds.
// Convention: <SYMBOL>:YFI (Yahoo Finance Index data feed, daily bars by default).
const SYMBOLS = [
  { user: '^GSPC', desc: 'S&P 500',           tickerId: '^GSPC:YFI' },
  { user: 'GLD',   desc: 'Gold ETF',          tickerId: 'GLD:YFI' },
  { user: 'TLT',   desc: 'Long bonds ETF',    tickerId: 'TLT:YFI' },
  { user: 'DBC',   desc: 'Broad commodities', tickerId: 'DBC:YFI' },
  { user: 'EEM',   desc: 'Emerging markets',  tickerId: 'EEM:YFI' },
  { user: 'UUP',   desc: 'US Dollar',         tickerId: 'UUP:YFI' },
  { user: 'VNQ',   desc: 'Real estate',       tickerId: 'VNQ:YFI' },
  { user: 'WEAT',  desc: 'Wheat ETF',         tickerId: 'WEAT:YFI' },
];

const TARGET_BARS               = 1000;
const MIN_BARS                  = 200;
const UNCORRELATED_THRESHOLD    = 0.30;   // |r| < this = uncorrelated
const SHARED_PERIOD_TOLERANCE   = 0.15;   // longer/shorter ≤ 1.15 = shared
const N_SURROGATES              = 1000;
const PCM_BAND_LOW_FRACTION     = 0.75;   // band lower bound = period × 0.75
const PCM_BAND_HIGH_FRACTION    = 1.33;   // band upper bound = period × 1.33

// ── Throttle: API rate caps are 10/min and 30/h ──
let __lastCallAt = 0;
const MIN_CALL_GAP_MS = 6500;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, __lastCallAt + MIN_CALL_GAP_MS - now);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  __lastCallAt = Date.now();
}

function checkQuotaError(text) {
  if (text.includes('API calls quota exceeded') || text.includes('quota exceeded')) {
    throw new Error(`API quota exceeded — ${text.slice(0, 120).trim()}`);
  }
}

async function getJson(url, opts = {}) {
  await throttle();
  const resp = await fetch(url, opts);
  const text = await resp.text();
  checkQuotaError(text);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
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

async function ensureDataset(tickerId) {
  const unixTo = Math.floor(Date.now() / 1000);
  const url = `${BASE_URL}/api/data/EnsureCompleteDataset?api_key=${API_KEY}&tickerId=${encodeURIComponent(tickerId)}&unixFrom=0&unixTo=${unixTo}&lastclose=true`;
  try {
    const r = await getJson(url);
    if (r && r.isComplete === false && r.trackingId) {
      const wait = `${BASE_URL}/api/data/WaitUntilUpdateCompleted?api_key=${API_KEY}&requestId=${r.trackingId}&timeoutSeconds=30`;
      await getJson(wait);
    }
  } catch (e) {
    console.warn(`  [warn] ensureDataset(${tickerId}): ${e.message}`);
  }
}

async function getBars(tickerId, maxbars = TARGET_BARS) {
  const url = `${BASE_URL}/api/data/GetDatasetSeries?api_key=${API_KEY}&tickerid=${encodeURIComponent(tickerId)}&maxbars=${maxbars}`;
  return await getJson(url);
}

async function cycleScannerKalman(closes) {
  const url = `${BASE_URL}/api/cycles/CycleScanner?api_key=${API_KEY}` +
    `&minCycleLength=50&maxCycleLength=200` +
    `&sortByStrength=true&includeSpectrum=false` +
    `&dominantPeakFinder=true&useStability=true` +
    `&bartelsLimit=49&dtype=4`;
  return await getJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(closes),
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Math: FFT, Hilbert, Butterworth, surrogate (copied from pcm_ecb_jupiter_saturn.mjs)
// ──────────────────────────────────────────────────────────────────────────

function nextPow2(n) { let p = 1; while (p < n) p <<= 1; return p; }

function fft(re, im, inverse = false) {
  const n = re.length;
  if (n === 0) return;
  if ((n & (n - 1)) !== 0) throw new Error(`FFT length ${n} not power of 2`);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang  = (inverse ? 2 : -2) * Math.PI / len;
    const wRe0 = Math.cos(ang), wIm0 = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wr = 1, wi = 0;
      for (let k = 0; k < half; k++) {
        const tr = wr * re[i + k + half] - wi * im[i + k + half];
        const ti = wr * im[i + k + half] + wi * re[i + k + half];
        re[i + k + half] = re[i + k] - tr;
        im[i + k + half] = im[i + k] - ti;
        re[i + k] += tr;
        im[i + k] += ti;
        const nwr = wr * wRe0 - wi * wIm0;
        const nwi = wr * wIm0 + wi * wRe0;
        wr = nwr; wi = nwi;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
}

function hilbert(x) {
  const n = x.length;
  const N = nextPow2(n);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < n; i++) re[i] = Number.isFinite(x[i]) ? x[i] : 0;
  fft(re, im, false);
  const half = N >> 1;
  for (let k = 1; k < half; k++) { re[k] *= 2; im[k] *= 2; }
  for (let k = half + 1; k < N; k++) { re[k] = 0; im[k] = 0; }
  fft(re, im, true);
  return { re: Array.from(re.subarray(0, n)), im: Array.from(im.subarray(0, n)) };
}

function instantaneousPhase(x) {
  const a = hilbert(x);
  return a.re.map((r, i) => Math.atan2(a.im[i], r));
}

function butterBandpassBiquads(lowFreq, highFreq, sampleRate) {
  const f0 = Math.sqrt(lowFreq * highFreq);
  const BW = highFreq - lowFreq;
  const Qoverall = f0 / BW;
  const angles = [Math.PI / 8, 3 * Math.PI / 8];
  return angles.map(angle => {
    const Q = Qoverall / (2 * Math.sin(angle));
    const w0 = 2 * Math.PI * f0 / sampleRate;
    const alpha = Math.sin(w0) / (2 * Q);
    const cos_w0 = Math.cos(w0);
    const a0 = 1 + alpha;
    return {
      b0:  alpha / a0,
      b1:  0,
      b2: -alpha / a0,
      a1: -2 * cos_w0 / a0,
      a2: (1 - alpha) / a0,
    };
  });
}

function applyBiquad(x, sec) {
  const y = new Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = Number.isFinite(x[i]) ? x[i] : 0;
    const yi = sec.b0 * xi + sec.b1 * x1 + sec.b2 * x2 - sec.a1 * y1 - sec.a2 * y2;
    y[i] = yi;
    x2 = x1; x1 = xi;
    y2 = y1; y1 = yi;
  }
  return y;
}

function butterworthBandpassZeroPhase(x, lowFreq, highFreq, sampleRate = 1) {
  const sections = butterBandpassBiquads(lowFreq, highFreq, sampleRate);
  let y = x.slice();
  for (const sec of sections) y = applyBiquad(y, sec);
  y.reverse();
  for (const sec of sections) y = applyBiquad(y, sec);
  y.reverse();
  return y;
}

function makeRNG(seed = 42) {
  let state = seed >>> 0;
  if (state === 0) state = 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

function phaseSurrogate(x, rng) {
  const n = x.length;
  const N = nextPow2(n);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < n; i++) re[i] = Number.isFinite(x[i]) ? x[i] : 0;
  fft(re, im, false);
  const half = N >> 1;
  for (let k = 1; k < half; k++) {
    const newPhase = 2 * Math.PI * rng();
    const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    re[k] = mag * Math.cos(newPhase);
    im[k] = mag * Math.sin(newPhase);
    re[N - k] = re[k];
    im[N - k] = -im[k];
  }
  im[0] = 0;
  if (half * 2 === N) im[half] = 0;
  fft(re, im, true);
  return Array.from(re.subarray(0, n));
}

function wrapPhase(d) {
  let v = d;
  while (v >  Math.PI) v -= 2 * Math.PI;
  while (v < -Math.PI) v += 2 * Math.PI;
  return v;
}

function phaseDiff(p1, p2) {
  return p1.map((v, i) => wrapPhase(v - p2[i]));
}

function trimEnds(x, k) { return x.slice(k, x.length - k); }

function stdDev(arr) {
  const v = arr.filter(Number.isFinite);
  if (v.length === 0) return NaN;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const s2 = v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length;
  return Math.sqrt(s2);
}

function meanLinear(arr) {
  const v = arr.filter(Number.isFinite);
  return v.length === 0 ? NaN : v.reduce((a, b) => a + b, 0) / v.length;
}

function circularStd(arr) {
  const v = arr.filter(Number.isFinite);
  if (v.length === 0) return NaN;
  let cs = 0, sn = 0;
  for (const a of v) { cs += Math.cos(a); sn += Math.sin(a); }
  const R = Math.sqrt(cs * cs + sn * sn) / v.length;
  if (R <= 0 || R > 1) return NaN;
  return Math.sqrt(-2 * Math.log(R));
}

// ──────────────────────────────────────────────────────────────────────────
// Statistics + alignment
// ──────────────────────────────────────────────────────────────────────────

function pearsonCorr(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 10) return NaN;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
  mx /= n; my /= n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx <= 0 || dy <= 0) return NaN;
  return num / Math.sqrt(dx * dy);
}

function alignByDate(barsA, barsB) {
  const indexB = new Map();
  for (const b of barsB) {
    if (b.date && Number.isFinite(b.close)) indexB.set(b.date, b.close);
  }
  const aligned = [];
  for (const a of barsA) {
    if (!a.date || !Number.isFinite(a.close)) continue;
    if (!indexB.has(a.date)) continue;
    aligned.push({ date: a.date, a: a.close, b: indexB.get(a.date) });
  }
  return aligned;
}

function returnsFromAligned(aligned) {
  const aRets = [];
  const bRets = [];
  for (let i = 1; i < aligned.length; i++) {
    const aPrev = aligned[i-1].a;
    const bPrev = aligned[i-1].b;
    if (aPrev > 0 && bPrev > 0) {
      aRets.push((aligned[i].a - aPrev) / aPrev);
      bRets.push((aligned[i].b - bPrev) / bPrev);
    }
  }
  return { aRets, bRets };
}

// 8-bin phase status mapping (sin convention: 0=zero crossing rising, π/2=peak, π=zero falling, 3π/2=trough)
function phaseStatusFromAngle(phaseRad) {
  let p = phaseRad % (2 * Math.PI);
  if (p < 0) p += 2 * Math.PI;
  const pi = Math.PI;
  if (p < pi / 4)        return 'Uptrend_Starting';
  if (p < 3 * pi / 8)    return 'Uptrend_Neutral';
  if (p < 5 * pi / 8)    return 'TOP_Arrival';
  if (p < 3 * pi / 4)    return 'TOP_Departure';
  if (p < pi)            return 'Downtrend_Starting';
  if (p < 5 * pi / 4)    return 'Downtrend_Neutral';
  if (p < 11 * pi / 8)   return 'Downtrend_ApproachingBottom';
  if (p < 13 * pi / 8)   return 'BOTTOM_Arrival';
  if (p < 7 * pi / 4)    return 'BOTTOM_Departure';
  return 'Uptrend_Starting';
}

// ── Output helpers ──
function fmt(n, dp = 3) { return Number.isFinite(n) ? Number(n).toFixed(dp) : '—'; }
function pad(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

(async () => {
  console.log('Market phase-coherence analysis (DAILY): 8-ticker correlation + cycle + PCM');
  console.log(`Tickers: ${SYMBOLS.map(s => s.user).join(', ')}\n`);

  // Budget probe
  console.log('Probing API budget…');
  try {
    const probe = await fetch(`${BASE_URL}/api/cycles/APILimits?api_key=${API_KEY}`);
    const ptext = await probe.text();
    if (ptext.includes('quota exceeded')) {
      console.error(`Cannot proceed — ${ptext.slice(0, 160).trim()}`);
      process.exit(3);
    }
    console.log('Budget OK.\n');
  } catch (e) {
    console.warn(`Probe failed (${e.message}) — continuing.\n`);
  }

  // ── Step 1: Fetch all tickers (using hard-coded tickerId mapping; no SearchSymbols) ──
  console.log('## Step 1: Fetching price history\n');
  const tickerData = [];
  for (const sym of SYMBOLS) {
    const tickerId = sym.tickerId;
    console.log(`${sym.user} → ${tickerId} (${sym.desc})`);
    try {
      await ensureDataset(tickerId);
      const bars = await getBars(tickerId, TARGET_BARS);
      if (!Array.isArray(bars) || bars.length === 0) {
        console.warn(`  ✗ ${sym.user}: no bars returned`);
        tickerData.push({ user: sym.user, desc: sym.desc, tickerId, error: 'no bars' });
        continue;
      }
      const dated = bars.filter(b => b.date && Number.isFinite(b.close));
      const flag = dated.length < MIN_BARS ? `  ⚠ < ${MIN_BARS} bars` : '';
      console.log(`  ${dated.length} bars (${dated[0]?.date} → ${dated.at(-1)?.date})${flag}`);
      tickerData.push({
        user: sym.user,
        desc: sym.desc,
        tickerId,
        bars: dated,
        closes: dated.map(b => b.close),
      });
    } catch (e) {
      console.warn(`  ✗ ${sym.user}: ${e.message}`);
      tickerData.push({ user: sym.user, desc: sym.desc, tickerId, error: e.message });
    }
  }

  const validTickers = tickerData.filter(t => !t.error && t.bars && t.bars.length >= MIN_BARS);
  if (validTickers.length < 2) {
    console.error(`\nFATAL: only ${validTickers.length} valid tickers; need at least 2.`);
    process.exit(4);
  }

  // ── Step 2: Correlation matrix on daily returns ──
  console.log('\n## Step 2: Correlation matrix on daily returns\n');

  const symbols = validTickers.map(t => t.user);
  const corrMatrix = {};
  const overlapMatrix = {};
  for (const a of validTickers) {
    corrMatrix[a.user] = {};
    overlapMatrix[a.user] = {};
    for (const b of validTickers) {
      if (a.user === b.user) {
        corrMatrix[a.user][b.user] = 1.0;
        overlapMatrix[a.user][b.user] = a.bars.length;
        continue;
      }
      const aligned = alignByDate(a.bars, b.bars);
      if (aligned.length < 50) {
        corrMatrix[a.user][b.user] = NaN;
        overlapMatrix[a.user][b.user] = aligned.length;
        continue;
      }
      const { aRets, bRets } = returnsFromAligned(aligned);
      corrMatrix[a.user][b.user] = pearsonCorr(aRets, bRets);
      overlapMatrix[a.user][b.user] = aRets.length;
    }
  }

  // Print matrix
  const colWidth = 8;
  console.log(' '.repeat(colWidth) + symbols.map(s => pad(s, colWidth)).join(''));
  for (const a of symbols) {
    let row = pad(a, colWidth);
    for (const b of symbols) {
      const v = corrMatrix[a][b];
      row += pad(Number.isFinite(v) ? v.toFixed(2) : '—', colWidth);
    }
    console.log(row);
  }

  // Identify uncorrelated pairs (|r| < threshold)
  const uncorrelatedPairs = [];
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const a = symbols[i], b = symbols[j];
      const r = corrMatrix[a][b];
      if (Number.isFinite(r) && Math.abs(r) < UNCORRELATED_THRESHOLD) {
        uncorrelatedPairs.push({ a, b, r, n: overlapMatrix[a][b] });
      }
    }
  }
  uncorrelatedPairs.sort((x, y) => Math.abs(x.r) - Math.abs(y.r));

  console.log(`\n${uncorrelatedPairs.length} uncorrelated pairs (|r| < ${UNCORRELATED_THRESHOLD}):`);
  for (const p of uncorrelatedPairs) {
    console.log(`  ${p.a} ⇄ ${p.b}: r=${p.r.toFixed(3)}, n=${p.n}`);
  }

  if (uncorrelatedPairs.length === 0) {
    console.log('\nNo uncorrelated pairs found. Stopping at Step 2.');
  }

  // ── Step 3: CycleScanner per ticker that's in any uncorrelated pair ──
  console.log('\n## Step 3: Cycle detection on uncorrelated tickers\n');
  const tickersToScan = new Set();
  for (const p of uncorrelatedPairs) { tickersToScan.add(p.a); tickersToScan.add(p.b); }

  const cycles = {};
  for (const t of validTickers) {
    if (!tickersToScan.has(t.user)) continue;
    console.log(`Scanning ${t.user}…`);
    try {
      const scan = await cycleScannerKalman(t.closes);
      const peaks = scan.peaks ?? [];
      if (peaks.length === 0) {
        console.warn(`  ✗ no peaks`);
        cycles[t.user] = { error: 'no peaks' };
        continue;
      }
      const top = peaks[0];
      cycles[t.user] = {
        cycleLength:    top.cycleLength,
        strength:       top.strength,
        bartels:        top.bartelsValue,
        stability:      top.stabilityScore,
        avgPhaseStatus: top.avgPhaseStatus,
        avgPhaseScore:  top.avgPhaseScore,
        rank:           top.dominantRank,
      };
      console.log(`  C${top.cycleLength}d  strength=${top.strength.toFixed(1)}  bartels=${top.bartelsValue.toFixed(1)}  stab=${top.stabilityScore.toFixed(2)}  status=${top.avgPhaseStatus ?? '?'}`);
    } catch (e) {
      console.warn(`  ✗ ${t.user}: ${e.message}`);
      cycles[t.user] = { error: e.message };
    }
  }

  // Identify pairs that share a cycle period within tolerance
  const pairCycleTable = [];
  for (const p of uncorrelatedPairs) {
    const cA = cycles[p.a]; const cB = cycles[p.b];
    if (!cA || !cB || cA.error || cB.error) {
      pairCycleTable.push({ ...p, periodA: null, periodB: null, sharesPeriod: false, ratio: null, meanPeriod: null });
      continue;
    }
    const longer = Math.max(cA.cycleLength, cB.cycleLength);
    const shorter = Math.min(cA.cycleLength, cB.cycleLength);
    const ratio = longer / shorter;
    const sharesPeriod = ratio - 1.0 <= SHARED_PERIOD_TOLERANCE;
    pairCycleTable.push({
      ...p,
      periodA: cA.cycleLength,
      periodB: cB.cycleLength,
      sharesPeriod,
      ratio,
      meanPeriod: (cA.cycleLength + cB.cycleLength) / 2,
    });
  }

  console.log('\n## Step 3 results: shared periods\n');
  console.log('| Ticker A | Ticker B |     r | Shared? | Period A | Period B | Ratio |');
  console.log('|----------|----------|------:|:-------:|---------:|---------:|------:|');
  for (const p of pairCycleTable) {
    const aStr = p.periodA != null ? `C${p.periodA}d` : '—';
    const bStr = p.periodB != null ? `C${p.periodB}d` : '—';
    const ratStr = p.ratio != null ? p.ratio.toFixed(2) : '—';
    console.log(`| ${pad(p.a, 8)} | ${pad(p.b, 8)} | ${pad(p.r.toFixed(3), 5)} |    ${p.sharesPeriod ? '✓' : '✗'}    | ${pad(aStr, 8)} | ${pad(bStr, 8)} | ${pad(ratStr, 5)} |`);
  }

  const sharedPeriodPairs = pairCycleTable.filter(p => p.sharesPeriod);

  // ── Step 4: PCM on shared-period pairs ──
  console.log(`\n## Step 4: PCM on ${sharedPeriodPairs.length} shared-period pairs\n`);
  const pcmResults = [];

  for (const p of sharedPeriodPairs) {
    const meanPeriod = p.meanPeriod;
    const lowPeriod  = meanPeriod * PCM_BAND_LOW_FRACTION;   // days
    const highPeriod = meanPeriod * PCM_BAND_HIGH_FRACTION;  // days
    const lowFreq    = 1 / highPeriod;  // cycles/sample (daily)
    const highFreq   = 1 / lowPeriod;

    // Adaptive edge trim ≈ longest period in band (covers IIR settle + Hilbert edge)
    const edgeTrim = Math.ceil(highPeriod);

    console.log(`PCM: ${p.a} ⇄ ${p.b}  (mean period ${meanPeriod.toFixed(0)}d, band [${lowPeriod.toFixed(0)}, ${highPeriod.toFixed(0)}]d, trim ${edgeTrim}d)`);

    const aTicker = validTickers.find(t => t.user === p.a);
    const bTicker = validTickers.find(t => t.user === p.b);
    const aligned = alignByDate(aTicker.bars, bTicker.bars);

    if (aligned.length < edgeTrim * 2 + 100) {
      console.warn(`  ✗ insufficient overlap: ${aligned.length} bars (need ${edgeTrim * 2 + 100}+)`);
      pcmResults.push({ ...p, error: 'insufficient overlap', n: aligned.length });
      continue;
    }
    console.log(`  Aligned overlap: ${aligned.length} bars (${aligned[0].date} → ${aligned.at(-1).date})`);

    const aClose = aligned.map(x => x.a);
    const bClose = aligned.map(x => x.b);

    const aBP = butterworthBandpassZeroPhase(aClose, lowFreq, highFreq, 1);
    const bBP = butterworthBandpassZeroPhase(bClose, lowFreq, highFreq, 1);
    const aPhase = instantaneousPhase(aBP);
    const bPhase = instantaneousPhase(bBP);

    const diff = phaseDiff(aPhase, bPhase);
    const trimmed = trimEnds(diff, edgeTrim);
    const stdL = stdDev(trimmed);
    const stdC = circularStd(trimmed);
    const meanLag = meanLinear(trimmed);
    const lagDays = (meanLag / (2 * Math.PI)) * meanPeriod;

    // Surrogate test: shuffle ticker A phase, hold B fixed
    console.log(`  Running ${N_SURROGATES} surrogates (shuffle ${p.a}, hold ${p.b} fixed)…`);
    const seed = 1234 + Math.abs([...p.a].reduce((a, c) => a + c.charCodeAt(0), 0)) * 13 +
                       Math.abs([...p.b].reduce((a, c) => a + c.charCodeAt(0), 0));
    const rng = makeRNG(seed);
    const surrogateStds = [];
    const surrogateCircStds = [];
    for (let i = 0; i < N_SURROGATES; i++) {
      const surrogate = phaseSurrogate(aClose, rng);
      const surrogateBP = butterworthBandpassZeroPhase(surrogate, lowFreq, highFreq, 1);
      const surrogatePhase = instantaneousPhase(surrogateBP);
      const sDiff = phaseDiff(surrogatePhase, bPhase);
      const sTrim = trimEnds(sDiff, edgeTrim);
      surrogateStds.push(stdDev(sTrim));
      surrogateCircStds.push(circularStd(sTrim));
    }
    surrogateStds.sort((a, b) => a - b);
    surrogateCircStds.sort((a, b) => a - b);

    // p-value on circular Std (per user spec)
    const nLowerCirc = surrogateCircStds.filter(s => s < stdC).length;
    const pValue = nLowerCirc / surrogateCircStds.length;
    const verdict = pValue < 0.05 ? 'SIGNIFICANT' : (pValue < 0.10 ? 'BORDERLINE' : 'NOT significant');

    const surroQ05 = surrogateCircStds[Math.floor(0.05 * surrogateCircStds.length)];
    const surroQ50 = surrogateCircStds[Math.floor(0.50 * surrogateCircStds.length)];
    const surroQ95 = surrogateCircStds[Math.floor(0.95 * surrogateCircStds.length)];

    console.log(`  Real:    Std=${stdL.toFixed(3)}  circStd=${stdC.toFixed(3)}  meanLag=${meanLag.toFixed(3)} rad ≈ ${lagDays.toFixed(1)}d`);
    console.log(`  Surrog:  q05=${surroQ05.toFixed(3)}  median=${surroQ50.toFixed(3)}  q95=${surroQ95.toFixed(3)}`);
    console.log(`  p-value (circular std percentile): ${pValue.toFixed(4)} → ${verdict}`);

    pcmResults.push({
      ...p,
      band: { low: lowPeriod, high: highPeriod, lowFreq, highFreq },
      edgeTrim,
      n: trimmed.length,
      alignedBars: aligned.length,
      stdLinear: stdL,
      stdCircular: stdC,
      meanLagRad: meanLag,
      meanLagDays: lagDays,
      surrogateMean: surrogateCircStds.reduce((a, b) => a + b, 0) / surrogateCircStds.length,
      surrogateQ05: surroQ05,
      surrogateQ50: surroQ50,
      surrogateQ95: surroQ95,
      pValue,
      verdict,
    });
  }

  // ── Step 5: Final summary table ──
  console.log('\n## Final Results\n');
  console.log('| Pair | Corr | Shared period | circ_std | p-value | Verdict |');
  console.log('|------|------|--------------:|---------:|--------:|---------|');
  for (const r of pcmResults) {
    if (r.error) {
      console.log(`| ${r.a} ⇄ ${r.b} | ${r.r.toFixed(3)} | C${r.meanPeriod.toFixed(0)}d | — | — | ERROR: ${r.error} |`);
    } else {
      console.log(`| ${r.a} ⇄ ${r.b} | ${r.r.toFixed(3)} | C${r.meanPeriod.toFixed(0)}d | ${r.stdCircular.toFixed(3)} | ${r.pValue.toFixed(4)} | ${r.verdict} |`);
    }
  }

  // Significant pairs: report current phase + lead/lag
  const significantPairs = pcmResults.filter(r => !r.error && r.verdict !== 'NOT significant');
  if (significantPairs.length > 0) {
    console.log('\n## Current phase positions (significant + borderline pairs)\n');
    for (const r of significantPairs) {
      const cA = cycles[r.a];
      const cB = cycles[r.b];
      const leader = r.meanLagRad > 0 ? r.a : r.b;
      const lagger = r.meanLagRad > 0 ? r.b : r.a;
      const lagDays = Math.abs(r.meanLagDays);
      console.log(`${r.a} ⇄ ${r.b}  (${r.verdict}, p=${r.pValue.toFixed(4)})`);
      console.log(`  ${r.a}: C${cA.cycleLength}d, status=${cA.avgPhaseStatus ?? '?'}, avgPhaseScore=${cA.avgPhaseScore ?? '?'}`);
      console.log(`  ${r.b}: C${cB.cycleLength}d, status=${cB.avgPhaseStatus ?? '?'}, avgPhaseScore=${cB.avgPhaseScore ?? '?'}`);
      console.log(`  Mean Δφ = ${r.meanLagRad.toFixed(3)} rad → ${leader} leads ${lagger} by ~${lagDays.toFixed(1)} days`);
    }
  } else {
    console.log('\nNo significant or borderline coherent pairs.');
  }

  // ── Markdown report ──
  const md = [];
  md.push('# Market Phase Coherence — Cross-Asset PCM Analysis (Daily)');
  md.push('');
  md.push(`Run date: ${new Date().toISOString()}`);
  md.push('Branch:   `richard/forcing-analysis`');
  md.push('Source:   `scratch/market_phase_coherence_daily.mjs`');
  md.push('');
  md.push('## Method');
  md.push('');
  md.push(`1. Fetched ~${TARGET_BARS} daily bars per ticker via EnsureCompleteDataset → GetDatasetSeries.`);
  md.push(`2. Pearson correlation on daily returns; pairs with |r| < ${UNCORRELATED_THRESHOLD} flagged as uncorrelated.`);
  md.push('3. CycleScanner (dtype=4 Kalman, bartelsLimit=49, dominantPeakFinder, useStability, 50–200 day band) on each ticker in any uncorrelated pair.');
  md.push(`4. Pairs where longer/shorter cycle ≤ ${1 + SHARED_PERIOD_TOLERANCE} (i.e. ≤ ${(SHARED_PERIOD_TOLERANCE * 100).toFixed(0)}% apart) flagged as sharing a period.`);
  md.push(`5. PCM on shared-period pairs: 4th-order Butterworth zero-phase bandpass at period × [${PCM_BAND_LOW_FRACTION}, ${PCM_BAND_HIGH_FRACTION}], FFT-based Hilbert phase, ${N_SURROGATES} phase-shuffled surrogates of one ticker (the other held fixed). p-value = fraction of surrogate circular Stds lower than real.`);
  md.push('');
  md.push('Verdict thresholds: p<0.05 SIGNIFICANT · p<0.10 BORDERLINE · p≥0.10 NOT significant.');
  md.push('');
  md.push('All cycle periods and lead/lag measurements in trading days (not weeks).');
  md.push('');
  md.push('## Tickers');
  md.push('');
  md.push('| Symbol | Description | Resolved tickerId | Bars | Date range |');
  md.push('|--------|-------------|-------------------|-----:|------------|');
  for (const t of tickerData) {
    if (t.error) {
      md.push(`| ${t.user} | ${t.desc} | — | — | ERROR: ${t.error} |`);
    } else {
      md.push(`| ${t.user} | ${t.desc} | \`${t.tickerId}\` | ${t.bars.length} | ${t.bars[0].date} → ${t.bars.at(-1).date} |`);
    }
  }
  md.push('');

  md.push('## Correlation matrix (daily returns)');
  md.push('');
  md.push('| | ' + symbols.join(' | ') + ' |');
  md.push('|---' + symbols.map(() => '|---').join('') + '|');
  for (const a of symbols) {
    const cells = symbols.map(b => {
      const v = corrMatrix[a][b];
      if (!Number.isFinite(v)) return '—';
      const cell = v.toFixed(2);
      return Math.abs(v) < UNCORRELATED_THRESHOLD && a !== b ? `**${cell}**` : cell;
    });
    md.push(`| **${a}** | ${cells.join(' | ')} |`);
  }
  md.push('');
  md.push(`Bold cells = |r| < ${UNCORRELATED_THRESHOLD} (uncorrelated pair candidates).`);
  md.push('');

  md.push('## Uncorrelated pairs');
  md.push('');
  if (uncorrelatedPairs.length === 0) {
    md.push('No pairs with |r| < ' + UNCORRELATED_THRESHOLD + '.');
  } else {
    md.push('| Pair | r | n (overlap) |');
    md.push('|------|--:|------------:|');
    for (const p of uncorrelatedPairs) {
      md.push(`| ${p.a} ⇄ ${p.b} | ${p.r.toFixed(3)} | ${p.n} |`);
    }
  }
  md.push('');

  md.push('## Cycle detection on uncorrelated tickers (dtype=4 Kalman, 50–200d band)');
  md.push('');
  md.push('| Ticker | Cycle | Strength | Bartels | Stability | Phase status |');
  md.push('|--------|------:|---------:|--------:|----------:|--------------|');
  for (const t of validTickers) {
    if (!tickersToScan.has(t.user)) continue;
    const c = cycles[t.user];
    if (!c || c.error) {
      md.push(`| ${t.user} | — | — | — | — | ERROR: ${c?.error ?? 'no scan'} |`);
    } else {
      md.push(`| ${t.user} | C${c.cycleLength}d | ${fmt(c.strength, 1)} | ${fmt(c.bartels, 1)} | ${fmt(c.stability, 2)} | ${c.avgPhaseStatus ?? '?'} |`);
    }
  }
  md.push('');

  md.push('## Shared-period table');
  md.push('');
  md.push('| Ticker A | Ticker B | r | Shared? | Period A | Period B | Ratio |');
  md.push('|----------|----------|--:|:-------:|---------:|---------:|------:|');
  for (const p of pairCycleTable) {
    const aStr = p.periodA != null ? `C${p.periodA}d` : '—';
    const bStr = p.periodB != null ? `C${p.periodB}d` : '—';
    const ratStr = p.ratio != null ? p.ratio.toFixed(2) : '—';
    md.push(`| ${p.a} | ${p.b} | ${p.r.toFixed(3)} | ${p.sharesPeriod ? '**✓**' : '✗'} | ${aStr} | ${bStr} | ${ratStr} |`);
  }
  md.push('');

  md.push('## PCM results — shared-period pairs');
  md.push('');
  if (pcmResults.length === 0) {
    md.push('No shared-period pairs found; PCM not run.');
  } else {
    md.push('| Pair | Corr | Mean period | Band (d) | n trimmed | Std linear | Std circular | p-value | Verdict |');
    md.push('|------|-----:|------------:|---------:|----------:|-----------:|-------------:|--------:|---------|');
    for (const r of pcmResults) {
      if (r.error) {
        md.push(`| ${r.a} ⇄ ${r.b} | ${r.r.toFixed(3)} | C${r.meanPeriod.toFixed(0)}d | — | — | — | — | — | ERROR: ${r.error} |`);
      } else {
        md.push(`| ${r.a} ⇄ ${r.b} | ${r.r.toFixed(3)} | C${r.meanPeriod.toFixed(0)}d | [${r.band.low.toFixed(0)}, ${r.band.high.toFixed(0)}] | ${r.n} | ${fmt(r.stdLinear)} | ${fmt(r.stdCircular)} | ${fmt(r.pValue, 4)} | **${r.verdict}** |`);
      }
    }
  }
  md.push('');

  md.push('## Surrogate distribution detail');
  md.push('');
  md.push('| Pair | Mean | q05 | median | q95 | Real circ Std | p-value |');
  md.push('|------|-----:|----:|-------:|----:|--------------:|--------:|');
  for (const r of pcmResults) {
    if (r.error) continue;
    md.push(`| ${r.a} ⇄ ${r.b} | ${fmt(r.surrogateMean)} | ${fmt(r.surrogateQ05)} | ${fmt(r.surrogateQ50)} | ${fmt(r.surrogateQ95)} | ${fmt(r.stdCircular)} | ${fmt(r.pValue, 4)} |`);
  }
  md.push('');

  if (significantPairs.length > 0) {
    md.push('## Current phase positions and lead/lag (significant + borderline pairs)');
    md.push('');
    md.push('| Pair | Verdict | A status | B status | Mean Δφ (rad) | Lead/lag |');
    md.push('|------|---------|----------|----------|--------------:|----------|');
    for (const r of significantPairs) {
      const cA = cycles[r.a]; const cB = cycles[r.b];
      const leader = r.meanLagRad > 0 ? r.a : r.b;
      const lagger = r.meanLagRad > 0 ? r.b : r.a;
      const lagDays = Math.abs(r.meanLagDays);
      md.push(`| ${r.a} ⇄ ${r.b} | ${r.verdict} | ${cA.avgPhaseStatus ?? '?'} | ${cB.avgPhaseStatus ?? '?'} | ${fmt(r.meanLagRad)} | ${leader} leads ${lagger} by ~${lagDays.toFixed(1)}d |`);
    }
    md.push('');
  }

  md.push('## Method caveats');
  md.push('');
  md.push('- **PCM verdicts are surrogate-test-based** (not threshold-only). Threshold STRONG/MODERATE/WEAK labels do not reliably indicate significance on filtered real-data pairs — see `scratch/research_note_ecb_howell_pcm.md` for rationale.');
  md.push('- **Surrogate**: phase-shuffle preserves amplitude spectrum, randomizes phase, maintains real-conjugate symmetry. Only ticker A is shuffled; ticker B held fixed.');
  md.push('- **Edge trim** = upper-band period (covers IIR settling + Hilbert FFT zero-pad edges).');
  md.push('- **Date alignment**: pairwise intersection by exact date string match. Dates that don\'t appear in both series are dropped.');
  md.push('- **Returns vs prices**: correlation on returns; PCM on prices (filtered to band).');
  md.push('- **Daily vs weekly**: Shorter bars (1 day vs 1 week) allow detection of faster cycles (50–200d vs 20–400w). T/5 reliability criterion: 200d ÷ 5 = 40d minimum reliable cycle length.');
  md.push('');

  // Write files
  const fs = await import('node:fs/promises');
  await fs.writeFile(REPORT_PATH, md.join('\n') + '\n');
  console.log(`\nWrote ${REPORT_PATH.pathname}`);

  await fs.writeFile(JSON_PATH, JSON.stringify({
    runDate: new Date().toISOString(),
    config: {
      symbols: SYMBOLS,
      targetBars: TARGET_BARS,
      frequency: 'daily',
      cycleDetectionBand: { min: 50, max: 200 },
      uncorrelatedThreshold: UNCORRELATED_THRESHOLD,
      sharedPeriodTolerance: SHARED_PERIOD_TOLERANCE,
      nSurrogates: N_SURROGATES,
      pcmBand: { lowFraction: PCM_BAND_LOW_FRACTION, highFraction: PCM_BAND_HIGH_FRACTION },
    },
    tickers: tickerData.map(t => ({
      user: t.user,
      desc: t.desc,
      tickerId: t.tickerId,
      barsCount: t.bars?.length,
      firstDate: t.bars?.[0]?.date,
      lastDate:  t.bars?.at(-1)?.date,
      error: t.error,
    })),
    correlationMatrix: corrMatrix,
    overlapMatrix,
    uncorrelatedPairs,
    cycles,
    pairCycleTable,
    pcmResults,
  }, null, 2));
  console.log(`Wrote ${JSON_PATH.pathname}`);
})().catch(e => {
  console.error('FATAL:', e);
  process.exit(2);
});
