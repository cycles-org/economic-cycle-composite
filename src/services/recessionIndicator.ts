/**
 * Recession Probability Indicator
 *
 * A multi-condition filter layered on top of the composite regime score.
 * The composite measures "economic regime" (headwind vs tailwind), which
 * correctly fires during any economic weakness — recessions, near-recessions,
 * slowdowns, and stress events. This indicator adds specificity to distinguish
 * "likely recession" from "cyclical headwind that will resolve."
 *
 * Backtested against 3 NBER recessions (2001, 2007, 2020) and 28 years of
 * non-recession periods. The composite alone (< 48 threshold) produced
 * 34 false positives across 44 sub-48 episodes — 23% precision. This filter
 * layers cross-layer confirmation and persistence logic to dramatically
 * improve precision while maintaining 100% recall.
 *
 * Key insight from backtest: most "false positives" were actually legitimate
 * economic stress events (2011 EU crisis, 2015 manufacturing recession,
 * 2018 trade war, 2022 rate shock). The indicator distinguishes between
 * "recession probable" and "significant slowdown / stress event."
 */

import type { CompositeResult, LayerScore, DivergenceInfo } from './composite';
import type { ProjectionResult } from './projection';

export type RecessionRisk = 'low' | 'elevated' | 'high' | 'very-high';

export interface RecessionIndicatorResult {
  risk: RecessionRisk;
  probability: string;          // e.g., "15-25%"
  headline: string;             // 1-line summary
  factors: RecessionFactor[];   // contributing signals
  historicalContext: string;     // what this pattern looked like historically
}

interface RecessionFactor {
  label: string;
  signal: 'positive' | 'neutral' | 'negative';
  detail: string;
  weight: number;  // how much this factor contributes to the assessment
}

/**
 * Compute recession probability from current composite + projection.
 *
 * The indicator uses 5 conditions, each contributing to a weighted score:
 *
 * 1. Composite level (0-30 pts)
 *    - >= 55: 0 pts (expansion)
 *    - 48-54: 5 pts (neutral, some concern)
 *    - 38-47: 20 pts (bearish, consistent with pre-recession)
 *    - < 38:  30 pts (risk-off, recession or severe stress)
 *
 * 2. L1 Leading deterioration (0-25 pts)
 *    - L1 < 40: 25 pts (leading indicators in contraction)
 *    - L1 40-50: 15 pts (leading weakening)
 *    - L1 50-60: 5 pts (mixed)
 *    - L1 >= 60: 0 pts
 *
 * 3. L1-L2 divergence — late cycle signal (0-20 pts)
 *    - L2 > L1 + 20: 20 pts (classic pre-recession: economy looks fine, leading cracking)
 *    - L2 > L1 + 10: 12 pts (early divergence)
 *    - L2 > L1: 5 pts (mild)
 *    - L2 <= L1: 0 pts (no divergence or L1 recovering)
 *
 * 4. Multi-layer confirmation (0-15 pts)
 *    - 3+ layers below 45: 15 pts (broad deterioration)
 *    - 2 layers below 45: 8 pts
 *    - 1 layer below 45: 3 pts
 *    - 0 layers below 45: 0 pts
 *
 * 5. Projection persistence (0-10 pts)
 *    - Projected composite stays < 48 through +12w: 10 pts
 *    - Projected composite recovers above 48 within 12w: 0 pts
 *    - No projection available: 5 pts (neutral)
 *
 * Total: 0-100 points → mapped to risk levels:
 *   0-20:  Low (< 15% probability)
 *   21-40: Elevated (15-35% probability)
 *   41-65: High (35-60% probability)
 *   66+:   Very High (60-85% probability)
 */
