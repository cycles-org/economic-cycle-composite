/**
 * Per-layer regime labels and reasoning text.
 * Each layer gets a 1-line summary based on its score band,
 * plus a longer reasoning explanation accessible via (i) icon.
 *
 * Reasoning is split into:
 *   - contextReasoning: static band-based macro interpretation
 *   - scoreAttribution: dynamic breakdown of which series are driving the score
 */

import type { SeriesResult } from '../types';
import { SERIES_WEIGHTS } from './seriesRegistry';

export interface LayerSummary {
  label: string;
  reasoning: string;
  /** Dynamic score attribution paragraph explaining WHY the score is what it is */
  scoreAttribution?: string;
}

type BandFn = (score: number) => LayerSummary;

const layer1Bands: BandFn = (score) => {
  if (score >= 70) return {
    label: 'Strong Expansion Ahead',
    reasoning: 'Leading indicators are broadly signaling robust growth ahead. Yield curves are steep/normal, jobless claims are low, consumer sentiment is strong, and durable goods orders are healthy. This configuration has historically preceded 6-12 months of above-trend economic growth. In this regime, cyclical dips in equities tend to be buying opportunities because the macro tailwind supports recovery.',
  };
  if (score >= 55) return {
    label: 'Moderate Growth Signal',
    reasoning: 'Leading indicators are mildly positive — the economy is expected to continue growing but without strong acceleration. Some series may be rolling over while others remain firm. This is a typical mid-cycle reading where the expansion is mature but not yet threatened. Watch for divergences: if high-frequency series (claims, sentiment) start weakening while slower series (LEI, permits) hold up, it may signal an approaching turn.',
  };
  if (score >= 45) return {
    label: 'Mixed Outlook',
    reasoning: 'Leading indicators are sending conflicting signals. Some forward-looking series point to continued growth while others are deteriorating. This is often a transitional phase — either the economy is at a late-cycle inflection point or recovering from a soft patch. The lack of clear directional signal means the macro environment provides no edge for timing. Pay close attention to which specific series are weakening: yield curve and claims turns are more significant than sentiment alone.',
  };
  if (score >= 30) return {
    label: 'Deterioration Forming',
    reasoning: 'A majority of leading indicators are rolling over. This pattern — falling sentiment, rising claims, flattening/inverting curves, weakening orders — has historically preceded recessions by 3-9 months. The economy may still feel fine at the surface (coincident data often lags), but the forward signals are clearly negative. Cyclical rallies in this regime tend to be lower-quality and may fail. Risk management should be tightened.',
  };
  return {
    label: 'Contraction Warning',
    reasoning: 'Leading indicators are deeply negative across the board — yield curves inverted, claims surging, sentiment collapsed, orders plunging. This reading has historically only occurred in the lead-up to or early stages of recession. The probability of significant economic deterioration in the coming quarters is very high. This is a defensive regime where capital preservation takes priority over cyclical opportunity.',
  };
};

const layer2Bands: BandFn = (score) => {
  if (score >= 70) return {
    label: 'Broad Expansion',
    reasoning: 'Coincident indicators confirm the economy is in strong expansion. Industrial production is growing, payrolls are adding jobs at a healthy pace, real incomes are rising, and unemployment is low. This is hard confirmation that economic strength is not just forecast but actually materializing. When both L1 (leading) and L2 (coincident) score high, the expansion is on firm footing. If L1 is weakening while L2 remains high, it signals a late-cycle peak.',
  };
  if (score >= 55) return {
    label: 'Steady Growth',
    reasoning: 'The current economy is growing at a moderate pace. Jobs are being added, production is expanding, and incomes are keeping up. This is the typical state during the middle of an expansion — not overheating, not stalling. Divergence from L1 matters: if leading indicators are well above this level, acceleration is likely. If leading indicators are below, the current strength may be masking an approaching slowdown.',
  };
  if (score >= 45) return {
    label: 'Slowing Momentum',
    reasoning: 'Coincident activity is losing steam. Growth is still positive but decelerating — payroll gains are shrinking, production is flattening, and the labor market is softening. This is the phase where the deterioration signaled by leading indicators begins to show up in actual economic data. If L1 is also weak, recession risk is elevated. If L1 is recovering, this may be the trough of a mid-cycle slowdown.',
  };
  if (score >= 30) return {
    label: 'Weakening',
    reasoning: 'The economy is clearly weakening. Multiple coincident indicators are declining — industrial production falling, payroll growth stalling or negative, unemployment rising. This typically confirms that a recession is either imminent or already underway. The NBER business cycle dating committee uses these exact series. When coincident data confirms what leading indicators warned about, the downturn is real, not a false alarm.',
  };
  return {
    label: 'Contraction Underway',
    reasoning: 'Coincident indicators confirm the economy is in contraction. Production is declining, employment is falling, and real incomes are shrinking. This is recession territory. Historically, this is when leading indicators (L1) begin to bottom and turn up — the next recovery starts being priced in even as the current data looks worst. The darkest coincident readings often coincide with the best forward-looking opportunities, but timing the exact bottom requires leading indicator confirmation.',
  };
};

