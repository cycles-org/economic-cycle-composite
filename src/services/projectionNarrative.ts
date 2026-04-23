/**
 * Projection Narrative Builder
 *
 * Generates verbal reasoning for why the regime is expected to shift,
 * which underlying cycle changes are driving it, and what real economic
 * data releases to monitor for confirmation.
 */

import type { ProjectionResult, SeriesProjection } from './projection';

// ── Per-series forward narrative fragments ────────────────────────

interface ForwardFragment {
  improving: string;     // score projected to rise 5+ pts
  stable: string;        // score projected to stay within ±5
  deteriorating: string; // score projected to fall 5+ pts
  /** Real-world data to watch for confirmation */
  confirmWatch: string;
}

const FORWARD_FRAGMENTS: Record<string, ForwardFragment> = {
  T10Y2Y: {
    improving: 'The yield curve (10Y-2Y) cycle is projected to steepen, signaling improving growth expectations',
    stable: 'The yield curve is expected to remain in its current configuration over the next 12 weeks',
    deteriorating: 'The yield curve cycle is projected to flatten or invert further, reinforcing recession risk',
    confirmWatch: 'Watch the weekly Treasury yield curve data — a sustained move above +25bps (10Y-2Y) would confirm steepening; a move below -25bps would confirm deepening inversion.',
  },
  T10Y3M: {
    improving: 'The near-term curve (10Y-3M) is projected to normalize, easing policy-rate-driven inversion',
    stable: 'The 10Y-3M spread is expected to hold steady',
    deteriorating: 'The 10Y-3M spread is projected to compress further, tightening near-term rate expectations',
    confirmWatch: 'Monitor Fed funds futures pricing and 3-month T-bill yields for confirmation of rate direction.',
  },
  ICSA: {
    improving: 'Initial jobless claims are projected to decline, indicating easing layoff pressure',
    stable: 'Initial claims are expected to remain in their current range',
    deteriorating: 'Initial claims are projected to rise, signaling accelerating layoffs',
    confirmWatch: 'Watch the weekly Thursday initial claims release. A sustained move above 250K would confirm deterioration; below 210K confirms improvement.',
  },
  CCSA: {
    improving: 'Continued claims are projected to fall, suggesting the labor market is reabsorbing displaced workers more quickly',
    stable: 'Continued claims are expected to remain at current levels',
    deteriorating: 'Continued claims are projected to rise, meaning displaced workers are unable to find new employment — a deepening labor market problem',
    confirmWatch: 'Monitor the weekly continued claims figure. A trend above 1.9M would confirm deterioration. Also watch the insured unemployment rate for context.',
  },
  UMCSENT: {
    improving: 'Consumer sentiment is projected to recover, suggesting households will regain confidence in the economic outlook',
    stable: 'Consumer sentiment is expected to remain near current levels',
    deteriorating: 'Consumer sentiment is projected to decline further, which would lead consumers to cut discretionary spending',
    confirmWatch: 'Watch the monthly University of Michigan Consumer Sentiment release (preliminary + final). A move above 70 would confirm recovery; below 55 signals deepening pessimism.',
  },
  USSLIND: {
    improving: 'The Conference Board Leading Index is projected to turn positive, a historically reliable recovery signal',
    stable: 'The LEI is expected to remain near its current level',
    deteriorating: 'The LEI is projected to continue declining — six consecutive monthly declines have preceded every recession',
    confirmWatch: 'Watch the monthly LEI release from The Conference Board. Six consecutive declines is the classic recession warning threshold.',
  },
  PERMIT: {
    improving: 'Building permits are projected to recover, indicating renewed interest-rate-sensitive housing activity',
    stable: 'Building permits are expected to hold at current levels',
    deteriorating: 'Building permits are projected to fall, signaling further contraction in the housing sector',
    confirmWatch: 'Monitor the monthly Census Bureau building permits release. A sustained move above 1.5M annualized confirms housing recovery.',
  },
  DGORDER: {
    improving: 'Durable goods orders are projected to accelerate, indicating businesses are ramping up capital investment',
    stable: 'Durable goods orders are expected to plateau near current levels',
    deteriorating: 'Durable goods orders are projected to decline, signaling businesses are pulling back on investment commitments',
    confirmWatch: 'Watch the monthly Census Bureau durable goods report, especially the ex-defense, ex-aircraft "core capital goods" subcomponent which best reflects true business investment intentions.',
  },
  JTSJOL: {
    improving: 'Job openings (JOLTS) are projected to increase, signaling renewed labor demand from employers',
    stable: 'Job openings are expected to remain near current levels',
    deteriorating: 'Job openings are projected to decline further — falling openings precede rising unemployment by 2-6 months',
    confirmWatch: 'Monitor the monthly JOLTS release (typically 2-month lag). Watch the openings-to-unemployed ratio — below 1.0 signals a labor market tipping point.',
  },
  INDPRO: {
    improving: 'Industrial production is projected to recover, indicating the manufacturing economy is turning up',
    stable: 'Industrial production is expected to hold steady',
    deteriorating: 'Industrial production is projected to decline — as an NBER recession-dating series, this would confirm the downturn is materializing in hard data',
    confirmWatch: 'Watch the monthly Federal Reserve Industrial Production release. Two consecutive monthly declines have historically confirmed manufacturing recession.',
  },
  PAYEMS: {
    improving: 'Nonfarm payrolls are projected to accelerate, broadening the employment expansion',
    stable: 'Payroll growth is expected to continue at the current pace',
    deteriorating: 'Nonfarm payrolls are projected to slow or turn negative — a critical confirmation of labor market deterioration',
    confirmWatch: 'Watch the monthly BLS Employment Situation report. Payroll growth below 100K/month signals a weakening labor market; negative prints confirm recession.',
  },
  DSPIC96: {
    improving: 'Real disposable income is projected to rise, boosting consumer purchasing power',
    stable: 'Real income growth is expected to remain tepid',
    deteriorating: 'Real income is projected to fall, which would erode the consumer spending base that drives 70% of GDP',
    confirmWatch: 'Monitor the monthly BEA Personal Income and Outlays report. Watch the real (inflation-adjusted) disposable income line specifically.',
  },
  UNRATE: {
    improving: 'The unemployment rate cycle is projected to improve (i.e., unemployment declining)',
    stable: 'The unemployment rate is expected to remain near current levels',
    deteriorating: 'The unemployment rate is projected to rise — watch for the Sahm Rule trigger (0.5pt rise from 12-month low)',
    confirmWatch: 'Watch the monthly BLS unemployment rate. The Sahm Rule (3-month average rises 0.5pt above 12-month low) is the most reliable real-time recession indicator.',
  },
  VIXCLS: {
    improving: 'Implied volatility (VIX) is projected to decline, reflecting calming market fear',
    stable: 'The VIX is expected to remain at current levels',
    deteriorating: 'The VIX cycle is projected to rise, signaling increasing market fear and hedging activity',
    confirmWatch: 'Monitor the daily VIX close. A sustained move above 25 confirms elevated stress; above 35 signals acute fear.',
  },
  STLFSI4: {
    improving: 'The St. Louis Financial Stress Index is projected to decline, signaling easing conditions',
    stable: 'Financial stress is expected to remain at current levels',
    deteriorating: 'Financial stress is projected to rise — positive readings (above zero) signal above-normal systemic stress',
    confirmWatch: 'Watch the weekly St. Louis Fed Financial Stress Index. Values above zero indicate above-average stress across 18 financial market indicators.',
  },
  BAA10Y: {
    improving: 'Investment-grade credit spreads are projected to tighten, reflecting improving confidence in corporate debt',
    stable: 'Credit spreads are expected to remain near current levels',
    deteriorating: 'Credit spreads are projected to widen, signaling rising default risk and tightening credit conditions for businesses',
    confirmWatch: 'Monitor Moody\'s Baa-10Y spread daily. A move above 250bps signals material credit stress; above 350bps is crisis territory.',
  },
  BAMLH0A0HYM2: {
    improving: 'High-yield spreads are projected to tighten, reflecting returning risk appetite',
    stable: 'High-yield spreads are expected to hold steady',
    deteriorating: 'High-yield spreads are projected to widen — the riskiest borrowers losing market access is a leading indicator of broader credit tightening',
    confirmWatch: 'Watch the ICE BofA HY OAS spread. Above 500bps signals stress; above 800bps signals crisis conditions.',
  },
  DFF: {
    improving: 'The Fed Funds rate cycle is projected to enter an easing phase, providing a monetary policy tailwind',
    stable: 'The Fed Funds rate is expected to hold at current levels',
    deteriorating: 'The Fed Funds cycle is projected to move toward further tightening or remain at peak restrictive levels',
    confirmWatch: 'Watch FOMC meeting decisions and CME FedWatch probabilities. Also monitor Fed governor speeches for forward guidance shifts.',
  },
  T5YIE: {
    improving: 'Breakeven inflation expectations are projected to stabilize at healthy levels, supporting reflation expectations',
    stable: 'Inflation expectations are expected to remain near current levels',
    deteriorating: 'Breakeven inflation is projected to fall, which could signal deflation fears or growth collapse',
    confirmWatch: 'Monitor the 5Y TIPS breakeven rate daily. A move below 1.5% signals deflation concern; above 3.0% signals inflation overshoot.',
  },
  CPIAUCSL: {
    improving: 'The CPI cycle is projected to moderate, easing the constraint on Fed policy',
    stable: 'Headline inflation is expected to remain at current levels',
    deteriorating: 'Headline CPI is projected to re-accelerate, which would force continued Fed hawkishness',
    confirmWatch: 'Watch the monthly BLS CPI release. Core CPI month-over-month above 0.3% signals sticky inflation; below 0.2% signals progress.',
  },
  CPILFESL: {
    improving: 'Core inflation is projected to decelerate, giving the Fed room to shift toward easing',
    stable: 'Core inflation is expected to remain sticky at current levels',
    deteriorating: 'Core inflation is projected to re-accelerate — this would be the most hawkish signal for Fed policy',
    confirmWatch: 'Watch the monthly core CPI and core PCE releases. The Fed targets core PCE — watch for sustained readings below 0.2% m/m as the "mission accomplished" signal.',
  },
  M2SL: {
    improving: 'M2 money supply growth is projected to return to positive territory, replenishing monetary fuel',
    stable: 'Money supply growth is expected to remain near current levels',
    deteriorating: 'M2 is projected to contract further — the 2022-2023 contraction was the first since the 1930s and preceded significant economic slowing',
    confirmWatch: 'Monitor the monthly Fed M2 release. Year-over-year M2 growth turning positive would be a significant inflection point.',
  },
  DTWEXBGS: {
    improving: 'The trade-weighted dollar is projected to weaken, loosening global financial conditions',
    stable: 'The dollar is expected to remain near current levels',
    deteriorating: 'The dollar is projected to strengthen further, tightening global conditions and pressuring US multinationals',
    confirmWatch: 'Monitor the daily DXY dollar index and trade-weighted broad dollar index. Watch for correlation with Fed rate expectations.',
  },
  // Liquidity series
  NFL: {
    improving: 'Net Fed Liquidity momentum is projected to turn positive, signaling the beginning of a new liquidity expansion — Howell\'s earliest recovery signal',
    stable: 'NFL momentum is expected to remain at current levels',
    deteriorating: 'NFL momentum is projected to decline further, deepening the liquidity drain on financial markets',
    confirmWatch: 'Monitor the weekly Fed H.4.1 balance sheet release (Thursday), daily ON RRP (NY Fed), and daily TGA balance. NFL = WALCL + SWPT - RRP - TGA. Watch for RRP declining below $200B and TGA drawdowns as positive catalysts.',
  },
  TOTBKCR: {
    improving: 'Total bank credit is projected to expand, indicating banks are beginning to lend more aggressively',
    stable: 'Bank credit growth is expected to remain at current levels',
    deteriorating: 'Bank credit is projected to contract, meaning banks are tightening lending standards — the liquidity pipeline to the real economy is closing',
    confirmWatch: 'Monitor the weekly Fed H.8 bank credit data and the quarterly Senior Loan Officer Survey (SLOOS) for lending standards.',
  },
  COMPOUT: {
    improving: 'Commercial paper issuance is projected to recover, indicating normalizing short-term funding markets',
    stable: 'Commercial paper outstanding is expected to remain stable',
    deteriorating: 'Commercial paper markets are projected to contract — historically a stress signal for corporate short-term funding',
    confirmWatch: 'Monitor the weekly Fed commercial paper outstanding release. Watch for signs of CP market stress alongside money market fund flows.',
  },
  WRMFNS: {
    improving: 'Retail money market fund flows are projected to increase, building cash reserves available for deployment',
    stable: 'Money market fund balances are expected to remain near current levels',
    deteriorating: 'Money market fund outflows are projected, potentially signaling cash being spent down rather than accumulated',
    confirmWatch: 'Monitor the weekly ICI money market fund flow data and Fed money stock releases.',
  },
  WRESBAL: {
    improving: 'Bank reserve balances are projected to increase, ensuring ample plumbing in the financial system',
    stable: 'Reserve balances are expected to remain at current levels',
    deteriorating: 'Reserve balances are projected to decline — watch for signs of reserve scarcity (repo rate spikes) as in September 2019',
    confirmWatch: 'Monitor the daily Fed reserve balance data. Watch SOFR and repo rates for signs of funding stress — spikes above the Fed funds target signal reserve scarcity.',
  },
};

