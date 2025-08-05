/**
 * Technical Indicators Service - JavaScript port of C# Indicators
 * Provides all technical analysis indicators for trading algorithms
 */

/**
 * Simple Moving Average
 */
export function calculateSMA(data, period) {
  if (!data || data.length < period) {
    return []
  }

  const result = []
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j]
    }
    result.push(sum / period)
  }

  return result
}

/**
 * Exponential Moving Average
 */
export function calculateEMA(data, period) {
  if (!data || data.length === 0) {
    return []
  }

  const result = []
  const multiplier = 2 / (period + 1)
  
  // First EMA value is SMA
  let sum = 0
  for (let i = 0; i < Math.min(period, data.length); i++) {
    sum += data[i]
  }
  result.push(sum / Math.min(period, data.length))

  // Calculate subsequent EMA values
  for (let i = 1; i < data.length; i++) {
    const ema = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier))
    result.push(ema)
  }

  return result
}

/**
 * Relative Strength Index
 */
export function calculateRSI(data, period = 14) {
  if (!data || data.length < period + 1) {
    return []
  }

  const gains = []
  const losses = []
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  const result = []
  
  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period
  
  // Calculate first RSI
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result.push(100 - (100 / (1 + rs)))

  // Calculate subsequent RSI values using smoothed averages
  for (let i = period; i < gains.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period
    
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(100 - (100 / (1 + rs)))
  }

  return result
}

/**
 * Moving Average Convergence Divergence
 */
export function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!data || data.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] }
  }

  const fastEMA = calculateEMA(data, fastPeriod)
  const slowEMA = calculateEMA(data, slowPeriod)
  
  // Calculate MACD line
  const macd = []
  const startIndex = slowPeriod - fastPeriod
  
  for (let i = startIndex; i < fastEMA.length; i++) {
    macd.push(fastEMA[i] - slowEMA[i - startIndex])
  }

  // Calculate signal line (EMA of MACD)
  const signal = calculateEMA(macd, signalPeriod)
  
  // Calculate histogram
  const histogram = []
  const signalStartIndex = macd.length - signal.length
  
  for (let i = 0; i < signal.length; i++) {
    histogram.push(macd[signalStartIndex + i] - signal[i])
  }

  return { macd, signal, histogram }
}

/**
 * Stochastic Oscillator %K
 */
export function calculateStochasticK(highs, lows, closes, period = 14) {
  if (!highs || !lows || !closes || highs.length < period) {
    return []
  }

  const result = []
  
  for (let i = period - 1; i < closes.length; i++) {
    let highestHigh = highs[i]
    let lowestLow = lows[i]
    
    // Find highest high and lowest low in the period
    for (let j = 1; j < period; j++) {
      if (highs[i - j] > highestHigh) highestHigh = highs[i - j]
      if (lows[i - j] < lowestLow) lowestLow = lows[i - j]
    }
    
    const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100
    result.push(k)
  }

  return result
}

/**
 * Stochastic Oscillator %D (SMA of %K)
 */
export function calculateStochasticD(stochasticK, period = 3) {
  return calculateSMA(stochasticK, period)
}

/**
 * Average True Range
 */
export function calculateATR(highs, lows, closes, period = 14) {
  if (!highs || !lows || !closes || highs.length < 2) {
    return []
  }

  const trueRanges = []
  
  // Calculate True Range for each period
  for (let i = 1; i < closes.length; i++) {
    const tr1 = highs[i] - lows[i]
    const tr2 = Math.abs(highs[i] - closes[i - 1])
    const tr3 = Math.abs(lows[i] - closes[i - 1])
    
    trueRanges.push(Math.max(tr1, tr2, tr3))
  }

  // Calculate ATR as SMA of True Ranges
  return calculateSMA(trueRanges, period)
}

/**
 * Volume Weighted Average Price
 */
export function calculateVWAP(highs, lows, closes, volumes) {
  if (!highs || !lows || !closes || !volumes || highs.length === 0) {
    return []
  }

  const result = []
  let cumulativeTPV = 0 // Typical Price * Volume
  let cumulativeVolume = 0
  
  for (let i = 0; i < closes.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3
    const tpv = typicalPrice * volumes[i]
    
    cumulativeTPV += tpv
    cumulativeVolume += volumes[i]
    
    const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice
    result.push(vwap)
  }

  return result
}

