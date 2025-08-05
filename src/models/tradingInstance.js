import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { TradingData } from './tradingData.js'
import { AlgorithmEngine } from '../services/algorithmEngine.js'
import { projectXClient } from '../services/projectXClient.js'

/**
 * Trading Instance - Represents a single trading strategy execution
 * Based on the C# Instance implementation
 */
export class TradingInstance extends EventEmitter {
  constructor(config) {
    super()
    
    // Basic properties
    this.id = config.id || uuidv4()
    this.name = config.name || ''
    this.symbol = config.symbol || ''
    this.contractId = config.contractId || ''
    this.accountId = config.accountId || ''
    this.algorithmName = config.algorithmName || ''
    
    // Status and lifecycle
    this.status = 'STOPPED' // RUNNING, STOPPED, PAUSED
    this.simulationMode = config.simulationMode !== undefined ? config.simulationMode : true
    this.startTime = null
    this.stopTime = null
    
    // Trading configuration
    this.startingCapital = config.startingCapital || 10000
    this.commission = config.commission || 2.80
    
    // Position tracking
    this.currentPosition = {
      side: 'NONE', // LONG, SHORT, NONE
      quantity: 0,
      entryPrice: 0,
      entryTime: null
    }
    
    // P&L tracking
    this.totalPnL = 0
    this.totalTrades = 0
    this.winningTrades = 0
    this.losingTrades = 0
    this.trades = []
    
    // Data and algorithm
    this.tradingData = new TradingData(this.contractId)
    this.algorithm = null
    this.lastSignalTime = null
    this.lastDecisionFeedback = ''
    
    // Market data subscription
    this.marketDataCallback = null
    this.isSubscribedToMarketData = false
    
    // Logging
    this.logs = []
    this.maxLogs = 1000
    
    // Tick configuration for P&L calculations
    this.setSymbolTickConfiguration(this.symbol)
  }

  /**
   * Set tick size and value based on trading symbol
   */
  setSymbolTickConfiguration(symbol) {
    const tickConfigs = {
      'ENQ': { tickSize: 0.25, tickValue: 5.0 },
      'NQ': { tickSize: 0.25, tickValue: 5.0 },
      'MNQ': { tickSize: 0.25, tickValue: 0.5 },
      'ES': { tickSize: 0.25, tickValue: 12.50 },
      'MES': { tickSize: 0.25, tickValue: 1.25 },
      'YM': { tickSize: 1.0, tickValue: 5.0 },
      'MYM': { tickSize: 1.0, tickValue: 0.5 },
      'RTY': { tickSize: 0.10, tickValue: 5.0 },
      'M2K': { tickSize: 0.10, tickValue: 0.5 },
      'CL': { tickSize: 0.01, tickValue: 10.0 },
      'GC': { tickSize: 0.10, tickValue: 10.0 },
      'SI': { tickSize: 0.005, tickValue: 25.0 }
    }
    
    const config = tickConfigs[symbol.toUpperCase()] || { tickSize: 0.25, tickValue: 5.0 }
    this.tickSize = config.tickSize
    this.tickValue = config.tickValue
  }

  /**
   * Convert point difference to dollar P&L
   */
  convertPointsToDollars(pointDifference) {
    const ticks = pointDifference / this.tickSize
    return ticks * this.tickValue
  }

  /**
   * Load algorithm configuration
   */
  async loadAlgorithm(algorithmConfig) {
    try {
      this.algorithm = algorithmConfig
      this.algorithmName = algorithmConfig.name
      this.log(`Algorithm loaded: ${this.algorithm.name}`)
      return true
    } catch (error) {
      this.log(`Error loading algorithm: ${error.message}`)
      return false
    }
  }

  /**
   * Start the trading instance
   */
  async start() {
    try {
      if (this.status === 'RUNNING') {
        this.log('Instance already running')
        return false
      }

      if (!this.algorithm) {
        this.log('No algorithm loaded - cannot start')
        return false
      }

      this.log('Starting trading instance...')
      
      // Reset state
      this.status = 'RUNNING'
      this.startTime = new Date()
      this.stopTime = null
      this.lastSignalTime = null
      
      // Reset position if in simulation mode
      if (this.simulationMode) {
        this.currentPosition = {
          side: 'NONE',
          quantity: 0,
          entryPrice: 0,
          entryTime: null
        }
      }

      // Load historical data if needed
      if (this.tradingData.count === 0) {
        this.log('Loading historical data...')
        await this.loadHistoricalData()
      }

      // Subscribe to market data
      await this.subscribeToMarketData()

      this.log(`Instance ${this.name} started successfully`)
      this.emit('statusChanged', { instanceId: this.id, status: this.status })
      
      return true
    } catch (error) {
      this.log(`Error starting instance: ${error.message}`)
      this.status = 'STOPPED'
      return false
    }
  }

