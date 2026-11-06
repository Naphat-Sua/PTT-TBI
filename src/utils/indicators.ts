/**
 * Technical indicators over a price series.
 *
 * Every function returns an array the same length as its input, with
 * `null` wherever there is not yet enough history. A value at index `i`
 * only depends on inputs at indices `<= i`, so strategies that read
 * these arrays can never peek into the future.
 */

export type Series = (number | null)[];

/** Simple moving average. */
export function sma(values: readonly number[], period: number): Series {
  assertPeriod(period);
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** Exponential moving average, seeded with the SMA of the first `period` values. */
export function ema(values: readonly number[], period: number): Series {
  assertPeriod(period);
  const out: Series = new Array(values.length).fill(null);
  if (values.length < period) return out;

  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Relative Strength Index using Wilder's smoothing. Range 0–100. */
export function rsi(values: readonly number[], period = 14): Series {
  assertPeriod(period);
  const out: Series = new Array(values.length).fill(null);
  if (values.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gain += change;
    else loss -= change;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = toRsi(avgGain, avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    out[i] = toRsi(avgGain, avgLoss);
  }
  return out;
}

function toRsi(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export interface BollingerBands {
  upper: Series;
  middle: Series;
  lower: Series;
}

/** Bollinger Bands: SMA ± `stdDevs` population standard deviations. */
export function bollinger(values: readonly number[], period = 20, stdDevs = 2): BollingerBands {
  assertPeriod(period);
  const middle = sma(values, period);
  const upper: Series = new Array(values.length).fill(null);
  const lower: Series = new Array(values.length).fill(null);

  for (let i = period - 1; i < values.length; i++) {
    const mean = middle[i] as number;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j] - mean) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = mean + stdDevs * sd;
    lower[i] = mean - stdDevs * sd;
  }
  return { upper, middle, lower };
}

export interface MacdSeries {
  macd: Series;
  signal: Series;
  histogram: Series;
}

/** MACD line (fast EMA − slow EMA), its signal EMA, and the histogram. */
export function macd(
  values: readonly number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdSeries {
  if (fastPeriod >= slowPeriod) {
    throw new Error('MACD fast period must be shorter than the slow period');
  }
  const fast = ema(values, fastPeriod);
  const slow = ema(values, slowPeriod);
  const line: Series = values.map((_, i) =>
    fast[i] !== null && slow[i] !== null ? (fast[i] as number) - (slow[i] as number) : null
  );

  // Signal line is an EMA over the defined part of the MACD line
  const firstDefined = line.findIndex((v) => v !== null);
  const signal: Series = new Array(values.length).fill(null);
  if (firstDefined !== -1) {
    const defined = line.slice(firstDefined) as number[];
    const signalTail = ema(defined, signalPeriod);
    signalTail.forEach((v, j) => {
      signal[firstDefined + j] = v;
    });
  }

  const histogram: Series = line.map((v, i) =>
    v !== null && signal[i] !== null ? v - (signal[i] as number) : null
  );
  return { macd: line, signal, histogram };
}

/** Average True Range using Wilder's smoothing. */
export function atr(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  period = 14
): Series {
  assertPeriod(period);
  const n = closes.length;
  const out: Series = new Array(n).fill(null);
  if (n <= period) return out;

  const trueRange = (i: number) =>
    Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );

  let sum = 0;
  for (let i = 1; i <= period; i++) sum += trueRange(i);
  let prev = sum / period;
  out[period] = prev;
  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + trueRange(i)) / period;
    out[i] = prev;
  }
  return out;
}

function assertPeriod(period: number) {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`Indicator period must be a positive integer (got ${period})`);
  }
}
