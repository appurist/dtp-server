/**
 * Algorithm Engine - JavaScript port of C# AlgorithmEngine
 * Processes trading algorithms and generates trading signals
 */

import { TradingData } from '../models/TradingData.js'
import { TradingAlgorithm, TradingSides, ConditionTypes } from '../models/TradingAlgorithm.js'
import * as indicators from './indicators.js'

/**
 * Trading signal object
 */
export class TradingSignal {
  constructor(data = {}) {
    this.timestamp = data.timestamp || new Date().toISOString()
    this.type = data.type || 'ENTRY' // ENTRY or EXIT
    this.side = data.side || 'LONG' // LONG or SHORT
    this.price = data.price || 0
    this.confidence = data.confidence || 0
    this.conditions = data.conditions || []
    this.indicators = data.indicators || {}
  }
}

/**
 * Algorithm Engine class
 */
export class AlgorithmEngine {
  constructor() {
    this.algorithm = null
    this.tradingData = null
    this.currentPosition = TradingSides.NONE
    this.lastSignal = null
    this.debugMode = false
    this.entryPrice = 0
    this.positionQuantity = 1
  }

  /**
   * Load a trading algorithm
   */
  loadAlgorithm(algorithm) {
    if (algorithm instanceof TradingAlgorithm) {
      this.algorithm = algorithm
    } else {
      this.algorithm = TradingAlgorithm.fromJSON(algorithm)
    }

    console.log(`Algorithm loaded: ${this.algorithm.name}`)
    return true
  }

  /**
   * Set trading data
   */
  setTradingData(tradingData) {
    if (tradingData instanceof TradingData) {
      this.tradingData = tradingData
    } else {
      this.tradingData = TradingData.fromJSON(tradingData)
    }

    // Calculate all indicators when data is set
    if (this.algorithm) {
      this.calculateIndicators()
    }
  }

  /**
   * Set current position
   */
  setCurrentPosition(position) {
    this.currentPosition = position || TradingSides.NONE
  }

  /**
   * Set position details for P&L calculations
   */
  setPositionDetails(entryPrice, quantity = 1) {
    this.entryPrice = entryPrice || 0
    this.positionQuantity = quantity
  }

  /**
   * Reset the engine state
   */
  reset() {
    this.currentPosition = TradingSides.NONE
    this.lastSignal = null
  }

  /**
   * Calculate all indicators defined in the algorithm
   */
  calculateIndicators() {
    if (!this.algorithm || !this.tradingData) {
      console.warn('Algorithm or trading data not loaded')
      return
    }

    try {
      this.algorithm.indicators.forEach(indicatorConfig => {
        this.calculateIndicator(indicatorConfig)
      })

      if (this.debugMode) {
        console.log(`Calculated ${this.algorithm.indicators.length} indicators for ${this.algorithm.name}`)
        console.log('Available indicators:', this.tradingData.getIndicatorNames())
      }
    } catch (error) {
      console.error(`Error calculating indicators for algorithm ${this.algorithm.name}:`, error)
      throw error
    }
  }

  /**
   * Check if the slope direction has changed at a specific index
   * @param {string} name - The name of the indicator
   * @param {number} index - The index at which to check slope change
   * @returns {boolean} True if slope direction has changed
   */
  checkSlopeChange(name, index) {
    if (!this.tradingData || index < 2) {
      return false;
    }

    const values = this.tradingData.getIndicator(name);
    if (!values || values.length < 3) {
      return false;
    }

    const currentSlope = values[index] - values[index - 1];
    const previousSlope = values[index - 1] - values[index - 2];

    // True if slopes have different signs (direction change)
    return (currentSlope * previousSlope) < 0;
  }

  /**
   * Get indicator value at a specific index
   * @param {string} name - The name of the indicator
   * @param {number} index - The index at which to get the value
   * @returns {number|null} The indicator value or null if not found
   */
  getIndicatorValue(name, index) {
    if (!this.tradingData) {
      console.warn('Trading data not loaded');
      return null;
    }
    
    if (!this.tradingData.hasIndicator(name)) {
      console.warn(`Indicator ${name} not found`);
      return null;
    }
    
    const values = this.tradingData.getIndicator(name);
    return values[index];
  }

