import { describe, expect, it } from 'vitest';
import { csvToReadableTable, formatCSVAsTable, parseCSV } from './csv';

describe('parseCSV', () => {
  it('parses simple rows', () => {
    expect(parseCSV('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted cells containing commas', () => {
    expect(parseCSV('name,notes\nWTI,"volatile, but rising"')).toEqual([
      ['name', 'notes'],
      ['WTI', 'volatile, but rising'],
    ]);
  });

  it('handles escaped quotes inside quoted cells', () => {
    expect(parseCSV('col\n"say ""hello"""')).toEqual([['col'], ['say "hello"']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCSV('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('skips empty rows', () => {
    expect(parseCSV('a,b\n\n1,2\n,\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles newlines inside quoted cells', () => {
    expect(parseCSV('col\n"line1\nline2"')).toEqual([['col'], ['line1\nline2']]);
  });
});

describe('formatCSVAsTable', () => {
  it('aligns columns and adds a separator under the header', () => {
    const table = formatCSVAsTable([
      ['Date', 'Close'],
      ['2024-01-01', '75.5'],
    ]);
    const lines = table.trimEnd().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Date');
    expect(lines[1]).toMatch(/^-+\+?[-+]*/);
    expect(lines[2]).toContain('2024-01-01');
  });

  it('returns an empty string for no rows', () => {
    expect(formatCSVAsTable([])).toBe('');
  });
});

describe('csvToReadableTable', () => {
  it('renders CSV text as an aligned table', () => {
    const out = csvToReadableTable('a,b\n1,2');
    expect(out).toContain('a');
    expect(out).toContain(' | ');
  });

  it('falls back to the raw text when nothing parses', () => {
    expect(csvToReadableTable('')).toBe('');
  });
});
