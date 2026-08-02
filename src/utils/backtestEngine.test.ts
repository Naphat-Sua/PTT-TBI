import { describe, expect, it } from 'vitest';
import {
  computePerformance,
  generateSyntheticPriceSeries,
  mulberry32,
  runLocalBacktest,
  runSmaCrossoverBacktest,
  seedFromRequest,
} from './backtestEngine';
import { BacktestRequest, PriceBar } from '@/types';

const REQUEST: BacktestRequest = {
  parameters: {
    ticker: 'WTI',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialCapital: 100000,
  },
  strategy: { code: 'class MyStrategy: pass', name: 'Test' },
};

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const rand = mulberry32(99);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('generateSyntheticPriceSeries', () => {
  it('is deterministic for the same seed', () => {
    const options = { startDate: '2024-01-01', endDate: '2024-03-01', seed: 7 };
    expect(generateSyntheticPriceSeries(options)).toEqual(
      generateSyntheticPriceSeries(options)
    );
  });

  it('skips weekends', () => {
    const series = generateSyntheticPriceSeries({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      seed: 1,
    });
    for (const bar of series) {
      const day = new Date(bar.date).getUTCDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });

  it('keeps OHLC internally consistent', () => {
    const series = generateSyntheticPriceSeries({
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      seed: 3,
    });
    for (const bar of series) {
      expect(bar.high).toBeGreaterThanOrEqual(Math.max(bar.open, bar.close));
      expect(bar.low).toBeLessThanOrEqual(Math.min(bar.open, bar.close));
    }
  });

  it('returns an empty series for an inverted date range', () => {
    expect(
      generateSyntheticPriceSeries({ startDate: '2024-06-01', endDate: '2024-01-01' })
    ).toEqual([]);
  });
});

/** Build a price series from closes only (open=close, tiny high/low spread). */
function seriesFromCloses(closes: number[]): PriceBar[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: close,
    high: close * 1.001,
    low: close * 0.999,
    close,
    volume: 1000,
  }));
}

describe('runSmaCrossoverBacktest', () => {
  it('performs no trades on a flat series', () => {
    const series = seriesFromCloses(new Array(30).fill(100));
    const { trades } = runSmaCrossoverBacktest(series, 10000, {
      shortPeriod: 3,
      longPeriod: 5,
    });
    // Short SMA never strictly exceeds long SMA on a flat series
    expect(trades).toEqual([]);
  });

  it('buys into an uptrend and equity tracks cash + holdings', () => {
    // Downtrend then strong sustained uptrend → exactly one buy signal
    const closes = [
      ...Array.from({ length: 10 }, (_, i) => 100 - i), // 100 → 91
      ...Array.from({ length: 20 }, (_, i) => 92 + i * 2), // sharp recovery
    ];
    const series = seriesFromCloses(closes);
    const initialCapital = 10000;
    const { trades, equity } = runSmaCrossoverBacktest(series, initialCapital, {
      shortPeriod: 3,
      longPeriod: 5,
    });

    expect(trades.length).toBeGreaterThan(0);
    expect(trades[0].type).toBe('buy');

    // Equity accounting: every point equals cash + holdings
    for (const point of equity) {
      expect(point.value).toBeCloseTo(point.cash + point.holdings, 8);
    }

    // A buy must never spend more cash than available
    expect(trades[0].value).toBeLessThanOrEqual(initialCapital);
  });

  it('alternates buy and sell trades', () => {
    const series = generateSyntheticPriceSeries({
      startDate: '2023-01-01',
      endDate: '2024-12-31',
      seed: 11,
      dailyVolatility: 0.03,
    });
    const { trades } = runSmaCrossoverBacktest(series, 50000);
    for (let i = 0; i < trades.length; i++) {
      expect(trades[i].type).toBe(i % 2 === 0 ? 'buy' : 'sell');
    }
  });
});

describe('computePerformance', () => {
  it('handles empty equity safely', () => {
    const perf = computePerformance([], [], 10000);
    expect(perf.totalReturn).toBe(0);
    expect(perf.maxDrawdown).toBe(0);
    expect(perf.totalTrades).toBe(0);
  });

  it('computes total return from the final equity value', () => {
    const equity = [
      { date: '2024-01-01', value: 10000, cash: 10000, holdings: 0 },
      { date: '2024-01-02', value: 11000, cash: 11000, holdings: 0 },
    ];
    const perf = computePerformance(equity, [], 10000);
    expect(perf.totalReturn).toBeCloseTo(10, 6);
  });

  it('computes max drawdown from the running peak', () => {
    const values = [10000, 12000, 9000, 11000];
    const equity = values.map((value, i) => ({
      date: `2024-01-0${i + 1}`,
      value,
      cash: value,
      holdings: 0,
    }));
    const perf = computePerformance(equity, [], 10000);
    // Peak 12000 → trough 9000 = 25% drawdown
    expect(perf.maxDrawdown).toBeCloseTo(25, 6);
  });

  it('computes win rate and profit factor from round trips', () => {
    const trades = [
      { date: '2024-01-01', type: 'buy' as const, price: 100, size: 10, value: 1000 },
      { date: '2024-01-05', type: 'sell' as const, price: 110, size: 10, value: 1100 },
      { date: '2024-01-10', type: 'buy' as const, price: 120, size: 10, value: 1200 },
      { date: '2024-01-15', type: 'sell' as const, price: 115, size: 10, value: 1150 },
    ];
    const equity = [{ date: '2024-01-15', value: 10050, cash: 10050, holdings: 0 }];
    const perf = computePerformance(equity, trades, 10000);
    expect(perf.totalTrades).toBe(2);
    expect(perf.winRate).toBeCloseTo(50, 6);
    // Gross profit 100, gross loss 50 → profit factor 2
    expect(perf.profitFactor).toBeCloseTo(2, 6);
  });
});

describe('runLocalBacktest', () => {
  it('is fully deterministic for identical requests', () => {
    const a = runLocalBacktest(REQUEST);
    const b = runLocalBacktest(REQUEST);
    expect(a).toEqual(b);
    expect(a.status).toBe('success');
  });

  it('derives different seeds from different parameters', () => {
    const other: BacktestRequest = {
      ...REQUEST,
      parameters: { ...REQUEST.parameters, ticker: 'AAPL' },
    };
    expect(seedFromRequest(REQUEST)).not.toBe(seedFromRequest(other));
  });

  it('returns an error status for an invalid date range', () => {
    const bad: BacktestRequest = {
      ...REQUEST,
      parameters: { ...REQUEST.parameters, startDate: '2025-01-01', endDate: '2024-01-01' },
    };
    const result = runLocalBacktest(bad);
    expect(result.status).toBe('error');
    expect(result.priceData).toEqual([]);
  });
});
