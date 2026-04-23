import type { SeriesConfig, SeriesResult, CyclePeak } from '../types';
import { ensureDataset, getDatasetSeries, cycleScanner } from './cycleToolsApi';

function extractDominantPeak(peaks: CyclePeak[]): CyclePeak | null {
  // Filter out noise: cycleLength >= 30, stabilityScore >= 0.4
  const viable = peaks.filter(
    (p) => p.cycleLength >= 30 && (p.stabilityScore >= 0.4 || p.stabilityScore === 0)
  );

  if (viable.length === 0) {
    const fallback = peaks.filter((p) => p.cycleLength >= 30);
    if (fallback.length === 0) return peaks[0] ?? null;
    return fallback.sort((a, b) => b.strength - a.strength)[0];
  }

  // Prefer dominantRank > 0 (rank-1 = most dominant)
  const ranked = viable.filter((p) => p.dominantRank > 0);
  if (ranked.length > 0) {
    return ranked.sort((a, b) => a.dominantRank - b.dominantRank)[0];
  }

  return viable.sort((a, b) => b.strength - a.strength)[0];
}

/** Map avgPhaseScore (-100..+100) to 0..100 */
function mapPhaseScore(avgPhaseScore: number): number {
  return Math.max(0, Math.min(100, (avgPhaseScore + 100) / 2));
}

/**
 * Normalize the dominant peak's strength within its own spectrum.
 * Measures how much the dominant cycle stands out from the noise.
 * Returns 0-1 where 1 = dominant peak towers over all others.
 */
function normalizeStrengthInSpectrum(dominant: CyclePeak, allPeaks: CyclePeak[]): number {
  if (allPeaks.length <= 1) return 1; // only one peak = fully dominant

  const strengths = allPeaks.map((p) => p.strength);
  const minStr = Math.min(...strengths);
  const maxStr = Math.max(...strengths);
  const range = maxStr - minStr;

  if (range === 0) return 1; // all peaks equal strength

  return (dominant.strength - minStr) / range;
}

export async function runPipeline(
  apiKey: string,
  series: SeriesConfig,
  onStatus?: (msg: string) => void
): Promise<SeriesResult> {
  const log = (msg: string) => onStatus?.(`[${series.fredId}] ${msg}`);

  try {
    // Step 1: Ensure dataset is up to date
    log('Updating dataset...');
    await ensureDataset(apiKey, series.tickerId);

    // Step 2: Get price data
    log('Fetching data...');
    const { bars, closes } = await getDatasetSeries(apiKey, series.tickerId, 1000);
    log(`Got ${closes.length} closes`);

    // Extract last bar date
    const lastBar = bars[bars.length - 1];
    const lastDataDate = lastBar?.date ?? '';

    // Step 3: Cycle Scanner
    log('Running CycleScanner...');
    const scanResult = await cycleScanner(apiKey, closes);

    if (!scanResult.peaks || scanResult.peaks.length === 0) {
      throw new Error('CycleScanner returned no peaks');
    }

    const dominant = extractDominantPeak(scanResult.peaks);
    if (!dominant) {
      throw new Error('No viable dominant cycle found');
    }

    // Step 4: Normalize strength within this series' spectrum
    const normalizedStrength = normalizeStrengthInSpectrum(dominant, scanResult.peaks);

    log(`Dominant: ${dominant.cycleLength} bars, phase: ${dominant.phaseStatus}, strength: ${dominant.strength.toFixed(1)} (norm: ${normalizedStrength.toFixed(2)})`);

    // Step 5: Derive score from phase
    const rawPhaseScore = dominant.avgPhaseScore ?? 0;
    const phaseScore = mapPhaseScore(rawPhaseScore);
    const adjustedScore = series.invert ? 100 - phaseScore : phaseScore;

    log(`Phase score: ${rawPhaseScore} → ${phaseScore.toFixed(1)} → adjusted: ${adjustedScore.toFixed(1)}${series.invert ? ' (inverted)' : ''}`);

    return {
      symbolId: series.tickerId,
      fredId: series.fredId,
      layer: series.layer,
      layerName: series.layerName,
      frequency: series.frequency,
      invert: series.invert,
      seriesName: series.seriesName,
      rawPhaseScore: Math.round(rawPhaseScore * 10) / 10,
      phaseScore: Math.round(phaseScore * 10) / 10,
      adjustedScore: Math.round(adjustedScore * 10) / 10,
      dominantCycleLength: Math.round(dominant.cycleLength),
      amplitude: Math.round(dominant.amplitude * 100) / 100,
      bartels: Math.round(dominant.bartelsValue * 10) / 10,
      strength: Math.round(dominant.strength * 100) / 100,
      normalizedStrength: Math.round(normalizedStrength * 1000) / 1000,
      stabilityScore: Math.round(dominant.stabilityScore * 100) / 100,
      phaseStatus: dominant.phaseStatus,
      dominantRank: dominant.dominantRank,
      minBarNum: dominant.minBarNum,
      closesCount: closes.length,
      lastCloseValue: closes[closes.length - 1],
      lastDataDate,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`ERROR: ${msg}`);
    return {
      symbolId: series.tickerId,
      fredId: series.fredId,
      layer: series.layer,
      layerName: series.layerName,
      frequency: series.frequency,
      invert: series.invert,
      seriesName: series.seriesName,
      rawPhaseScore: 0,
      phaseScore: 0,
      adjustedScore: 0,
      dominantCycleLength: 0,
      amplitude: 0,
      bartels: 0,
      strength: 0,
      normalizedStrength: 0,
      stabilityScore: 0,
      phaseStatus: 'Error',
      dominantRank: 0,
      minBarNum: 0,
      closesCount: 0,
      lastCloseValue: 0,
      lastDataDate: '',
      updatedAt: new Date().toISOString(),
      error: msg,
    };
  }
}
