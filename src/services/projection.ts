/**
 * Cycle Projection Engine
 *
 * Projects future composite scores by advancing each series' dominant cycle
 * forward in time using a sinusoidal model. The current phase position is
 * derived from rawPhaseScore + phaseStatus (which disambiguates the quadrant),
 * then advanced at the rate determined by the cycle length and data frequency.
 *
 * Projection weighting: seriesWeight × stabilityScore — stable cycles
 * contribute more to the forward estimate than unstable ones.
 */

import type { SeriesResult, LiquidityResult, LiquiditySeriesResult, Frequency } from '../types';
import { LAYER_WEIGHTS, SERIES_WEIGHTS } from '../config/seriesRegistry';
import type { CompositeResult } from './composite';

// ── Types ────────────────────────────────────────────────────────

export interface SeriesProjection {
  fredId: string;
  seriesName: string;
  layer: number;
  currentScore: number;
  projectedScores: number[];   // scores at each horizon
  stabilityScore: number;
  projectionWeight: number;    // seriesWeight × stabilityScore
  trend: 'improving' | 'stable' | 'deteriorating';
  /** Structural cycle regime context (NFL only) */
  structuralRegime?: 'expansion' | 'contraction' | 'transition';
  structuralPhaseScore?: number;
}

export interface LayerProjection {
  layer: number;
  layerName: string;
  currentScore: number;
  projectedScores: number[];   // weighted-average at each horizon
  trend: 'improving' | 'stable' | 'deteriorating';
  confidence: number;          // 0-1, stability-weighted fraction
  seriesProjections: SeriesProjection[];
}

export interface RegimeChange {
  fromRegime: string;
  toRegime: string;
  atWeek: number;              // weeks from now
  projectedScore: number;
}

export interface ProjectionResult {
  horizonWeeks: number[];      // [4, 8, 12]
  layers: LayerProjection[];
  projectedCompositeScores: number[];  // master score at each horizon
  projectedRegimes: string[];          // regime label at each horizon
  regimeChanges: RegimeChange[];       // detected regime transitions
  overallTrend: 'improving' | 'stable' | 'deteriorating';
  confidence: number;                  // overall projection confidence
}

// ── Constants ────────────────────────────────────────────────────

const HORIZONS_WEEKS = [4, 8, 12];

/** Bars per week by frequency */
const BARS_PER_WEEK: Record<Frequency, number> = {
  daily: 5,
  weekly: 1,
  monthly: 0.23,  // ~1 bar per 4.33 weeks
};

// ── Phase Angle Derivation ───────────────────────────────────────

/**
 * Derive the current phase angle (radians, 0 = bottom, π = top)
 * from rawPhaseScore and phaseStatus.
 *
 * The cycle is modeled as: rawPhaseScore = 100 × sin(angle)
 * where angle progresses from 0 (bottom) through π (top) to 2π (next bottom).
 *
 * phaseStatus disambiguates: same rawPhaseScore can be rising (first half)
 * or falling (second half) of the cycle.
 */
function derivePhaseAngle(rawPhaseScore: number, phaseStatus: string): number {
  // Clamp to valid range
  const clamped = Math.max(-100, Math.min(100, rawPhaseScore));
  // Base angle from arcsin
  const baseAngle = Math.asin(clamped / 100);

  // Determine if we're in the rising half (0 → π/2 → π going up)
  // or falling half (π → 3π/2 → 2π going down)
  const isRising = phaseStatus.includes('Uptrend') ||
                   phaseStatus.includes('BOTTOM_Departure') ||
                   phaseStatus.includes('BOTTOM_Arrival') ||
                   phaseStatus.includes('Rising');
  const isFalling = phaseStatus.includes('Downtrend') ||
                    phaseStatus.includes('TOP_Departure') ||
                    phaseStatus.includes('TOP_Arrival') ||
                    phaseStatus.includes('Falling');

  if (isRising) {
    // Rising half: angle goes from -π/2 (bottom, score=-100) to π/2 (top, score=+100)
    // Map to 0..π where 0=bottom, π/2=midpoint-rising, π=top
    return (Math.PI / 2) + baseAngle;  // range: 0 to π
  } else if (isFalling) {
    // Falling half: angle goes from π/2 (top, score=+100) to 3π/2 (bottom, score=-100)
    // Map to π..2π where π=top, 3π/2=midpoint-falling, 2π=bottom
    return (3 * Math.PI / 2) - baseAngle;  // range: π to 2π
  }

  // Fallback: use rawPhaseScore sign as hint
  if (clamped >= 0) {
    return (Math.PI / 2) + baseAngle;  // assume near top, rising side
  }
  return (3 * Math.PI / 2) - baseAngle;  // assume near bottom, falling side
}

