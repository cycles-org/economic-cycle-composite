/**
 * Cycle Phase Scoring
 *
 * Maps CycleScanner avgPhaseStatus + avgPhaseScore to a 0-100 application score.
 * 0 = most bearish (Downtrend_Starting), 100 = most bullish (Uptrend_Starting).
 *
 * CRITICAL: Always use avgPhaseStatus with avgPhaseScore (matched pair).
 * Never use phaseStatus with avgPhaseScore — they come from different
 * calculations and mixing them produces incorrect results.
 *
 * The avgPhaseScore follows two arcs with sign flips at peak and trough:
 *   Rising arc (trough→peak): -100 → -95 → [JUMP +30] → 40 → 60 → 80 → 95 → 100
 *   Falling arc (peak→trough): 100 → 95 → [JUMP -30] → -40 → -60 → -80 → -95 → -100
 *
 * Most phases return a FIXED avgPhaseScore (single value, not a range).
 * Only Uptrend_Neutral (30-60) and Downtrend_Neutral (-30 to -60) interpolate.
 */

// Fixed-value phase mappings: avgPhaseStatus → appScore
const PHASE_FIXED: Record<string, number> = {
  'Uptrend_Starting':            100,
  'BOTTOM_Departure':             88,
  'BOTTOM_Arrival':               78,
  'Uptrend_ApproachingTop':       48,
  'TOP_Arrival':                  42,
  'TOP_Departure':                30,
  'Downtrend_Starting':            0,
  'Downtrend_ApproachingBottom':  36,
};

// Interpolated phase mappings: avgPhaseScore range → appScore range
const PHASE_INTERPOLATED: Record<string, { phaseRange: [number, number]; scoreRange: [number, number] }> = {
  'Uptrend_Neutral':   { phaseRange: [30, 60],   scoreRange: [72, 54] },  // 30→72, 60→54
  'Downtrend_Neutral': { phaseRange: [-30, -60],  scoreRange: [12, 30] },  // -30→12, -60→30
};

export function interpolatePhaseScore(avgPhaseStatus: string, avgPhaseScore?: number): number {
  // Check fixed-value phases first
  const fixed = PHASE_FIXED[avgPhaseStatus];
  if (fixed !== undefined) {
    return fixed;
  }

  // Check interpolated phases
  const interp = PHASE_INTERPOLATED[avgPhaseStatus];
  if (interp && avgPhaseScore !== undefined && avgPhaseScore !== null) {
    const [phaseLow, phaseHigh] = interp.phaseRange;
    const [scoreLow, scoreHigh] = interp.scoreRange;

    // Clamp to expected range
    const clamped = phaseLow < phaseHigh
      ? Math.max(phaseLow, Math.min(phaseHigh, avgPhaseScore))
      : Math.max(phaseHigh, Math.min(phaseLow, avgPhaseScore));

    // Normalize t from 0 to 1
    const range = Math.abs(phaseHigh - phaseLow);
    const t = range > 0 ? Math.abs(clamped - phaseLow) / range : 0.5;

    const score = scoreLow + t * (scoreHigh - scoreLow);
    return Math.round(score * 10) / 10;
  }

  // Unknown phase or missing avgPhaseScore — return midpoint
  return 50;
}
