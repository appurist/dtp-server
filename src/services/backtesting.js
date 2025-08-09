/**
 * Backtesting Service - JavaScript port of C# BacktestingService
 * Runs historical backtests using the algorithm engine
 */

import { AlgorithmEngine } from './algorithmEngine.js'
import { BacktestInstance, BacktestStatus, TradeRecord, BacktestResults } from '../models/BacktestInstance.js'
import { TradingData } from '../models/TradingData.js'
import { TradingSides } from '../models/TradingAlgorithm.js'

/**
 * Backtesting Service class
 */
export class BacktestingService {
  constructor() {
    this.activeBacktests = new Map() // backtestId -> BacktestInstance
    this.algorithmEngine = new AlgorithmEngine()
  }

  /**
   * Create a new backtest instance
   */
  createBacktest(config) {
    const backtest = new BacktestInstance({
      definitionId: config.definitionId,
      name: config.name,
      symbol: config.symbol,
      algorithmName: config.algorithmName,
      startDate: config.startDate,
      endDate: config.endDate,
      lagTicks: config.lagTicks || 1,
      startingCapital: config.startingCapital || 10000,
      commission: config.commission || 0
    })

    this.activeBacktests.set(backtest.id, backtest)
    return backtest
  }

  /**
   * Run a backtest
   */
  async runBacktest(backtestId, algorithm, tradingData, onProgress = null, onComplete = null) {
    const backtest = this.activeBacktests.get(backtestId)
    if (!backtest) {
      throw new Error(`Backtest not found: ${backtestId}`)
    }

    try {
      backtest.addLog('info', 'Starting backtest')
      backtest.start()

      // Load algorithm
      this.algorithmEngine.loadAlgorithm(algorithm)
      this.algorithmEngine.reset()

      if (tradingData.count === 0) {
        throw new Error('No historical data available for the specified period')
      }

      backtest.addLog('info', `Loaded ${tradingData.count} data points`)

      // Set trading data in algorithm engine
      this.algorithmEngine.setTradingData(tradingData)

      // Run the backtest simulation
      await this.runSimulation(backtest, tradingData, onProgress)

      // Generate results
      const results = BacktestResults.calculateFromTrades(backtest.trades, backtest.startingCapital)
      backtest.complete(results)
      backtest.addLog('info', 'Backtest completed successfully')

      onComplete?.(backtest)
      return backtest

    } catch (error) {
      backtest.fail(error.message)
      backtest.addLog('error', `Backtest failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Run the backtest simulation
   */
  async runSimulation(backtest, tradingData, onProgress) {
    let currentPosition = TradingSides.NONE
    let entryPrice = 0
    let entryTime = null
    let positionQuantity = 1
    let currentTrade = null

    const totalBars = tradingData.count
    let processedBars = 0

    // Process each bar
    for (let i = 0; i < totalBars; i++) {
      // Check if backtest was stopped
      if (backtest.status === BacktestStatus.STOPPED) {
        break
      }

      // Set current position in algorithm engine
      this.algorithmEngine.setCurrentPosition(currentPosition)

      // Process the algorithm at this bar
      const signal = this.algorithmEngine.processAlgorithm(i)

      if (signal) {
        backtest.addLog('debug', `Signal at bar ${i}: ${signal.type} ${signal.side} at ${signal.price}`)

        if (signal.type === 'ENTRY' && currentPosition === TradingSides.NONE) {
          // Enter position
          currentPosition = signal.side
          entryPrice = signal.price
          entryTime = signal.timestamp

          // Update algorithm engine with position details for P&L calculations
          this.algorithmEngine.setPositionDetails(entryPrice, positionQuantity)

          currentTrade = new TradeRecord({
            entryTime: entryTime,
            side: signal.side,
            entryPrice: entryPrice,
            quantity: positionQuantity,
            entrySignal: signal,
            commission: backtest.commission
          })

          backtest.addLog('info', `Entered ${signal.side} position at ${entryPrice}`)

        } else if (signal.type === 'EXIT' && currentPosition !== TradingSides.NONE) {
          // Exit position
          if (currentTrade) {
            currentTrade.exitTime = signal.timestamp
            currentTrade.exitPrice = signal.price
            currentTrade.exitSignal = signal
            currentTrade.calculatePnL()

            backtest.addTrade(currentTrade)
            backtest.addLog('info',
              `Exited ${currentPosition} position at ${signal.price}, P&L: ${currentTrade.pnl.toFixed(2)}`
            )
          }

          currentPosition = TradingSides.NONE
          entryPrice = 0
          entryTime = null
          currentTrade = null

          // Clear position details in algorithm engine
          this.algorithmEngine.setPositionDetails(0, 1)
        }
      }

      // Update progress
      processedBars++
      const progress = (processedBars / totalBars) * 100
      backtest.updateProgress(progress)

      // Call progress callback periodically
      if (onProgress && processedBars % 100 === 0) {
        onProgress(backtest)
      }

      // Yield control periodically to prevent blocking
      if (i % 1000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    // Close any open position at the end
    if (currentPosition !== TradingSides.NONE && currentTrade) {
      const lastCandle = tradingData.getLastCandle()
      currentTrade.exitTime = new Date(lastCandle.timestamp * 1000).toISOString()
      currentTrade.exitPrice = lastCandle.close
      currentTrade.calculatePnL()

      backtest.addTrade(currentTrade)
      backtest.addLog('info',
        `Closed ${currentPosition} position at end of data at ${lastCandle.close}, P&L: ${currentTrade.pnl.toFixed(2)}`
      )
    }

    backtest.updateProgress(100)
  }

  /**
   * Stop a running backtest
   */
  stopBacktest(backtestId) {
    const backtest = this.activeBacktests.get(backtestId)
    if (backtest && backtest.isRunning()) {
      backtest.stop()
      backtest.addLog('info', 'Backtest stopped by user')
      return true
    }
    return false
  }

  /**
   * Get backtest by ID
   */
  getBacktest(backtestId) {
    return this.activeBacktests.get(backtestId)
  }

  /**
   * Get all backtests
   */
  getAllBacktests() {
    return Array.from(this.activeBacktests.values())
  }

  /**
   * Delete a backtest
   */
  deleteBacktest(backtestId) {
    return this.activeBacktests.delete(backtestId)
  }

  /**
   * Clear all backtests
   */
  clearAllBacktests() {
    this.activeBacktests.clear()
  }

  /**
   * Generate mock historical data for testing
   */
  generateMockData(symbol, startDate, endDate, timeframe = '5m') {
    const tradingData = new TradingData(symbol)

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Calculate timeframe in minutes
    const timeframeMinutes = timeframe === '1m' ? 1 :
                            timeframe === '5m' ? 5 :
                            timeframe === '15m' ? 15 :
                            timeframe === '1h' ? 60 :
                            timeframe === '4h' ? 240 : 1440

    let currentTime = new Date(start)
    let currentPrice = symbol === 'MES' ? 4550 :
                      symbol === 'MNQ' ? 15000 :
                      symbol === 'ES' ? 4550 : 15000

    while (currentTime <= end) {
      const open = currentPrice
      const change = (Math.random() - 0.5) * 20
      const high = open + Math.abs(change) + Math.random() * 10
      const low = open - Math.abs(change) - Math.random() * 10
      const close = open + change
      const volume = Math.floor(Math.random() * 1000) + 100

      tradingData.addCandle(
        Math.floor(currentTime.getTime() / 1000),
        Math.round(open * 100) / 100,
        Math.round(high * 100) / 100,
        Math.round(low * 100) / 100,
        Math.round(close * 100) / 100,
        volume
      )

      currentPrice = close
      currentTime = new Date(currentTime.getTime() + timeframeMinutes * 60 * 1000)
    }

    return tradingData
  }

  /**
   * Create a quick backtest with mock data
   */
  async createQuickBacktest(config) {
    // Generate mock data
    const tradingData = this.generateMockData(
      config.symbol,
      config.startDate,
      config.endDate,
      config.timeframe || '5m'
    )

    // Create backtest
    const backtest = this.createBacktest(config)

    return { backtest, tradingData }
  }

  /**
   * Run a complete backtest with mock data
   */
  async runQuickBacktest(config, algorithm, onProgress = null, onComplete = null) {
    const { backtest, tradingData } = await this.createQuickBacktest(config)

    return await this.runBacktest(
      backtest.id,
      algorithm,
      tradingData,
      onProgress,
      onComplete
    )
  }
}
