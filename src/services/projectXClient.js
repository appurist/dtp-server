import { HubConnectionBuilder } from '@microsoft/signalr'
import fetch from 'node-fetch'
import { EventEmitter } from 'events'

/**
 * Server-side Project X API Client
 * Handles authentication, market data, and trading operations
 */
export class ProjectXClient extends EventEmitter {
  constructor() {
    super()
    this.baseURL = process.env.PROJECTX_API_URL || 'https://api.topstepx.com'
    this.websocketURL = process.env.PROJECTX_WS_URL || 'wss://rtc.topstepx.com'
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
  setCredentials(username, password) {
    this.credentials = { username, password }
    this.token = null
    this.tokenExpiry = null
  }

  /**
   * Authenticate with Project X API
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
      const response = await fetch(`${this.baseURL}/Auth/loginKey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: this.credentials.username,
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
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get accounts
   */
  async getAccounts() {
    return this.makeRequest('/api/Account/search')
  }

  /**
   * Search contracts
   */
  async searchContracts(query = '') {
    const params = new URLSearchParams({ query })
    return this.makeRequest(`/contracts?${params}`)
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
   * Connect to market data WebSocket
   */
  async connectMarketData() {
    if (this.marketConnection) {
      await this.marketConnection.stop()
    }

    const token = await this.getValidToken()

    this.marketConnection = new HubConnectionBuilder()
      .withUrl(`${this.websocketURL}/hubs/market?access_token=${token}`, {
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

    this.marketConnection.onclose(() => {
      this.emit('marketDisconnected')
    })

    await this.marketConnection.start()
    this.emit('marketConnected')
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

    // Subscribe via SignalR
    await this.marketConnection.invoke('SubscribeToContract', contractId)
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
          await this.marketConnection.invoke('UnsubscribeFromContract', contractId)
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
      .withUrl(`${this.websocketURL}/hubs/user?access_token=${token}`, {
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

    await this.userConnection.start()
    this.emit('userDataConnected')
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

    // Subscribe via SignalR
    await this.userConnection.invoke('SubscribeToAccount', accountId)
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