  /**
   * Calculate a single indicator
   */
  calculateIndicator(config) {
    const { name, type, parameters } = config

    try {
      let values = []

      switch (type.toUpperCase()) {
        case 'SMA':
          values = indicators.calculateSMA(
            this.tradingData.getPriceData(parameters.source || 'close'),
            parameters.period
          )
          break

        case 'EMA':
          values = indicators.calculateEMA(
            this.tradingData.getPriceData(parameters.source || 'close'),
            parameters.period
          )
          break

        case 'RSI':
          values = indicators.calculateRSI(
            this.tradingData.getPriceData(parameters.source || 'close'),
            parameters.period || 14
          )
          break

        case 'MACD':
          const macdResult = indicators.calculateMACD(
            this.tradingData.getPriceData(parameters.source || 'close'),
            parameters.fastPeriod || 12,
            parameters.slowPeriod || 26,
            parameters.signalPeriod || 9
          )
          values = macdResult.macd
          // Also store signal and histogram
          this.tradingData.setIndicator(`${name}_Signal`, macdResult.signal)
          this.tradingData.setIndicator(`${name}_Histogram`, macdResult.histogram)
          break

        case 'MACDSIGNAL':
          // This should be calculated as part of MACD
          const baseMACD = parameters.source || name.replace('_Signal', '')
          if (this.tradingData.hasIndicator(`${baseMACD}_Signal`)) {
            values = this.tradingData.getIndicator(`${baseMACD}_Signal`)
          }
          break

        case 'MACDHISTOGRAM':
          // This should be calculated as part of MACD
          const baseMACDHist = parameters.source || name.replace('_Histogram', '')
          if (this.tradingData.hasIndicator(`${baseMACDHist}_Histogram`)) {
            values = this.tradingData.getIndicator(`${baseMACDHist}_Histogram`)
          }
          break

        case 'STOCHASTICK':
          values = indicators.calculateStochasticK(
            this.tradingData.highs,
            this.tradingData.lows,
            this.tradingData.closes,
            parameters.period || 14
          )
          break

        case 'STOCHASTICD':
          const stochK = this.tradingData.getIndicator(parameters.source || 'StochasticK')
          values = indicators.calculateStochasticD(stochK, parameters.period || 3)
          break

        case 'ATR':
          values = indicators.calculateATR(
            this.tradingData.highs,
            this.tradingData.lows,
            this.tradingData.closes,
            parameters.period || 14
          )
          break

        case 'VWAP':
          values = indicators.calculateVWAP(
            this.tradingData.highs,
            this.tradingData.lows,
            this.tradingData.closes,
            this.tradingData.volumes
          )
          break

        case 'MFI':
          values = indicators.calculateMFI(
            this.tradingData.highs,
            this.tradingData.lows,
            this.tradingData.closes,
            this.tradingData.volumes,
            parameters.period || 14
          )
          break

        case 'SD':
          values = indicators.calculateSD(
            this.tradingData.getPriceData(parameters.source || 'close'),
            parameters.period
          )
          break

        case 'PO':
          values = indicators.calculatePO(
            this.tradingData.getPriceData(parameters.source || 'close'),
            parameters.fastPeriod,
            parameters.slowPeriod
          )
          break

        case 'SLOPE':
          const sourceData = parameters.source ?
            this.tradingData.getIndicator(parameters.source) :
            this.tradingData.getPriceData('close')
          values = indicators.calculateSlope(sourceData, parameters.period || 5)
          break

        case 'DIFFERENCE':
          const data1 = this.tradingData.getIndicator(parameters.source1)
          const data2 = this.tradingData.getIndicator(parameters.source2)
          values = indicators.calculateDifference(data1, data2)
          break

        case 'STRENGTH':
          values = indicators.calculateStrength(
            this.tradingData.getPriceData(parameters.source || 'close'),
            parameters.period || 14
          )
          break

        default:
          console.warn(`Unknown indicator type: ${type}`)
          return
      }

      // Store the calculated values
      this.tradingData.setIndicator(name, values)

      if (this.debugMode) {
        console.log(`Calculated ${name} (${type}): ${values.length} values`)
      }

    } catch (error) {
      console.error(`Error calculating indicator ${name} (${type}):`, error)
      throw error
    }
  }

  /**
   * Process the algorithm and generate signals
   */
  processAlgorithm(currentIndex = null) {
    if (!this.algorithm || !this.tradingData) {
      console.warn('Algorithm or trading data not loaded')
      return null
    }

    const index = currentIndex !== null ? currentIndex : this.tradingData.count - 1

    if (index < 0 || index >= this.tradingData.count) {
      return null
    }

    // Check entry conditions if we don't have a position
    if (this.currentPosition === TradingSides.NONE) {
      const entrySignal = this.evaluateEntryConditions(index)
      if (entrySignal) {
        this.lastSignal = entrySignal
        return entrySignal
      }
    }

    // Check exit conditions if we have a position
    if (this.currentPosition !== TradingSides.NONE) {
      const exitSignal = this.evaluateExitConditions(index)
      if (exitSignal) {
        this.lastSignal = exitSignal
        return exitSignal
      }
    }

    return null
  }

