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
 * GET /api/trading/contracts?query={searchText}&live={boolean}
 * Search contracts
 */
router.get('/contracts', async (req, res) => {
  try {
    const searchText = req.query.query || '';
    const live = req.query.live === 'true'; // Parse boolean from query string

    const response = await tradingInstanceManager.searchContracts(searchText, live);

    // ProjectX API returns { contracts: [...], success: true, ... }
    // Return it directly to avoid double-wrapping
    res.json(response);
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

/**
 * POST /api/trading/subscribe-market-data
 * Subscribe to real-time market data for a contract
 */
router.post('/subscribe-market-data', async (req, res) => {
  try {
    const { contractId } = req.body;

    if (!contractId) {
      return res.status(400).json({
        success: false,
        error: 'contractId is required'
      });
    }

    // Create a default callback that emits WebSocket events
    const callback = (data) => {
      // Emit market data update via WebSocket
      // This will be handled by the server's WebSocket implementation
      console.log(`Market data update for ${contractId}:`, data);
    };

    // Subscribe via trading instance manager
    await tradingInstanceManager.subscribeToMarketData(contractId, callback);

    res.json({
      success: true,
      message: `Subscribed to market data for contract ${contractId}`
    });
  } catch (error) {
    console.error('Error subscribing to market data:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trading/unsubscribe-market-data
 * Unsubscribe from real-time market data for a contract
 */
router.post('/unsubscribe-market-data', async (req, res) => {
  try {
    const { contractId } = req.body;

    if (!contractId) {
      return res.status(400).json({
        success: false,
        error: 'contractId is required'
      });
    }

    // Unsubscribe via trading instance manager
    await tradingInstanceManager.unsubscribeFromMarketData(contractId);

    res.json({
      success: true,
      message: `Unsubscribed from market data for contract ${contractId}`
    });
  } catch (error) {
    console.error('Error unsubscribing from market data:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trading/historical-data
 * Get historical bars data for a contract
 */
router.get('/historical-data', async (req, res) => {
  try {
    const { contractId, timeframe, startDate, endDate } = req.query;

    if (!contractId || !timeframe || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'contractId, timeframe, startDate, and endDate are required'
      });
    }

    // Get historical data via trading instance manager
    const historicalData = await tradingInstanceManager.getHistoricalData(
      contractId,
      timeframe,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: historicalData
    });
  } catch (error) {
    console.error('Error getting historical data:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
