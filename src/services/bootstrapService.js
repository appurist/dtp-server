/**
 * Bootstrap Service for DayTradersPro Client
 * Discovers server configuration and capabilities
 */
class BootstrapService {
  constructor() {
    this.serverUrl = 'http://127.0.0.1:3587' // Dedicated DayTradersPro port
    this.serverConfig = null
    this.serverCapabilities = null
    this.isServerAvailable = false
  }

  /**
   * Discover server and bootstrap configuration
   */
  async bootstrap() {
    try {
      console.log('[Bootstrap] Discovering DayTradersPro server...')

      // Check server health and capabilities
      const health = await this.checkServerHealth()

      if (health.success) {
        this.isServerAvailable = true
        this.serverCapabilities = health.data

        console.log(`[Bootstrap] Server discovered: ${health.data.version}`)
        console.log(`[Bootstrap] Trading engine: ${health.data.tradingEngine.instanceCount} instances`)

        // Get server configuration
        await this.loadServerConfiguration()

        return {
          success: true,
          serverUrl: this.serverUrl,
          config: this.serverConfig,
          capabilities: this.serverCapabilities
        }
      } else {
        throw new Error(health.error || 'Server not available')
      }
    } catch (error) {
      console.error('[Bootstrap] Server discovery failed:', error.message)
      this.isServerAvailable = false

      return {
        success: false,
        error: error.message,
        serverUrl: this.serverUrl
      }
    }
  }

  /**
   * Check server health and get basic info
   */
  async checkServerHealth() {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const data = await response.json()

      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Load server configuration
   */
  async loadServerConfiguration() {
    try {
      const response = await fetch(`${this.serverUrl}/api/trading/connection`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`Failed to load server config: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        this.serverConfig = result.config
        console.log('[Bootstrap] Server configuration loaded')
      } else {
        throw new Error(result.error || 'Failed to load server configuration')
      }
    } catch (error) {
      console.warn('[Bootstrap] Could not load server configuration:', error.message)
      // Continue without server config - not critical for basic operation
    }
  }

  /**
   * Get server information
   */
  getServerInfo() {
    return {
      url: this.serverUrl,
      available: this.isServerAvailable,
      config: this.serverConfig,
      capabilities: this.serverCapabilities
    }
  }

  /**
   * Check if server supports a specific feature
   */
  hasFeature(feature) {
    if (!this.serverCapabilities) {
      return false
    }

    // Check based on server capabilities
    switch (feature) {
      case 'trading':
        return this.serverCapabilities.tradingEngine !== undefined
      case 'websocket':
        return true // All DayTradersPro servers support WebSocket
      case 'algorithms':
        return true // All DayTradersPro servers support algorithms
      case 'instances':
        return true // All DayTradersPro servers support instances
      default:
        return false
    }
  }

  /**
   * Get recommended client configuration based on server
   */
  getClientConfig() {
    const config = {
      serverUrl: this.serverUrl,
      websocketUrl: this.serverUrl,
      features: {
        trading: this.hasFeature('trading'),
        websocket: this.hasFeature('websocket'),
        algorithms: this.hasFeature('algorithms'),
        instances: this.hasFeature('instances')
      }
    }

    // Add server-specific settings if available
    if (this.serverConfig) {
      config.trading = {
        defaultCommission: this.serverConfig.trading?.defaultCommission || 2.80,
        simulationMode: this.serverConfig.trading?.simulationMode !== false
      }
    }

    return config
  }

  /**
   * Test connectivity to server
   */
  async testConnectivity() {
    const startTime = Date.now()

    try {
      const health = await this.checkServerHealth()
      const responseTime = Date.now() - startTime

      return {
        success: health.success,
        responseTime,
        error: health.error,
        serverInfo: health.success ? health.data : null
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  /**
   * Auto-discover alternative server ports (if needed)
   */
  async discoverAlternativePorts() {
    const alternativePorts = [3587, 3001, 8080, 8000]
    const discoveries = []

    for (const port of alternativePorts) {
      const testUrl = `http://127.0.0.1:${port}`

      try {
        const response = await fetch(`${testUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        })

        if (response.ok) {
          const data = await response.json()

          // Check if this is a DayTradersPro server
          if (data.tradingEngine !== undefined) {
            discoveries.push({
              port,
              url: testUrl,
              version: data.version,
              instances: data.tradingEngine.instanceCount
            })
          }
        }
      } catch (error) {
        // Port not available or not a DayTradersPro server
      }
    }

    return discoveries
  }
}

// Create singleton instance
export const bootstrapService = new BootstrapService()

export default bootstrapService
