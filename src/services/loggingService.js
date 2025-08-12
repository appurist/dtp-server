import fs from 'fs/promises';
import path from 'path';
import { expandPath } from '../utils/expandPath.js';

/**
 * Service for managing application logging
 */
class LoggingService {
  constructor() {
    this.logPath = this.getLogPath();
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Get the log storage path
   */
  getLogPath() {
    let dataPath = expandPath(process.env.DATA_PATH || './data');
    return path.join(dataPath, 'logs');
  }

  /**
   * Check if a log level should be written
   */
  shouldLog(level) {
    const currentLevel = this.logLevels[this.logLevel] || 2;
    const messageLevel = this.logLevels[level] || 2;
    return messageLevel <= currentLevel;
  }

  /**
   * Format log message
   */
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(context).length > 0 ?
      ` | ${JSON.stringify(context)}` : '';

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Write log to file
   */
  async writeToFile(level, message, context = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    try {
      // Ensure log directory exists
      await fs.mkdir(this.logPath, { recursive: true });

      const logFileName = `app-${new Date().toISOString().split('T')[0]}.log`;
      const logFilePath = path.join(this.logPath, logFileName);

      const formattedMessage = this.formatMessage(level, message, context);

      await fs.appendFile(logFilePath, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Log error message
   */
  async error(message, context = {}) {
    console.error(`[ERROR] ${message}`, context);
    await this.writeToFile('error', message, context);
  }

  /**
   * Log warning message
   */
  async warn(message, context = {}) {
    console.warn(`[WARN] ${message}`, context);
    await this.writeToFile('warn', message, context);
  }

  /**
   * Log info message
   */
  async info(message, context = {}) {
    console.log(`[INFO] ${message}`, context);
    await this.writeToFile('info', message, context);
  }

  /**
   * Log debug message
   */
  async debug(message, context = {}) {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, context);
    }
    await this.writeToFile('debug', message, context);
  }

  /**
   * Get recent log entries
   */
  async getRecentLogs(limit = 100, level = null) {
    try {
      const logFileName = `app-${new Date().toISOString().split('T')[0]}.log`;
      const logFilePath = path.join(this.logPath, logFileName);

      const content = await fs.readFile(logFilePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);

      let filteredLines = lines;
      if (level) {
        const levelFilter = `[${level.toUpperCase()}]`;
        filteredLines = lines.filter(line => line.includes(levelFilter));
      }

      // Return most recent entries
      return filteredLines.slice(-limit).map(line => {
        const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)$/);
        if (match) {
          const [, timestamp, logLevel, message] = match;
          return {
            timestamp: new Date(timestamp),
            level: logLevel.toLowerCase(),
            message: message.split(' | ')[0],
            context: message.includes(' | ') ?
              JSON.parse(message.split(' | ')[1]) : {}
          };
        }
        return {
          timestamp: new Date(),
          level: 'unknown',
          message: line,
          context: {}
        };
      });
    } catch (error) {
      console.error('Error reading log file:', error);
      return [];
    }
  }

  /**
   * Get available log files
   */
  async getLogFiles() {
    try {
      const files = await fs.readdir(this.logPath);
      const logFiles = files
        .filter(file => file.endsWith('.log'))
        .map(file => {
          const date = file.replace('app-', '').replace('.log', '');
          return {
            filename: file,
            date: new Date(date),
            path: path.join(this.logPath, file)
          };
        })
        .sort((a, b) => b.date - a.date);

      return logFiles;
    } catch (error) {
      console.error('Error getting log files:', error);
      return [];
    }
  }

  /**
   * Clean up old log files (keep last 30 days)
   */
  async cleanupOldLogs(daysToKeep = 30) {
    try {
      const files = await this.getLogFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const filesToDelete = files.filter(file => file.date < cutoffDate);

      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          console.log(`Deleted old log file: ${file.filename}`);
        } catch (error) {
          console.error(`Failed to delete log file ${file.filename}:`, error);
        }
      }

      return filesToDelete.length;
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      return 0;
    }
  }
}

export const loggingService = new LoggingService();