// ── Narrative Classification ──────────────────────────────────────

function classifyDelta(current: number, projected: number): 'improving' | 'stable' | 'deteriorating' {
  const delta = projected - current;
  if (delta > 5) return 'improving';
  if (delta < -5) return 'deteriorating';
  return 'stable';
}

// ── Layer-Level Forward Narratives ────────────────────────────────

const LAYER_FORWARD_CONTEXT: Record<number, {
  improving: string;
  stable: string;
  deteriorating: string;
}> = {
  1: {
    improving: 'Leading indicators are projected to strengthen over the next 12 weeks. This would signal the forward economic outlook is improving — historically, rising leading indicators precede 6-12 months of better growth.',
    stable: 'Leading indicators are expected to maintain their current trajectory — no significant change in the forward economic outlook is projected from this layer.',
    deteriorating: 'Leading indicators are projected to weaken. This is the earliest macro warning — if confirmed, deterioration in coincident activity (jobs, production) would typically follow in 3-9 months.',
  },
  2: {
    improving: 'Coincident activity is projected to improve — production, employment, and income cycles are expected to strengthen, confirming the recovery signal from leading indicators.',
    stable: 'Coincident activity is expected to remain near current levels over the projection horizon.',
    deteriorating: 'Coincident activity is projected to weaken. If leading indicators have already deteriorated (L1 falling), this would confirm the downturn is moving from forecast to reality.',
  },
  3: {
    improving: 'Financial stress is projected to ease — credit spreads tightening and volatility declining would support risk asset recovery and cheaper corporate funding.',
    stable: 'Financial stress metrics are expected to remain at current levels — no major shift in market risk appetite is projected.',
    deteriorating: 'Financial stress is projected to increase — widening credit spreads and rising volatility would tighten financial conditions and create a headwind for the real economy.',
  },
  4: {
    improving: 'The policy/inflation environment is projected to become more supportive — either through falling inflation (giving the Fed room to ease) or actual rate cuts.',
    stable: 'Policy conditions are expected to remain in their current configuration — no significant shift in monetary policy stance is projected.',
    deteriorating: 'Policy conditions are projected to tighten further — rising inflation or continued Fed hawkishness would extend the restrictive monetary environment.',
  },
  5: {
    improving: 'Liquidity conditions are projected to improve. In Howell\'s framework, improving liquidity leads equity markets by ~6 weeks and the real economy by 3-6 months — this would be the earliest signal of a macro turn.',
    stable: 'Liquidity conditions are expected to remain at current levels — the funding environment is neither improving nor deteriorating over the projection horizon.',
    deteriorating: 'Liquidity conditions are projected to deteriorate further. Contracting liquidity typically leads economic weakness by 3-6 months, and equity markets feel the impact within ~6 weeks.',
  },
};

