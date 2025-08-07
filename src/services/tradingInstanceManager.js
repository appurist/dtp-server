import { EventEmitter } from 'events'
import { TradingInstance } from '../models/tradingInstance.js'
import { projectXClient } from './projectXClient.js'
import fs from 'fs/promises'
import path from 'path'
import { homedir } from 'os'

/**
 * Trading Instance Manager
 * Manages all trading instances, their lifecycle, and persistence
 * Based on the C# InstanceManagerService implementation
 */
export class TradingInstanceManager extends EventEmitter {
  constructor() {
    super()

    this.instances = new Map() // instanceId -> TradingInstance
    this.instanceStates = new Map() // instanceId -> state object
    this.algorithms = new Map() // algorithmName -> algorithm config

    // Configuration
    this.dataPath = process.env.DATA_PATH || './data'
    this.instancesFile = path.join(this.dataPath, 'instances.json')
    this.algorithmsPath = this.getAlgorithmsPath()
    this.connectionFile = path.join(this.dataPath, 'connection.json')
    this.connectionConfig = null

    // State update timer
    this.stateUpdateInterval = null
    this.isDisposed = false

    // Initialize
    this.initialize()
  }

  /**
   * Get algorithms path (same logic as algorithms.js route)
   */
  getAlgorithmsPath() {
    // First try Desktop path (like original .NET version)
    const desktopPath = path.join(homedir(), 'Desktop', 'DayTradersPro', 'algorithms')

    // Fall back to environment variable or local data folder
    const fallbackPath = process.env.ALGORITHMS_PATH || './data/algorithms'

    return desktopPath
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    try {
      // Ensure data directories exist
      await this.ensureDirectories()

      // Load connection configuration
      await this.loadConnectionConfig()

      // Load algorithms
      await this.loadAlgorithms()

      // Load saved instances
      await this.loadInstances()

      // Start state update timer
      this.startStateUpdateTimer()

      console.log('[TradingInstanceManager] Initialized successfully')
    } catch (error) {
      console.error('[TradingInstanceManager] Initialization error:', error.message)
    }
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    const dirs = [
      this.dataPath,
      this.algorithmsPath,
      path.join(this.dataPath, 'historical'),
      path.join(this.dataPath, 'logs')
    ]

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true })
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error.message)
      }
    }
  }

  /**
   * Load connection configuration
   */
  async loadConnectionConfig() {
    try {
      const content = await fs.readFile(this.connectionFile, 'utf8')
      this.connectionConfig = JSON.parse(content)

      // Set Project X credentials if available
      if (this.connectionConfig.projectX?.username && this.connectionConfig.projectX?.apiKey) {
        projectXClient.setCredentials(
          this.connectionConfig.projectX.username,
          this.connectionConfig.projectX.apiKey
        )

        // Auto-connect if enabled
        if (this.connectionConfig.projectX.autoConnect) {
          try {
            await projectXClient.authenticate()
            console.log('[TradingInstanceManager] ✅ Auto-connected to Project X successfully')
          } catch (error) {
            console.warn('[TradingInstanceManager] ⚠️  Auto-connect to Project X failed:', error.message)
            console.warn('[TradingInstanceManager] ⚠️  API URL:', this.connectionConfig.projectX.apiUrl)
            console.warn('[TradingInstanceManager] ⚠️  Username:', this.connectionConfig.projectX.username ? '***' : '(empty)')
            console.warn('[TradingInstanceManager] Server will continue in simulation mode')
            console.warn('[TradingInstanceManager] Update credentials in connection.json for live trading')
          }
        }
      } else {
        console.log('[TradingInstanceManager] No Project X credentials configured - running in simulation mode')
      }

      console.log('[TradingInstanceManager] Connection configuration loaded')
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[TradingInstanceManager] Error loading connection config:', error.message)
      } else {
        console.log('[TradingInstanceManager] No connection config found, using defaults')
      }

      // Set default configuration
      this.connectionConfig = {
        projectX: {
          apiUrl: 'https://api.topstepx.com',
          websocketUrl: 'wss://rtc.topstepx.com',
          autoConnect: false
        },
        server: {
          port: 3587,
          host: '127.0.0.1',
          corsOrigins: ['http://localhost:5173', 'http://localhost:5174']
        },
        trading: {
          defaultCommission: 2.80,
          simulationMode: true
        }
      }
    }
  }

  /**
   * Save connection configuration
   */
  async saveConnectionConfig() {
    try {
      this.connectionConfig.lastUpdated = new Date().toISOString()
      await fs.writeFile(this.connectionFile, JSON.stringify(this.connectionConfig, null, 2))
      console.log('[TradingInstanceManager] Connection configuration saved')
    } catch (error) {
      console.error('[TradingInstanceManager] Error saving connection config:', error.message)
    }
  }

  /**
   * Load algorithm configurations
   */
  async loadAlgorithms() {
    try {
      console.log(`[TradingInstanceManager] Looking for algorithms at: ${this.algorithmsPath}`)

      // Check if directory exists, create if it doesn't
      try {
        await fs.access(this.algorithmsPath)
      } catch (error) {
        console.log(`[TradingInstanceManager] Directory doesn't exist, creating: ${this.algorithmsPath}`)
        await fs.mkdir(this.algorithmsPath, { recursive: true })
      }

      const files = await fs.readdir(this.algorithmsPath)
      console.log(`[TradingInstanceManager] Found ${files.length} files: ${files.join(', ')}`)
      const algorithmFiles = files.filter(file => file.endsWith('.json'))

      for (const file of algorithmFiles) {
        try {
          const filePath = path.join(this.algorithmsPath, file)
          const content = await fs.readFile(filePath, 'utf8')
          const algorithm = JSON.parse(content)

          this.algorithms.set(algorithm.name, algorithm)
          console.log(`[TradingInstanceManager] Loaded algorithm: ${algorithm.name}`)
        } catch (error) {
          console.error(`[TradingInstanceManager] Error loading algorithm ${file}:`, error.message)
        }
      }

      console.log(`[TradingInstanceManager] Loaded ${this.algorithms.size} algorithms`)
    } catch (error) {
      console.error('[TradingInstanceManager] Error loading algorithms:', error.message)
    }
  }

  /**
   * Load saved instances
   */
  async loadInstances() {
    try {
      const content = await fs.readFile(this.instancesFile, 'utf8')
      const data = JSON.parse(content)

      if (data.instances && Array.isArray(data.instances)) {
        for (const instanceConfig of data.instances) {
          await this.createInstance(instanceConfig, false) // Don't save again
        }

        console.log(`[TradingInstanceManager] Loaded ${data.instances.length} instances`)
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[TradingInstanceManager] Error loading instances:', error.message)
      }
    }
  }

  /**
   * Save instances to disk
   */
  async saveInstances() {
    try {
      const instances = Array.from(this.instances.values()).map(instance => instance.toConfig())
      const data = {
        instances,
        lastSaved: new Date().toISOString()
      }

      await fs.writeFile(this.instancesFile, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('[TradingInstanceManager] Error saving instances:', error.message)
    }
  }

  /**
   * Start the state update timer
   */
  startStateUpdateTimer() {
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval)
    }

    this.stateUpdateInterval = setInterval(() => {
      this.updateInstanceStates()
    }, 1000) // Update every second
  }

  /**
   * Update runtime states (only for RUNNING instances)
   */
  updateInstanceStates() {
    if (this.isDisposed) return

    for (const [instanceId, instance] of this.instances) {
      // Only update state for running instances - stopped instances don't have runtime state
      if (instance.status === 'RUNNING') {
        try {
          const state = instance.getState()
          this.instanceStates.set(instanceId, state)
          this.emit('instanceStateChanged', { instanceId, state })
        } catch (error) {
          console.error(`[TradingInstanceManager] Error updating state for running instance ${instanceId}:`, error.message)
        }
      }
    }
  }

  /**
   * Create a new trading instance
   */
  async createInstance(config, save = true) {
    try {
      // Validate algorithm exists
      if (config.algorithmName && !this.algorithms.has(config.algorithmName)) {
        const availableAlgorithms = Array.from(this.algorithms.keys())
        console.error(`[TradingInstanceManager] Algorithm '${config.algorithmName}' not found. Available algorithms:`, availableAlgorithms)
        throw new Error(`Algorithm '${config.algorithmName}' not found. Available: ${availableAlgorithms.join(', ')}`)
      }

      // Create instance
      const instance = new TradingInstance(config)

      // Load algorithm if specified
      if (config.algorithmName) {
        const algorithm = this.algorithms.get(config.algorithmName)
        await instance.loadAlgorithm(algorithm)
      }

      // Set up event listeners
      this.setupInstanceEventListeners(instance)

      // Add to collections
      this.instances.set(instance.id, instance)
      // Only set state for running instances - new instances don't have runtime state yet

      // Save to disk if requested
      if (save) {
        await this.saveInstances()
      }

      console.log(`[TradingInstanceManager] Created instance: ${instance.name} (${instance.id})`)
      this.emit('instanceCreated', { instanceId: instance.id, instance })

      return instance
    } catch (error) {
      console.error('[TradingInstanceManager] Error creating instance:', error.message)
      throw error
    }
  }

  /**
   * Set up event listeners for an instance
   */
  setupInstanceEventListeners(instance) {
    instance.on('statusChanged', (data) => {
      this.emit('instanceStatusChanged', data)
    })

    instance.on('signal', (data) => {
      this.emit('instanceSignal', data)
    })

    instance.on('log', (data) => {
      this.emit('instanceLog', data)
    })

    instance.on('dataUpdate', (data) => {
      this.emit('instanceDataUpdate', data)
    })
  }

  /**
   * Get an instance by ID
   */
  getInstance(instanceId) {
    return this.instances.get(instanceId)
  }

  /**
   * Get all instances
   */
  getAllInstances() {
    return Array.from(this.instances.values())
  }

  /**
   * Get instance state
   */
  getInstanceState(instanceId) {
    return this.instanceStates.get(instanceId)
  }

  /**
   * Get all instance states
   */
  getAllInstanceStates() {
    return Object.fromEntries(this.instanceStates)
  }

  /**
   * Start an instance
   */
  async startInstance(instanceId) {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`)
    }

    const success = await instance.start()
    if (success) {
      await this.saveInstances()
    }

    return success
  }

  /**
   * Stop an instance
   */
  async stopInstance(instanceId) {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`)
    }

    const success = await instance.stop()
    if (success) {
      await this.saveInstances()
    }

    return success
  }

  /**
   * Pause an instance
   */
  async pauseInstance(instanceId) {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`)
    }

    return await instance.pause()
  }

  /**
   * Resume an instance
   */
  async resumeInstance(instanceId) {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`)
    }

    return await instance.resume()
  }

  /**
   * Delete an instance
   */
  async deleteInstance(instanceId) {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`)
    }

    // Stop the instance first
    await instance.stop()

    // Clean up
    await instance.dispose()

    // Remove from collections
    this.instances.delete(instanceId)
    this.instanceStates.delete(instanceId)

    // Save changes
    await this.saveInstances()

    console.log(`[TradingInstanceManager] Deleted instance: ${instanceId}`)
    this.emit('instanceDeleted', { instanceId })

    return true
  }

  /**
   * Update instance configuration
   */
  async updateInstance(instanceId, updates) {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`)
    }

    // Update properties
    if (updates.name !== undefined) instance.name = updates.name
    if (updates.symbol !== undefined) instance.symbol = updates.symbol
    if (updates.contractId !== undefined) instance.contractId = updates.contractId
    if (updates.accountId !== undefined) instance.accountId = updates.accountId
    if (updates.simulationMode !== undefined) instance.simulationMode = updates.simulationMode
    if (updates.startingCapital !== undefined) instance.startingCapital = updates.startingCapital
    if (updates.commission !== undefined) instance.commission = updates.commission

    // Update algorithm if changed
    if (updates.algorithmName !== undefined && updates.algorithmName !== instance.algorithmName) {
      if (!this.algorithms.has(updates.algorithmName)) {
        throw new Error(`Algorithm '${updates.algorithmName}' not found`)
      }

      const algorithm = this.algorithms.get(updates.algorithmName)
      await instance.loadAlgorithm(algorithm)
    }

    // Save changes
    await this.saveInstances()

    console.log(`[TradingInstanceManager] Updated instance: ${instanceId}`)
    this.emit('instanceUpdated', { instanceId, instance })

    return instance
  }

  /**
   * Get available algorithms
   */
  getAlgorithms() {
    return Array.from(this.algorithms.values())
  }

  /**
   * Get algorithm by name
   */
  getAlgorithm(name) {
    return this.algorithms.get(name)
  }



  /**
   * Test Project X connection
   */
  async testConnection() {
    try {
      await projectXClient.authenticate()
      return { success: true, message: 'Connection successful' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  /**
   * Get Project X accounts
   * @param {boolean} onlyActiveAccounts - Filter to only active accounts (default: true)
   */
  async getAccounts(onlyActiveAccounts = true) {
    try {
      return await projectXClient.getAccounts(onlyActiveAccounts)
    } catch (error) {
      console.error('[TradingInstanceManager] Error getting accounts:', error.message)
      throw error
    }
  }

  /**
   * Search contracts
   * @param {string} searchText - The name of the contract to search for
   * @param {boolean} live - Whether to search for contracts using the sim/live data subscription (default: false)
   */
  async searchContracts(searchText, live = false) {
    try {
      return await projectXClient.searchContracts(searchText, live)
    } catch (error) {
      console.error('[TradingInstanceManager] Error searching contracts:', error.message)
      throw error
    }
  }

  /**
   * Get client configuration (only UI-relevant settings)
   */
  getClientConfig() {
    if (!this.connectionConfig) {
      return null
    }

    // Return only client-relevant configuration
    return {
      server: {
        port: this.connectionConfig.server?.port || 3587,
        host: this.connectionConfig.server?.host || '127.0.0.1'
      },
      trading: {
        defaultCommission: this.connectionConfig.trading?.defaultCommission || 2.80,
        simulationMode: this.connectionConfig.trading?.simulationMode !== false
      }
    }
  }

  /**
   * Get server status including Project X connection
   */
  async getServerStatus() {
    const status = {
      server: {
        uptime: process.uptime(),
        version: '1.0.0',
        port: this.connectionConfig?.server?.port || 3587,
        host: this.connectionConfig?.server?.host || '127.0.0.1'
      },
      projectX: {
        configured: !!(this.connectionConfig?.projectX?.username && this.connectionConfig?.projectX?.apiKey),
        connected: false,
        authenticated: false,
        lastError: null
      },
      trading: {
        instanceCount: this.instances.size,
        runningInstances: Array.from(this.instances.values()).filter(i => i.status === 'running').length,
        simulationMode: this.connectionConfig?.trading?.simulationMode !== false
      }
    }

    // Check Project X connection status
    if (status.projectX.configured) {
      try {
        // Test if we can get a valid token
        const token = await projectXClient.getValidToken()
        if (token) {
          status.projectX.authenticated = true
          status.projectX.connected = true
        }
      } catch (error) {
        status.projectX.lastError = error.message
        status.projectX.authenticated = false
        status.projectX.connected = false
      }
    }

    return status
  }



  /**
   * Dispose of the manager
   */
  async dispose() {
    if (this.isDisposed) return

    this.isDisposed = true

    // Clear timer
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval)
      this.stateUpdateInterval = null
    }

    // Stop all instances
    for (const instance of this.instances.values()) {
      await instance.dispose()
    }

    // Clear collections
    this.instances.clear()
    this.instanceStates.clear()
    this.algorithms.clear()

    // Remove all listeners
    this.removeAllListeners()

    console.log('[TradingInstanceManager] Disposed')
  }
}

// Singleton instance
export const tradingInstanceManager = new TradingInstanceManager()