const layer3Bands: BandFn = (score) => {
  if (score >= 70) return {
    label: 'Risk-On, Low Stress',
    reasoning: 'Financial markets are calm with very low stress. VIX is suppressed, credit spreads are tight, and the St. Louis Financial Stress Index is well below zero. Investors are comfortably taking risk, and credit is flowing freely. This environment supports economic growth via the financial channel — businesses can borrow cheaply and asset prices support consumer wealth effects. However, extreme complacency (VIX below 12, spreads at cycle tights) can itself be a contrarian warning of fragility.',
  };
  if (score >= 55) return {
    label: 'Calm, Spreads Tight',
    reasoning: 'Financial conditions are benign. Volatility is moderate, credit spreads are reasonable, and there are no signs of systemic stress. This is the normal state during a healthy expansion — markets are functioning well and not impeding economic activity. Credit is accessible and priced fairly. No financial headwinds to the real economy.',
  };
  if (score >= 45) return {
    label: 'Elevated Caution',
    reasoning: 'Financial stress is starting to build. Credit spreads are widening, volatility is above average, or the stress index is rising. This can reflect market uncertainty about the economic outlook or specific stress events (geopolitical, sector-specific). Mildly elevated stress doesn\'t necessarily cause a recession, but it tightens financial conditions — borrowing becomes more expensive, risk appetite contracts, and the financial channel begins to act as a headwind rather than a tailwind.',
  };
  if (score >= 30) return {
    label: 'Stress Rising',
    reasoning: 'Financial stress is clearly elevated. Credit spreads are significantly wider, VIX is high, and the stress index is positive. This means the financial system is under strain — credit conditions are tightening, risk assets are being repriced, and there is a tangible transmission mechanism from market stress to real economic activity. Businesses face higher borrowing costs, consumers feel poorer, and confidence erodes. This level of stress has historically either preceded or accompanied recession.',
  };
  return {
    label: 'Acute Stress',
    reasoning: 'Financial markets are in crisis mode. Credit spreads have blown out, VIX is spiking, and the stress index is deeply positive. This level of financial stress directly damages the real economy — credit markets can freeze, banks tighten lending, and a negative feedback loop between falling asset prices and deteriorating economic fundamentals takes hold. Historically seen during the GFC (2008), COVID crash (2020), and similar events. The financial system itself becomes a source of economic contraction.',
  };
};

const layer4Bands: BandFn = (score) => {
  if (score >= 70) return {
    label: 'Accommodative',
    reasoning: 'Policy conditions are highly supportive of growth. The Fed funds rate is low or being cut, inflation is well-contained, M2 is expanding, and the dollar is weakening. This is the policy configuration that fuels recoveries and expansions — cheap money, expanding liquidity, and competitive export conditions. The risk in this regime is that accommodation eventually fuels inflation or asset bubbles, but for now the policy wind is at the economy\'s back.',
  };
  if (score >= 55) return {
    label: 'Mildly Supportive',
    reasoning: 'Policy is leaning supportive but not aggressively so. Rates may be moderate, inflation is contained but not falling fast, and money supply growth is positive. This is typical of the middle phase of an easing cycle or early stages of a tightening cycle that hasn\'t yet become restrictive. The policy environment is not a headwind but not providing the strong tailwind of a full easing cycle.',
  };
  if (score >= 45) return {
    label: 'Neutral Stance',
    reasoning: 'Policy conditions are neither clearly supportive nor restrictive. The Fed may be on hold, inflation is moderate, and money supply growth is flat. This is a transitional state — either the Fed is pausing during a tightening cycle (watching data) or the economy is in a stable equilibrium that doesn\'t require policy intervention. The key question is direction: which way will the next move go?',
  };
  if (score >= 30) return {
    label: 'Restrictive',
    reasoning: 'Policy is actively tightening financial conditions. The Fed funds rate is elevated, inflation remains above target forcing continued hawkishness, the dollar is strong, and/or M2 is contracting. This configuration deliberately slows the economy — higher borrowing costs, reduced money supply, and a strong dollar all compress demand. The "long and variable lags" of monetary policy mean the full economic impact of current restriction may not be felt for another 6-18 months.',
  };
  return {
    label: 'Aggressively Tight',
    reasoning: 'Policy conditions are severely restrictive. The Fed is at peak hawkishness, inflation is elevated and sticky, M2 is contracting, and the dollar is very strong. This is the policy regime that breaks things — the deliberate overtightening needed to crush inflation comes at the cost of recession risk. Historically, aggressive Fed tightening cycles have ended with something breaking (2006-07 → housing, 2022-23 → regional banks). The question is not whether this causes economic damage, but how much.',
  };
};

