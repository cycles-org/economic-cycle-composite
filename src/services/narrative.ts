import type { SeriesResult, LiquidityResult } from '../types';
import type { CompositeResult } from './composite';
import { SERIES_WEIGHTS } from '../config/seriesRegistry';

// ── Per-series narrative fragments ──────────────────────────────

interface SeriesNarrative {
  bullish: string;   // score >= 65
  neutral: string;   // 35-64
  bearish: string;   // score < 35
  theme: 'labor' | 'production' | 'credit' | 'inflation' | 'sentiment' | 'yield_curve' | 'policy' | 'other';
}

const NARRATIVES: Record<string, SeriesNarrative> = {
  UMCSENT: {
    theme: 'sentiment',
    bullish: 'Consumer sentiment is in a strong upswing, reflecting household confidence in jobs and income',
    neutral: 'Consumer sentiment is mixed, with households neither confident nor pessimistic',
    bearish: 'Consumer sentiment has deteriorated sharply, signaling households are losing confidence in the economic outlook',
  },
  INDPRO: {
    theme: 'production',
    bullish: 'Industrial production continues to expand, confirming a healthy manufacturing economy',
    neutral: 'Industrial production is plateauing, with the manufacturing cycle losing momentum',
    bearish: 'Industrial production is contracting, indicating a downturn in the real economy',
  },
  BAA10Y: {
    theme: 'credit',
    bullish: 'Investment-grade credit spreads are tight, reflecting ample credit availability and low default risk',
    neutral: 'Credit spreads are moderate, suggesting neither complacency nor acute stress in bond markets',
    bearish: 'Credit spreads have widened significantly, signaling rising default risk and tightening financial conditions',
  },
  T5YIE: {
    theme: 'inflation',
    bullish: 'Market inflation expectations are healthy, suggesting confidence in nominal growth without deflation fears',
    neutral: 'Breakeven inflation rates are near average, with markets pricing in moderate inflation',
    bearish: 'Breakeven inflation has collapsed, pointing to deflationary fears and weakening growth expectations',
  },
  CPIAUCSL: {
    theme: 'inflation',
    bullish: 'Headline inflation is falling, giving the Fed room to ease monetary policy',
    neutral: 'Headline inflation is moderate, neither forcing the Fed to tighten nor enabling aggressive easing',
    bearish: 'Headline inflation is elevated and rising, constraining the Fed\'s ability to support markets',
  },
  CCSA: {
    theme: 'labor',
    bullish: 'Continued unemployment claims are low, indicating the labor market is absorbing displaced workers',
    neutral: 'Continued claims are stable, with the labor market in a holding pattern',
    bearish: 'Continued unemployment claims are rising, indicating the labor market is failing to reabsorb laid-off workers',
  },
  DGORDER: {
    theme: 'production',
    bullish: 'Durable goods orders are rising, signaling expanding business investment commitments',
    neutral: 'Durable goods orders are flat, with business investment neither expanding nor contracting',
    bearish: 'Durable goods orders are declining, pointing to a pullback in business investment',
  },
  UNRATE: {
    theme: 'labor',
    bullish: 'Unemployment remains low and falling, supporting consumer spending and confidence',
    neutral: 'The unemployment rate is stable, with the labor market in equilibrium',
    bearish: 'Unemployment is rising, threatening consumption and consumer confidence',
  },
  JTSJOL: {
    theme: 'labor',
    bullish: 'Job openings remain elevated, indicating strong labor demand from employers',
    neutral: 'Job openings are at moderate levels, suggesting stable but not exceptional labor demand',
    bearish: 'Job openings are contracting, a leading signal that layoffs may follow',
  },
  DFF: {
    theme: 'policy',
    bullish: 'The Fed Funds rate is in a falling or low phase, providing a monetary policy tailwind',
    neutral: 'Monetary policy is in a transitional phase, with the Fed neither aggressively tightening nor easing',
    bearish: 'The Fed is in a tightening cycle, raising the cost of capital and creating a headwind for asset prices',
  },
  CPILFESL: {
    theme: 'inflation',
    bullish: 'Core inflation is decelerating, easing pressure on the Fed to maintain restrictive policy',
    neutral: 'Core inflation is stable, with underlying price pressures contained but persistent',
    bearish: 'Core inflation is accelerating, signaling broad-based price pressure the Fed cannot ignore',
  },
  ICSA: {
    theme: 'labor',
    bullish: 'New unemployment filings are low and stable, consistent with a firm labor market',
    neutral: 'Initial claims are at moderate levels, with no clear layoff trend',
    bearish: 'New unemployment filings are rising, signaling fresh layoff pressure across the economy',
  },
  DTWEXBGS: {
    theme: 'policy',
    bullish: 'The trade-weighted dollar is weakening, loosening global financial conditions',
    neutral: 'The dollar is relatively stable, exerting no strong pull on global conditions',
    bearish: 'The dollar is strengthening, tightening global financial conditions and pressuring exporters',
  },
  PAYEMS: {
    theme: 'labor',
    bullish: 'Nonfarm payrolls continue to grow, confirming a healthy job market',
    neutral: 'Payroll growth is moderate, with the labor market neither booming nor contracting',
    bearish: 'Payrolls are contracting, confirming labor market deterioration',
  },
  T10Y2Y: {
    theme: 'yield_curve',
    bullish: 'The yield curve (10Y-2Y) is steepening, consistent with growth expectations',
    neutral: 'The yield curve is relatively flat, reflecting uncertainty about the growth outlook',
    bearish: 'The yield curve is inverted or flattening, signaling bond market concern about future recession',
  },
  T10Y3M: {
    theme: 'yield_curve',
    bullish: 'The near-term yield curve (10Y-3M) confirms positive growth expectations',
    neutral: 'The 10Y-3M spread is sending a mixed signal on near-term growth',
    bearish: 'The 10Y-3M curve is inverted, reinforcing recession risk',
  },
  USSLIND: {
    theme: 'other',
    bullish: 'The Conference Board Leading Index is advancing, confirming forward momentum',
    neutral: 'The Leading Economic Index is flat, offering no clear directional signal',
    bearish: 'The Leading Economic Index is declining, a well-documented recession precursor',
  },
  PERMIT: {
    theme: 'other',
    bullish: 'Building permits are rising, a positive signal for future economic activity',
    neutral: 'Building permits are stable, with housing activity in a holding pattern',
    bearish: 'Building permits are declining, suggesting weakening residential investment',
  },
  DSPIC96: {
    theme: 'other',
    bullish: 'Real disposable income is rising, supporting consumer purchasing power',
    neutral: 'Real income growth is tepid, offering limited support to spending',
    bearish: 'Real disposable income is falling, eroding consumer purchasing power',
  },
  VIXCLS: {
    theme: 'credit',
    bullish: 'Implied volatility (VIX) is low, reflecting calm equity markets',
    neutral: 'The VIX is at moderate levels, with equity volatility near average',
    bearish: 'The VIX is elevated, reflecting heightened fear and uncertainty in equity markets',
  },
  STLFSI4: {
    theme: 'credit',
    bullish: 'The St. Louis Financial Stress Index is below average, signaling accommodative conditions',
    neutral: 'Financial stress is near average levels',
    bearish: 'Financial stress is elevated, indicating tightening conditions across markets',
  },
  BAMLH0A0HYM2: {
    theme: 'credit',
    bullish: 'High-yield credit spreads are tight, reflecting low perceived risk in corporate debt',
    neutral: 'High-yield spreads are at moderate levels',
    bearish: 'High-yield credit spreads have widened, signaling stress in the riskiest corporate borrowers',
  },
  M2SL: {
    theme: 'policy',
    bullish: 'Money supply growth is accelerating, adding liquidity to the financial system',
    neutral: 'Money supply growth is moderate',
    bearish: 'Money supply is contracting, removing liquidity and tightening monetary conditions',
  },
};

