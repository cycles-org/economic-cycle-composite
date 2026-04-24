import { useTheme } from '../contexts/ThemeContext';
import { CompositeGauge } from './CompositeGauge';
import { CompositeNarrative } from './CompositeNarrative';
import { LayerCard } from './LayerCard';
import { LiquidityCard } from './LiquidityCard';
import { ProjectionNarrative } from './ProjectionNarrative';
import { ProjectionSummary } from './ProjectionSummary';
import { RecessionIndicator } from './RecessionIndicator';
import { SeriesGrid } from './SeriesGrid';
import type { CompositeResult } from '../services/composite';
import type { ProjectionResult } from '../services/projection';
import type { RecessionIndicatorResult } from '../services/recessionIndicator';
import type { SeriesResult, LiquidityResult } from '../types';

interface Props {
  composite: CompositeResult;
  recessionIndicator?: RecessionIndicatorResult;
  results: SeriesResult[];
  liquidityResult?: LiquidityResult;
  projection?: ProjectionResult;
  logs: string[];
  loading: boolean;
  progress: { done: number; total: number };
  onRunAll: () => void;
  onBack: () => void;
}

export function Dashboard({ composite, recessionIndicator, results, liquidityResult, projection, logs, loading, progress, onRunAll, onBack }: Props) {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-pg p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">
              US Economic Cycle Regime
            </h1>
            <p className="text-ink4 text-xs mt-0.5">
              {composite.timestamp
                ? `Updated: ${new Date(composite.timestamp).toLocaleString()}`
                : 'Not yet computed'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="bg-raised hover:bg-hover text-ink2 rounded px-3 py-1.5 text-sm transition-colors"
            >
              Change Key
            </button>
            <button
              onClick={onRunAll}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-hover disabled:text-ink4 text-white rounded px-4 py-1.5 text-sm font-medium transition-colors"
            >
              {loading ? `Running ${progress.done}/${progress.total}...` : 'Run All Series'}
            </button>
            <button
              onClick={toggle}
              className="bg-raised hover:bg-hover text-ink3 rounded px-3 py-1.5 text-sm transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {loading && (
          <div className="h-1 bg-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 rounded-full"
              style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
            />
          </div>
        )}

        {/* Master Composite Gauge */}
        {composite.validSeries > 0 && <CompositeGauge composite={composite} />}

        {/* Recession Probability Indicator */}
        {composite.validSeries > 0 && recessionIndicator && (
          <RecessionIndicator indicator={recessionIndicator} />
        )}

        {/* Written Rationale */}
        {composite.validSeries > 0 && (
          <CompositeNarrative composite={composite} results={results} liquidityResult={liquidityResult} />
        )}

        {/* Layer Cards */}
        {composite.layers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {composite.layers.filter(l => l.layer !== 5).map((layer) => {
              const lp = projection?.layers.find(p => p.layer === layer.layer);
              return (
                <LayerCard
                  key={layer.layer}
                  layer={layer}
                  trend={lp?.trend}
                  projectedScore={lp?.projectedScores[lp.projectedScores.length - 1]}
                />
              );
            })}
            {liquidityResult && (() => {
              const lp = projection?.layers.find(p => p.layer === 5);
              return (
                <LiquidityCard
                  layer={composite.layers.find(l => l.layer === 5)}
                  liquidityResult={liquidityResult}
                  trend={lp?.trend}
                  projectedScore={lp?.projectedScores[lp.projectedScores.length - 1]}
                />
              );
            })()}
          </div>
        )}

        {/* Cycle Projection */}
        {projection && composite.validSeries > 0 && (
          <ProjectionSummary projection={projection} />
        )}

        {/* Projection Narrative */}
        {projection && composite.validSeries > 0 && (
          <ProjectionNarrative projection={projection} />
        )}

        {/* Full Series Grid */}
        {results.length > 0 && <SeriesGrid results={results} liquidityResult={liquidityResult} />}

        {/* Log Panel */}
        <details className="bg-card border border-line rounded-lg">
          <summary className="px-4 py-3 text-ink3 text-sm font-medium cursor-pointer hover:text-ink2">
            Pipeline Log ({logs.length} entries)
          </summary>
          <div className="px-4 pb-4 font-mono text-[11px] text-ink4 max-h-64 overflow-y-auto space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className={log.includes('ERROR') ? 'text-c-red' : ''}>
                {log}
              </div>
            ))}
            {loading && (
              <div className="text-c-blue animate-pulse">Processing...</div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
