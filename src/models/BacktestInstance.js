/**
 * Backtest Models - JavaScript port of C# BacktestInstance models
 */

import { v4 as uuidv4 } from 'uuid'

/**
 * Backtest status enumeration
 */
export const BacktestStatus = {
  CREATED: 'Created',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  STOPPED: 'Stopped'
}

/**
 * Represents a single trade record
 */
export class TradeRecord {
  constructor(data = {}) {
    this.id = data.id || uuidv4()
    this.entryTime = data.entryTime || null
    this.exitTime = data.exitTime || null
    this.side = data.side || 'LONG' // LONG or SHORT
    this.entryPrice = data.entryPrice || 0
    this.exitPrice = data.exitPrice || 0
    this.quantity = data.quantity || 1
    this.pnl = data.pnl || 0
    this.pnlPercent = data.pnlPercent || 0
    this.commission = data.commission || 0
    this.entrySignal = data.entrySignal || null
    this.exitSignal = data.exitSignal || null
    this.duration = data.duration || 0 // in milliseconds
    this.maxFavorableExcursion = data.maxFavorableExcursion || 0
    this.maxAdverseExcursion = data.maxAdverseExcursion || 0
  }

  /**
   * Calculate P&L based on entry/exit prices
   */
  calculatePnL() {
    if (!this.entryPrice || !this.exitPrice || !this.quantity) {
      return
    }

    const priceDiff = this.side === 'LONG' ?
      (this.exitPrice - this.entryPrice) :
      (this.entryPrice - this.exitPrice)

    this.pnl = priceDiff * this.quantity - this.commission
    this.pnlPercent = (priceDiff / this.entryPrice) * 100

    if (this.entryTime && this.exitTime) {
      this.duration = new Date(this.exitTime).getTime() - new Date(this.entryTime).getTime()
    }
  }

  /**
   * Check if trade is complete
   */
  isComplete() {
    return this.entryTime && this.exitTime && this.entryPrice && this.exitPrice
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      entryTime: this.entryTime,
      exitTime: this.exitTime,
      side: this.side,
      entryPrice: this.entryPrice,
      exitPrice: this.exitPrice,
      quantity: this.quantity,
      pnl: this.pnl,
      pnlPercent: this.pnlPercent,
      commission: this.commission,
      entrySignal: this.entrySignal,
      exitSignal: this.exitSignal,
      duration: this.duration,
      maxFavorableExcursion: this.maxFavorableExcursion,
      maxAdverseExcursion: this.maxAdverseExcursion
    }
  }
}

/**
 * Backtest results and performance metrics
 */
export class BacktestResults {
  constructor(data = {}) {
    this.totalTrades = data.totalTrades || 0
    this.winningTrades = data.winningTrades || 0
    this.losingTrades = data.losingTrades || 0
    this.winRate = data.winRate || 0
    this.totalPnL = data.totalPnL || 0
    this.totalPnLPercent = data.totalPnLPercent || 0
    this.averagePnL = data.averagePnL || 0
    this.averageWin = data.averageWin || 0
    this.averageLoss = data.averageLoss || 0
    this.largestWin = data.largestWin || 0
    this.largestLoss = data.largestLoss || 0
    this.profitFactor = data.profitFactor || 0
    this.sharpeRatio = data.sharpeRatio || 0
    this.maxDrawdown = data.maxDrawdown || 0
    this.maxDrawdownPercent = data.maxDrawdownPercent || 0
    this.averageTradeDuration = data.averageTradeDuration || 0
    this.totalCommission = data.totalCommission || 0
    this.startingCapital = data.startingCapital || 10000
    this.endingCapital = data.endingCapital || 10000
    this.equityCurve = data.equityCurve || []
    this.drawdownCurve = data.drawdownCurve || []
  }

