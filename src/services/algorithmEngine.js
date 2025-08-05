import { indicators } from './indicators.js'

/**
 * Algorithm Engine for processing trading algorithms and generating signals
 * Based on the C# AlgorithmEngine implementation
 */
export class AlgorithmEngine {
  /**
   * Calculate all indicators defined in the algorithm
   */
  static calculateIndicators(algorithm, tradingData) {
    try {
      for (const indicatorConfig of algorithm.indicators) {
        this.calculateIndicator(indicatorConfig, tradingData)
      }

      // Debug logging for indicators
      if (Object.keys(tradingData.indicators).length === 0) {
        console.log(`[AlgorithmEngine] Warning: No indicators calculated for ${algorithm.name} (data count: ${tradingData.count})`)
      }
    } catch (error) {
      console.error(`[AlgorithmEngine] Error calculating indicators for algorithm ${algorithm.name}: ${error.message}`)
      throw error
    }
  }

  /**
   * Calculate a single indicator
   */
  static calculateIndicator(config, tradingData) {
    try {
      switch (config.type.toUpperCase()) {
        case 'SMA':
          this.calculateSMA(config, tradingData)
          break
        case 'EMA':
          this.calculateEMA(config, tradingData)
          break
        case 'RSI':
          this.calculateRSI(config, tradingData)
          break
        case 'VWAP':
          this.calculateVWAP(config, tradingData)
          break
        case 'MACD':
          this.calculateMACD(config, tradingData)
          break
        case 'ATR':
          this.calculateATR(config, tradingData)
          break
        default:
          console.log(`[AlgorithmEngine] Unknown indicator type: ${config.type}`)
          break
      }
    } catch (error) {
      console.error(`[AlgorithmEngine] Error calculating indicator ${config.name} of type ${config.type}: ${error.message}`)
      throw error
    }
  }

  static calculateSMA(config, tradingData) {
    const period = this.getIntParameter(config.parameters, 'period', 20)
    const priceType = this.getStringParameter(config.parameters, 'priceType', 'median')
    const prices = this.getPriceArray(tradingData, priceType)
    const result = indicators.SMA(prices, period)
    tradingData.storeIndicator(config.name, result)
  }

  static calculateEMA(config, tradingData) {
    const period = this.getIntParameter(config.parameters, 'period', 20)
    const priceType = this.getStringParameter(config.parameters, 'priceType', 'median')
    const prices = this.getPriceArray(tradingData, priceType)
    const result = indicators.EMA(prices, period)
    tradingData.storeIndicator(config.name, result)
  }

  static calculateRSI(config, tradingData) {
    const period = this.getIntParameter(config.parameters, 'period', 14)
    const result = indicators.RSI(tradingData.close, period)
    tradingData.storeIndicator(config.name, result)
  }

  static calculateVWAP(config, tradingData) {
    const result = indicators.VWAP(tradingData.close, tradingData.volume)
    tradingData.storeIndicator(config.name, result)
  }

  static calculateMACD(config, tradingData) {
    const fastPeriod = this.getIntParameter(config.parameters, 'fastPeriod', 12)
    const slowPeriod = this.getIntParameter(config.parameters, 'slowPeriod', 26)
    const priceType = this.getStringParameter(config.parameters, 'priceType', 'close')
    const prices = this.getPriceArray(tradingData, priceType)
    const result = indicators.MACD(prices, fastPeriod, slowPeriod)
    tradingData.storeIndicator(config.name, result)
  }

  static calculateATR(config, tradingData) {
    const period = this.getIntParameter(config.parameters, 'period', 14)
    const result = indicators.ATR(tradingData.high, tradingData.low, tradingData.close, period)
    tradingData.storeIndicator(config.name, result)
  }

