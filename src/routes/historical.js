import express from 'express';
import { historicalDataService } from '../services/historicalDataService.js';

const router = express.Router();

/**
 * GET /api/historical/stats
 * Get storage statistics for historical data
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await historicalDataService.getStorageStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting historical data stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage statistics'
    });
  }
});

/**
 * GET /api/historical/:symbol/dates
 * Get available data dates for a symbol
 */
router.get('/:symbol/dates', async (req, res) => {
  try {
    const { symbol } = req.params;
    const dates = await historicalDataService.getAvailableDataDates(symbol);
    
    res.json({
      success: true,
      symbol,
      dates: dates.map(date => date.toISOString().split('T')[0])
    });
  } catch (error) {
    console.error('Error getting available dates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available dates'
    });
  }
});

/**
 * GET /api/historical/:symbol
 * Load historical data for a symbol within a date range
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    const data = await historicalDataService.loadHistoricalData(symbol, start, end);
    
    res.json({
      success: true,
      symbol,
      startDate: startDate,
      endDate: endDate,
      recordCount: data.length,
      data
    });
  } catch (error) {
    console.error('Error loading historical data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load historical data'
    });
  }
});

/**
 * POST /api/historical/:symbol
 * Save historical data for a symbol
 */
router.post('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { date, data } = req.body;
    
    if (!date || !data) {
      return res.status(400).json({
        success: false,
        error: 'date and data fields are required'
      });
    }
    
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    const success = await historicalDataService.saveHistoricalData(symbol, targetDate, data);
    
    if (success) {
      res.json({
        success: true,
        message: `Historical data saved for ${symbol} on ${date}`,
        recordCount: Array.isArray(data) ? data.length : 1
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save historical data'
      });
    }
  } catch (error) {
    console.error('Error saving historical data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save historical data'
    });
  }
});

/**
 * DELETE /api/historical/:symbol
 * Delete historical data for a symbol and date
 */
router.delete('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date query parameter is required'
      });
    }
    
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    const success = await historicalDataService.deleteHistoricalData(symbol, targetDate);
    
    if (success) {
      res.json({
        success: true,
        message: `Historical data deleted for ${symbol} on ${date}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete historical data'
      });
    }
  } catch (error) {
    console.error('Error deleting historical data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete historical data'
    });
  }
});

/**
 * GET /api/historical/:symbol/:date/exists
 * Check if historical data exists for a symbol on a specific date
 */
router.get('/:symbol/:date/exists', async (req, res) => {
  try {
    const { symbol, date } = req.params;
    
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    const exists = await historicalDataService.hasHistoricalData(symbol, targetDate);
    
    res.json({
      success: true,
      symbol,
      date,
      exists
    });
  } catch (error) {
    console.error('Error checking historical data existence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check data existence'
    });
  }
});

export default router;