  /**
   * Stop the trading instance
   */
  async stop() {
    try {
      if (this.status === 'STOPPED') {
        return true
      }

      this.log('Stopping trading instance...')
      
      // Unsubscribe from market data
      await this.unsubscribeFromMarketData()
      
      this.status = 'STOPPED'
      this.stopTime = new Date()
      
      this.log(`Instance ${this.name} stopped`)
      this.emit('statusChanged', { instanceId: this.id, status: this.status })
      
      return true
    } catch (error) {
      this.log(`Error stopping instance: ${error.message}`)
      return false
    }
  }

  /**
   * Pause the trading instance
   */
  async pause() {
    if (this.status !== 'RUNNING') {
      return false
    }

    this.status = 'PAUSED'
    this.log(`Instance ${this.name} paused`)
    this.emit('statusChanged', { instanceId: this.id, status: this.status })
    
    return true
  }

  /**
   * Resume the trading instance
   */
  async resume() {
    if (this.status !== 'PAUSED') {
      return false
    }

    this.status = 'RUNNING'
    this.log(`Instance ${this.name} resumed`)
    this.emit('statusChanged', { instanceId: this.id, status: this.status })
    
    return true
  }

  /**
   * Load historical data
   */
  async loadHistoricalData() {
    try {
      // Calculate date range (last 5 trading days)
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      
      const historicalData = await projectXClient.getHistoricalData(
        this.contractId,
        '1m', // 1-minute timeframe
        startDate,
        endDate
      )

      if (historicalData && historicalData.length > 0) {
        // Sort by timestamp to ensure chronological order
        historicalData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        
        // Load into trading data
        this.tradingData.loadHistoricalData(historicalData)
        
        this.log(`Loaded ${historicalData.length} historical candles`)
        return true
      } else {
        this.log('No historical data available')
        return false
      }
    } catch (error) {
      this.log(`Error loading historical data: ${error.message}`)
      return false
    }
  }

  /**
   * Subscribe to market data
   */
  async subscribeToMarketData() {
    if (this.isSubscribedToMarketData) {
      return true
    }

    try {
      this.marketDataCallback = (data) => {
        this.onMarketData(data)
      }

      await projectXClient.subscribeToMarketData(this.contractId, this.marketDataCallback)
      this.isSubscribedToMarketData = true
      
      this.log('Subscribed to market data')
      return true
    } catch (error) {
      this.log(`Error subscribing to market data: ${error.message}`)
      return false
    }
  }

  /**
   * Unsubscribe from market data
   */
  async unsubscribeFromMarketData() {
    if (!this.isSubscribedToMarketData || !this.marketDataCallback) {
      return true
    }

    try {
      await projectXClient.unsubscribeFromMarketData(this.contractId, this.marketDataCallback)
      this.isSubscribedToMarketData = false
      this.marketDataCallback = null
      
      this.log('Unsubscribed from market data')
      return true
    } catch (error) {
      this.log(`Error unsubscribing from market data: ${error.message}`)
      return false
    }
  }

