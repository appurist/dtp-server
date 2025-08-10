import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BacktestingService } from '../services/backtesting.js';
import { historicalDataService } from '../services/historicalDataService.js';
import { TradingData } from '../models/TradingData.js';
import { tradingInstanceManager } from '../services/tradingInstanceManager.js';
import { BacktestStatus, BacktestPhaseStatus } from '../models/BacktestInstance.js';

const router = express.Router();

// Create backtesting service instance
const backtestingService = new BacktestingService();

/**
 * Get backtests directory path
 */
const getBacktestsPath = () => {
  let dataPath = process.env.DATA_PATH || './data';
  if (dataPath.startsWith('~/')) {
    dataPath = path.join(process.env.HOME || process.env.USERPROFILE, dataPath.slice(2));
  }
  return path.join(dataPath, 'backtests');
};

/**
 * Ensure backtests directory exists
 */
async function ensureBacktestsDirectory() {
  try {
    const backtestsPath = getBacktestsPath();
    await fs.mkdir(backtestsPath, { recursive: true });
  } catch (error) {
    console.error('Error creating backtests directory:', error);
  }
}

/**
 * Read JSON file with error handling
 */
async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Write JSON file
 */
async function writeJsonFile(filePath, data) {
  await ensureBacktestsDirectory();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * GET /api/backtests/runs
 * Get all past backtest execution runs
 */
router.get('/runs', async (req, res) => {
  try {
    const allRuns = backtestingService.getAllBacktests();

    // Format runs for client display
    const runs = allRuns.map(backtest => ({
      id: backtest.id,
      definitionId: backtest.definitionId || null,
      definitionName: backtest.name,
      executedAt: backtest.startedAt,
      completedAt: backtest.completedAt,
      status: backtest.status,
      totalPnL: backtest.results?.totalPnL || 0,
      totalTrades: backtest.results?.totalTrades || 0,
      winRate: backtest.results?.winRate || 0
    }));

    // Sort by execution date (newest first)
    runs.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

    res.json({
      success: true,
      runs
    });

  } catch (error) {
    console.error('Error getting backtest runs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/backtests/runs/:runId
 * Get detailed results for a specific backtest run
 */
router.get('/runs/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const backtest = backtestingService.getBacktest(runId);

    if (!backtest) {
      return res.status(404).json({
        success: false,
        error: 'Backtest run not found'
      });
    }

    res.json({
      success: true,
      run: {
        id: backtest.id,
        definitionId: backtest.definitionId || null,
        definitionName: backtest.name,
        executedAt: backtest.startedAt,
        completedAt: backtest.completedAt,
        status: backtest.status,
        progress: backtest.progress,
        error: backtest.error,
        results: backtest.results,
        logs: backtest.logs,
        // Include execution parameters
        parameters: {
          symbol: backtest.symbol,
          algorithmName: backtest.algorithmName,
          startDate: backtest.startDate,
          endDate: backtest.endDate,
          startingCapital: backtest.startingCapital,
          commission: backtest.commission
        }
      }
    });

  } catch (error) {
    console.error('Error getting backtest run details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/backtests/runs/:runId
 * Delete a specific backtest run from history
 */
router.delete('/runs/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const deleted = backtestingService.deleteBacktest(runId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Backtest run not found'
      });
    }

    res.json({
      success: true,
      message: 'Backtest run deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting backtest run:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/backtests
 * Get all saved backtest definitions
 */
router.get('/', async (req, res) => {
  try {
    const backtestsPath = getBacktestsPath();

    // Ensure directory exists
    await ensureBacktestsDirectory();

    // Read all backtest files
    const files = await fs.readdir(backtestsPath);
    const backtestFiles = files.filter(file => file.endsWith('.json'));

    const backtests = [];

    for (const file of backtestFiles) {
      try {
        const filePath = path.join(backtestsPath, file);
        const backtest = await readJsonFile(filePath);
        if (backtest) {
          backtests.push(backtest);
        }
      } catch (error) {
        console.error(`Error reading backtest file ${file}:`, error.message);
      }
    }

    // Sort by creation date (newest first)
    backtests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      backtests
    });
  } catch (error) {
    console.error('Error getting backtests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/backtests
 * Create and save a new backtest definition
 */
router.post('/', async (req, res) => {
  try {
    const backtestData = req.body;

    // Validate required fields
    if (!backtestData.name) {
      return res.status(400).json({
        success: false,
        error: 'Backtest name is required'
      });
    }

    if (!backtestData.symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }

    if (!backtestData.algorithmName) {
      return res.status(400).json({
        success: false,
        error: 'Algorithm name is required'
      });
    }

    // Validate symbol by checking if contract exists
    try {
      const contracts = await tradingInstanceManager.searchContracts(backtestData.symbol);
      if (!contracts.contracts || contracts.contracts.length === 0) {
        let suggestion = '';
        if (backtestData.symbol.toUpperCase() === 'NQ') {
          suggestion = ' Did you mean "NQU5" (E-mini NASDAQ futures)?';
        } else if (backtestData.symbol.toUpperCase() === 'ES') {
          suggestion = ' Did you mean "ESU5" (E-mini S&P 500 futures)?';
        } else if (backtestData.symbol.toUpperCase() === 'YM') {
          suggestion = ' Did you mean "YMU5" (E-mini Dow futures)?';
        }
        return res.status(400).json({
          success: false,
          error: `Invalid symbol: ${backtestData.symbol}.${suggestion} Please use valid Project X contract symbols.`
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Unable to validate symbol: ${error.message}`
      });
    }

    // Generate ID and timestamps
    const now = new Date().toISOString();
    const backtest = {
      id: uuidv4(),
      name: backtestData.name,
      symbol: backtestData.symbol,
      algorithmName: backtestData.algorithmName,
      startDate: backtestData.startDate,
      endDate: backtestData.endDate,
      lagTicks: backtestData.lagTicks || 1,
      createdAt: now,
      lastModifiedAt: now
    };

    // Save to file
    const fileName = `${backtest.id}.json`;
    const filePath = path.join(getBacktestsPath(), fileName);
    await writeJsonFile(filePath, backtest);

    res.json({
      success: true,
      backtest
    });
  } catch (error) {
    console.error('Error creating backtest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/backtests/:id
 * Get a specific backtest definition
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fileName = `${id}.json`;
    const filePath = path.join(getBacktestsPath(), fileName);

    const backtest = await readJsonFile(filePath);

    if (!backtest) {
      return res.status(404).json({
        success: false,
        error: 'Backtest not found'
      });
    }

    res.json({
      success: true,
      backtest
    });
  } catch (error) {
    console.error('Error getting backtest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/backtests/:id
 * Update a backtest definition
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const fileName = `${id}.json`;
    const filePath = path.join(getBacktestsPath(), fileName);

    // Check if backtest exists
    const existingBacktest = await readJsonFile(filePath);
    if (!existingBacktest) {
      return res.status(404).json({
        success: false,
        error: 'Backtest not found'
      });
    }

    // Update backtest with new data
    const updatedBacktest = {
      ...existingBacktest,
      ...updateData,
      id: existingBacktest.id, // Preserve original ID
      createdAt: existingBacktest.createdAt, // Preserve creation date
      lastModifiedAt: new Date().toISOString()
    };

    // Save updated backtest
    await writeJsonFile(filePath, updatedBacktest);

    res.json({
      success: true,
      backtest: updatedBacktest
    });
  } catch (error) {
    console.error('Error updating backtest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/backtests/:id
 * Delete a backtest definition
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fileName = `${id}.json`;
    const filePath = path.join(getBacktestsPath(), fileName);

    // Check if backtest exists
    const existingBacktest = await readJsonFile(filePath);
    if (!existingBacktest) {
      return res.status(404).json({
        success: false,
        error: 'Backtest not found'
      });
    }

    // Delete the file
    await fs.unlink(filePath);

    res.json({
      success: true,
      message: 'Backtest definition deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting backtest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/backtests/:id/run
 * Start executing a backtest from a saved definition
 */
router.post('/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const fileName = `${id}.json`;
    const filePath = path.join(getBacktestsPath(), fileName);

    // Load backtest definition
    const backtestDef = await readJsonFile(filePath);
    if (!backtestDef) {
      return res.status(404).json({
        success: false,
        error: 'Backtest definition not found'
      });
    }

    // Load algorithm
    const algorithm = tradingInstanceManager.getAlgorithm(backtestDef.algorithmName);
    if (!algorithm) {
      return res.status(400).json({
        success: false,
        error: `Algorithm '${backtestDef.algorithmName}' not found`
      });
    }

    // Create backtest instance
    const backtest = backtestingService.createBacktest({
      definitionId: id,
      name: backtestDef.name,
      symbol: backtestDef.symbol,
      algorithmName: backtestDef.algorithmName,
      startDate: backtestDef.startDate,
      endDate: backtestDef.endDate,
      lagTicks: backtestDef.lagTicks || 1,
      startingCapital: req.body.startingCapital || 10000,
      commission: req.body.commission || 0
    });

    // Start backtest execution asynchronously
    executeBacktest(backtest.id, backtestDef, algorithm, req.app.locals.io);

    res.json({
      success: true,
      backtestId: backtest.id,
      message: 'Backtest started'
    });

  } catch (error) {
    console.error('Error starting backtest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/backtests/:id/status
 * Get the current status of a running backtest
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const backtest = backtestingService.getBacktest(id);

    if (!backtest) {
      return res.status(404).json({
        success: false,
        error: 'Backtest not found'
      });
    }

    res.json({
      success: true,
      backtest: {
        id: backtest.id,
        name: backtest.name,
        status: backtest.status,
        progress: backtest.progress,
        startedAt: backtest.startedAt,
        completedAt: backtest.completedAt,
        error: backtest.error,
        results: backtest.results,
        logs: backtest.logs.slice(-50) // Last 50 log entries
      }
    });

  } catch (error) {
    console.error('Error getting backtest status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/backtests/:id/stop
 * Stop a running backtest
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const stopped = backtestingService.stopBacktest(id);

    if (!stopped) {
      return res.status(404).json({
        success: false,
        error: 'Backtest not found or not running'
      });
    }

    res.json({
      success: true,
      message: 'Backtest stopped'
    });

  } catch (error) {
    console.error('Error stopping backtest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Load historical data for backtest, fetching from Project X if missing
 */
async function loadHistoricalDataForBacktest(backtestDef, io, backtestId) {
  const { symbol, startDate, endDate } = backtestDef;

  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required for backtest');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  io.emit('backtestUpdate', {
    backtestId,
    status: BacktestPhaseStatus.LOADING_DATA,
    message: `Loading historical data for ${symbol} from ${start.toDateString()} to ${end.toDateString()}...`
  });

  // Try to load from local storage first
  let historicalData = await historicalDataService.loadHistoricalData(symbol, start, end);

  if (historicalData.length === 0) {
    // No local data, fetch from Project X
    io.emit('backtestUpdate', {
      backtestId,
      status: BacktestPhaseStatus.FETCHING_DATA,
      message: `Fetching historical data from Project X for ${symbol}...`
    });

    try {
      // Search for contract
      const contracts = await tradingInstanceManager.searchContracts(symbol);
      if (!contracts.contracts || contracts.contracts.length === 0) {
        // Try to provide helpful suggestions for common symbols
        let suggestion = '';
        if (symbol.toUpperCase() === 'NQ') {
          suggestion = ' Did you mean "NQU5" (E-mini NASDAQ futures)?';
        } else if (symbol.toUpperCase() === 'ES') {
          suggestion = ' Did you mean "ESU5" (E-mini S&P 500 futures)?';
        } else if (symbol.toUpperCase() === 'YM') {
          suggestion = ' Did you mean "YMU5" (E-mini Dow futures)?';
        }
        throw new Error(`No contract found for symbol: ${symbol}.${suggestion} Please use valid Project X contract symbols.`);
      }

      const contract = contracts.contracts[0];
      console.log(`Using contract: ${contract.name} (${contract.id}) for backtest`);

      // Fetch historical data from Project X
      const projectXData = await tradingInstanceManager.getHistoricalData(
        contract.id,
        '1m', // 1-minute timeframe
        start,
        end
      );

      if (projectXData && projectXData.length > 0) {
        // Convert to TradingData format and save locally
        const tradingData = new TradingData(symbol);

        for (const candle of projectXData) {
          tradingData.addCandle(
            new Date(candle.timestamp),
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.volume || 0
          );
        }

        // Save to local storage for future use
        await saveHistoricalDataLocally(symbol, projectXData, start, end);

        io.emit('backtestUpdate', {
          backtestId,
          status: BacktestPhaseStatus.DATA_LOADED,
          message: `Loaded ${projectXData.length} candles from Project X`
        });

        return tradingData;
      } else {
        throw new Error('No historical data returned from Project X');
      }

    } catch (fetchError) {
      console.error('Error fetching historical data:', fetchError);
      throw new Error(`Failed to fetch historical data: ${fetchError.message}`);
    }

  } else {
    // Convert local data to TradingData format
    const tradingData = new TradingData(symbol);

    for (const candle of historicalData) {
      tradingData.addCandle(
        new Date(candle.timestamp),
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume || 0
      );
    }

    io.emit('backtestUpdate', {
      backtestId,
      status: BacktestPhaseStatus.DATA_LOADED,
      message: `Loaded ${historicalData.length} candles from local storage`
    });

    return tradingData;
  }
}

/**
 * Save historical data locally for future use
 */
async function saveHistoricalDataLocally(symbol, candles, startDate, endDate) {
  try {
    // Group candles by date and save daily files
    const candlesByDate = new Map();

    for (const candle of candles) {
      const date = new Date(candle.timestamp);
      const dateKey = date.toISOString().split('T')[0];

      if (!candlesByDate.has(dateKey)) {
        candlesByDate.set(dateKey, []);
      }
      candlesByDate.get(dateKey).push(candle);
    }

    // Save each day's data using the historical data service
    for (const [dateKey, dayCandles] of candlesByDate) {
      const date = new Date(dateKey);
      await historicalDataService.saveHistoricalData(symbol, date, dayCandles);
      console.log(`Saved ${dayCandles.length} candles for ${symbol} on ${dateKey}`);
    }

  } catch (error) {
    console.error('Error saving historical data locally:', error);
    // Don't throw - this is not critical for backtest execution
  }
}

/**
 * Execute backtest with automatic historical data fetching
 */
async function executeBacktest(backtestId, backtestDef, algorithm, io) {
  try {
    const backtest = backtestingService.getBacktest(backtestId);
    if (!backtest) {
      throw new Error('Backtest not found');
    }

    // Emit initial status
    io.emit('backtestUpdate', {
      backtestId,
      status: BacktestPhaseStatus.STARTING,
      message: 'Preparing backtest...'
    });

    // Load or fetch historical data
    const tradingData = await loadHistoricalDataForBacktest(backtestDef, io, backtestId);

    if (tradingData.count === 0) {
      throw new Error('No historical data available for the specified period');
    }

    // Run the backtest
    await backtestingService.runBacktest(
      backtestId,
      algorithm,
      tradingData,
      // Progress callback
      (backtest) => {
        io.emit('backtestUpdate', {
          backtestId,
          status: backtest.status,
          progress: backtest.progress,
          message: `Processing... ${backtest.progress.toFixed(1)}%`
        });
      },
      // Complete callback
      (backtest) => {
        io.emit('backtestUpdate', {
          backtestId,
          status: backtest.status,
          progress: backtest.progress,
          results: backtest.results,
          message: 'Backtest completed successfully'
        });
      }
    );

  } catch (error) {
    console.error('Backtest execution error:', error);
    const backtest = backtestingService.getBacktest(backtestId);
    if (backtest) {
      backtest.fail(error.message);
    }

    io.emit('backtestUpdate', {
      backtestId,
      status: BacktestStatus.FAILED,
      error: error.message,
      message: `Backtest failed: ${error.message}`
    });
  }
}

export default router;
