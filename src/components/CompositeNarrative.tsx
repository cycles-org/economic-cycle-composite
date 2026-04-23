import type { CompositeResult } from '../services/composite';
import type { SeriesResult, LiquidityResult } from '../types';
import { buildNarrative } from '../services/narrative';

interface Props {
  composite: CompositeResult;
  results: SeriesResult[];
  liquidityResult?: LiquidityResult;
}

export function CompositeNarrative({ composite, results, liquidityResult }: Props) {
  if (composite.validSeries === 0) return null;

  const { headline, body, signals } = buildNarrative(composite, results, liquidityResult);

  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <h3 className="text-sm font-semibold text-ink3 uppercase tracking-wide mb-3">
        Macro Rationale
      </h3>
      <p className="text-ink font-medium leading-relaxed mb-3">
        {headline}
      </p>
      <p className="text-ink2 text-sm leading-relaxed">
        {body}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {signals.map((s, i) => (
          <span
            key={i}
            className="inline-block text-[11px] text-ink4 bg-raised rounded px-2 py-0.5"
          >
            {s.split(',')[0]}
          </span>
        ))}
      </div>
    </div>
  );
}