const layer5Bands: BandFn = (score) => {
  if (score >= 65) return {
    label: 'Liquidity Expanding',
    reasoning: 'Liquidity conditions are strongly supportive. Global central bank balance sheets (Fed, ECB, BOJ) are expanding, Net Fed Liquidity is positive, bank credit is growing, and reserve balances are ample. In Howell\'s framework, liquidity expansion leads asset price appreciation by 1-3 months and economic growth by 3-6 months. This is the most favorable liquidity backdrop for risk assets.',
  };
  if (score >= 50) return {
    label: 'Liquidity Supportive',
    reasoning: 'Liquidity is mildly positive. Global CB balance sheets are stable or growing modestly, and the credit transmission channels (bank credit, commercial paper) are functioning normally. Reserves are adequate. This is a supportive but not exceptional liquidity environment — enough to sustain the current expansion but not enough to drive aggressive risk-on behavior. The key watch is direction: is liquidity improving toward expansion or plateauing before a turn?',
  };
  if (score >= 35) return {
    label: 'Liquidity Neutral',
    reasoning: 'Liquidity conditions are balanced — neither clearly supportive nor restrictive. This often occurs during transitions: the Fed may be pausing QT, the TGA may be rebuilding, or cross-CB signals are mixed (e.g., Fed contracting but ECB/BOJ expanding). The 8-series composite may be sending mixed signals. Neutral liquidity means the macro environment must be driven by fundamentals rather than the liquidity tide.',
  };
  if (score >= 20) return {
    label: 'Liquidity Tightening',
    reasoning: 'Liquidity is contracting. Global CB balance sheets are shrinking, NFL is declining, and bank credit may be tightening. In Howell\'s framework, liquidity tightening leads economic weakness by 3-6 months. This is a headwind for risk assets: even if the economy looks fine today, the plumbing is deteriorating beneath the surface.',
  };
  return {
    label: 'Liquidity Contracting',
    reasoning: 'Liquidity is in severe contraction across major central banks. NFL is deeply negative, bank credit is shrinking, and reserves may be approaching scarcity levels. This is the liquidity regime that breaks markets — the most dangerous macro backdrop because it can turn an economic slowdown into a financial crisis. The Fed typically responds with emergency facilities, which marks the eventual liquidity bottom.',
  };
};

const LAYER_BAND_FNS: Record<number, BandFn> = {
  1: layer1Bands,
  2: layer2Bands,
  3: layer3Bands,
  4: layer4Bands,
  5: layer5Bands,
};

/**
 * Build dynamic score attribution explaining WHY the layer score is what it is.
 * Shows weight distribution, which series are pulling the score up/down,
 * and flags internal divergence when a dominant series masks others.
 */
