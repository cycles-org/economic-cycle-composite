import type {
  EnsureResult,
  OhlcvBar,
  CycleScannerResults,
  CrsiResult,
} from '../types';

const BASE_URL = 'https://api.cycle.tools';

/**
 * Quota-error string match.
 *
 * NOTE: Only match the explicit *daily/plan* quota message. Generic substring
 * matches like "quota exceeded" also trigger on transient 429 throttle bodies,
 * which masquerades concurrency throttling as a billing issue.
 */
function checkQuotaError(text: string): void {
  if (text.includes('API calls quota exceeded')) {
    throw new Error('API quota exceeded. Check your API key or plan limits.');
  }
}

/**
 * fetch wrapper that honors HTTP 429 (Too Many Requests) with the server's
 * Retry-After hint. The Cycle Tools API enforces a concurrent-connection
 * ceiling (separate from the daily call quota) and returns 429 + Retry-After
 * when too many long-lived calls (e.g. WaitUntilUpdateCompleted) overlap.
 *
 * Retries up to `maxRetries` times. Adds small jitter so a thundering herd
 * doesn't all wake up at the same instant.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  maxRetries = 5,
): Promise<Response> {
  let attempt = 0;
  while (true) {
    const resp = await fetch(url, init);
    if (resp.status !== 429 || attempt >= maxRetries) return resp;

    const retryAfterRaw = resp.headers.get('Retry-After');
    const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : 1;
    const baseMs = (Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec : 1) * 1000;
    const jitterMs = Math.floor(Math.random() * 250);
    // Exponential backoff multiplier on top of server hint (1×, 2×, 4×, ...)
    const backoffMs = baseMs * Math.pow(2, attempt) + jitterMs;
    await new Promise(r => setTimeout(r, backoffMs));
    attempt++;
  }
}

function parseJsonResponse<T>(text: string, context?: string): T {
  if (!text || text.trim().length === 0) {
    throw new Error(`Empty API response${context ? ` from ${context}` : ''}`);
  }
  checkQuotaError(text);
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract JSON array/object from mixed text+JSON response
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error(`Cannot parse API response: ${text.substring(0, 200)}`);
  }
}

export async function ensureDataset(
  apiKey: string,
  tickerId: string
): Promise<void> {
  // Step 1: EnsureCompleteDataset — note capital I in tickerId
  const unixTo = Math.floor(Date.now() / 1000);
  const ensureUrl =
    `${BASE_URL}/api/data/EnsureCompleteDataset` +
    `?api_key=${apiKey}&tickerId=${encodeURIComponent(tickerId)}` +
    `&unixFrom=0&unixTo=${unixTo}&lastclose=true`;

  const resp = await fetchWithRetry(ensureUrl);
  const text = await resp.text();
  checkQuotaError(text);

  let result: EnsureResult;
  try {
    result = JSON.parse(text);
  } catch {
    // Some responses may not be standard JSON
    console.warn('EnsureCompleteDataset non-JSON response:', text.substring(0, 200));
    return;
  }

  if (!result.isComplete && result.trackingId) {
    // Step 2: WaitUntilUpdateCompleted
    const waitUrl =
      `${BASE_URL}/api/data/WaitUntilUpdateCompleted` +
      `?api_key=${apiKey}&requestId=${result.trackingId}&timeoutSeconds=30`;
    const waitResp = await fetchWithRetry(waitUrl);
    const waitText = await waitResp.text();
    checkQuotaError(waitText);
  }
}

export async function getDatasetSeries(
  apiKey: string,
  tickerId: string,
  maxbars: number = 1000
): Promise<{ bars: OhlcvBar[]; closes: number[] }> {
  // Note: lowercase tickerid here
  const url =
    `${BASE_URL}/api/data/GetDatasetSeries` +
    `?api_key=${apiKey}&tickerid=${encodeURIComponent(tickerId)}&maxbars=${maxbars}`;

  const resp = await fetchWithRetry(url);
  if (!resp.ok) {
    throw new Error(`GetDatasetSeries HTTP ${resp.status} for ${tickerId}`);
  }
  const text = await resp.text();
  checkQuotaError(text);

  const bars: OhlcvBar[] = parseJsonResponse(text, `GetDatasetSeries(${tickerId})`);
  const closes = bars.map((b) => b.close).filter((v) => v !== undefined && v !== null);

  if (closes.length < 100) {
    throw new Error(
      `Insufficient data for ${tickerId}: only ${closes.length} closes (need 100+)`
    );
  }

  return { bars, closes };
}

export async function cycleScanner(
  apiKey: string,
  closes: number[]
): Promise<CycleScannerResults> {
  const url =
    `${BASE_URL}/api/cycles/CycleScanner?api_key=${apiKey}` +
    `&minCycleLength=5&maxCycleLength=400` +
    `&sortByStrength=true&includeSpectrum=true` +
    `&dominantPeakFinder=true&useStability=true`;

  const resp = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(closes), // raw array, not wrapped
  });

  if (!resp.ok) {
    throw new Error(`CycleScanner HTTP ${resp.status}`);
  }
  const text = await resp.text();
  checkQuotaError(text);
  return parseJsonResponse(text, 'CycleScanner');
}

/**
 * CycleScanner with dType=9 (no detrending) for pre-detrended momentum data.
 */
