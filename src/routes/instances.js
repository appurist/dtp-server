import express from 'express';
import { tradingInstanceManager } from '../services/tradingInstanceManager.js';

const router = express.Router();

/**
 * GET /api/instances
 * Get all trading instances
 */
router.get('/', async (req, res) => {
  try {
    const instances = tradingInstanceManager.getAllInstances();
    const instanceData = instances.map(instance => instance.getState());
    
    res.json({
      success: true,
      instances: instanceData
    });
  } catch (error) {
    console.error('Error getting instances:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/instances/:id
 * Get a specific trading instance
 */
router.get('/:id', async (req, res) => {
  try {
    const instance = tradingInstanceManager.getInstance(req.params.id);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
    
    res.json({
      success: true,
      instance: instance.getState()
    });
  } catch (error) {
    console.error('Error getting instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/instances
 * Create a new trading instance
 */
router.post('/', async (req, res) => {
  try {
    const config = req.body;
    
    // Validate required fields
    if (!config.name || !config.symbol || !config.algorithmName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, symbol, algorithmName'
      });
    }
    
    const instance = await tradingInstanceManager.createInstance(config);
    
    res.status(201).json({
      success: true,
      instance: instance.getState()
    });
  } catch (error) {
    console.error('Error creating instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/instances/:id
 * Update a trading instance
 */
router.put('/:id', async (req, res) => {
  try {
    const instance = await tradingInstanceManager.updateInstance(req.params.id, req.body);
    
    res.json({
      success: true,
      instance: instance.getState()
    });
  } catch (error) {
    console.error('Error updating instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/instances/:id
 * Delete a trading instance
 */
router.delete('/:id', async (req, res) => {
  try {
    await tradingInstanceManager.deleteInstance(req.params.id);
    
    res.json({
      success: true,
      message: 'Instance deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/instances/:id/start
 * Start a trading instance
 */
router.post('/:id/start', async (req, res) => {
  try {
    const success = await tradingInstanceManager.startInstance(req.params.id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Instance started successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to start instance'
      });
    }
  } catch (error) {
    console.error('Error starting instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/instances/:id/stop
 * Stop a trading instance
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const success = await tradingInstanceManager.stopInstance(req.params.id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Instance stopped successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to stop instance'
      });
    }
  } catch (error) {
    console.error('Error stopping instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/instances/:id/pause
 * Pause a trading instance
 */
router.post('/:id/pause', async (req, res) => {
  try {
    const success = await tradingInstanceManager.pauseInstance(req.params.id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Instance paused successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to pause instance'
      });
    }
  } catch (error) {
    console.error('Error pausing instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/instances/:id/resume
 * Resume a trading instance
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const success = await tradingInstanceManager.resumeInstance(req.params.id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Instance resumed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to resume instance'
      });
    }
  } catch (error) {
    console.error('Error resuming instance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/instances/:id/chart-data
 * Get chart data for an instance
 */
router.get('/:id/chart-data', async (req, res) => {
  try {
    const instance = tradingInstanceManager.getInstance(req.params.id);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
    
    const timeRangeMinutes = req.query.timeRange ? parseInt(req.query.timeRange) : null;
    const chartData = instance.getChartData(timeRangeMinutes);
    
    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Error getting chart data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/instances/:id/logs
 * Get logs for an instance
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const instance = tradingInstanceManager.getInstance(req.params.id);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
    
    const count = req.query.count ? parseInt(req.query.count) : 100;
    const logs = instance.getLogs(count);
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/instances/:id/trades
 * Get trade history for an instance
 */
router.get('/:id/trades', async (req, res) => {
  try {
    const instance = tradingInstanceManager.getInstance(req.params.id);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
    
    const trades = instance.getTrades();
    
    res.json({
      success: true,
      trades
    });
  } catch (error) {
    console.error('Error getting trades:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
