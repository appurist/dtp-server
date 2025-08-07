import express from 'express';
import { tradingInstanceManager } from '../services/tradingInstanceManager.js';

const router = express.Router();

/**
 * GET /api/instances
 * Get all trading instances (definitions and runtime state)
 */
router.get('/', async (req, res) => {
  try {
    const instances = tradingInstanceManager.getAllInstances();
    const instanceData = instances.map(instance => {
      const config = instance.toConfig();
      // Only add runtime state for running instances
      if (instance.status === 'RUNNING') {
        try {
          const state = instance.getState();
          return { ...config, ...state };
        } catch (error) {
          console.warn(`Error getting state for running instance ${instance.id}:`, error.message);
          return config;
        }
      }
      return config;
    });

    res.json({
      success: true,
      instances: instanceData
    });
  } catch (error) {
    console.error('Error getting instances:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/instances/:id
 * Get a specific trading instance (definition and runtime state if running)
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

    const config = instance.toConfig();
    let instanceData = config;

    // Only add runtime state for running instances
    if (instance.status === 'RUNNING') {
      try {
        const state = instance.getState();
        instanceData = { ...config, ...state };
      } catch (error) {
        console.warn(`Error getting state for running instance ${instance.id}:`, error.message);
        // Return just the config if state fails
      }
    }

    res.json({
      success: true,
      instance: instanceData
    });
  } catch (error) {
    console.error('Error getting instance:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/instances/:id/state
 * Get runtime state of a specific trading instance (only for running instances)
 */
router.get('/:id/state', async (req, res) => {
  try {
    const instance = tradingInstanceManager.getInstance(req.params.id);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }

    if (instance.status !== 'RUNNING') {
      return res.status(400).json({
        success: false,
        error: 'Instance is not running - no runtime state available'
      });
    }

    res.json({
      success: true,
      state: instance.getState()
    });
  } catch (error) {
    console.error('Error getting instance state:', error.message);
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

    // Return definition with safe defaults for frontend
    const instanceData = {
      ...instance.toConfig(),
      // Add safe defaults for runtime fields that frontend expects
      status: instance.status,
      totalPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      currentPrice: 0,
      unrealizedPnL: 0,
      candleCount: 0,
      runningTime: 0,
      lastUpdate: null,
      currentPosition: { side: 'NONE', quantity: 0, entryPrice: 0 }
    };

    res.status(201).json({
      success: true,
      instance: instanceData
    });
  } catch (error) {
    console.error('Error creating instance:', error.message);
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

    // Return definition with safe defaults for frontend
    const instanceData = {
      ...instance.toConfig(),
      // Add safe defaults for runtime fields that frontend expects
      status: instance.status,
      totalPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      currentPrice: 0,
      unrealizedPnL: 0,
      candleCount: 0,
      runningTime: 0,
      lastUpdate: null,
      currentPosition: { side: 'NONE', quantity: 0, entryPrice: 0 }
    };

    res.json({
      success: true,
      instance: instanceData
    });
  } catch (error) {
    console.error('Error updating instance:', error.message);
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
    console.error('Error deleting instance:', error.message);
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
    console.error('Error starting instance:', error.message);
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
    console.error('Error stopping instance:', error.message);
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
    console.error('Error pausing instance:', error.message);
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
    console.error('Error resuming instance:', error.message);
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
    console.error('Error getting chart data:', error.message);
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
    console.error('Error getting logs:', error.message);
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
    console.error('Error getting trades:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
