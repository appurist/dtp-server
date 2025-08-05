import { reactive, ref } from 'vue'
import { tradingService } from './tradingService.js'
import { historicalDataService } from './historicalData.js'

/**
 * Market Data Service - Manages real-time market data subscriptions and updates
 */
class MarketDataService {
  constructor() {
    this.subscriptions = reactive(new Map()) // contractId -> subscription info
    this.currentPrices = reactive(new Map()) // contractId -> current price data
    this.priceHistory = new Map() // contractId -> array of recent prices
    this.candleBuilders = new Map() // contractId -> current candle being built
    this.isConnected = ref(false)
    this.connectionState = ref('disconnected')

    // WebSocket handlers
    this.wsHandlers = new Map()

    // Initialize connection state monitoring
    this.initializeConnectionMonitoring()
  }

  /**
   * Initialize connection monitoring
   */
  initializeConnectionMonitoring() {
    // Monitor ProjectX connection state
    setInterval(() => {
      const connected = projectXService.isConnected()
      if (this.isConnected.value !== connected) {
        this.isConnected.value = connected
        this.connectionState.value = connected ? 'connected' : 'disconnected'

        if (!connected) {
          // Clear subscriptions if connection lost
          this.handleConnectionLost()
        }
      }
    }, 1000)
  }

  /**
   * Subscribe to market data for a contract
   */
  async subscribeToMarketData(contractId, symbol, onTradeUpdate = null, onPriceUpdate = null) {
    try {
      console.log(`Subscribing to market data for ${symbol} (${contractId})`)

      if (!projectXService.isConnected()) {
        throw new Error('ProjectX connection required for market data subscription')
      }

      // Check if already subscribed
      if (this.subscriptions.has(contractId)) {
        console.log(`Already subscribed to ${symbol}`)
        return true
      }

      // Create subscription info
      const subscription = {
        contractId,
        symbol,
        subscribedAt: new Date(),
        onTradeUpdate,
        onPriceUpdate,
        isActive: true
      }

      // Initialize price data
      this.currentPrices.set(contractId, {
        symbol,
        price: 0,
        bid: 0,
        ask: 0,
        volume: 0,
        timestamp: new Date(),
        change: 0,
        changePercent: 0
      })

      // Initialize price history (keep last 1000 prices)
      this.priceHistory.set(contractId, [])

      // Initialize candle builder for 1-minute candles
      this.candleBuilders.set(contractId, {
        symbol,
        startTime: this.getCurrentMinuteStart(),
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0,
        tickCount: 0
      })

      // Subscribe via ProjectX WebSocket
      const success = await projectXService.subscribeToMarketData(contractId, {
        onTrade: (tradeData) => this.handleTradeUpdate(contractId, tradeData),
        onQuote: (quoteData) => this.handleQuoteUpdate(contractId, quoteData),
        onError: (error) => this.handleSubscriptionError(contractId, error)
      })

      if (success) {
        this.subscriptions.set(contractId, subscription)
        console.log(`Successfully subscribed to market data for ${symbol}`)
        return true
      } else {
        throw new Error('Failed to subscribe to market data via ProjectX')
      }

    } catch (error) {
      console.error('Error subscribing to market data:', error)
      return false
    }
  }

  /**
   * Unsubscribe from market data
   */
  async unsubscribeFromMarketData(contractId) {
    try {
      const subscription = this.subscriptions.get(contractId)
      if (!subscription) {
        return true
      }

      console.log(`Unsubscribing from market data for ${subscription.symbol}`)

      // Unsubscribe via ProjectX
      await projectXService.unsubscribeFromMarketData(contractId)

      // Clean up local data
      this.subscriptions.delete(contractId)
      this.currentPrices.delete(contractId)
      this.priceHistory.delete(contractId)
      this.candleBuilders.delete(contractId)

      console.log(`Successfully unsubscribed from ${subscription.symbol}`)
      return true

    } catch (error) {
      console.error('Error unsubscribing from market data:', error)
      return false
    }
  }

