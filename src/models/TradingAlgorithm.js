/**
 * Trading Algorithm Models - JavaScript port of C# TradingAlgorithm models
 */

/**
 * Represents a complete trading algorithm configuration
 */
export class TradingAlgorithm {
  constructor(data = {}) {
    this.name = data.name || ''
    this.description = data.description || ''
    this.indicators = (data.indicators || []).map(i => new IndicatorConfig(i))
    this.entryConditions = (data.entryConditions || []).map(c => new TradingCondition(c))
    this.exitConditions = (data.exitConditions || []).map(c => new TradingCondition(c))
    this.version = data.version || '1.0'
    this.createdTime = data.createdTime || new Date().toISOString()
    this.lastModifiedTime = data.lastModifiedTime || new Date().toISOString()
    this.favorite = data.favorite || false
  }

  /**
   * Create a deep clone of this algorithm
   */
  clone() {
    return new TradingAlgorithm(JSON.parse(JSON.stringify(this)))
  }

  /**
   * Convert to JSON for storage/transmission
   */
  toJSON() {
    return {
      name: this.name,
      description: this.description,
      indicators: this.indicators.map(i => i.toJSON()),
      entryConditions: this.entryConditions.map(c => c.toJSON()),
      exitConditions: this.exitConditions.map(c => c.toJSON()),
      version: this.version,
      createdTime: this.createdTime,
      lastModifiedTime: this.lastModifiedTime,
      favorite: this.favorite
    }
  }

  /**
   * Create from JSON data
   */
  static fromJSON(json) {
    return new TradingAlgorithm(json)
  }

  /**
   * Validate the algorithm configuration
   */
  validate() {
    const errors = []

    if (!this.name || this.name.trim() === '') {
      errors.push('Algorithm name is required')
    }

    if (this.indicators.length === 0) {
      errors.push('At least one indicator is required')
    }

    if (this.entryConditions.length === 0) {
      errors.push('At least one entry condition is required')
    }

    // Validate indicators
    this.indicators.forEach((indicator, index) => {
      const indicatorErrors = indicator.validate()
      indicatorErrors.forEach(error => {
        errors.push(`Indicator ${index + 1}: ${error}`)
      })
    })

    // Validate conditions
    this.entryConditions.forEach((condition, index) => {
      const conditionErrors = condition.validate()
      conditionErrors.forEach(error => {
        errors.push(`Entry condition ${index + 1}: ${error}`)
      })
    })

    this.exitConditions.forEach((condition, index) => {
      const conditionErrors = condition.validate()
      conditionErrors.forEach(error => {
        errors.push(`Exit condition ${index + 1}: ${error}`)
      })
    })

    return errors
  }
}

/**
 * Configuration for a single indicator
 */
export class IndicatorConfig {
  constructor(data = {}) {
    this.name = data.name || ''
    this.type = data.type || ''
    this.parameters = { ...data.parameters } || {}
    this.description = data.description || ''
  }

  /**
   * Convert to JSON for storage/transmission
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      parameters: this.parameters,
      description: this.description
    }
  }

  /**
   * Validate the indicator configuration
   */
  validate() {
    const errors = []

    if (!this.name || this.name.trim() === '') {
      errors.push('Indicator name is required')
    }

    if (!this.type || this.type.trim() === '') {
      errors.push('Indicator type is required')
    }

    // Validate type-specific parameters
    switch (this.type.toUpperCase()) {
      case 'SMA':
      case 'EMA':
        if (!this.parameters.period || this.parameters.period < 1) {
          errors.push('Period must be greater than 0')
        }
        break
      case 'RSI':
        if (!this.parameters.period || this.parameters.period < 1) {
          errors.push('Period must be greater than 0')
        }
        break
      case 'MACD':
        if (!this.parameters.fastPeriod || this.parameters.fastPeriod < 1) {
          errors.push('Fast period must be greater than 0')
        }
        if (!this.parameters.slowPeriod || this.parameters.slowPeriod < 1) {
          errors.push('Slow period must be greater than 0')
        }
        if (!this.parameters.signalPeriod || this.parameters.signalPeriod < 1) {
          errors.push('Signal period must be greater than 0')
        }
        break
    }

    return errors
  }
}

