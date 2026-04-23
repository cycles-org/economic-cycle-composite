import { useState } from 'react';
import type { SeriesResult } from '../types';
import { SeriesInfoModal } from './SeriesInfoModal';
import { PhaseIcon } from './PhaseIcon';

interface Props {
  results: SeriesResult[];
}

type SortKey = 'fredId' | 'layer' | 'adjustedScore' | 'bartels' | 'dominantCycleLength' | 'strength' | 'phaseStatus';

function phaseColor(phase: string): string {
  if (phase.includes('Rising') || phase.includes('Bottom_Departure')) return 'text-c-green';
  if (phase.includes('Falling') || phase.includes('Top_Departure')) return 'text-c-red';
  if (phase.includes('Bottom')) return 'text-c-blue';
  if (phase.includes('Top')) return 'text-c-orange';
  if (phase === 'Error') return 'text-c-red';
  return 'text-ink3';
}

function scoreColor(value: number): string {
  if (value >= 70) return 'text-c-green';
  if (value >= 55) return 'text-c-green2';
  if (value >= 45) return 'text-c-yellow';
  if (value >= 30) return 'text-c-orange';
  return 'text-c-red';
}

export function SeriesGrid({ results }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('layer');
  const [sortAsc, setSortAsc] = useState(true);
  const [infoSeries, setInfoSeries] = useState<SeriesResult | null>(null);

  const sorted = [...results].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortAsc ? av - bv : bv - av;
    }
    return sortAsc
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'fredId' || key === 'layer'); }
  };

  const hdr = (label: string, key: SortKey, right = false) => (
    <th
      className={`px-3 py-2 font-medium cursor-pointer hover:text-ink transition-colors ${right ? 'text-right' : 'text-left'}`}
      onClick={() => toggleSort(key)}
    >
      {label} {sortKey === key ? (sortAsc ? '▲' : '▼') : ''}
    </th>
  );

  return (
    <div className="bg-card border border-line rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-line">
        <h3 className="text-ink font-medium">All Series — L1-L4 ({results.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-raised text-ink3">
              {hdr('Series', 'fredId')}
              {hdr('L', 'layer')}
              <th className="px-3 py-2 font-medium text-left">Freq</th>
              {hdr('Score', 'adjustedScore', true)}
              <th className="px-3 py-2 font-medium text-right">Phase</th>
              <th className="px-3 py-2 font-medium text-right">Raw</th>
              {hdr('Phase Status', 'phaseStatus')}
              {hdr('Cycle', 'dominantCycleLength', true)}
              {hdr('Bartels', 'bartels', true)}
              {hdr('Str', 'strength', true)}
              <th className="px-3 py-2 font-medium text-right">Stab</th>
              <th className="px-3 py-2 font-medium text-right">Bars</th>
              <th className="px-3 py-2 font-medium text-right">Last Date</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.symbolId}
                className={`border-t border-line ${r.error ? 'bg-red-500/5' : 'hover:bg-raised/30'}`}
              >
                <td className="px-3 py-2">
                  <span className="text-ink font-medium">{r.seriesName}</span>
                  {r.invert && <span className="text-ink5 ml-1">↕</span>}
                  <div className="text-ink5 text-[10px]">{r.fredId}</div>
                  {r.error && <div className="text-c-red text-[10px] truncate max-w-48">{r.error}</div>}
                </td>
                <td className="px-3 py-2 text-ink4">{r.layer}</td>
                <td className="px-3 py-2 text-ink4">{r.frequency[0].toUpperCase()}</td>
                <td className={`px-3 py-2 text-right font-mono font-medium ${scoreColor(r.adjustedScore)}`}>
                  {r.error ? '—' : r.adjustedScore.toFixed(1)}
                </td>
                <td className={`px-3 py-2 text-right font-mono ${scoreColor(r.phaseScore)}`}>
                  {r.error ? '—' : r.phaseScore.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-ink3">
                  {r.error ? '—' : r.rawPhaseScore.toFixed(0)}
                </td>
                <td className={`px-3 py-2 ${phaseColor(r.phaseStatus)}`}>
                  <div className="flex items-center gap-1.5">
                    <PhaseIcon phaseStatus={r.phaseStatus} avgPhaseScore={r.rawPhaseScore} size={14} />
                    <span>{r.phaseStatus}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-ink">
                  {r.dominantCycleLength || '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-ink">
                  {r.bartels ? r.bartels.toFixed(0) : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-ink3">
                  {r.strength ? r.strength.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-ink3">
                  {r.stabilityScore ? `${(r.stabilityScore * 100).toFixed(0)}%` : '—'}
                </td>
                <td className="px-3 py-2 text-right text-ink4">
                  {r.closesCount || '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-ink4 whitespace-nowrap">
                  {r.lastDataDate ? r.lastDataDate.substring(0, 10) : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => setInfoSeries(r)}
                    className="text-ink5 hover:text-c-blue transition-colors"
                    title="Series info"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7V7h2v5zM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {infoSeries && (
        <SeriesInfoModal
          fredId={infoSeries.fredId}
          seriesName={infoSeries.seriesName}
          score={infoSeries.error ? 50 : infoSeries.adjustedScore}
          phaseStatus={infoSeries.phaseStatus}
          invert={infoSeries.invert}
          layer={infoSeries.layer}
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
