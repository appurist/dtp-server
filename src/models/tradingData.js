/**
 * Trading Data Model - JavaScript port of C# TradingData
 * Stores OHLCV data and calculated indicators for trading algorithms
 */

export class TradingData {
  constructor(symbol = '') {
    this.symbol = symbol
    this.timestamps = []
    this.opens = []
    this.highs = []
    this.lows = []
    this.closes = []
    this.volumes = []
    this.indicators = new Map() // indicator name -> array of values
  }

  /**
   * Get the number of data points
   */
  get count() {
    return this.timestamps.length
  }

  /**
   * Add a new candle/bar to the data
   */
  addCandle(timestamp, open, high, low, close, volume = 0) {
    // Convert timestamp to Unix timestamp if it's a Date object
    const unixTimestamp = timestamp instanceof Date ?
      Math.floor(timestamp.getTime() / 1000) : timestamp

    this.timestamps.push(unixTimestamp)
    this.opens.push(open)
    this.highs.push(high)
    this.lows.push(low)
    this.closes.push(close)
    this.volumes.push(volume)
  }

  /**
   * Add multiple candles from array of OHLCV data
   */
  addCandles(candles) {
    candles.forEach(candle => {
      this.addCandle(
        candle.timestamp || candle.time,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume || 0
      )
    })
  }

  /**
   * Add or update a candle (if isNewCandle is false, updates the last candle)
   */
  addOrUpdateCandle(timestamp, open, high, low, close, volume = 0, isNewCandle = true) {
    if (isNewCandle || this.count === 0) {
      // Add new candle
      this.addCandle(timestamp, open, high, low, close, volume)
    } else {
      // Update the last candle
      const lastIndex = this.count - 1
      this.highs[lastIndex] = Math.max(this.highs[lastIndex], high)
      this.lows[lastIndex] = Math.min(this.lows[lastIndex], low)
      this.closes[lastIndex] = close
      this.volumes[lastIndex] += volume
    }
  }

  /**
   * Get candle data at specific index
   */
  getCandle(index) {
    if (index < 0 || index >= this.count) {
      return null
    }

    return {
      timestamp: this.timestamps[index],
      open: this.opens[index],
      high: this.highs[index],
      low: this.lows[index],
      close: this.closes[index],
      volume: this.volumes[index]
    }
  }

  /**
   * Get the most recent candle
   */
  getLastCandle() {
    if (this.count === 0) return null
    return this.getCandle(this.count - 1)
  }

  /**
   * Get the most recent candle (alias for getLastCandle)
   */
  getLatestCandle() {
    return this.getLastCandle()
  }

  /**
   * Get price data for a specific source (open, high, low, close)
   */
  getPriceData(source = 'close') {
    switch (source.toLowerCase()) {
      case 'open':
        return [...this.opens]
      case 'high':
        return [...this.highs]
      case 'low':
        return [...this.lows]
      case 'close':
        return [...this.closes]
      case 'volume':
        return [...this.volumes]
      default:
        return [...this.closes]
    }
  }

  /**
   * Get typical price (HLC/3) array
   */
  getTypicalPrice() {
    return this.highs.map((high, i) =>
      (high + this.lows[i] + this.closes[i]) / 3
    )
  }

  /**
   * Get weighted close price (HLCC/4) array
   */
  getWeightedClose() {
    return this.highs.map((high, i) =>
      (high + this.lows[i] + this.closes[i] + this.closes[i]) / 4
    )
  }

  /**
   * Set indicator values
   */
  setIndicator(name, values) {
    this.indicators.set(name, [...values])
  }

  /**
   * Get indicator values
   */
  getIndicator(name) {
    return this.indicators.get(name) || []
  }

  /**
   * Get indicator value at specific index
   */
  getIndicatorValue(name, index) {
    const values = this.getIndicator(name)
    if (index < 0 || index >= values.length) {
      return null
    }
    return values[index]
  }