  /**
   * Handle trade update from WebSocket
   */
  handleTradeUpdate(contractId, tradeData) {
    const subscription = this.subscriptions.get(contractId)
    if (!subscription || !subscription.isActive) return

    try {
      const price = parseFloat(tradeData.price)
      const volume = parseInt(tradeData.volume || tradeData.size || 1)
      const timestamp = new Date(tradeData.timestamp || Date.now())

      // Update current price data
      const currentPrice = this.currentPrices.get(contractId)
      if (currentPrice) {
        const previousPrice = currentPrice.price

        currentPrice.price = price
        currentPrice.volume += volume
        currentPrice.timestamp = timestamp
        currentPrice.change = price - previousPrice
        currentPrice.changePercent = previousPrice > 0 ? ((price - previousPrice) / previousPrice) * 100 : 0
      }

      // Add to price history
      const history = this.priceHistory.get(contractId)
      if (history) {
        history.push({ price, volume, timestamp })

        // Keep only last 1000 prices
        if (history.length > 1000) {
          history.shift()
        }
      }

      // Update candle builder
      this.updateCandleBuilder(contractId, price, volume, timestamp)

      // Call user callback
      if (subscription.onTradeUpdate) {
        subscription.onTradeUpdate({
          contractId,
          symbol: subscription.symbol,
          price,
          volume,
          timestamp
        })
      }

      // Call price update callback
      if (subscription.onPriceUpdate) {
        subscription.onPriceUpdate(price, timestamp)
      }

    } catch (error) {
      console.error('Error handling trade update:', error)
    }
  }

  /**
   * Handle quote update from WebSocket
   */
  handleQuoteUpdate(contractId, quoteData) {
    const subscription = this.subscriptions.get(contractId)
    if (!subscription || !subscription.isActive) return

    try {
      const bid = parseFloat(quoteData.bid || 0)
      const ask = parseFloat(quoteData.ask || 0)
      const timestamp = new Date(quoteData.timestamp || Date.now())

      // Update current price data
      const currentPrice = this.currentPrices.get(contractId)
      if (currentPrice) {
        currentPrice.bid = bid
        currentPrice.ask = ask
        currentPrice.timestamp = timestamp

        // Update price if we have a mid-price
        if (bid > 0 && ask > 0) {
          const midPrice = (bid + ask) / 2
          if (currentPrice.price === 0) {
            currentPrice.price = midPrice
          }
        }
      }

    } catch (error) {
      console.error('Error handling quote update:', error)
    }
  }

  /**
   * Update candle builder with new trade data
   */
  updateCandleBuilder(contractId, price, volume, timestamp) {
    const builder = this.candleBuilders.get(contractId)
    if (!builder) return

    const currentMinute = this.getCurrentMinuteStart()

    // Check if we need to complete the current candle and start a new one
    if (timestamp >= new Date(builder.startTime.getTime() + 60000)) {
      // Complete current candle
      if (builder.tickCount > 0) {
        this.completeCandle(contractId, builder)
      }

      // Start new candle
      builder.startTime = currentMinute
      builder.open = price
      builder.high = price
      builder.low = price
      builder.close = price
      builder.volume = volume
      builder.tickCount = 1
    } else {
      // Update current candle
      if (builder.tickCount === 0) {
        builder.open = price
        builder.high = price
        builder.low = price
      } else {
        builder.high = Math.max(builder.high, price)
        builder.low = Math.min(builder.low, price)
      }

      builder.close = price
      builder.volume += volume
      builder.tickCount++
    }
  }

  /**
   * Complete a candle and persist it
   */
  async completeCandle(contractId, builder) {
    try {
      const candle = historicalDataService.createCandle(
        builder.startTime,
        builder.open,
        builder.high,
        builder.low,
        builder.close,
        builder.volume,
        builder.symbol
      )

      // Persist the completed candle
      await historicalDataService.persistCandle(candle)

      console.log(`Completed 1-minute candle for ${builder.symbol}: O:${builder.open} H:${builder.high} L:${builder.low} C:${builder.close} V:${builder.volume}`)

    } catch (error) {
      console.error('Error completing candle:', error)
    }
  }

  /**
   * Get current minute start time
   */
  getCurrentMinuteStart() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0)
  }

  /**
   * Handle subscription error
   */
  handleSubscriptionError(contractId, error) {
    console.error(`Market data subscription error for ${contractId}:`, error)

    const subscription = this.subscriptions.get(contractId)
    if (subscription) {
      subscription.isActive = false
    }
  }

  /**
   * Handle connection lost
   */
  handleConnectionLost() {
    console.warn('Market data connection lost, clearing subscriptions')

    // Mark all subscriptions as inactive
    for (const [contractId, subscription] of this.subscriptions) {
      subscription.isActive = false
    }
  }

  /**
   * Get current price for a contract
   */
  getCurrentPrice(contractId) {
    return this.currentPrices.get(contractId)
  }

  /**
   * Get price history for a contract
   */
  getPriceHistory(contractId, limit = 100) {
    const history = this.priceHistory.get(contractId)
    if (!history) return []

    return history.slice(-limit)
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions() {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive)
  }

  /**
   * Check if subscribed to a contract
   */
  isSubscribed(contractId) {
    const subscription = this.subscriptions.get(contractId)
    return subscription && subscription.isActive
  }
}

// Create and export singleton instance
export const marketDataService = new MarketDataService()
