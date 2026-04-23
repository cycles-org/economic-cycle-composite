/**
 * Per-series economic descriptions for the info overlay.
 * Each entry explains what the series measures, its role in the model,
 * and how to interpret its current score.
 */

export interface SeriesDescription {
  what: string;          // What this series measures
  modelRole: string;     // How it fits into the composite model
  interpretation: string; // How to read score direction (high = good / inverted logic)
  leadLag: string;       // Timing characteristic
}

export const SERIES_DESCRIPTIONS: Record<string, SeriesDescription> = {
  // ── Layer 1 — Leading Indicators ──────────────────────────────

  T10Y2Y: {
    what: 'The spread between 10-year and 2-year Treasury yields. When positive, longer-term rates exceed short-term rates (normal curve). When negative (inverted), recession risk rises sharply.',
    modelRole: 'Classic leading indicator. Yield curve inversions have preceded every US recession since the 1960s with a 12-18 month lead. Signals the market\'s expectation of future Fed rate cuts (i.e., economic weakness ahead).',
    interpretation: 'High score = steep/normal curve = expansionary expectations. Low score = inverted/flat curve = the bond market is pricing in a downturn. The cycle phase captures the turning points — a curve that is re-steepening from inversion often marks the onset of recession.',
    leadLag: 'Leads the economy by 12-18 months.',
  },

  T10Y3M: {
    what: 'The spread between 10-year and 3-month Treasury yields. Similar to 10Y-2Y but uses the overnight-rate-sensitive 3-month bill, making it more directly tied to Fed policy.',
    modelRole: 'Complementary curve measure. The 10Y-3M spread has an even stronger empirical recession-prediction record than 10Y-2Y in academic studies (Estrella & Mishkin). Its inversion is more mechanically linked to Fed overtightening.',
    interpretation: 'High score = normal curve, economy expected to grow. Low score = inverted, Fed policy is restrictive relative to growth expectations. Both curve measures together provide robustness — if they disagree, the signal is weaker.',
    leadLag: 'Leads the economy by 12-18 months.',
  },

  ICSA: {
    what: 'Weekly count of new unemployment insurance claims filed. This is the most timely labor market indicator available — released every Thursday with only a 5-day lag.',
    modelRole: 'High-frequency leading indicator. Rising claims are the first hard evidence of layoffs accelerating. Inverted in the model (rising claims = falling score) because higher claims = weaker economy.',
    interpretation: 'High score = claims are low/falling = healthy labor demand. Low score = claims rising = employers are cutting jobs. Sustained moves above 300K historically signal recession. The weekly frequency makes this one of the most responsive series in the composite.',
    leadLag: 'Leads turning points by 1-3 months.',
  },

  CCSA: {
    what: 'Number of people continuously receiving unemployment benefits. While initial claims capture layoff speed, continued claims capture the difficulty of finding re-employment.',
    modelRole: 'Leading indicator with high optimized weight (1.5×). When continued claims rise, it means not just that layoffs are happening but that displaced workers cannot find new jobs — a deeper signal of labor market deterioration.',
    interpretation: 'High score = few people on continuing benefits = strong job market with easy re-employment. Low score = rising continued claims = labor market is weakening and absorbing fewer workers. Inverted in the model.',
    leadLag: 'Leads by 1-4 months, slightly laggier than initial claims.',
  },

  UMCSENT: {
    what: 'University of Michigan survey measuring consumer confidence about personal finances and business conditions. Covers both current assessment and forward expectations.',
    modelRole: 'Leading indicator with high optimized weight (1.5×). Consumer sentiment leads spending decisions — when consumers feel pessimistic, they pull back on discretionary spending, which ripples through 70% of GDP.',
    interpretation: 'High score = consumers are confident, willing to spend and take on risk. Low score = consumers are pessimistic, cutting back. Extreme lows (below 60 on the raw index) have historically coincided with or preceded recessions.',
    leadLag: 'Leads consumer spending by 2-4 months.',
  },

  USSLIND: {
    what: 'The Conference Board Leading Economic Index — a composite of 10 components including building permits, stock prices, credit, manufacturing hours, and consumer expectations.',
    modelRole: 'Meta-leading indicator. Essentially a pre-built composite of other leading indicators. Provides diversification and captures signals from components not individually included in the model (e.g., average weekly hours, stock prices, ISM new orders).',
    interpretation: 'High score = the broad basket of leading indicators is expanding. Low score = the LEI is contracting, which has preceded every recession. Six consecutive monthly declines in the raw LEI is a well-known recession warning.',
    leadLag: 'Leads recessions by 7-12 months on average.',
  },

  PERMIT: {
    what: 'New residential building permits issued. A forward-looking housing indicator — permits must be obtained before construction begins, so they capture housing activity intentions.',
    modelRole: 'Leading indicator for the interest-rate-sensitive housing sector. Housing is the most cyclically sensitive sector of the economy and typically turns before the broader economy. Permits capture developer confidence and demand for new housing.',
    interpretation: 'High score = strong permit issuance = developers see demand, rates are accommodative. Low score = permits declining = housing is contracting, often due to rate hikes. Housing downturns have preceded 8 of the last 10 recessions.',
    leadLag: 'Leads GDP by 3-6 months.',
  },

  DGORDER: {
    what: 'New orders for manufactured durable goods (items with >3 year lifespan: machinery, vehicles, appliances). Captures business and consumer investment intentions.',
    modelRole: 'Leading indicator with high optimized weight (1.5×). Durable goods orders reflect capex decisions and big-ticket consumer spending. When businesses stop ordering capital equipment, it signals expected demand weakness.',
    interpretation: 'High score = strong order flow = businesses investing in capacity, consumers buying big-ticket items. Low score = order decline = businesses pulling back on investment, demand weakening.',
    leadLag: 'Leads industrial production by 2-4 months.',
  },

  JTSJOL: {
    what: 'Total job openings from the JOLTS survey (Job Openings and Labor Turnover Survey). Measures employer demand for labor across all sectors.',
    modelRole: 'Leading indicator capturing labor demand. When job openings decline, it signals that employers are reducing hiring plans before actual layoffs begin. The openings-to-unemployed ratio is a key gauge of labor market tightness.',
    interpretation: 'High score = abundant job openings = strong labor demand. Low score = openings declining = employers pulling back. A declining trend in JOLTS often precedes rising unemployment by several months.',
    leadLag: 'Leads unemployment changes by 2-6 months.',
  },

  // ── Layer 2 — Coincident Activity ─────────────────────────────

  INDPRO: {
    what: 'Federal Reserve index measuring real output of manufacturing, mining, and utilities. Directly measures physical production in the economy.',
    modelRole: 'Coincident indicator with high optimized weight (1.5×). Industrial production is one of the NBER\'s four key series for dating recessions. It confirms whether the economy is actually contracting, not just expected to.',
    interpretation: 'High score = industrial output expanding = economy is producing more goods. Low score = output contracting = recession is likely underway or imminent. This is a hard data series — unlike surveys, it measures actual activity.',
    leadLag: 'Coincident — moves with the business cycle in real time.',
  },

  PAYEMS: {
    what: 'Total nonfarm payroll employment from the BLS establishment survey. The single most-watched economic indicator — the monthly "jobs number."',
    modelRole: 'Coincident indicator confirming the breadth of economic activity. Payrolls are a direct measure of whether businesses are expanding or contracting their workforce. One of the four NBER recession-dating series.',
    interpretation: 'High score = employment growing = broad economic strength. Low score = payrolls stalling or declining = the economy is weakening across sectors. Payroll declines have coincided with every recession.',
    leadLag: 'Coincident — confirms the current state of the business cycle.',
  },

  DSPIC96: {
    what: 'Real (inflation-adjusted) disposable personal income. Measures the actual purchasing power available to consumers after taxes and inflation.',
    modelRole: 'Coincident indicator of consumer spending power. Since consumption is ~70% of GDP, real income directly constrains how much the economy can grow. A decline means consumers are losing purchasing power.',
    interpretation: 'High score = real incomes growing = consumers can sustain spending. Low score = real income stagnant/falling = consumers are being squeezed by inflation or wage stagnation.',
    leadLag: 'Coincident to slightly lagging.',
  },

  UNRATE: {
    what: 'Civilian unemployment rate from the BLS household survey. The percentage of the labor force that is actively seeking but unable to find employment.',
    modelRole: 'Coincident indicator, inverted (rising unemployment = falling score). Unemployment confirms whether the labor market deterioration signaled by leading indicators (ICSA, JOLTS) has materialized. One of the four NBER recession-dating series.',
    interpretation: 'High score = low unemployment = strong labor market. Low score = unemployment rising = recession is underway. The Sahm Rule (0.5pt rise from 12-month low) is a well-known real-time recession indicator.',
    leadLag: 'Coincident to slightly lagging — confirms the turn.',
  },

  // ── Layer 3 — Financial Stress / Risk Appetite ────────────────

  VIXCLS: {
    what: 'CBOE Volatility Index — the market\'s 30-day implied volatility derived from S&P 500 option prices. Often called the "fear gauge."',
    modelRole: 'Stress indicator, inverted (high VIX = low score). Captures real-time market fear and risk appetite. When the VIX spikes, it signals that institutional investors are hedging aggressively — financial conditions are tightening via the risk channel.',
    interpretation: 'High score = low VIX = calm markets, risk appetite is healthy. Low score = elevated VIX = fear in markets, potential contagion to the real economy via tighter credit and falling asset prices.',
    leadLag: 'Real-time stress gauge, sometimes leads by weeks.',
  },

  STLFSI4: {
    what: 'St. Louis Fed Financial Stress Index — a composite of 18 weekly financial market series including yield spreads, volatility, and credit metrics. Zero = normal conditions.',
    modelRole: 'Stress indicator, inverted (positive FSI = low score). A broader financial stress measure than VIX alone — captures bond market stress, interbank lending tension, and equity risk premia simultaneously.',
    interpretation: 'High score = negative FSI = below-normal financial stress = accommodative conditions. Low score = elevated FSI = financial stress is rising, credit conditions tightening across markets.',
    leadLag: 'Near real-time, weekly frequency.',
  },

  BAA10Y: {
    what: 'Spread between Moody\'s Baa corporate bond yield and the 10-year Treasury. Measures the credit risk premium that investors demand for holding investment-grade corporate debt.',
    modelRole: 'Stress indicator with high optimized weight (1.5×), inverted. Credit spreads are one of the most reliable financial indicators of recession. Widening spreads mean investors are demanding more compensation for default risk — a sign of deteriorating confidence in corporate health.',
    interpretation: 'High score = tight spreads = investors are comfortable with corporate risk. Low score = widening spreads = credit market stress, default fears rising. Spread blowouts have preceded or coincided with every major downturn.',
    leadLag: 'Leads recessions by 1-6 months via the credit channel.',
  },

  BAMLH0A0HYM2: {
    what: 'ICE BofA High Yield Option-Adjusted Spread — the credit spread on below-investment-grade (junk) corporate bonds over Treasuries.',
    modelRole: 'Stress indicator with high optimized weight (1.35×), inverted. High-yield spreads are more sensitive than investment-grade because junk bonds are first to reprice in a downturn. A widening signals that the weakest corporate borrowers are losing market access.',
    interpretation: 'High score = tight HY spreads = risk appetite is strong, even weak borrowers can fund cheaply. Low score = spreads blowing out = credit stress, potential for a credit crunch affecting the real economy.',
    leadLag: 'Leads recessions by 1-4 months.',
  },

  // ── Layer 4 — Inflation / Policy Regime ───────────────────────

  DFF: {
    what: 'Federal funds effective rate — the overnight interbank lending rate targeted by the Federal Reserve. The primary tool of US monetary policy.',
    modelRole: 'Policy indicator, inverted (high rates = low score). The Fed funds rate is the anchor for all short-term borrowing costs. When the Fed is raising rates, it is deliberately tightening financial conditions to cool the economy.',
    interpretation: 'High score = low/falling rates = accommodative policy, supportive of growth. Low score = high/rising rates = restrictive policy, Fed actively slowing the economy. Inverted because rate hikes are contractionary.',
    leadLag: 'Policy changes lead the economy by 6-18 months (long and variable lags).',
  },

  T5YIE: {
    what: '5-year breakeven inflation rate — derived from the difference between nominal and TIPS yields. Represents the market\'s expected average annual inflation rate over the next 5 years.',
    modelRole: 'Policy indicator, NOT inverted. Moderate and stable inflation expectations signal a well-functioning economy. Collapsing breakevens signal deflationary recession fear; spiking breakevens signal an inflation overshoot requiring aggressive tightening.',
    interpretation: 'High score = stable/moderate inflation expectations = the market sees the economy on a sustainable path. Low score = either collapsing expectations (deflation fear) or extreme expectations that require aggressive Fed response. Optimized with high weight (1.5×).',
    leadLag: 'Forward-looking, reflects market consensus on the inflation-policy trajectory.',
  },

  CPIAUCSL: {
    what: 'Consumer Price Index for All Urban Consumers — headline inflation including food and energy. The broadest measure of consumer price changes.',
    modelRole: 'Policy indicator, inverted. High inflation forces the Fed to tighten policy, which is contractionary. In the cycle framework, falling CPI momentum is expansionary (the Fed can ease) while rising CPI momentum is contractionary (the Fed must tighten).',
    interpretation: 'High score = inflation is moderating = the Fed has room to ease or hold. Low score = inflation accelerating = the Fed is likely to tighten, which will slow growth. The cycle analysis captures turning points in inflation momentum.',
    leadLag: 'Lagging indicator but drives forward policy expectations.',
  },

  CPILFESL: {
    what: 'Core CPI excluding food and energy — the Fed\'s preferred gauge of underlying inflation trends. Strips out the volatile components to reveal persistent price pressures.',
    modelRole: 'Policy indicator, inverted. Core inflation is what the Fed actually targets. Sticky core inflation means the Fed will stay hawkish longer; declining core inflation opens the door for rate cuts. Important complement to headline CPI.',
    interpretation: 'High score = core inflation moderating = policy relief ahead. Low score = core inflation sticky/rising = the Fed will maintain or increase restrictive policy, prolonging the drag on growth.',
    leadLag: 'Lagging but drives the policy reaction function.',
  },

  M2SL: {
    what: 'M2 money supply — currency, checking deposits, savings deposits, and small time deposits. Measures the total amount of money circulating in the economy.',
    modelRole: 'Policy indicator, NOT inverted. Money supply growth fuels economic activity and asset prices. Monetarist framework: M2 contraction has preceded every major economic downturn. M2 expansion supports growth and reflation.',
    interpretation: 'High score = money supply expanding = supportive liquidity environment. Low score = M2 contracting = monetary tightening is reducing the fuel available for economic growth. The 2022-2023 M2 contraction was the first since the 1930s.',
    leadLag: 'Leads the economy by 6-18 months.',
  },

  DTWEXBGS: {
    what: 'Trade-weighted US Dollar Index (Broad) — the value of the dollar against a basket of major and emerging-market currencies.',
    modelRole: 'Policy indicator, inverted (strong dollar = low score). A strong dollar tightens global financial conditions — it raises the cost of dollar-denominated debt worldwide, reduces US export competitiveness, and compresses corporate earnings from abroad.',
    interpretation: 'High score = weaker dollar = easier global financial conditions, supportive of growth and risk assets. Low score = strong dollar = tighter global conditions, headwind for US multinationals and emerging markets.',
    leadLag: 'Near real-time reflection of relative policy stance and risk appetite.',
  },

  // ── Layer 5 — Liquidity ───────────────────────────────────────

  WALCL: {
    what: 'Federal Reserve total assets — the gross size of the Fed balance sheet. Expands during QE (bond purchases), contracts during QT (securities roll-off).',
    modelRole: 'Dominant global central bank, weight 3x — the Fed controls the reserve currency, making its balance sheet operations the primary driver of global dollar liquidity.',
    interpretation: 'High score = Fed balance sheet expanding = dollar liquidity injection globally. Low score = Fed balance sheet shrinking (QT) = dollar liquidity withdrawal.',
    leadLag: 'Structural driver. Balance sheet changes transmit to financial conditions within 2-6 weeks.',
  },

  ECB_USD: {
    what: 'European Central Bank total assets converted to USD using EUR/USD exchange rate. Captures the ECB\'s contribution to global liquidity in dollar terms.',
    modelRole: 'Second-largest central bank balance sheet, weight 1x. FX-adjusted to USD following Howell\'s dollar-denominated methodology — EUR weakness can offset nominal ECB expansion.',
    interpretation: 'High score = ECB expanding in USD terms = euro area CB contributing to global liquidity growth. Low score = ECB contracting or EUR weakening = reducing global dollar liquidity.',
    leadLag: 'Structural driver, similar timing to WALCL. EUR/USD moves can amplify or dampen the signal.',
  },

  BOJ_USD: {
    what: 'Bank of Japan total assets converted to USD using JPY/USD exchange rate. Monthly data interpolated to weekly. Captures BOJ\'s contribution to global liquidity.',
    modelRole: 'Third-largest central bank balance sheet, weight 1x. FX-adjusted to USD — JPY weakness can offset nominal BOJ expansion. Monthly source limits responsiveness.',
    interpretation: 'High score = BOJ expanding in USD terms = Japanese CB adding to global liquidity pool. Low score = BOJ contracting or JPY weakening.',
    leadLag: 'Structural driver. Monthly frequency means slower response than WALCL/ECB.',
  },

  NFL: {
    what: 'Net Fed Liquidity: Fed Total Assets + CB Swap Lines − Reverse Repo (ON RRP) − Treasury General Account. The net amount of central bank liquidity actually available to financial markets.',
    modelRole: 'Weight 1x — captures the net liquidity actually reaching markets after fiscal drains. NFL is the primary driver of financial market liquidity. When the Fed expands its balance sheet but the TGA and RRP drain those reserves, NFL captures the net effect.',
    interpretation: 'High score = NFL expanding = abundant liquidity flowing into financial markets. Low score = NFL contracting = the Fed is draining reserves or fiscal operations are absorbing liquidity. NFL turns typically lead equity market turns by 1-3 months.',
    leadLag: 'Leads equity markets by 1-3 months, leads the economy by 3-6 months.',
  },

  TOTBKCR: {
    what: 'Total bank credit — the aggregate lending by all commercial banks in the US. Includes loans, leases, and securities holdings.',
    modelRole: 'Weight 1x — credit transmission channel. Bank credit translates Fed liquidity into real-economy lending. When banks tighten lending standards, even abundant reserves don\'t reach businesses and consumers.',
    interpretation: 'High score = bank credit expanding = banks are lending, money is reaching the real economy. Low score = credit contracting = banks are pulling back, which chokes off investment and consumption regardless of Fed policy.',
    leadLag: 'Coincident to slightly lagging Fed liquidity by 1-3 months.',
  },

  COMPOUT: {
    what: 'Commercial paper outstanding — short-term unsecured debt issued by corporations and financial institutions. A key barometer of short-term funding markets.',
    modelRole: 'Weight 1x — market-based credit channel. Commercial paper is the lifeblood of corporate short-term funding. When CP markets freeze (as in 2008), it signals acute liquidity stress in the financial system.',
    interpretation: 'High score = CP market functioning well, corporates can fund short-term needs easily. Low score = CP market stressed or contracting = short-term funding conditions tightening.',
    leadLag: 'Near real-time indicator of short-term funding conditions.',
  },

  WRMFNS: {
    what: 'Retail money market fund assets — cash parked by retail investors in money market funds. Reflects household liquidity preferences and risk appetite.',
    modelRole: 'Weight 0.5x — household liquidity channel. Rising money market balances can signal that households are moving from risk assets to cash (risk-off). Conversely, declining balances may mean cash is flowing into equities.',
    interpretation: 'High score = expanding money funds = household liquidity is growing (can be deployed later). Low score = contracting = either households are spending down cash buffers or money is rotating into risk assets.',
    leadLag: 'Coincident indicator of household liquidity preferences.',
  },

  WRESBAL: {
    what: 'Reserve balances held at Federal Reserve Banks — the excess reserves that commercial banks hold at the Fed. The raw fuel for the banking system\'s lending capacity.',
    modelRole: 'Weight 1x — reserve adequacy indicator. Reserves are the base layer of the monetary pyramid. When reserves are ample, banks have no constraint on lending. When reserves become scarce (as in September 2019 repo crisis), liquidity breaks down.',
    interpretation: 'High score = ample reserves = no plumbing stress in the banking system. Low score = reserves declining = potential for funding market disruptions. The "reserve scarcity" threshold is debated but matters when crossed.',
    leadLag: 'Coincident indicator of banking system plumbing health.',
  },
};

/**
 * Generate a dynamic interpretation of the series' current state and
 * its contribution to the composite score.
 */
export function generateCurrentInterpretation(
  _fredId: string,
  score: number,
  phaseStatus: string,
  invert: boolean,
  layer: number,
  layerWeight: number,
): string {
  const direction = score >= 60 ? 'bullish' : score >= 45 ? 'neutral' : 'bearish';
  const phaseReadable = phaseStatus
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const attribution = direction === 'bullish'
    ? 'pulling the composite higher'
    : direction === 'bearish'
    ? 'dragging the composite lower'
    : 'having a neutral effect on the composite';

  const invertNote = invert
    ? 'This series is inverted in the model — a rising raw value is economically contractionary, so the score is flipped.'
    : '';

  return `Currently scoring ${score.toFixed(1)} (${direction}) in the ${phaseReadable} phase. This series is ${attribution} within Layer ${layer} (${(layerWeight * 100).toFixed(0)}% of the master score). ${invertNote}`.trim();
}
