/**
 * API Service for communicating with the DayTradersPro server
 * Replaces direct Project X API calls with server-side communication
 */
class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_SERVER_URL || 'http://127.0.0.1:3587'
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    }
  }

  /**
   * Make HTTP request to the server
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      method: options.method || 'GET',
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    }

    if (options.body) {
      config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data
    } catch (error) {
      console.error(`[API] Request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Trading Engine Management
  async setCredentials(username, password) {
    return this.request('/api/trading/credentials', {
      method: 'POST',
      body: { username, password }
    })
  }

  async testConnection() {
    return this.request('/api/trading/test-connection', {
      method: 'POST'
    })
  }

  async getAccounts() {
    return this.request('/api/trading/accounts')
  }

  async searchContracts(query = '') {
    const params = new URLSearchParams({ query })
    return this.request(`/api/trading/contracts?${params}`)
  }

  async getAlgorithms() {
    return this.request('/api/trading/algorithms')
  }

  async getAlgorithm(name) {
    return this.request(`/api/trading/algorithms/${encodeURIComponent(name)}`)
  }

  async getTradingStatus() {
    return this.request('/api/trading/status')
  }

  // Trading Instance Management
  async getInstances() {
    return this.request('/api/instances')
  }

  async getInstance(instanceId) {
    return this.request(`/api/instances/${instanceId}`)
  }

  async createInstance(config) {
    return this.request('/api/instances', {
      method: 'POST',
      body: config
    })
  }

  async updateInstance(instanceId, updates) {
    return this.request(`/api/instances/${instanceId}`, {
      method: 'PUT',
      body: updates
    })
  }

  async deleteInstance(instanceId) {
    return this.request(`/api/instances/${instanceId}`, {
      method: 'DELETE'
    })
  }

  // Instance Control
  async startInstance(instanceId) {
    return this.request(`/api/instances/${instanceId}/start`, {
      method: 'POST'
    })
  }

  async stopInstance(instanceId) {
    return this.request(`/api/instances/${instanceId}/stop`, {
      method: 'POST'
    })
  }

  async pauseInstance(instanceId) {
    return this.request(`/api/instances/${instanceId}/pause`, {
      method: 'POST'
    })
  }

  async resumeInstance(instanceId) {
    return this.request(`/api/instances/${instanceId}/resume`, {
      method: 'POST'
    })
  }

  // Instance Data
  async getChartData(instanceId, timeRangeMinutes = null) {
    const params = new URLSearchParams()
    if (timeRangeMinutes) {
      params.set('timeRange', timeRangeMinutes.toString())
    }

    const query = params.toString()
    const endpoint = `/api/instances/${instanceId}/chart-data${query ? `?${query}` : ''}`

    return this.request(endpoint)
  }

  async getInstanceLogs(instanceId, count = 100) {
    const params = new URLSearchParams({ count: count.toString() })
    return this.request(`/api/instances/${instanceId}/logs?${params}`)
  }

  async getInstanceTrades(instanceId) {
    return this.request(`/api/instances/${instanceId}/trades`)
  }

  // Health Check
  async getHealth() {
    return this.request('/health')
  }

  // Server Status
  async getServerStatus() {
    return this.request('/api/trading/server-status')
  }

  async getClientConfig() {
    return this.request('/api/trading/connection')
  }

  // Data API for UI configuration
  async getUIConfig() {
    return this.request('/api/data/ui-config')
  }

  async saveUIConfig(config) {
    return this.request('/api/data/ui-config', {
      method: 'POST',
      body: config
    })
  }

  async getUserSettings() {
    return this.request('/api/data/user-settings')
  }

  async saveUserSettings(settings) {
    return this.request('/api/data/user-settings', {
      method: 'POST',
      body: settings
    })
  }

  async getWatchlists() {
    return this.request('/api/data/watchlists')
  }

  async saveWatchlists(watchlists) {
    return this.request('/api/data/watchlists', {
      method: 'POST',
      body: watchlists
    })
  }

  async exportData() {
    return this.request('/api/data/export')
  }

  async importData(data) {
    return this.request('/api/data/import', {
      method: 'POST',
      body: data
    })
  }

  async resetData() {
    return this.request('/api/data/reset', {
      method: 'DELETE'
    })
  }

  // Utility methods for common operations
  async validateConnection() {
    try {
      const health = await this.getHealth()
      return {
        success: true,
        serverStatus: health.status,
        tradingEngine: health.tradingEngine
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async getInstanceSummary() {
    try {
      const [instancesResponse, statusResponse] = await Promise.all([
        this.getInstances(),
        this.getTradingStatus()
      ])

      return {
        success: true,
        instances: instancesResponse.instances || [],
        status: statusResponse.status || {}
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async setupTradingAccount(credentials) {
    try {
      // Set credentials
      await this.setCredentials(credentials.username, credentials.password)

      // Test connection
      const connectionResult = await this.testConnection()

      if (!connectionResult.success) {
        throw new Error(connectionResult.message || 'Connection test failed')
      }

      // Get accounts
      const accountsResponse = await this.getAccounts()

      return {
        success: true,
        accounts: accountsResponse.accounts || []
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async createAndStartInstance(config) {
    try {
      // Create instance
      const createResponse = await this.createInstance(config)

      if (!createResponse.success) {
        throw new Error('Failed to create instance')
      }

      const instanceId = createResponse.instance.id

      // Start instance if requested
      if (config.autoStart !== false) {
        const startResponse = await this.startInstance(instanceId)

        if (!startResponse.success) {
          console.warn('Instance created but failed to start:', startResponse.error)
        }
      }

      return {
        success: true,
        instance: createResponse.instance,
        instanceId
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Batch operations
  async stopAllInstances() {
    try {
      const instancesResponse = await this.getInstances()
      const instances = instancesResponse.instances || []

      const runningInstances = instances.filter(instance =>
        instance.status === 'RUNNING' || instance.status === 'PAUSED'
      )

      const stopPromises = runningInstances.map(instance =>
        this.stopInstance(instance.id).catch(error => ({
          instanceId: instance.id,
          error: error.message
        }))
      )

      const results = await Promise.all(stopPromises)
      const errors = results.filter(result => result.error)

      return {
        success: errors.length === 0,
        stopped: runningInstances.length - errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async startAllInstances() {
    try {
      const instancesResponse = await this.getInstances()
      const instances = instancesResponse.instances || []

      const stoppedInstances = instances.filter(instance =>
        instance.status === 'STOPPED'
      )

      const startPromises = stoppedInstances.map(instance =>
        this.startInstance(instance.id).catch(error => ({
          instanceId: instance.id,
          error: error.message
        }))
      )

      const results = await Promise.all(startPromises)
      const errors = results.filter(result => result.error)

      return {
        success: errors.length === 0,
        started: stoppedInstances.length - errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// Create singleton instance
export const apiService = new ApiService()

export default apiService
