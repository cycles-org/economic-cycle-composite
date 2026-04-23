import { useState } from 'react';
import type { RecessionIndicatorResult, RecessionRisk } from '../services/recessionIndicator';

interface Props {
  indicator: RecessionIndicatorResult;
}

function riskColor(risk: RecessionRisk): string {
  switch (risk) {
    case 'low': return 'text-c-green';
    case 'elevated': return 'text-c-yellow';
    case 'high': return 'text-c-orange';
    case 'very-high': return 'text-c-red';
  }
}

function riskBg(risk: RecessionRisk): string {
  switch (risk) {
    case 'low': return 'bg-green-500/10 border-green-500/20';
    case 'elevated': return 'bg-yellow-500/10 border-yellow-500/20';
    case 'high': return 'bg-orange-500/10 border-orange-500/20';
    case 'very-high': return 'bg-red-500/10 border-red-500/20';
  }
}

function riskIcon(risk: RecessionRisk): string {
  switch (risk) {
    case 'low': return '🟢';
    case 'elevated': return '🟡';
    case 'high': return '🟠';
    case 'very-high': return '🔴';
  }
}

function signalDot(signal: 'positive' | 'neutral' | 'negative'): string {
  switch (signal) {
    case 'positive': return 'bg-green-500';
    case 'neutral': return 'bg-yellow-500';
    case 'negative': return 'bg-red-500';
  }
}

function signalText(signal: 'positive' | 'neutral' | 'negative'): string {
  switch (signal) {
    case 'positive': return 'text-c-green';
    case 'neutral': return 'text-c-yellow';
    case 'negative': return 'text-c-red';
  }
}

export function RecessionIndicator({ indicator }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { risk, probability, headline, factors, historicalContext } = indicator;

  return (
    <div className={`rounded-lg border p-4 ${riskBg(risk)}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{riskIcon(risk)}</span>
            <h3 className="text-ink font-semibold text-sm">Recession Probability</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${riskBg(risk)} ${riskColor(risk)}`}>
              {probability}
            </span>
          </div>
          <p className={`text-sm mt-1 ${riskColor(risk)}`}>{headline}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-ink4 hover:text-ink transition-colors text-xs ml-4 flex-shrink-0 mt-1"
        >
          {expanded ? '▲ Less' : '▼ Details'}
        </button>
      </div>

      {/* Factor summary bar */}
      <div className="flex gap-1 mt-3">
        {factors.map((f, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full flex-1 ${
              f.signal === 'negative' ? 'bg-red-500' :
              f.signal === 'neutral' ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            title={`${f.label}: ${f.signal}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-ink5">Composite</span>
        <span className="text-[10px] text-ink5">Projection</span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Individual factors */}
          <div className="space-y-2">
            <h4 className="text-ink text-xs font-medium">Contributing Factors</h4>
            {factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${signalDot(f.signal)}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${signalText(f.signal)}`}>{f.label}</span>
                    <span className="text-[10px] text-ink5">({f.weight} pts)</span>
                  </div>
                  <p className="text-xs text-ink3 leading-relaxed mt-0.5">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Historical context */}
          <div className="border-t border-line pt-3">
            <h4 className="text-ink text-xs font-medium mb-1.5">Historical Context</h4>
            <p className="text-xs text-ink3 leading-relaxed">{historicalContext}</p>
          </div>

          {/* Methodology note */}
          <div className="border-t border-line pt-3">
            <p className="text-[10px] text-ink5 leading-relaxed">
              Recession probability is estimated from 5 weighted conditions: composite level (0-30pts), L1 leading indicator health (0-25pts),
              leading-coincident divergence (0-20pts), multi-layer breadth (0-15pts), and projection persistence (0-10pts).
              Backtested against 3 NBER recessions (2001, 2007, 2020) and 28 years of non-recession data.
              The composite regime score (Neutral-Bearish, Risk-Off) measures economic headwinds broadly —
              the recession indicator adds cross-layer confirmation to distinguish recession risk from cyclical slowdowns.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
