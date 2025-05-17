import { Message, QueryResult, BacktestRequest, BacktestResult, PriceBar, TradeSignal, EquityPoint, BacktestPerformance } from '@/types';
import fs from 'fs';
import path from 'path';
import emailjs from '@emailjs/browser';

// Gemini API configuration
const GEMINI_API_KEY = 'Insert your API key here';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Function to query the Gemini API
export async function queryGemini(prompt: string, context?: string): Promise<string> {
  try {
    const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    
    let content = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };
    
    // Add context from RAG if available
    if (context) {
      content = {
        contents: [{
          parts: [
            { text: `${context}\n\nUser query: ${prompt}` }
          ]
        }]
      };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...content,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error querying Gemini API:', error);
    return `I encountered an error while processing your request. Please try again. (Error: ${error instanceof Error ? error.message : 'Unknown error'})`;
  }
}

/**
 * Function to specifically handle oil data queries by directly using Oildata-current.txt
 */
export async function queryOilData(query: string): Promise<QueryResult> {
  try {
    // Fetch the Oildata-current.txt file
    const response = await fetch('/Oildata-current.txt');
    if (!response.ok) {
      throw new Error(`Failed to fetch Oildata-current.txt: ${response.status} ${response.statusText}`);
    }
    
    // Get the content as text
    const oilDataText = await response.text();
    
    // Format the data for better readability
    const formattedOilData = formatCsvForAnalysis(oilDataText);
    
    // Create a prompt that includes today's date, the oil data, and the user's query
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric', 
      year: 'numeric'
    });
    
    const contextPrompt = `Today is ${today}.
    
You are an oil market analyst assistant. You have the following WTI Crude Oil price data:

${formattedOilData}

Answer the following question with factual information from the data provided. Include specific prices and dates from the data when relevant. If asked about trends, analyze the price movement pattern over the given date range.

User question: ${query}`;
    
    // Send the query with context to Gemini
    const answer = await queryGemini(query, contextPrompt);
    
    // Create a source reference for the oil data
    const sources = [{
      documentId: 'oil-data-current',
      documentName: 'finance.yahoo.com/quote/CL=F/',
      excerpt: oilDataText.substring(0, 200) + '...'
    }];
    
    // Return the result
    return {
      query,
      answer,
      sources
    };
  } catch (error) {
    console.error('Error querying oil data:', error);
    throw error;
  }
}

/**
 * Format CSV data for better analysis
 */
function formatCsvForAnalysis(csvData: string): string {
  try {
    // Parse the CSV data
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');
    const data = lines.slice(1).map(line => line.split(','));
    
    // Sort data by date (newest first)
    data.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    
    // Create a formatted table with headers
    let formattedData = 'WTI Crude Oil Price Data:\n\n';
    formattedData += 'Date'.padEnd(12) + 'Close'.padEnd(10) + 'Open'.padEnd(10) + 'High'.padEnd(10) + 'Low'.padEnd(10) + 'Volume\n';
    formattedData += '-'.repeat(60) + '\n';
    
    // Add the data rows
    for (const row of data) {
      const date = new Date(row[0]);
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit'
      });
      
      formattedData += formattedDate.padEnd(12) + 
                      `$${parseFloat(row[4]).toFixed(2)}`.padEnd(10) + 
                      `$${parseFloat(row[1]).toFixed(2)}`.padEnd(10) + 
                      `$${parseFloat(row[2]).toFixed(2)}`.padEnd(10) + 
                      `$${parseFloat(row[3]).toFixed(2)}`.padEnd(10) + 
                      row[5] + '\n';
    }
    
    // Add some summary statistics
    formattedData += '\nMarket Analysis:\n';
    
    // Calculate price change over the period
    const newest = data[0];
    const oldest = data[data.length - 1];
    const newestClose = parseFloat(newest[4]);
    const oldestClose = parseFloat(oldest[4]);
    const priceDiff = newestClose - oldestClose;
    const percentChange = (priceDiff / oldestClose * 100).toFixed(2);
    
    formattedData += `- From ${new Date(oldest[0]).toLocaleDateString()} to ${new Date(newest[0]).toLocaleDateString()}, `; 
    formattedData += `WTI crude oil prices have ${priceDiff >= 0 ? 'increased' : 'decreased'} by `;
    formattedData += `$${Math.abs(priceDiff).toFixed(2)} (${priceDiff >= 0 ? '+' : ''}${percentChange}%).\n`;
    
    // Add recent trend analysis (last 5 days)
    const recentData = data.slice(0, 5);
    if (recentData.length >= 3) {
      const latestClose = parseFloat(recentData[0][4]);
      const prevClose = parseFloat(recentData[recentData.length - 1][4]);
      formattedData += `- In the last ${recentData.length} trading days, the price has ${latestClose > prevClose ? 'risen' : 'fallen'} `;
      formattedData += `from $${prevClose.toFixed(2)} to $${latestClose.toFixed(2)}.\n`;
    }
    
    return formattedData;
  } catch (error) {
    console.error('Error formatting CSV data:', error);
    return csvData; // Return original data if formatting fails
  }
}