/**
 * Money Flow Index
 */
export function calculateMFI(highs, lows, closes, volumes, period = 14) {
  if (!highs || !lows || !closes || !volumes || closes.length < period + 1) {
    return []
  }

  const typicalPrices = []
  const rawMoneyFlows = []
  
  // Calculate typical prices and raw money flows
  for (let i = 0; i < closes.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3
    typicalPrices.push(typicalPrice)
    rawMoneyFlows.push(typicalPrice * volumes[i])
  }

  const result = []
  
  for (let i = period; i < closes.length; i++) {
    let positiveFlow = 0
    let negativeFlow = 0
    
    for (let j = 1; j <= period; j++) {
      const currentIdx = i - j + 1
      const prevIdx = currentIdx - 1
      
      if (typicalPrices[currentIdx] > typicalPrices[prevIdx]) {
        positiveFlow += rawMoneyFlows[currentIdx]
      } else if (typicalPrices[currentIdx] < typicalPrices[prevIdx]) {
        negativeFlow += rawMoneyFlows[currentIdx]
      }
    }
    
    const moneyFlowRatio = negativeFlow === 0 ? 100 : positiveFlow / negativeFlow
    const mfi = 100 - (100 / (1 + moneyFlowRatio))
    result.push(mfi)
  }

  return result
}

/**
 * Standard Deviation
 */
export function calculateSD(data, period) {
  if (!data || data.length < period) {
    return []
  }

  const sma = calculateSMA(data, period)
  const result = []
  
  for (let i = 0; i < sma.length; i++) {
    const dataIndex = i + period - 1
    let sumSquaredDiffs = 0
    
    for (let j = 0; j < period; j++) {
      const diff = data[dataIndex - j] - sma[i]
      sumSquaredDiffs += diff * diff
    }
    
    const variance = sumSquaredDiffs / period
    result.push(Math.sqrt(variance))
  }

  return result
}

/**
 * Price Oscillator (Percentage difference between two moving averages)
 */
export function calculatePO(data, fastPeriod, slowPeriod) {
  if (!data || data.length < slowPeriod) {
    return []
  }

  const fastMA = calculateSMA(data, fastPeriod)
  const slowMA = calculateSMA(data, slowPeriod)
  
  const result = []
  const startIndex = slowPeriod - fastPeriod
  
  for (let i = 0; i < slowMA.length; i++) {
    const fastValue = fastMA[startIndex + i]
    const slowValue = slowMA[i]
    
    if (slowValue !== 0) {
      const po = ((fastValue - slowValue) / slowValue) * 100
      result.push(po)
    } else {
      result.push(0)
    }
  }

  return result
}

/**
 * Slope calculation (rate of change over specified period)
 */
export function calculateSlope(data, period = 5) {
  if (!data || data.length < period) {
    return []
  }

  const result = []
  
  for (let i = period - 1; i < data.length; i++) {
    const oldValue = data[i - period + 1]
    const newValue = data[i]
    const slope = newValue - oldValue
    result.push(slope)
  }

  return result
}

/**
 * Difference between two indicators
 */
export function calculateDifference(data1, data2) {
  if (!data1 || !data2 || data1.length !== data2.length) {
    return []
  }

  return data1.map((value, i) => value - data2[i])
}

/**
 * Strength calculation (normalized momentum)
 */
export function calculateStrength(data, period = 14) {
  if (!data || data.length < period + 1) {
    return []
  }

  const changes = []
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1])
  }

  const result = []
  
  for (let i = period - 1; i < changes.length; i++) {
    let positiveSum = 0
    let negativeSum = 0
    
    for (let j = 0; j < period; j++) {
      const change = changes[i - j]
      if (change > 0) {
        positiveSum += change
      } else {
        negativeSum += Math.abs(change)
      }
    }
    
    const totalSum = positiveSum + negativeSum
    const strength = totalSum > 0 ? (positiveSum / totalSum) * 100 : 50
    result.push(strength)
  }

  return result
}