  /**
   * Calculate all performance metrics from trade records
   */
  static calculateFromTrades(trades, startingCapital = 10000) {
    const results = new BacktestResults({ startingCapital })

    if (!trades || trades.length === 0) {
      return results
    }

    const completedTrades = trades.filter(t => t.isComplete())
    results.totalTrades = completedTrades.length

    if (results.totalTrades === 0) {
      return results
    }

    // Basic metrics
    const winningTrades = completedTrades.filter(t => t.pnl > 0)
    const losingTrades = completedTrades.filter(t => t.pnl < 0)

    results.winningTrades = winningTrades.length
    results.losingTrades = losingTrades.length
    results.winRate = (results.winningTrades / results.totalTrades) * 100

    // P&L metrics
    results.totalPnL = completedTrades.reduce((sum, t) => sum + t.pnl, 0)
    results.totalPnLPercent = (results.totalPnL / startingCapital) * 100
    results.averagePnL = results.totalPnL / results.totalTrades

    if (winningTrades.length > 0) {
      results.averageWin = winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      results.largestWin = Math.max(...winningTrades.map(t => t.pnl))
    }

    if (losingTrades.length > 0) {
      results.averageLoss = losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
      results.largestLoss = Math.min(...losingTrades.map(t => t.pnl))
    }

    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0)
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0))
    results.profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0

    // Duration metrics
    const durations = completedTrades.filter(t => t.duration > 0).map(t => t.duration)
    if (durations.length > 0) {
      results.averageTradeDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
    }

    // Commission
    results.totalCommission = completedTrades.reduce((sum, t) => sum + t.commission, 0)

    // Ending capital
    results.endingCapital = startingCapital + results.totalPnL

    // Calculate equity curve and drawdown
    results.calculateEquityCurve(completedTrades, startingCapital)

    return results
  }

  /**
   * Calculate equity curve and drawdown metrics
   */
  calculateEquityCurve(trades, startingCapital) {
    let runningCapital = startingCapital
    let peakCapital = startingCapital
    let maxDrawdown = 0
    let maxDrawdownPercent = 0

    this.equityCurve = [{ time: null, equity: startingCapital }]
    this.drawdownCurve = [{ time: null, drawdown: 0, drawdownPercent: 0 }]

    trades.forEach(trade => {
      runningCapital += trade.pnl

      // Update peak
      if (runningCapital > peakCapital) {
        peakCapital = runningCapital
      }

      // Calculate drawdown
      const drawdown = peakCapital - runningCapital
      const drawdownPercent = peakCapital > 0 ? (drawdown / peakCapital) * 100 : 0

      // Update max drawdown
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
      if (drawdownPercent > maxDrawdownPercent) {
        maxDrawdownPercent = drawdownPercent
      }

      this.equityCurve.push({
        time: trade.exitTime,
        equity: runningCapital
      })

      this.drawdownCurve.push({
        time: trade.exitTime,
        drawdown: drawdown,
        drawdownPercent: drawdownPercent
      })
    })

    this.maxDrawdown = maxDrawdown
    this.maxDrawdownPercent = maxDrawdownPercent
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      winRate: this.winRate,
      totalPnL: this.totalPnL,
      totalPnLPercent: this.totalPnLPercent,
      averagePnL: this.averagePnL,
      averageWin: this.averageWin,
      averageLoss: this.averageLoss,
      largestWin: this.largestWin,
      largestLoss: this.largestLoss,
      profitFactor: this.profitFactor,
      sharpeRatio: this.sharpeRatio,
      maxDrawdown: this.maxDrawdown,
      maxDrawdownPercent: this.maxDrawdownPercent,
      averageTradeDuration: this.averageTradeDuration,
      totalCommission: this.totalCommission,
      startingCapital: this.startingCapital,
      endingCapital: this.endingCapital,
      equityCurve: this.equityCurve,
      drawdownCurve: this.drawdownCurve
    }
  }
}

/**
 * Represents a backtest instance
 */
export class BacktestInstance {
  constructor(data = {}) {
    this.id = data.id || uuidv4()
    this.definitionId = data.definitionId || null
    this.name = data.name || ''
    this.symbol = data.symbol || ''
    this.algorithmName = data.algorithmName || ''
    this.startDate = data.startDate || null
    this.endDate = data.endDate || null
    this.status = data.status || BacktestStatus.CREATED
    this.progress = data.progress || 0
    this.createdAt = data.createdAt || new Date().toISOString()
    this.startedAt = data.startedAt || null
    this.completedAt = data.completedAt || null
    this.lagTicks = data.lagTicks || 1
    this.startingCapital = data.startingCapital || 10000
    this.commission = data.commission || 0
    this.trades = (data.trades || []).map(t => new TradeRecord(t))
    this.results = data.results ? new BacktestResults(data.results) : null
    this.logs = data.logs || []
    this.error = data.error || null
  }

  /**
   * Start the backtest
   */
  start() {
    this.status = BacktestStatus.RUNNING
    this.startedAt = new Date().toISOString()
    this.progress = 0
    this.error = null
  }

  /**
   * Complete the backtest with results
   */
  complete(results) {
    this.status = BacktestStatus.COMPLETED
    this.completedAt = new Date().toISOString()
    this.progress = 100
    this.results = results instanceof BacktestResults ? results : new BacktestResults(results)
  }

  /**
   * Fail the backtest with error
   */
  fail(error) {
    this.status = BacktestStatus.FAILED
    this.completedAt = new Date().toISOString()
    this.error = error
  }

  /**
   * Stop the backtest
   */
  stop() {
    if (this.status === BacktestStatus.RUNNING) {
      this.status = BacktestStatus.STOPPED
      this.completedAt = new Date().toISOString()
    }
  }

  /**
   * Add a log message
   */
  addLog(level, message) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level: level,
      message: message
    })
  }

  /**
   * Add a trade record
   */
  addTrade(trade) {
    this.trades.push(trade instanceof TradeRecord ? trade : new TradeRecord(trade))
  }

  /**
   * Update progress
   */
  updateProgress(progress) {
    this.progress = Math.max(0, Math.min(100, progress))
  }

  /**
   * Check if backtest is running
   */
  isRunning() {
    return this.status === BacktestStatus.RUNNING
  }

  /**
   * Check if backtest is complete
   */
  isComplete() {
    return this.status === BacktestStatus.COMPLETED
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      symbol: this.symbol,
      algorithmName: this.algorithmName,
      startDate: this.startDate,
      endDate: this.endDate,
      status: this.status,
      progress: this.progress,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      lagTicks: this.lagTicks,
      startingCapital: this.startingCapital,
      commission: this.commission,
      trades: this.trades.map(t => t.toJSON()),
      results: this.results ? this.results.toJSON() : null,
      logs: this.logs,
      error: this.error
    }
  }

  /**
   * Create from JSON
   */
  static fromJSON(json) {
    return new BacktestInstance(json)
  }
}
