import type { CompositeResult } from '../services/composite';

interface Props {
  composite: CompositeResult;
}

export function CompositeGauge({ composite }: Props) {
  const { masterScore, regime } = composite;

  // SVG arc gauge (180 degrees) — visual range 30-70, clamped at edges
  const GAUGE_MIN = 30;
  const GAUGE_MAX = 70;
  const radius = 80;
  const cx = 100;
  const cy = 95;
  const circumference = Math.PI * radius;
  const clampedScore = Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, masterScore));
  const progress = ((clampedScore - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * circumference;

  return (
    <div className={`rounded-lg border border-line p-6 ${regime.bgColor}`}>
      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="200" height="110" viewBox="0 0 200 110">
            {/* Background arc */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="var(--gauge-track)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Colored segments — regime bands mapped to 30-70 visual range */}
            {[
              { start: 0, end: (38 - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN), color: '#ef4444' },
              { start: (38 - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN), end: (48 - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN), color: '#f97316' },
              { start: (48 - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN), end: (55 - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN), color: '#eab308' },
              { start: (55 - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN), end: (62 - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN), color: '#86efac' },
              { start: (62 - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN), end: 1.0, color: '#22c55e' },
            ].map(({ start, end, color }, i) => {
              const startAngle = Math.PI * (1 - start);
              const endAngle = Math.PI * (1 - end);
              const x1 = cx + radius * Math.cos(startAngle);
              const y1 = cy - radius * Math.sin(startAngle);
              const x2 = cx + radius * Math.cos(endAngle);
              const y2 = cy - radius * Math.sin(endAngle);
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="12"
                  strokeLinecap="butt"
                  opacity={0.25}
                />
              );
            })}
            {/* Needle */}
            {(() => {
              const angle = Math.PI * (1 - (clampedScore - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN));
              const needleLen = radius - 15;
              const nx = cx + needleLen * Math.cos(angle);
              const ny = cy - needleLen * Math.sin(angle);
              return (
                <>
                  <line
                    x1={cx} y1={cy} x2={nx} y2={ny}
                    stroke="var(--needle)" strokeWidth="2.5" strokeLinecap="round"
                  />
                  <circle cx={cx} cy={cy} r="4" fill="var(--needle)" />
                </>
              );
            })()}
            {/* Score text */}
            <text x={cx} y={cy - 20} textAnchor="middle" fill="var(--ink)" fontSize="28" fontWeight="bold" fontFamily="monospace">
              {masterScore.toFixed(1)}
            </text>
          </svg>
          {/* Scale labels */}
          <div className="flex justify-between px-2 -mt-1">
            <span className="text-xs text-ink4">{GAUGE_MIN}</span>
            <span className="text-xs text-ink4">{GAUGE_MAX}</span>
          </div>
        </div>

        {/* Regime info */}
        <div className="flex-1">
          <div className={`text-3xl font-bold ${regime.color}`}>
            {regime.label}
          </div>
          <p className="text-ink3 text-sm mt-1">{regime.implication}</p>
          <div className="flex gap-4 mt-3 text-xs text-ink4">
            <span>{composite.validSeries}/{composite.totalSeries} series active</span>
            {composite.divergenceAdjustment !== 0 && (
              <span className={composite.divergenceAdjustment < 0 ? 'text-c-red' : 'text-c-green'}>
                {composite.divergenceAdjustment > 0 ? '+' : ''}{composite.divergenceAdjustment}pt divergence adj.
              </span>
            )}
            {composite.errorSeries > 0 && (
              <span className="text-c-red">{composite.errorSeries} errors</span>
            )}
          </div>

          {/* Divergence signals */}
          <div className="space-y-1.5 mt-3">
            {composite.divergence.signal !== 'none' && (
              <div className={`text-xs px-2 py-1.5 rounded ${
                composite.divergence.signal === 'warning'
                  ? 'bg-red-500/10 text-c-red border border-red-500/20'
                  : 'bg-yellow-500/10 text-c-yellow border border-yellow-500/20'
              }`}>
                <span className="font-medium">
                  L1-L2 Divergence ({composite.divergence.spread > 0 ? '+' : ''}{composite.divergence.spread}):
                </span>{' '}
                {composite.divergence.description}
              </div>
            )}
            {composite.liquidityDivergence.signal !== 'none' && (
              <div className={`text-xs px-2 py-1.5 rounded ${
                composite.liquidityDivergence.signal === 'liquidity-leading-downturn'
                  ? 'bg-purple-500/10 text-c-purple border border-purple-500/20'
                  : 'bg-cyan-500/10 text-c-cyan border border-cyan-500/20'
              }`}>
                <span className="font-medium">
                  L5-L1 Liquidity ({composite.liquidityDivergence.l5l1Spread > 0 ? '+' : ''}{composite.liquidityDivergence.l5l1Spread}):
                </span>{' '}
                {composite.liquidityDivergence.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
