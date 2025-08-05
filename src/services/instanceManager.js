import { reactive, ref } from 'vue'
import { AlgorithmEngine } from './algorithmEngine.js'
import { tradingService } from './tradingService.js'
import { historicalDataService } from './historicalData.js'
import { marketDataService } from './marketData.js'
import { TradingData } from '@/models/TradingData.js'

/**
 * Instance Manager Service - Manages live trading instances for DTP
 */
class InstanceManagerService {
  constructor() {
    this.instances = reactive(new Map()) // instanceId -> Instance
    this.algorithmEngines = new Map() // instanceId -> AlgorithmEngine
    this.updateIntervals = new Map() // instanceId -> interval ID
    this.isInitialized = ref(false)
  }

  /**
   * Initialize the instance manager
   */
  async initialize() {
    try {
      console.log('Initializing Instance Manager Service')
      this.isInitialized.value = true
      return true
    } catch (error) {
      console.error('Error initializing instance manager:', error)
      return false
    }
  }

  /**
   * Create a new trading instance
   */
  async createInstance(config) {
    try {
      const instance = {
        id: config.id,
        name: config.name,
        symbol: config.symbol,
        algorithmName: config.algorithmName,
        simulationMode: config.simulationMode !== undefined ? config.simulationMode : true,
        startingCapital: config.startingCapital || 10000,
        commission: config.commission || 2.80,
        status: 'STOPPED',
        currentPosition: { side: 'NONE', quantity: 0, entryPrice: 0 },
        logs: [],
        lastPrice: 0
      }

      // Store the instance
      this.instances.set(instance.id, instance)

      // Create algorithm engine for this instance
      const algorithmEngine = new AlgorithmEngine()
      this.algorithmEngines.set(instance.id, algorithmEngine)

      console.log(`Created instance: ${instance.name} (${instance.id})`)
      return instance
    } catch (error) {
      console.error('Error creating instance:', error)
      throw error
    }
  }

  /**
   * Start a trading instance
   */
  async startInstance(instanceId, algorithm) {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error('Instance not found')
    }

    try {
      console.log(`Starting instance: ${instance.name}`)
      instance.status = 'STARTING'

      // Step 1: Load algorithm into engine
      const algorithmEngine = this.algorithmEngines.get(instanceId)
      if (!algorithmEngine) {
        throw new Error('Algorithm engine not found for instance')
      }

      algorithmEngine.loadAlgorithm(algorithm)
      console.log(`Algorithm loaded: ${algorithm.name}`)

      // Step 2: Collect sufficient historical data for indicator calculations
      console.log(`Collecting historical data for ${instance.symbol}...`)

      // Collect last 5 days of data to ensure we have enough for indicators
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - (5 * 24 * 60 * 60 * 1000)) // 5 days ago

      console.log(`Collecting historical data from ${startDate.toISOString()} to ${endDate.toISOString()}`)
      const historicalResult = await historicalDataService.collectHistoricalData(instance.symbol, startDate, endDate)

      if (!historicalResult.success) {
        throw new Error(`Failed to collect historical data: ${historicalResult.error}`)
      }

      console.log(`Collected ${historicalResult.candlesCollected} historical candles`)

      // Warn if we have limited data, but continue anyway
      if (historicalResult.candlesCollected === 0) {
        console.warn(`No historical data available for ${instance.symbol}. This could be due to market closure, invalid symbol, or data provider issues. Instance will start and wait for new data.`)
      } else if (historicalResult.candlesCollected < 50) {
        console.warn(`Limited historical data (${historicalResult.candlesCollected} candles) for ${instance.symbol}. Indicators may not be accurate until more data is available.`)
      }

      // Step 3: Load historical data and create TradingData
      // Use the same date range we collected
      const dataResult = await historicalDataService.loadHistoricalData(instance.symbol, startDate, endDate)

      // Step 4: Initialize TradingData with historical candles
      const tradingData = new TradingData(instance.symbol)

      // Add historical candles to trading data (if any available)
      if (dataResult.success && dataResult.candles.length > 0) {
        console.log(`Loading ${dataResult.candles.length} historical candles into trading data`)
        for (const candle of dataResult.candles) {
          tradingData.addCandle(
            new Date(candle.timestamp),
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.volume
          )
        }
      } else {
        console.log('No historical candles available - trading data initialized empty')
      }