  /**
   * Evaluate entry conditions
   */
  evaluateEntryConditions(index) {
    if (!this.algorithm.entryConditions || this.algorithm.entryConditions.length === 0) {
      return null
    }

    const longConditions = []
    const shortConditions = []

    // Evaluate each condition
    for (const condition of this.algorithm.entryConditions) {
      const result = this.evaluateCondition(condition, index)

      if (result.long) {
        longConditions.push({ condition, result: true })
      }
      if (result.short) {
        shortConditions.push({ condition, result: true })
      }
    }

    // Check if all conditions are met for LONG
    const longConditionsNeeded = this.algorithm.entryConditions.filter(c =>
      c.side === TradingSides.LONG || c.side === TradingSides.BOTH
    ).length

    if (longConditions.length === longConditionsNeeded && longConditionsNeeded > 0) {
      return new TradingSignal({
        type: 'ENTRY',
        side: TradingSides.LONG,
        price: this.tradingData.closes[index],
        timestamp: new Date(this.tradingData.timestamps[index] * 1000).toISOString(),
        conditions: longConditions,
        indicators: this.getCurrentIndicatorValues(index)
      })
    }

    // Check if all conditions are met for SHORT
    const shortConditionsNeeded = this.algorithm.entryConditions.filter(c =>
      c.side === TradingSides.SHORT || c.side === TradingSides.BOTH
    ).length

    if (shortConditions.length === shortConditionsNeeded && shortConditionsNeeded > 0) {
      return new TradingSignal({
        type: 'ENTRY',
        side: TradingSides.SHORT,
        price: this.tradingData.closes[index],
        timestamp: new Date(this.tradingData.timestamps[index] * 1000).toISOString(),
        conditions: shortConditions,
        indicators: this.getCurrentIndicatorValues(index)
      })
    }

    return null
  }

  /**
   * Evaluate exit conditions
   */
  evaluateExitConditions(index) {
    if (!this.algorithm.exitConditions || this.algorithm.exitConditions.length === 0) {
      return null
    }

    // For exit conditions, ANY condition being true triggers an exit
    for (const condition of this.algorithm.exitConditions) {
      const result = this.evaluateCondition(condition, index)

      // Check if condition applies to current position
      const appliesToPosition = condition.side === TradingSides.BOTH ||
                               condition.side === this.currentPosition

      if (appliesToPosition && (result.long || result.short)) {
        return new TradingSignal({
          type: 'EXIT',
          side: this.currentPosition,
          price: this.tradingData.closes[index],
          timestamp: new Date(this.tradingData.timestamps[index] * 1000).toISOString(),
          conditions: [{ condition, result: true }],
          indicators: this.getCurrentIndicatorValues(index)
        })
      }
    }

    return null
  }

  /**
   * Evaluate a single condition
   */
  evaluateCondition(condition, index) {
    const result = { long: false, short: false }

    try {
      switch (condition.type.toLowerCase()) {
        case ConditionTypes.THRESHOLD:
          return this.evaluateThresholdCondition(condition, index)

        case ConditionTypes.CROSSOVER:
          return this.evaluateCrossoverCondition(condition, index)

        case ConditionTypes.SLOPE:
          return this.evaluateSlopeCondition(condition, index)

        case 'position-pnl':
          return this.evaluatePositionPnLCondition(condition, index)

        default:
          console.warn(`Unknown condition type: ${condition.type}`)
          return result
      }
    } catch (error) {
      console.error(`Error evaluating condition:`, error)
      return result
    }
  }

  /**
   * Get current indicator values at index
   */
  getCurrentIndicatorValues(index) {
    const values = {}

    for (const indicatorName of this.tradingData.getIndicatorNames()) {
      values[indicatorName] = this.tradingData.getIndicatorValue(indicatorName, index)
    }

    return values
  }

  /**
   * Evaluate threshold condition
   */
  evaluateThresholdCondition(condition, index) {
    const { indicator, threshold, comparison } = condition.parameters
    const result = { long: false, short: false }

    const indicatorValue = this.tradingData.getIndicatorValue(indicator, index)
    if (indicatorValue === null || indicatorValue === undefined) {
      return result
    }

    let conditionMet = false
    switch (comparison) {
      case '>':
        conditionMet = indicatorValue > threshold
        break
      case '<':
        conditionMet = indicatorValue < threshold
        break
      case '>=':
        conditionMet = indicatorValue >= threshold
        break
      case '<=':
        conditionMet = indicatorValue <= threshold
        break
      case '==':
        conditionMet = Math.abs(indicatorValue - threshold) < 0.0001
        break
      case '!=':
        conditionMet = Math.abs(indicatorValue - threshold) >= 0.0001
        break
    }

    if (conditionMet) {
      if (condition.side === TradingSides.LONG || condition.side === TradingSides.BOTH) {
        result.long = true
      }
      if (condition.side === TradingSides.SHORT || condition.side === TradingSides.BOTH) {
        result.short = condition.symmetric ? !result.long : true
      }
    }

    return result
  }

