import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Data storage paths
const DATA_PATH = process.env.DATA_PATH || './data';
const UI_CONFIG_FILE = path.join(DATA_PATH, 'ui-config.json');
const USER_SETTINGS_FILE = path.join(DATA_PATH, 'user-settings.json');
const WATCHLISTS_FILE = path.join(DATA_PATH, 'watchlists.json');

/**
 * Ensure data directory exists
 */
async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_PATH, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

/**
 * Read JSON file with fallback to default value
 */
async function readJsonFile(filePath, defaultValue = {}) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Write JSON file
 */
async function writeJsonFile(filePath, data) {
  await ensureDataDirectory();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * GET /api/data/ui-config
 * Get UI configuration (layouts, themes, preferences)
 */
router.get('/ui-config', async (req, res) => {
  try {
    const config = await readJsonFile(UI_CONFIG_FILE, {
      theme: 'dark',
      layout: 'default',
      chartSettings: {
        timeframe: '1m',
        indicators: [],
        overlays: []
      },
      dashboardLayout: {
        instances: { x: 0, y: 0, w: 6, h: 4 },
        charts: { x: 6, y: 0, w: 6, h: 8 },
        logs: { x: 0, y: 4, w: 6, h: 4 },
        performance: { x: 0, y: 8, w: 12, h: 4 }
      },
      preferences: {
        autoConnect: true,
        showNotifications: true,
        soundEnabled: true,
        confirmActions: true
      }
    });

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error reading UI config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/data/ui-config
 * Save UI configuration
 */
router.post('/ui-config', async (req, res) => {
  try {
    const config = req.body;
    
    // Add timestamp
    config.lastUpdated = new Date().toISOString();
    
    await writeJsonFile(UI_CONFIG_FILE, config);

    res.json({
      success: true,
      message: 'UI configuration saved'
    });
  } catch (error) {
    console.error('Error saving UI config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/data/user-settings
 * Get user settings (credentials, API endpoints, etc.)
 */
router.get('/user-settings', async (req, res) => {
  try {
    const settings = await readJsonFile(USER_SETTINGS_FILE, {
      projectX: {
        apiUrl: 'https://api.topstepx.com',
        websocketUrl: 'wss://rtc.topstepx.com',
        username: '',
        // Note: password is not stored in file for security
        rememberCredentials: false
      },
      trading: {
        defaultAccount: '',
        defaultCommission: 2.80,
        riskManagement: {
          maxDailyLoss: 1000,
          maxPositionSize: 5,
          stopLossEnabled: true
        }
      },
      notifications: {
        email: '',
        enableEmailAlerts: false,
        enableDesktopNotifications: true,
        alertOnSignals: true,
        alertOnErrors: true
      }
    });

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error reading user settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/data/user-settings
 * Save user settings
 */
router.post('/user-settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Add timestamp
    settings.lastUpdated = new Date().toISOString();
    
    // Remove sensitive data before saving
    if (settings.projectX && settings.projectX.password) {
      delete settings.projectX.password;
    }
    
    await writeJsonFile(USER_SETTINGS_FILE, settings);

    res.json({
      success: true,
      message: 'User settings saved'
    });
  } catch (error) {
    console.error('Error saving user settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/data/watchlists
 * Get saved watchlists
 */
router.get('/watchlists', async (req, res) => {
  try {
    const watchlists = await readJsonFile(WATCHLISTS_FILE, {
      default: {
        name: 'Default',
        symbols: ['NQ', 'ES', 'YM', 'RTY'],
        created: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      watchlists
    });
  } catch (error) {
    console.error('Error reading watchlists:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/data/watchlists
 * Save watchlists
 */
router.post('/watchlists', async (req, res) => {
  try {
    const watchlists = req.body;
    
    // Add timestamps to new watchlists
    Object.values(watchlists).forEach(watchlist => {
      if (!watchlist.created) {
        watchlist.created = new Date().toISOString();
      }
      watchlist.lastUpdated = new Date().toISOString();
    });
    
    await writeJsonFile(WATCHLISTS_FILE, watchlists);

    res.json({
      success: true,
      message: 'Watchlists saved'
    });
  } catch (error) {
    console.error('Error saving watchlists:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/data/export
 * Export all user data
 */
router.get('/export', async (req, res) => {
  try {
    const [uiConfig, userSettings, watchlists] = await Promise.all([
      readJsonFile(UI_CONFIG_FILE, {}),
      readJsonFile(USER_SETTINGS_FILE, {}),
      readJsonFile(WATCHLISTS_FILE, {})
    ]);

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        uiConfig,
        userSettings,
        watchlists
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="daytraders-pro-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/data/import
 * Import user data
 */
router.post('/import', async (req, res) => {
  try {
    const importData = req.body;
    
    if (!importData.data) {
      return res.status(400).json({
        success: false,
        error: 'Invalid import data format'
      });
    }

    const { uiConfig, userSettings, watchlists } = importData.data;
    const results = [];

    // Import UI config
    if (uiConfig) {
      await writeJsonFile(UI_CONFIG_FILE, uiConfig);
      results.push('UI configuration');
    }

    // Import user settings
    if (userSettings) {
      await writeJsonFile(USER_SETTINGS_FILE, userSettings);
      results.push('User settings');
    }

    // Import watchlists
    if (watchlists) {
      await writeJsonFile(WATCHLISTS_FILE, watchlists);
      results.push('Watchlists');
    }

    res.json({
      success: true,
      message: `Imported: ${results.join(', ')}`,
      imported: results
    });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/data/reset
 * Reset all user data to defaults
 */
router.delete('/reset', async (req, res) => {
  try {
    const filesToRemove = [UI_CONFIG_FILE, USER_SETTINGS_FILE, WATCHLISTS_FILE];
    
    await Promise.all(
      filesToRemove.map(file => 
        fs.unlink(file).catch(error => {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        })
      )
    );

    res.json({
      success: true,
      message: 'All user data reset to defaults'
    });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