// Function to simulate RAG query (this would connect to the real backend in production)
export async function queryRAG(query: string, documents: string[], documentNames?: string[]): Promise<QueryResult> {
  try {
    // In a real implementation, this would:
    // 1. Convert the query to an embedding
    // 2. Search the vector store for similar document chunks
    // 3. Pass the retrieved chunks and query to an LLM
    // 4. Return the response with sources
    
    // Read oil price data from Oildata.txt when no documents are provided
    let oilPriceData = '';
    
    if (documents.length === 0) {
      try {
        // Attempt to fetch the Oildata.txt file
        const response = await fetch('/Oildata.txt');
        if (response.ok) {
          oilPriceData = await response.text();
        } else {
          console.error('Failed to load Oildata.txt, falling back to default data');
          // Fallback to a minimal text version if file fetch fails
          oilPriceData = `WTI Oil Price Data (April 2025)
          
Date        Price(USD)   Change    
04/23/2025  64.08       -0.25%
04/22/2025  64.24       +2.93%
04/21/2025  62.41       -2.50%
04/17/2025  64.01       +3.53%
04/16/2025  61.83       +1.78%
04/15/2025  60.75       -0.49%`;
        }
      } catch (error) {
        console.error('Error loading oil data:', error);
        // Fallback to minimal text version
        oilPriceData = `WTI Oil Price Data (April 2025)
        
Date        Price(USD)   Change    
04/23/2025  64.08       -0.25%
04/22/2025  64.24       +2.93%
04/21/2025  62.41       -2.50%
04/17/2025  64.01       +3.53%`;
      }
    }
    
    // Use the provided documents if available, otherwise use the oil price data
    const contextData = documents.length > 0 ? documents.join('\n\n') : oilPriceData;
    
    const simulatedResponse = await queryGemini(
      `Query: ${query}\n\nBased on the following context, please provide a detailed answer:\n${contextData}`,
    );
    
    // Create sources using actual document names when available
    const sources = [];
    
    if (documents.length > 0 && documentNames && documentNames.length > 0) {
      // Use actual document names for uploaded files
      for (let i = 0; i < Math.min(documents.length, documentNames.length); i++) {
        sources.push({
          documentId: `doc-${i+1}`,
          documentName: documentNames[i],
          excerpt: documents[i].substring(0, 100) + '...'
        });
      }
    } else {
      // Fallback to sample data
      sources.push({
        documentId: 'oil-data-1',
        documentName: 'Oil Price Data',
        excerpt: oilPriceData.substring(0, 300) + '...'
      });
    }
    
    return {
      answer: simulatedResponse,
      sources: sources
    };
  } catch (error) {
    console.error('Error in RAG query:', error);
    throw error;
  }
}

// Function to generate a summary of a document
export async function generateDocumentSummary(content: string, documentName: string): Promise<string> {
  try {
    const prompt = `Please provide a concise summary of the following document titled "${documentName}":\n\n${content}
    
    The summary should:
    1. Identify the main topics covered in the document
    2. Extract key facts, figures, and insights
    3. Be no more than 3-4 paragraphs in length
    4. Highlight any particularly important information
    `;
    
    return await queryGemini(prompt);
  } catch (error) {
    console.error('Error generating document summary:', error);
    return 'Failed to generate summary. Please try again later.';
  }
}

// Function to handle file processing - simplified for reliability
export async function processFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          // Get the raw text content
          const content = reader.result as string;
          
          // Simple formatting for CSV files
          if (file.name.toLowerCase().endsWith('.csv')) {
            // Very simple CSV transformation - replace commas with pipe separators
            const lines = content.split('\n').map(line => 
              line.replace(/,/g, ' | ')
            );
            resolve(lines.join('\n'));
          } else {
            // For all other files, just return the content as is
            resolve(content);
          }
        } catch (error) {
          console.error('Error processing file content:', error);
          // Return raw content on error
          resolve(reader.result as string || '');
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      // Read file as text
      reader.readAsText(file);
    } catch (error) {
      console.error('Error in file processing:', error);
      reject(error);
    }
  });
}

