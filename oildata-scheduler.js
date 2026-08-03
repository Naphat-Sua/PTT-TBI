/**
 * Oil Data Scheduler
 *
 * Fetches WTI crude oil prices from Yahoo Finance and writes
 * `public/Oildata.txt` and `public/Oildata.csv` every day at 08:00 GMT+7.
 *
 * Run with: npm run scheduler
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Yahoo Finance chart endpoint for WTI Crude Oil futures.
// `range`/`interval` are explicit so the payload doesn't change under us.
const API_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart/CL=F?range=3mo&interval=1d';

const OUTPUT_DIR = path.resolve(__dirname, 'public');
const SCHEDULE_HOUR = 8; // 08:00 …
const SCHEDULE_MINUTE = 0;
const SCHEDULE_TZ_OFFSET = 7; // … in GMT+7
const FETCH_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;

const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);
const logError = (message, error) =>
  console.error(`[${new Date().toISOString()}] ${message}`, error ?? '');

/** Fetch the raw chart payload, with a timeout. */
async function fetchOilData() {
  const response = await fetch(API_URL, {
    headers: {
      // Yahoo rejects requests without a browser-like UA
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/** Fetch with exponential backoff so one flaky response doesn't skip a day. */
async function fetchOilDataWithRetry(attempts = MAX_ATTEMPTS) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetchOilData();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const delayMs = 2000 * 2 ** (attempt - 1);
        logError(`Fetch attempt ${attempt}/${attempts} failed, retrying in ${delayMs}ms:`, error);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Convert the raw API response into structured data points.
 * Rows where the market was closed (null close) are dropped rather than
 * written out as "N/A", which previously polluted the generated file.
 */
export function processOilData(apiResponse) {
  const result = apiResponse?.chart?.result?.[0];
  if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
    throw new Error('Unexpected API response shape: missing chart data');
  }

  const { timestamp: timestamps } = result;
  const quote = result.indicators.quote[0];

  return timestamps
    .map((ts, index) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quote.open?.[index],
      high: quote.high?.[index],
      low: quote.low?.[index],
      close: quote.close?.[index],
      volume: quote.volume?.[index],
    }))
    .filter((point) => point.close != null);
}

/** Format a YYYY-MM-DD date as MM/DD/YYYY. */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatNumber(num) {
  return num != null ? num.toFixed(2) : 'N/A';
}

export function formatVolume(volume) {
  if (volume == null) return 'N/A';
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
  return String(volume);
}

/** Human-readable market analysis appended to the text output. */
function generateMarketAnalysis(data) {
  if (data.length === 0) return 'No data available for analysis.';

  const latest = data[0];
  const oldest = data[data.length - 1];

  const priceChange = (latest.close ?? 0) - (oldest.close ?? 0);
  const percentChange = (priceChange / (oldest.close || 1)) * 100;

  const closePrices = data.map((p) => p.close).filter((price) => price > 0);
  const averagePrice = closePrices.reduce((sum, price) => sum + price, 0) / closePrices.length;
  const maxPrice = Math.max(...closePrices);
  const minPrice = Math.min(...closePrices);

  let largestDailyChange = 0;
  let largestDailyChangeDate = '';
  for (let i = 0; i < data.length - 1; i++) {
    const change = Math.abs((data[i].close ?? 0) - (data[i + 1].close ?? 0));
    if (change > largestDailyChange) {
      largestDailyChange = change;
      largestDailyChangeDate = data[i].date;
    }
  }

  let analysis =
    `The price of WTI crude oil has ${priceChange >= 0 ? 'increased' : 'decreased'} by ` +
    `$${Math.abs(priceChange).toFixed(2)} per barrel`;
  analysis += ` (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%) from ${formatDate(
    oldest.date
  )} to ${formatDate(latest.date)}.\n`;
  analysis += `The most recent price recorded was $${formatNumber(latest.close)} per barrel on ${formatDate(
    latest.date
  )}.\n`;
  analysis += `During this period, prices ranged from a low of $${minPrice.toFixed(
    2
  )} to a high of $${maxPrice.toFixed(2)} per barrel, with an average of $${averagePrice.toFixed(
    2
  )}.\n`;

  if (largestDailyChangeDate) {
    analysis += `The largest single-day price movement of $${largestDailyChange.toFixed(
      2
    )} per barrel occurred on ${formatDate(largestDailyChangeDate)}.\n`;
  }

  if (data.length >= 5) {
    const recent = data.slice(0, 5).map((p) => p.close ?? 0);
    if (recent[0] > recent[4]) {
      analysis += 'The recent 5-day trend shows overall price increases.\n';
    } else if (recent[0] < recent[4]) {
      analysis += 'The recent 5-day trend shows overall price decreases.\n';
    } else {
      analysis += 'The recent 5-day trend shows relatively stable prices.\n';
    }
  }

  return analysis;
}

/** Render the aligned text report (newest first). */
export function formatOilDataToText(oilData) {
  if (!oilData || oilData.length === 0) return 'No oil data available.';

  const sorted = [...oilData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let text = 'WTI Oil Price Data\n\n';
  text +=
    'Date'.padEnd(12) +
    'Price(USD)'.padEnd(12) +
    'Open'.padEnd(10) +
    'High'.padEnd(10) +
    'Low'.padEnd(10) +
    'Volume\n';
  text += ''.padEnd(70, '-') + '\n';

  for (const point of sorted) {
    text +=
      formatDate(point.date).padEnd(12) +
      `$${formatNumber(point.close)}`.padEnd(12) +
      `$${formatNumber(point.open)}`.padEnd(10) +
      `$${formatNumber(point.high)}`.padEnd(10) +
      `$${formatNumber(point.low)}`.padEnd(10) +
      `${formatVolume(point.volume)}\n`;
  }

  text += '\nMarket Analysis:\n';
  text += generateMarketAnalysis(sorted);
  text += '\n\nLast Updated: ' + new Date().toISOString();

  return text;
}

/** Render CSV (oldest first) matching the header the app parses. */
export function generateCsvContent(oilData) {
  const header = 'Date,Open,High,Low,Close,Volume\n';
  if (!oilData || oilData.length === 0) return header;

  const sorted = [...oilData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    header +
    sorted
      .map(
        (p) =>
          `${p.date},${p.open ?? ''},${p.high ?? ''},${p.low ?? ''},${p.close ?? ''},${
            p.volume ?? ''
          }`
      )
      .join('\n') +
    '\n'
  );
}

/**
 * Write atomically: render to a temp file and rename over the target, so a
 * crash mid-write can never leave the app reading a truncated data file.
 */
function writeFileAtomic(filePath, contents) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, contents, 'utf8');
  fs.renameSync(tempPath, filePath);
}

