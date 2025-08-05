import { IStorageProvider } from './IStorageProvider.js'

/**
 * Electron File System Storage Provider
 * Uses Electron's file system APIs for persistent storage
 */
export class ElectronStorageProvider extends IStorageProvider {
  constructor() {
    super()
    this.isInitialized = false
  }

  async initialize() {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    this.isInitialized = true
    return true
  }

  async fileExists(path) {
    try {
      return await window.electronAPI.fileExists(path)
    } catch (error) {
      console.error('Error checking file existence:', error)
      return { exists: false, size: 0 }
    }
  }

  async readFile(path) {
    try {
      return await window.electronAPI.readFile(path)
    } catch (error) {
      console.error('Error reading file:', error)
      return { success: false, error: error.message }
    }
  }

  async writeFile(path, content) {
    try {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      return await window.electronAPI.writeFile(path, contentStr)
    } catch (error) {
      console.error('Error writing file:', error)
      return { success: false, error: error.message }
    }
  }

  async appendToFile(path, content) {
    try {
      return await window.electronAPI.appendToFile(path, content)
    } catch (error) {
      console.error('Error appending to file:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteFile(path) {
    try {
      return await window.electronAPI.deleteFile(path)
    } catch (error) {
      console.error('Error deleting file:', error)
      return { success: false, error: error.message }
    }
  }

  async listFiles(dirPath) {
    try {
      return await window.electronAPI.listFiles(dirPath)
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
    try {
      // Try Electron logging first, fallback to console
      if (window.electronAPI?.appendLog) {
        return await window.electronAPI.appendLog(logType, message)
      } else {
        // Fallback to console logging (no localStorage)
        const timestamp = new Date().toISOString()
        console.log(`[${timestamp}] [${logType.toUpperCase()}] ${message}`)
        return { success: true }
      }
    } catch (error) {
      // Final fallback to console
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [${logType.toUpperCase()}] ${message}`)
      return { success: true }
    }
  }

  async getDataPath() {
    try {
      const path = await window.electronAPI.getDataPath()
      return path || 'Unknown Path'
    } catch (error) {
      console.error('Error getting data path:', error)
      return 'File System (Path Error)'
    }
  }
}
