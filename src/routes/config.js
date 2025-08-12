import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { expandPath } from '../utils/expandPath.js';

const router = express.Router();

const getDataPath = () => {
  // Use DATA_PATH environment variable with Desktop fallback
  let dataPath = expandPath(process.env.DATA_PATH || path.join(homedir(), 'Desktop', 'DayTradersPro'));
  if (dataPath.startsWith('~/')) {
    dataPath = path.join(process.env.HOME || process.env.USERPROFILE, dataPath.slice(2));
  }
  return dataPath;
};

const getConfigPath = () => {
  return path.join(getDataPath(), 'config.json');
};

const getPreferencesPath = () => {
  return path.join(getDataPath(), 'preferences.json');
};

const ensureDataDirectory = async () => {
  const dataPath = getDataPath();

  try {
    await fs.access(dataPath);
  } catch {
    await fs.mkdir(dataPath, { recursive: true });
  }
};

/**
 * GET /api/config
 * Get application configuration
 */
router.get('/', async (req, res) => {
  try {
    await ensureDataDirectory();
    const configPath = getConfigPath();

    try {
      const content = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(content);
      res.json({
        success: true,
        config
      });
    } catch (error) {
      // Return default config if file doesn't exist
      const defaultConfig = {
        theme: 'light',
        defaultSymbol: 'NQ',
        defaultAccount: '',
        backtestSettings: {
          lagTicks: 1,
          defaultStartDate: null,
          defaultEndDate: null
        },
        chartSettings: {
          candlestickHeight: 400,
          indicatorHeight: 300,
          showVolume: true
        },
        tradingSettings: {
          confirmOrders: true,
          maxPositionSize: 10,
          riskPerTrade: 0.02
        },
        uiSettings: {
          autoRefresh: true,
          refreshInterval: 5000,
          showNotifications: true
        }
      };

      res.json({
        success: true,
        config: defaultConfig
      });
    }
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

/**
 * POST /api/config
 * Update application configuration
 */
router.post('/', async (req, res) => {
  try {
    await ensureDataDirectory();
    const config = req.body;
    const configPath = getConfigPath();

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

/**
 * GET /api/config/preferences
 * Get user preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    await ensureDataDirectory();
    const preferencesPath = getPreferencesPath();

    try {
      const content = await fs.readFile(preferencesPath, 'utf8');
      const preferences = JSON.parse(content);
      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      // Return default preferences if file doesn't exist
      const defaultPreferences = {
        favoriteAlgorithms: [],
        recentSymbols: ['NQ', 'ES', 'YM'],
        dashboardLayout: {
          chartHeight: 500,
          showOrderBook: true,
          showPositions: true,
          showRecentTrades: true
        },
        notifications: {
          tradeExecutions: true,
          algorithmErrors: true,
          connectionStatus: true
        },
        shortcuts: {
          quickBuy: 'Ctrl+B',
          quickSell: 'Ctrl+S',
          closeAll: 'Ctrl+X'
        }
      };

      res.json({
        success: true,
        preferences: defaultPreferences
      });
    }
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences'
    });
  }
});

/**
 * PUT /api/config/preferences
 * Update user preferences
 */
router.put('/preferences', async (req, res) => {
  try {
    await ensureDataDirectory();
    const preferences = req.body;
    const preferencesPath = getPreferencesPath();

    await fs.writeFile(preferencesPath, JSON.stringify(preferences, null, 2));

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * POST /api/config/reset
 * Reset configuration to defaults
 */
router.post('/reset', async (req, res) => {
  try {
    await ensureDataDirectory();
    const configPath = getConfigPath();
    const preferencesPath = getPreferencesPath();

    // Delete existing files to force defaults
    try {
      await fs.unlink(configPath);
    } catch (error) {
      // File might not exist, ignore
    }

    try {
      await fs.unlink(preferencesPath);
    } catch (error) {
      // File might not exist, ignore
    }

    res.json({
      success: true,
      message: 'Configuration reset to defaults'
    });
  } catch (error) {
    console.error('Error resetting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset configuration'
    });
  }
});

export default router;
