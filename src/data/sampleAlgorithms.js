/**
 * Sample Trading Algorithms - JavaScript port of existing algorithm definitions
 */

import { TradingAlgorithm, IndicatorConfig, TradingCondition } from '../models/TradingAlgorithm.js'

/**
 * Trend Persistence Strategy
 * Improved trend-following strategy using symmetric conditions with EMA crossovers and slope detection
 */
export const trendPersistenceStrategy = new TradingAlgorithm({
  name: 'Trend-Persistence',
  description: 'Improved trend-following strategy using symmetric conditions with EMA crossovers and slope detection',
  version: '2.0',
  indicators: [
    new IndicatorConfig({
      name: 'FastEMA',
      type: 'EMA',
      parameters: { period: 9 },
      description: '9-period Exponential Moving Average'
    }),
    new IndicatorConfig({
      name: 'SlowEMA',
      type: 'EMA',
      parameters: { period: 21 },
      description: '21-period Exponential Moving Average'
    }),
    new IndicatorConfig({
      name: 'RSI14',
      type: 'RSI',
      parameters: { period: 14 },
      description: '14-period Relative Strength Index'
    })
  ],
  entryConditions: [
    new TradingCondition({
      description: 'Enter on EMA crossover (fast above slow for LONG, fast below slow for SHORT)',
      type: 'crossover',
      side: 'BOTH',
      symmetric: true,
      parameters: {
        indicator1: 'FastEMA',
        indicator2: 'SlowEMA',
        direction: 'above'
      }
    }),
    new TradingCondition({
      description: 'Enter on RSI momentum (> 45 for LONG, < 55 for SHORT)',
      type: 'threshold',
      side: 'BOTH',
      symmetric: true,
      parameters: {
        indicator: 'RSI14',
        threshold: 45,
        comparison: '>'
      }
    })
  ],
  exitConditions: [
    new TradingCondition({
      description: 'Exit on EMA crossover reversal',
      type: 'crossover',
      side: 'BOTH',
      symmetric: true,
      parameters: {
        indicator1: 'FastEMA',
        indicator2: 'SlowEMA',
        direction: 'below'
      }
    }),
    new TradingCondition({
      description: 'Exit on RSI extremes',
      type: 'threshold',
      side: 'BOTH',
      symmetric: true,
      parameters: {
        indicator: 'RSI14',
        threshold: 25,
        comparison: '<'
      }
    })
  ]
})

/**
 * Simple Moving Average Crossover Strategy
 */
export const smaStrategy = new TradingAlgorithm({
  name: 'SMA Crossover',
  description: 'Simple moving average crossover strategy using 10 and 20 period SMAs',
  version: '1.0',
  indicators: [
    new IndicatorConfig({
      name: 'SMA_Fast',
      type: 'SMA',
      parameters: { period: 10, source: 'close' },
      description: 'Fast 10-period Simple Moving Average'
    }),
    new IndicatorConfig({
      name: 'SMA_Slow',
      type: 'SMA',
      parameters: { period: 20, source: 'close' },
      description: 'Slow 20-period Simple Moving Average'
    })
  ],
  entryConditions: [
    new TradingCondition({
      type: 'crossover',
      side: 'LONG',
      parameters: {
        indicator1: 'SMA_Fast',
        indicator2: 'SMA_Slow',
        direction: 'above'
      },
      description: 'Fast SMA crosses above Slow SMA'
    })
  ],
  exitConditions: [
    new TradingCondition({
      type: 'crossover',
      side: 'BOTH',
      parameters: {
        indicator1: 'SMA_Fast',
        indicator2: 'SMA_Slow',
        direction: 'below'
      },
      description: 'Fast SMA crosses below Slow SMA'
    })
  ]
})

/**
 * RSI Mean Reversion Strategy
 */
export const rsiStrategy = new TradingAlgorithm({
  name: 'RSI Mean Reversion',
  description: 'RSI-based mean reversion strategy with overbought/oversold levels',
  version: '1.0',
  indicators: [
    new IndicatorConfig({
      name: 'RSI',
      type: 'RSI',
      parameters: { period: 14, source: 'close' },
      description: '14-period Relative Strength Index'
    })
  ],
  entryConditions: [
    new TradingCondition({
      type: 'threshold',
      side: 'LONG',
      parameters: {
        indicator: 'RSI',
        comparison: '<',
        threshold: 30
      },
      description: 'RSI below 30 (oversold)'
    }),
    new TradingCondition({
      type: 'threshold',
      side: 'SHORT',
      parameters: {
        indicator: 'RSI',
        comparison: '>',
        threshold: 70
      },
      description: 'RSI above 70 (overbought)'
    })
  ],
  exitConditions: [
    new TradingCondition({
      type: 'threshold',
      side: 'BOTH',
      parameters: {
        indicator: 'RSI',
        comparison: '>',
        threshold: 50
      },
      description: 'RSI returns to neutral (above 50 for LONG exit, below 50 for SHORT exit)'
    })
  ]
})

