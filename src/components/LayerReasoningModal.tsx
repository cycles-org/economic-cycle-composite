import { useEffect, useRef } from 'react';

interface Props {
  layerName: string;
  label: string;
  score: number;
  reasoning: string;
  scoreAttribution?: string;
  onClose: () => void;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-c-green';
  if (score >= 55) return 'text-c-green2';
  if (score >= 45) return 'text-c-yellow';
  if (score >= 30) return 'text-c-orange';
  return 'text-c-red';
}

export function LayerReasoningModal({ layerName, label, score, reasoning, scoreAttribution, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-overlay-bg backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-card border border-line2 rounded-xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="border-b border-line px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-ink font-semibold text-lg leading-tight">{layerName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-medium ${scoreColor(score)}`}>{label}</span>
              <span className="text-ink5">·</span>
              <span className={`text-sm font-bold font-mono ${scoreColor(score)}`}>{score.toFixed(1)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink4 hover:text-ink transition-colors text-xl leading-none ml-4"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="text-ink text-sm font-medium mb-2">Macro Context</h3>
            <p className="text-ink3 text-sm leading-relaxed">{reasoning}</p>
          </div>

          {scoreAttribution && (
            <div>
              <h3 className="text-ink text-sm font-medium mb-2">Score Derivation</h3>
              {scoreAttribution.split('. ').filter(Boolean).map((sentence, i) => {
                const text = sentence.endsWith('.') ? sentence : sentence + '.';
                const isWarning = text.startsWith('⚠');
                const isEarlyWarning = text.includes('Early warning pattern');
                const isDivergence = text.includes('divergence') || text.includes('Divergence');
                return (
                  <p
                    key={i}
                    className={`text-sm leading-relaxed mb-2 ${
                      isWarning || isEarlyWarning
                        ? 'text-c-amber border-l-2 border-amber-500/50 pl-3'
                        : isDivergence
                        ? 'text-c-orange border-l-2 border-orange-500/30 pl-3'
                        : 'text-ink3'
                    }`}
                  >
                    {text}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
