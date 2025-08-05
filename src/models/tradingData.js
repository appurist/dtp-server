/**
 * Trading Data structure for storing OHLCV data and indicators
 * Based on the C# TradingData implementation
 */
export class TradingData {
  constructor(contractId) {
    this.contractId = contractId
    this.timestamps = []
    this.open = []
    this.high = []
    this.low = []
    this.close = []
    this.volume = []
    this.indicators = {}
  }

  /**
   * Get the number of data points
   */
  get count() {
    return this.close.length
  }

  /**
   * Add a new candle to the data
   */
  addCandle(timestamp, open, high, low, close, volume) {
    this.timestamps.push(timestamp)
    this.open.push(open)
    this.high.push(high)
    this.low.push(low)
    this.close.push(close)
    this.volume.push(volume)
  }

  /**
   * Update the last candle or add a new one
   */
  addOrUpdateCandle(timestamp, open, high, low, close, volume, isNewCandle = true) {
    if (isNewCandle || this.count === 0) {
      this.addCandle(timestamp, open, high, low, close, volume)
    } else {
      // Update the last candle
      const lastIndex = this.count - 1
      this.timestamps[lastIndex] = timestamp
      this.high[lastIndex] = Math.max(this.high[lastIndex], high)
      this.low[lastIndex] = Math.min(this.low[lastIndex], low)
      this.close[lastIndex] = close
      this.volume[lastIndex] += volume
    }
  }

  /**
   * Store indicator values
   */
  storeIndicator(name, values) {
    this.indicators[name] = [...values] // Create a copy
  }

  /**
   * Get indicator values by name
   */
  getIndicator(name) {
    return this.indicators[name] || []
  }

  /**
   * Get the latest candle data
   */
  getLatestCandle() {
    if (this.count === 0) return null
    
    const lastIndex = this.count - 1
    return {
      timestamp: this.timestamps[lastIndex],
      open: this.open[lastIndex],
      high: this.high[lastIndex],
      low: this.low[lastIndex],
      close: this.close[lastIndex],
      volume: this.volume[lastIndex]
    }
  }

  /**
   * Get candle data for a specific index (0 = oldest, count-1 = newest)
   */
  getCandle(index) {
    if (index < 0 || index >= this.count) return null
    
    return {
      timestamp: this.timestamps[index],
      open: this.open[index],
      high: this.high[index],
      low: this.low[index],
      close: this.close[index],
      volume: this.volume[index]
    }
  }

  /**
   * Get a slice of the data (for backtesting or analysis)
   */
  getSlice(startIndex, endIndex) {
    const slice = new TradingData(this.contractId)
    
    for (let i = startIndex; i <= endIndex && i < this.count; i++) {
      slice.addCandle(
        this.timestamps[i],
        this.open[i],
        this.high[i],
        this.low[i],
        this.close[i],
        this.volume[i]
      )
    }
    
    // Copy indicators for the slice
    for (const [name, values] of Object.entries(this.indicators)) {
      slice.indicators[name] = values.slice(startIndex, endIndex + 1)
    }
    
    return slice
  }

  /**
   * Clear all data
   */
  clear() {
    this.timestamps = []
    this.open = []
    this.high = []
    this.low = []
    this.close = []
    this.volume = []
    this.indicators = {}
  }

  /**
   * Load historical data from an array of bars
   */
  loadHistoricalData(bars) {
    this.clear()
    
    for (const bar of bars) {
      this.addCandle(
        bar.timestamp,
        bar.open,
        bar.high,
        bar.low,
        bar.close,
        bar.volume
      )
    }
  }

  /**
   * Convert to chart data format
   */
  toChartData(timeRangeMinutes = null) {
    const chartData = []
    let startIndex = 0
    
    if (timeRangeMinutes) {
      const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000)
      startIndex = this.timestamps.findIndex(ts => new Date(ts) >= cutoffTime)
      if (startIndex === -1) startIndex = 0
    }
    
    for (let i = startIndex; i < this.count; i++) {
      const dataPoint = {
        x: this.timestamps[i],
        o: this.open[i],
        h: this.high[i],
        l: this.low[i],
        c: this.close[i],
        v: this.volume[i]
      }
      
      // Add indicators
      if (Object.keys(this.indicators).length > 0) {
        dataPoint.indicators = {}
        for (const [name, values] of Object.entries(this.indicators)) {
          if (i < values.length && !isNaN(values[i])) {
            dataPoint.indicators[name] = values[i]
          }
        }
      }
      
      chartData.push(dataPoint)
    }
    
    return chartData
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    if (this.count === 0) {
      return {
        count: 0,
        timeRange: null,
        priceRange: null,
        indicators: []
      }
    }
    
    const minPrice = Math.min(...this.low)
    const maxPrice = Math.max(...this.high)
    const startTime = this.timestamps[0]
    const endTime = this.timestamps[this.count - 1]
    
    return {
      count: this.count,
      timeRange: {
        start: startTime,
        end: endTime,
        duration: new Date(endTime) - new Date(startTime)
      },
      priceRange: {
        min: minPrice,
        max: maxPrice,
        range: maxPrice - minPrice
      },
      indicators: Object.keys(this.indicators)
    }
  }

  /**
   * Validate data integrity
   */
  validate() {
    const errors = []
    
    // Check array lengths match
    const expectedLength = this.timestamps.length
    if (this.open.length !== expectedLength) errors.push('Open array length mismatch')
    if (this.high.length !== expectedLength) errors.push('High array length mismatch')
    if (this.low.length !== expectedLength) errors.push('Low array length mismatch')
    if (this.close.length !== expectedLength) errors.push('Close array length mismatch')
    if (this.volume.length !== expectedLength) errors.push('Volume array length mismatch')
    
    // Check for valid OHLC relationships
    for (let i = 0; i < this.count; i++) {
      if (this.high[i] < this.low[i]) {
        errors.push(`Invalid OHLC at index ${i}: high < low`)
      }
      if (this.open[i] > this.high[i] || this.open[i] < this.low[i]) {
        errors.push(`Invalid OHLC at index ${i}: open outside high/low range`)
      }
      if (this.close[i] > this.high[i] || this.close[i] < this.low[i]) {
        errors.push(`Invalid OHLC at index ${i}: close outside high/low range`)
      }
      if (this.volume[i] < 0) {
        errors.push(`Invalid volume at index ${i}: negative volume`)
      }
    }
    
    // Check timestamp ordering
    for (let i = 1; i < this.timestamps.length; i++) {
      if (new Date(this.timestamps[i]) <= new Date(this.timestamps[i - 1])) {
        errors.push(`Invalid timestamp ordering at index ${i}`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Export data to JSON
   */
  toJSON() {
    return {
      contractId: this.contractId,
      count: this.count,
      data: {
        timestamps: this.timestamps,
        open: this.open,
        high: this.high,
        low: this.low,
        close: this.close,
        volume: this.volume
      },
      indicators: this.indicators,
      summary: this.getSummary()
    }
  }

  /**
   * Import data from JSON
   */
  static fromJSON(json) {
    const tradingData = new TradingData(json.contractId)
    
    if (json.data) {
      tradingData.timestamps = [...json.data.timestamps]
      tradingData.open = [...json.data.open]
      tradingData.high = [...json.data.high]
      tradingData.low = [...json.data.low]
      tradingData.close = [...json.data.close]
      tradingData.volume = [...json.data.volume]
    }
    
    if (json.indicators) {
      tradingData.indicators = { ...json.indicators }
    }
    
    return tradingData
  }
}
