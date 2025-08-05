import { ref, reactive, computed } from 'vue'
import { apiService } from './apiService.js'
import { websocketService } from './websocketService.js'
import { storageService } from './storage.js'
import { bootstrapService } from './bootstrapService.js'

/**
 * Trading Service - Integrates with the DayTradersPro server
 * Replaces direct Project X API calls with server-side communication
 */
export class TradingService {
  constructor() {
    // Connection state
    this.isConnected = ref(false)
    this.isAuthenticated = ref(false)
    this.connectionError = ref(null)
    this.serverStatus = ref(null)

    // Trading data
    this.accounts = ref([])
    this.contracts = ref([])
    this.algorithms = ref([])
    this.instances = reactive({})

    // Real-time data from WebSocket
    this.recentSignals = computed(() => websocketService.getRecentSignals())
    this.recentLogs = computed(() => websocketService.getRecentLogs())

    // Credentials
    this.credentials = null

    // Initialize
    this.initialize()
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Bootstrap server discovery
      console.log('[TradingService] Bootstrapping server connection...')
      const bootstrap = await bootstrapService.bootstrap()

      if (!bootstrap.success) {
        throw new Error(`Server discovery failed: ${bootstrap.error}`)
      }

      console.log('[TradingService] Server discovered successfully')

      // Load saved credentials
      await this.loadCredentials()

      // Check server connection
      await this.checkServerConnection()

      // Set up WebSocket event handlers
      this.setupWebSocketHandlers()

      // Note: Authentication is now managed server-side
      // Client does not auto-authenticate - server handles Project X connection

    } catch (error) {
      console.error('[TradingService] Initialization error:', error)
      const errorMessage = error.message || error.toString() || 'Unknown initialization error'
      this.connectionError.value = errorMessage
      console.log('[TradingService] Connection error set to:', errorMessage)
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  setupWebSocketHandlers() {
    websocketService.on('connected', () => {
      this.isConnected.value = true
      this.connectionError.value = null
    })

    websocketService.on('disconnected', () => {
      this.isConnected.value = false
    })

    websocketService.on('connectionFailed', (error) => {
      this.connectionError.value = error.message
    })

    websocketService.on('instanceStateChanged', (data) => {
      this.instances[data.instanceId] = data.state
    })

    websocketService.on('instanceCreated', (data) => {
      // Instance will be updated via instanceStateChanged
    })

    websocketService.on('instanceDeleted', (data) => {
      delete this.instances[data.instanceId]
    })
  }

  /**
   * Check server connection
   */
  async checkServerConnection() {
    try {
      const result = await apiService.validateConnection()

      if (result.success) {
        this.isConnected.value = true
        this.serverStatus.value = result.serverStatus
        this.connectionError.value = null
        return true
      } else {
        this.isConnected.value = false
        const errorMessage = result.error || 'Server connection failed'
        this.connectionError.value = errorMessage
        console.log('[TradingService] Server connection failed:', errorMessage)
        return false
      }
    } catch (error) {
      this.isConnected.value = false
      const errorMessage = error.message || error.toString() || 'Network error connecting to server'
      this.connectionError.value = errorMessage
      console.log('[TradingService] Network error:', errorMessage)
      return false
    }
  }

  /**
   * Load credentials - NO LONGER USED
   * Credentials are managed server-side only
   */
  async loadCredentials() {
    // No-op: Credentials are managed server-side in connection.json
    console.log('[TradingService] Credentials managed server-side - no client storage needed')
    this.credentials = null
    return null
  }

  /**
   * Save credentials - NO LONGER USED
   * Credentials are managed server-side only
   */
  async saveCredentials(credentials) {
    // No-op: Credentials are managed server-side in connection.json
    console.log('[TradingService] Credentials managed server-side - no client storage needed')
  }

  /**
   * Authenticate with Project X via server
   */
  async authenticate(username = null, password = null) {
    try {
      // Use provided credentials or stored ones
      const user = username || this.credentials?.username
      const pass = password || this.credentials?.password

      if (!user || !pass) {
        throw new Error('Username and password are required')
      }

      // Set credentials on server
      const result = await apiService.setCredentials(user, pass)

      if (!result.success) {
        throw new Error(result.error || 'Failed to set credentials')
      }

      // Test connection
      const testResult = await apiService.testConnection()

      if (!testResult.success) {
        throw new Error(testResult.message || 'Authentication failed')
      }

      // Credentials are managed server-side only - no client storage needed

      this.isAuthenticated.value = true
      this.connectionError.value = null

      // Load initial data
      await this.loadInitialData()

      return { success: true }
    } catch (error) {
      this.isAuthenticated.value = false
      this.connectionError.value = error.message
      return { success: false, error: error.message }
    }
  }

  /**
   * Load initial data after authentication
   */
  async loadInitialData() {
    try {
      // Load accounts, algorithms, and instances in parallel
      const [accountsResult, algorithmsResult, instancesResult] = await Promise.all([
        apiService.getAccounts().catch(error => ({ success: false, error: error.message })),
        apiService.getAlgorithms().catch(error => ({ success: false, error: error.message })),
        apiService.getInstances().catch(error => ({ success: false, error: error.message }))
      ])

      if (accountsResult.success) {
        this.accounts.value = accountsResult.accounts || []
      }

      if (algorithmsResult.success) {
        this.algorithms.value = algorithmsResult.algorithms || []
      }

      if (instancesResult.success) {
        // Update instances reactively
        const instances = instancesResult.instances || []
        instances.forEach(instance => {
          this.instances[instance.id] = instance
        })
      }

    } catch (error) {
      console.error('[TradingService] Error loading initial data:', error)
    }
  }

  /**
   * Search contracts
   */
  async searchContracts(query = '') {
    try {
      const result = await apiService.searchContracts(query)

      if (result.success) {
        this.contracts.value = result.contracts || []
        return result.contracts
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error searching contracts:', error)
      throw error
    }
  }

  /**
   * Create a new trading instance
   */
  async createInstance(config) {
    try {
      const result = await apiService.createInstance(config)

      if (result.success) {
        // Instance will be added via WebSocket event
        return result.instance
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error creating instance:', error)
      throw error
    }
  }

  /**
   * Update a trading instance
   */
  async updateInstance(instanceId, updates) {
    try {
      const result = await apiService.updateInstance(instanceId, updates)

      if (result.success) {
        // Instance will be updated via WebSocket event
        return result.instance
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error updating instance:', error)
      throw error
    }
  }

  /**
   * Delete a trading instance
   */
  async deleteInstance(instanceId) {
    try {
      const result = await apiService.deleteInstance(instanceId)

      if (result.success) {
        // Instance will be removed via WebSocket event
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error deleting instance:', error)
      throw error
    }
  }

  /**
   * Start a trading instance
   */
  async startInstance(instanceId) {
    try {
      const result = await apiService.startInstance(instanceId)

      if (result.success) {
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error starting instance:', error)
      throw error
    }
  }

  /**
   * Stop a trading instance
   */
  async stopInstance(instanceId) {
    try {
      const result = await apiService.stopInstance(instanceId)

      if (result.success) {
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error stopping instance:', error)
      throw error
    }
  }

  /**
   * Pause a trading instance
   */
  async pauseInstance(instanceId) {
    try {
      const result = await apiService.pauseInstance(instanceId)

      if (result.success) {
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error pausing instance:', error)
      throw error
    }
  }

  /**
   * Resume a trading instance
   */
  async resumeInstance(instanceId) {
    try {
      const result = await apiService.resumeInstance(instanceId)

      if (result.success) {
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error resuming instance:', error)
      throw error
    }
  }

  /**
   * Get chart data for an instance
   */
  async getChartData(instanceId, timeRangeMinutes = null) {
    try {
      const result = await apiService.getChartData(instanceId, timeRangeMinutes)

      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error getting chart data:', error)
      throw error
    }
  }

  /**
   * Get logs for an instance
   */
  async getInstanceLogs(instanceId, count = 100) {
    try {
      const result = await apiService.getInstanceLogs(instanceId, count)

      if (result.success) {
        return result.logs
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error getting instance logs:', error)
      throw error
    }
  }

  /**
   * Get trades for an instance
   */
  async getInstanceTrades(instanceId) {
    try {
      const result = await apiService.getInstanceTrades(instanceId)

      if (result.success) {
        return result.trades
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[TradingService] Error getting instance trades:', error)
      throw error
    }
  }

  /**
   * Get instance by ID
   */
  getInstance(instanceId) {
    return this.instances[instanceId] || null
  }

  /**
   * Get all instances as array
   */
  getAllInstances() {
    return Object.values(this.instances)
  }

  /**
   * Get running instances
   */
  getRunningInstances() {
    return this.getAllInstances().filter(instance => instance.status === 'RUNNING')
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected.value,
      authenticated: this.isAuthenticated.value,
      error: this.connectionError.value,
      serverStatus: this.serverStatus.value,
      websocket: websocketService.getConnectionStatus()
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    this.isAuthenticated.value = false
    this.isConnected.value = false
    this.connectionError.value = null

    // Clear data
    this.accounts.value = []
    this.contracts.value = []
    Object.keys(this.instances).forEach(key => {
      delete this.instances[key]
    })

    // Clear WebSocket data
    websocketService.clearData()
  }
}

// Create singleton instance
export const tradingService = new TradingService()

export default tradingService