// Helper function to parse CSV content
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  
  // Process each character in the CSV text
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = i < csvText.length - 1 ? csvText[i + 1] : '';
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Double quotes inside quotes represent a single quote
        currentCell += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of cell
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      // End of row
      if (char === '\r') i++; // Skip \n in \r\n
      
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell !== '')) { // Skip empty rows
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  
  // Add the last row if not empty
  if (currentCell !== '') {
    currentRow.push(currentCell.trim());
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }
  
  return rows;
}

// Helper function to format CSV data as a readable table
function formatCSVAsTable(csvData: string[][]): string {
  if (csvData.length === 0) return '';
  
  // Get column widths
  const columnWidths: number[] = [];
  for (const row of csvData) {
    for (let i = 0; i < row.length; i++) {
      columnWidths[i] = Math.max(columnWidths[i] || 0, row[i].length);
    }
  }
  
  // Format as a table
  let result = '';
  
  // Header row
  if (csvData.length > 0) {
    const headerRow = csvData[0];
    result += headerRow.map((cell, i) => cell.padEnd(columnWidths[i])).join(' | ');
    result += '\n';
    result += headerRow.map((_, i) => '-'.repeat(columnWidths[i])).join('-+-');
    result += '\n';
  }
  
  // Data rows
  for (let i = 1; i < csvData.length; i++) {
    const row = csvData[i];
    result += row.map((cell, j) => cell.padEnd(columnWidths[j])).join(' | ');
    result += '\n';
  }
  
  return result;
}

// Function to chunk text
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  
  if (text.length <= chunkSize) {
    chunks.push(text);
    return chunks;
  }
  
  let startIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    if (endIndex < text.length) {
      // Try to find a natural break point (sentence or paragraph)
      const breakPoints = ['. ', '.\n', '\n\n', '\n', ' '];
      
      for (const bp of breakPoints) {
        const naturalBreak = text.lastIndexOf(bp, endIndex);
        
        if (naturalBreak > startIndex && naturalBreak < endIndex) {
          endIndex = naturalBreak + bp.length;
          break;
        }
      }
    } else {
      endIndex = text.length;
    }
    
    chunks.push(text.substring(startIndex, endIndex));
    startIndex = endIndex - overlap;
  }
  
  return chunks;
}

