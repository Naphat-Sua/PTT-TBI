import { Document } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface OilDataPoint {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  value?: number;
}

/**
 * Static oil data to use instead of API calls
 * This simulates data that would normally come from the Yahoo Finance API
 */
const STATIC_OIL_DATA: OilDataPoint[] = [
  { date: '2025-04-24', open: 78.22, high: 79.35, low: 77.91, close: 79.10, volume: 289450 },
  { date: '2025-04-23', open: 77.41, high: 78.33, low: 76.98, close: 78.22, volume: 298312 },
  { date: '2025-04-22', open: 76.85, high: 77.66, low: 76.27, close: 77.41, volume: 256789 },
  { date: '2025-04-21', open: 76.12, high: 77.03, low: 75.89, close: 76.85, volume: 243210 },
  { date: '2025-04-18', open: 77.25, high: 77.78, low: 75.99, close: 76.12, volume: 198765 },
  { date: '2025-04-17', open: 78.55, high: 78.92, low: 77.15, close: 77.25, volume: 212543 },
  { date: '2025-04-16', open: 79.21, high: 79.65, low: 78.44, close: 78.55, volume: 187654 },
  { date: '2025-04-15', open: 80.34, high: 80.87, low: 79.11, close: 79.21, volume: 225678 },
  { date: '2025-04-14', open: 81.76, high: 82.10, low: 80.21, close: 80.34, volume: 245678 },
  { date: '2025-04-11', open: 82.43, high: 82.99, low: 81.55, close: 81.76, volume: 198543 },
  { date: '2025-04-10', open: 81.95, high: 83.05, low: 81.67, close: 82.43, volume: 223456 },
  { date: '2025-04-09', open: 80.67, high: 82.45, low: 80.44, close: 81.95, volume: 234567 },
  { date: '2025-04-08', open: 79.87, high: 80.78, low: 79.50, close: 80.67, volume: 176543 },
  { date: '2025-04-07', open: 79.12, high: 80.34, low: 78.90, close: 79.87, volume: 187654 },
  { date: '2025-04-04', open: 78.65, high: 79.45, low: 78.32, close: 79.12, volume: 165432 },
  { date: '2025-04-03', open: 77.98, high: 78.87, low: 77.68, close: 78.65, volume: 176543 },
  { date: '2025-04-02', open: 77.23, high: 78.12, low: 76.89, close: 77.98, volume: 187654 },
  { date: '2025-04-01', open: 76.45, high: 77.56, low: 76.21, close: 77.23, volume: 178965 },
  { date: '2025-03-31', open: 75.78, high: 76.67, low: 75.34, close: 76.45, volume: 154321 },
  { date: '2025-03-28', open: 76.32, high: 76.89, low: 75.43, close: 75.78, volume: 176543 }
];

/**
 * Loads WTI crude oil data from the Oildata-current.txt file
 * @returns {Promise<string>} The content of the Oildata-current.txt file
 */
export async function loadOilDataFromFile(): Promise<string> {
  try {
    // Fetch the Oildata-current.txt file from the root directory
    const response = await fetch('/Oildata-current.txt');
    if (!response.ok) {
      throw new Error(`Failed to fetch Oildata-current.txt: ${response.status} ${response.statusText}`);
    }
    
    // Get the text content
    const textContent = await response.text();
    
    // If the content is CSV, convert it to a more readable format
    if (textContent.trim().startsWith('Date,Open,High,Low,Close,Volume')) {
      return formatCsvToReadableText(textContent);
    }
    
    return textContent;
  } catch (error) {
    console.error('Error loading oil data from file:', error);
    throw error;
  }
}

/**
 * Creates a Document object from the Oildata.txt file content
 * @returns {Promise<Document>} The document object with oil data from file
 */
export async function createOilDataDocumentFromFile(): Promise<Document> {
  try {
    // Load the content from Oildata.txt
    const textContent = await loadOilDataFromFile();
    
    // Create a preview of the document (first 500 characters)
    const preview = textContent.substring(0, 500) + (textContent.length > 500 ? '...' : '');
    
    // Create a document object with the oil data
    const document: Document = {
      id: uuidv4(),
      name: 'finance.yahoo.com/quote/CL=F/',
      type: 'text/plain',
      size: new Blob([textContent]).size,
      uploadedAt: new Date(),
      content: textContent,
      preview,
      summary: extractSummaryFromFileContent(textContent),
      tags: ['oil', 'wti', 'crude', 'finance']
    };
    
    return document;
  } catch (error) {
    console.error('Error creating oil data document from file:', error);
    throw error;
  }
}

