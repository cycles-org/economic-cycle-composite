import type { SeriesResult, LiquidityResult } from '../types';
import { LAYER_WEIGHTS, SERIES_WEIGHTS, LAYER_NAMES } from '../config/seriesRegistry';

export interface LayerScore {
  layer: number;
  layerName: string;
  score: number;
  weight: number;
  seriesCount: number;
  validCount: number;
  series: SeriesResult[];
}

export type RegimeLabel =
  | 'Risk-On'
  | 'Neutral-Bullish'
  | 'Neutral'
  | 'Neutral-Bearish'
  | 'Risk-Off';

export interface RegimeInfo {
  label: RegimeLabel;
  color: string;
  bgColor: string;
  implication: string;
}

export interface DivergenceInfo {
  spread: number;          // L1 - L2 (negative = leading weaker than coincident)
  signal: 'none' | 'caution' | 'warning';
  description: string;
}

export interface LiquidityDivergenceInfo {
  l5l1Spread: number;     // L5 - L1 (negative = liquidity leading downturn)
  signal: 'none' | 'liquidity-leading-downturn' | 'liquidity-leading-upturn';
  description: string;
  regimeDowngrade: boolean; // true if L5 is low enough to downgrade regime
}

export interface CompositeResult {
  masterScore: number;
  divergenceAdjustment: number;  // total penalty/bonus from divergence signals
  regime: RegimeInfo;
  divergence: DivergenceInfo;
  liquidityDivergence: LiquidityDivergenceInfo;
  layers: LayerScore[];
  totalSeries: number;
  validSeries: number;
  errorSeries: number;
  timestamp: string;
}

/**
 * Regime bands tightened based on backtest.
 * Composite clusters in 44-62 range historically,
 * so bands are compressed to create useful differentiation.
 */
function classifyRegime(
  score: number,
  divergence: DivergenceInfo,
  liquidityDiv: LiquidityDivergenceInfo,
): RegimeInfo {
  // Divergence overrides: L1-L2 warning OR severe liquidity tightening
  const downgrade = divergence.signal === 'warning' || liquidityDiv.regimeDowngrade;

  if (score >= 62 && !downgrade) return {
    label: 'Risk-On', color: 'text-c-green', bgColor: 'bg-green-500/20',
    implication: 'Cyclical lows are buying opportunities',
  };
  if (score >= 55 && !downgrade) return {
    label: 'Neutral-Bullish', color: 'text-c-green2', bgColor: 'bg-green-500/10',
    implication: 'Mild tailwind, cycles work normally',
  };
  if (score >= 62 && downgrade) return {
    label: 'Neutral-Bullish', color: 'text-c-green2', bgColor: 'bg-green-500/10',
    implication: liquidityDiv.regimeDowngrade
      ? 'Economy strong but liquidity tightening — late cycle caution'
      : 'Economy strong but leading indicators diverging — late cycle caution',
  };
  if (score >= 55 && downgrade) return {
    label: 'Neutral', color: 'text-c-yellow', bgColor: 'bg-yellow-500/10',
    implication: liquidityDiv.regimeDowngrade
      ? 'Liquidity drying up despite headline strength — watch for turn'
      : 'Leading indicators weakening despite strong activity — watch for turn',
  };
  if (score >= 48) return {
    label: 'Neutral', color: 'text-c-yellow', bgColor: 'bg-yellow-500/10',
    implication: 'No macro edge, rely on equity cycles alone',
  };
  if (score >= 38) return {
    label: 'Neutral-Bearish', color: 'text-c-orange', bgColor: 'bg-orange-500/10',
    implication: 'Macro headwind, cyclical rallies may fail',
  };
  return {
    label: 'Risk-Off', color: 'text-c-red', bgColor: 'bg-red-500/10',
    implication: 'Cyclical patterns likely overridden by macro',
  };
}

/**
 * L5-L1 liquidity divergence: measures whether liquidity is leading the
 * economic cycle up or down. Howell's framework: liquidity leads the economy
 * by ~3-6 months, so L5 diverging below L1 means the funding environment
 * is deteriorating before leading indicators have fully rolled over.
 *
 * Also checks whether L5 alone is bearish enough to warrant a regime downgrade,
 * analogous to the L1-L2 warning mechanism.
 */
