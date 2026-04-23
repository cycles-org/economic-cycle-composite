/**
 * Liquidity Pipeline — Layer 5 (Howell Framework)
 *
 * 8-Series Architecture matching reference LiquidityModel:
 *   WALCL(w=3), ECB_USD(w=1), BOJ_USD(w=1), NFL(w=1),
 *   TOTBKCR(w=1), WRESBAL(w=1), COMPOUT(w=1), WRMFNS(w=1)
 *   Total weight = 10.
 *
 * Pipeline: Fetch → Wednesday grid alignment → FX adjust → Derive NFL →
 *           52w YoY Momentum → CycleScanner(dType=0) → Dominant → CRSI →
 *           Phase+Band → componentComposite → structural(NFL) → displayScore
 *
 * compositeScore = 0.8 × structuralScore + 0.2 × componentComposite
 */

import type { OhlcvBar, CyclePeak, LiquiditySeriesResult, LiquidityResult } from '../types';
import { LIQUIDITY_NFL_COMPONENTS, LIQUIDITY_SCORED_SERIES, LIQUIDITY_FX_TICKERS } from '../config/seriesRegistry';
import type { LiquiditySeriesConfig } from '../config/seriesRegistry';
import { ensureDataset, getDatasetSeriesRaw, cycleScannerNoDetrend, getCrsi, hpDetrend } from './cycleToolsApi';
import { interpolatePhaseScore } from './phaseScoring';

export { interpolatePhaseScore };

// ── Data helpers ──

function downsampleToWeekly(dailyBars: OhlcvBar[]): OhlcvBar[] {
  const byWeek = new Map<string, { date: string; close: number; dayOfWeek: number }[]>();

  for (const bar of dailyBars) {
    if (!bar.date) continue;
    const d = new Date(bar.date);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push({ date: bar.date, close: bar.close, dayOfWeek: d.getDay() });
  }

  const result: OhlcvBar[] = [];
  for (const [, days] of byWeek) {
    const wed = days.find(d => d.dayOfWeek === 3);
    const pick = wed || days.filter(d => d.dayOfWeek <= 3).sort((a, b) => b.dayOfWeek - a.dayOfWeek)[0] || days[days.length - 1];
    result.push({ date: pick.date, open: 0, high: 0, low: 0, close: pick.close, volume: 0 });
  }

  return result.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
}

function findNearest(bars: OhlcvBar[], targetDate: string, maxDaysDiff = 5): OhlcvBar | null {
  const target = new Date(targetDate).getTime();
  let best: OhlcvBar | null = null;
  let bestDiff = Infinity;
  for (const bar of bars) {
    if (!bar.date) continue;
    const diff = Math.abs(new Date(bar.date).getTime() - target);
    if (diff < bestDiff) { bestDiff = diff; best = bar; }
  }
  return bestDiff <= maxDaysDiff * 86400000 ? best : null;
}

/**
 * 52-week YoY momentum on a null-preserving array (indexed by Wednesday grid).
 * Spec: compYoY[i] = (trimData[s][i] - trimData[s][i-52]) / |trimData[s][i-52]| * 100
 * Keeps array-index alignment: index i-52 = exactly 52 weeks back.
 */
function computeMomentum52wNullable(series: (number | null)[]): number[] {
  const result: number[] = [];
  for (let i = 52; i < series.length; i++) {
    const prev = series[i - 52];
    const curr = series[i];
    if (prev != null && curr != null && Math.abs(prev) > 0) {
      result.push(((curr - prev) / Math.abs(prev)) * 100);
    }
  }
  return result;
}

function extractDominant(peaks: CyclePeak[], dataLength?: number): CyclePeak | null {
  if (!peaks?.length) return null;
  const maxCycle = dataLength ? Math.floor(dataLength / 3) : 400;
  const viable = peaks.filter(p => p.cycleLength >= 20 && p.cycleLength <= maxCycle && (p.stabilityScore >= 0.4 || p.stabilityScore === 0));
  const pool = viable.length > 0 ? viable : peaks.filter(p => p.cycleLength >= 20 && p.cycleLength <= maxCycle);
  if (pool.length === 0) return peaks[0] ?? null;
  return pool.sort((a, b) => b.strength - a.strength)[0];
}

/**
 * Extract the structural (~65-month / 250-400 bar) cycle from NFL peaks.
 * This is the Howell Global Liquidity Cycle — the long-term regime envelope.
 */
function extractStructuralCycle(peaks: CyclePeak[]): CyclePeak | null {
  if (!peaks?.length) return null;
  const structural = peaks.filter(p => p.cycleLength >= 250 && p.cycleLength <= 400);
  if (structural.length === 0) return null;
  return structural.sort((a, b) => {
    if (Math.abs(a.stabilityScore - b.stabilityScore) > 0.05) return b.stabilityScore - a.stabilityScore;
    return b.strength - a.strength;
  })[0];
}

// ── Wednesday grid generation & alignment ──

/**
 * Generate every Wednesday date string from startDate to endDate.
 */