/** Fetch fresh data and refresh the generated files. */
async function updateOilDataFile() {
  log('Starting oil data update...');

  const apiResponse = await fetchOilDataWithRetry();
  const oilData = processOilData(apiResponse);

  if (oilData.length === 0) {
    // Never overwrite good data with an empty file
    throw new Error('API returned no usable data points; keeping existing files');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const txtFilePath = path.join(OUTPUT_DIR, 'Oildata.txt');
  const csvFilePath = path.join(OUTPUT_DIR, 'Oildata.csv');

  writeFileAtomic(txtFilePath, formatOilDataToText(oilData));
  writeFileAtomic(csvFilePath, generateCsvContent(oilData));

  log(`Oil data updated successfully (${oilData.length} data points)`);
  log(`- Text file: ${txtFilePath}`);
  log(`- CSV file:  ${csvFilePath}`);
}

/** Milliseconds until the next HH:MM occurrence in the configured timezone. */
export function millisecondsUntil(hours, minutes, now = new Date(), tzOffsetHours = SCHEDULE_TZ_OFFSET) {
  const tzNow = new Date(now.getTime() + tzOffsetHours * 60 * 60 * 1000);

  const target = new Date(tzNow);
  target.setUTCHours(hours, minutes, 0, 0);
  if (target.getTime() <= tzNow.getTime()) {
    // Already passed today — schedule for tomorrow
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target.getTime() - tzNow.getTime();
}

/** Run `task` daily at the given local (GMT+7) time. */
function scheduleTaskAtTime(hours, minutes, task) {
  const scheduleNext = () => {
    const delay = millisecondsUntil(hours, minutes);
    log(`Next execution scheduled in ${(delay / 60_000).toFixed(1)} minutes`);
    // `unref()` is intentionally not called: the timer keeps the process alive.
    setTimeout(async () => {
      try {
        log('Running scheduled task');
        await task();
        log('Task completed successfully');
      } catch (error) {
        logError('Error executing scheduled task:', error);
      } finally {
        // Always re-arm, even after a failure
        scheduleNext();
      }
    }, delay);
  };

  scheduleNext();
}

// --- Main -------------------------------------------------------------------

function main() {
  log('Oil Data Scheduler started');
  log(
    `Updating public/Oildata.txt and public/Oildata.csv daily at ` +
      `${String(SCHEDULE_HOUR).padStart(2, '0')}:${String(SCHEDULE_MINUTE).padStart(2, '0')} GMT+${SCHEDULE_TZ_OFFSET}`
  );

  scheduleTaskAtTime(SCHEDULE_HOUR, SCHEDULE_MINUTE, updateOilDataFile);

  // Also run once immediately on startup
  updateOilDataFile().catch((error) => {
    logError('Failed to update oil data on startup:', error);
  });

  // Exit cleanly on Ctrl-C / container stop
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      log(`Received ${signal}, shutting down scheduler`);
      process.exit(0);
    });
  }
}

// Only start the daemon when executed directly, so tests can import the
// pure helpers above without kicking off timers and network calls.
const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main();
}
