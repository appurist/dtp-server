import { HubConnectionBuilder } from '@microsoft/signalr'
import fetch from 'node-fetch'
import { EventEmitter } from 'events'

/**
 * Server-side Provider API Client
 * Handles authentication, market data, and trading operations
 */
export class ProjectXClient extends EventEmitter {
  constructor() {
    super()

    // Provider API URLs are constants - no need for environment variables
    this.baseURL = 'https://api.topstepx.com'
    this.marketHubURL = 'https://rtc.topstepx.com/hubs/market'
    this.userHubURL = 'https://rtc.topstepx.com/hubs/user'
    this.token = null
    this.tokenExpiry = null
    this.marketConnection = null
    this.userConnection = null
    this.credentials = null
    this.authenticationPromise = null
    this.marketSubscriptions = new Map() // contractId -> callbacks
    this.positionSubscriptions = new Map() // accountId -> callbacks
  }

  /**
   * Set credentials for authentication
   */
  setCredentials(username, apiKey) {
    this.credentials = { username, apiKey }
    this.token = null
    this.tokenExpiry = null
  }

  /**
   * Authenticate with Provider API
   */
  async authenticate() {
    if (this.authenticationPromise) {
      return this.authenticationPromise
    }

    if (!this.credentials) {
      throw new Error('No credentials provided')
    }

    this.authenticationPromise = this._performAuthentication()
    try {
      const result = await this.authenticationPromise
      return result
    } finally {
      this.authenticationPromise = null
    }
  }

