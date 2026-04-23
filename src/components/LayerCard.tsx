import { useState } from 'react';
import type { LayerScore } from '../services/composite';
import { SeriesInfoModal } from './SeriesInfoModal';
import type { CycleInfo } from './SeriesInfoModal';
import { LayerReasoningModal } from './LayerReasoningModal';
import { LAYER_WEIGHTS } from '../config/seriesRegistry';
import { getLayerSummary } from '../config/layerSummaries';
import { PhaseIcon } from './PhaseIcon';

interface Props {
  layer: LayerScore;
  trend?: 'improving' | 'stable' | 'deteriorating';
  projectedScore?: number;  // score at +12w
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-c-green';
  if (score >= 55) return 'text-c-green2';
  if (score >= 45) return 'text-c-yellow';
  if (score >= 30) return 'text-c-orange';
  return 'text-c-red';
}

function barWidth(score: number): string {
  return `${Math.max(2, Math.min(100, score))}%`;
}

function barColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 55) return 'bg-green-400';
  if (score >= 45) return 'bg-yellow-400';
  if (score >= 30) return 'bg-orange-400';
  return 'bg-red-500';
}

function trendArrow(trend?: 'improving' | 'stable' | 'deteriorating'): string {
  if (trend === 'improving') return '↗';
  if (trend === 'deteriorating') return '↘';
  return '→';
}

function trendColor(trend?: 'improving' | 'stable' | 'deteriorating'): string {
  if (trend === 'improving') return 'text-c-green';
  if (trend === 'deteriorating') return 'text-c-red';
  return 'text-ink4';
}

export function LayerCard({ layer, trend, projectedScore }: Props) {
  const [infoSeries, setInfoSeries] = useState<typeof layer.series[number] | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const summary = getLayerSummary(layer.layer, layer.score, layer.series);
  const layerFullName = `L${layer.layer} — ${layer.layerName}`;

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-ink font-medium text-sm">
            L{layer.layer} — {layer.layerName}
          </h3>
          <p className="text-ink4 text-xs">
            {layer.validCount}/{layer.seriesCount} series · {(layer.weight * 100).toFixed(0)}% weight
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold font-mono ${scoreColor(layer.score)}`}>
            {layer.score.toFixed(1)}
          </div>
          {trend && (
            <div className={`text-[10px] ${trendColor(trend)}`}>
              {trendArrow(trend)} {projectedScore !== undefined ? projectedScore.toFixed(1) : ''}
            </div>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 bg-raised rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(layer.score)}`}
          style={{ width: barWidth(layer.score) }}
        />
      </div>

      {/* Layer summary */}
      {summary && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className={`text-xs font-medium ${scoreColor(layer.score)}`}>
            {summary.label}
          </span>
          <button
            onClick={() => setShowReasoning(true)}
            className="text-ink5 hover:text-c-blue transition-colors flex-shrink-0"
            title="Why this reading?"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
          </button>
        </div>
      )}
      {showReasoning && summary && (
        <LayerReasoningModal
          layerName={layerFullName}
          label={summary.label}
          score={layer.score}
          reasoning={summary.reasoning}
          scoreAttribution={summary.scoreAttribution}
          onClose={() => setShowReasoning(false)}
        />
      )}

      {/* Mini series list */}
      <div className="space-y-1">
        {layer.series.map((s) => (
          <div key={s.symbolId} className="flex items-center justify-between text-xs">
            <div className={`${s.error ? 'text-c-red' : 'text-ink2'} truncate mr-2`}>
              <span className="block leading-tight">{s.seriesName}</span>
              <span className="text-ink5 text-[10px]">{s.fredId}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!s.error && (
                <PhaseIcon phaseStatus={s.phaseStatus} avgPhaseScore={s.rawPhaseScore} size={16} />
              )}
              {s.error ? (
                <span className="text-c-red">err</span>
              ) : (
                <span className={`font-mono ${scoreColor(s.adjustedScore)}`}>
                  {s.adjustedScore.toFixed(0)}
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
          fredId={infoSeries.fredId}
          seriesName={infoSeries.seriesName}
          score={infoSeries.error ? 50 : infoSeries.adjustedScore}
          phaseStatus={infoSeries.phaseStatus}
          invert={infoSeries.invert}
          layer={layer.layer}
          cycleInfo={!infoSeries.error ? {
            cycleLength: infoSeries.dominantCycleLength,
            frequency: infoSeries.frequency,
            avgPhaseScore: infoSeries.rawPhaseScore,
            bartels: infoSeries.bartels,
            stability: infoSeries.stabilityScore,
            minBarNum: infoSeries.minBarNum,
            closesCount: infoSeries.closesCount,
          } : undefined}
          onClose={() => setInfoSeries(null)}
        />
      )}
    </div>
  );
}
