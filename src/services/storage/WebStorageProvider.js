import { IStorageProvider } from './IStorageProvider.js'

/**
 * Web Browser Storage Provider
 * Uses localStorage and IndexedDB for persistent storage in browsers
 */
export class WebStorageProvider extends IStorageProvider {
  constructor() {
    super()
    this.isInitialized = false
    this.filePrefix = 'dtp_file_'
    this.logPrefix = 'dtp_log_'
  }

  async initialize() {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      throw new Error('localStorage not available in this browser')
    }
    this.isInitialized = true
    return true
  }

  async fileExists(path) {
    try {
      const key = this.filePrefix + path
      const content = localStorage.getItem(key)
      return {
        exists: content !== null,
        size: content ? content.length : 0
      }
    } catch (error) {
      console.error('Error checking file existence:', error)
      return { exists: false, size: 0 }
    }
  }

  async readFile(path) {
    try {
      const key = this.filePrefix + path
      const content = localStorage.getItem(key)

      if (content !== null) {
        return { success: true, content }
      } else {
        return { success: false, error: 'File not found' }
      }
    } catch (error) {
      console.error('Error reading file:', error)
      return { success: false, error: error.message }
    }
  }

  async writeFile(path, content) {
    try {
      const key = this.filePrefix + path
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      localStorage.setItem(key, contentStr)
      return { success: true }
    } catch (error) {
      console.error('Error writing file:', error)
      return { success: false, error: error.message }
    }
  }

  async appendToFile(path, content) {
    try {
      const key = this.filePrefix + path
      const existing = localStorage.getItem(key) || ''
      localStorage.setItem(key, existing + content)
      return { success: true }
    } catch (error) {
      console.error('Error appending to file:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteFile(path) {
    try {
      const key = this.filePrefix + path
      localStorage.removeItem(key)
      return { success: true }
    } catch (error) {
      console.error('Error deleting file:', error)
      return { success: false, error: error.message }
    }
  }

  async listFiles(dirPath) {
    try {
      const prefix = this.filePrefix + dirPath + '/'
      const files = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          // Extract filename from key
          const filename = key.substring(prefix.length)
          if (filename && !filename.includes('/')) { // Only direct children, not subdirectories
            files.push(filename)
          }
        }
      }

      return { success: true, files }
    } catch (error) {
      console.error('Error listing files:', error)
      return { success: false, error: error.message }
    }
  }

  getLocal(key, defaultValue = null) {
    // Only warn about data that should be managed server-side
    const serverManagedKeys = ['connection', 'algorithms', 'instances', 'backtests', 'accounts', 'accountsMetadata']
    const clientPreferenceKeys = ['theme', 'appSettings', 'performanceSettings', 'tradingSettings', '__keys__']
    const isServerManaged = serverManagedKeys.includes(key) || key.includes('projectx') || key.includes('auth')
    const isClientPreference = clientPreferenceKeys.includes(key)

    if (isServerManaged) {
      console.warn(`getLocal('${key}') is deprecated - use server API instead`)
      return defaultValue
    }

    // Log client preferences for debugging (no warning)
    if (isClientPreference) {
      console.log(`[Storage] Loading client preference: ${key}`)
    }

    // Special case for __keys__ - return all localStorage keys
    if (key === '__keys__') {
      try {
        return Object.keys(localStorage)
      } catch (error) {
        console.error('Error getting localStorage keys:', error)
        return []
      }
    }

    // Allow client-side preferences (theme, UI settings, etc.)
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error reading localStorage key '${key}':`, error)
      return defaultValue
    }
  }

  setLocal(key, value) {
    // Only warn about data that should be managed server-side
    const serverManagedKeys = ['connection', 'algorithms', 'instances', 'backtests', 'accounts', 'accountsMetadata']
    const clientPreferenceKeys = ['theme', 'appSettings', 'performanceSettings', 'tradingSettings', '__keys__']
    const isServerManaged = serverManagedKeys.includes(key) || key.includes('projectx') || key.includes('auth')
    const isClientPreference = clientPreferenceKeys.includes(key)

    if (isServerManaged) {
      console.warn(`setLocal('${key}') is deprecated - use server API instead`)
      return false
    }

    // Log client preferences for debugging (no warning)
    if (isClientPreference) {
      console.log(`[Storage] Saving client preference: ${key}`)
    }

    // Allow client-side preferences (theme, UI settings, etc.)
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error(`Error writing localStorage key '${key}':`, error)
      return false
    }
  }

  removeLocal(key) {
    // Only warn about data that should be managed server-side
    const serverManagedKeys = ['connection', 'algorithms', 'instances', 'backtests', 'accounts', 'accountsMetadata']
    const isServerManaged = serverManagedKeys.includes(key) || key.includes('projectx') || key.includes('auth')

    if (isServerManaged) {
      console.warn(`removeLocal('${key}') is deprecated - use server API instead`)
      return false
    }

    // Allow client-side preferences (theme, UI settings, etc.)
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error(`Error removing localStorage key '${key}':`, error)
      return false
    }
  }

  async appendLog(logType, message) {
    // No longer write to localStorage - use browser console instead
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [${logType.toUpperCase()}] ${message}`)
    return { success: true }
  }

  async getDataPath() {
    return 'Browser localStorage'
  }

  /**
   * Web-specific method to get all stored files (for debugging)
   */
  getAllStoredFiles() {
    const files = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.filePrefix)) {
        const path = key.substring(this.filePrefix.length)
        files[path] = localStorage.getItem(key)
      }
    }
    return files
  }

  /**
   * Web-specific method to clear all stored files (for debugging)
   */
  clearAllFiles() {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.filePrefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    return keysToRemove.length
  }
}
