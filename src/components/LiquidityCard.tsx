import { useState } from 'react';
import type { LayerScore } from '../services/composite';
import type { LiquidityResult, LiquiditySeriesResult } from '../types';
import { SeriesInfoModal } from './SeriesInfoModal';
import { LayerReasoningModal } from './LayerReasoningModal';
import { getLayerSummary } from '../config/layerSummaries';
import { PhaseIcon } from './PhaseIcon';

interface Props {
  layer?: LayerScore;
  liquidityResult: LiquidityResult;
  trend?: 'improving' | 'stable' | 'deteriorating';
  projectedScore?: number;
}

function scoreColor(score: number): string {
  if (score >= 65) return 'text-c-green';
  if (score >= 50) return 'text-c-green2';
  if (score >= 35) return 'text-c-yellow';
  if (score >= 20) return 'text-c-orange';
  return 'text-c-red';
}

function barColor(score: number): string {
  if (score >= 65) return 'bg-green-500';
  if (score >= 50) return 'bg-green-400';
  if (score >= 35) return 'bg-yellow-400';
  if (score >= 20) return 'bg-orange-400';
  return 'bg-red-500';
}

function trendArrow(trend?: 'improving' | 'stable' | 'deteriorating'): string {
  if (trend === 'improving') return '↗';
  if (trend === 'deteriorating') return '↘';
  return '→';
}

function trendColorFn(trend?: 'improving' | 'stable' | 'deteriorating'): string {
  if (trend === 'improving') return 'text-c-green';
  if (trend === 'deteriorating') return 'text-c-red';
  return 'text-ink4';
}

export function LiquidityCard({ layer, liquidityResult, trend, projectedScore }: Props) {
  const [infoSeries, setInfoSeries] = useState<LiquiditySeriesResult | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const score = layer?.score ?? liquidityResult.compositeScore;
  const summary = getLayerSummary(5, score);
  const weight = layer?.weight ?? 0.25;
  const validCount = liquidityResult.series.filter(s => !s.error).length;

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-ink font-medium text-sm">
            L5 — Liquidity
          </h3>
          <p className="text-ink4 text-xs">
            {validCount}/{liquidityResult.series.length} series · {(weight * 100).toFixed(0)}% weight
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold font-mono ${scoreColor(score)}`}>
            {score.toFixed(1)}
          </div>
          {trend && (
            <div className={`text-[10px] ${trendColorFn(trend)}`}>
              {trendArrow(trend)} {projectedScore !== undefined ? projectedScore.toFixed(1) : ''}
            </div>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 bg-raised rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(score)}`}
          style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
        />
      </div>

      {/* Regime label */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className={`text-xs font-medium ${scoreColor(score)}`}>
          {liquidityResult.regime}
        </span>
        {summary && (
          <button
            onClick={() => setShowReasoning(true)}
            className="text-ink5 hover:text-c-blue transition-colors flex-shrink-0"
            title="Why this reading?"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
          </button>
        )}
      </div>
      {showReasoning && summary && (
        <LayerReasoningModal
          layerName="L5 — Liquidity"
          label={summary.label}
          score={score}
          reasoning={summary.reasoning}
          onClose={() => setShowReasoning(false)}
        />
      )}

      {/* Series detail */}
      <div className="space-y-1 border-t border-line pt-2">
        {liquidityResult.series.map((s) => (
          <div key={s.seriesId} className="flex items-center justify-between text-xs">
            <div className={`${s.error ? 'text-c-red' : 'text-ink2'} truncate mr-2`}>
              <span className="block leading-tight">{s.name}</span>
              <span className="text-ink5 text-[10px]">
                {s.seriesId}
                {!s.error && ` · CRSI ${s.crsi.toFixed(0)} [${(s.crsiDirection ?? 0) < 0 ? '\u2193' : (s.crsiDirection ?? 0) > ((s.crsiUB ?? 70) - (s.crsiLB ?? 30)) * 0.05 ? '\u2191' : '\u2192'}]`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!s.error && (
                <PhaseIcon phaseStatus={s.phaseStatus} avgPhaseScore={s.avgPhaseScore} size={16} />
              )}
              {s.error ? (
                <span className="text-c-red text-[10px]">{s.error}</span>
              ) : (
                <span className={`font-mono ${scoreColor(s.combinedScore)}`}>
                  {s.combinedScore.toFixed(0)}
                </span>
              )}
              <button
                onClick={() => setInfoSeries(s)}
                className="text-ink5 hover:text-c-blue transition-colors"
                title="Series info"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {infoSeries && (
        <SeriesInfoModal
          fredId={infoSeries.seriesId}
          seriesName={infoSeries.name}
          score={infoSeries.error ? 50 : infoSeries.combinedScore}
          phaseStatus={infoSeries.phaseStatus}
          invert={false}
          layer={5}
          cycleInfo={!infoSeries.error ? {
            cycleLength: infoSeries.cycleLength,
            frequency: 'weekly',
            avgPhaseScore: infoSeries.avgPhaseScore,
            bartels: infoSeries.bartels,
            stability: infoSeries.stability,
            crsi: infoSeries.crsi,
            crsiDirection: infoSeries.crsiDirection,
            crsiUB: infoSeries.crsiUB,
            crsiLB: infoSeries.crsiLB,
          } : undefined}
          onClose={() => setInfoSeries(null)}
        />
      )}
    </div>
  );
}