// ── Score classification ────────────────────────────────────────

function classify(score: number): 'bullish' | 'neutral' | 'bearish' {
  if (score >= 65) return 'bullish';
  if (score >= 35) return 'neutral';
  return 'bearish';
}

// ── Narrative builder ───────────────────────────────────────────

function getSeriesFragment(r: SeriesResult): string | null {
  const def = NARRATIVES[r.fredId];
  if (!def) return null;
  return def[classify(r.adjustedScore)];
}

/**
 * Build a structured narrative for the current composite reading.
 * Returns an object with headline + body paragraph + key signals list.
 */
function getLiquidityNarrative(liq: LiquidityResult): string {
  const { compositeScore, regime } = liq;
  const nflSeries = liq.series.find(s => s.seriesId === 'NFL');
  const nflScore = nflSeries?.combinedScore ?? compositeScore;

  if (compositeScore >= 70) {
    return `Liquidity conditions are strongly expansionary (${compositeScore.toFixed(1)}). Net Fed Liquidity is in an upswing (${nflScore.toFixed(1)}), providing a significant tailwind for risk assets.`;
  }
  if (compositeScore >= 55) {
    return `Liquidity conditions are modestly positive (${compositeScore.toFixed(1)}). The ${regime.toLowerCase()} backdrop supports risk-taking but is not yet a dominant driver.`;
  }
  if (compositeScore >= 45) {
    return `Liquidity conditions are neutral (${compositeScore.toFixed(1)}). Neither expanding nor contracting liquidity cycles are exerting a strong directional force on markets.`;
  }
  if (compositeScore >= 30) {
    return `Liquidity conditions are tightening (${compositeScore.toFixed(1)}). Net Fed Liquidity momentum is weakening (${nflScore.toFixed(1)}), creating a headwind for risk assets.`;
  }
  return `Liquidity conditions are contracting (${compositeScore.toFixed(1)}). Falling liquidity momentum signals a hostile environment for risk assets.`;
}