  /**
   * Evaluate entry conditions for a trading algorithm
   */
  static evaluateEntryConditions(algorithm, tradingData, index = 1) {
    try {
      // Check if we have enough data
      if (tradingData.count <= index) {
        return { longEntry: false, shortEntry: false, signal: '' }
      }

      // Use AND logic for entry conditions by default - all conditions must be met
      let allLongMet = true
      let allShortMet = true
      const signals = []

      for (const condition of algorithm.entryConditions) {
        const { conditionMet, side, conditionSignal } = this.evaluateCondition(condition, tradingData, index)

        if (!conditionMet) {
          // If any condition fails, entry is not possible
          allLongMet = false
          allShortMet = false
          break
        }

        // Check if this condition supports the required side
        if (side !== 'LONG' && side !== 'BOTH') {
          allLongMet = false
        }
        if (side !== 'SHORT' && side !== 'BOTH') {
          allShortMet = false
        }

        if (conditionSignal) {
          signals.push(conditionSignal)
        }
      }

      const longEntry = allLongMet && algorithm.entryConditions.length > 0
      const shortEntry = allShortMet && algorithm.entryConditions.length > 0
      const combinedSignal = signals.length > 0 ? signals.join(', ') : ''

      return { longEntry, shortEntry, signal: combinedSignal }
    } catch (error) {
      console.error(`[AlgorithmEngine] Error evaluating entry conditions for algorithm ${algorithm.name}: ${error.message}`)
      return { longEntry: false, shortEntry: false, signal: '' }
    }
  }

  /**
   * Evaluate exit conditions for a trading algorithm
   */
  static evaluateExitConditions(algorithm, tradingData, currentSide, entryPrice, currentPrice, currentPnLDollars, index = 1) {
    try {
      // Check if we have enough data
      if (tradingData.count <= index) {
        return { shouldExit: false, signal: '' }
      }

      // Evaluate each exit condition (any can trigger exit)
      for (const condition of algorithm.exitConditions) {
        let conditionMet, side, conditionSignal

        // Special handling for position-aware conditions
        if (condition.type.toLowerCase() === 'position-pnl') {
          ({ conditionMet, side, conditionSignal } = this.evaluatePositionPnLCondition(condition, currentPnLDollars, currentSide))
        } else {
          ({ conditionMet, side, conditionSignal } = this.evaluateCondition(condition, tradingData, index))
        }

        if (conditionMet && (side === currentSide || side === 'BOTH')) {
          return { shouldExit: true, signal: conditionSignal }
        }
      }

      return { shouldExit: false, signal: '' }
    } catch (error) {
      console.error(`[AlgorithmEngine] Error evaluating exit conditions for algorithm ${algorithm.name}: ${error.message}`)
      return { shouldExit: false, signal: '' }
    }
  }

  /**
   * Evaluate a single trading condition
   */
  static evaluateCondition(condition, tradingData, index) {
    try {
      switch (condition.type.toLowerCase()) {
        case 'threshold':
          return this.evaluateThresholdCondition(condition, tradingData, index)
        case 'crossover':
          return this.evaluateCrossoverCondition(condition, tradingData, index)
        case 'slope':
          return this.evaluateSlopeCondition(condition, tradingData, index)
        default:
          return { conditionMet: false, side: 'NONE', conditionSignal: '' }
      }
    } catch (error) {
      console.error(`[AlgorithmEngine] Error evaluating condition of type ${condition.type}: ${error.message}`)
      return { conditionMet: false, side: 'NONE', conditionSignal: '' }
    }
  }

  static evaluateThresholdCondition(condition, tradingData, index) {
    const indicatorName = this.getStringParameter(condition.parameters, 'indicator', '')
    const threshold = this.getDoubleParameter(condition.parameters, 'threshold', 0.0)
    const comparison = this.getStringParameter(condition.parameters, 'comparison', '>')

    if (!tradingData.indicators[indicatorName]) {
      return { conditionMet: false, side: 'NONE', conditionSignal: '' }
    }

    const indicatorValues = tradingData.indicators[indicatorName]
    if (indicatorValues.length <= index) {
      return { conditionMet: false, side: 'NONE', conditionSignal: '' }
    }

    const value = indicatorValues[indicatorValues.length - 1 - index]
    let met = false

    switch (comparison) {
      case '>':
        met = value > threshold
        break
      case '<':
        met = value < threshold
        break
      case '>=':
        met = value >= threshold
        break
      case '<=':
        met = value <= threshold
        break
    }

    const signal = met ? `${indicatorName}: ${value.toFixed(4)} ${comparison} ${threshold.toFixed(4)}` : ''
    return { conditionMet: met, side: condition.side, conditionSignal: signal }
  }

