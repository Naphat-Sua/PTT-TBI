/**
 * Load OHLCV price bars from CSV exports (Yahoo Finance, Investing.com,
 * TradingView, or anything with a date column and a close/price column).
 */

import type { PriceBar } from '@/types';
import { parseCSV } from '@/utils/csv';

export interface ParsedPriceData {
  bars: PriceBar[];
  /** Rows that were skipped, with the reason */
  skipped: number;
  warnings: string[];
}

const COLUMN_ALIASES: Record<keyof PriceBar, string[]> = {
  date: ['date', 'datetime', 'time', 'timestamp', 'day'],
  close: ['close', 'adj close', 'adj. close', 'close/last', 'price', 'last', 'settle'],
  open: ['open'],
  high: ['high'],
  low: ['low'],
  volume: ['volume', 'vol', 'vol.'],
};

/** Parse CSV text into ascending, de-duplicated price bars. */
export function parsePriceCsv(csvText: string): ParsedPriceData {
  const rows = parseCSV(csvText.replace(/^\uFEFF/, ''));
  if (rows.length < 2) {
    throw new Error('The file has no data rows.');
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (key: keyof PriceBar) =>
    header.findIndex((h) => COLUMN_ALIASES[key].includes(h));

  const idx = {
    date: col('date'),
    close: col('close'),
    open: col('open'),
    high: col('high'),
    low: col('low'),
    volume: col('volume'),
  };

  if (idx.date === -1) throw new Error('Could not find a Date column.');
  if (idx.close === -1) throw new Error('Could not find a Close or Price column.');

  const warnings: string[] = [];
  if (idx.open === -1 || idx.high === -1 || idx.low === -1) {
    warnings.push('No full OHLC columns found; using the close price for open/high/low.');
  }

  const byDate = new Map<string, PriceBar>();
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const date = parseDate(row[idx.date] ?? '');
    const close = parseNumber(row[idx.close]);
    if (!date || close === null || close <= 0) {
      skipped++;
      continue;
    }
    const open = parseNumber(row[idx.open]) ?? close;
    const high = parseNumber(row[idx.high]) ?? Math.max(open, close);
    const low = parseNumber(row[idx.low]) ?? Math.min(open, close);
    const volume = parseNumber(row[idx.volume]) ?? 0;
    byDate.set(date, { date, open, high, low, close, volume });
  }

  const bars = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (bars.length === 0) throw new Error('No valid price rows found.');
  if (skipped > 0) warnings.push(`Skipped ${skipped} row(s) with a missing date or price.`);

  return { bars, skipped, warnings };
}

/** Keep bars whose date falls within [start, end] (inclusive, YYYY-MM-DD). */
export function filterByDate(bars: readonly PriceBar[], start?: string, end?: string): PriceBar[] {
  return bars.filter((b) => (!start || b.date >= start) && (!end || b.date <= end));
}

/** Serialize rows to CSV, quoting cells that need it. */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Parse a number like "1,234.5", "18.09K", "2.1M", "-0.66%".
 * Returns null for blanks and placeholders like "-" or "null".
 */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const text = raw.trim().replace(/[$,%\s]/g, '');
  if (text === '' || text === '-' || text.toLowerCase() === 'null') return null;

  const match = text.match(/^(-?\d*\.?\d+(?:e[-+]?\d+)?)([kmb])?$/i);
  if (!match) return null;
  const multiplier = { k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase() as 'k' | 'm' | 'b'] ?? 1;
  return parseFloat(match[1]) * multiplier;
}

/**
 * Normalize a date to YYYY-MM-DD. Accepts ISO dates/timestamps,
 * YYYY/MM/DD, and US-style MM/DD/YYYY (as exported by Investing.com).
 */
export function parseDate(raw: string): string | null {
  const text = raw.trim();
  let y: number, m: number, d: number;

  let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    [m, d, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if (/^\d{10}$/.test(text)) {
    return new Date(Number(text) * 1000).toISOString().slice(0, 10);
  } else {
    // e.g. "Apr 29, 2025": parsed in local time, so read local fields back
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    [y, m, d] = [parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()];
  }

  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}
