/**
 * PhaseIcon — Static SVG icon representing the current cycle phase.
 *
 * Each of the 10 CycleScanner phase strings maps to a fixed icon showing
 * a mini sine wave with a colored chevron arrow (two lines forming a V)
 * at the correct position, pointing along the wave's tangent direction.
 *
 * Phase positions (from Cycle Tools SKILL.md § Cycle Phase Scoring Reference):
 *   0.00 trough
 *   0.05 BOTTOM_Departure
 *   0.10 Uptrend_Starting
 *   0.15–0.40 Uptrend_Neutral (interpolated by avgPhaseScore 30→60)
 *   0.42 Uptrend_ApproachingTop
 *   0.48 TOP_Arrival
 *   0.52 TOP_Departure
 *   0.55 Downtrend_Starting
 *   0.60–0.85 Downtrend_Neutral (interpolated by avgPhaseScore -30→-60)
 *   0.88 Downtrend_ApproachingBottom
 *   0.95 BOTTOM_Arrival
 */

interface Props {
  phaseStatus: string;
  avgPhaseScore?: number;
  size?: number;  // height in px, width scales ~2.5:1
}

// Small icon geometry
const VW = 52;
const VH = 26;   // extra vertical room for chevron at peaks/troughs
const AMP = 7.5;
const CY = VH / 2;

// Colors
const GREEN = 'var(--th-c-green)';
const ORANGE = 'var(--th-c-orange)';
const RED = 'var(--th-c-red)';
const BLUE = 'var(--th-c-blue)';
const WAVE = 'var(--th-c-blue)';
const WAVE_FUTURE = 'var(--th-ink3)';

function waveY(t: number, cy: number, amp: number): number {
  return cy - amp * Math.sin(2 * Math.PI * t - Math.PI / 2);
}

/**
 * Tangent angle at position t (radians, SVG coords where y-down).
 * Derivative of waveY = cy - amp * sin(2πt - π/2):
 *   dy/dt = -amp * 2π * cos(2πt - π/2)
 * Negative dy = going up on screen (rising phase).
 */
function waveTangentAngle(t: number, amp: number, width: number): number {
  const dydt = -amp * 2 * Math.PI * Math.cos(2 * Math.PI * t - Math.PI / 2);
  return Math.atan2(dydt, width);
}