// AlgoTrade backtesting API
export async function runBacktest(request: BacktestRequest): Promise<BacktestResult> {
  try {
    // In a production application, this would call your backend API
    // For this MVP implementation, we'll use a mock response with actual Yahoo Finance data

    const { ticker, startDate, endDate, initialCapital } = request.parameters;
    const { code } = request.strategy;
    
    // For demo, fetch historical data from an API endpoint - in production this would be your backend
    const response = await fetch(`https://api.example.com/backtest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error running backtest:', error);
    
    // For the MVP, return sample data if the API call fails
    // This allows frontend development to continue without the backend being fully implemented
    return generateSampleBacktestResult(request);
  }
}

// Function to generate sample backtest data for development/demo purposes
function generateSampleBacktestResult(request: BacktestRequest): BacktestResult {
  const { ticker, startDate, endDate, initialCapital } = request.parameters;
  
  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  
  // Generate sample price data (simulated stock price)
  const priceData: PriceBar[] = [];
  let currentPrice = 100; // Start price
  let currentDate = new Date(start);
  
  for (let i = 0; i < days; i++) {
    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      continue;
    }
    
    // Random daily change (-2% to +2%)
    const changePercent = (Math.random() * 4 - 2) / 100;
    const dailyChange = currentPrice * changePercent;
    
    // Calculate OHLC
    const open = currentPrice;
    const close = currentPrice + dailyChange;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01); // Random high
    const low = Math.min(open, close) * (1 - Math.random() * 0.01); // Random low
    const volume = Math.round(100000 + Math.random() * 900000); // Random volume
    
    priceData.push({
      date: currentDate.toISOString().split('T')[0],
      open,
      high, 
      low,
      close,
      volume
    });
    
    currentPrice = close;
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }
  
  // Generate sample trades based on a simple moving average strategy
  const trades: TradeSignal[] = [];
  const equity: EquityPoint[] = [];
  
  let inPosition = false;
  let capital = initialCapital;
  let shares = 0;
  let shortSMA = 0;
  let longSMA = 0;
  
  // Short and long SMA periods
  const shortPeriod = 10;
  const longPeriod = 30;
  
  for (let i = 0; i < priceData.length; i++) {
    const bar = priceData[i];
    
    // Calculate simple moving averages
    if (i >= shortPeriod - 1) {
      let sum = 0;
      for (let j = 0; j < shortPeriod; j++) {
        sum += priceData[i - j].close;
      }
      shortSMA = sum / shortPeriod;
    }
    
    if (i >= longPeriod - 1) {
      let sum = 0;
      for (let j = 0; j < longPeriod; j++) {
        sum += priceData[i - j].close;
      }
      longSMA = sum / longPeriod;
    }
    
    // Trading logic
    if (i >= longPeriod) {
      // Buy signal: short SMA crosses above long SMA
      if (!inPosition && shortSMA > longSMA) {
        const price = bar.close;
        const size = Math.floor(capital / price);
        const value = size * price;
        
        if (size > 0) {
          trades.push({
            date: bar.date,
            type: 'buy',
            price,
            size,
            value
          });
          
          capital -= value;
          shares = size;
          inPosition = true;
        }
      }
      // Sell signal: short SMA crosses below long SMA
      else if (inPosition && shortSMA < longSMA) {
        const price = bar.close;
        const size = shares;
        const value = size * price;
        
        trades.push({
          date: bar.date,
          type: 'sell',
          price,
          size,
          value
        });
        
        capital += value;
        shares = 0;
        inPosition = false;
      }
    }
    
    // Calculate equity for each day
    const holdingsValue = shares * bar.close;
    const totalEquity = capital + holdingsValue;
    
    equity.push({
      date: bar.date,
      value: totalEquity,
      cash: capital,
      holdings: holdingsValue
    });
  }
  
  // Calculate performance metrics
  const initialValue = initialCapital;
  const finalValue = equity[equity.length - 1].value;
  const totalReturn = (finalValue / initialValue - 1) * 100;
  
  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = initialValue;
  
  for (const point of equity) {
    if (point.value > peak) {
      peak = point.value;
    }
    
    const drawdown = (peak - point.value) / peak * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  
  // Calculate other metrics
  const yearFraction = days / 365;
  const annualizedReturn = Math.pow(1 + totalReturn / 100, 1 / yearFraction) - 1;
  
  // Win rate
  let wins = 0;
  let losses = 0;
  let lastBuy: TradeSignal | null = null;
  
  for (const trade of trades) {
    if (trade.type === 'buy') {
      lastBuy = trade;
    } else if (trade.type === 'sell' && lastBuy) {
      if (trade.price > lastBuy.price) {
        wins++;
      } else {
        losses++;
      }
      lastBuy = null;
    }
  }
  
  const totalTrades = Math.floor(trades.length / 2); // Buy/sell pairs
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  
  // Calculate Sharpe ratio (simplified, assuming risk-free rate = 0)
  let returns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    const dailyReturn = (equity[i].value / equity[i-1].value) - 1;
    returns.push(dailyReturn);
  }
  
  const avgDailyReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  const stdDevDailyReturn = Math.sqrt(
    returns.reduce((sum, val) => sum + Math.pow(val - avgDailyReturn, 2), 0) / returns.length
  );
  
  const sharpeRatio = stdDevDailyReturn !== 0 ? 
    (avgDailyReturn / stdDevDailyReturn) * Math.sqrt(252) : 0;
  
  const performance: BacktestPerformance = {
    totalReturn,
    annualizedReturn: annualizedReturn * 100,
    maxDrawdown,
    sharpeRatio,
    winRate,
    totalTrades,
    profitFactor: losses > 0 ? wins / losses : wins > 0 ? Infinity : 0
  };
  
  return {
    status: 'success',
    priceData,
    trades,
    equity,
    performance
  };
}

// Function to fetch available stock tickers for the dropdown
export async function fetchAvailableTickers(): Promise<string[]> {
  try {
    // In production, this would call your backend API
    // For MVP, return a list of popular stock tickers
    return [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 
      'TSLA', 'NVDA', 'JPM', 'BAC', 'WMT',
      'PFE', 'KO', 'DIS', 'NFLX', 'CSCO',
      'INTC', 'ORCL', 'CRM', 'IBM', 'UBER',
      'AMD', 'PYPL', 'SBUX', 'QCOM', 'GS'
    ];
  } catch (error) {
    console.error('Error fetching tickers:', error);
    throw error;
  }
}

// Function to get the template code for the strategy editor
export function getStrategyTemplate(): string {
  return `# This is your trading strategy class
class MyStrategy:
    def init(self):
        # Initialize your variables and indicators here
        # This function is called once at the start
        self.sma_short = 10  # Short moving average period
        self.sma_long = 30   # Long moving average period
        
        # Variables to store MA values
        self.short_ma = None
        self.long_ma = None
        
        # Track if we're in a position
        self.in_position = False
    
    def next(self, current_data, portfolio):
        """
        This function is called for each price bar
        
        Args:
            current_data: Contains the latest price data
                current_data.close - Latest closing price
                current_data.open - Latest opening price
                current_data.high - Latest high price
                current_data.low - Latest low price
                current_data.volume - Latest volume
                current_data.date - Date of this price bar
                
            portfolio: Allows you to interact with your portfolio
                portfolio.buy(size) - Buy shares
                portfolio.sell(size) - Sell shares
                portfolio.cash - Your current cash
                portfolio.position_size - Your current position size
                portfolio.equity - Total portfolio value
        """
        # Simple Moving Average crossover strategy example
        
        # Get the current close price
        close = current_data.close
        
        # Calculate short SMA
        if len(current_data.historical_closes) >= self.sma_short:
            self.short_ma = sum(current_data.historical_closes[-self.sma_short:]) / self.sma_short
        
        # Calculate long SMA
        if len(current_data.historical_closes) >= self.sma_long:
            self.long_ma = sum(current_data.historical_closes[-self.sma_long:]) / self.sma_long
        
        # If we have both MAs calculated
        if self.short_ma and self.long_ma:
            # BUY SIGNAL: Short MA crosses above Long MA
            if self.short_ma > self.long_ma and not self.in_position:
                # Calculate position size (90% of cash)
                size = int((portfolio.cash * 0.9) / close)
                
                # Execute buy if we can afford at least 1 share
                if size > 0:
                    portfolio.buy(size)
                    self.in_position = True
                    print(f"BUY {size} shares at ${close}")
            
            # SELL SIGNAL: Short MA crosses below Long MA
            elif self.short_ma < self.long_ma and self.in_position:
                # Sell all shares
                size = portfolio.position_size
                
                if size > 0:
                    portfolio.sell(size)
                    self.in_position = False
                    print(f"SELL {size} shares at ${close}")
`;
}

/**
 * Sends a user's message to the admin email using EmailJS
 * @param userName - The name of the user sending the message
 * @param userEmail - The email of the user sending the message
 * @param message - The message content
 * @returns A promise that resolves to true if successful, or rejects with an error
 */
export async function sendMessageToAdmin(
  userName: string,
  userEmail: string,
  message: string
): Promise<boolean> {
  try {
    // Initialize EmailJS with your public key (User ID)
    emailjs.init("au_DHVVtrIxXGP7-6"); // Your EmailJS public key (User ID)
    
    // Use multiple name properties to ensure compatibility with different EmailJS templates
    const templateParams = {
      // Add all possible name parameter variations
      from_name: userName,
      name: userName,
      user_name: userName,
      sender_name: userName,
      
      // Add all possible email parameter variations
      from_email: userEmail,
      email: userEmail,
      user_email: userEmail,
      sender_email: userEmail,
      reply_email: userEmail,
      reply: userEmail,
      contact_email: userEmail,
      
      // Add additional subject field that includes the email address
      subject: `Contact form message from ${userName} (${userEmail})`,
      
      // Add all possible message parameter variations
      message: `From: ${userName} (${userEmail})\n\n${message}`,
      content: `From: ${userName} (${userEmail})\n\n${message}`,
      body: `From: ${userName} (${userEmail})\n\n${message}`,
      
      // Recipient information
      to_name: "Admin",
      to_email: 'contact@konnaphat.com',
      reply_to: userEmail
    };

    console.log('Sending email with params:', templateParams);

    // Send the email using EmailJS
    const response = await emailjs.send(
      "service_9zkd18y",
      "template_e5m53qp",
      templateParams
    );

    console.log('EmailJS response:', response);

    if (response.status === 200) {
      return true;
    } else {
      throw new Error(`Failed to send message: Status code ${response.status}`);
    }
  } catch (error) {
    console.error('Error sending message to admin:', error);
    throw error;
  }
}