function generateWednesdays(startDate: string, endDate: string): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  // Move start forward to the nearest Wednesday (day 3)
  const dayOfWeek = start.getUTCDay();
  const daysToWed = dayOfWeek <= 3 ? (3 - dayOfWeek) : (10 - dayOfWeek);
  start.setUTCDate(start.getUTCDate() + daysToWed);

  const wednesdays: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    wednesdays.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 7);
  }
  return wednesdays;
}

/**
 * Align bar data to a Wednesday grid using priority search order.
 * Spec: "search day 0, then ±1, ±2, ±3, ±4, ±5. First match wins."
 *
 * Builds a daily date→close map for O(1) lookups, then for each Wednesday
 * searches outward in the specified order until a match is found.
 */
function alignToWednesdays(
  wednesdays: string[],
  bars: OhlcvBar[],
): (number | null)[] {
  // Build date→close map (keyed by YYYY-MM-DD)
  const dateMap = new Map<string, number>();
  for (const bar of bars) {
    if (bar.date != null) {
      // Normalize to YYYY-MM-DD (handles both ISO dates and date-only strings)
      const d = new Date(bar.date);
      if (!isNaN(d.getTime())) {
        const key = d.toISOString().slice(0, 10);
        dateMap.set(key, bar.close);
      }
    }
  }

  return wednesdays.map(wed => {
    // Search in priority order: 0, -1, +1, -2, +2, -3, +3, -4, +4, -5, +5
    for (let offset = 0; offset <= 5; offset++) {
      if (offset === 0) {
        if (dateMap.has(wed)) return dateMap.get(wed)!;
      } else {
        // Try minus first, then plus (matches reference)
        const dMinus = new Date(wed);
        dMinus.setDate(dMinus.getDate() - offset);
        const kMinus = dMinus.toISOString().slice(0, 10);
        if (dateMap.has(kMinus)) return dateMap.get(kMinus)!;

        const dPlus = new Date(wed);
        dPlus.setDate(dPlus.getDate() + offset);
        const kPlus = dPlus.toISOString().slice(0, 10);
        if (dateMap.has(kPlus)) return dateMap.get(kPlus)!;
      }
    }
    return null;
  });
}

/**
 * Interpolate monthly data to a weekly Wednesday grid using linear interpolation.
 * For each Wednesday, find the two surrounding monthly data points and interpolate.
 */
function interpolateMonthlyToWeekly(
  wednesdays: string[],
  bars: OhlcvBar[],
): (number | null)[] {
  const monthlyPoints = bars
    .filter(b => b.date != null)
    .map(b => ({ time: new Date(b.date!).getTime(), close: b.close }))
    .sort((a, b) => a.time - b.time);

  if (monthlyPoints.length < 2) return wednesdays.map(() => null);

  return wednesdays.map(wed => {
    const t = new Date(wed).getTime();

    // Before first data point
    if (t < monthlyPoints[0].time) return null;
    // After last data point
    if (t > monthlyPoints[monthlyPoints.length - 1].time) return null;

    // Find surrounding points
    let lo = 0;
    let hi = monthlyPoints.length - 1;
    while (lo < hi - 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (monthlyPoints[mid].time <= t) lo = mid;
      else hi = mid;
    }

    const p0 = monthlyPoints[lo];
    const p1 = monthlyPoints[hi];

    // Exact match
    if (p0.time === t) return p0.close;
    if (p1.time === t) return p1.close;

    // Linear interpolation
    const frac = (t - p0.time) / (p1.time - p0.time);
    return p0.close + frac * (p1.close - p0.close);
  });
}

// ── Rolling percentile rank (0-100) ──
// Matches reference: rollingPctRank(arr, 780)

function rollingPctRank(arr: (number | null)[], windowSize: number): (number | null)[] {
  return arr.map((v, i) => {
    if (v == null) return null;
    const start = Math.max(0, i - windowSize + 1);
    const w = arr.slice(start, i + 1).filter(x => x != null) as number[];
    if (w.length === 0) return null;
    return (w.filter(x => x < v).length + 0.5) / w.length * 100;
  });
}

// ── CRSI Band + Direction scoring ──

/**
 * Compute direction from last N CRSI values using linear regression slope.
 */
function getCrsiDirection(crsiArr: number[], lookback = 5): number {
  if (crsiArr.length < 3) return 0;
  const n = crsiArr.length;
  const len = Math.min(lookback, n);
  const slice = crsiArr.slice(n - len);
  const xMean = (len - 1) / 2;
  let num = 0, den = 0, ySum = 0;
  for (let i = 0; i < len; i++) ySum += slice[i];
  const yMean = ySum / len;
  for (let i = 0; i < len; i++) {
    const dx = i - xMean;
    num += dx * (slice[i] - yMean);
    den += dx * dx;
  }
  return den > 0 ? num / den : 0;
}

/**
 * Detect band crossing in previous 1-4 bars.
 */