/**
 * MACD Momentum Strategy
 */
export const macdStrategy = new TradingAlgorithm({
  name: 'MACD Momentum',
  description: 'MACD-based momentum strategy with signal line crossovers',
  version: '1.0',
  indicators: [
    new IndicatorConfig({
      name: 'MACD',
      type: 'MACD',
      parameters: {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        source: 'close'
      },
      description: 'MACD (12,26,9)'
    })
  ],
  entryConditions: [
    new TradingCondition({
      type: 'crossover',
      side: 'BOTH',
      symmetric: true,
      parameters: {
        indicator1: 'MACD',
        indicator2: 'MACD_Signal',
        direction: 'above'
      },
      description: 'MACD crosses above signal line for LONG, below for SHORT'
    })
  ],
  exitConditions: [
    new TradingCondition({
      type: 'crossover',
      side: 'BOTH',
      symmetric: true,
      parameters: {
        indicator1: 'MACD',
        indicator2: 'MACD_Signal',
        direction: 'below'
      },
      description: 'MACD crosses below signal line'
    })
  ]
})

/**
 * Momentum Strategy with Multiple Indicators
 */
export const momentumStrategy = new TradingAlgorithm({
  name: 'Momentum Strategy',
  description: 'Multi-indicator momentum strategy using EMA, RSI, and slope',
  version: '1.0',
  indicators: [
    new IndicatorConfig({
      name: 'EMA_21',
      type: 'EMA',
      parameters: { period: 21, source: 'close' },
      description: '21-period Exponential Moving Average'
    }),
    new IndicatorConfig({
      name: 'RSI_14',
      type: 'RSI',
      parameters: { period: 14, source: 'close' },
      description: '14-period Relative Strength Index'
    }),
    new IndicatorConfig({
      name: 'EMA_Slope',
      type: 'SLOPE',
      parameters: { source: 'EMA_21', period: 5 },
      description: 'Slope of 21-period EMA'
    })
  ],
  entryConditions: [
    new TradingCondition({
      type: 'threshold',
      side: 'LONG',
      parameters: {
        indicator: 'RSI_14',
        comparison: '>',
        threshold: 50
      },
      description: 'RSI above 50 (bullish momentum)'
    }),
    new TradingCondition({
      type: 'slope',
      side: 'LONG',
      parameters: {
        indicator: 'EMA_Slope',
        direction: 'up',
        threshold: 0
      },
      description: 'EMA slope is positive (uptrend)'
    }),
    new TradingCondition({
      type: 'threshold',
      side: 'SHORT',
      parameters: {
        indicator: 'RSI_14',
        comparison: '<',
        threshold: 50
      },
      description: 'RSI below 50 (bearish momentum)'
    }),
    new TradingCondition({
      type: 'slope',
      side: 'SHORT',
      parameters: {
        indicator: 'EMA_Slope',
        direction: 'down',
        threshold: 0
      },
      description: 'EMA slope is negative (downtrend)'
    })
  ],
  exitConditions: [
    new TradingCondition({
      type: 'threshold',
      side: 'LONG',
      parameters: {
        indicator: 'RSI_14',
        comparison: '<',
        threshold: 40
      },
      description: 'RSI drops below 40 (momentum weakening)'
    }),
    new TradingCondition({
      type: 'threshold',
      side: 'SHORT',
      parameters: {
        indicator: 'RSI_14',
        comparison: '>',
        threshold: 60
      },
      description: 'RSI rises above 60 (momentum weakening)'
    })
  ]
})

/**
 * Get all sample algorithms
 */
export function getSampleAlgorithms() {
  return [
    trendPersistenceStrategy,
    smaStrategy,
    rsiStrategy,
    macdStrategy,
    momentumStrategy
  ]
}

/**
 * Get algorithm by name
 */
export function getAlgorithmByName(name) {
  const algorithms = getSampleAlgorithms()
  return algorithms.find(algo => algo.name === name)
}