function wavePath(t0: number, t1: number, cy: number, amp: number, width: number, steps = 40): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (t1 - t0) * (i / steps);
    pts.push(`${(t * width).toFixed(1)},${waveY(t, cy, amp).toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * Chevron arrow — two lines forming a > shape, centered at origin pointing right.
 * Returns SVG path string. Rotated via transform to follow tangent.
 */
function chevronPath(len: number): string {
  const spread = len * 0.7;
  return `M${-len * 0.4},${-spread} L${len * 0.6},0 L${-len * 0.4},${spread}`;
}

function resolvePhase(phaseStatus: string, avgPhaseScore?: number): {
  pos: number;
  color: string;
} {
  switch (phaseStatus) {
    case 'BOTTOM_Arrival':
      return { pos: 0.95, color: BLUE };
    case 'BOTTOM_Departure':
      return { pos: 0.05, color: GREEN };
    case 'Uptrend_Starting':
      return { pos: 0.10, color: GREEN };
    case 'Uptrend_Neutral': {
      const t = avgPhaseScore != null
        ? Math.max(0, Math.min(1, (avgPhaseScore - 30) / 30))
        : 0.5;
      return { pos: 0.15 + t * 0.25, color: GREEN };
    }
    case 'Uptrend_ApproachingTop':
      return { pos: 0.42, color: ORANGE };
    case 'TOP_Arrival':
      return { pos: 0.48, color: ORANGE };
    case 'TOP_Departure':
      return { pos: 0.52, color: RED };
    case 'Downtrend_Starting':
      return { pos: 0.55, color: RED };
    case 'Downtrend_Neutral': {
      const t = avgPhaseScore != null
        ? Math.max(0, Math.min(1, (avgPhaseScore - (-30)) / (-30)))
        : 0.5;
      return { pos: 0.60 + t * 0.25, color: RED };
    }
    case 'Downtrend_ApproachingBottom':
      return { pos: 0.88, color: BLUE };

    case 'Rising':  return { pos: 0.25, color: GREEN };
    case 'Falling': return { pos: 0.75, color: RED };
    case 'Top':     return { pos: 0.50, color: ORANGE };
    case 'Bottom':  return { pos: 0.00, color: BLUE };
    default:        return { pos: 0.25, color: GREEN };
  }
}

export function PhaseIcon({ phaseStatus, avgPhaseScore, size = 22 }: Props) {
  const { pos, color } = resolvePhase(phaseStatus, avgPhaseScore);
  const width = size * (VW / VH);

  const ax = pos * VW;
  const ay = waveY(pos, CY, AMP);
  const angle = waveTangentAngle(pos, AMP, VW) * (180 / Math.PI);

  const pastPath = wavePath(0, pos, CY, AMP, VW);
  const futurePath = wavePath(pos, 1, CY, AMP, VW);

  return (
    <svg
      width={width}
      height={size}
      viewBox={`0 0 ${VW} ${VH}`}
      className="inline-block flex-shrink-0"
    >
      {/* Past wave */}
      <polyline
        points={pastPath}
        fill="none"
        stroke={WAVE}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Future wave */}
      <polyline
        points={futurePath}
        fill="none"
        stroke={WAVE_FUTURE}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 1.5"
      />
      {/* Dot + Chevron arrow */}
      <circle cx={ax.toFixed(1)} cy={ay.toFixed(1)} r="2" fill={color} />
      <g transform={`translate(${ax.toFixed(1)},${ay.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
        <path
          d={chevronPath(6)}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/**
 * Larger phase icon with phase string label, for use in info modals.
 */
export function PhaseIconLarge({ phaseStatus, avgPhaseScore }: Omit<Props, 'size'>) {
  const { pos, color } = resolvePhase(phaseStatus, avgPhaseScore);
  const LW = 220;
  const LH = 60;
  const lAmp = 18;
  const lCY = 30;
  const padX = 10;
  const innerW = LW - 2 * padX;

  const ax = padX + pos * innerW;
  const ay = waveY(pos, lCY, lAmp);
  const angle = waveTangentAngle(pos, lAmp, innerW) * (180 / Math.PI);

  function lWavePath(t0: number, t1: number): string {
    return wavePath(t0, t1, lCY, lAmp, innerW, 80)
      .split(' ')
      .map(pt => {
        const [x, y] = pt.split(',');
        return `${(parseFloat(x) + padX).toFixed(1)},${y}`;
      })
      .join(' ');
  }

  const pastP = lWavePath(0, pos);
  const futureP = lWavePath(pos, 1);

  // Label position: above arrow if arrow is low, below if high
  const labelAbove = ay > lCY;
  const labelYPos = labelAbove ? ay - 16 : ay + 20;

  // Clamp label X so it doesn't clip at edges
  const labelX = Math.max(padX + 40, Math.min(LW - padX - 40, ax));

  return (
    <div className="bg-raised rounded-lg px-3 py-2">
      <svg width="100%" viewBox={`0 0 ${LW} ${LH}`} className="block">
        {/* Center line */}
        <line
          x1={padX} y1={lCY} x2={LW - padX} y2={lCY}
          stroke="var(--th-ink5)"
          strokeWidth="0.5"
          strokeDasharray="3 3"
          opacity="0.4"
        />
        {/* Past wave */}
        <polyline
          points={pastP}
          fill="none"
          stroke={WAVE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Future wave */}
        <polyline
          points={futureP}
          fill="none"
          stroke={WAVE_FUTURE}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 3"
        />
        {/* Chevron arrow */}
        <g transform={`translate(${ax.toFixed(1)},${ay.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
          <path
            d={chevronPath(10)}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        {/* Phase string label */}
        <text
          x={labelX}
          y={labelYPos}
          fill={color}
          fontSize="8"
          fontWeight="700"
          fontFamily="monospace"
          textAnchor="middle"
        >
          {phaseStatus}
        </text>
      </svg>
      {/* avgPhaseScore detail */}
      {avgPhaseScore != null && (
        <div className="text-right px-0.5 mt-0.5">
          <span className="text-ink4 text-[10px] font-mono">
            avgPhase: {avgPhaseScore.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  );
}
