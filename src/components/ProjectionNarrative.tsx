import type { ProjectionResult } from '../services/projection';
import { buildProjectionNarrative } from '../services/projectionNarrative';

interface Props {
  projection: ProjectionResult;
}

export function ProjectionNarrative({ projection }: Props) {
  const { headline, body, keyDrivers } = buildProjectionNarrative(projection);

  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <h3 className="text-sm font-semibold text-ink3 uppercase tracking-wide mb-3">
        Macro Projection Rationale
      </h3>
      <p className="text-ink font-medium leading-relaxed mb-3">
        {headline}
      </p>
      <div className="text-ink2 text-sm leading-relaxed space-y-3">
        {body.split('\n').map((line, i) => {
          if (!line.trim()) return null;
          if (line.startsWith('**') && line.endsWith('**')) {
            return (
              <p key={i} className="text-ink3 font-medium text-xs uppercase tracking-wide mt-4 first:mt-0">
                {line.replace(/\*\*/g, '')}
              </p>
            );
          }
          if (line.startsWith('**') && line.includes(':**')) {
            return (
              <p key={i} className="text-ink3 font-medium text-xs uppercase tracking-wide mt-4 first:mt-0">
                {line.replace(/\*\*/g, '')}
              </p>
            );
          }
          if (line.startsWith('• **')) {
            const match = line.match(/^• \*\*(.+?)\*\*(.+)$/);
            if (match) {
              return (
                <p key={i} className="pl-3 border-l-2 border-line2">
                  <span className="text-ink font-medium">{match[1]}</span>
                  <span className="text-ink3">{match[2]}</span>
                </p>
              );
            }
          }
          if (line.startsWith('• ')) {
            return (
              <p key={i} className="pl-3 border-l-2 border-line2 text-ink3">
                {line.slice(2)}
              </p>
            );
          }
          if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
            return (
              <p key={i} className="text-ink4 text-xs italic mt-2">
                {line.replace(/^\*|\*$/g, '')}
              </p>
            );
          }
          if (line.startsWith('*L') && line.includes('*:')) {
            const match = line.match(/^\*(L\d+ .+?)\* \((.+?)\): (.+)$/);
            if (match) {
              return (
                <p key={i}>
                  <span className="text-ink font-medium">{match[1]}</span>
                  <span className="text-ink4 text-xs ml-1">({match[2]})</span>
                  <span className="text-ink3"> — {match[3]}</span>
                </p>
              );
            }
          }
          return <p key={i}>{line}</p>;
        })}
      </div>
      {keyDrivers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {keyDrivers.map((d, i) => {
            const name = d.split(':')[0];
            return (
              <span
                key={i}
                className="inline-block text-[11px] text-ink4 bg-raised rounded px-2 py-0.5"
              >
                {name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