function calculateLiquidityDivergence(layers: LayerScore[]): LiquidityDivergenceInfo {
  const l5 = layers.find((l) => l.layer === 5);
  const l1 = layers.find((l) => l.layer === 1);

  if (!l5 || !l1 || l5.validCount === 0) {
    return { l5l1Spread: 0, signal: 'none', description: 'No liquidity data', regimeDowngrade: false };
  }

  const spread = Math.round((l5.score - l1.score) * 10) / 10;

  // Regime downgrade: L5 below 35 means liquidity is in clear tightening territory
  const regimeDowngrade = l5.score < 35;

  // L5-L1 divergence signal
  if (spread <= -10) {
    return {
      l5l1Spread: spread,
      signal: 'liquidity-leading-downturn',
      description: `Liquidity ${Math.abs(spread).toFixed(0)}pts below leading indicators — funding conditions deteriorating ahead of the economy`,
      regimeDowngrade,
    };
  }
  if (spread >= 15) {
    return {
      l5l1Spread: spread,
      signal: 'liquidity-leading-upturn',
      description: `Liquidity ${spread.toFixed(0)}pts above leading indicators — funding conditions improving, recovery signal`,
      regimeDowngrade,
    };
  }

  return {
    l5l1Spread: spread,
    signal: 'none',
    description: regimeDowngrade
      ? 'Liquidity in tightening territory'
      : 'No significant liquidity divergence',
    regimeDowngrade,
  };
}

/**
 * L1-L2 divergence: when leading indicators (L1) are significantly
 * weaker than coincident activity (L2), it signals the economy is
 * at or near a peak — the classic late-cycle warning.
 *
 * Conversely, L1 >> L2 means leading indicators are recovering
 * before the broad economy — early recovery signal.
 */
function calculateDivergence(layers: LayerScore[]): DivergenceInfo {
  const l1 = layers.find((l) => l.layer === 1);
  const l2 = layers.find((l) => l.layer === 2);

  if (!l1 || !l2 || l1.validCount === 0 || l2.validCount === 0) {
    return { spread: 0, signal: 'none', description: 'Insufficient data' };
  }

  const spread = Math.round((l1.score - l2.score) * 10) / 10;

  if (spread <= -25) {
    return {
      spread,
      signal: 'warning',
      description: `Leading indicators ${Math.abs(spread).toFixed(0)}pts below coincident — late cycle, deterioration ahead`,
    };
  }
  if (spread <= -15) {
    return {
      spread,
      signal: 'caution',
      description: `Leading indicators ${Math.abs(spread).toFixed(0)}pts below coincident — early divergence`,
    };
  }
  if (spread >= 25) {
    return {
      spread,
      signal: 'none',
      description: `Leading indicators ${spread.toFixed(0)}pts above coincident — early recovery signal`,
    };
  }

  return { spread, signal: 'none', description: 'No significant divergence' };
}

/**
 * Intra-layer divergence penalty: when the highest-weight series in a layer
 * diverges sharply from the remaining series, it signals an internal disagreement
 * that should pull the layer score toward caution. This prevents a single dominant
 * series from masking deterioration in the rest of the layer.
 *
 * Penalty scales linearly: 0 at 30pt spread, up to -5 at 60+ pt spread.
 */
function intraLayerDivergencePenalty(valid: SeriesResult[]): number {
  if (valid.length < 3) return 0; // need at least 3 series for meaningful divergence

  // Find the highest-weight series
  const sorted = [...valid].sort((a, b) => (SERIES_WEIGHTS[b.fredId] ?? 0.10) - (SERIES_WEIGHTS[a.fredId] ?? 0.10));
  const top = sorted[0];
  const rest = sorted.slice(1);

  const topWeight = SERIES_WEIGHTS[top.fredId] ?? 0.10;
  const restTotalWeight = rest.reduce((s, r) => s + (SERIES_WEIGHTS[r.fredId] ?? 0.10), 0);

  // Only apply if top series has meaningful weight advantage (>30% of layer)
  if (topWeight / (topWeight + restTotalWeight) < 0.30) return 0;

  const restAvg = rest.reduce((s, r) => s + r.adjustedScore * (SERIES_WEIGHTS[r.fredId] ?? 0.10), 0) / restTotalWeight;
  const spread = top.adjustedScore - restAvg;

  // Only penalize when top series is significantly MORE bullish than the rest
  // (i.e., the dominant series is masking deterioration in the others)
  if (spread <= 30) return 0;

  // Linear penalty: 0 at spread=30, -5 at spread>=60
  const penalty = -Math.min(5, ((spread - 30) / 30) * 5);
  return Math.round(penalty * 10) / 10;
}

