/**
 * Event-driven strategy backtester.
 *
 * A strategy is plain JavaScript that defines `onBar(ctx)`. The engine
 * calls it once per bar, in order. Orders placed with `ctx.buy()` /
 * `ctx.sell()` are filled at the NEXT bar's open (plus slippage and
 * commission), so a signal computed from today's close can never trade
 * at today's close. Positions are long-only and sized in whole units.
 */

import type {
  BacktestResult,
  EquityPoint,
  PriceBar,
  TradeSignal,
} from '@/types';
import { computePerformance } from '@/utils/backtestEngine';
import * as ind from '@/utils/indicators';

export interface EngineOptions {
  initialCapital: number;
  /** Commission as a fraction of notional, e.g. 0.001 = 0.1% */
  commission?: number;
  /** Slippage as a fraction of price, applied against you on every fill */
  slippage?: number;
  /** Cap on stored log lines */
  maxLogLines?: number;
}

export interface StrategyContext {
  /** Index of the current bar (0-based) */
  readonly index: number;
  /** The current bar */
  readonly bar: PriceBar;
  /** Current bar's date (YYYY-MM-DD) */
  readonly date: string;
  /** Units currently held */
  readonly position: number;
  /** Uninvested cash */
  readonly cash: number;
  /** Cash + position marked at the current close */
  readonly equity: number;
  /** Average cost per unit of the open position, fees included (0 when flat) */
  readonly entryPrice: number;
  /** Scratch space that persists between bars */
  readonly state: Record<string, unknown>;

  /** Close `barsAgo` bars back (0 = current). null if out of range. */
  price(barsAgo?: number): number | null;
  sma(period: number, barsAgo?: number): number | null;
  ema(period: number, barsAgo?: number): number | null;
  rsi(period?: number, barsAgo?: number): number | null;
  atr(period?: number, barsAgo?: number): number | null;
  bollinger(
    period?: number,
    stdDevs?: number,
    barsAgo?: number
  ): { upper: number; middle: number; lower: number } | null;
  macd(
    fast?: number,
    slow?: number,
    signal?: number,
    barsAgo?: number
  ): { macd: number; signal: number; histogram: number } | null;

  /** Buy using `fraction` of available cash (default: all of it). */
  buy(fraction?: number): void;
  /** Sell `fraction` of the open position (default: all of it). */
  sell(fraction?: number): void;
  /** Write a line to the backtest log. */
  log(...args: unknown[]): void;
}

export type StrategyFn = (ctx: StrategyContext) => void;

/**
 * Compile strategy source code into an `onBar` function.
 * The code runs in strict mode and must declare `function onBar(ctx)`.
 */
export function compileStrategy(code: string): StrategyFn {
  let factory: () => unknown;
  try {
    factory = new Function(
      `"use strict";\n${code}\n;return typeof onBar === "function" ? onBar : undefined;`
    ) as () => unknown;
  } catch (error) {
    throw new Error(`Syntax error in strategy: ${errorMessage(error)}`);
  }

  let fn: unknown;
  try {
    fn = factory();
  } catch (error) {
    throw new Error(`Strategy failed to load: ${errorMessage(error)}`);
  }

  if (typeof fn !== 'function') {
    throw new Error('Your strategy must define a function named onBar(ctx).');
  }
  return fn as StrategyFn;
}

type PendingOrder = { side: 'buy' | 'sell'; fraction: number };