// ── Main Narrative Builder ────────────────────────────────────────

export function buildProjectionNarrative(projection: ProjectionResult): {
  headline: string;
  body: string;
  keyDrivers: string[];
  watchList: string[];
} {
  const { projectedCompositeScores, projectedRegimes, regimeChanges, overallTrend, layers, confidence } = projection;

  const finalScore = projectedCompositeScores[projectedCompositeScores.length - 1];
  const finalRegime = projectedRegimes[projectedRegimes.length - 1];
  const currentRegime = regimeChanges.length > 0 ? regimeChanges[0].fromRegime : finalRegime;

  // ── Headline ──
  let headline: string;
  if (regimeChanges.length > 0) {
    const firstChange = regimeChanges[0];
    headline = `Regime shift projected: ${firstChange.fromRegime} → ${firstChange.toRegime} within ~${firstChange.atWeek} weeks (projected score ${firstChange.projectedScore.toFixed(1)}). Projection confidence: ${(confidence * 100).toFixed(0)}%.`;
  } else if (overallTrend === 'improving') {
    headline = `The current ${currentRegime} regime is projected to strengthen over the next 12 weeks (score moving toward ${finalScore.toFixed(1)}). No regime change expected. Confidence: ${(confidence * 100).toFixed(0)}%.`;
  } else if (overallTrend === 'deteriorating') {
    headline = `The current ${currentRegime} regime is projected to weaken over the next 12 weeks (score declining toward ${finalScore.toFixed(1)}). Confidence: ${(confidence * 100).toFixed(0)}%.`;
  } else {
    headline = `The current ${currentRegime} regime is projected to remain stable through the 12-week horizon. Confidence: ${(confidence * 100).toFixed(0)}%.`;
  }

  // ── Identify key layer drivers ──
  const layersByImpact = [...layers]
    .map(lp => ({
      ...lp,
      delta: lp.projectedScores[lp.projectedScores.length - 1] - lp.currentScore,
      absDelta: Math.abs(lp.projectedScores[lp.projectedScores.length - 1] - lp.currentScore),
    }))
    .sort((a, b) => b.absDelta - a.absDelta);

  // ── Build body paragraphs ──
  const bodyParts: string[] = [];

  // Main drivers (top 2-3 layers with significant movement)
  const significantLayers = layersByImpact.filter(l => l.absDelta >= 2);

  if (significantLayers.length > 0) {
    bodyParts.push('**Key drivers of the projected change:**');

    for (const lp of significantLayers.slice(0, 3)) {
      const ctx = LAYER_FORWARD_CONTEXT[lp.layer];
      if (ctx) {
        bodyParts.push(`*L${lp.layer} ${lp.layerName}* (${lp.currentScore.toFixed(1)} → ${lp.projectedScores[lp.projectedScores.length - 1].toFixed(1)}): ${ctx[lp.trend]}`);
      }
    }
  } else {
    bodyParts.push('No individual layer is projected to move significantly over the 12-week horizon. The current reading reflects a stable cyclical configuration where dominant cycles are either mid-phase (not near turning points) or canceling each other out across layers.');
  }

  // ── Identify most impactful series changes ──
  const keyDrivers: string[] = [];
  const watchList: string[] = [];

  // Collect all series projections across layers, sort by absolute impact
  const allSeries: (SeriesProjection & { layerWeight: number })[] = [];
  for (const lp of layers) {
    const layerWeight = lp.layer <= 4 ? { 1: 0.30, 2: 0.15, 3: 0.20, 4: 0.10 }[lp.layer] ?? 0.10 : 0.25;
    for (const sp of lp.seriesProjections) {
      if (sp.projectionWeight > 0) {
        allSeries.push({ ...sp, layerWeight });
      }
    }
  }

  const sortedSeries = allSeries
    .map(s => ({
      ...s,
      delta: s.projectedScores[s.projectedScores.length - 1] - s.currentScore,
      absDelta: Math.abs(s.projectedScores[s.projectedScores.length - 1] - s.currentScore),
      compositeImpact: Math.abs(s.projectedScores[s.projectedScores.length - 1] - s.currentScore) * s.projectionWeight * s.layerWeight,
    }))
    .sort((a, b) => b.compositeImpact - a.compositeImpact);

  // Top 5 series by composite impact
  const topSeries = sortedSeries.slice(0, 5).filter(s => s.absDelta >= 3);

  if (topSeries.length > 0) {
    bodyParts.push('');
    bodyParts.push('**Individual series driving the projection:**');

    for (const s of topSeries) {
      const frag = FORWARD_FRAGMENTS[s.fredId];
      if (frag) {
        const direction = classifyDelta(s.currentScore, s.projectedScores[s.projectedScores.length - 1]);
        keyDrivers.push(`${s.seriesName}: ${frag[direction]} (${s.currentScore.toFixed(0)} → ${s.projectedScores[s.projectedScores.length - 1].toFixed(0)})`);
        watchList.push(`**${s.seriesName}:** ${frag.confirmWatch}`);
      }
    }

    bodyParts.push(keyDrivers.join('. ') + '.');
  }

  // ── Structural cycle context (NFL only) ──
  const nflProjection = allSeries.find(s => s.fredId === 'NFL');
  if (nflProjection?.structuralRegime) {
    bodyParts.push('');
    bodyParts.push('**Structural liquidity cycle (~65-month Howell cycle):**');
    if (nflProjection.structuralRegime === 'contraction') {
      bodyParts.push(`The long-term structural liquidity cycle is in its contraction phase (score ${nflProjection.structuralPhaseScore?.toFixed(0)}). Any short-term operational liquidity improvements projected above should be interpreted as counter-trend bounces within a structurally tightening regime — not the beginning of a new liquidity expansion. The structural cycle moves slowly and is unlikely to reverse within the 12-week projection window. Projected liquidity scores are capped to reflect this structural ceiling.`);
    } else if (nflProjection.structuralRegime === 'expansion') {
      bodyParts.push(`The long-term structural liquidity cycle is in its expansion phase (score ${nflProjection.structuralPhaseScore?.toFixed(0)}). Short-term operational dips in liquidity are likely to be temporary pullbacks within a structurally supportive regime. The structural cycle provides a floor beneath any projected liquidity weakness. This is the configuration where Howell's framework is most bullish for risk assets on a multi-quarter basis.`);
    } else {
      bodyParts.push(`The long-term structural liquidity cycle is in a transition zone (score ${nflProjection.structuralPhaseScore?.toFixed(0)}). The structural regime is neither clearly expansionary nor contractionary — direction will be determined by the next few months of Fed balance sheet operations, TGA flows, and RRP dynamics. Operational cycle signals carry more weight during transitions.`);
    }
  }

  // ── Confirmation watchlist ──
  if (watchList.length > 0) {
    bodyParts.push('');
    bodyParts.push('**What to monitor for confirmation:**');
    bodyParts.push('The projection is based on cycle phase progression — it assumes current cycles persist. To confirm or reject the projected trajectory, monitor these real-world data releases:');
    for (const w of watchList) {
      bodyParts.push('• ' + w);
    }
  }

  // ── Caveats ──
  if (confidence < 0.4) {
    bodyParts.push('');
    bodyParts.push(`*Note: Projection confidence is low (${(confidence * 100).toFixed(0)}%) because key series have unstable cycles. The forward estimate should be treated as directional guidance only, not a reliable point forecast.*`);
  }

  return {
    headline,
    body: bodyParts.join('\n'),
    keyDrivers,
    watchList,
  };
}