export function calculateLayerScore(results: SeriesResult[], layer: number): LayerScore {
  const layerSeries = results.filter((r) => r.layer === layer);
  const valid = layerSeries.filter((r) => !r.error && r.strength > 0);

  if (valid.length === 0) {
    return {
      layer,
      layerName: layerSeries[0]?.layerName ?? `Layer ${layer}`,
      score: 50,
      weight: LAYER_WEIGHTS[layer],
      seriesCount: layerSeries.length,
      validCount: 0,
      series: layerSeries,
    };
  }

  // Weighted average using optimized per-series weights
  const totalWeight = valid.reduce((sum, r) => sum + (SERIES_WEIGHTS[r.fredId] ?? 0.10), 0);
  const rawScore = valid.reduce((sum, r) => sum + r.adjustedScore * (SERIES_WEIGHTS[r.fredId] ?? 0.10), 0) / totalWeight;

  // Apply intra-layer divergence penalty
  const divPenalty = intraLayerDivergencePenalty(valid);
  const score = Math.max(0, Math.min(100, rawScore + divPenalty));

  return {
    layer,
    layerName: valid[0].layerName,
    score: Math.round(score * 10) / 10,
    weight: LAYER_WEIGHTS[layer],
    seriesCount: layerSeries.length,
    validCount: valid.length,
    series: layerSeries,
  };
}

export function calculateComposite(results: SeriesResult[], liquidityResult?: LiquidityResult): CompositeResult {
  const layers = [1, 2, 3, 4].map((l) => calculateLayerScore(results, l));

  // Layer 5 — Liquidity (from dedicated pipeline)
  if (liquidityResult) {
    const liquiditySeriesCount = liquidityResult.series.length;
    const liquidityValidCount = liquidityResult.series.filter(s => !s.error).length;
    layers.push({
      layer: 5,
      layerName: LAYER_NAMES[5],
      score: liquidityResult.compositeScore,
      weight: LAYER_WEIGHTS[5],
      seriesCount: liquiditySeriesCount,
      validCount: liquidityValidCount,
      series: [], // Liquidity uses its own series type; detail shown in dedicated card
    });
  }

  const rawScore = layers.reduce((sum, l) => sum + l.score * l.weight, 0);

  // Compute divergences first (needed for score penalties)
  const divergence = calculateDivergence(layers);
  const liquidityDivergence = calculateLiquidityDivergence(layers);

  // Cross-layer divergence penalties/bonuses on composite score
  // L1-L2 warning: -2 pts (late-cycle deterioration signal)
  const l1l2Penalty = divergence.signal === 'warning' ? -2 : 0;
  // L5-L1 downturn: -2 pts (liquidity leading downturn)
  // L5-L1 upturn: +2 pts (liquidity leading recovery)
  const l5l1Adjustment = liquidityDivergence.signal === 'liquidity-leading-downturn' ? -2
    : liquidityDivergence.signal === 'liquidity-leading-upturn' ? 2
    : 0;

  const totalAdjustment = l1l2Penalty + l5l1Adjustment;
  const masterScore = Math.max(0, Math.min(100, rawScore + totalAdjustment));
  const rounded = Math.round(masterScore * 10) / 10;

  return {
    masterScore: rounded,
    divergenceAdjustment: totalAdjustment,
    regime: classifyRegime(rounded, divergence, liquidityDivergence),
    divergence,
    liquidityDivergence,
    layers,
    totalSeries: results.length + (liquidityResult?.series.length ?? 0),
    validSeries: results.filter((r) => !r.error).length + (liquidityResult?.series.filter(s => !s.error).length ?? 0),
    errorSeries: results.filter((r) => r.error).length + (liquidityResult?.series.filter(s => s.error).length ?? 0),
    timestamp: new Date().toISOString(),
  };
}
