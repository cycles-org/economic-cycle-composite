// scratch/validate_pcm_math.mjs
//
// Validation: confirm the FFT / Hilbert / bandpass / phase-diff implementation
// from pcm_ecb_jupiter_saturn.mjs produces correct results on synthetic test
// signals with known expected behavior.
//
// All math functions below are COPIED VERBATIM from pcm_ecb_jupiter_saturn.mjs
// to ensure we are testing the actual production implementation, not a re-spec.
//
// Run: node scratch/validate_pcm_math.mjs   (no API calls)

// ─────────────────────────────────────────────────────────────────────────────
// Math — copied verbatim from pcm_ecb_jupiter_saturn.mjs
// ─────────────────────────────────────────────────────────────────────────────

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

function centeredMA(x, win) {
  const n = x.length;
  const out = new Array(n);
  const half = Math.floor(win / 2);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n, i + half + 1);
    let sum = 0, cnt = 0;
    for (let j = lo; j < hi; j++) {
      if (Number.isFinite(x[j])) { sum += x[j]; cnt++; }
    }
    out[i] = cnt > 0 ? sum / cnt : NaN;
  }
  return out;
}

function bandpass(x, shortWin, longWin) {
  const lpShort = centeredMA(x, shortWin);
  const lpLong  = centeredMA(x, longWin);
  return lpShort.map((v, i) => v - lpLong[i]);
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

function verdict(stdRad) {
  if (!Number.isFinite(stdRad)) return 'n/a';
  if (stdRad < 0.5) return 'STRONG';
  if (stdRad < 1.0) return 'MODERATE';
  if (stdRad < 1.5) return 'WEAK';
  return '~random';
}

// ─────────────────────────────────────────────────────────────────────────────
// Test utilities (NOT in PCM script)
// ─────────────────────────────────────────────────────────────────────────────

// xorshift32 — seeded so the noise tests are deterministic across runs.
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

function gaussian(rng, mean = 0, std = 1) {
  // Box-Muller (uses 2 uniforms per call; cheaper variants exist but irrelevant here).
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function fmt(n, dp = 4) { return Number.isFinite(n) ? Number(n).toFixed(dp) : '—'; }

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

const rng = makeRNG(42);

const NODAL_WEEKS = 18.6 * 52.18; // ≈ 970.5 weeks
const NILE_WEEKS  = 19.0 * 52.18; // ≈ 991.4 weeks

const TESTS = [
  {
    id: 1,
    name: 'Perfect phase lock (sin 286 vs sin 286)',
    n: 1500,
    bandpass: { short: 200, long: 400 },
    edgeTrim: 250,
    A: t => Math.sin(2 * Math.PI * t / 286),
    B: t => Math.sin(2 * Math.PI * t / 286),
    repPeriodWeeks: 286,
    expected: 'Std(Δφ) ≈ 0; mean Δφ ≈ 0',
    pass: r => r.stdL < 0.05 && Math.abs(r.mean) < 0.05,
  },
  {
    id: 2,
    name: 'Fixed 90° phase offset (sin 286 vs cos 286)',
    n: 1500,
    bandpass: { short: 200, long: 400 },
    edgeTrim: 250,
    A: t => Math.sin(2 * Math.PI * t / 286),
    B: t => Math.cos(2 * Math.PI * t / 286), // = sin(... + π/2), so B leads A by π/2
    repPeriodWeeks: 286,
    expected: 'Std(Δφ) ≈ 0; |mean Δφ| ≈ π/2 (1.5708 rad)',
    pass: r => r.stdL < 0.05 && Math.abs(Math.abs(r.mean) - Math.PI / 2) < 0.05,
  },
  {
    id: 3,
    name: 'Null baseline (sin 286 + N(0,3) vs N(0,1))',
    n: 2000,
    bandpass: { short: 200, long: 400 },
    edgeTrim: 250,
    // Note: A is the noisy signal, B is pure independent noise.
    A: t => Math.sin(2 * Math.PI * t / 286) + gaussian(rng, 0, 3),
    B: t => gaussian(rng, 0, 1),
    repPeriodWeeks: 286,
    expected: 'Std(Δφ) → 1.81 rad (uniform [-π,π] baseline)',
    pass: r => r.stdL > 1.4 && r.stdL <= Math.PI + 0.05,
  },
  {
    id: 4,
    name: 'Frequency detuning (sin 335 vs sin 372, no noise)',
    n: 2000,
    bandpass: { short: 200, long: 400 },
    edgeTrim: 250,
    A: t => Math.sin(2 * Math.PI * t / 335),
    B: t => Math.sin(2 * Math.PI * t / 372),
    repPeriodWeeks: (335 + 372) / 2,
    expected: 'High Std(Δφ) from frequency mismatch; mean lag drifts',
    pass: r => r.stdL > 0.5,
  },
  {
    id: 5,
    name: `Lunar nodal (${NODAL_WEEKS.toFixed(1)}w) vs Nile Dewey (${NILE_WEEKS.toFixed(1)}w)`,
    n: 5000,
    bandpass: { short: 800, long: 1200 }, // band shifted to capture longer periods
    edgeTrim: 700,
    A: t => Math.sin(2 * Math.PI * t / NODAL_WEEKS),
    B: t => Math.sin(2 * Math.PI * t / NILE_WEEKS),
    repPeriodWeeks: (NODAL_WEEKS + NILE_WEEKS) / 2,
    expected: 'Non-trivial Std (drift) but well below random',
    pass: r => r.stdL > 0.05 && r.stdL < 1.5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────────────

console.log('PCM math validation — synthetic test signals\n');
console.log('Functions (FFT, Hilbert, centeredMA, bandpass, phaseDiff, std, etc.) copied verbatim from pcm_ecb_jupiter_saturn.mjs.\n');

const summary = [];

for (const test of TESTS) {
  // Generate signals
  const A = Array.from({ length: test.n }, (_, i) => test.A(i));
  const B = Array.from({ length: test.n }, (_, i) => test.B(i));

  // Bandpass (always — this matches PCM script's pipeline)
  const A2 = bandpass(A, test.bandpass.short, test.bandpass.long);
  const B2 = bandpass(B, test.bandpass.short, test.bandpass.long);

  // Hilbert phase
  const phaseA = instantaneousPhase(A2);
  const phaseB = instantaneousPhase(B2);

  // Δφ = phase(A) − phase(B), wrapped to [−π, π]
  const diff = phaseDiff(phaseA, phaseB);
  const trimmed = trimEnds(diff, test.edgeTrim);

  const stdL = stdDev(trimmed);
  const stdC = circularStd(trimmed);
  const m    = meanLinear(trimmed);
  const lagWeeks = (m / (2 * Math.PI)) * test.repPeriodWeeks;
  const v    = verdict(stdL);

  const result = { stdL, stdC, mean: m, lagWeeks, verdict: v, n: trimmed.length };
  const passed = test.pass(result);
  summary.push({ id: test.id, name: test.name, ...result, passed });

  console.log(`Test ${test.id} — ${test.name}`);
  console.log(`  n samples after trim: ${trimmed.length}  (raw ${test.n}, trim ${test.edgeTrim} each end)`);
  console.log(`  bandpass: [${test.bandpass.short}, ${test.bandpass.long}] weeks`);
  console.log(`  Std(Δφ) linear   = ${fmt(stdL)} rad`);
  console.log(`  Std(Δφ) circular = ${fmt(stdC)} rad`);
  console.log(`  Mean Δφ          = ${fmt(m)} rad`);
  console.log(`  Mean lag         = ${fmt(lagWeeks, 2)} weeks`);
  console.log(`  Verdict          = ${v}`);
  console.log(`  Expected         = ${test.expected}`);
  console.log(`  Result           = ${passed ? '✓ PASS' : '✗ FAIL'}`);
  console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary table
// ─────────────────────────────────────────────────────────────────────────────

console.log('## Summary\n');
console.log('| # | Test | Std(Δφ) lin | Std circ | Mean Δφ | Lag (w) | Verdict | Pass? |');
console.log('|---|------|-------------|----------|---------|---------|---------|-------|');
for (const r of summary) {
  console.log(
    `| ${r.id} | ${r.name} | ${fmt(r.stdL)} | ${fmt(r.stdC)} | ${fmt(r.mean)} | ${fmt(r.lagWeeks, 1)} | ${r.verdict} | ${r.passed ? '✓' : '✗'} |`
  );
}

const passCount = summary.filter(r => r.passed).length;
console.log(`\n${passCount} / ${summary.length} tests passed.`);
process.exit(passCount === summary.length ? 0 : 1);