  async _performAuthentication() {
    try {
      const response = await fetch(`${this.baseURL}/api/Auth/loginKey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userName: this.credentials.username,
          apiKey: this.credentials.apiKey
        }),
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Authentication failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      if (!data.token) {
        throw new Error('No token received from authentication')
      }

      this.token = data.token
      // Set expiry to 23 hours from now (tokens typically last 24 hours)
      this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000)

      this.emit('authenticated', { token: this.token, expiry: this.tokenExpiry })
      return { success: true, token: this.token }
    } catch (error) {
      this.emit('authenticationError', error)
      throw error
    }
  }

  /**
   * Get valid token, refreshing if necessary
   */
  async getValidToken() {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token
    }

    await this.authenticate()
    return this.token
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, options = {}) {
    const token = await this.getValidToken()

    const config = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    }

    if (options.body) {
      config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
    } else if (config.method === 'POST') {
      // Some APIs require a body for POST requests, even if empty
      config.body = '{}'
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config)

    if (!response.ok) {
      throw new Error(`API request to ${endpoint} failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get accounts
   * @param {boolean} onlyActiveAccounts - Filter to only active accounts (default: true)
   */
  async getAccounts(onlyActiveAccounts = true) {
    return this.makeRequest('/api/Account/search', {
      method: 'POST',
      body: {
        onlyActiveAccounts
      }
    })
  }

  /**
   * Search contracts
   * @param {string} searchText - The name of the contract to search for
   * @param {boolean} live - Whether to search for contracts using the sim/live data subscription (default: false)
   */
  async searchContracts(searchText = '', live = false) {
    return this.makeRequest('/api/Contract/search', {
      method: 'POST',
      body: {
        searchText,
        live
      }
    })
  }

  /**
   * Get historical data
   */
  async getHistoricalData(contractId, timeframe, startDate, endDate) {
    const params = new URLSearchParams({
      contractId,
      timeframe,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })
    return this.makeRequest(`/historical?${params}`)
  }

  /**
   * Place order
   */
  async placeOrder(orderData) {
    return this.makeRequest('/order/order-place', {
      method: 'POST',
      body: orderData
    })
  }

  /**
   * Get positions
   */
  async getPositions(accountId) {
    const params = new URLSearchParams({ accountId })
    return this.makeRequest(`/positions/search-open-positions?${params}`)
  }

  /**
   * Sanitize error messages to remove sensitive tokens
   */
  sanitizeError(error) {
    if (typeof error === 'string') {
      // Replace access_token parameter with sanitized version
      return error.replace(/access_token=[^&\s]+/g, 'access_token=(token)')
    }
    if (error && error.message) {
      return {
        ...error,
        message: error.message.replace(/access_token=[^&\s]+/g, 'access_token=(token)')
      }
    }
    return error
  }

  /**
   * Connect to market data WebSocket
   */
  async connectMarketData() {
    if (this.marketConnection) {
      await this.marketConnection.stop()
    }

    const token = await this.getValidToken()

    this.marketConnection = new HubConnectionBuilder()
      .withUrl(`${this.marketHubURL}?access_token=${token}`, {
        skipNegotiation: true,
        transport: 1 // WebSockets only
      })
      .withAutomaticReconnect()
      .build()

    // Set up event handlers
    this.marketConnection.on('GatewayTrade', (contractId, trades) => {
      this.emit('marketData', { contractId, trades })

      // Notify specific subscribers
      const callbacks = this.marketSubscriptions.get(contractId)
      if (callbacks) {
        callbacks.forEach(callback => callback({ contractId, trades }))
      }
    })

    this.marketConnection.on('GatewayQuote', (contractId, quotes) => {
      this.emit('marketQuote', { contractId, quotes })
    })

    this.marketConnection.onreconnecting(() => {
      this.emit('marketReconnecting')
    })

    this.marketConnection.onreconnected(() => {
      this.emit('marketReconnected')
    })

    this.marketConnection.onclose((error) => {
      if (error) {
        console.error('[ProjectX] Market connection closed with error:', this.sanitizeError(error))
      }
      this.emit('marketDisconnected')
    })

    try {
      await this.marketConnection.start()
      this.emit('marketConnected')
    } catch (error) {
      console.error('[ProjectX] Failed to connect to market data:', this.sanitizeError(error))
      throw new Error('Failed to connect to market data WebSocket')
    }
  }

  /**
   * Subscribe to market data for a contract
   */
  async subscribeToMarketData(contractId, callback) {
    if (!this.marketConnection) {
      await this.connectMarketData()
    }

    // Store callback
    if (!this.marketSubscriptions.has(contractId)) {
      this.marketSubscriptions.set(contractId, new Set())
    }
    this.marketSubscriptions.get(contractId).add(callback)

    // Subscribe via SignalR using correct ProjectX API methods
    try {
      await this.marketConnection.invoke('SubscribeContractQuotes', contractId)
      await this.marketConnection.invoke('SubscribeContractTrades', contractId)
      console.log(`[ProjectX] Successfully subscribed to market data for contract: ${contractId}`)
    } catch (error) {
      console.error(`[ProjectX] Failed to subscribe to market data:`, this.sanitizeError(error))
      throw error
    }
  }

  /**
   * Unsubscribe from market data
   */
  async unsubscribeFromMarketData(contractId, callback) {
    const callbacks = this.marketSubscriptions.get(contractId)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.marketSubscriptions.delete(contractId)
        if (this.marketConnection) {
          try {
            await this.marketConnection.invoke('UnsubscribeContractQuotes', contractId)
            await this.marketConnection.invoke('UnsubscribeContractTrades', contractId)
            console.log(`[ProjectX] Successfully unsubscribed from market data for contract: ${contractId}`)
          } catch (error) {
            console.error(`[ProjectX] Failed to unsubscribe from market data:`, this.sanitizeError(error))
          }
        }
      }
    }
  }

  /**
   * Connect to user data WebSocket (positions, orders, etc.)
   */
  async connectUserData() {
    if (this.userConnection) {
      await this.userConnection.stop()
    }

    const token = await this.getValidToken()

    this.userConnection = new HubConnectionBuilder()
      .withUrl(`${this.userHubURL}?access_token=${token}`, {
        skipNegotiation: true,
        transport: 1 // WebSockets only
      })
      .withAutomaticReconnect()
      .build()

    // Set up event handlers
    this.userConnection.on('PositionUpdate', (accountId, position) => {
      this.emit('positionUpdate', { accountId, position })

      // Notify specific subscribers
      const callbacks = this.positionSubscriptions.get(accountId)
      if (callbacks) {
        callbacks.forEach(callback => callback({ accountId, position }))
      }
    })

    this.userConnection.on('OrderUpdate', (accountId, order) => {
      this.emit('orderUpdate', { accountId, order })
    })

    this.userConnection.onclose((error) => {
      if (error) {
        console.error('[ProjectX] User connection closed with error:', this.sanitizeError(error))
      }
      this.emit('userDataDisconnected')
    })

    try {
      await this.userConnection.start()
      this.emit('userDataConnected')
    } catch (error) {
      console.error('[ProjectX] Failed to connect to user data:', this.sanitizeError(error))
      throw new Error('Failed to connect to user data WebSocket')
    }
  }

  /**
   * Subscribe to position updates for an account
   */
  async subscribeToPositions(accountId, callback) {
    if (!this.userConnection) {
      await this.connectUserData()
    }

    // Store callback
    if (!this.positionSubscriptions.has(accountId)) {
      this.positionSubscriptions.set(accountId, new Set())
    }
    this.positionSubscriptions.get(accountId).add(callback)

    // Subscribe via SignalR using correct ProjectX API methods
    try {
      await this.userConnection.invoke('SubscribeAccounts')
      await this.userConnection.invoke('SubscribeOrders', accountId)
      await this.userConnection.invoke('SubscribePositions', accountId)
      await this.userConnection.invoke('SubscribeTrades', accountId)
      console.log(`[ProjectX] Successfully subscribed to user data for account: ${accountId}`)
    } catch (error) {
      console.error(`[ProjectX] Failed to subscribe to user data:`, this.sanitizeError(error))
      throw error
    }
  }

  /**
   * Disconnect all connections
   */
  async disconnect() {
    if (this.marketConnection) {
      await this.marketConnection.stop()
      this.marketConnection = null
    }

    if (this.userConnection) {
      await this.userConnection.stop()
      this.userConnection = null
    }

    this.marketSubscriptions.clear()
    this.positionSubscriptions.clear()
    this.emit('disconnected')
  }
}

// Singleton instance
export const projectXClient = new ProjectXClient()
