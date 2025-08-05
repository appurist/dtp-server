import fs from 'fs/promises';
import path from 'path';

/**
 * Service for managing historical data caching
 */
class HistoricalDataService {
  constructor() {
    this.dataPath = this.getHistoricalDataPath();
  }

  /**
   * Get the historical data storage path
   */
  getHistoricalDataPath() {
    let dataPath = process.env.HISTORICAL_DATA_PATH || './data/historical';
    if (dataPath.startsWith('~/')) {
      dataPath = path.join(process.env.HOME || process.env.USERPROFILE, dataPath.slice(2));
    }
    return dataPath;
  }

  /**
   * Generate filename for historical data
   */
  generateDataFileName(symbol, date) {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    return `${symbol}-${dateStr}.json`;
  }

  /**
   * Check if historical data exists for a symbol on a specific date
   */
  async hasHistoricalData(symbol, date) {
    try {
      const fileName = this.generateDataFileName(symbol, date);
      const filePath = path.join(this.dataPath, fileName);
      
      const stats = await fs.stat(filePath);
      return stats.isFile() && stats.size > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load historical data for a symbol and date range
   */
  async loadHistoricalData(symbol, startDate, endDate) {
    const data = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      try {
        const fileName = this.generateDataFileName(symbol, currentDate);
        const filePath = path.join(this.dataPath, fileName);
        
        const fileContent = await fs.readFile(filePath, 'utf8');
        const dayData = JSON.parse(fileContent);
        
        if (Array.isArray(dayData)) {
          data.push(...dayData);
        }
      } catch (error) {
        console.log(`No data found for ${symbol} on ${currentDate.toISOString().split('T')[0]}`);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Sort by timestamp
    data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return data;
  }

  /**
   * Save historical data for a specific date
   */
  async saveHistoricalData(symbol, date, data) {
    try {
      // Ensure directory exists
      await fs.mkdir(this.dataPath, { recursive: true });
      
      const fileName = this.generateDataFileName(symbol, date);
      const filePath = path.join(this.dataPath, fileName);
      
      // Sort data by timestamp before saving
      const sortedData = Array.isArray(data) ? 
        data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : 
        data;
      
      await fs.writeFile(filePath, JSON.stringify(sortedData, null, 2));
      
      console.log(`Saved ${Array.isArray(sortedData) ? sortedData.length : 1} records for ${symbol} on ${date.toISOString().split('T')[0]}`);
      
      return true;
    } catch (error) {
      console.error(`Error saving historical data for ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Get available data dates for a symbol
   */
  async getAvailableDataDates(symbol) {
    try {
      const files = await fs.readdir(this.dataPath);
      const symbolFiles = files.filter(file => 
        file.startsWith(`${symbol}-`) && file.endsWith('.json')
      );
      
      const dates = symbolFiles.map(file => {
        const dateStr = file.replace(`${symbol}-`, '').replace('.json', '');
        return new Date(dateStr);
      }).sort((a, b) => a - b);
      
      return dates;
    } catch (error) {
      console.error(`Error getting available dates for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Delete historical data for a symbol and date
   */
  async deleteHistoricalData(symbol, date) {
    try {
      const fileName = this.generateDataFileName(symbol, date);
      const filePath = path.join(this.dataPath, fileName);
      
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting historical data for ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const files = await fs.readdir(this.dataPath);
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        symbols: new Set(),
        dateRange: { start: null, end: null }
      };
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.dataPath, file);
          const fileStat = await fs.stat(filePath);
          
          stats.totalFiles++;
          stats.totalSize += fileStat.size;
          
          // Extract symbol and date
          const parts = file.replace('.json', '').split('-');
          if (parts.length >= 4) { // symbol-YYYY-MM-DD
            const symbol = parts[0];
            const dateStr = parts.slice(1).join('-');
            const date = new Date(dateStr);
            
            stats.symbols.add(symbol);
            
            if (!stats.dateRange.start || date < stats.dateRange.start) {
              stats.dateRange.start = date;
            }
            if (!stats.dateRange.end || date > stats.dateRange.end) {
              stats.dateRange.end = date;
            }
          }
        }
      }
      
      return {
        ...stats,
        symbols: Array.from(stats.symbols)
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        symbols: [],
        dateRange: { start: null, end: null }
      };
    }
  }
}

export const historicalDataService = new HistoricalDataService();
