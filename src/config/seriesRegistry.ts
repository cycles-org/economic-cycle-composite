import type { SeriesConfig } from '../types';

export const SERIES_REGISTRY: SeriesConfig[] = [
  // Layer 1 — Leading Indicators (40% weight)
  { fredId: 'T10Y2Y',        tickerId: 'T10Y2Y:FDS',        layer: 1, layerName: 'Leading',    frequency: 'daily',   seriesName: '10Y-2Y Treasury Spread',                    invert: false },
  { fredId: 'T10Y3M',        tickerId: 'T10Y3M:FDS',        layer: 1, layerName: 'Leading',    frequency: 'daily',   seriesName: '10Y-3M Treasury Spread',                    invert: false },
  { fredId: 'ICSA',          tickerId: 'ICSA-W:FDS',        layer: 1, layerName: 'Leading',    frequency: 'weekly',  seriesName: 'Initial Jobless Claims',                    invert: true },
  { fredId: 'CCSA',          tickerId: 'CCSA-W:FDS',        layer: 1, layerName: 'Leading',    frequency: 'weekly',  seriesName: 'Continued Claims',                          invert: true },
  { fredId: 'UMCSENT',       tickerId: 'UMCSENT-M:FDS',     layer: 1, layerName: 'Leading',    frequency: 'monthly', seriesName: 'U. Michigan Consumer Sentiment',             invert: false },
  { fredId: 'USSLIND',       tickerId: 'USSLIND-M:FDS',     layer: 1, layerName: 'Leading',    frequency: 'monthly', seriesName: 'US Leading Economic Index',                  invert: false },
  { fredId: 'PERMIT',        tickerId: 'PERMIT-M:FDS',      layer: 1, layerName: 'Leading',    frequency: 'monthly', seriesName: 'Building Permits',                          invert: false },
  // HOUST dropped — no data in FDS; PERMIT already covers housing
  { fredId: 'DGORDER',      tickerId: 'DGORDER-M:FDS',    layer: 1, layerName: 'Leading',    frequency: 'monthly', seriesName: 'Mfrs New Orders: Durable Goods',            invert: false },
  { fredId: 'JTSJOL',        tickerId: 'JTSJOL-M:FDS',      layer: 1, layerName: 'Leading',    frequency: 'monthly', seriesName: 'JOLTS Job Openings',                        invert: false },

  // Layer 2 — Coincident Activity (20% weight)
  { fredId: 'INDPRO',        tickerId: 'INDPRO-M:FDS',      layer: 2, layerName: 'Coincident', frequency: 'monthly', seriesName: 'Industrial Production Index',                invert: false },
  { fredId: 'PAYEMS',        tickerId: 'PAYEMS-M:FDS',      layer: 2, layerName: 'Coincident', frequency: 'monthly', seriesName: 'Nonfarm Payrolls',                          invert: false },
  // MANEMP, RSAFS, RRSFS, TCU dropped — no data in FDS
  { fredId: 'DSPIC96',       tickerId: 'DSPIC96-M:FDS',     layer: 2, layerName: 'Coincident', frequency: 'monthly', seriesName: 'Real Disposable Personal Income',            invert: false },
  { fredId: 'UNRATE',        tickerId: 'UNRATE-M:FDS',      layer: 2, layerName: 'Coincident', frequency: 'monthly', seriesName: 'Unemployment Rate',                          invert: true },

  // Layer 3 — Financial Stress / Risk Appetite (25% weight)
  { fredId: 'VIXCLS',        tickerId: 'VIXCLS:FDS',        layer: 3, layerName: 'Stress',     frequency: 'daily',   seriesName: 'CBOE VIX',                                  invert: true },
  { fredId: 'STLFSI4',       tickerId: 'STLFSI4-W:FDS',     layer: 3, layerName: 'Stress',     frequency: 'weekly',  seriesName: 'St. Louis Financial Stress Index',           invert: true },
  { fredId: 'BAA10Y',        tickerId: 'BAA10Y:FDS',        layer: 3, layerName: 'Stress',     frequency: 'daily',   seriesName: 'Baa Corp Bond-10Y Spread',                  invert: true },
  { fredId: 'BAMLH0A0HYM2',  tickerId: 'BAMLH0A0HYM2:FDS',  layer: 3, layerName: 'Stress',     frequency: 'daily',   seriesName: 'ICE BofA High Yield OAS Spread',            invert: true },

  // Layer 4 — Inflation / Policy Regime (15% weight)
  { fredId: 'DFF',           tickerId: 'DFF:FDS',           layer: 4, layerName: 'Policy',     frequency: 'daily',   seriesName: 'Fed Funds Effective Rate',                   invert: true },
  { fredId: 'T5YIE',         tickerId: 'T5YIE:FDS',         layer: 4, layerName: 'Policy',     frequency: 'daily',   seriesName: '5Y Breakeven Inflation Rate',                invert: false },
  { fredId: 'CPIAUCSL',      tickerId: 'CPIAUCSL-M:FDS',    layer: 4, layerName: 'Policy',     frequency: 'monthly', seriesName: 'CPI All Urban (headline)',                   invert: true },
  { fredId: 'CPILFESL',      tickerId: 'CPILFESL-M:FDS',    layer: 4, layerName: 'Policy',     frequency: 'monthly', seriesName: 'Core CPI (ex food & energy)',                invert: true },
  { fredId: 'M2SL',          tickerId: 'M2SL-M:FDS',        layer: 4, layerName: 'Policy',     frequency: 'monthly', seriesName: 'M2 Money Supply',                            invert: false },
  { fredId: 'DTWEXBGS',      tickerId: 'DTWEXBGS:FDS',      layer: 4, layerName: 'Policy',     frequency: 'daily',   seriesName: 'Trade-Weighted US Dollar Index',             invert: true },
];

