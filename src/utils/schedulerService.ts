// filepath: /Users/naphat/Documents/Code/Second/tbu-platform/src/utils/schedulerService.ts
/**
 * Scheduler Service
 * Handles scheduled tasks such as fetching oil data daily
 */

import fs from 'fs';
import path from 'path';
import { fetchOilData, formatOilDataToText } from './oilDataService';

// Interval in milliseconds (for testing, can be set to a shorter time)
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Schedule a task to run at a specific time (HH:MM) in GMT+7 timezone
 * @param hours Hours in 24h format (0-23)
 * @param minutes Minutes (0-59)
 * @param task The function to execute
 */
export function scheduleTaskAtTime(hours: number, minutes: number, task: () => Promise<void>): void {
  // Function to calculate milliseconds until next scheduled time
  const getTimeUntilNext = (): number => {
    const now = new Date();
    
    // Convert to GMT+7 time
    const gmt7Hours = now.getUTCHours() + 7;
    const currentHours = gmt7Hours >= 24 ? gmt7Hours - 24 : gmt7Hours;
    const currentMinutes = now.getUTCMinutes();
    
    // Calculate time until next occurrence
    let hoursUntilTask = hours - currentHours;
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
    console.log(`[${new Date().toISOString()}] Next execution scheduled in ${timeUntilNext / (60 * 1000)} minutes`);
    setTimeout(scheduleNext, timeUntilNext);
  };

  // Initial schedule
  const timeUntilFirst = getTimeUntilNext();
  console.log(`[${new Date().toISOString()}] Initial task scheduled in ${timeUntilFirst / (60 * 1000)} minutes`);
  setTimeout(scheduleNext, timeUntilFirst);
}

/**
 * Updates the Oildata.txt file with fresh data
 */
export async function updateOilDataFile(): Promise<void> {
  try {
    // Fetch the latest oil data
    const oilData = await fetchOilData();
    
    // Format the data as text
    const textContent = formatOilDataToText(oilData);
    
    // Determine the file path
    // For client-side code, we'll put it in the public folder
    const filePath = path.resolve(process.cwd(), 'public', 'Oildata.txt');
    
    // Write the data to the file
    fs.writeFileSync(filePath, textContent, 'utf8');
    
    console.log(`[${new Date().toISOString()}] Oil data updated at ${filePath}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating oil data file:`, error);
    throw error;
  }
}

/**
 * Initialize the scheduler for oil data updates
 * This should be called when the application starts
 */
export function initializeOilDataScheduler(): void {
  // Schedule oil data update every day at 8:00 AM GMT+7
  scheduleTaskAtTime(8, 0, updateOilDataFile);
  
  // Also run once immediately on startup
  updateOilDataFile().catch(error => {
    console.error('Failed to update oil data on startup:', error);
  });
}