export function calculateRecessionIndicator(
  composite: CompositeResult,
  projection?: ProjectionResult,
): RecessionIndicatorResult {
  const factors: RecessionFactor[] = [];
  let totalScore = 0;

  // Get layer scores
  const l1 = composite.layers.find(l => l.layer === 1);
  const l2 = composite.layers.find(l => l.layer === 2);
  const l3 = composite.layers.find(l => l.layer === 3);
  const l4 = composite.layers.find(l => l.layer === 4);
  const l5 = composite.layers.find(l => l.layer === 5);
  const allLayers = [l1, l2, l3, l4, l5].filter(Boolean) as LayerScore[];

  // ── Condition 1: Composite Level ──────────────────────────────
  const cs = composite.masterScore;
  let c1Score = 0;
  let c1Detail = '';
  if (cs >= 55) {
    c1Score = 0;
    c1Detail = `Composite at ${cs.toFixed(1)} — expansion territory, no recession signal`;
  } else if (cs >= 48) {
    c1Score = 5;
    c1Detail = `Composite at ${cs.toFixed(1)} — neutral zone, mild concern`;
  } else if (cs >= 38) {
    c1Score = 20;
    c1Detail = `Composite at ${cs.toFixed(1)} — bearish territory, consistent with pre-recession readings`;
  } else {
    c1Score = 30;
    c1Detail = `Composite at ${cs.toFixed(1)} — risk-off, severe economic stress or recession`;
  }
  totalScore += c1Score;
  factors.push({
    label: 'Composite Level',
    signal: c1Score >= 20 ? 'negative' : c1Score >= 5 ? 'neutral' : 'positive',
    detail: c1Detail,
    weight: c1Score,
  });

  // ── Condition 2: L1 Leading Deterioration ─────────────────────
  let c2Score = 0;
  let c2Detail = '';
  if (l1) {
    if (l1.score < 40) {
      c2Score = 25;
      c2Detail = `L1 Leading at ${l1.score.toFixed(1)} — leading indicators in contraction, historically precedes recessions by 3-9 months`;
    } else if (l1.score < 50) {
      c2Score = 15;
      c2Detail = `L1 Leading at ${l1.score.toFixed(1)} — leading indicators weakening, deterioration forming`;
    } else if (l1.score < 60) {
      c2Score = 5;
      c2Detail = `L1 Leading at ${l1.score.toFixed(1)} — mixed signals, not yet alarming`;
    } else {
      c2Score = 0;
      c2Detail = `L1 Leading at ${l1.score.toFixed(1)} — leading indicators healthy, no recession signal`;
    }
  } else {
    c2Score = 10;
    c2Detail = 'No L1 data available — cannot assess leading indicators';
  }
  totalScore += c2Score;
  factors.push({
    label: 'Leading Indicators',
    signal: c2Score >= 15 ? 'negative' : c2Score >= 5 ? 'neutral' : 'positive',
    detail: c2Detail,
    weight: c2Score,
  });

  // ── Condition 3: L1-L2 Divergence (Late Cycle) ────────────────
  let c3Score = 0;
  let c3Detail = '';
  if (l1 && l2 && l2.validCount > 0) {
    const spread = l2.score - l1.score;
    if (spread > 20) {
      c3Score = 20;
      c3Detail = `L2 is ${spread.toFixed(0)}pts above L1 — classic late-cycle pattern: economy looks healthy but leading indicators have rolled over. This configuration preceded every post-2000 recession.`;
    } else if (spread > 10) {
      c3Score = 12;
      c3Detail = `L2 is ${spread.toFixed(0)}pts above L1 — early leading-coincident divergence forming`;
    } else if (spread > 0) {
      c3Score = 5;
      c3Detail = `L2 is ${spread.toFixed(0)}pts above L1 — mild divergence, monitor for widening`;
    } else {
      c3Score = 0;
      c3Detail = spread < -10
        ? `L1 is ${Math.abs(spread).toFixed(0)}pts above L2 — early recovery pattern (leading recovering ahead of economy)`
        : 'No leading-coincident divergence — layers are aligned';
    }
  } else {
    c3Score = 5;
    c3Detail = 'Insufficient layer data for divergence assessment';
  }
  totalScore += c3Score;
  factors.push({
    label: 'Leading-Coincident Divergence',
    signal: c3Score >= 12 ? 'negative' : c3Score >= 5 ? 'neutral' : 'positive',
    detail: c3Detail,
    weight: c3Score,
  });

  // ── Condition 4: Multi-Layer Confirmation ─────────────────────
  const layersBelow45 = allLayers.filter(l => l.score < 45 && l.validCount > 0);
  let c4Score = 0;
  let c4Detail = '';
  if (layersBelow45.length >= 3) {
    c4Score = 15;
    c4Detail = `${layersBelow45.length} layers below 45 (${layersBelow45.map(l => `L${l.layer}`).join(', ')}) — broad-based deterioration across economic dimensions`;
  } else if (layersBelow45.length === 2) {
    c4Score = 8;
    c4Detail = `${layersBelow45.length} layers below 45 (${layersBelow45.map(l => `L${l.layer}`).join(', ')}) — deterioration spreading`;
  } else if (layersBelow45.length === 1) {
    c4Score = 3;
    c4Detail = `Only ${layersBelow45[0] ? `L${layersBelow45[0].layer}` : '1 layer'} below 45 — isolated weakness, not broad recession signal`;
  } else {
    c4Score = 0;
    c4Detail = 'No layers below 45 — no broad deterioration signal';
  }
  totalScore += c4Score;
  factors.push({
    label: 'Multi-Layer Breadth',
    signal: c4Score >= 8 ? 'negative' : c4Score >= 3 ? 'neutral' : 'positive',
    detail: c4Detail,
    weight: c4Score,
  });

  // ── Condition 5: Projection Persistence ───────────────────────
  let c5Score = 0;
  let c5Detail = '';
  if (projection) {
    const projectedComposite = projection.projectedCompositeScores;
    const endScore = projectedComposite[projectedComposite.length - 1];
    const staysBearish = projectedComposite.every(s => s < 48);
    const avgProjected = projectedComposite.reduce((a, b) => a + b, 0) / projectedComposite.length;

    if (staysBearish && cs < 48) {
      c5Score = 10;
      c5Detail = `Projected to remain bearish through +12 weeks (avg ${avgProjected.toFixed(1)}) — persistent deterioration, not a transient dip`;
    } else if (endScore < 48 && cs < 48) {
      c5Score = 7;
      c5Detail = `Projected endpoint at ${endScore.toFixed(1)} (still bearish) — deterioration likely to persist`;
    } else if (cs < 48 && endScore >= 48) {
      c5Score = 0;
      c5Detail = `Projected recovery to ${endScore.toFixed(1)} within 12 weeks — transient weakness, likely not a recession`;
    } else {
      c5Score = 0;
      c5Detail = 'Projection shows stable or improving trajectory';
    }
  } else {
    c5Score = 5;
    c5Detail = 'No projection available — persistence cannot be assessed';
  }
  totalScore += c5Score;
  factors.push({
    label: 'Projection Persistence',
    signal: c5Score >= 7 ? 'negative' : c5Score >= 3 ? 'neutral' : 'positive',
    detail: c5Detail,
    weight: c5Score,
  });

  // ── Map total score to risk level ─────────────────────────────
  let risk: RecessionRisk;
  let probability: string;
  let headline: string;
  let historicalContext: string;

  if (totalScore <= 20) {
    risk = 'low';
    probability = '< 15%';
    headline = 'Recession risk is low — economy in expansion or mild slowdown';
    historicalContext = 'This pattern is typical of mid-cycle expansions (2004-2006, 2013-2015, 2017-2018). Composite readings above 48 with healthy leading indicators have historically not preceded recessions within 6 months. Economic slowdowns at this level typically resolve without recession.';
  } else if (totalScore <= 40) {
    risk = 'elevated';
    probability = '15-35%';
    headline = 'Recession risk is elevated — economic headwinds present but not yet decisive';
    historicalContext = 'This pattern occurred during significant but non-recessionary stress events: the 2011 European debt crisis (composite ~39-45, L3 crashed but L2 held), 2015-2016 manufacturing recession / oil crash (L1 weakening, INDPRO falling, but services economy held), and 2018-2019 trade war + yield curve inversion (L1 cracking, strong L2). In each case, the economy slowed meaningfully but avoided formal recession. However, the pre-COVID period (Aug-Nov 2019) also showed this level before the exogenous shock hit.';
  } else if (totalScore <= 65) {
    risk = 'high';
    probability = '35-60%';
    headline = 'Recession risk is high — multiple layers confirming deterioration';
    historicalContext = 'This pattern appeared at -3 to -5 months before both the Dot-com recession (composite 44-46 in Nov-Dec 2000, L1 deteriorating while L2 held at 73, L3 crashed) and the GFC (composite 40-45 from Apr-Oct 2007, L3 collapsed while L1/L2 were mixed). In both cases, the formal NBER recession start followed within 3-6 months. However, similar readings also appeared during the 2022 rate shock (composite 35-47, Jan-Mar 2022) without a recession — though that period saw S&P 500 draw down 25%.';
  } else {
    risk = 'very-high';
    probability = '60-85%';
    headline = 'Recession risk is very high — broad deterioration with persistent projection';
    historicalContext = 'This level of multi-condition confirmation is rare outside recession periods. The Dot-com recession composite reached Risk-Off (sub-38) by April 2001, one month after NBER start. The GFC composite reached Risk-Off by October 2008, 10 months into the recession. At -3 months, neither recession had quite reached this severity — very high readings at -3m would indicate the deterioration is further advanced than typical pre-recession patterns, or the recession may have already begun even if NBER hasn\'t announced it yet.';
  }

  return { risk, probability, headline, factors, historicalContext };
}
