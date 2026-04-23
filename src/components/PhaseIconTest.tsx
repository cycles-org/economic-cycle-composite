import { PhaseIcon, PhaseIconLarge } from './PhaseIcon';

export function PhaseIconTest() {
  return (
    <div className="bg-pg p-6 max-w-3xl mx-auto">
      <h1 className="text-ink text-xl font-bold mb-6">Phase Icons</h1>

      <div className="bg-card border border-line rounded-lg p-4 mb-6">
        <h2 className="text-ink font-medium mb-3">Small (16px) &amp; Medium (22px)</h2>
        <table className="text-xs text-ink">
          <tbody>
            {([
              ['BOTTOM_Arrival', -95],
              ['BOTTOM_Departure', -100],
              ['Uptrend_Starting', -95],
              ['Uptrend_Neutral', 30],
              ['Uptrend_Neutral', 60],
              ['Uptrend_ApproachingTop', 80],
              ['TOP_Arrival', 95],
              ['TOP_Departure', 100],
              ['Downtrend_Starting', 95],
              ['Downtrend_Neutral', -30],
              ['Downtrend_Neutral', -60],
              ['Downtrend_ApproachingBottom', -80],
            ] as const).map(([status, score], i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-3 py-1.5"><PhaseIcon phaseStatus={status} avgPhaseScore={score} size={16} /></td>
                <td className="px-3 py-1.5"><PhaseIcon phaseStatus={status} avgPhaseScore={score} size={22} /></td>
                <td className="px-3 py-1.5 font-mono">{status}</td>
                <td className="px-3 py-1.5 font-mono text-ink4">{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card border border-line rounded-lg p-4">
        <h2 className="text-ink font-medium mb-3">Large (modal)</h2>
        <div className="grid grid-cols-2 gap-4">
          <PhaseIconLarge phaseStatus="Uptrend_Neutral" avgPhaseScore={45} />
          <PhaseIconLarge phaseStatus="TOP_Arrival" avgPhaseScore={95} />
          <PhaseIconLarge phaseStatus="Downtrend_Neutral" avgPhaseScore={-50} />
          <PhaseIconLarge phaseStatus="BOTTOM_Arrival" avgPhaseScore={-95} />
        </div>
      </div>
    </div>
  );
}