/**
 * Extracts the summary section from the file content
 * @param {string} textContent - The content of Oildata.txt
 * @returns {string} Extracted summary
 */
function extractSummaryFromFileContent(textContent: string): string {
  // Try to extract the "Market Analysis" section as the summary
  const marketAnalysisMatch = textContent.match(/Market Analysis:\s*([\s\S]+?)(?:\n\n|\n$|$)/);
  if (marketAnalysisMatch && marketAnalysisMatch[1]) {
    return marketAnalysisMatch[1].trim();
  }
  
  // If no market analysis section, return the first few lines
  const firstLines = textContent.split('\n').slice(0, 6).join('\n');
  return `WTI Crude Oil Price Summary\n\n${firstLines}`;
}

/**
 * Simulates fetching WTI crude oil data
 * @returns {Promise<OilDataPoint[]>} The oil data points
 */
export async function fetchOilData(): Promise<OilDataPoint[]> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Return static data instead of fetching from API
    return [...STATIC_OIL_DATA];
  } catch (error) {
    console.error('Error fetching oil data:', error);
    throw error;
  }
}

/**
 * Converts oil data points to a CSV string
 * @param {OilDataPoint[]} oilData - The oil data points
 * @returns {string} The CSV formatted data
 */
export function formatOilDataToCsv(oilData: OilDataPoint[]): string {
  let csvContent = 'Date,Open,High,Low,Close,Volume\n';
  
  for (const point of oilData) {
    csvContent += `${point.date},${point.open},${point.high},${point.low},${point.close},${point.volume}\n`;
  }
  
  return csvContent;
}

/**
 * Converts oil data points to a well-formatted text string for Gemini API
 * @param {OilDataPoint[]} oilData - The oil data points
 * @returns {string} The text formatted data
 */
export function formatOilDataToText(oilData: OilDataPoint[]): string {
  // Sort data by date (most recent first)
  const sortedData = [...oilData].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Create header
  let textContent = 'WTI Oil Price Data\n\n';
  textContent += 'Date'.padEnd(12) + 'Price(USD)'.padEnd(12) + 'Open'.padEnd(10) + 'High'.padEnd(10) + 'Low'.padEnd(10) + 'Volume\n';
  textContent += ''.padEnd(70, '-') + '\n';
  
  // Add data rows
  for (const point of sortedData) {
    const formattedDate = formatDate(point.date);
    textContent += formattedDate.padEnd(12) + 
                   `$${point.close?.toFixed(2)}`.padEnd(12) + 
                   `$${point.open?.toFixed(2)}`.padEnd(10) + 
                   `$${point.high?.toFixed(2)}`.padEnd(10) + 
                   `$${point.low?.toFixed(2)}`.padEnd(10) + 
                   `${formatVolume(point.volume)}\n`;
  }
  
  // Add market analysis
  textContent += '\nMarket Analysis:\n';
  textContent += generateMarketAnalysis(sortedData);
  
  return textContent;
}

/**
 * Formats a date string from YYYY-MM-DD to more readable format
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit'
  });
}

/**
 * Formats volume numbers with K/M suffixes
 * @param {number | undefined} volume - The volume value
 * @returns {string} Formatted volume
 */