function detectBandCrossing(
  crsiArr: number[], ubArr: number[], lbArr: number[]
): { type: 'bearish' | 'bullish'; barsAgo: number } | null {
  if (!crsiArr?.length || !ubArr?.length || !lbArr?.length) return null;
  const n = crsiArr.length;
  if (n < 2) return null;
  const cur = crsiArr[n - 1], curUb = ubArr[n - 1], curLb = lbArr[n - 1];
  if (cur == null || curUb == null || curLb == null) return null;
  if (isNaN(cur) || isNaN(curUb) || isNaN(curLb)) return null;
  if (cur > curUb || cur < curLb) return null;
  for (let i = 1; i <= 4; i++) {
    const idx = n - 1 - i;
    if (idx < 0) break;
    const pC = crsiArr[idx], pU = ubArr[idx], pL = lbArr[idx];
    if (pC == null || pU == null || pL == null || isNaN(pC) || isNaN(pU) || isNaN(pL)) break;
    if (pC > pU) return { type: 'bearish', barsAgo: i };
    if (pC < pL) return { type: 'bullish', barsAgo: i };
  }
  return null;
}

/**
 * CRSI band score: crossing override (0-10 / 90-100) + 6-state base (10-90).
 */
function bandRelativeCrsiScore(
  crsiLast: number, ub: number, lb: number, direction: number,
  crsiArr?: number[], ubArr?: number[], lbArr?: number[]
): number {
  const bandWidth = ub - lb;
  if (bandWidth <= 0) return 50;

  // Layer 1: Crossing override (0-10 or 90-100)
  if (crsiArr && ubArr && lbArr) {
    const crossing = detectBandCrossing(crsiArr, ubArr, lbArr);
    if (crossing) {
      if (crossing.type === 'bearish') return Math.round(crossing.barsAgo * 2.5 * 10) / 10;
      return Math.round((100 - crossing.barsAgo * 2.5) * 10) / 10;
    }
  }

  // Layer 2: 6-state base logic (10-90)
  const accelThreshold = bandWidth * 0.05;

  if (crsiLast >= ub) {
    const excess = (crsiLast - ub) / bandWidth;
    if (direction < 0) {
      return Math.round(Math.max(10, 35 - excess * 15) * 10) / 10;
    }
    if (direction > accelThreshold) {
      return Math.round(Math.min(90, 70 + excess * 10) * 10) / 10;
    }
    return Math.round(Math.max(35, 50 - excess * 10) * 10) / 10;
  }

  if (crsiLast <= lb) {
    const excess = (lb - crsiLast) / bandWidth;
    if (direction > 0) {
      return Math.round(Math.min(90, 65 + excess * 15) * 10) / 10;
    }
    if (direction < -accelThreshold) {
      return Math.round(Math.max(10, 30 - excess * 10) * 10) / 10;
    }
    return Math.round(Math.min(65, 50 + excess * 10) * 10) / 10;
  }

  // Within bands: linear LB→UB = 35→65
  const t = (crsiLast - lb) / bandWidth;
  return Math.round((35 + t * 30) * 10) / 10;
}

// ── Process a single momentum series through CycleScanner + CRSI ──

