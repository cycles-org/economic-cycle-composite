import { CompositeGauge } from './CompositeGauge';
import { CompositeNarrative } from './CompositeNarrative';
import { calculateComposite } from '../services/composite';
import { SERIES_REGISTRY } from '../config/seriesRegistry';
import type { SeriesResult } from '../types';
import type { CompositeResult } from '../services/composite';

// Cached backtest scores (from backtest_scores.json)
import backtestScores from '../../backtest_scores.json';

interface EventScores {
  label: string;
  date: string;
  type: 'TOP' | 'LOW';
  scores: Record<string, number | null>;
}

function buildMockResults(scores: Record<string, number | null>): SeriesResult[] {
  return SERIES_REGISTRY.map((s) => {
    const adjScore = scores[s.fredId];
    if (adjScore === null || adjScore === undefined) {
      return {
        symbolId: s.tickerId,
        fredId: s.fredId,
        layer: s.layer,
        layerName: s.layerName,
        frequency: s.frequency,
        invert: s.invert,
        seriesName: s.seriesName,
        rawPhaseScore: 0,
        phaseScore: 50,
        adjustedScore: 50,
        dominantCycleLength: 0,
        amplitude: 0,
        bartels: 0,
        strength: 0,
        normalizedStrength: 0,
        stabilityScore: 0,
        phaseStatus: 'N/A',
        dominantRank: 0,
        minBarNum: 0,
        closesCount: 0,
        lastCloseValue: 0,
        lastDataDate: '',
        updatedAt: '',
        error: 'No data for this date',
      };
    }
    // Reconstruct approximate raw values from adjusted score
    const phaseScore = s.invert ? 100 - adjScore : adjScore;
    const rawPhase = phaseScore * 2 - 100;
    return {
      symbolId: s.tickerId,
      fredId: s.fredId,
      layer: s.layer,
      layerName: s.layerName,
      frequency: s.frequency,
      invert: s.invert,
      seriesName: s.seriesName,
      rawPhaseScore: rawPhase,
      phaseScore,
      adjustedScore: adjScore,
      dominantCycleLength: 100,
      amplitude: 1,
      bartels: 50,
      strength: 1,
      normalizedStrength: 1,
      stabilityScore: 0.5,
      phaseStatus: adjScore >= 65 ? 'Rising' : adjScore <= 35 ? 'Falling' : 'Transitioning',
      dominantRank: 1,
      minBarNum: 0,
      closesCount: 500,
      lastCloseValue: 0,
      updatedAt: '',
    };
  });
}

interface EventPanel {
  event: EventScores;
  results: SeriesResult[];
  composite: CompositeResult;
}

export function BacktestReview() {
  const events = backtestScores as EventScores[];

  const panels: EventPanel[] = events.map((event) => {
    const results = buildMockResults(event.scores);
    const composite = calculateComposite(results);
    return { event, results, composite };
  });

  // Dynamic threshold: midpoint between average TOP and average LOW scores
  const topScores = panels.filter(p => p.event.type === 'TOP').map(p => p.composite.masterScore);
  const lowScores = panels.filter(p => p.event.type === 'LOW').map(p => p.composite.masterScore);
  const avgTop = topScores.reduce((a, b) => a + b, 0) / topScores.length;
  const avgLow = lowScores.reduce((a, b) => a + b, 0) / lowScores.length;
  const threshold = Math.round(((avgTop + avgLow) / 2) * 10) / 10;

  const matches = panels.filter((p) => {
    const { type } = p.event;
    const score = p.composite.masterScore;
    return (type === 'TOP' && score >= threshold) || (type === 'LOW' && score < threshold);
  }).length;

  return (
    <div className="min-h-screen bg-pg p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink">
            Backtest Review: 8 Major Market Events
          </h1>
          <p className="text-ink3 text-sm mt-2">
            Composite scores at historical stock market tops and bottoms (2000-2022)
          </p>
          <div className="mt-3 inline-block bg-raised rounded-lg px-4 py-2">
            <span className="text-ink3 text-sm">Classification: </span>
            <span className={`font-bold text-lg ${matches === 8 ? 'text-c-green' : 'text-c-yellow'}`}>
              {matches}/8
            </span>
            <span className="text-ink4 text-sm ml-1">
              (TOPs should score {'>'}{threshold}, LOWs should score {'<'}{threshold})
            </span>
          </div>
        </div>

        {/* Event panels */}
        {panels.map((p, i) => {
          const isTop = p.event.type === 'TOP';
          const score = p.composite.masterScore;
          const correct = isTop ? score >= threshold : score < threshold;

          return (
            <div
              key={i}
              className={`rounded-xl border-2 ${
                correct
                  ? 'border-green-500/30'
                  : 'border-red-500/30'
              } overflow-hidden`}
            >
              {/* Event header */}
              <div className={`px-5 py-3 flex items-center justify-between ${
                isTop ? 'bg-red-500/10' : 'bg-green-500/10'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    isTop ? 'bg-red-500/20 text-c-red' : 'bg-green-500/20 text-c-green'
                  }`}>
                    {p.event.type}
                  </span>
                  <span className="text-ink font-semibold">{p.event.label}</span>
                  <span className="text-ink4 text-sm">{p.event.date}</span>
                </div>
                <span className={`text-sm font-bold ${correct ? 'text-c-green' : 'text-c-red'}`}>
                  {correct ? 'CORRECT' : 'MISS'}
                </span>
              </div>

              {/* Gauge + Narrative */}
              <div className="p-4 space-y-4 bg-card">
                <CompositeGauge composite={p.composite} />
                <CompositeNarrative composite={p.composite} results={p.results} />

                {/* Layer scores mini bar */}
                <div className="flex gap-3 text-xs">
                  {p.composite.layers.map((l) => (
                    <div key={l.layer} className="flex-1 bg-raised rounded p-2">
                      <div className="text-ink4 mb-1">L{l.layer} {l.layerName}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-hover rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              l.score >= 55 ? 'bg-green-500' : l.score >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${l.score}%` }}
                          />
                        </div>
                        <span className="text-ink3 font-mono w-8 text-right">{l.score.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
