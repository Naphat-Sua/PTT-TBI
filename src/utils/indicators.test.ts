import { describe, expect, it } from 'vitest';
import { atr, bollinger, ema, macd, rsi, sma } from './indicators';

const ramp = Array.from({ length: 40 }, (_, i) => i + 1); // 1..40

describe('sma', () => {
  it('averages the trailing window and pads with null', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it('rejects invalid periods', () => {
    expect(() => sma([1, 2], 0)).toThrow();
    expect(() => sma([1, 2], 1.5)).toThrow();
  });
});

describe('ema', () => {
  it('seeds with the SMA, then smooths', () => {
    const out = ema([2, 4, 6, 8], 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBe(4); // SMA of 2,4,6
    expect(out[3]).toBeCloseTo(8 * 0.5 + 4 * 0.5); // k = 2/(3+1)
  });

  it('returns all nulls when there is not enough data', () => {
    expect(ema([1, 2], 5)).toEqual([null, null]);
  });
});

describe('rsi', () => {
  it('is 100 for a series that only rises', () => {
    const out = rsi(ramp, 14);
    expect(out[13]).toBeNull();
    expect(out[14]).toBe(100);
    expect(out[39]).toBe(100);
  });

  it('is 0 for a series that only falls', () => {
    expect(rsi([...ramp].reverse(), 14)[20]).toBe(0);
  });

  it('stays within 0-100 on a mixed series', () => {
    const zigzag = Array.from({ length: 60 }, (_, i) => 50 + Math.sin(i) * 5 + i * 0.1);
    for (const v of rsi(zigzag, 14)) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('bollinger', () => {
  it('collapses to the mean on a flat series', () => {
    const { upper, middle, lower } = bollinger(new Array(25).fill(10), 20, 2);
    expect(middle[24]).toBe(10);
    expect(upper[24]).toBe(10);
    expect(lower[24]).toBe(10);
  });

  it('places bands symmetrically around the SMA', () => {
    const { upper, middle, lower } = bollinger(ramp, 20, 2);
    const i = 30;
    expect((upper[i] as number) - (middle[i] as number)).toBeCloseTo(
      (middle[i] as number) - (lower[i] as number)
    );
    expect(upper[18]).toBeNull();
  });
});

describe('macd', () => {
  it('is positive on a rising series and has a signal line', () => {
    const series = Array.from({ length: 80 }, (_, i) => 100 + i);
    const m = macd(series);
    expect(m.macd[24]).toBeNull();
    expect(m.macd[25]).toBeGreaterThan(0);
    // signal needs 9 more MACD values
    expect(m.signal[32]).toBeNull();
    expect(m.signal[33]).not.toBeNull();
    expect(m.histogram[79]).toBeCloseTo((m.macd[79] as number) - (m.signal[79] as number));
  });

  it('requires fast < slow', () => {
    expect(() => macd(ramp, 26, 12)).toThrow();
  });
});

describe('atr', () => {
  it('equals the constant range for steady bars', () => {
    const n = 20;
    const closes = new Array(n).fill(100);
    const highs = new Array(n).fill(101);
    const lows = new Array(n).fill(99);
    const out = atr(highs, lows, closes, 14);
    expect(out[13]).toBeNull();
    expect(out[14]).toBeCloseTo(2);
    expect(out[19]).toBeCloseTo(2);
  });
});