  /**
   * Handle incoming market data
   */
  onMarketData(data) {
    if (this.status !== 'RUNNING') {
      return
    }

    try {
      const { contractId, trades } = data
      
      if (contractId !== this.contractId || !trades || trades.length === 0) {
        return
      }

      // Process trades and update candle data
      const tradeTime = new Date(trades[0].timestamp)
      const currentMinute = new Date(tradeTime.getFullYear(), tradeTime.getMonth(), tradeTime.getDate(), 
                                   tradeTime.getHours(), tradeTime.getMinutes(), 0)

      // Calculate OHLCV from trades
      let open = trades[0].price
      let high = Math.max(...trades.map(t => t.price))
      let low = Math.min(...trades.map(t => t.price))
      let close = trades[trades.length - 1].price
      let volume = trades.reduce((sum, t) => sum + t.size, 0)

      // Determine if this is a new candle
      const lastCandle = this.tradingData.getLatestCandle()
      const isNewCandle = !lastCandle || new Date(lastCandle.timestamp).getTime() !== currentMinute.getTime()

      // Update trading data
      this.tradingData.addOrUpdateCandle(currentMinute, open, high, low, close, volume, isNewCandle)

      // Generate trading signals if we have sufficient data
      if (this.tradingData.count >= 20) { // Minimum data for most indicators
        this.generateSignals()
      }

      // Emit data update event
      this.emit('dataUpdate', {
        instanceId: this.id,
        candle: { timestamp: currentMinute, open, high, low, close, volume },
        isNewCandle
      })

    } catch (error) {
      this.log(`Error processing market data: ${error.message}`)
    }
  }

  /**
   * Generate trading signals
   */
  generateSignals() {
    if (!this.algorithm || this.status !== 'RUNNING') {
      return
    }

    try {
      // Calculate indicators
      AlgorithmEngine.calculateIndicators(this.algorithm, this.tradingData)

      const latestCandle = this.tradingData.getLatestCandle()
      if (!latestCandle) return

      // Check for entry signals if no position
      if (this.currentPosition.side === 'NONE') {
        const { longEntry, shortEntry, signal } = AlgorithmEngine.evaluateEntryConditions(
          this.algorithm, this.tradingData
        )

        if (longEntry) {
          this.enterPosition('LONG', latestCandle.close, latestCandle.timestamp, signal)
        } else if (shortEntry) {
          this.enterPosition('SHORT', latestCandle.close, latestCandle.timestamp, signal)
        }
      }
      // Check for exit signals if in position
      else {
        const currentPnL = this.calculateUnrealizedPnL(latestCandle.close)
        const { shouldExit, signal } = AlgorithmEngine.evaluateExitConditions(
          this.algorithm, this.tradingData, this.currentPosition.side,
          this.currentPosition.entryPrice, latestCandle.close, currentPnL
        )

        if (shouldExit) {
          this.exitPosition(latestCandle.close, latestCandle.timestamp, signal)
        }
      }
    } catch (error) {
      this.log(`Error generating signals: ${error.message}`)
    }
  }

  /**
   * Enter a trading position
   */
  enterPosition(side, price, timestamp, signal) {
    this.currentPosition = {
      side,
      quantity: 1, // Default to 1 contract
      entryPrice: price,
      entryTime: timestamp
    }

    this.lastSignalTime = timestamp
    const message = `${this.simulationMode ? 'SIMULATED ' : ''}${side} ENTRY @ ${price.toFixed(2)} - ${signal}`
    
    this.log(message)
    this.emit('signal', {
      instanceId: this.id,
      type: 'ENTRY',
      side,
      price,
      timestamp,
      signal: message
    })

    // Place actual order if not in simulation mode
    if (!this.simulationMode) {
      this.placeOrder(side === 'LONG' ? 'BUY' : 'SELL', 1, signal)
    }
  }

  /**
   * Exit a trading position
   */
  exitPosition(price, timestamp, signal) {
    if (this.currentPosition.side === 'NONE') {
      return
    }

    const pnL = this.calculateRealizedPnL(price)
    const trade = {
      id: uuidv4(),
      entryTime: this.currentPosition.entryTime,
      exitTime: timestamp,
      side: this.currentPosition.side,
      entryPrice: this.currentPosition.entryPrice,
      exitPrice: price,
      quantity: this.currentPosition.quantity,
      pnL,
      commission: this.commission
    }

    // Update statistics
    this.trades.push(trade)
    this.totalTrades++
    this.totalPnL += pnL
    
    if (pnL > 0) {
      this.winningTrades++
    } else {
      this.losingTrades++
    }

    const message = `${this.simulationMode ? 'SIMULATED ' : ''}${this.currentPosition.side} EXIT @ ${price.toFixed(2)} - ${signal}, P&L: $${pnL.toFixed(2)}`
    
    this.log(message)
    this.emit('signal', {
      instanceId: this.id,
      type: 'EXIT',
      side: this.currentPosition.side,
      price,
      timestamp,
      signal: message,
      pnL,
      trade
    })

    // Place actual order if not in simulation mode
    if (!this.simulationMode) {
      const closingSide = this.currentPosition.side === 'LONG' ? 'SELL' : 'BUY'
      this.placeOrder(closingSide, this.currentPosition.quantity, signal)
    }

    // Reset position
    this.currentPosition = {
      side: 'NONE',
      quantity: 0,
      entryPrice: 0,
      entryTime: null
    }
  }

