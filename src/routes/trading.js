import express from 'express';
import { tradingInstanceManager } from '../services/tradingInstanceManager.js';

const router = express.Router();

/**
 * GET /api/trading/connection
 * Get client configuration (UI-relevant settings only)
 */
router.get('/connection', async (req, res) => {
  try {
    const config = tradingInstanceManager.getClientConfig();

    res.json({
      success: true,
      config: config || {}
    });
  } catch (error) {
    console.error('Error getting client config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trading/server-status
 * Get server status including Project X connection
 */
router.get('/server-status', async (req, res) => {
  try {
    const status = await tradingInstanceManager.getServerStatus();

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting server status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



/**
 * POST /api/trading/test-connection
 * Test Project X connection
 */
router.post('/test-connection', async (req, res) => {
  try {
    const result = await tradingInstanceManager.testConnection();

    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trading/accounts?onlyActiveAccounts={boolean}
 * Get Project X accounts
 */
router.get('/accounts', async (req, res) => {
  try {
    // Parse onlyActiveAccounts query parameter (default: true)
    const onlyActiveAccounts = req.query.onlyActiveAccounts !== 'false'

    const response = await tradingInstanceManager.getAccounts(onlyActiveAccounts);

    // ProjectX API already returns { success: true, accounts: [...] }
    // So we can return it directly without double-wrapping
    res.json(response);
  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trading/contracts
 * Search contracts
 */
router.get('/contracts', async (req, res) => {
  try {
    const query = req.query.query || '';
    const contracts = await tradingInstanceManager.searchContracts(query);

    res.json({
      success: true,
      contracts
    });
  } catch (error) {
    console.error('Error searching contracts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trading/algorithms
 * Get available algorithms
 */
router.get('/algorithms', async (req, res) => {
  try {
    const algorithms = tradingInstanceManager.getAlgorithms();

    res.json({
      success: true,
      algorithms
    });
  } catch (error) {
    console.error('Error getting algorithms:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trading/algorithms/:name
 * Get a specific algorithm
 */
router.get('/algorithms/:name', async (req, res) => {
  try {
    const algorithm = tradingInstanceManager.getAlgorithm(req.params.name);

    if (!algorithm) {
      return res.status(404).json({
        success: false,
        error: 'Algorithm not found'
      });
    }

    res.json({
      success: true,
      algorithm
    });
  } catch (error) {
    console.error('Error getting algorithm:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trading/status
 * Get trading engine status
 */
router.get('/status', async (req, res) => {
  try {
    const instances = tradingInstanceManager.getAllInstances();
    const runningInstances = instances.filter(i => i.status === 'RUNNING');
    const pausedInstances = instances.filter(i => i.status === 'PAUSED');
    const stoppedInstances = instances.filter(i => i.status === 'STOPPED');

    // Calculate total P&L across all instances
    const totalPnL = instances.reduce((sum, instance) => {
      const state = instance.getState();
      return sum + (state.totalPnL || 0) + (state.unrealizedPnL || 0);
    }, 0);

    // Calculate total trades
    const totalTrades = instances.reduce((sum, instance) => {
      const state = instance.getState();
      return sum + (state.totalTrades || 0);
    }, 0);

    res.json({
      success: true,
      status: {
        totalInstances: instances.length,
        runningInstances: runningInstances.length,
        pausedInstances: pausedInstances.length,
        stoppedInstances: stoppedInstances.length,
        totalPnL,
        totalTrades,
        algorithms: tradingInstanceManager.getAlgorithms().length
      }
    });
  } catch (error) {
    console.error('Error getting trading status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