/**
 * Convert a phase angle to a rawPhaseScore (-100 to +100).
 * angle=0 → -100 (bottom), angle=π/2 → 0 (mid-rising),
 * angle=π → +100 (top), angle=3π/2 → 0 (mid-falling), angle=2π → -100 (bottom)
 */
function angleToRawScore(angle: number): number {
  // Normalize to [0, 2π)
  const norm = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // sin model: score = 100 × sin(angle) but shifted so 0=bottom
  // We use: score = -100 × cos(angle) so that angle=0 → -100, angle=π → +100
  return -100 * Math.cos(norm);
}

/**
 * Convert rawPhaseScore to adjustedScore (0-100), applying inversion if needed.
 */
function rawToAdjusted(rawPhaseScore: number, invert: boolean): number {
  const phaseScore = (rawPhaseScore + 100) / 2;  // map -100..+100 to 0..100
  return invert ? 100 - phaseScore : phaseScore;
}

// ── Series Projection ────────────────────────────────────────────

function projectSeries(
  result: SeriesResult,
  horizonsWeeks: number[],
): SeriesProjection {
  const barsPerWeek = BARS_PER_WEEK[result.frequency];
  const cycleLength = result.dominantCycleLength;
  const stability = result.stabilityScore || 0;
  const seriesWeight = SERIES_WEIGHTS[result.fredId] ?? 0.10;

  // If no valid cycle or error, return flat projection
  if (result.error || cycleLength <= 0 || stability <= 0) {
    return {
      fredId: result.fredId,
      seriesName: result.seriesName,
      layer: result.layer,
      currentScore: result.adjustedScore,
      projectedScores: horizonsWeeks.map(() => result.adjustedScore),
      stabilityScore: stability,
      projectionWeight: 0,
      trend: 'stable',
    };
  }

  const currentAngle = derivePhaseAngle(result.rawPhaseScore, result.phaseStatus);
  // Angular velocity: 2π per full cycle, converted to radians per week
  const radiansPerBar = (2 * Math.PI) / cycleLength;
  const radiansPerWeek = radiansPerBar * barsPerWeek;

  const projectedScores = horizonsWeeks.map((weeks) => {
    const futureAngle = currentAngle + radiansPerWeek * weeks;
    const futureRaw = angleToRawScore(futureAngle);
    return rawToAdjusted(futureRaw, result.invert);
  });

  // Determine trend from first and last projection
  const delta = projectedScores[projectedScores.length - 1] - result.adjustedScore;
  const trend: SeriesProjection['trend'] =
    delta > 3 ? 'improving' : delta < -3 ? 'deteriorating' : 'stable';

  return {
    fredId: result.fredId,
    seriesName: result.seriesName,
    layer: result.layer,
    currentScore: result.adjustedScore,
    projectedScores,
    stabilityScore: stability,
    projectionWeight: seriesWeight * stability,
    trend,
  };
}

// ── Structural Cycle Envelope (Howell ~65-month cycle) ──────────

/**
 * Compute a score ceiling/floor from the structural cycle's phase position.
 * When the structural cycle is in its contraction half (π to 2π),
 * the operational projection is capped — preventing false "improving" signals
 * during a structural contraction. Vice versa for expansion half.
 *
 * Returns { ceiling, floor } for the projected score at this horizon.
 */
function getStructuralEnvelope(
  structuralPhaseScore: number,
): { ceiling: number; floor: number } {
  // structuralPhaseScore is 0-100 from the fixed-point phase scoring:
  //   100 = Uptrend_Starting (most bullish — confirmed turn from trough)
  //   88 = BOTTOM_Departure, 78 = BOTTOM_Arrival
  //   72-54 = Uptrend_Neutral (expansion)
  //   48 = Uptrend_ApproachingTop, 42 = TOP_Arrival (peaking)
  //   30 = TOP_Departure
  //   36 = Downtrend_ApproachingBottom
  //   12-30 = Downtrend_Neutral (contraction)
  //   0 = Downtrend_Starting (most bearish — confirmed turn from peak)
  //
  // In structural contraction (score < 45): cap upside at 55
  //   — operational bounces are counter-trend, not regime changes
  // In structural expansion (score >= 55): floor downside at 45
  //   — operational dips are pullbacks, not regime shifts
  // In transition zone (45-55): no clamping, let operational cycle dominate

  if (structuralPhaseScore < 35) {
    // Deep structural contraction: hard cap
    return { ceiling: 50, floor: 0 };
  }
  if (structuralPhaseScore < 45) {
    // Moderate structural contraction: softer cap
    // Linearly interpolate ceiling from 50 (at score=35) to 60 (at score=45)
    const t = (structuralPhaseScore - 35) / 10;
    return { ceiling: 50 + t * 10, floor: 0 };
  }
  if (structuralPhaseScore >= 65) {
    // Deep structural expansion: hard floor
    return { ceiling: 100, floor: 50 };
  }
  if (structuralPhaseScore >= 55) {
    // Moderate structural expansion: softer floor
    // Linearly interpolate floor from 40 (at score=55) to 50 (at score=65)
    const t = (structuralPhaseScore - 55) / 10;
    return { ceiling: 100, floor: 40 + t * 10 };
  }
  // Transition zone (45-55): no clamping
  return { ceiling: 100, floor: 0 };
}

