import { storageService } from './storage.js'
import { tradingService } from './tradingService.js'

/**
 * Historical Data Service - Manages historical market data collection and storage
 */
class HistoricalDataService {
  constructor() {
    this.isCollecting = false
    this.collectionProgress = {}
  }

  /**
   * Candle data structure
   */
  createCandle(timestamp, open, high, low, close, volume, symbol) {
    return {
      timestamp: new Date(timestamp).toISOString(),
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseInt(volume),
      symbol: symbol
    }
  }

  /**
   * Collect historical data for a symbol
   * @param {string} symbol - Trading symbol
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Function} onProgress - Progress callback
   */
  async collectHistoricalData(symbol, startDate, endDate, onProgress = null) {
    if (this.isCollecting) {
      throw new Error('Historical data collection already in progress')
    }

    this.isCollecting = true
    this.collectionProgress[symbol] = { current: 0, total: 0, status: 'starting' }

    try {
      console.log(`Starting historical data collection for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`)

      // Check if server is connected
      if (!tradingService.isConnected.value) {
        throw new Error('Server connection required for historical data collection')
      }

      // Get contract information
      const contracts = await tradingService.searchContracts(symbol)
      if (!contracts.success || contracts.contracts.length === 0) {
        throw new Error(`No contracts found for symbol: ${symbol}`)
      }

      const contract = contracts.contracts[0]
      console.log(`Using contract: ${contract.name} (${contract.id})`)

      // Calculate date range in days
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      this.collectionProgress[symbol].total = daysDiff

      const collectedCandles = []
      let currentDate = new Date(startDate)

      while (currentDate <= endDate) {
        try {
          // Check if we already have data for this date
          const hasData = await this.hasHistoricalData(symbol, currentDate)

          if (!hasData) {
            // Request historical data from ProjectX for this date
            const dayStart = new Date(currentDate)
            dayStart.setHours(0, 0, 0, 0)

            const dayEnd = new Date(currentDate)
            dayEnd.setHours(23, 59, 59, 999)

            console.log(`Requesting data for ${symbol} on ${currentDate.toDateString()}`)

            // Request 1-minute candles for the day
            const historicalData = await tradingService.getHistoricalBars(
              contract.id,
              dayStart,
              dayEnd,
              2, // unit: 2 = minutes
              1, // unitNumber: 1 minute intervals
              1000, // limit: max candles per request
              false, // live: false for historical data
              false // includePartialBar: false
            )

            if (historicalData.success && historicalData.candles) {
              // Process and store the candles
              for (const candleData of historicalData.candles) {
                const candle = this.createCandle(
                  candleData.timestamp,
                  candleData.open,
                  candleData.high,
                  candleData.low,
                  candleData.close,
                  candleData.volume,
                  symbol
                )

                collectedCandles.push(candle)
                await this.persistCandle(candle)
              }

              console.log(`Collected ${historicalData.candles.length} candles for ${symbol} on ${currentDate.toDateString()}`)
            }
          } else {
            console.log(`Data already exists for ${symbol} on ${currentDate.toDateString()}`)
          }

          // Update progress
          this.collectionProgress[symbol].current++
          this.collectionProgress[symbol].status = 'collecting'

          if (onProgress) {
            onProgress({
              symbol,
              current: this.collectionProgress[symbol].current,
              total: this.collectionProgress[symbol].total,
              date: currentDate.toDateString()
            })
          }

          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1)

          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (dayError) {
          console.error(`Error collecting data for ${symbol} on ${currentDate.toDateString()}:`, dayError)
          // Continue with next day
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      this.collectionProgress[symbol].status = 'completed'
      console.log(`Historical data collection completed for ${symbol}. Collected ${collectedCandles.length} total candles.`)

      return {
        success: true,
        symbol,
        candlesCollected: collectedCandles.length,
        dateRange: { start: startDate, end: endDate }
      }

    } catch (error) {
      this.collectionProgress[symbol].status = 'error'
      console.error('Error collecting historical data:', error)
      throw error
    } finally {
      this.isCollecting = false
    }
  }

  /**
   * Collect last hour of historical data for immediate use
   */
  async collectRecentHistoricalData(symbol) {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (60 * 60 * 1000)) // 1 hour ago

    console.log(`Collecting recent historical data for ${symbol} (last hour)`)

    return await this.collectHistoricalData(symbol, startDate, endDate)
  }

  /**
   * Load historical data from storage
   */
  async loadHistoricalData(symbol, startDate, endDate) {
    try {
      const fileName = this.generateDataFileName(symbol, startDate, endDate)
      const result = await storageService.readFile(`historical/${fileName}`)

      if (result.success) {
        const lines = result.content.split('\n').filter(line => line.trim())
        const candles = []

        for (const line of lines) {
          try {
            const candle = JSON.parse(line)
            const candleDate = new Date(candle.timestamp)

            if (candleDate >= startDate && candleDate <= endDate) {
              candles.push(candle)
            }
          } catch (parseError) {
            console.warn('Error parsing candle data:', parseError)
          }
        }

        // Sort by timestamp
        candles.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

        return {
          success: true,
          candles,
          symbol,
          count: candles.length
        }
      }

      return { success: false, candles: [], count: 0 }
    } catch (error) {
      console.error('Error loading historical data:', error)
      return { success: false, error: error.message, candles: [], count: 0 }
    }
  }

  /**
   * Persist a single candle to storage
   */
  async persistCandle(candle) {
    try {
      const date = new Date(candle.timestamp)
      const fileName = this.generateDataFileName(candle.symbol, date)
      const jsonLine = JSON.stringify(candle)

      // Append to daily file
      await storageService.appendToFile(`historical/${fileName}`, jsonLine + '\n')

    } catch (error) {
      console.error('Error persisting candle:', error)
    }
  }

  /**
   * Check if historical data exists for a symbol on a date
   */
  async hasHistoricalData(symbol, date) {
    try {
      const fileName = this.generateDataFileName(symbol, date)
      const result = await storageService.fileExists(`historical/${fileName}`)
      return result.exists && result.size > 0
    } catch (error) {
      return false
    }
  }

  /**
   * Generate filename for historical data
   */
  generateDataFileName(symbol, date, endDate = null) {
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD format

    if (endDate) {
      const endDateStr = endDate.toISOString().split('T')[0]
      return `${symbol}_${dateStr}_to_${endDateStr}.jsonl`
    }

    return `${symbol}_${dateStr}.jsonl`
  }

  /**
   * Get collection progress for a symbol
   */
  getCollectionProgress(symbol) {
    return this.collectionProgress[symbol] || { current: 0, total: 0, status: 'not_started' }
  }

  /**
   * Clear collection progress
   */
  clearCollectionProgress(symbol) {
    delete this.collectionProgress[symbol]
  }
}

// Create and export singleton instance
export const historicalDataService = new HistoricalDataService()
