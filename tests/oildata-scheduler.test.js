import { describe, expect, it } from 'vitest';
import {
  formatOilDataToText,
  formatVolume,
  generateCsvContent,
  millisecondsUntil,
  processOilData,
} from '../oildata-scheduler.js';

/** Minimal Yahoo Finance chart payload. */
function chartResponse({ timestamps, quote }) {
  return { chart: { result: [{ timestamp: timestamps, indicators: { quote: [quote] } }] } };
}

describe('processOilData', () => {
  it('maps timestamps and quote arrays into data points', () => {
    const response = chartResponse({
      // 2024-01-02 and 2024-01-03 UTC
      timestamps: [1704153600, 1704240000],
      quote: {
        open: [70, 71],
        high: [72, 73],
        low: [69, 70],
        close: [71, 72],
        volume: [1000, 2000],
      },
    });

    const points = processOilData(response);
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ open: 70, high: 72, low: 69, close: 71, volume: 1000 });
    expect(points[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('drops rows with a null close (market closed)', () => {
    const response = chartResponse({
      timestamps: [1704153600, 1704240000, 1704326400],
      quote: {
        open: [70, null, 72],
        high: [72, null, 74],
        low: [69, null, 71],
        close: [71, null, 73],
        volume: [1000, null, 3000],
      },
    });

    const points = processOilData(response);
    expect(points).toHaveLength(2);
    expect(points.every((p) => p.close != null)).toBe(true);
  });

  it('throws a clear error on an unexpected payload shape', () => {
    expect(() => processOilData({})).toThrow(/missing chart data/i);
    expect(() => processOilData({ chart: { result: [] } })).toThrow(/missing chart data/i);
  });
});

describe('formatVolume', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatVolume(1_500_000)).toBe('1.50M');
    expect(formatVolume(2500)).toBe('2.50K');
    expect(formatVolume(500)).toBe('500');
  });

  it('renders missing volume as N/A', () => {
    expect(formatVolume(null)).toBe('N/A');
    expect(formatVolume(undefined)).toBe('N/A');
  });
});

describe('formatOilDataToText', () => {
  const data = [
    { date: '2024-01-02', open: 70, high: 72, low: 69, close: 71, volume: 1000 },
    { date: '2024-01-03', open: 71, high: 73, low: 70, close: 75, volume: 2000 },
  ];

  it('lists the newest row first', () => {
    const text = formatOilDataToText(data);
    const body = text.split('Market Analysis:')[0];
    expect(body.indexOf('01/03/2024')).toBeLessThan(body.indexOf('01/02/2024'));
  });

  it('includes a market analysis section and an update timestamp', () => {
    const text = formatOilDataToText(data);
    expect(text).toContain('Market Analysis:');
    expect(text).toContain('Last Updated:');
    // 71 → 75 is an increase
    expect(text).toContain('increased');
  });

  it('handles an empty dataset without throwing', () => {
    expect(formatOilDataToText([])).toBe('No oil data available.');
  });
});

describe('generateCsvContent', () => {
  it('emits the header the app parses, oldest first', () => {
    const csv = generateCsvContent([
      { date: '2024-01-03', open: 71, high: 73, low: 70, close: 75, volume: 2000 },
      { date: '2024-01-02', open: 70, high: 72, low: 69, close: 71, volume: 1000 },
    ]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('Date,Open,High,Low,Close,Volume');
    expect(lines[1]).toBe('2024-01-02,70,72,69,71,1000');
    expect(lines[2]).toBe('2024-01-03,71,73,70,75,2000');
  });

  it('returns just the header for no data', () => {
    expect(generateCsvContent([])).toBe('Date,Open,High,Low,Close,Volume\n');
  });
});

describe('millisecondsUntil', () => {
  // 03:00 UTC == 10:00 GMT+7
  const at = (iso) => new Date(iso);

  it('schedules later the same day when the time has not passed', () => {
    // 00:00 UTC == 07:00 GMT+7, target 08:00 GMT+7 → 1 hour
    const ms = millisecondsUntil(8, 0, at('2024-05-01T00:00:00Z'), 7);
    expect(ms).toBe(60 * 60 * 1000);
  });

  it('rolls over to tomorrow when the time has already passed', () => {
    // 02:00 UTC == 09:00 GMT+7, target 08:00 GMT+7 → 23 hours
    const ms = millisecondsUntil(8, 0, at('2024-05-01T02:00:00Z'), 7);
    expect(ms).toBe(23 * 60 * 60 * 1000);
  });

  it('handles the target being minutes away', () => {
    // 00:30 UTC == 07:30 GMT+7, target 08:00 GMT+7 → 30 minutes
    const ms = millisecondsUntil(8, 0, at('2024-05-01T00:30:00Z'), 7);
    expect(ms).toBe(30 * 60 * 1000);
  });

  it('always returns a positive delay', () => {
    for (let hour = 0; hour < 24; hour++) {
      const now = at(`2024-05-01T${String(hour).padStart(2, '0')}:00:00Z`);
      const ms = millisecondsUntil(8, 0, now, 7);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    }
  });
});