      // Step 5: Set trading data in algorithm engine and calculate indicators
      algorithmEngine.setTradingData(tradingData)
      console.log(`Initialized trading data with ${tradingData.count} candles and calculated indicators`)

      // Step 6: Get contract information for market data subscription
      const contracts = await projectXService.searchContracts(instance.symbol)
      if (!contracts.success || contracts.contracts.length === 0) {
        throw new Error(`No contracts found for symbol: ${instance.symbol}`)
      }

      const contract = contracts.contracts[0]
      instance.contractId = contract.id
      console.log(`Using contract: ${contract.name} (${contract.id})`)

      // Step 7: Subscribe to real-time market data
      const subscribed = await marketDataService.subscribeToMarketData(
        contract.id,
        instance.symbol,
        (tradeData) => this.handleTradeUpdate(instanceId, tradeData),
        (price, timestamp) => this.handlePriceUpdate(instanceId, price, timestamp)
      )

      if (!subscribed) {
        throw new Error('Failed to subscribe to market data')
      }

      console.log(`Subscribed to real-time market data for ${instance.symbol}`)

      // Step 8: Start the instance
      instance.status = 'RUNNING'
      instance.startedAt = new Date().toISOString()

      // Step 9: Start the trading loop
      this.startTradingLoop(instanceId)

