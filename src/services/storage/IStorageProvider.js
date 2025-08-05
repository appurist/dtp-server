/**
 * Storage Provider Interface
 * Defines the contract for storage implementations
 */
export class IStorageProvider {
  /**
   * Initialize the storage provider
   */
  async initialize() {
    throw new Error('initialize() must be implemented')
  }

  /**
   * Check if a file exists
   * @param {string} path - File path
   * @returns {Promise<{exists: boolean, size: number}>}
   */
  async fileExists(path) {
    throw new Error('fileExists() must be implemented')
  }

  /**
   * Read file content
   * @param {string} path - File path
   * @returns {Promise<{success: boolean, content?: string, error?: string}>}
   */
  async readFile(path) {
    throw new Error('readFile() must be implemented')
  }

  /**
   * Write file content
   * @param {string} path - File path
   * @param {string} content - File content
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async writeFile(path, content) {
    throw new Error('writeFile() must be implemented')
  }

  /**
   * Append content to file
   * @param {string} path - File path
   * @param {string} content - Content to append
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async appendToFile(path, content) {
    throw new Error('appendToFile() must be implemented')
  }

  /**
   * Delete a file
   * @param {string} path - File path
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteFile(path) {
    throw new Error('deleteFile() must be implemented')
  }

  /**
   * List files in directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<{success: boolean, files?: string[], error?: string}>}
   */
  async listFiles(dirPath) {
    throw new Error('listFiles() must be implemented')
  }

  /**
   * Get/Set local storage (for settings, configs)
   */
  getLocal(key, defaultValue = null) {
    throw new Error('getLocal() must be implemented')
  }

  setLocal(key, value) {
    throw new Error('setLocal() must be implemented')
  }

  removeLocal(key) {
    throw new Error('removeLocal() must be implemented')
  }

  /**
   * Append to log file
   * @param {string} logType - Log type (e.g., 'instances', 'algorithms')
   * @param {string} message - Log message
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async appendLog(logType, message) {
    throw new Error('appendLog() must be implemented')
  }

  /**
   * Get data directory path (for display purposes)
   * @returns {Promise<string>}
   */
  async getDataPath() {
    throw new Error('getDataPath() must be implemented')
  }
}