  /**
   * Get the most recent indicator value
   */
  getLastIndicatorValue(name) {
    const values = this.getIndicator(name)
    return values.length > 0 ? values[values.length - 1] : null
  }

  /**
   * Check if indicator exists
   */
  hasIndicator(name) {
    return this.indicators.has(name)
  }

  /**
   * Get all indicator names
   */
  getIndicatorNames() {
    return Array.from(this.indicators.keys())
  }

  /**
   * Clear all data
   */
  clear() {
    this.timestamps = []
    this.opens = []
    this.highs = []
    this.lows = []
    this.closes = []
    this.volumes = []
    this.indicators.clear()
  }

  /**
   * Get data slice from start to end index
   */
  slice(start, end) {
    const sliced = new TradingData(this.symbol)

    const startIdx = Math.max(0, start)
    const endIdx = Math.min(this.count, end || this.count)

    sliced.timestamps = this.timestamps.slice(startIdx, endIdx)
    sliced.opens = this.opens.slice(startIdx, endIdx)
    sliced.highs = this.highs.slice(startIdx, endIdx)
    sliced.lows = this.lows.slice(startIdx, endIdx)
    sliced.closes = this.closes.slice(startIdx, endIdx)
    sliced.volumes = this.volumes.slice(startIdx, endIdx)

    // Copy indicators
    for (const [name, values] of this.indicators) {
      sliced.setIndicator(name, values.slice(startIdx, endIdx))
    }

    return sliced
  }

  /**
   * Convert to array of candle objects for charting
   */
  toChartData() {
    return this.timestamps.map((timestamp, i) => ({
      time: timestamp,
      open: this.opens[i],
      high: this.highs[i],
      low: this.lows[i],
      close: this.closes[i],
      volume: this.volumes[i]
    }))
  }

  /**
   * Convert to JSON for storage/transmission
   */
  toJSON() {
    const indicators = {}
    for (const [name, values] of this.indicators) {
      indicators[name] = values
    }

    return {
      symbol: this.symbol,
      timestamps: this.timestamps,
      opens: this.opens,
      highs: this.highs,
      lows: this.lows,
      closes: this.closes,
      volumes: this.volumes,
      indicators
    }
  }

  /**
   * Create from JSON data
   */
  static fromJSON(json) {
    const data = new TradingData(json.symbol)

    data.timestamps = json.timestamps || []
    data.opens = json.opens || []
    data.highs = json.highs || []
    data.lows = json.lows || []
    data.closes = json.closes || []
    data.volumes = json.volumes || []

    if (json.indicators) {
      for (const [name, values] of Object.entries(json.indicators)) {
        data.setIndicator(name, values)
      }
    }

    return data
  }

  /**
   * Validate data integrity
   */
  validate() {
    const errors = []

    if (this.count === 0) {
      errors.push('No data points available')
      return errors
    }

    // Check array lengths match
    const expectedLength = this.timestamps.length
    if (this.opens.length !== expectedLength) errors.push('Opens array length mismatch')
    if (this.highs.length !== expectedLength) errors.push('Highs array length mismatch')
    if (this.lows.length !== expectedLength) errors.push('Lows array length mismatch')
    if (this.closes.length !== expectedLength) errors.push('Closes array length mismatch')
    if (this.volumes.length !== expectedLength) errors.push('Volumes array length mismatch')

    // Check for valid OHLC relationships
    for (let i = 0; i < this.count; i++) {
      const high = this.highs[i]
      const low = this.lows[i]
      const open = this.opens[i]
      const close = this.closes[i]

      if (high < low) {
        errors.push(`Invalid OHLC at index ${i}: high (${high}) < low (${low})`)
      }
      if (open > high || open < low) {
        errors.push(`Invalid OHLC at index ${i}: open (${open}) outside high-low range`)
      }
      if (close > high || close < low) {
        errors.push(`Invalid OHLC at index ${i}: close (${close}) outside high-low range`)
      }
    }

    return errors
  }
}
