import { ElectronStorageProvider } from './storage/ElectronStorageProvider.js'
import { WebStorageProvider } from './storage/WebStorageProvider.js'
import { apiService } from './apiService.js'

/**
 * Storage Service - Handles data persistence for DayTradersPro
 * Uses swappable storage providers for different environments
 */
export class StorageService {
  constructor() {
    this.provider = null
    this.isInitialized = false
  }

  /**
   * Initialize the storage service with appropriate provider
   */
  async initialize() {
    if (this.isInitialized) {
      return true
    }

    try {
      // Detect environment and create appropriate provider
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('Initializing Electron storage provider')
        this.provider = new ElectronStorageProvider()
      } else {
        console.log('Initializing Web storage provider')
        this.provider = new WebStorageProvider()
      }

      await this.provider.initialize()
      this.isInitialized = true
      console.log('Storage service initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize storage service:', error)
      throw error
    }
  }

  /**
   * Ensure storage is initialized
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  // Local Storage Operations - DEPRECATED
  // All data should be managed server-side via API calls

  /**
   * Set local storage value (delegates to provider with selective warnings)
   */
  setLocal(key, value) {
    if (!this.provider) {
      console.error('Storage provider not initialized')
      return false
    }
    return this.provider.setLocal(key, value)
  }

  /**
   * Get local storage value (delegates to provider with selective warnings)
   */
  getLocal(key, defaultValue = null) {
    if (!this.provider) {
      console.error('Storage provider not initialized')
      return defaultValue
    }
    return this.provider.getLocal(key, defaultValue)
  }

  /**
   * Remove local storage value (delegates to provider with selective warnings)
   */
  removeLocal(key) {
    if (!this.provider) {
      console.error('Storage provider not initialized')
      return false
    }
    return this.provider.removeLocal(key)
  }

  /**
   * @deprecated Use server API instead
   */
  clearLocal() {
    console.warn('clearLocal() is deprecated - use server API instead')
    return false
  }

  // File System Operations

  /**
   * Read file from data directory
   */
  async readFile(filePath) {
    await this.ensureInitialized()
    return await this.provider.readFile(filePath)
  }

  /**
   * Write file to data directory
   */
  async writeFile(filePath, content) {
    await this.ensureInitialized()
    return await this.provider.writeFile(filePath, content)
  }

  /**
   * List files in directory
   */
  async listFiles(dirPath) {
    await this.ensureInitialized()
    return await this.provider.listFiles(dirPath)
  }

  /**
   * Delete file
   */
  async deleteFile(filePath) {
    await this.ensureInitialized()
    return await this.provider.deleteFile(filePath)
  }

  /**
   * Append content to a file
   */
  async appendToFile(filePath, content) {
    await this.ensureInitialized()
    return await this.provider.appendToFile(filePath, content)
  }

  /**
   * Check if a file exists and get its size
   */
  async fileExists(filePath) {
    await this.ensureInitialized()
    return await this.provider.fileExists(filePath)
  }

  /**
   * Get data directory path
   */
  async getDataPath() {
    await this.ensureInitialized()
    return await this.provider.getDataPath()
  }

  // Logging Operations - DEPRECATED
  // Use browser console for debugging instead

  /**
   * @deprecated Use console.log instead
   */
  async appendLog(logType, message) {
    console.log(`[${logType.toUpperCase()}] ${message}`)
    return { success: true }
  }

  // Specialized Storage Methods

  /**
   * Save algorithm definition
   * @deprecated Use server API instead
   */
  async saveAlgorithm(algorithm) {
    console.warn('saveAlgorithm is deprecated - algorithms are now managed server-side')
    console.log(`[Storage] Algorithm save requested: ${algorithm.name} (stored in memory only)`)
    return { success: true, message: 'Algorithm stored in memory only - server persistence not implemented' }
  }

  /**
   * Load algorithm definition
   * @deprecated Use server API instead
   */
  async loadAlgorithm(algorithmName) {
    console.warn('loadAlgorithm is deprecated - use apiService.getAlgorithm() instead')
    try {
      return await apiService.getAlgorithm(algorithmName)
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * List all algorithms
   * @deprecated Use server API instead
   */
  async listAlgorithms() {
    console.warn('listAlgorithms is deprecated - use apiService.getAlgorithms() instead')
    try {
      return await apiService.getAlgorithms()
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Save backtest result
   * @deprecated Use server API instead
   */
  async saveBacktest(backtest) {
    console.warn('saveBacktest is deprecated - backtests should be managed server-side')
    console.log(`[Storage] Backtest save requested: ${backtest.id} (stored in memory only)`)
    return { success: true, message: 'Backtest stored in memory only - server persistence not implemented' }
  }

  /**
   * Save trading instance
   * @deprecated Use server API instead
   */
  async saveInstance(instance) {
    console.warn('saveInstance is deprecated - use apiService.createInstance() or updateInstance() instead')
    try {
      if (instance.id) {
        return await apiService.updateInstance(instance.id, instance)
      } else {
        return await apiService.createInstance(instance)
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Load all instances
   * @deprecated Use server API instead
   */
  async loadInstances() {
    console.warn('loadInstances is deprecated - use apiService.getInstances() instead')
    try {
      return await apiService.getInstances()
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
export const storageService = new StorageService()