function formatVolume(volume: number | undefined): string {
  if (!volume) return '-';
  
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`;
  } else {
    return volume.toString();
  }
}

/**
 * Generates market analysis text for the oil data
 * @param {OilDataPoint[]} data - Sorted oil data points (newest first)
 * @returns {string} Market analysis text
 */
function generateMarketAnalysis(data: OilDataPoint[]): string {
  if (data.length === 0) return 'No data available for analysis.';
  
  const latestData = data[0];
  const oldestData = data[data.length - 1];
  
  // Calculate price changes
  const priceChange = ((latestData.close || 0) - (oldestData.close || 0));
  const percentChange = (priceChange / (oldestData.close || 1)) * 100;
  
  // Calculate basic statistics
  const closePrices = data.map(point => point.close || 0).filter(price => price > 0);
  const averagePrice = closePrices.reduce((sum, price) => sum + price, 0) / closePrices.length;
  const maxPrice = Math.max(...closePrices);
  const minPrice = Math.min(...closePrices);
  
  // Find largest single-day movement
  let largestDailyChange = 0;
  let largestDailyChangeDate = '';
  
  for (let i = 0; i < data.length - 1; i++) {
    const today = data[i].close || 0;
    const yesterday = data[i + 1].close || 0;
    const change = Math.abs(today - yesterday);
    
    if (change > largestDailyChange) {
      largestDailyChange = change;
      largestDailyChangeDate = data[i].date;
    }
  }
  
  // Generate the analysis text
  let analysis = `The price of WTI crude oil has ${priceChange >= 0 ? 'increased' : 'decreased'} by $${Math.abs(priceChange).toFixed(2)} per barrel`;
  analysis += ` (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%) from ${formatDate(oldestData.date)} to ${formatDate(latestData.date)}.\n`;
  analysis += `The most recent price recorded was $${latestData.close?.toFixed(2)} per barrel on ${formatDate(latestData.date)}.\n`;
  analysis += `During this period, prices ranged from a low of $${minPrice.toFixed(2)} to a high of $${maxPrice.toFixed(2)} per barrel, with an average of $${averagePrice.toFixed(2)}.\n`;
  
  if (largestDailyChangeDate) {
    analysis += `The largest single-day price movement of $${largestDailyChange.toFixed(2)} per barrel occurred on ${formatDate(largestDailyChangeDate)}.\n`;
  }
  
  // Add trend indication
  if (data.length >= 5) {
    const recentTrend = data.slice(0, 5).map(p => p.close || 0);
    let trendDesc = '';
    
    if (recentTrend[0] > recentTrend[4]) {
      trendDesc = 'The recent 5-day trend shows overall price increases.';
    } else if (recentTrend[0] < recentTrend[4]) {
      trendDesc = 'The recent 5-day trend shows overall price decreases.';
    } else {
      trendDesc = 'The recent 5-day trend shows relatively stable prices.';
    }
    
    analysis += trendDesc + '\n';
  }
  
  return analysis;
}

/**
 * Creates a Document object from the oil data
 * @param {OilDataPoint[]} oilData - The oil data points
 * @returns {Document} The document object with oil data
 */
export function createOilDataDocument(oilData: OilDataPoint[]): Document {
  const csvContent = formatOilDataToCsv(oilData);
  
  // Create a preview of the document (first 500 characters)
  const preview = csvContent.substring(0, 500) + (csvContent.length > 500 ? '...' : '');
  
  // Create a document object with the oil data
  const document: Document = {
    id: uuidv4(),
    name: 'finance.yahoo.com/quote/CL=F/',
    type: 'text/csv',
    size: new Blob([csvContent]).size,
    uploadedAt: new Date(),
    content: csvContent,
    preview,
    summary: generateSummary(oilData),
    tags: ['oil', 'wti', 'crude', 'finance']
  };
  
  return document;
}

/**
 * Generates a simple summary of the oil data
 * @param {OilDataPoint[]} oilData - The oil data points
 * @returns {string} A summary of the oil data
 */
function generateSummary(oilData: OilDataPoint[]): string {
  if (oilData.length === 0) return 'No WTI crude oil data available.';
  
  // Sort data by date (most recent first)
  const sortedData = [...oilData].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const latestData = sortedData[0];
  const oldestData = sortedData[sortedData.length - 1];
  
  // Calculate basic statistics
  const closePrices = sortedData.map(point => point.close || 0).filter(price => price > 0);
  const averagePrice = closePrices.reduce((sum, price) => sum + price, 0) / closePrices.length;
  const maxPrice = Math.max(...closePrices);
  const minPrice = Math.min(...closePrices);
  
  // Calculate price change
  const priceChange = ((latestData.close || 0) - (oldestData.close || 0));
  const percentChange = (priceChange / (oldestData.close || 1)) * 100;
  
  return `WTI Crude Oil Price Summary (${oldestData.date} to ${latestData.date})
  
Latest price: $${latestData.close?.toFixed(2)} per barrel
Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)} per barrel
Average price: $${averagePrice.toFixed(2)} per barrel
Price change: ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)} (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%)