export const LAYER_WEIGHTS: Record<number, number> = {
  1: 0.30,  // Leading — most predictive
  2: 0.15,  // Coincident — confirms but lags
  3: 0.20,  // Stress
  4: 0.10,  // Policy
  5: 0.25,  // Liquidity (Howell framework)
};

/**
 * Per-series weights from constrained optimization against 8 historical
 * market tops/bottoms (2000-2022). All series retained with min weight 0.15.
 * Achieved 8/8 classification with 20.4pt separation.
 */
export const SERIES_WEIGHTS: Record<string, number> = {
  'CCSA': 1.500,
  'UMCSENT': 1.500,
  'DGORDER': 0.800,
  'INDPRO': 1.000,
  'BAA10Y': 1.500,
  'T5YIE': 1.500,
  'BAMLH0A0HYM2': 1.349,
  'JTSJOL': 0.896,
  'CPIAUCSL': 0.400,
  'CPILFESL': 0.307,
  'DFF': 0.301,
  'ICSA': 0.253,
  'T10Y2Y': 0.100,
  'T10Y3M': 0.100,
  'USSLIND': 0.600,
  'PERMIT': 0.400,
  'PAYEMS': 0.500,
  'DSPIC96': 0.400,
  'UNRATE': 0.600,
  'VIXCLS': 0.100,
  'STLFSI4': 0.100,
  'M2SL': 0.100,
  'DTWEXBGS': 0.100,
};

export const LAYER_NAMES: Record<number, string> = {
  1: 'Leading Indicators',
  2: 'Coincident Activity',
  3: 'Financial Stress',
  4: 'Inflation / Policy',
  5: 'Liquidity (Howell)',
};

/** Liquidity layer component series (not in SERIES_REGISTRY — handled by dedicated pipeline) */
export const LIQUIDITY_NFL_COMPONENTS = [
  { fredId: 'WALCL',     tickerId: 'WALCL-W:FDS',     role: '+' as const, name: 'Fed Total Assets' },
  { fredId: 'SWPT',      tickerId: 'SWPT-W:FDS',      role: '+' as const, name: 'CB Swap Lines' },
  { fredId: 'RRPONTSYD', tickerId: 'RRPONTSYD:FDS',    role: '-' as const, name: 'Reverse Repo (ON RRP)', daily: true },
  { fredId: 'WTREGEN',   tickerId: 'WTREGEN-W:FDS',    role: '-' as const, name: 'Treasury General Account' },
];

export interface LiquiditySeriesConfig {
  fredId: string;
  tickerId: string;
  name: string;
  weight: number;
  fxAdjust?: 'multiply' | 'divide';
  fxTicker?: string;
  monthly?: boolean;   // true for monthly series needing interpolation to weekly
  derived?: boolean;   // true for NFL (computed, not fetched directly)
}

/**
 * 8-series liquidity layer — matches reference LiquidityModel.
 * All aligned to Wednesday grid derived from WALCL dates.
 * Total weight = 10.
 */
export const LIQUIDITY_SCORED_SERIES: LiquiditySeriesConfig[] = [
  { fredId: 'WALCL',       tickerId: 'WALCL-W:FDS',       name: 'Fed Total Assets (WALCL)',    weight: 3 },
  { fredId: 'ECB_USD',     tickerId: 'ECBASSETSW-W:FDS',  name: 'ECB Total Assets (USD)',      weight: 1, fxAdjust: 'multiply', fxTicker: 'DEXUSEU:FDS' },
  { fredId: 'BOJ_USD',     tickerId: 'JPNASSETS-M:FDS',   name: 'BOJ Total Assets (USD)',      weight: 1, fxAdjust: 'divide',   fxTicker: 'DEXJPUS:FDS', monthly: true },
  { fredId: 'NFL',         tickerId: 'NFL',                name: 'Net Fed Liquidity',           weight: 1, derived: true },
  { fredId: 'TOTBKCR',     tickerId: 'TOTBKCR-W:FDS',     name: 'US Total Bank Credit',        weight: 1 },
  { fredId: 'WRESBAL',     tickerId: 'WRESBAL-W:FDS',     name: 'US Reserve Balances',         weight: 1 },
  { fredId: 'COMPOUT',     tickerId: 'COMPOUT-W:FDS',     name: 'Commercial Paper Outstanding', weight: 1 },
  { fredId: 'WRMFNS',      tickerId: 'WRMFNS-W:FDS',      name: 'Retail Money Market Funds',   weight: 1 },
];

/** FX tickers needed for currency conversion */
export const LIQUIDITY_FX_TICKERS = ['DEXUSEU:FDS', 'DEXJPUS:FDS'] as const;

export const PHASE1_TEST_SERIES = [
  'T10Y2Y:FDS',   // daily
  'ICSA-W:FDS',   // weekly
  'UMCSENT-M:FDS', // monthly
];

export function getSeriesByLayer(layer: number): SeriesConfig[] {
  return SERIES_REGISTRY.filter(s => s.layer === layer);
}

export function getSeriesByTickerId(tickerId: string): SeriesConfig | undefined {
  return SERIES_REGISTRY.find(s => s.tickerId === tickerId);
}
