import express from 'express';
import { loggingService } from '../services/loggingService.js';

const router = express.Router();

/**
 * GET /api/logs
 * Get recent log entries
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 100, level } = req.query;
    const logs = await loggingService.getRecentLogs(parseInt(limit), level);
    
    res.json({
      success: true,
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get logs'
    });
  }
});

/**
 * GET /api/logs/files
 * Get available log files
 */
router.get('/files', async (req, res) => {
  try {
    const files = await loggingService.getLogFiles();
    
    res.json({
      success: true,
      files: files.map(file => ({
        filename: file.filename,
        date: file.date.toISOString().split('T')[0]
      }))
    });
  } catch (error) {
    console.error('Error getting log files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get log files'
    });
  }
});

/**
 * POST /api/logs/cleanup
 * Clean up old log files
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    const deletedCount = await loggingService.cleanupOldLogs(daysToKeep);
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old log files`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up logs'
    });
  }
});

export default router;
