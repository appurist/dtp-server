import { io } from 'socket.io-client'
import { ref, reactive } from 'vue'

/**
 * WebSocket Service for real-time communication with the trading server
 * Handles all Socket.IO communication and provides reactive state
 */
class WebSocketService {
  constructor() {
    this.socket = null
    this.isConnected = ref(false)
    this.connectionError = ref(null)
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5

    // Reactive state for trading data
    this.instanceStates = reactive({})
    this.recentSignals = reactive([])
    this.recentLogs = reactive([])

    // Event callbacks
    this.eventCallbacks = new Map()

    // Configuration
    this.serverUrl = import.meta.env.VITE_SERVER_URL || 'http://127.0.0.1:3587'
    this.maxSignals = 100
    this.maxLogs = 500
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    if (this.socket && this.socket.connected) {
      console.log('[WebSocket] Already connected')
      return
    }

    console.log(`[WebSocket] Connecting to ${this.serverUrl}`)

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    this.setupEventHandlers()
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting')
      this.socket.disconnect()
      this.socket = null
    }

    this.isConnected.value = false
    this.connectionError.value = null
    this.reconnectAttempts = 0
  }

  /**
   * Set up Socket.IO event handlers
   */
  setupEventHandlers() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected to server')
      this.isConnected.value = true
      this.connectionError.value = null
      this.reconnectAttempts = 0
      this.emit('connected')
    })

    this.socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Disconnected: ${reason}`)
      this.isConnected.value = false
      this.emit('disconnected', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message)
      this.connectionError.value = error.message
      this.reconnectAttempts++

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached')
        this.emit('connectionFailed', error)
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`)
      this.emit('reconnected', attemptNumber)
    })

    this.socket.on('reconnect_failed', () => {
      console.error('[WebSocket] Failed to reconnect')
      this.emit('reconnectFailed')
    })

    // Trading engine events
    this.socket.on('instanceStates', (states) => {
      console.log('[WebSocket] Received initial instance states')
      Object.assign(this.instanceStates, states)
      this.emit('instanceStates', states)
    })

    this.socket.on('instanceStateChanged', (data) => {
      const { instanceId, state } = data
      this.instanceStates[instanceId] = state
      this.emit('instanceStateChanged', data)
    })

    this.socket.on('instanceSignal', (data) => {
      console.log(`[WebSocket] Trading signal: ${data.signal}`)

      // Add to recent signals (keep only the most recent)
      this.recentSignals.unshift({
        ...data,
        timestamp: new Date(data.timestamp)
      })

      if (this.recentSignals.length > this.maxSignals) {
        this.recentSignals.splice(this.maxSignals)
      }

      this.emit('instanceSignal', data)
    })

    this.socket.on('instanceLog', (data) => {
      // Add to recent logs (keep only the most recent)
      this.recentLogs.unshift({
        ...data,
        timestamp: new Date()
      })

      if (this.recentLogs.length > this.maxLogs) {
        this.recentLogs.splice(this.maxLogs)
      }

      this.emit('instanceLog', data)
    })

    this.socket.on('instanceDataUpdate', (data) => {
      this.emit('instanceDataUpdate', data)
    })

    this.socket.on('instanceCreated', (data) => {
      console.log(`[WebSocket] Instance created: ${data.instanceId}`)
      this.emit('instanceCreated', data)
    })

    this.socket.on('instanceDeleted', (data) => {
      console.log(`[WebSocket] Instance deleted: ${data.instanceId}`)
      delete this.instanceStates[data.instanceId]
      this.emit('instanceDeleted', data)
    })
  }

  /**
   * Register an event callback
   */
  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set())
    }
    this.eventCallbacks.get(event).add(callback)
  }

  /**
   * Unregister an event callback
   */
  off(event, callback) {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.eventCallbacks.delete(event)
      }
    }
  }

  /**
   * Emit an event to registered callbacks
   */
  emit(event, data) {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[WebSocket] Error in event callback for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Get instance state by ID
   */
  getInstanceState(instanceId) {
    return this.instanceStates[instanceId] || null
  }

  /**
   * Get all instance states
   */
  getAllInstanceStates() {
    return { ...this.instanceStates }
  }

  /**
   * Get recent trading signals
   */
  getRecentSignals(count = 50) {
    return this.recentSignals.slice(0, count)
  }

  /**
   * Get recent log messages
   */
  getRecentLogs(count = 100) {
    return this.recentLogs.slice(0, count)
  }

  /**
   * Get signals for a specific instance
   */
  getInstanceSignals(instanceId, count = 20) {
    return this.recentSignals
      .filter(signal => signal.instanceId === instanceId)
      .slice(0, count)
  }

  /**
   * Get logs for a specific instance
   */
  getInstanceLogs(instanceId, count = 50) {
    return this.recentLogs
      .filter(log => log.instanceId === instanceId)
      .slice(0, count)
  }

  /**
   * Clear stored data
   */
  clearData() {
    Object.keys(this.instanceStates).forEach(key => {
      delete this.instanceStates[key]
    })
    this.recentSignals.splice(0)
    this.recentLogs.splice(0)
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected.value,
      error: this.connectionError.value,
      reconnectAttempts: this.reconnectAttempts,
      serverUrl: this.serverUrl
    }
  }

  /**
   * Send a custom message to the server (if needed for future features)
   */
  send(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn(`[WebSocket] Cannot send ${event}: not connected`)
    }
  }
}

// Create singleton instance
export const websocketService = new WebSocketService()

// Auto-connect when the service is imported
if (typeof window !== 'undefined') {
  // Only connect in browser environment (not during SSR)
  websocketService.connect()

  // Reconnect when the window regains focus
  window.addEventListener('focus', () => {
    if (!websocketService.isConnected.value) {
      console.log('[WebSocket] Window focused, attempting to reconnect')
      websocketService.connect()
    }
  })

  // Clean disconnect when the window is about to unload
  window.addEventListener('beforeunload', () => {
    websocketService.disconnect()
  })
}

export default websocketService
