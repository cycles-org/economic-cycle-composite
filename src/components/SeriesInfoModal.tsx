import { useEffect, useRef } from 'react';
import { SERIES_DESCRIPTIONS, generateCurrentInterpretation } from '../config/seriesDescriptions';
import { LAYER_WEIGHTS, LAYER_NAMES } from '../config/seriesRegistry';
import { PhaseIconLarge } from './PhaseIcon';

export interface CycleInfo {
  cycleLength: number;
  frequency: string;        // 'daily' | 'weekly' | 'monthly'
  avgPhaseScore: number;    // rawPhaseScore: -100 to +100
  bartels: number;
  stability: number;
  minBarNum?: number;       // bar index of last trough (from CycleScanner)
  closesCount?: number;     // total bars in dataset
  crsi?: number;
  crsiDirection?: number;
  crsiUB?: number;
  crsiLB?: number;
}

interface Props {
  fredId: string;
  seriesName: string;
  score: number;
  phaseStatus: string;
  invert: boolean;
  layer: number;
  cycleInfo?: CycleInfo;
  onClose: () => void;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-c-green';
  if (score >= 55) return 'text-c-green2';
  if (score >= 45) return 'text-c-yellow';
  if (score >= 30) return 'text-c-orange';
  return 'text-c-red';
}

function scoreBadge(score: number): string {
  if (score >= 60) return 'Bullish';
  if (score >= 45) return 'Neutral';
  return 'Bearish';
}

function scoreBadgeColor(score: number): string {
  if (score >= 60) return 'bg-green-500/20 text-c-green border-green-500/30';
  if (score >= 45) return 'bg-yellow-500/20 text-c-yellow border-yellow-500/30';
  return 'bg-red-500/20 text-c-red border-red-500/30';
}

export function SeriesInfoModal({ fredId, seriesName, score, phaseStatus, invert, layer, cycleInfo, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const desc = SERIES_DESCRIPTIONS[fredId];
  const layerWeight = LAYER_WEIGHTS[layer] ?? 0;
  const layerName = LAYER_NAMES[layer] ?? `Layer ${layer}`;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!desc) return null;

  const currentInterpretation = generateCurrentInterpretation(
    fredId, score, phaseStatus, invert, layer, layerWeight,
  );

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-overlay-bg backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-card border border-line2 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-line px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-ink font-semibold text-lg leading-tight">{seriesName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-ink4 text-xs font-mono">{fredId}</span>
              <span className="text-ink5">·</span>
              <span className="text-ink4 text-xs">L{layer} {layerName}</span>
              <span className="text-ink5">·</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border ${scoreBadgeColor(score)}`}>
                {scoreBadge(score)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold font-mono ${scoreColor(score)}`}>
              {score.toFixed(1)}
            </span>
            <button
              onClick={onClose}
              className="text-ink4 hover:text-ink transition-colors text-xl leading-none ml-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Cycle Phase Visualization */}
          {cycleInfo && cycleInfo.cycleLength > 0 && (
            <section>
              <PhaseIconLarge
                phaseStatus={phaseStatus}
                avgPhaseScore={cycleInfo.avgPhaseScore}
              />
              {/* Cycle stats row */}
              <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-ink4 font-mono">
                <span>C{cycleInfo.cycleLength}{cycleInfo.frequency === 'daily' ? 'd' : cycleInfo.frequency === 'weekly' ? 'w' : 'mo'}</span>
                {cycleInfo.bartels !== undefined && <span>Bartels {cycleInfo.bartels.toFixed(0)}</span>}
                {cycleInfo.stability !== undefined && <span>Stab {(cycleInfo.stability * 100).toFixed(0)}%</span>}
              </div>
              {/* CRSI stats row */}
              {cycleInfo.crsi !== undefined && (
                <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-ink4 font-mono">
                  <span>CRSI: {cycleInfo.crsi.toFixed(1)}</span>
                  {cycleInfo.crsiUB !== undefined && cycleInfo.crsiLB !== undefined && (
                    <span>Bands: {cycleInfo.crsiLB.toFixed(0)} – {cycleInfo.crsiUB.toFixed(0)}</span>
                  )}
                  {cycleInfo.crsiDirection !== undefined && (
                    <span>Direction: {cycleInfo.crsiDirection > 0 ? 'Rising' : cycleInfo.crsiDirection < 0 ? 'Falling' : 'Flat'} ({cycleInfo.crsiDirection.toFixed(1)})</span>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Current Status */}
          <section>
            <h3 className="text-ink text-sm font-medium mb-1.5">Current Status</h3>
            <p className="text-ink2 text-sm leading-relaxed">{currentInterpretation}</p>
          </section>

          {/* What it measures */}
          <section>
            <h3 className="text-ink text-sm font-medium mb-1.5">What It Measures</h3>
            <p className="text-ink3 text-sm leading-relaxed">{desc.what}</p>
          </section>

          {/* Role in the model */}
          <section>
            <h3 className="text-ink text-sm font-medium mb-1.5">Role in the Composite</h3>
            <p className="text-ink3 text-sm leading-relaxed">{desc.modelRole}</p>
          </section>

          {/* Interpretation guide */}
          <section>
            <h3 className="text-ink text-sm font-medium mb-1.5">How to Interpret</h3>
            <p className="text-ink3 text-sm leading-relaxed">{desc.interpretation}</p>
          </section>

          {/* Lead/Lag */}
          <section className="flex items-start gap-2 bg-raised rounded-lg px-3 py-2.5">
            <span className="text-ink4 text-xs mt-0.5">Timing:</span>
            <span className="text-ink2 text-sm">{desc.leadLag}</span>
          </section>
        </div>
      </div>
    </div>
  );
}