/** Run a strategy over `bars` (oldest first) and return a full backtest result. */
export function runStrategyBacktest(
  bars: readonly PriceBar[],
  strategy: StrategyFn,
  options: EngineOptions
): BacktestResult {
  const {
    initialCapital,
    commission = 0,
    slippage = 0,
    maxLogLines = 500,
  } = options;

  if (!(initialCapital > 0)) {
    return errorResult('Initial capital must be greater than zero.', initialCapital);
  }
  if (bars.length < 2) {
    return errorResult('Need at least two bars of price data to run a backtest.', initialCapital);
  }

  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);

  // Indicator series are computed once per parameter set and reused.
  const cache = new Map<string, unknown>();
  const cached = <T>(key: string, compute: () => T): T => {
    if (!cache.has(key)) cache.set(key, compute());
    return cache.get(key) as T;
  };

  let cash = initialCapital;
  let position = 0;
  let costBasis = 0; // total cost of open units, fees included
  let pending: PendingOrder | null = null;
  let barsInMarket = 0;

  const trades: TradeSignal[] = [];
  const equity: EquityPoint[] = [];
  const logs: string[] = [];
  const state: Record<string, unknown> = {};

  const fill = (order: PendingOrder, bar: PriceBar) => {
    const fraction = clampFraction(order.fraction);
    if (fraction === 0) return;

    if (order.side === 'buy') {
      const price = bar.open * (1 + slippage);
      const units = Math.floor((cash * fraction) / (price * (1 + commission)));
      if (units <= 0) return;
      const value = units * price;
      const fee = value * commission;
      cash -= value + fee;
      costBasis += value + fee;
      position += units;
      trades.push({ date: bar.date, type: 'buy', price, size: units, value, fee });
    } else {
      if (position <= 0) return;
      const units = fraction >= 1 ? position : Math.floor(position * fraction);
      if (units <= 0) return;
      const price = bar.open * (1 - slippage);
      const value = units * price;
      const fee = value * commission;
      const basis = (costBasis * units) / position;
      cash += value - fee;
      costBasis -= basis;
      position -= units;
      if (position === 0) costBasis = 0;
      trades.push({
        date: bar.date,
        type: 'sell',
        price,
        size: units,
        value,
        fee,
        pnl: value - fee - basis,
      });
    }
  };

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

    // 1. Fill yesterday's order at today's open
    if (pending) {
      fill(pending, bar);
      pending = null;
    }

    // 2. Let the strategy look at today's bar
    const at = (series: ind.Series, barsAgo = 0): number | null => {
      const j = i - barsAgo;
      return j >= 0 && j <= i ? series[j] : null;
    };

    const ctx: StrategyContext = {
      index: i,
      bar,
      date: bar.date,
      position,
      cash,
      equity: cash + position * bar.close,
      entryPrice: position > 0 ? costBasis / position : 0,
      state,
      price: (barsAgo = 0) => {
        const j = i - barsAgo;
        return j >= 0 && j <= i ? closes[j] : null;
      },
      sma: (period, barsAgo) => at(cached(`sma:${period}`, () => ind.sma(closes, period)), barsAgo),
      ema: (period, barsAgo) => at(cached(`ema:${period}`, () => ind.ema(closes, period)), barsAgo),
      rsi: (period = 14, barsAgo) =>
        at(cached(`rsi:${period}`, () => ind.rsi(closes, period)), barsAgo),
      atr: (period = 14, barsAgo) =>
        at(cached(`atr:${period}`, () => ind.atr(highs, lows, closes, period)), barsAgo),
      bollinger: (period = 20, stdDevs = 2, barsAgo = 0) => {
        const bands = cached(`bb:${period}:${stdDevs}`, () =>
          ind.bollinger(closes, period, stdDevs)
        );
        const middle = at(bands.middle, barsAgo);
        if (middle === null) return null;
        return {
          upper: at(bands.upper, barsAgo) as number,
          middle,
          lower: at(bands.lower, barsAgo) as number,
        };
      },
      macd: (fast = 12, slow = 26, signal = 9, barsAgo = 0) => {
        const m = cached(`macd:${fast}:${slow}:${signal}`, () =>
          ind.macd(closes, fast, slow, signal)
        );
        const sig = at(m.signal, barsAgo);
        if (sig === null) return null;
        return {
          macd: at(m.macd, barsAgo) as number,
          signal: sig,
          histogram: at(m.histogram, barsAgo) as number,
        };
      },
      buy: (fraction = 1) => {
        pending = { side: 'buy', fraction };
      },
      sell: (fraction = 1) => {
        pending = { side: 'sell', fraction };
      },
      log: (...args) => {
        if (logs.length < maxLogLines) {
          logs.push(`[${bar.date}] ${args.map(formatLogArg).join(' ')}`);
        }
      },
    };

    try {
      strategy(ctx);
    } catch (error) {
      throw new Error(`Strategy error on ${bar.date} (bar ${i}): ${errorMessage(error)}`);
    }

    // 3. Mark to market at today's close
    if (position > 0) barsInMarket++;
    const holdings = position * bar.close;
    equity.push({ date: bar.date, value: cash + holdings, cash, holdings });
  }

  if (pending && logs.length < maxLogLines) {
    logs.push(`[${bars[bars.length - 1].date}] Order placed on the last bar was not filled.`);
  }

  const firstClose = bars[0].close;
  const benchmark: EquityPoint[] = bars.map((b) => {
    const value = (initialCapital * b.close) / firstClose;
    return { date: b.date, value, cash: 0, holdings: value };
  });

  const performance = computePerformance(equity, trades, initialCapital);
  performance.totalFees = trades.reduce((sum, t) => sum + (t.fee ?? 0), 0);
  performance.buyHoldReturn = (bars[bars.length - 1].close / firstClose - 1) * 100;
  performance.exposure = (barsInMarket / bars.length) * 100;

  return {
    status: 'success',
    priceData: [...bars],
    trades,
    equity,
    benchmark,
    logs,
    performance,
  };
}

function errorResult(message: string, initialCapital: number): BacktestResult {
  return {
    status: 'error',
    message,
    priceData: [],
    trades: [],
    equity: [],
    performance: computePerformance([], [], initialCapital),
  };
}

function clampFraction(fraction: number): number {
  if (!Number.isFinite(fraction) || fraction <= 0) return 0;
  return Math.min(fraction, 1);
}

function formatLogArg(arg: unknown): string {
  if (typeof arg === 'number') return Number.isInteger(arg) ? String(arg) : arg.toFixed(4);
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
