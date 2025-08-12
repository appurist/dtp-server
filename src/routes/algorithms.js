import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { expandPath } from '../utils/expandPath.js';

const router = express.Router();

const getAlgorithmsPath = () => {
  let dataPath = expandPath(process.env.DATA_PATH || './data');
  if (dataPath.startsWith('~/')) {
    dataPath = path.join(process.env.HOME || process.env.USERPROFILE, dataPath.slice(2));
  }
  return path.join(dataPath, 'algorithms');
};

/**
 * GET /api/algorithms
 * List all available trading algorithms
 */
router.get('/', async (req, res) => {
  try {
    const algorithmsPath = getAlgorithmsPath();
    console.log(`[Algorithms] Looking for algorithms at: ${algorithmsPath}`);

    // Check if directory exists
    try {
      await fs.access(algorithmsPath);
    } catch (error) {
      console.log(`[Algorithms] Directory doesn't exist, creating: ${algorithmsPath}`);
      await fs.mkdir(algorithmsPath, { recursive: true });
    }

    const files = await fs.readdir(algorithmsPath);
    console.log(`[Algorithms] Found ${files.length} files: ${files.join(', ')}`);
    const algorithms = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(algorithmsPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const algorithm = JSON.parse(content);
          algorithms.push(algorithm);
        } catch (error) {
          console.error(`Error reading algorithm file ${file}:`, error);
        }
      }
    }

    res.json({
      success: true,
      algorithms
    });
  } catch (error) {
    console.error('Error listing algorithms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list algorithms'
    });
  }
});

/**
 * POST /api/algorithms
 * Create or update a trading algorithm
 */
router.post('/', async (req, res) => {
  try {
    const algorithm = req.body;

    if (!algorithm.name) {
      return res.status(400).json({
        success: false,
        error: 'Algorithm name is required'
      });
    }

    const algorithmsPath = getAlgorithmsPath();
    const fileName = `${algorithm.name}.json`;
    const filePath = path.join(algorithmsPath, fileName);

    // Add timestamps
    const now = new Date().toISOString();
    if (!algorithm.createdTime) {
      algorithm.createdTime = now;
    }
    algorithm.lastModifiedTime = now;

    await fs.writeFile(filePath, JSON.stringify(algorithm, null, 2));

    res.json({
      success: true,
      message: 'Algorithm saved successfully',
      algorithm
    });
  } catch (error) {
    console.error('Error saving algorithm:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save algorithm'
    });
  }
});

/**
 * DELETE /api/algorithms/:name
 * Delete a trading algorithm
 */
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const algorithmsPath = getAlgorithmsPath();
    const fileName = `${name}.json`;
    const filePath = path.join(algorithmsPath, fileName);

    await fs.unlink(filePath);

    res.json({
      success: true,
      message: 'Algorithm deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting algorithm:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete algorithm'
    });
  }
});

export default router;
