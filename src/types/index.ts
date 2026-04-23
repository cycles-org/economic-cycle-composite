export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface SeriesConfig {
  fredId: string;
  tickerId: string;
  layer: 1 | 2 | 3 | 4 | 5;
  layerName: 'Leading' | 'Coincident' | 'Stress' | 'Policy' | 'Liquidity';
  frequency: Frequency;
  seriesName: string;
  invert: boolean;
}

// API response types

export interface SymbolResult {
  symbol: string;
  symbolId: string;
  shortName: string;
  datafeed: string;
  exchange: string;
  currency: string;
  type: string;
}

export interface EnsureResult {
  isComplete: boolean;
  trackingId: string | null;
  status?: string;
}

export interface WaitResult {
  status: boolean;
  duration: number;
}

export interface OhlcvBar {
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CyclePeak {
  cycleLength: number;
  amplitude: number;
  bartelsValue: number;
  strength: number;
  phaseStatus: string;        // current cycle phase — pairs with phaseScore
  phaseScore?: number;         // current cycle phase score (-100 to +100)
  avgPhaseStatus?: string;     // average phase — pairs with avgPhaseScore
  avgPhaseScore?: number;      // average phase score (-100 to +100)
  dominantRank: number;
  minBarNum: number;
  stabilityScore: number;
}

export interface CycleScannerResults {
  peaks: CyclePeak[];
  spectrum?: number[];
  datapoints: number;
  statusCode: string;
}

// Pipeline output

export interface SeriesResult {
  symbolId: string;
  fredId: string;
  layer: number;
  layerName: string;
  frequency: Frequency;
  invert: boolean;
  seriesName: string;
  rawPhaseScore: number;       // avgPhaseScore from API (-100 to +100)
  phaseScore: number;          // mapped to 0-100: (raw + 100) / 2
  adjustedScore: number;       // after inversion: invert ? 100 - phaseScore : phaseScore
  dominantCycleLength: number;
  amplitude: number;
  bartels: number;
  strength: number;
  normalizedStrength: number;  // dominant peak strength normalized within its own spectrum (0-1)
  stabilityScore: number;
  phaseStatus: string;
  dominantRank: number;
  minBarNum: number;
  closesCount: number;
  lastCloseValue: number;
  lastDataDate: string;   // date of last available bar (e.g. "2026-04-01")
  updatedAt: string;
  error?: string;
}

// Liquidity layer types

export interface LiquiditySeriesResult {
  seriesId: string;
  name: string;
  cycleLength: number;
  phaseStatus: string;
  avgPhaseScore: number;
  phaseScore: number;       // interpolated from phaseStatus + avgPhaseScore
  crsi: number;             // raw CRSI value
  crsiUB?: number;          // upper band
  crsiLB?: number;          // lower band
  crsiDirection?: number;   // positive = rising, negative = falling
  crsiBandScore: number;    // band+direction adjusted score
  combinedScore: number;    // 0.5 × phaseScore + 0.5 × crsiBandScore
  bartels: number;
  stability: number;
  momentumYoY: number;      // current 52-week momentum %
  // Structural cycle (~65-month Howell cycle) — NFL only
  structuralCycleLength?: number;
  structuralPhaseStatus?: string;
  structuralAvgPhaseScore?: number;
  structuralPhaseScore?: number;    // interpolated phase score for the structural cycle
  structuralStability?: number;
  error?: string;
}

export interface LiquidityResult {
  compositeScore: number;
  regime: string;
  series: LiquiditySeriesResult[];
  timestamp: string;
}

export interface CrsiResult {
  crsi: number[];
  ub: number[];
  lb: number[];
}