async function processOneMomentumSeries(
  apiKey: string,
  seriesId: string,
  name: string,
  momentumCloses: number[],
  currentMomentum: number,
  log: (msg: string) => void,
  extractStructural = false,
): Promise<LiquiditySeriesResult> {
  const emptyResult = (error: string): LiquiditySeriesResult => ({
    seriesId, name, cycleLength: 0, phaseStatus: error, avgPhaseScore: 0,
    phaseScore: 50, crsi: 50, crsiBandScore: 50,
    combinedScore: 50, bartels: 0, stability: 0, momentumYoY: currentMomentum, error,
  });

  try {
    log(`[${seriesId}] CycleScanner on ${momentumCloses.length} momentum points...`);
    const scan = await cycleScannerNoDetrend(apiKey, momentumCloses);
    const dom = extractDominant(scan.peaks, momentumCloses.length);

    if (!dom) return emptyResult('No dominant cycle');

    log(`[${seriesId}] Dominant: ${dom.cycleLength} bars, phase: ${dom.phaseStatus}, Bartels: ${dom.bartelsValue.toFixed(1)}`);

    // Extract structural cycle for NFL
    let structuralFields: Partial<LiquiditySeriesResult> = {};
    if (extractStructural) {
      const structural = extractStructuralCycle(scan.peaks);
      if (structural) {
        const structAvgPhaseStatus = structural.avgPhaseStatus || structural.phaseStatus;
        const structPhaseScore = interpolatePhaseScore(structAvgPhaseStatus, structural.avgPhaseScore);
        log(`[${seriesId}] Structural cycle: ${structural.cycleLength} bars (~${Math.round(structural.cycleLength / 4.33)} months), phase: ${structAvgPhaseStatus}, stability: ${structural.stabilityScore.toFixed(2)}, score: ${structPhaseScore}`);
        structuralFields = {
          structuralCycleLength: structural.cycleLength,
          structuralPhaseStatus: structAvgPhaseStatus,
          structuralAvgPhaseScore: structural.avgPhaseScore ?? 0,
          structuralPhaseScore: structPhaseScore,
          structuralStability: Math.round(structural.stabilityScore * 100) / 100,
        };
      } else {
        log(`[${seriesId}] No structural cycle found in 250-400 bar range`);
      }
    }

    // CRSI with bands
    log(`[${seriesId}] CRSI tuned to ${dom.cycleLength} bars...`);
    const crsiResult = await getCrsi(apiKey, momentumCloses, dom.cycleLength);
    const crsiArr = crsiResult.crsi ?? [];
    const ubArr = crsiResult.ub ?? [];
    const lbArr = crsiResult.lb ?? [];

    const crsiLast = crsiArr.length > 0 ? Number(crsiArr[crsiArr.length - 1]) || 50 : 50;

    // Walk backward up to 10 bars to find valid (non-NaN) band values
    let ubLast = 70, lbLast = 30;
    const n = crsiArr.length;
    for (let i = Math.min(n - 1, ubArr.length - 1); i >= Math.max(0, n - 10); i--) {
      const u = Number(ubArr[i]), l = Number(lbArr[i]);
      if (!isNaN(u) && !isNaN(l) && u > 0 && l > 0) {
        ubLast = u; lbLast = l; break;
      }
    }
    const direction = getCrsiDirection(crsiArr);

    // Band+direction adjusted CRSI score (with crossing override from full arrays)
    const crsiBandScore = bandRelativeCrsiScore(crsiLast, ubLast, lbLast, direction, crsiArr, ubArr, lbArr);

    // Interpolated phase score — use avgPhaseStatus with avgPhaseScore (matched pair)
    const avgPhaseStatusStr = dom.avgPhaseStatus || dom.phaseStatus;
    const phaseScore = interpolatePhaseScore(avgPhaseStatusStr, dom.avgPhaseScore);
    const combinedScore = Math.round((0.5 * phaseScore + 0.5 * crsiBandScore) * 10) / 10;

    const bw = ubLast - lbLast;
    const accelTh = bw > 0 ? bw * 0.05 : 0.5;
    const dirLabel = direction < 0 ? 'falling' : direction > accelTh ? 'rising' : 'flat';
    log(`[${seriesId}] Phase: ${avgPhaseStatusStr} (avgPh=${dom.avgPhaseScore}) → ${phaseScore}, CRSI: ${crsiLast.toFixed(1)} [UB=${ubLast.toFixed(1)} LB=${lbLast.toFixed(1)} ${dirLabel}] → band score: ${crsiBandScore}, Combined: ${combinedScore}`);

    return {
      seriesId,
      name,
      cycleLength: dom.cycleLength,
      phaseStatus: avgPhaseStatusStr,
      avgPhaseScore: dom.avgPhaseScore ?? 0,
      phaseScore,
      crsi: Math.round(crsiLast * 10) / 10,
      crsiUB: Math.round(ubLast * 10) / 10,
      crsiLB: Math.round(lbLast * 10) / 10,
      crsiDirection: Math.round(direction * 100) / 100,
      crsiBandScore,
      combinedScore,
      bartels: Math.round(dom.bartelsValue * 10) / 10,
      stability: Math.round(dom.stabilityScore * 100) / 100,
      momentumYoY: Math.round(currentMomentum * 100) / 100,
      ...structuralFields,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[${seriesId}] ERROR: ${msg}`);
    return emptyResult(msg);
  }
}

// ── Main liquidity pipeline ──

function getLiquidityRegime(score: number): string {
  if (score >= 65) return 'Liquidity Expanding';
  if (score >= 50) return 'Liquidity Supportive';
  if (score >= 35) return 'Liquidity Neutral';
  if (score >= 20) return 'Liquidity Tightening';
  return 'Liquidity Contracting';
}

export async function runLiquidityPipeline(
  apiKey: string,
  onStatus?: (msg: string) => void,
): Promise<LiquidityResult> {
  const log = (msg: string) => onStatus?.(`[Liquidity] ${msg}`);

  log('Starting 8-series liquidity pipeline...');

  // ── Step 1: Ensure all datasets ──
  log('Ensuring datasets...');
  const nflComponentTickers = LIQUIDITY_NFL_COMPONENTS.map(c => c.tickerId);
  const scoredSeriesTickers = LIQUIDITY_SCORED_SERIES
    .filter(s => !s.derived)
    .map(s => s.tickerId);
  const fxTickers = [...LIQUIDITY_FX_TICKERS];
  const allTickers = [...new Set([...nflComponentTickers, ...scoredSeriesTickers, ...fxTickers])];
  await Promise.all(allTickers.map(t => ensureDataset(apiKey, t)));

  // ── Step 2: Fetch all raw data ──
  log('Fetching all raw data...');

  // NFL components
  const [walclBars, swptBars, rrpDailyBars, wtregenBars] = await Promise.all([
    getDatasetSeriesRaw(apiKey, 'WALCL-W:FDS'),
    getDatasetSeriesRaw(apiKey, 'SWPT-W:FDS'),
    getDatasetSeriesRaw(apiKey, 'RRPONTSYD:FDS'),
    getDatasetSeriesRaw(apiKey, 'WTREGEN-W:FDS'),
  ]);

  // Scored series (non-derived, non-NFL-component duplicates)
  const rawDataMap = new Map<string, OhlcvBar[]>();
  rawDataMap.set('WALCL-W:FDS', walclBars);

  const fetchTickers = LIQUIDITY_SCORED_SERIES
    .filter(s => !s.derived && s.tickerId !== 'WALCL-W:FDS')
    .map(s => s.tickerId);
  const fetchedBars = await Promise.all(fetchTickers.map(t => getDatasetSeriesRaw(apiKey, t)));
  fetchTickers.forEach((t, i) => rawDataMap.set(t, fetchedBars[i]));

  // FX data
  const [dexuseuBars, dexjpusBars] = await Promise.all([
    getDatasetSeriesRaw(apiKey, 'DEXUSEU:FDS'),
    getDatasetSeriesRaw(apiKey, 'DEXJPUS:FDS'),
  ]);

  log(`WALCL=${walclBars.length}, SWPT=${swptBars.length}, RRP=${rrpDailyBars.length}, TGA=${wtregenBars.length}`);
  log(`ECB=${rawDataMap.get('ECBASSETSW-W:FDS')?.length ?? 0}, BOJ=${rawDataMap.get('JPNASSETS-M:FDS')?.length ?? 0}`);
  log(`DEXUSEU=${dexuseuBars.length}, DEXJPUS=${dexjpusBars.length}`);

  // ── Step 3: Generate Wednesday grid from WALCL dates ──
  const walclDates = walclBars.filter(b => b.date).map(b => b.date!).sort();
  if (walclDates.length < 100) {
    throw new Error(`Insufficient WALCL data: ${walclDates.length} bars`);
  }
  const wednesdays = generateWednesdays(walclDates[0], walclDates[walclDates.length - 1]);
  log(`Wednesday grid: ${wednesdays.length} weeks from ${wednesdays[0]} to ${wednesdays[wednesdays.length - 1]}`);

  // ── Step 4: Align daily FX data directly to Wednesday grid ──
  // Reference aligns daily FX bars directly (not downsampled) for maximum precision
  const fxUsEuAligned = alignToWednesdays(wednesdays, dexuseuBars);
  const fxJpUsAligned = alignToWednesdays(wednesdays, dexjpusBars);

  // ── Step 5: Build NFL on the Wednesday grid ──
  const rrpWeekly = downsampleToWeekly(rrpDailyBars);

  // Build NFL level on WALCL dates, trimmed to 2014+ (matches reference — pre-RRP artifact removal)
  const nflRawBars: OhlcvBar[] = [];
  for (const wBar of walclBars) {
    if (!wBar.date) continue;
    // Reference trims NFL to 2014+: const cutoff = new Date('2014-01-01').getTime();
    if (wBar.date < '2014-01-01') continue;
    const r = findNearest(rrpWeekly, wBar.date);
    const t = findNearest(wtregenBars, wBar.date);
    const s = findNearest(swptBars, wBar.date);
    if (r && t && s && wBar.close != null) {
      nflRawBars.push({
        date: wBar.date,
        open: 0, high: 0, low: 0, volume: 0,
        close: wBar.close + (s.close || 0) - (r.close || 0) - (t.close || 0),
      });
    }
  }

  // ── Step 6: Align all 8 series to Wednesday grid ──
  const alignedData = new Map<string, (number | null)[]>();

  for (const cfg of LIQUIDITY_SCORED_SERIES) {
    if (cfg.fredId === 'NFL') {
      // NFL: align the derived data
      const nflAligned = alignToWednesdays(wednesdays, nflRawBars);
      alignedData.set('NFL', nflAligned);
    } else if (cfg.monthly) {
      // BOJ: monthly → linear interpolation to weekly
      const bars = rawDataMap.get(cfg.tickerId);
      if (!bars) { alignedData.set(cfg.fredId, wednesdays.map(() => null)); continue; }
      const interpolated = interpolateMonthlyToWeekly(wednesdays, bars);

      // Apply FX adjustment
      if (cfg.fxAdjust && cfg.fxTicker) {
        const fxArr = cfg.fxTicker === 'DEXUSEU:FDS' ? fxUsEuAligned : fxJpUsAligned;
        const adjusted = interpolated.map((val, i) => {
          if (val == null || fxArr[i] == null || fxArr[i] === 0) return null;
          return cfg.fxAdjust === 'multiply' ? val * fxArr[i]! : val / fxArr[i]!;
        });
        alignedData.set(cfg.fredId, adjusted);
      } else {
        alignedData.set(cfg.fredId, interpolated);
      }
    } else {
      // Weekly series: align to Wednesday grid
      const bars = rawDataMap.get(cfg.tickerId);
      if (!bars) { alignedData.set(cfg.fredId, wednesdays.map(() => null)); continue; }
      const aligned = alignToWednesdays(wednesdays, bars);

      // Apply FX adjustment
      if (cfg.fxAdjust && cfg.fxTicker) {
        const fxArr = cfg.fxTicker === 'DEXUSEU:FDS' ? fxUsEuAligned : fxJpUsAligned;
        const adjusted = aligned.map((val, i) => {
          if (val == null || fxArr[i] == null || fxArr[i] === 0) return null;
          return cfg.fxAdjust === 'multiply' ? val * fxArr[i]! : val / fxArr[i]!;
        });
        alignedData.set(cfg.fredId, adjusted);
      } else {
        alignedData.set(cfg.fredId, aligned);
      }
    }
  }

  // ── Step 7: Find common start index (WALCL + ECB + BOJ all have data) ──
  const walclAligned = alignedData.get('WALCL')!;
  const ecbAligned = alignedData.get('ECB_USD')!;
  const bojAligned = alignedData.get('BOJ_USD')!;

  let commonStartIdx = 0;
  for (let i = 0; i < wednesdays.length; i++) {
    if (walclAligned[i] != null && ecbAligned[i] != null && bojAligned[i] != null) {
      commonStartIdx = i;
      break;
    }
  }

  log(`Common start: index ${commonStartIdx} = ${wednesdays[commonStartIdx]} (trimming ${commonStartIdx} bars)`);

  // Trim all series and wednesdays from common start
  // IMPORTANT: Preserve null entries so array index i-52 = exactly 52 weeks back
  const trimmedWednesdays = wednesdays.slice(commonStartIdx);
  const trimmedData = new Map<string, (number | null)[]>();

  for (const cfg of LIQUIDITY_SCORED_SERIES) {
    const raw = alignedData.get(cfg.fredId)!;
    const trimmed = raw.slice(commonStartIdx);
    trimmedData.set(cfg.fredId, trimmed);
    const nonNull = trimmed.filter(v => v != null).length;
    log(`${cfg.fredId}: ${nonNull}/${trimmed.length} non-null points after common-start trim`);
  }

  // ── Step 8: Score each of the 8 series ──
  const allResults: LiquiditySeriesResult[] = [];

  for (const cfg of LIQUIDITY_SCORED_SERIES) {
    log(`Processing ${cfg.fredId}...`);
    const series = trimmedData.get(cfg.fredId)!;
    const nonNullCount = series.filter(v => v != null).length;

    if (nonNullCount < 60) {
      allResults.push({
        seriesId: cfg.fredId, name: cfg.name,
        cycleLength: 0, phaseStatus: 'Insufficient Data', avgPhaseScore: 0,
        phaseScore: 50, crsi: 50, crsiBandScore: 50,
        combinedScore: 50, bartels: 0, stability: 0, momentumYoY: 0,
        error: `Only ${nonNullCount} bars`,
      });
      continue;
    }

    const momentum = computeMomentum52wNullable(series);
    if (momentum.length < 50) {
      allResults.push({
        seriesId: cfg.fredId, name: cfg.name,
        cycleLength: 0, phaseStatus: 'Insufficient Momentum', avgPhaseScore: 0,
        phaseScore: 50, crsi: 50, crsiBandScore: 50,
        combinedScore: 50, bartels: 0, stability: 0, momentumYoY: 0,
        error: `Only ${momentum.length} momentum points`,
      });
      continue;
    }

    const result = await processOneMomentumSeries(
      apiKey, cfg.fredId, cfg.name,
      momentum, momentum[momentum.length - 1] ?? 0, log,
      false, // structural cycle detected separately on GLC composite
    );
    allResults.push(result);
  }

  // ── Step 9: Component composite — weighted average of 8 series ──
  const validSeries = allResults.filter(s => !s.error);
  let weightedSum = 0;
  let totalWeight = 0;
  for (const s of validSeries) {
    const cfg = LIQUIDITY_SCORED_SERIES.find(c => c.fredId === s.seriesId);
    const w = cfg?.weight ?? 1;
    weightedSum += s.combinedScore * w;
    totalWeight += w;
  }
  const componentComposite = totalWeight > 0 ? weightedSum / totalWeight : 50;

  log(`Component composite: ${componentComposite.toFixed(1)} (weighted avg, total weight ${totalWeight} from ${validSeries.length} series)`);
  log(`Series scores: ${validSeries.map(s => {
    const w = LIQUIDITY_SCORED_SERIES.find(c => c.fredId === s.seriesId)?.weight ?? 1;
    return `${s.seriesId}(w=${w})=${s.combinedScore.toFixed(1)}`;
  }).join(', ')}`);

  // ── Step 10: Structural cycle from GLC composite ──
  // Build a weighted, indexed composite from all 8 series → 52w YoY →
  // CycleScanner (restricted to 238-368 bars = 55-85 months) → CRSI → score.
  // This matches the reference which detects the structural ~65-month Howell cycle
  // on the GLC composite, not on individual series.

  let structuralScore = componentComposite; // fallback

  try {
    // Index each series to 100 at its first non-null value (after common start)
    const trimmedAligned = new Map<string, (number | null)[]>();
    for (const cfg of LIQUIDITY_SCORED_SERIES) {
      const raw = alignedData.get(cfg.fredId)!;
      trimmedAligned.set(cfg.fredId, raw.slice(commonStartIdx));
    }

    // Find base values (first non-null for each series)
    const bases = new Map<string, number>();
    for (const cfg of LIQUIDITY_SCORED_SERIES) {
      const arr = trimmedAligned.get(cfg.fredId)!;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] != null) { bases.set(cfg.fredId, arr[i]!); break; }
      }
    }

    // Compute weighted composite level (indexed to 100, dynamic weighting for available series)
    const totalConfigWeight = LIQUIDITY_SCORED_SERIES.reduce((s, c) => s + c.weight, 0);
    const compositeLevel: (number | null)[] = trimmedWednesdays.map((_, i) => {
      let wSum = 0, availW = 0;
      for (const cfg of LIQUIDITY_SCORED_SERIES) {
        const val = trimmedAligned.get(cfg.fredId)![i];
        const base = bases.get(cfg.fredId);
        if (val != null && base != null && base !== 0) {
          wSum += (val / base) * 100 * cfg.weight;
          availW += cfg.weight;
        }
      }
      return availW > 0 ? wSum / availW : null;
    });

    // 52w YoY on composite level (tracking dates for Howell calibration)
    const compositeYoY: number[] = [];
    const yoyDates: string[] = [];
    for (let i = 52; i < compositeLevel.length; i++) {
      const curr = compositeLevel[i], prev = compositeLevel[i - 52];
      if (curr != null && prev != null && Math.abs(prev) > 0.001) {
        compositeYoY.push(((curr - prev) / Math.abs(prev)) * 100);
        yoyDates.push(trimmedWednesdays[i]);
      }
    }

    log(`GLC composite: ${compositeLevel.filter(v => v != null).length} level pts, ${compositeYoY.length} momentum pts`);

    if (compositeYoY.length >= 200) {
      // Reference flow: 52w YoY → HP detrend → Howell pre-seed → rolling pctrank (780w) → CycleScanner
      log('HP detrending composite YoY...');
      const hp = await hpDetrend(apiKey, compositeYoY);
      log(`HP detrended: ${hp.length} pts`);

      // ── Howell pre-seed (adds ~30 years of historical context for pctrank) ──
      let howellPreSeed: number[] = [];
      try {
        const howellResp = await fetch(`${import.meta.env.BASE_URL}US-GLI-MOM.csv`);
        if (howellResp.ok) {
          const howellText = await howellResp.text();
          const howellData = howellText.trim().split('\n').slice(1).map(line => {
            const [d, v] = line.split(',');
            const dt = new Date(d);
            return {
              key: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'),
              value: parseFloat(v),
            };
          }).filter(h => !isNaN(h.value));

          const ourStart = yoyDates[0].slice(0, 7);
          const howellPre = howellData.filter(h => h.key < ourStart);
          const howellByMonth = new Map(howellData.map(h => [h.key, h.value]));

          // Find overlap between our HP values and Howell values (matched by month)
          const overlapIdxs: number[] = [];
          yoyDates.forEach((d, i) => {
            if (howellByMonth.has(d.slice(0, 7)) && i < hp.length) overlapIdxs.push(i);
          });

          if (overlapIdxs.length > 10) {
            // Linear regression: scale Howell to match our HP values
            const oV = overlapIdxs.map(i => hp[i]);
            const hV = overlapIdxs.map(i => howellByMonth.get(yoyDates[i].slice(0, 7))!);
            const n = oV.length;
            const mx = hV.reduce((a, b) => a + b, 0) / n;
            const my = oV.reduce((a, b) => a + b, 0) / n;
            let sxy = 0, sxx = 0;
            for (let i = 0; i < n; i++) {
              sxy += (hV[i] - mx) * (oV[i] - my);
              sxx += (hV[i] - mx) ** 2;
            }
            const a = sxy / sxx, b = my - a * mx;

            // Expand monthly Howell to weekly (~4.33 entries/month)
            for (const h of howellPre) {
              const scaled = a * h.value + b;
              for (let w = 0; w < 4; w++) howellPreSeed.push(scaled);
            }
            howellPreSeed = howellPreSeed.slice(0, Math.round(howellPre.length * 4.33));
            log(`Howell pre-seed: ${howellPreSeed.length} bars from ${howellPre.length} months`);
          }
        }
      } catch (e) {
        log(`Howell pre-seed unavailable (non-critical): ${e instanceof Error ? e.message : e}`);
      }

      // Rolling percentile rank (780-week window ≈ 180 months)
      // Pre-seed bars included in ranking window but stripped from output
      const PCTRANK_WINDOW = 780;
      const combinedHP = [...howellPreSeed, ...hp];
      const normCombined = rollingPctRank(combinedHP, PCTRANK_WINDOW);
      const norm = normCombined.slice(howellPreSeed.length);
      const validNorm = norm.filter(v => v != null) as number[];
      log(`Percentile rank: ${validNorm.length} valid pts (window=${PCTRANK_WINDOW}, pre-seed=${howellPreSeed.length})`);

      // CycleScanner with structural range (238-368 bars = ~55-85 months weekly)
      const structUrl =
        `https://api.cycle.tools/api/cycles/CycleScanner?api_key=${apiKey}` +
        `&minCycleLength=238&maxCycleLength=368` +
        `&sortByStrength=true&includeSpectrum=false` +
        `&dominantPeakFinder=true&useStability=true` +
        `&bartelsLimit=10&dtype=0`;
      const structResp = await fetch(structUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(validNorm),
      });
      if (!structResp.ok) throw new Error(`Structural CycleScanner HTTP ${structResp.status}`);
      const structText = await structResp.text();
      const structScan = JSON.parse(structText);
      const structPeaks = structScan.peaks ?? [];
      const structPeak = structPeaks.length > 0 ? structPeaks[0] : null;

      if (structPeak) {
        const sCL = structPeak.cycleLength;
        log(`GLC structural cycle: C${sCL} (~${Math.round(sCL / 4.33)}mo), bartels=${structPeak.bartelsValue?.toFixed(0)}`);

        // CRSI tuned to structural cycle on the pctrank values (not raw YoY!)
        const structCrsi = await getCrsi(apiKey, validNorm, sCL);
        const sCrsiArr = structCrsi.crsi ?? [];
        const sUbArr = structCrsi.ub ?? [];
        const sLbArr = structCrsi.lb ?? [];
        const sN = sCrsiArr.length;

        if (sN >= 3) {
          const sCrsiLast = Number(sCrsiArr[sN - 1]) || 50;
          let sUb = 70, sLb = 30;
          for (let i = Math.min(sN - 1, sUbArr.length - 1); i >= Math.max(0, sN - 10); i--) {
            const u = Number(sUbArr[i]), l = Number(sLbArr[i]);
            if (!isNaN(u) && !isNaN(l) && u > 0 && l > 0) { sUb = u; sLb = l; break; }
          }
          const sDir = getCrsiDirection(sCrsiArr);

          const sAvgPhaseStatus = structPeak.avgPhaseStatus || structPeak.phaseStatus || '';
          const sAvgPhaseScore = structPeak.avgPhaseScore ?? 0;
          const sPhaseScore = interpolatePhaseScore(sAvgPhaseStatus, sAvgPhaseScore);
          const sCrsiBandScore = bandRelativeCrsiScore(sCrsiLast, sUb, sLb, sDir, sCrsiArr, sUbArr, sLbArr);
          structuralScore = Math.round((0.5 * sPhaseScore + 0.5 * sCrsiBandScore) * 10) / 10;

          log(`GLC structural: phase=${sAvgPhaseStatus}→${sPhaseScore.toFixed(1)}, CRSI=${sCrsiLast.toFixed(1)} [UB=${sUb.toFixed(1)} LB=${sLb.toFixed(1)}]→band=${sCrsiBandScore.toFixed(1)}, score=${structuralScore}`);

          // Store structural info on NFL result for UI display
          const nflResult = allResults.find(s => s.seriesId === 'NFL');
          if (nflResult) {
            nflResult.structuralCycleLength = sCL;
            nflResult.structuralPhaseStatus = sAvgPhaseStatus;
            nflResult.structuralAvgPhaseScore = sAvgPhaseScore;
            nflResult.structuralPhaseScore = structuralScore;
            nflResult.structuralStability = Math.round((structPeak.stabilityScore ?? 0) * 100) / 100;
          }
        }
      } else {
        log('No structural cycle found in 238-368 bar range');
      }
    } else {
      log(`Insufficient composite momentum data (${compositeYoY.length}) for structural detection`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Structural cycle detection FAILED: ${msg}`);
    console.error('Structural cycle detection error:', err);
  }

  // ── Step 11: compositeScore = 0.8 × structural + 0.2 × componentComposite ──
  log(`FINAL: structuralScore=${structuralScore.toFixed(1)}, componentComposite=${componentComposite.toFixed(1)}, fallback=${structuralScore === componentComposite ? 'YES (structural detection failed!)' : 'NO (structural detected)'}`);
  const displayScore = 0.8 * structuralScore + 0.2 * componentComposite;
  const compositeScore = Math.round(Math.max(0, Math.min(100, displayScore)) * 10) / 10;
  const regime = getLiquidityRegime(compositeScore);

  log(`Display score: 0.8 × ${structuralScore.toFixed(1)} + 0.2 × ${componentComposite.toFixed(1)} = ${compositeScore}`);
  log(`Liquidity Score: ${compositeScore} — ${regime}`);

  return {
    compositeScore,
    regime,
    series: allResults,
    timestamp: new Date().toISOString(),
  };
}
