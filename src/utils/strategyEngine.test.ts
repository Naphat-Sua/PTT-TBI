import { describe, expect, it } from 'vitest';
import type { PriceBar } from '@/types';
import { compileStrategy, runStrategyBacktest, type StrategyFn } from './strategyEngine';
import { STRATEGY_TEMPLATES } from './strategyTemplates';
import { generateSyntheticPriceSeries } from './backtestEngine';

/** Bars where open = close = the given price. */
function flatBars(prices: number[]): PriceBar[] {
  return prices.map((p, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: p,
    high: p,
    low: p,
    close: p,
    volume: 1000,
  }));
}

describe('compileStrategy', () => {
  it('returns the onBar function', () => {
    expect(typeof compileStrategy('function onBar(ctx) {}')).toBe('function');
  });

  it('rejects code without onBar', () => {
    expect(() => compileStrategy('const x = 1;')).toThrow(/onBar/);
  });

  it('reports syntax errors clearly', () => {
    expect(() => compileStrategy('function onBar(ctx) {')).toThrow(/Syntax error/);
  });
});

describe('runStrategyBacktest', () => {
  it('fills orders at the next bar open, not the signal bar', () => {
    const bars = flatBars([10, 20, 30, 40]);
    const strategy: StrategyFn = (ctx) => {
      if (ctx.index === 0) ctx.buy();
      if (ctx.index === 2) ctx.sell();
    };
    const result = runStrategyBacktest(bars, strategy, { initialCapital: 1000 });

    expect(result.trades).toHaveLength(2);
    expect(result.trades[0]).toMatchObject({ date: bars[1].date, type: 'buy', price: 20, size: 50 });
    expect(result.trades[1]).toMatchObject({ date: bars[3].date, type: 'sell', price: 40, size: 50 });
    expect(result.trades[1].pnl).toBeCloseTo(1000);
    expect(result.equity[3].value).toBeCloseTo(2000);
    expect(result.performance.totalReturn).toBeCloseTo(100);
  });

  it('applies commission and slippage on both sides', () => {
    const bars = flatBars([100, 100, 100, 100]);
    const strategy: StrategyFn = (ctx) => {
      if (ctx.index === 0) ctx.buy();
      if (ctx.index === 1) ctx.sell();
    };
    const result = runStrategyBacktest(bars, strategy, {
      initialCapital: 10_000,
      commission: 0.01,
      slippage: 0.01,
    });
    const [buy, sell] = result.trades;
    expect(buy.price).toBeCloseTo(101);
    expect(sell.price).toBeCloseTo(99);
    expect(buy.fee).toBeCloseTo(buy.value * 0.01);
    // Flat price but costs on both legs: must lose money
    expect(sell.pnl).toBeLessThan(0);
    expect(result.performance.totalFees).toBeCloseTo((buy.fee ?? 0) + (sell.fee ?? 0));
    expect(result.equity[3].value).toBeLessThan(10_000);
  });

  it('supports partial entries and exits with average cost', () => {
    const bars = flatBars([10, 10, 10, 20, 20]);
    const strategy: StrategyFn = (ctx) => {
      if (ctx.index === 0) ctx.buy(0.5);
      if (ctx.index === 2) ctx.sell(0.5);
    };
    const result = runStrategyBacktest(bars, strategy, { initialCapital: 1000 });
    expect(result.trades[0].size).toBe(50);
    expect(result.trades[1]).toMatchObject({ type: 'sell', size: 25, price: 20 });
    expect(result.trades[1].pnl).toBeCloseTo(250);
    expect(result.equity[4].holdings).toBeCloseTo(25 * 20);
  });

  it('ignores sells while flat and buys without cash', () => {
    const bars = flatBars([10, 10, 10]);
    const result = runStrategyBacktest(bars, (ctx) => ctx.sell(), { initialCapital: 5 });
    expect(result.trades).toHaveLength(0);
    const broke = runStrategyBacktest(flatBars([100, 100]), (ctx) => ctx.buy(), {
      initialCapital: 50,
    });
    expect(broke.trades).toHaveLength(0);
  });

  it('never lets indicators read future bars', () => {
    const bars = flatBars([1, 2, 3, 4, 5, 6]);
    const seen: (number | null)[] = [];
    runStrategyBacktest(
      bars,
      (ctx) => {
        seen.push(ctx.price(-1), ctx.sma(2, -1));
      },
      { initialCapital: 100 }
    );
    expect(seen.every((v) => v === null)).toBe(true);
  });

  it('exposes indicators and barsAgo offsets', () => {
    const bars = flatBars([1, 2, 3, 4, 5]);
    const snapshots: Array<[number | null, number | null, number | null]> = [];
    runStrategyBacktest(
      bars,
      (ctx) => snapshots.push([ctx.sma(3), ctx.sma(3, 1), ctx.price(1)]),
      { initialCapital: 100 }
    );
    expect(snapshots[4]).toEqual([4, 3, 4]);
    expect(snapshots[1]).toEqual([null, null, 1]);
  });

  it('keeps ctx.state across bars and records logs', () => {
    const bars = flatBars([1, 2, 3]);
    const result = runStrategyBacktest(
      bars,
      (ctx) => {
        ctx.state.count = ((ctx.state.count as number) ?? 0) + 1;
        ctx.log('bar', ctx.state.count);
      },
      { initialCapital: 100 }
    );
    expect(result.logs).toEqual(['[2024-01-01] bar 1', '[2024-01-02] bar 2', '[2024-01-03] bar 3']);
  });

  it('wraps runtime errors with the bar date', () => {
    const bars = flatBars([1, 2, 3]);
    expect(() =>
      runStrategyBacktest(
        bars,
        (ctx) => {
          if (ctx.index === 1) throw new Error('boom');
        },
        { initialCapital: 100 }
      )
    ).toThrow(/2024-01-02.*boom/);
  });

  it('computes a buy-and-hold benchmark', () => {
    const bars = flatBars([50, 75, 100]);
    const result = runStrategyBacktest(bars, () => {}, { initialCapital: 1000 });
    expect(result.benchmark?.map((p) => p.value)).toEqual([1000, 1500, 2000]);
    expect(result.performance.buyHoldReturn).toBeCloseTo(100);
    expect(result.performance.exposure).toBe(0);
  });

  it('returns an error result for unusable input', () => {
    expect(runStrategyBacktest(flatBars([1]), () => {}, { initialCapital: 100 }).status).toBe('error');
    expect(runStrategyBacktest(flatBars([1, 2]), () => {}, { initialCapital: 0 }).status).toBe('error');
  });
});

describe('strategy templates', () => {
  const bars = generateSyntheticPriceSeries({
    startDate: '2020-01-01',
    endDate: '2024-12-31',
    startPrice: 75,
    dailyVolatility: 0.022,
    seed: 7,
  });

  for (const template of STRATEGY_TEMPLATES) {
    it(`"${template.name}" compiles and runs`, () => {
      const result = runStrategyBacktest(bars, compileStrategy(template.code), {
        initialCapital: 100_000,
        commission: 0.001,
        slippage: 0.0005,
      });
      expect(result.status).toBe('success');
      expect(result.equity).toHaveLength(bars.length);
      for (const point of result.equity) expect(point.cash).toBeGreaterThanOrEqual(-1e-6);
      if (template.id !== 'blank') expect(result.trades.length).toBeGreaterThan(0);
    });
  }
});
