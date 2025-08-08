import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

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

    // Generate ID and timestamps
    const now = new Date().toISOString();
    const backtest = {
      id: uuidv4(),
      name: backtestData.name,
      description: backtestData.description || '',
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

export default router;
