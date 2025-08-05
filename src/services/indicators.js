/**
 * Technical Indicators Library
 * JavaScript implementation of common trading indicators
 */
export const indicators = {
  /**
   * Simple Moving Average
   */
  SMA(prices, period) {
    const result = new Array(prices.length).fill(NaN)
    
    for (let i = period - 1; i < prices.length; i++) {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += prices[i - j]
      }
      result[i] = sum / period
    }
    
    return result
  },

  /**
   * Exponential Moving Average
   */
  EMA(prices, period) {
    const result = new Array(prices.length).fill(NaN)
    const multiplier = 2 / (period + 1)
    
    // Start with SMA for the first value
    let sum = 0
    for (let i = 0; i < period; i++) {
      sum += prices[i]
    }
    result[period - 1] = sum / period
    
    // Calculate EMA for remaining values
    for (let i = period; i < prices.length; i++) {
      result[i] = (prices[i] * multiplier) + (result[i - 1] * (1 - multiplier))
    }
    
    return result
  },

  /**
   * Relative Strength Index
   */
  RSI(prices, period) {
    const result = new Array(prices.length).fill(NaN)
    const gains = []
    const losses = []
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? -change : 0)
    }
    
    // Calculate initial average gain and loss
    let avgGain = 0
    let avgLoss = 0
    for (let i = 0; i < period; i++) {
      avgGain += gains[i]
      avgLoss += losses[i]
    }
    avgGain /= period
    avgLoss /= period
    
    // Calculate RSI
    for (let i = period; i < prices.length; i++) {
      if (avgLoss === 0) {
        result[i] = 100
      } else {
        const rs = avgGain / avgLoss
        result[i] = 100 - (100 / (1 + rs))
      }
      
      // Update averages for next iteration
      if (i < gains.length) {
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period
      }
    }
    
    return result
  },

  /**
   * Volume Weighted Average Price
   */
  VWAP(prices, volumes) {
    const result = new Array(prices.length).fill(NaN)
    let cumulativeVolume = 0
    let cumulativePriceVolume = 0
    
    for (let i = 0; i < prices.length; i++) {
      cumulativeVolume += volumes[i]
      cumulativePriceVolume += prices[i] * volumes[i]
      
      if (cumulativeVolume > 0) {
        result[i] = cumulativePriceVolume / cumulativeVolume
      }
    }
    
    return result
  },

  /**
   * Moving Average Convergence Divergence
   */
  MACD(prices, fastPeriod = 12, slowPeriod = 26) {
    const fastEMA = this.EMA(prices, fastPeriod)
    const slowEMA = this.EMA(prices, slowPeriod)
    const result = new Array(prices.length).fill(NaN)
    
    for (let i = 0; i < prices.length; i++) {
      if (!isNaN(fastEMA[i]) && !isNaN(slowEMA[i])) {
        result[i] = fastEMA[i] - slowEMA[i]
      }
    }
    
    return result
  },

  /**
   * Average True Range
   */
  ATR(high, low, close, period) {
    const result = new Array(high.length).fill(NaN)
    const trueRanges = []
    
    // Calculate True Range for each period
    for (let i = 1; i < high.length; i++) {
      const tr1 = high[i] - low[i]
      const tr2 = Math.abs(high[i] - close[i - 1])
      const tr3 = Math.abs(low[i] - close[i - 1])
      trueRanges.push(Math.max(tr1, tr2, tr3))
    }
    
    // Calculate initial ATR (simple average)
    if (trueRanges.length >= period) {
      let sum = 0
      for (let i = 0; i < period; i++) {
        sum += trueRanges[i]
      }
      result[period] = sum / period
      
      // Calculate subsequent ATR values using smoothing
      for (let i = period + 1; i < high.length; i++) {
        const prevATR = result[i - 1]
        const currentTR = trueRanges[i - 1]
        result[i] = ((prevATR * (period - 1)) + currentTR) / period
      }
    }
    
    return result
  },

  /**
   * Bollinger Bands
   */
  BollingerBands(prices, period = 20, stdDev = 2) {
    const sma = this.SMA(prices, period)
    const upperBand = new Array(prices.length).fill(NaN)
    const lowerBand = new Array(prices.length).fill(NaN)
    
    for (let i = period - 1; i < prices.length; i++) {
      // Calculate standard deviation
      let sum = 0
      for (let j = 0; j < period; j++) {
        const diff = prices[i - j] - sma[i]
        sum += diff * diff
      }
      const standardDeviation = Math.sqrt(sum / period)
      
      upperBand[i] = sma[i] + (standardDeviation * stdDev)
      lowerBand[i] = sma[i] - (standardDeviation * stdDev)
    }
    
    return {
      middle: sma,
      upper: upperBand,
      lower: lowerBand
    }
  },

  /**
   * Stochastic Oscillator %K
   */
  StochasticK(high, low, close, period = 14) {
    const result = new Array(close.length).fill(NaN)
    
    for (let i = period - 1; i < close.length; i++) {
      let highestHigh = high[i]
      let lowestLow = low[i]
      
      // Find highest high and lowest low in the period
      for (let j = 1; j < period; j++) {
        highestHigh = Math.max(highestHigh, high[i - j])
        lowestLow = Math.min(lowestLow, low[i - j])
      }
      
      if (highestHigh !== lowestLow) {
        result[i] = ((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100
      } else {
        result[i] = 50 // Avoid division by zero
      }
    }
    
    return result
  },

  /**
   * Stochastic Oscillator %D (smoothed %K)
   */
  StochasticD(high, low, close, kPeriod = 14, dPeriod = 3) {
    const kValues = this.StochasticK(high, low, close, kPeriod)
    return this.SMA(kValues, dPeriod)
  },

  /**
   * Money Flow Index
   */
  MFI(high, low, close, volume, period = 14) {
    const result = new Array(close.length).fill(NaN)
    const typicalPrices = []
    const moneyFlows = []
    
    // Calculate typical prices and money flows
    for (let i = 0; i < close.length; i++) {
      const typicalPrice = (high[i] + low[i] + close[i]) / 3
      typicalPrices.push(typicalPrice)
      
      if (i > 0) {
        const moneyFlow = typicalPrice * volume[i]
        moneyFlows.push({
          value: moneyFlow,
          isPositive: typicalPrice > typicalPrices[i - 1]
        })
      }
    }
    
    // Calculate MFI
    for (let i = period; i < close.length; i++) {
      let positiveFlow = 0
      let negativeFlow = 0
      
      for (let j = 0; j < period; j++) {
        const flow = moneyFlows[i - j - 1]
        if (flow.isPositive) {
          positiveFlow += flow.value
        } else {
          negativeFlow += flow.value
        }
      }
      
      if (negativeFlow === 0) {
        result[i] = 100
      } else {
        const moneyRatio = positiveFlow / negativeFlow
        result[i] = 100 - (100 / (1 + moneyRatio))
      }
    }
    
    return result
  },

  /**
   * Price Oscillator (Percentage)
   */
  PO(prices, shortPeriod = 12, longPeriod = 26) {
    const shortMA = this.EMA(prices, shortPeriod)
    const longMA = this.EMA(prices, longPeriod)
    const result = new Array(prices.length).fill(NaN)
    
    for (let i = 0; i < prices.length; i++) {
      if (!isNaN(shortMA[i]) && !isNaN(longMA[i]) && longMA[i] !== 0) {
        result[i] = ((shortMA[i] - longMA[i]) / longMA[i]) * 100
      }
    }
    
    return result
  },

  /**
   * Standard Deviation
   */
  SD(prices, period) {
    const result = new Array(prices.length).fill(NaN)
    const sma = this.SMA(prices, period)
    
    for (let i = period - 1; i < prices.length; i++) {
      let sum = 0
      for (let j = 0; j < period; j++) {
        const diff = prices[i - j] - sma[i]
        sum += diff * diff
      }
      result[i] = Math.sqrt(sum / period)
    }
    
    return result
  },

  /**
   * Slope calculation
   */
  Slope(values, lookback = 1) {
    const result = new Array(values.length).fill(NaN)
    
    for (let i = lookback; i < values.length; i++) {
      if (!isNaN(values[i]) && !isNaN(values[i - lookback])) {
        result[i] = values[i] - values[i - lookback]
      }
    }
    
    return result
  },

  /**
   * Direction calculation (trend direction based on threshold)
   */
  Direction(values, threshold = 0.01) {
    const result = new Array(values.length).fill(NaN)
    
    for (let i = 1; i < values.length; i++) {
      if (!isNaN(values[i]) && !isNaN(values[i - 1])) {
        const change = values[i] - values[i - 1]
        if (Math.abs(change) > threshold) {
          result[i] = change > 0 ? 1 : -1
        } else {
          result[i] = 0
        }
      }
    }
    
    return result
  }
}
