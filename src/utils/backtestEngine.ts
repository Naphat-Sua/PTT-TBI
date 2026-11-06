/**
 * Local SMA-crossover backtest engine.
 *
 * Runs entirely in the browser so the AlgoTrade page works without a
 * backend. Price simulation is seeded (mulberry32 PRNG), so the same
 * request parameters always produce the same backtest — reproducible
 * results instead of a new random walk on every run.
 */

import {
  BacktestPerformance,
  BacktestRequest,
  BacktestResult,
  EquityPoint,
  PriceBar,
  TradeSignal,
} from '@/types';

/** Deterministic 32-bit PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a stable numeric seed from backtest parameters. */
export function seedFromRequest(request: BacktestRequest): number {
  const { ticker, startDate, endDate, initialCapital } = request.parameters;
  const key = `${ticker}|${startDate}|${endDate}|${initialCapital}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface SyntheticSeriesOptions {
  startDate: string;
  endDate: string;
  startPrice?: number;
  /** Max daily move as a fraction, e.g. 0.02 = ±2% */
  dailyVolatility?: number;
  seed?: number;
}

/** Generate a weekday-only synthetic OHLCV series with a seeded random walk. */
export function generateSyntheticPriceSeries(options: SyntheticSeriesOptions): PriceBar[] {
  const {
    startDate,
    endDate,
    startPrice = 100,
    dailyVolatility = 0.02,
    seed = 42,
  } = options;

  const random = mulberry32(seed);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const priceData: PriceBar[] = [];

  if (!(start.getTime() < end.getTime())) return priceData;

  let currentPrice = startPrice;
  const current = new Date(start);

  while (current.getTime() <= end.getTime()) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) {
      const changePercent = (random() * 2 - 1) * dailyVolatility;
      const open = currentPrice;
      const close = currentPrice * (1 + changePercent);
      const high = Math.max(open, close) * (1 + random() * 0.01);
      const low = Math.min(open, close) * (1 - random() * 0.01);
      const volume = Math.round(100000 + random() * 900000);

      priceData.push({
        date: current.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume,
      });
      currentPrice = close;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return priceData;
}

export interface SmaStrategyOptions {
  shortPeriod?: number;
  longPeriod?: number;
}

/** Simple moving average of the `period` closes ending at index `i`. */
function smaAt(priceData: PriceBar[], i: number, period: number): number | null {
  if (i < period - 1) return null;
  let sum = 0;
  for (let j = 0; j < period; j++) sum += priceData[i - j].close;
  return sum / period;
}

/**
 * Run an SMA-crossover strategy over a price series.
 * Buys when the short SMA is above the long SMA, sells on the reverse.
 */
export function runSmaCrossoverBacktest(
  priceData: PriceBar[],
  initialCapital: number,
  options: SmaStrategyOptions = {}
): { trades: TradeSignal[]; equity: EquityPoint[] } {
  const { shortPeriod = 10, longPeriod = 30 } = options;
  const trades: TradeSignal[] = [];
  const equity: EquityPoint[] = [];

  let inPosition = false;
  let capital = initialCapital;
  let shares = 0;

  for (let i = 0; i < priceData.length; i++) {
    const bar = priceData[i];
    const shortSMA = smaAt(priceData, i, shortPeriod);
    const longSMA = smaAt(priceData, i, longPeriod);

    if (shortSMA !== null && longSMA !== null && i >= longPeriod) {
      if (!inPosition && shortSMA > longSMA) {
        const price = bar.close;
        const size = Math.floor(capital / price);
        if (size > 0) {
          const value = size * price;
          trades.push({ date: bar.date, type: 'buy', price, size, value });
          capital -= value;
          shares = size;
          inPosition = true;
        }
      } else if (inPosition && shortSMA < longSMA) {
        const price = bar.close;
        const size = shares;
        const value = size * price;
        trades.push({ date: bar.date, type: 'sell', price, size, value });
        capital += value;
        shares = 0;
        inPosition = false;
      }
    }

    equity.push({
      date: bar.date,
      value: capital + shares * bar.close,
      cash: capital,
      holdings: shares * bar.close,
    });
  }

  return { trades, equity };
}

/** Compute performance metrics from an equity curve and trade list. */
export function computePerformance(
  equity: EquityPoint[],
  trades: TradeSignal[],
  initialCapital: number
): BacktestPerformance {
  if (equity.length === 0) {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      winRate: 0,
      totalTrades: 0,
      profitFactor: 0,
    };
  }

  const finalValue = equity[equity.length - 1].value;
  const totalReturn = (finalValue / initialCapital - 1) * 100;

  // Max drawdown
  let maxDrawdown = 0;
  let peak = initialCapital;
  for (const point of equity) {
    if (point.value > peak) peak = point.value;
    const drawdown = ((peak - point.value) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Annualized return from trading days (~252/year)
  const years = equity.length / 252;
  const annualizedReturn =
    years > 0 && finalValue > 0
      ? (Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100
      : 0;

  // Win rate and profit factor from realized exits. Sells that carry a
  // `pnl` (net of fees) use it directly; otherwise pair with the last buy.
  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let maxWin = 0;
  let maxLoss = 0;
  let lastBuy: TradeSignal | null = null;

  for (const trade of trades) {
    if (trade.type === 'buy') {
      lastBuy = trade;
      continue;
    }
    let pnl: number;
    if (trade.pnl !== undefined) {
      pnl = trade.pnl;
    } else if (lastBuy) {
      pnl = (trade.price - lastBuy.price) * trade.size;
      lastBuy = null;
    } else {
      continue;
    }
    if (pnl > 0) {
      wins++;
      grossProfit += pnl;
      maxWin = Math.max(maxWin, pnl);
    } else {
      losses++;
      grossLoss += Math.abs(pnl);
      maxLoss = Math.min(maxLoss, pnl);
    }
  }

  const roundTrips = wins + losses;
  const winRate = roundTrips > 0 ? (wins / roundTrips) * 100 : 0;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Sharpe ratio from daily returns (risk-free rate = 0)
  let sharpeRatio = 0;
  if (equity.length > 1) {
    const returns: number[] = [];
    for (let i = 1; i < equity.length; i++) {
      const prev = equity[i - 1].value;
      if (prev > 0) returns.push(equity[i].value / prev - 1);
    }
    if (returns.length > 0) {
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance =
        returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      sharpeRatio = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;
    }
  }

  return {
    totalReturn,
    annualizedReturn,
    maxDrawdown,
    sharpeRatio,
    winRate,
    totalTrades: roundTrips,
    profitFactor,
    averageWin: wins > 0 ? grossProfit / wins : 0,
    averageLoss: losses > 0 ? -grossLoss / losses : 0,
    maxWin,
    maxLoss,
  };
}

/**
 * Execute a full backtest locally: simulate (seeded) price data for the
 * requested window, run the SMA-crossover strategy, compute metrics.
 */
export function runLocalBacktest(request: BacktestRequest): BacktestResult {
  const { startDate, endDate, initialCapital } = request.parameters;

  const priceData = generateSyntheticPriceSeries({
    startDate,
    endDate,
    seed: seedFromRequest(request),
  });

  if (priceData.length === 0) {
    return {
      status: 'error',
      message: 'Invalid date range: no trading days between start and end date.',
      priceData: [],
      trades: [],
      equity: [],
      performance: computePerformance([], [], initialCapital),
    };
  }

  const { trades, equity } = runSmaCrossoverBacktest(priceData, initialCapital);
  const performance = computePerformance(equity, trades, initialCapital);

  return { status: 'success', priceData, trades, equity, performance };
}