// ── Liquidity Series Projection ──────────────────────────────────

function projectLiquiditySeries(
  series: LiquiditySeriesResult,
  horizonsWeeks: number[],
): SeriesProjection {
  const stability = series.stability || 0;
  const cycleLength = series.cycleLength;

  if (series.error || cycleLength <= 0 || stability <= 0) {
    const score = series.error ? 50 : series.combinedScore;
    return {
      fredId: series.seriesId,
      seriesName: series.name,
      layer: 5,
      currentScore: score,
      projectedScores: horizonsWeeks.map(() => score),
      stabilityScore: stability,
      projectionWeight: 0,
      trend: 'stable',
    };
  }

  // All liquidity series are weekly (momentum series)
  const barsPerWeek = 1;
  const currentAngle = derivePhaseAngle(series.avgPhaseScore, series.phaseStatus);
  const radiansPerBar = (2 * Math.PI) / cycleLength;
  const radiansPerWeek = radiansPerBar * barsPerWeek;

  // Structural envelope for NFL (Tier A): clamp projections to the ~65-month cycle regime
  const hasStructural = series.seriesId === 'NFL' &&
    series.structuralPhaseScore != null &&
    series.structuralCycleLength != null &&
    series.structuralCycleLength > 0;

  // If structural cycle exists, also advance it (very slowly) over the horizon
  const structAngle = hasStructural
    ? derivePhaseAngle(series.structuralAvgPhaseScore!, series.structuralPhaseStatus!)
    : 0;
  const structRadiansPerWeek = hasStructural
    ? (2 * Math.PI) / series.structuralCycleLength! * barsPerWeek
    : 0;

  const projectedScores = horizonsWeeks.map((weeks) => {
    const futureAngle = currentAngle + radiansPerWeek * weeks;
    const futureRaw = angleToRawScore(futureAngle);
    const phaseScore = (futureRaw + 100) / 2;

    // CRSI decays toward neutral
    const currentCrsiBand = series.crsiBandScore;
    const weeksNorm = weeks / 12;
    const projectedCrsi = currentCrsiBand + (50 - currentCrsiBand) * weeksNorm * 0.5;

    let projected = 0.5 * phaseScore + 0.5 * projectedCrsi;

    // Apply structural envelope clamp (NFL only)
    if (hasStructural) {
      const futureStructAngle = structAngle + structRadiansPerWeek * weeks;
      const futureStructRaw = angleToRawScore(futureStructAngle);
      const futureStructPhaseScore = (futureStructRaw + 100) / 2;
      const { ceiling, floor } = getStructuralEnvelope(futureStructPhaseScore);
      projected = Math.max(floor, Math.min(ceiling, projected));
    }

    return projected;
  });

  const delta = projectedScores[projectedScores.length - 1] - series.combinedScore;
  const trend: SeriesProjection['trend'] =
    delta > 3 ? 'improving' : delta < -3 ? 'deteriorating' : 'stable';

  // Equal weight: 1/5 per series (no tier grouping)
  const seriesWeight = 0.20;

  // Classify structural regime for narrative context
  let structuralRegime: SeriesProjection['structuralRegime'];
  if (hasStructural) {
    const sps = series.structuralPhaseScore!;
    structuralRegime = sps >= 55 ? 'expansion' : sps < 45 ? 'contraction' : 'transition';
  }

  return {
    fredId: series.seriesId,
    seriesName: series.name,
    layer: 5,
    currentScore: series.combinedScore,
    projectedScores,
    stabilityScore: stability,
    projectionWeight: seriesWeight * stability,
    trend,
    structuralRegime: hasStructural ? structuralRegime : undefined,
    structuralPhaseScore: hasStructural ? series.structuralPhaseScore : undefined,
  };
}

// ── Layer & Composite Projection ─────────────────────────────────

function classifyRegimeLabel(score: number): string {
  if (score >= 62) return 'Risk-On';
  if (score >= 55) return 'Neutral-Bullish';
  if (score >= 48) return 'Neutral';
  if (score >= 38) return 'Neutral-Bearish';
  return 'Risk-Off';
}