This dataset contains daily WTI crude oil prices with open, high, low, close prices and trading volumes.`;
}

/**
 * Formats CSV data to a more readable text format
 * @param {string} csvContent - The CSV content
 * @returns {string} Formatted text
 */
function formatCsvToReadableText(csvContent: string): string {
  // Parse CSV
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => line.split(','));
  
  // Sort data by date (most recent first)
  rows.sort((a, b) => {
    // Assuming date is in the first column
    return new Date(b[0]).getTime() - new Date(a[0]).getTime();
  });
  
  // Create header
  let textContent = 'WTI Oil Price Data\n\n';
  textContent += 'Date'.padEnd(12) + 'Price(USD)'.padEnd(12) + 'Open'.padEnd(10) + 'High'.padEnd(10) + 'Low'.padEnd(10) + 'Volume\n';
  textContent += ''.padEnd(70, '-') + '\n';
  
  // Add data rows
  for (const row of rows) {
    const date = formatDate(row[0]);
    const close = parseFloat(row[4]);
    const open = parseFloat(row[1]);
    const high = parseFloat(row[2]);
    const low = parseFloat(row[3]);
    const volume = parseInt(row[5]);
    
    textContent += date.padEnd(12) + 
                  `$${close.toFixed(2)}`.padEnd(12) + 
                  `$${open.toFixed(2)}`.padEnd(10) + 
                  `$${high.toFixed(2)}`.padEnd(10) + 
                  `$${low.toFixed(2)}`.padEnd(10) + 
                  `${formatVolume(volume)}\n`;
  }
  
  // Add market analysis
  textContent += '\nMarket Analysis:\n';
  textContent += generateMarketAnalysisFromCsv(rows);
  
  return textContent;
}

/**
 * Generates market analysis text from CSV data rows
 * @param {string[][]} rows - CSV data rows
 * @returns {string} Market analysis text
 */
function generateMarketAnalysisFromCsv(rows: string[][]): string {
  if (rows.length === 0) return 'No data available for analysis.';
  
  // Get latest and oldest data
  const latestData = rows[0];
  const oldestData = rows[rows.length - 1];
  
  // Extract data
  const latestDate = formatDate(latestData[0]);
  const oldestDate = formatDate(oldestData[0]);
  const latestClose = parseFloat(latestData[4]);
  const oldestClose = parseFloat(oldestData[4]);
  
  // Calculate price changes
  const priceChange = latestClose - oldestClose;
  const percentChange = (priceChange / oldestClose) * 100;
  
  // Calculate basic statistics
  const closePrices = rows.map(row => parseFloat(row[4]));
  const averagePrice = closePrices.reduce((sum, price) => sum + price, 0) / closePrices.length;
  const maxPrice = Math.max(...closePrices);
  const minPrice = Math.min(...closePrices);
  
  // Generate the analysis text
  let analysis = `The price of WTI crude oil has ${priceChange >= 0 ? 'increased' : 'decreased'} by $${Math.abs(priceChange).toFixed(2)} per barrel`;
  analysis += ` (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%) from ${oldestDate} to ${latestDate}.\n`;
  analysis += `The most recent price recorded was $${latestClose.toFixed(2)} per barrel on ${latestDate}.\n`;
  analysis += `During this period, prices ranged from a low of $${minPrice.toFixed(2)} to a high of $${maxPrice.toFixed(2)} per barrel, with an average of $${averagePrice.toFixed(2)}.\n`;
  
  // Add trend indication for the latest week (if we have enough data)
  if (rows.length >= 5) {
    const recentPrices = rows.slice(0, 5).map(row => parseFloat(row[4]));
    
    if (recentPrices[0] > recentPrices[recentPrices.length - 1]) {
      analysis += "The past week shows an upward trend in oil prices.\n";
    } else if (recentPrices[0] < recentPrices[recentPrices.length - 1]) {
      analysis += "The past week shows a downward trend in oil prices.\n";
    } else {
      analysis += "The past week shows relatively stable oil prices.\n";
    }
  }
  
  // Add today's context (April 24, 2025)
  analysis += "\nAs of April 24, 2025, the WTI crude oil market is showing signs of ";
  
  const last2Days = rows.slice(0, 2).map(row => parseFloat(row[4]));
  if (last2Days[0] > last2Days[1]) {
    analysis += "recovery with prices increasing from the previous day.";
  } else {
    analysis += "pressure with prices decreasing from the previous day.";
  }
  
  return analysis;
}