function buildScoreAttribution(series: SeriesResult[], layerScore: number): string {
  const valid = series.filter(s => !s.error && s.strength > 0);
  if (valid.length === 0) return '';

  const totalWeight = valid.reduce((s, r) => s + (SERIES_WEIGHTS[r.fredId] ?? 0.10), 0);

  // Sort by weight descending
  const sorted = [...valid].sort((a, b) =>
    (SERIES_WEIGHTS[b.fredId] ?? 0.10) - (SERIES_WEIGHTS[a.fredId] ?? 0.10)
  );

  // Classify each series
  const bullish = sorted.filter(s => s.adjustedScore >= 55);
  const bearish = sorted.filter(s => s.adjustedScore < 45);
  const neutral = sorted.filter(s => s.adjustedScore >= 45 && s.adjustedScore < 55);

  const parts: string[] = [];

  // Weight distribution overview
  const topSeries = sorted.slice(0, 3);
  const topWeightPct = topSeries.reduce((s, r) => s + (SERIES_WEIGHTS[r.fredId] ?? 0.10), 0) / totalWeight * 100;
  parts.push(`Score attribution: The top ${topSeries.length} series by weight (${topSeries.map(s => s.seriesName.split(' ').slice(0, 3).join(' ')).join(', ')}) carry ${topWeightPct.toFixed(0)}% of this layer's weight.`);

  // Key drivers
  if (bullish.length > 0) {
    const bullishWeightPct = bullish.reduce((s, r) => s + (SERIES_WEIGHTS[r.fredId] ?? 0.10), 0) / totalWeight * 100;
    const topBullish = bullish.slice(0, 3).map(s => {
      const wPct = ((SERIES_WEIGHTS[s.fredId] ?? 0.10) / totalWeight * 100).toFixed(0);
      return `${s.seriesName} at ${s.adjustedScore.toFixed(0)} (${wPct}% weight)`;
    });
    parts.push(`Pulling the score UP (${bullishWeightPct.toFixed(0)}% of layer weight): ${topBullish.join('; ')}.`);
  }

  if (bearish.length > 0) {
    const bearishWeightPct = bearish.reduce((s, r) => s + (SERIES_WEIGHTS[r.fredId] ?? 0.10), 0) / totalWeight * 100;
    const topBearish = bearish.slice(0, 3).map(s => {
      const wPct = ((SERIES_WEIGHTS[s.fredId] ?? 0.10) / totalWeight * 100).toFixed(0);
      return `${s.seriesName} at ${s.adjustedScore.toFixed(0)} (${wPct}% weight)`;
    });
    parts.push(`Pulling the score DOWN (${bearishWeightPct.toFixed(0)}% of layer weight): ${topBearish.join('; ')}.`);
  }

  // Divergence detection
  if (bullish.length > 0 && bearish.length > 0) {
    const bullAvg = bullish.reduce((s, r) => s + r.adjustedScore, 0) / bullish.length;
    const bearAvg = bearish.reduce((s, r) => s + r.adjustedScore, 0) / bearish.length;
    const spread = bullAvg - bearAvg;

    if (spread > 40) {
      // Check if divergence is high-weight bullish vs low-weight bearish or vice versa
      const bullWeight = bullish.reduce((s, r) => s + (SERIES_WEIGHTS[r.fredId] ?? 0.10), 0);
      const bearWeight = bearish.reduce((s, r) => s + (SERIES_WEIGHTS[r.fredId] ?? 0.10), 0);

      if (bullWeight > bearWeight * 1.5) {
        parts.push(`⚠ Internal divergence: The high-weight bullish series are masking significant weakness in ${bearish.length} other series. The headline score of ${layerScore.toFixed(1)} may overstate the layer's health — the bearish signals (averaging ${bearAvg.toFixed(0)}) should not be ignored. An intra-layer divergence penalty has been applied.`);
      } else if (bearWeight > bullWeight * 1.5) {
        parts.push(`⚠ Internal divergence: The high-weight bearish series are dominating despite ${bullish.length} series still showing strength. This is often an early warning — the dominant series tend to lead the rest. The layer score of ${layerScore.toFixed(1)} reflects this bearish pull from the most predictive indicators.`);
      } else {
        parts.push(`⚠ Internal divergence: The layer is split — ${bullish.length} series bullish (avg ${bullAvg.toFixed(0)}) vs ${bearish.length} bearish (avg ${bearAvg.toFixed(0)}). This conflict often signals a turning point. Watch which group the neutral series join next.`);
      }
    }
  }

  // Special L1 early warning pattern
  if (valid[0]?.layer === 1) {
    const umcsent = valid.find(s => s.fredId === 'UMCSENT');
    const restBullish = valid.filter(s => s.fredId !== 'UMCSENT' && s.adjustedScore >= 55);
    if (umcsent && umcsent.adjustedScore < 20 && restBullish.length >= 4) {
      parts.push(`Early warning pattern: Consumer sentiment (score ${umcsent.adjustedScore.toFixed(0)}) has collapsed while ${restBullish.length} other leading indicators remain green. This is a classic pre-recession pattern — sentiment leads hard data. Consumers cut spending before the official data confirms weakness. This divergence preceded every major market top in the 2000-2022 backtest period.`);
    }
  }

  // Special L2 INDPRO dominance note
  if (valid[0]?.layer === 2) {
    const indpro = valid.find(s => s.fredId === 'INDPRO');
    const others = valid.filter(s => s.fredId !== 'INDPRO');
    if (indpro && others.length > 0) {
      const othersAvg = others.reduce((s, r) => s + r.adjustedScore, 0) / others.length;
      if (Math.abs(indpro.adjustedScore - othersAvg) > 30) {
        const indproWPct = ((SERIES_WEIGHTS['INDPRO'] ?? 0.10) / totalWeight * 100).toFixed(0);
        parts.push(`INDPRO divergence: Industrial Production (${indpro.adjustedScore.toFixed(0)}, ${indproWPct}% weight) diverges ${(indpro.adjustedScore - othersAvg).toFixed(0)} points from the average of the other ${others.length} series (${othersAvg.toFixed(0)}). INDPRO is an NBER recession-dating series, but the labor market and income signals should not be ignored when they broadly disagree.`);
      }
    }
  }

  return parts.join(' ');
}

export function getLayerSummary(layer: number, score: number, series?: SeriesResult[]): LayerSummary | null {
  const fn = LAYER_BAND_FNS[layer];
  if (!fn) return null;
  const result = fn(score);

  // Add dynamic score attribution if series data is provided
  if (series && series.length > 0) {
    result.scoreAttribution = buildScoreAttribution(series, score);
  }

  return result;
}
