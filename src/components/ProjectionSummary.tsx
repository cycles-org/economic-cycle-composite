import type { ProjectionResult } from '../services/projection';

interface Props {
  projection: ProjectionResult;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-c-green';
  if (score >= 55) return 'text-c-green2';
  if (score >= 45) return 'text-c-yellow';
  if (score >= 30) return 'text-c-orange';
  return 'text-c-red';
}

function regimeColor(regime: string): string {
  if (regime === 'Risk-On') return 'text-c-green';
  if (regime === 'Neutral-Bullish') return 'text-c-green2';
  if (regime === 'Neutral') return 'text-c-yellow';
  if (regime === 'Neutral-Bearish') return 'text-c-orange';
  return 'text-c-red';
}

function regimeBgColor(regime: string): string {
  if (regime === 'Risk-On') return 'bg-green-500/15';
  if (regime === 'Neutral-Bullish') return 'bg-green-500/10';
  if (regime === 'Neutral') return 'bg-yellow-500/10';
  if (regime === 'Neutral-Bearish') return 'bg-orange-500/10';
  return 'bg-red-500/10';
}

function trendArrow(trend: 'improving' | 'stable' | 'deteriorating'): string {
  if (trend === 'improving') return '↗';
  if (trend === 'deteriorating') return '↘';
  return '→';
}

function trendColor(trend: 'improving' | 'stable' | 'deteriorating'): string {
  if (trend === 'improving') return 'text-c-green';
  if (trend === 'deteriorating') return 'text-c-red';
  return 'text-ink3';
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return 'High';
  if (confidence >= 0.4) return 'Moderate';
  return 'Low';
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.7) return 'text-c-green';
  if (confidence >= 0.4) return 'text-c-yellow';
  return 'text-ink4';
}

export function ProjectionSummary({ projection }: Props) {
  const { horizonWeeks, layers, projectedCompositeScores, projectedRegimes, regimeChanges, overallTrend, confidence } = projection;

  return (
    <div className="bg-card border border-line rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-ink font-medium text-sm">Cycle Projection</h3>
          <p className="text-ink4 text-xs mt-0.5">
            Based on dominant cycle phase progression · Confidence: <span className={confidenceColor(confidence)}>{confidenceLabel(confidence)} ({(confidence * 100).toFixed(0)}%)</span>
          </p>
        </div>
        <div className={`text-lg font-bold ${trendColor(overallTrend)}`}>
          {trendArrow(overallTrend)} {overallTrend.charAt(0).toUpperCase() + overallTrend.slice(1)}
        </div>
      </div>

      {/* Regime change alerts */}
      {regimeChanges.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {regimeChanges.map((rc, i) => (
            <div
              key={i}
              className={`text-xs px-3 py-2 rounded border ${
                rc.toRegime === 'Risk-Off' || rc.toRegime === 'Neutral-Bearish'
                  ? 'bg-red-500/10 text-c-red border-red-500/20'
                  : rc.toRegime === 'Risk-On' || rc.toRegime === 'Neutral-Bullish'
                  ? 'bg-green-500/10 text-c-green border-green-500/20'
                  : 'bg-yellow-500/10 text-c-yellow border-yellow-500/20'
              }`}
            >
              <span className="font-medium">Regime shift projected ~{rc.atWeek} weeks:</span>{' '}
              <span className={regimeColor(rc.fromRegime)}>{rc.fromRegime}</span>
              {' → '}
              <span className={regimeColor(rc.toRegime)}>{rc.toRegime}</span>
              {' '}(score {rc.projectedScore.toFixed(1)})
            </div>
          ))}
        </div>
      )}

      {/* Composite timeline */}
      <div className="mb-4">
        <div className="flex items-center gap-1 text-xs text-ink4 mb-2">
          <span className="w-16">Now</span>
          {horizonWeeks.map((w) => (
            <span key={w} className="flex-1 text-center">+{w}w</span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-16 text-center text-sm font-bold font-mono ${scoreColor(projectedCompositeScores[0] ?? 50)}`}>
            {/* Show current score from first layer's parent */}
            {layers.length > 0 ? (
              <span className={scoreColor(layers.reduce((s, l) => s + l.currentScore * 0.01, 0) * 100)}>
                {/* Just use projected[0] context */}
              </span>
            ) : null}
          </div>
          {projectedCompositeScores.map((score, i) => (
            <div
              key={i}
              className={`flex-1 text-center py-1.5 rounded text-xs font-mono font-medium ${regimeBgColor(projectedRegimes[i])} ${regimeColor(projectedRegimes[i])}`}
            >
              {score.toFixed(1)}
              <div className="text-[10px] font-normal opacity-75">{projectedRegimes[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-layer breakdown */}
      <div className="border-t border-line pt-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-ink4">
              <th className="text-left font-medium pb-1.5">Layer</th>
              <th className="text-right font-medium pb-1.5">Now</th>
              {horizonWeeks.map((w) => (
                <th key={w} className="text-right font-medium pb-1.5">+{w}w</th>
              ))}
              <th className="text-center font-medium pb-1.5 w-8">Trend</th>
              <th className="text-right font-medium pb-1.5">Conf</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((lp) => (
              <tr key={lp.layer} className="border-t border-line">
                <td className="py-1.5 text-ink2">
                  L{lp.layer} {lp.layerName}
                </td>
                <td className={`py-1.5 text-right font-mono ${scoreColor(lp.currentScore)}`}>
                  {lp.currentScore.toFixed(1)}
                </td>
                {lp.projectedScores.map((score, i) => {
                  const delta = score - lp.currentScore;
                  return (
                    <td key={i} className={`py-1.5 text-right font-mono ${scoreColor(score)}`}>
                      {score.toFixed(1)}
                      {Math.abs(delta) >= 1 && (
                        <span className={`text-[10px] ml-0.5 ${delta > 0 ? 'text-c-green' : 'text-c-red'}`}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(0)}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className={`py-1.5 text-center text-sm ${trendColor(lp.trend)}`}>
                  {trendArrow(lp.trend)}
                </td>
                <td className={`py-1.5 text-right ${confidenceColor(lp.confidence)}`}>
                  {(lp.confidence * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