export function buildNarrative(
  composite: CompositeResult,
  results: SeriesResult[],
  liquidityResult?: LiquidityResult,
): { headline: string; body: string; signals: string[] } {

  const { masterScore, regime, divergence } = composite;

  // ── Headline ──
  const headline = `The Economic Cycle Composite reads ${masterScore.toFixed(1)}, placing the macro environment in the ${regime.label} zone.`;

  // ── Select top signals ──
  // Sort valid results by optimized weight descending, then by score extremity
  const valid = results.filter(r => !r.error && r.strength > 0);
  const weighted = valid
    .map(r => ({
      ...r,
      weight: SERIES_WEIGHTS[r.fredId] ?? 0.15,
      extremity: Math.abs(r.adjustedScore - 50),
    }))
    .sort((a, b) => {
      // Primary: weight; secondary: extremity of signal
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.extremity - a.extremity;
    });

  // Pick top signals: aim for 4-6, but deduplicate by theme
  const usedThemes = new Set<string>();
  const picked: typeof weighted = [];

  for (const s of weighted) {
    const def = NARRATIVES[s.fredId];
    if (!def) continue;

    // Allow max 2 per theme for labor (it's big), 1 for others
    const themeCount = picked.filter(p => NARRATIVES[p.fredId]?.theme === def.theme).length;
    const themeLimit = def.theme === 'labor' ? 2 : (def.theme === 'inflation' ? 2 : 1);
    if (themeCount >= themeLimit) continue;

    picked.push(s);
    usedThemes.add(def.theme);
    if (picked.length >= 6) break;
  }

  // ── Build signal list ──
  const signals = picked
    .map(s => getSeriesFragment(s))
    .filter((f): f is string => f !== null);

  // ── Compose body paragraph ──
  const parts: string[] = [];

  // Group into confirming (same direction as regime) and dissenting
  const regimeBullish = masterScore >= 50;
  const confirming: string[] = [];
  const dissenting: string[] = [];

  for (const s of picked) {
    const fragment = getSeriesFragment(s);
    if (!fragment) continue;
    const sClass = classify(s.adjustedScore);
    const isConfirming = regimeBullish
      ? (sClass === 'bullish' || sClass === 'neutral')
      : (sClass === 'bearish' || sClass === 'neutral');
    if (isConfirming) confirming.push(fragment);
    else dissenting.push(fragment);
  }

  // Main confirming signals
  if (confirming.length > 0) {
    parts.push(confirming.join('. ') + '.');
  }

  // Dissenting signals
  if (dissenting.length > 0) {
    parts.push('However, ' + dissenting[0].charAt(0).toLowerCase() + dissenting[0].slice(1) +
      (dissenting.length > 1
        ? ', and ' + dissenting[1].charAt(0).toLowerCase() + dissenting[1].slice(1)
        : '') + '.');
  }

  // L1-L2 divergence callout
  if (divergence.signal === 'warning') {
    parts.push(
      `Notably, leading indicators are scoring ${Math.abs(divergence.spread)} points below coincident activity — a configuration historically associated with late-cycle peaks and impending deterioration.`
    );
  } else if (divergence.signal === 'caution') {
    parts.push(
      `Leading indicators are beginning to diverge below coincident activity (${Math.abs(divergence.spread)} point gap), an early signal to monitor for late-cycle dynamics.`
    );
  }

  // Liquidity layer callout
  if (liquidityResult) {
    parts.push(getLiquidityNarrative(liquidityResult));
  }

  // L5-L1 liquidity divergence callout
  if (composite.liquidityDivergence.signal === 'liquidity-leading-downturn') {
    parts.push(
      `Liquidity is scoring ${Math.abs(composite.liquidityDivergence.l5l1Spread)} points below leading indicators — historically, funding conditions deteriorate before the economy weakens, making this an early warning of broader cyclical deterioration.`
    );
  } else if (composite.liquidityDivergence.signal === 'liquidity-leading-upturn') {
    parts.push(
      `Liquidity is scoring ${composite.liquidityDivergence.l5l1Spread} points above leading indicators — improving funding conditions typically precede economic recovery.`
    );
  }

  // Closing summary
  if (masterScore >= 62) {
    parts.push('The macro backdrop is supportive; equity cycle lows can be treated as buying opportunities.');
  } else if (masterScore >= 55) {
    parts.push('The macro backdrop provides a mild tailwind for equity positioning.');
  } else if (masterScore >= 48) {
    parts.push('The macro environment offers no clear edge — equity cycle analysis should be the primary guide.');
  } else if (masterScore >= 38) {
    parts.push('The macro environment presents a headwind; cyclical rallies may prove short-lived.');
  } else {
    parts.push('The macro environment is firmly adverse; cyclical patterns are likely overridden by the downturn.');
  }

  return {
    headline,
    body: parts.join(' '),
    signals,
  };
}