  static evaluateCrossoverCondition(condition, tradingData, index) {
    const indicator1 = this.getStringParameter(condition.parameters, 'indicator1', '')
    const indicator2 = this.getStringParameter(condition.parameters, 'indicator2', '')
    const direction = this.getStringParameter(condition.parameters, 'direction', 'above')

    if (!tradingData.indicators[indicator1] || !tradingData.indicators[indicator2]) {
      return { conditionMet: false, side: 'NONE', conditionSignal: '' }
    }

    const values1 = tradingData.indicators[indicator1]
    const values2 = tradingData.indicators[indicator2]

    if (values1.length <= index + 1 || values2.length <= index + 1) {
      return { conditionMet: false, side: 'NONE', conditionSignal: '' }
    }

    const current1 = values1[values1.length - 1 - index]
    const current2 = values2[values2.length - 1 - index]
    const previous1 = values1[values1.length - 1 - index - 1]
    const previous2 = values2[values2.length - 1 - index - 1]

    const crossedAbove = previous1 <= previous2 && current1 > current2
    const crossedBelow = previous1 >= previous2 && current1 < current2

    const met = direction === 'above' ? crossedAbove : crossedBelow
    const signal = met ? `${indicator1} crossed ${direction} ${indicator2}` : ''

    return { conditionMet: met, side: condition.side, conditionSignal: signal }
  }

  static evaluatePositionPnLCondition(condition, currentPnLDollars, currentSide) {
    const threshold = this.getDoubleParameter(condition.parameters, 'threshold', 0.0)
    const comparison = this.getStringParameter(condition.parameters, 'comparison', '>')

    let met = false
    switch (comparison) {
      case '>':
        met = currentPnLDollars > threshold
        break
      case '<':
        met = currentPnLDollars < threshold
        break
    }

    const signal = met ? `P&L: $${currentPnLDollars.toFixed(2)} ${comparison} $${threshold.toFixed(2)}` : ''
    return { conditionMet: met, side: currentSide, conditionSignal: signal }
  }

  /**
   * Gets price array based on price type parameter
   */
  static getPriceArray(tradingData, priceType) {
    switch (priceType.toLowerCase()) {
      case 'close':
        return tradingData.close
      case 'median':
        return this.calculateMedianPrices(tradingData)
      case 'typical':
        return this.calculateTypicalPrices(tradingData)
      case 'weighted':
        return this.calculateWeightedPrices(tradingData)
      default:
        return tradingData.close
    }
  }

  static calculateMedianPrices(tradingData) {
    const result = []
    for (let i = 0; i < tradingData.high.length; i++) {
      result[i] = (tradingData.high[i] + tradingData.low[i]) / 2.0
    }
    return result
  }

  static calculateTypicalPrices(tradingData) {
    const result = []
    for (let i = 0; i < tradingData.high.length; i++) {
      result[i] = (tradingData.high[i] + tradingData.low[i] + tradingData.close[i]) / 3.0
    }
    return result
  }

  static calculateWeightedPrices(tradingData) {
    const result = []
    for (let i = 0; i < tradingData.high.length; i++) {
      result[i] = (tradingData.high[i] + tradingData.low[i] + tradingData.close[i] + tradingData.close[i]) / 4.0
    }
    return result
  }

  // Helper methods for parameter extraction
  static getIntParameter(parameters, key, defaultValue) {
    const value = parameters[key]
    if (value !== undefined) {
      const parsed = parseInt(value)
      if (!isNaN(parsed)) return parsed
    }
    return defaultValue
  }

  static getDoubleParameter(parameters, key, defaultValue) {
    const value = parameters[key]
    if (value !== undefined) {
      const parsed = parseFloat(value)
      if (!isNaN(parsed)) return parsed
    }
    return defaultValue
  }

  static getStringParameter(parameters, key, defaultValue) {
    const value = parameters[key]
    return value !== undefined ? String(value) : defaultValue
  }

  static getBoolParameter(parameters, key, defaultValue) {
    const value = parameters[key]
    if (value !== undefined) {
      if (typeof value === 'boolean') return value
      const str = String(value).toLowerCase()
      if (str === 'true') return true
      if (str === 'false') return false
    }
    return defaultValue
  }
}