/**
 * Represents a trading condition/test
 */
export class TradingCondition {
  constructor(data = {}) {
    this.description = data.description || ''
    this.type = data.type || ''
    this.side = data.side || 'BOTH'
    this.symmetric = data.symmetric || false
    this.parameters = { ...data.parameters } || {}
    this.logicalOperator = data.logicalOperator || 'AND'
  }

  /**
   * Convert to JSON for storage/transmission
   */
  toJSON() {
    return {
      description: this.description,
      type: this.type,
      side: this.side,
      symmetric: this.symmetric,
      parameters: this.parameters,
      logicalOperator: this.logicalOperator
    }
  }

  /**
   * Validate the trading condition
   */
  validate() {
    const errors = []

    if (!this.type || this.type.trim() === '') {
      errors.push('Condition type is required')
    }

    if (!['LONG', 'SHORT', 'BOTH'].includes(this.side)) {
      errors.push('Side must be LONG, SHORT, or BOTH')
    }

    // Validate type-specific parameters
    switch (this.type.toLowerCase()) {
      case 'threshold':
        if (!this.parameters.indicator) {
          errors.push('Indicator name is required for threshold condition')
        }
        if (this.parameters.threshold === undefined || this.parameters.threshold === null) {
          errors.push('Threshold value is required')
        }
        if (!this.parameters.comparison || !['>', '<', '>=', '<=', '==', '!='].includes(this.parameters.comparison)) {
          errors.push('Valid comparison operator is required (>, <, >=, <=, ==, !=)')
        }
        break
      case 'crossover':
        if (!this.parameters.indicator1) {
          errors.push('First indicator is required for crossover condition')
        }
        if (!this.parameters.indicator2) {
          errors.push('Second indicator is required for crossover condition')
        }
        if (!this.parameters.direction || !['above', 'below'].includes(this.parameters.direction)) {
          errors.push('Direction must be "above" or "below"')
        }
        break
      case 'slope':
        if (!this.parameters.indicator) {
          errors.push('Indicator name is required for slope condition')
        }
        if (!this.parameters.direction || !['up', 'down'].includes(this.parameters.direction)) {
          errors.push('Direction must be "up" or "down"')
        }
        break
      case 'position-pnl':
        if (this.parameters.threshold === undefined || this.parameters.threshold === null) {
          errors.push('Threshold value is required for position-pnl condition')
        }
        if (!this.parameters.comparison || !['>', '<', '>=', '<=', '==', '!='].includes(this.parameters.comparison)) {
          errors.push('Valid comparison operator is required for position-pnl condition (>, <, >=, <=, ==, !=)')
        }
        break
    }

    return errors
  }
}

/**
 * Trading sides enumeration
 */
export const TradingSides = {
  LONG: 'LONG',
  SHORT: 'SHORT',
  BOTH: 'BOTH',
  NONE: 'NONE'
}

/**
 * Condition types enumeration
 */
export const ConditionTypes = {
  THRESHOLD: 'threshold',
  CROSSOVER: 'crossover',
  SLOPE: 'slope',
  DIRECTION: 'direction',
  STRENGTH: 'strength',
  POSITION_PNL: 'position-pnl'
}

/**
 * Indicator types enumeration
 */
export const IndicatorTypes = {
  SMA: 'SMA',
  EMA: 'EMA',
  RSI: 'RSI',
  MACD: 'MACD',
  MACD_SIGNAL: 'MACDSignal',
  MACD_HISTOGRAM: 'MACDHistogram',
  STOCHASTIC_K: 'StochasticK',
  STOCHASTIC_D: 'StochasticD',
  ATR: 'ATR',
  VWAP: 'VWAP',
  MFI: 'MFI',
  SD: 'SD',
  PO: 'PO',
  SLOPE: 'Slope',
  DIFFERENCE: 'Difference',
  STRENGTH: 'Strength'
}

/**
 * Logical operators for combining conditions
 */
export const LogicalOperators = {
  AND: 'AND',
  OR: 'OR'
}