  /**
   * Calculate unrealized P&L for current position
   */
  calculateUnrealizedPnL(currentPrice) {
    if (this.currentPosition.side === 'NONE') {
      return 0
    }

    const pointDifference = this.currentPosition.side === 'LONG' 
      ? (currentPrice - this.currentPosition.entryPrice)
      : (this.currentPosition.entryPrice - currentPrice)

    return this.convertPointsToDollars(pointDifference) * this.currentPosition.quantity
  }

  /**
   * Calculate realized P&L for a completed trade
   */
  calculateRealizedPnL(exitPrice) {
    const pointDifference = this.currentPosition.side === 'LONG'
      ? (exitPrice - this.currentPosition.entryPrice)
      : (this.currentPosition.entryPrice - exitPrice)

    return this.convertPointsToDollars(pointDifference) * this.currentPosition.quantity - this.commission
  }

  /**
   * Place an order (for live trading)
   */
  async placeOrder(side, quantity, reason) {
    if (this.simulationMode) {
      return // No actual orders in simulation mode
    }

    try {
      const orderData = {
        accountId: parseInt(this.accountId),
        contractId: this.contractId,
        side: side === 'BUY' ? 0 : 1,
        quantity,
        orderType: 'MARKET',
        customTag: this.id // Use instance ID for tracking
      }

      const result = await projectXClient.placeOrder(orderData)
      
      if (result.success) {
        this.log(`Order placed: ${side} ${quantity} contracts - ${reason}`)
      } else {
        this.log(`Order failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      this.log(`Error placing order: ${error.message}`)
    }
  }

  /**
   * Log a message
   */
  log(message) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}`
    
    this.logs.unshift(logEntry)
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    console.log(`[${this.name}] ${message}`)
    this.emit('log', { instanceId: this.id, message: logEntry })
  }

  /**
   * Get current state for UI
   */
  getState() {
    const latestCandle = this.tradingData.getLatestCandle()
    const unrealizedPnL = latestCandle ? this.calculateUnrealizedPnL(latestCandle.close) : 0
    
    return {
      id: this.id,
      name: this.name,
      symbol: this.symbol,
      contractId: this.contractId,
      accountId: this.accountId,
      algorithmName: this.algorithmName,
      status: this.status,
      simulationMode: this.simulationMode,
      startTime: this.startTime,
      stopTime: this.stopTime,
      runningTime: this.status === 'RUNNING' && this.startTime ? Date.now() - this.startTime.getTime() : 0,
      
      // Position info
      currentPosition: { ...this.currentPosition },
      unrealizedPnL,
      
      // Trading stats
      totalPnL: this.totalPnL,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      winRate: this.totalTrades > 0 ? (this.winningTrades / this.totalTrades * 100) : 0,
      
      // Data info
      candleCount: this.tradingData.count,
      lastSignalTime: this.lastSignalTime,
      lastDecisionFeedback: this.lastDecisionFeedback,
      
      // Current price
      currentPrice: latestCandle ? latestCandle.close : 0,
      lastUpdate: latestCandle ? latestCandle.timestamp : null
    }
  }

  /**
   * Get trading data for charts
   */
  getChartData(timeRangeMinutes = null) {
    return this.tradingData.toChartData(timeRangeMinutes)
  }

  /**
   * Get recent logs
   */
  getLogs(count = 100) {
    return this.logs.slice(0, count)
  }

  /**
   * Get trade history
   */
  getTrades() {
    return [...this.trades]
  }

  /**
   * Export instance configuration
   */
  toConfig() {
    return {
      id: this.id,
      name: this.name,
      symbol: this.symbol,
      contractId: this.contractId,
      accountId: this.accountId,
      algorithmName: this.algorithmName,
      simulationMode: this.simulationMode,
      startingCapital: this.startingCapital,
      commission: this.commission
    }
  }

  /**
   * Cleanup resources
   */
  async dispose() {
    await this.stop()
    this.removeAllListeners()
  }
}
