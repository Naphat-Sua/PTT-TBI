import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { filterByDate, parseDate, parseNumber, parsePriceCsv, toCsv } from './priceData';

describe('parseNumber', () => {
  it('handles separators, suffixes and placeholders', () => {
    expect(parseNumber('1,234.5')).toBe(1234.5);
    expect(parseNumber('18.09K')).toBeCloseTo(18090);
    expect(parseNumber('2.5M')).toBe(2_500_000);
    expect(parseNumber('-0.66%')).toBe(-0.66);
    expect(parseNumber('$61.61')).toBe(61.61);
    expect(parseNumber('-')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });
});

describe('parseDate', () => {
  it('normalizes common formats to YYYY-MM-DD', () => {
    expect(parseDate('2025-04-29')).toBe('2025-04-29');
    expect(parseDate('2025-04-29 00:00:00-04:00')).toBe('2025-04-29');
    expect(parseDate('2025/4/9')).toBe('2025-04-09');
    expect(parseDate('04/29/2025')).toBe('2025-04-29');
    expect(parseDate('Apr 29, 2025')).toBe('2025-04-29');
  });

  it('rejects impossible dates', () => {
    expect(parseDate('2025-02-30')).toBeNull();
    expect(parseDate('13/01/2025')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
  });
});

describe('parsePriceCsv', () => {
  it('parses a Yahoo-style export and sorts ascending', () => {
    const csv = [
      'Date,Open,High,Low,Close,Adj Close,Volume',
      '2024-01-03,72,73,71,72.5,72.5,1000',
      '2024-01-02,70,71,69,70.5,70.5,900',
    ].join('\n');
    const { bars, warnings } = parsePriceCsv(csv);
    expect(bars.map((b) => b.date)).toEqual(['2024-01-02', '2024-01-03']);
    expect(bars[0]).toEqual({ date: '2024-01-02', open: 70, high: 71, low: 69, close: 70.5, volume: 900 });
    expect(warnings).toEqual([]);
  });

  it('fills OHLC from close when only a price column exists', () => {
    const { bars, warnings } = parsePriceCsv('date,price\n2024-01-02,10\n2024-01-03,11');
    expect(bars[1]).toMatchObject({ open: 11, high: 11, low: 11, close: 11 });
    expect(warnings[0]).toMatch(/OHLC/);
  });

  it('skips bad rows and de-duplicates dates', () => {
    const csv = 'Date,Close\n2024-01-02,10\n2024-01-02,12\nbad,5\n2024-01-03,-\n';
    const { bars, skipped } = parsePriceCsv(csv);
    expect(bars).toHaveLength(1);
    expect(bars[0].close).toBe(12);
    expect(skipped).toBe(2);
  });

  it('explains missing columns', () => {
    expect(() => parsePriceCsv('Close\n1')).toThrow(/Date/);
    expect(() => parsePriceCsv('Date,Foo\n2024-01-01,1')).toThrow(/Close/);
    expect(() => parsePriceCsv('Date,Close')).toThrow(/no data/);
  });

  it('reads the bundled WTI sample (Investing.com format)', () => {
    const text = readFileSync(resolve(__dirname, '../../public/Oildata-current.txt'), 'utf8');
    const { bars } = parsePriceCsv(text);
    expect(bars.length).toBeGreaterThan(10);
    expect(bars[bars.length - 1]).toMatchObject({ date: '2025-04-29', close: 61.61, open: 62.02 });
    expect(bars[bars.length - 1].volume).toBeCloseTo(18090);
  });
});

describe('filterByDate', () => {
  it('keeps the inclusive range', () => {
    const bars = ['2024-01-01', '2024-01-02', '2024-01-03'].map((date) => ({
      date, open: 1, high: 1, low: 1, close: 1, volume: 0,
    }));
    expect(filterByDate(bars, '2024-01-02', '2024-01-03')).toHaveLength(2);
    expect(filterByDate(bars)).toHaveLength(3);
  });
});

describe('toCsv', () => {
  it('quotes cells that need it', () => {
    expect(toCsv([['a', 'b,c'], [1, 'say "hi"']])).toBe('a,"b,c"\n1,"say ""hi"""');
  });
});