  /**
   * Evaluate crossover condition
   */
  evaluateCrossoverCondition(condition, index) {
    const { indicator1, indicator2, direction } = condition.parameters
    const result = { long: false, short: false }

    if (index < 1) return result // Need at least 2 data points

    const current1 = this.tradingData.getIndicatorValue(indicator1, index)
    const current2 = this.tradingData.getIndicatorValue(indicator2, index)
    const previous1 = this.tradingData.getIndicatorValue(indicator1, index - 1)
    const previous2 = this.tradingData.getIndicatorValue(indicator2, index - 1)

    if (current1 === null || current2 === null || previous1 === null || previous2 === null) {
      return result
    }

    const crossedAbove = previous1 <= previous2 && current1 > current2
    const crossedBelow = previous1 >= previous2 && current1 < current2

    if (direction === 'above' && crossedAbove) {
      if (condition.side === TradingSides.LONG || condition.side === TradingSides.BOTH) {
        result.long = true
      }
      if (condition.symmetric && (condition.side === TradingSides.SHORT || condition.side === TradingSides.BOTH)) {
        result.short = false
      }
    } else if (direction === 'below' && crossedBelow) {
      if (condition.side === TradingSides.SHORT || condition.side === TradingSides.BOTH) {
        result.short = true
      }
      if (condition.symmetric && (condition.side === TradingSides.LONG || condition.side === TradingSides.BOTH)) {
        result.long = false
      }
    }

    // Handle symmetric conditions
    if (condition.symmetric) {
      if (direction === 'above' && crossedBelow) {
        result.short = true
        result.long = false
      } else if (direction === 'below' && crossedAbove) {
        result.long = true
        result.short = false
      }
    }

    return result
  }

  /**
   * Evaluate slope condition
   */
  evaluateSlopeCondition(condition, index) {
    const { indicator, direction, threshold = 0 } = condition.parameters
    const result = { long: false, short: false }

    const indicatorValue = this.tradingData.getIndicatorValue(indicator, index)
    if (indicatorValue === null || indicatorValue === undefined) {
      return result
    }

    let conditionMet = false
    if (direction === 'up') {
      conditionMet = indicatorValue > threshold
    } else if (direction === 'down') {
      conditionMet = indicatorValue < threshold
    }

    if (conditionMet) {
      if (condition.side === TradingSides.LONG || condition.side === TradingSides.BOTH) {
        result.long = direction === 'up'
      }
      if (condition.side === TradingSides.SHORT || condition.side === TradingSides.BOTH) {
        result.short = condition.symmetric ? direction === 'down' : (direction === 'down')
      }
    }

    return result
  }

  /**
   * Evaluate position P&L condition (for stop-loss and take-profit)
   */
  evaluatePositionPnLCondition(condition, index) {
    const { threshold, comparison } = condition.parameters
    const result = { long: false, short: false }

    // Only evaluate if we have a current position
    if (this.currentPosition === TradingSides.NONE) {
      return result
    }

    // Calculate current P&L for the position
    const currentPrice = this.tradingData.closes[index]
    const entryPrice = this.entryPrice || 0

    if (entryPrice === 0) {
      return result
    }

    // Calculate P&L based on position side
    let pnl = 0
    if (this.currentPosition === TradingSides.LONG) {
      pnl = (currentPrice - entryPrice) * this.positionQuantity
    } else if (this.currentPosition === TradingSides.SHORT) {
      pnl = (entryPrice - currentPrice) * this.positionQuantity
    }

    // Apply comparison
    let conditionMet = false
    switch (comparison) {
      case '>':
        conditionMet = pnl > threshold
        break
      case '<':
        conditionMet = pnl < threshold
        break
      case '>=':
        conditionMet = pnl >= threshold
        break
      case '<=':
        conditionMet = pnl <= threshold
        break
      case '==':
        conditionMet = Math.abs(pnl - threshold) < 0.01
        break
      case '!=':
        conditionMet = Math.abs(pnl - threshold) >= 0.01
        break
    }

    // If condition is met, trigger exit for current position
    if (conditionMet) {
      if (this.currentPosition === TradingSides.LONG) {
        result.long = true
      } else if (this.currentPosition === TradingSides.SHORT) {
        result.short = true
      }
    }

    return result
  }
}