function projectLayer(
  seriesProjections: SeriesProjection[],
  layer: number,
  layerName: string,
  currentLayerScore: number,
  horizonsCount: number,
): LayerProjection {
  const valid = seriesProjections.filter(s => s.projectionWeight > 0);

  if (valid.length === 0) {
    return {
      layer,
      layerName,
      currentScore: currentLayerScore,
      projectedScores: Array(horizonsCount).fill(currentLayerScore),
      trend: 'stable',
      confidence: 0,
      seriesProjections,
    };
  }

  const totalWeight = valid.reduce((sum, s) => sum + s.projectionWeight, 0);

  const projectedScores = Array.from({ length: horizonsCount }, (_, i) => {
    const weightedSum = valid.reduce(
      (sum, s) => sum + s.projectedScores[i] * s.projectionWeight, 0
    );
    return Math.round((weightedSum / totalWeight) * 10) / 10;
  });

  // Confidence: ratio of stability-weighted projection weight to max possible weight
  const maxWeight = seriesProjections.reduce(
    (sum, s) => sum + (SERIES_WEIGHTS[s.fredId] ?? s.projectionWeight / Math.max(s.stabilityScore, 0.01)),
    0
  );
  const confidence = maxWeight > 0
    ? Math.min(1, totalWeight / maxWeight)
    : 0;

  const delta = projectedScores[projectedScores.length - 1] - currentLayerScore;
  const trend: LayerProjection['trend'] =
    delta > 2 ? 'improving' : delta < -2 ? 'deteriorating' : 'stable';

  return {
    layer,
    layerName,
    currentScore: currentLayerScore,
    projectedScores,
    trend,
    confidence: Math.round(confidence * 100) / 100,
    seriesProjections,
  };
}

// ── Main Projection Function ─────────────────────────────────────

export function calculateProjection(
  results: SeriesResult[],
  composite: CompositeResult,
  liquidityResult?: LiquidityResult,
): ProjectionResult {
  const horizons = HORIZONS_WEEKS;

  // Project L1-L4 series
  const l14Projections = results.map(r => projectSeries(r, horizons));

  // Project L5 liquidity series
  const l5Projections = liquidityResult
    ? liquidityResult.series.map(s => projectLiquiditySeries(s, horizons))
    : [];

  // Build layer projections
  const layerProjections: LayerProjection[] = [];

  for (const layerScore of composite.layers) {
    if (layerScore.layer === 5) {
      layerProjections.push(
        projectLayer(l5Projections, 5, layerScore.layerName, layerScore.score, horizons.length)
      );
    } else {
      const layerSeries = l14Projections.filter(s => s.layer === layerScore.layer);
      layerProjections.push(
        projectLayer(layerSeries, layerScore.layer, layerScore.layerName, layerScore.score, horizons.length)
      );
    }
  }

  // Compute projected composite scores
  const projectedCompositeScores = horizons.map((_, i) => {
    const raw = layerProjections.reduce(
      (sum, lp) => sum + lp.projectedScores[i] * (LAYER_WEIGHTS[lp.layer] ?? 0),
      0
    );
    return Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
  });

  // Classify projected regimes
  const currentRegime = classifyRegimeLabel(composite.masterScore);
  const projectedRegimes = projectedCompositeScores.map(classifyRegimeLabel);

  // Detect regime changes
  const regimeChanges: RegimeChange[] = [];
  let prevRegime = currentRegime;
  for (let i = 0; i < horizons.length; i++) {
    if (projectedRegimes[i] !== prevRegime) {
      regimeChanges.push({
        fromRegime: prevRegime,
        toRegime: projectedRegimes[i],
        atWeek: horizons[i],
        projectedScore: projectedCompositeScores[i],
      });
      prevRegime = projectedRegimes[i];
    }
  }

  // Overall trend
  const compositeDelta = projectedCompositeScores[projectedCompositeScores.length - 1] - composite.masterScore;
  const overallTrend: ProjectionResult['overallTrend'] =
    compositeDelta > 2 ? 'improving' : compositeDelta < -2 ? 'deteriorating' : 'stable';

  // Overall confidence: weighted average of layer confidences
  const totalLayerWeight = layerProjections.reduce((s, lp) => s + (LAYER_WEIGHTS[lp.layer] ?? 0), 0);
  const confidence = totalLayerWeight > 0
    ? layerProjections.reduce((s, lp) => s + lp.confidence * (LAYER_WEIGHTS[lp.layer] ?? 0), 0) / totalLayerWeight
    : 0;

  return {
    horizonWeeks: horizons,
    layers: layerProjections,
    projectedCompositeScores,
    projectedRegimes,
    regimeChanges,
    overallTrend,
    confidence: Math.round(confidence * 100) / 100,
  };
}
