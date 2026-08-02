/**
 * CSV parsing and formatting utilities.
 * A real RFC-4180-style parser: handles quoted cells, escaped quotes,
 * commas inside quotes, and CRLF line endings.
 */

/** Parse CSV text into rows of trimmed cells. Empty rows are skipped. */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = i < csvText.length - 1 ? csvText[i + 1] : '';

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside a quoted cell
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      if (char === '\r') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  // Flush the final cell/row
  if (currentCell !== '') {
    currentRow.push(currentCell.trim());
  }
  if (currentRow.length > 0 && currentRow.some((cell) => cell !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

/** Format parsed CSV rows as an aligned plain-text table. */
export function formatCSVAsTable(csvData: string[][]): string {
  if (csvData.length === 0) return '';

  const columnWidths: number[] = [];
  for (const row of csvData) {
    for (let i = 0; i < row.length; i++) {
      columnWidths[i] = Math.max(columnWidths[i] || 0, row[i].length);
    }
  }

  let result = '';

  const headerRow = csvData[0];
  result += headerRow.map((cell, i) => cell.padEnd(columnWidths[i])).join(' | ');
  result += '\n';
  result += headerRow.map((_, i) => '-'.repeat(columnWidths[i])).join('-+-');
  result += '\n';

  for (let i = 1; i < csvData.length; i++) {
    const row = csvData[i];
    result += row.map((cell, j) => cell.padEnd(columnWidths[j] ?? cell.length)).join(' | ');
    result += '\n';
  }

  return result;
}

/**
 * Convert raw CSV text into a readable aligned table.
 * Falls back to the raw text if parsing yields nothing.
 */
export function csvToReadableTable(csvText: string): string {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return csvText;
  return formatCSVAsTable(rows);
}
