import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const router = express.Router();

// Cache for ProjectX token to avoid repeated authentication
let cachedToken = null;
let tokenExpiry = null;

/**
 * Read connection settings from ~/Desktop/DayTradersPro/connection.json
 */
async function getConnectionSettings() {
  try {
    const desktopPath = join(homedir(), 'Desktop', 'DayTradersPro', 'connection.json');
    console.log(`[Auth] Looking for connection.json at: ${desktopPath}`);
    const data = await fs.readFile(desktopPath, 'utf8');
    const settings = JSON.parse(data);
    console.log(`[Auth] Found connection settings for user: ${settings.username}`);
    return settings;
  } catch (error) {
    console.warn(`[Auth] Could not read connection.json: ${error.message}`);
    return null;
  }
}

/**
 * Authenticate with ProjectX API using stored credentials
 */
async function authenticateWithProjectX() {
  // Try to read from connection.json first
  const connectionSettings = await getConnectionSettings();

  let username, apiKey;
  if (connectionSettings) {
    username = connectionSettings.username;
    apiKey = connectionSettings.apiKey;
  } else {
    // Fall back to environment variables
    username = process.env.PROJECTX_USERNAME;
    apiKey = process.env.PROJECTX_API_KEY;
  }

  const apiUrl = process.env.PROJECTX_API_URL || 'https://api.topstepx.com';

  if (!username || !apiKey) {
    throw new Error('ProjectX credentials not configured in connection.json or environment variables');
  }

  try {
    const response = await fetch(`${apiUrl}/api/Auth/loginKey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userName: username,
        apiKey: apiKey
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`ProjectX authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.success && data.token) {
      return {
        token: data.token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24h expiry
      };
    } else {
      throw new Error('Invalid response from ProjectX authentication');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('ProjectX API request timed out');
    } else if (error.name === 'TypeError') {
      throw new Error('ProjectX API is unreachable');
    } else {
      throw new Error(`Authentication error: ${error.message}`);
    }
  }
}

/**
 * Get a valid ProjectX token, using cache if available
 */
async function getValidToken() {
  const now = new Date();

  // Check if we have a cached token that's still valid (with 5 minute buffer)
  if (cachedToken && tokenExpiry && now < new Date(tokenExpiry.getTime() - 5 * 60 * 1000)) {
    return cachedToken;
  }

  // Authenticate and cache the new token
  const authResult = await authenticateWithProjectX();
  cachedToken = authResult.token;
  tokenExpiry = new Date(authResult.expiresAt);

  return cachedToken;
}

/**
 * POST /api/auth/token
 * Authenticates with ProjectX and returns a token for client use
 */
router.post('/token', async (req, res) => {
  try {
    const token = await getValidToken();

    res.json({
      success: true,
      token,
      expiresAt: tokenExpiry?.toISOString()
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
});

/**
 * GET /api/auth/status
 * Check authentication status
 */
router.get('/status', async (req, res) => {
  try {
    // Try to read from connection.json first
    const connectionSettings = await getConnectionSettings();

    let username, apiKey;
    if (connectionSettings) {
      username = connectionSettings.username;
      apiKey = connectionSettings.apiKey;
    } else {
      // Fall back to environment variables
      username = process.env.PROJECTX_USERNAME;
      apiKey = process.env.PROJECTX_API_KEY;
    }

    if (!username || !apiKey) {
      return res.json({
        authenticated: false,
        error: 'ProjectX credentials not configured in connection.json or environment variables'
      });
    }

    // Try to get a valid token to verify credentials work
    try {
      await getValidToken();
      res.json({
        authenticated: true,
        tokenExpiry: tokenExpiry?.toISOString()
      });
    } catch (authError) {
      res.json({
        authenticated: false,
        error: authError.message
      });
    }
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Force refresh of the cached token
 */
router.post('/refresh', async (req, res) => {
  try {
    // Clear cached token to force refresh
    cachedToken = null;
    tokenExpiry = null;

    const token = await getValidToken();

    res.json({
      success: true,
      token,
      expiresAt: tokenExpiry?.toISOString()
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Token refresh failed'
    });
  }
});

export default router;
