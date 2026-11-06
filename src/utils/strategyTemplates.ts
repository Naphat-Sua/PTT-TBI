/** Ready-to-run strategy templates for the AlgoTrade editor. */

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'sma-crossover',
    name: 'SMA crossover',
    description: 'Trend following: hold while the fast average is above the slow one.',
    code: `// SMA crossover: go long when the fast average crosses above the slow one.
const FAST = 10;
const SLOW = 30;

function onBar(ctx) {
  const fast = ctx.sma(FAST);
  const slow = ctx.sma(SLOW);
  const prevFast = ctx.sma(FAST, 1);
  const prevSlow = ctx.sma(SLOW, 1);
  if (fast === null || slow === null || prevFast === null || prevSlow === null) return;

  const crossedUp = prevFast <= prevSlow && fast > slow;
  const crossedDown = prevFast >= prevSlow && fast < slow;

  if (ctx.position === 0 && crossedUp) {
    ctx.log('Golden cross, buying at next open');
    ctx.buy();
  } else if (ctx.position > 0 && crossedDown) {
    ctx.log('Death cross, selling at next open');
    ctx.sell();
  }
}
`,
  },
  {
    id: 'rsi-mean-reversion',
    name: 'RSI mean reversion',
    description: 'Buy oversold dips, exit when momentum recovers or a stop is hit.',
    code: `// RSI mean reversion with a fixed stop-loss.
const PERIOD = 14;
const OVERSOLD = 30;
const EXIT = 55;
const STOP_LOSS = 0.08; // 8% below average entry

function onBar(ctx) {
  const rsi = ctx.rsi(PERIOD);
  if (rsi === null) return;

  if (ctx.position === 0 && rsi < OVERSOLD) {
    ctx.log('RSI', rsi, 'oversold, buying');
    ctx.buy();
    return;
  }

  if (ctx.position > 0) {
    const stopped = ctx.bar.close < ctx.entryPrice * (1 - STOP_LOSS);
    if (stopped) {
      ctx.log('Stop-loss hit, selling');
      ctx.sell();
    } else if (rsi > EXIT) {
      ctx.log('RSI recovered to', rsi, 'selling');
      ctx.sell();
    }
  }
}
`,
  },
  {
    id: 'bollinger-bounce',
    name: 'Bollinger band bounce',
    description: 'Buy closes below the lower band, take profit at the middle band.',
    code: `// Bollinger band bounce: buy below the lower band, exit at the mean.
const PERIOD = 20;
const STD_DEVS = 2;

function onBar(ctx) {
  const bands = ctx.bollinger(PERIOD, STD_DEVS);
  if (bands === null) return;
  const close = ctx.bar.close;

  if (ctx.position === 0 && close < bands.lower) {
    ctx.buy();
  } else if (ctx.position > 0 && close > bands.middle) {
    ctx.sell();
  }
}
`,
  },
  {
    id: 'macd-trend',
    name: 'MACD trend + ATR stop',
    description: 'Enter on MACD signal crosses above the 50-day SMA, trail an ATR stop.',
    code: `// MACD trend filter with an ATR trailing stop.
const ATR_MULT = 3;

function onBar(ctx) {
  const m = ctx.macd(12, 26, 9);
  const prev = ctx.macd(12, 26, 9, 1);
  const trend = ctx.sma(50);
  const atr = ctx.atr(14);
  if (!m || !prev || trend === null || atr === null) return;

  const close = ctx.bar.close;

  if (ctx.position === 0) {
    const crossUp = prev.macd <= prev.signal && m.macd > m.signal;
    if (crossUp && close > trend) {
      ctx.state.stop = close - ATR_MULT * atr;
      ctx.buy();
    }
    return;
  }

  // Trail the stop upward only
  ctx.state.stop = Math.max(ctx.state.stop ?? 0, close - ATR_MULT * atr);
  if (close < ctx.state.stop || m.macd < m.signal) {
    ctx.sell();
  }
}
`,
  },
  {
    id: 'blank',
    name: 'Blank strategy',
    description: 'Start from scratch with the full API in comments.',
    code: `// onBar(ctx) runs once per bar, oldest to newest.
// Orders fill at the NEXT bar's open, after slippage and commission.
//
// ctx.bar        { date, open, high, low, close, volume }
// ctx.index      bar number (0-based)
// ctx.position   units held      ctx.cash   uninvested cash
// ctx.equity     cash + holdings ctx.entryPrice  avg cost per unit
// ctx.state      object that persists between bars
//
// ctx.price(barsAgo)                 close N bars ago
// ctx.sma(period, barsAgo)           ctx.ema(period, barsAgo)
// ctx.rsi(period, barsAgo)           ctx.atr(period, barsAgo)
// ctx.bollinger(period, stdDevs)     -> { upper, middle, lower }
// ctx.macd(fast, slow, signal)       -> { macd, signal, histogram }
// Indicators return null until they have enough history.
//
// ctx.buy(fraction = 1)   spend a fraction of cash
// ctx.sell(fraction = 1)  sell a fraction of the position
// ctx.log(...values)      write to the backtest log

function onBar(ctx) {

}
`,
  },
];

export const DEFAULT_TEMPLATE = STRATEGY_TEMPLATES[0];