      console.log(`Successfully started instance: ${instance.name}`)
      return true
    } catch (error) {
      console.error('Error starting instance:', error)
      instance.status = 'STOPPED'
      throw error
    }
  }

  /**
   * Stop a trading instance
   */
  async stopInstance(instanceId) {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      return false
    }

    try {
      console.log(`Stopping instance: ${instance.name}`)

      // Stop trading loop
      this.stopTradingLoop(instanceId)

      // Unsubscribe from market data
      if (instance.contractId) {
        await marketDataService.unsubscribeFromMarketData(instance.contractId)
        console.log(`Unsubscribed from market data for ${instance.symbol}`)
      }

      // Stop the instance
      instance.status = 'STOPPED'
      instance.stoppedAt = new Date().toISOString()

      console.log(`Stopped instance: ${instance.name}`)
      return true
    } catch (error) {
      console.error('Error stopping instance:', error)
      return false
    }
  }

  /**
   * Pause a trading instance
   */
  async pauseInstance(instanceId) {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      return false
    }

    try {
      // Stop trading loop but keep instance data
      this.stopTradingLoop(instanceId)
      instance.status = 'PAUSED'

      console.log(`Paused instance: ${instance.name}`)
      return true
    } catch (error) {
      console.error('Error pausing instance:', error)
      return false
    }
  }

  /**
   * Resume a trading instance
   */
  async resumeInstance(instanceId) {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      return false
    }

    try {
      // Restart trading loop
      this.startTradingLoop(instanceId)
      instance.status = 'RUNNING'

      console.log(`Resumed instance: ${instance.name}`)
      return true
    } catch (error) {
      console.error('Error resuming instance:', error)
      return false
    }
  }

  /**
   * Start the trading loop for an instance
   */
  startTradingLoop(instanceId) {
    // Clear any existing interval
    this.stopTradingLoop(instanceId)

    // Start new interval (process every 5 seconds for now)
    const intervalId = setInterval(() => {
      this.processTradingLogic(instanceId)
    }, 5000)

    this.updateIntervals.set(instanceId, intervalId)
  }

  /**
   * Stop the trading loop for an instance
   */
  stopTradingLoop(instanceId) {
    const intervalId = this.updateIntervals.get(instanceId)
    if (intervalId) {
      clearInterval(intervalId)
      this.updateIntervals.delete(instanceId)
    }
  }

  /**
   * Handle trade update from market data
   */
  handleTradeUpdate(instanceId, tradeData) {
    const instance = this.instances.get(instanceId)
    const algorithmEngine = this.algorithmEngines.get(instanceId)

    if (!instance || !algorithmEngine || instance.status !== 'RUNNING') {
      return
    }

    try {
      // Update instance with latest trade data
      instance.lastPrice = tradeData.price
      instance.lastUpdate = tradeData.timestamp

      // Add trade data to algorithm engine's trading data
      // This will be used for real-time indicator updates
      const tradingData = algorithmEngine.tradingData
      if (tradingData) {
        // Update the current candle with new trade data
        tradingData.updateCurrentCandle(tradeData.price, tradeData.volume, tradeData.timestamp)
      }

    } catch (error) {
      console.error(`Error handling trade update for instance ${instanceId}:`, error)
    }
  }

  /**
   * Handle price update from market data
   */
  handlePriceUpdate(instanceId, price, timestamp) {
    const instance = this.instances.get(instanceId)
    if (!instance || instance.status !== 'RUNNING') {
      return
    }

    try {
      // Update instance with latest price
      instance.lastPrice = price
      instance.lastUpdate = timestamp

    } catch (error) {
      console.error(`Error handling price update for instance ${instanceId}:`, error)
    }
  }

  /**
   * Process trading logic for an instance
   */
  processTradingLogic(instanceId) {
    const instance = this.instances.get(instanceId)
    const algorithmEngine = this.algorithmEngines.get(instanceId)

    if (!instance || !algorithmEngine || instance.status !== 'RUNNING') {
      return
    }

    try {
      // Set current position in algorithm engine
      algorithmEngine.setCurrentPosition(instance.currentPosition.side)

      // Process the algorithm with current data
      const signal = algorithmEngine.processAlgorithm()

      if (signal) {
        console.log(`Generated signal for ${instance.name}:`, signal)

        // Store the signal
        if (!instance.signals) {
          instance.signals = []
        }
        instance.signals.push(signal)

        // Execute the signal
        if (instance.simulationMode) {
          this.executeSimulatedSignal(instanceId, signal)
        } else {
          this.executeLiveSignal(instanceId, signal)
        }
      }

    } catch (error) {
      console.error(`Trading logic error for instance ${instanceId}:`, error)
    }
  }

  /**
   * Execute a signal in simulation mode
   */
  executeSimulatedSignal(instanceId, signal) {
    const instance = this.instances.get(instanceId)
    if (!instance) return

    const currentPrice = instance.lastPrice || 0

    try {
      if (signal.type === 'ENTRY' && instance.currentPosition.side === 'NONE') {
        // Enter position
        instance.currentPosition = {
          side: signal.side,
          quantity: 1,
          entryPrice: currentPrice,
          entryTime: new Date(),
          unrealizedPnL: 0
        }

        console.log(`Simulated entry for ${instance.name}: ${signal.side} @ ${currentPrice.toFixed(2)}`)

      } else if (signal.type === 'EXIT' && instance.currentPosition.side !== 'NONE') {
        // Exit position
        const pnl = this.calculatePnL(instance.currentPosition, currentPrice, instance.commission)

        console.log(`Simulated exit for ${instance.name}: ${instance.currentPosition.side} @ ${currentPrice.toFixed(2)}, P&L: ${pnl.toFixed(2)}`)

        // Update instance P&L
        if (!instance.totalPnL) instance.totalPnL = 0
        instance.totalPnL += pnl

        // Reset position
        instance.currentPosition = { side: 'NONE', quantity: 0, entryPrice: 0 }
      }
    } catch (error) {
      console.error(`Error executing simulated signal for instance ${instanceId}:`, error)
    }
  }

  /**
   * Execute a signal in live mode (placeholder)
   */
  executeLiveSignal(instanceId, signal) {
    const instance = this.instances.get(instanceId)
    if (!instance) return

    console.log(`Live signal execution for ${instance.name}:`, signal)

    // TODO: Implement live order placement via ProjectX
    // This would involve:
    // 1. Validate signal
    // 2. Calculate position size
    // 3. Place market/limit orders
    // 4. Track order status
    // 5. Update positions
  }

  /**
   * Calculate P&L for a position
   */
  calculatePnL(position, currentPrice, commission) {
    if (position.side === 'NONE' || position.entryPrice === 0) {
      return 0
    }

    const priceDiff = position.side === 'LONG'
      ? currentPrice - position.entryPrice
      : position.entryPrice - currentPrice

    const grossPnL = priceDiff * position.quantity
    const netPnL = grossPnL - (commission * 2) // Entry + Exit commission

    return netPnL
  }

  /**
   * Get all instances
   */
  getAllInstances() {
    return Array.from(this.instances.values())
  }

  /**
   * Get instance by ID
   */
  getInstance(instanceId) {
    return this.instances.get(instanceId)
  }

  /**
   * Remove an instance
   */
  removeInstance(instanceId) {
    // Stop the instance first
    this.stopInstance(instanceId)

    // Clean up
    this.instances.delete(instanceId)
    this.algorithmEngines.delete(instanceId)

    console.log(`Removed instance: ${instanceId}`)
  }
}

// Create and export singleton instance
export const instanceManagerService = new InstanceManagerService()
