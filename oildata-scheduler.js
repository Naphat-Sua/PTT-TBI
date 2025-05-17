/**
 * Oil Data Scheduler Script
 * 
 * This script fetches oil data and saves it to Oildata.txt every day at 8:00 AM GMT+7.
 * It runs as a separate Node.js process outside of the browser environment.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Yahoo Finance API endpoint for WTI Crude Oil futures
const API_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/CL=F';

/**
 * Fetch oil data from Yahoo Finance API
 * @returns {Promise<Object>} The oil data
 */
async function fetchOilData() {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    };

    https.get(API_URL, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode === 200) {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (error) {
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        } else {
          reject(new Error(`API request failed with status code ${response.statusCode}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`API request error: ${error.message}`));
    });
  });
}

/**
 * Process the raw API response into structured oil data points
 * @param {Object} apiResponse - Raw API response
 * @returns {Array<Object>} - Structured oil data points
 */
function processOilData(apiResponse) {
  try {
    const result = apiResponse.chart.result[0];
    const timestamps = result.timestamp;
    const quoteData = result.indicators.quote[0];
    
    return timestamps.map((timestamp, index) => {
      const date = new Date(timestamp * 1000);
      const formattedDate = date.toISOString().split('T')[0];
      
      return {
        date: formattedDate,
        open: quoteData.open?.[index],
        high: quoteData.high?.[index],
        low: quoteData.low?.[index],
        close: quoteData.close?.[index],
        volume: quoteData.volume?.[index]
      };
    });
  } catch (error) {
    console.error('Error processing oil data:', error);
    return [];
  }
}

/**
 * Format processed oil data points to a well-formatted text
 * @param {Array<Object>} oilData - Processed oil data points
 * @returns {string} - Formatted text content
 */
function formatOilDataToText(oilData) {
  if (!oilData || oilData.length === 0) {
    return 'No oil data available.';
  }
  
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
                  `$${formatNumber(point.close)}`.padEnd(12) + 
                  `$${formatNumber(point.open)}`.padEnd(10) + 
                  `$${formatNumber(point.high)}`.padEnd(10) + 
                  `$${formatNumber(point.low)}`.padEnd(10) + 
                  `${formatVolume(point.volume)}\n`;
  }
  
  // Add market analysis
  textContent += '\nMarket Analysis:\n';
  textContent += generateMarketAnalysis(sortedData);
  textContent += '\n\nLast Updated: ' + new Date().toISOString();
  
  return textContent;
}

/**
 * Format a date string from YYYY-MM-DD to a more readable format
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit'
  });
}

/**
 * Format a number to 2 decimal places
 */
function formatNumber(num) {
  return num != null ? num.toFixed(2) : 'N/A';
}

/**
 * Format volume numbers with K/M suffixes
 */
function formatVolume(volume) {
  if (volume == null) return 'N/A';
  
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`;
  } else {
    return volume.toString();
  }
}

/**
 * Generate market analysis text based on the oil data
 */
function generateMarketAnalysis(data) {
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
  analysis += `The most recent price recorded was $${formatNumber(latestData.close)} per barrel on ${formatDate(latestData.date)}.\n`;
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
 * Updates the Oildata.txt file with fresh data
 */
async function updateOilDataFile() {
  try {
    console.log(`[${new Date().toISOString()}] Starting oil data update...`);
    
    // Fetch oil data from API
    const apiResponse = await fetchOilData();
    const oilData = processOilData(apiResponse);
    
    // Format the data as text
    const textContent = formatOilDataToText(oilData);
    
    // Save to both Oildata.txt (for the application)
    const txtFilePath = path.resolve(__dirname, 'public', 'Oildata.txt');
    fs.writeFileSync(txtFilePath, textContent, 'utf8');
    
    // Also save as CSV for backup/other uses
    const csvContent = generateCsvContent(oilData);
    const csvFilePath = path.resolve(__dirname, 'public', 'Oildata.csv');
    fs.writeFileSync(csvFilePath, csvContent, 'utf8');
    
    console.log(`[${new Date().toISOString()}] Oil data updated successfully!`);
    console.log(`- Text file saved at: ${txtFilePath}`);
    console.log(`- CSV file saved at: ${csvFilePath}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating oil data:`, error);
  }
}

/**
 * Generate CSV content from oil data
 */
function generateCsvContent(oilData) {
  if (!oilData || oilData.length === 0) {
    return 'Date,Open,High,Low,Close,Volume\n';
  }
  
  let csvContent = 'Date,Open,High,Low,Close,Volume\n';
  
  // Sort by date (oldest first for CSV)
  const sortedData = [...oilData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  for (const point of sortedData) {
    csvContent += `${point.date},${point.open || ''},${point.high || ''},${point.low || ''},${point.close || ''},${point.volume || ''}\n`;
  }
  
  return csvContent;
}

/**
 * Schedule a task to run at a specific time (HH:MM) in GMT+7 timezone
 */
function scheduleTaskAtTime(hours, minutes, task) {
  // Function to calculate milliseconds until next scheduled time
  const getTimeUntilNext = () => {
    const now = new Date();
    
    // Convert to GMT+7 time
    const gmt7Hours = (now.getUTCHours() + 7) % 24;
    const currentMinutes = now.getUTCMinutes();
    
    // Calculate time until next occurrence
    let hoursUntilTask = hours - gmt7Hours;
    let minutesUntilTask = minutes - currentMinutes;
    
    // Adjust if the time has already passed today
    if (hoursUntilTask < 0 || (hoursUntilTask === 0 && minutesUntilTask < 0)) {
      hoursUntilTask += 24; // Schedule for tomorrow
    }
    
    // Convert to milliseconds
    let millisUntilTask = (hoursUntilTask * 60 + minutesUntilTask) * 60 * 1000;
    
    // Subtract the seconds and milliseconds to get the exact time
    millisUntilTask -= (now.getUTCSeconds() * 1000 + now.getUTCMilliseconds());
    
    return millisUntilTask;
  };

  // Execute and schedule next run
  const scheduleNext = async () => {
    try {
      console.log(`[${new Date().toISOString()}] Running scheduled task`);
      await task();
      console.log(`[${new Date().toISOString()}] Task completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error executing scheduled task:`, error);
    }
    
    // Schedule next run
    const timeUntilNext = getTimeUntilNext();
    console.log(`[${new Date().toISOString()}] Next execution scheduled in ${(timeUntilNext / (60 * 1000)).toFixed(1)} minutes`);
    setTimeout(scheduleNext, timeUntilNext);
  };

  // Initial schedule
  const timeUntilFirst = getTimeUntilNext();
  console.log(`[${new Date().toISOString()}] Initial task scheduled in ${(timeUntilFirst / (60 * 1000)).toFixed(1)} minutes`);
  setTimeout(scheduleNext, timeUntilFirst);
}

// Main execution
console.log(`[${new Date().toISOString()}] Oil Data Scheduler started`);
console.log('This script will update Oildata.txt and Oildata.csv every day at 8:00 AM GMT+7');

// Schedule oil data update every day at 8:00 AM GMT+7
scheduleTaskAtTime(8, 0, updateOilDataFile);

// Also run once immediately on startup
updateOilDataFile().catch(error => {
  console.error('Failed to update oil data on startup:', error);
});