export async function cycleScannerNoDetrend(
  apiKey: string,
  closes: number[]
): Promise<CycleScannerResults> {
  const url =
    `${BASE_URL}/api/cycles/CycleScanner?api_key=${apiKey}` +
    `&minCycleLength=10&maxCycleLength=400` +
    `&sortByStrength=true&includeSpectrum=false` +
    `&dominantPeakFinder=true&useStability=true` +
    `&bartelsLimit=49` +
    `&dtype=0`;

  const resp = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(closes),
  });

  if (!resp.ok) {
    throw new Error(`CycleScanner(noDetrend) HTTP ${resp.status}`);
  }
  const text = await resp.text();
  checkQuotaError(text);
  return parseJsonResponse(text, 'CycleScanner(noDetrend)');
}

/**
 * CRSI (Cyclic RSI) tuned to a specific cycle length.
 */
export async function getCrsi(
  apiKey: string,
  closes: number[],
  length: number
): Promise<CrsiResult> {
  const url = `${BASE_URL}/api/DSP/CRSI?api_key=${apiKey}&length=${length}`;
  const resp = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(closes),
  });
  if (!resp.ok) {
    throw new Error(`CRSI HTTP ${resp.status}`);
  }
  const text = await resp.text();
  checkQuotaError(text);
  return parseJsonResponse(text, 'CRSI');
}

/**
 * HP filter detrend. Returns cyclical component (trend removed).
 * Matches reference: POST /DSP/Detrend with dtype=0, ret=false
 */
export async function hpDetrend(
  apiKey: string,
  datapoints: number[]
): Promise<number[]> {
  const url = `${BASE_URL}/api/DSP/Detrend?api_key=${apiKey}&dtype=0&ret=false`;
  const resp = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(datapoints),
  });
  if (!resp.ok) {
    throw new Error(`Detrend HTTP ${resp.status}`);
  }
  const text = await resp.text();
  checkQuotaError(text);
  return parseJsonResponse(text, 'Detrend');
}

/**
 * Fetch raw bars with date information (needed for liquidity alignment).
 */
export async function getDatasetSeriesRaw(
  apiKey: string,
  tickerId: string,
  maxbars: number = 0
): Promise<OhlcvBar[]> {
  const url =
    `${BASE_URL}/api/data/GetDatasetSeries` +
    `?api_key=${apiKey}&tickerid=${encodeURIComponent(tickerId)}&maxbars=${maxbars}`;

  const resp = await fetchWithRetry(url);
  if (!resp.ok) {
    throw new Error(`GetDatasetSeries HTTP ${resp.status} for ${tickerId}`);
  }
  const text = await resp.text();
  checkQuotaError(text);
  return parseJsonResponse(text, `GetDatasetSeries(${tickerId})`);
}
