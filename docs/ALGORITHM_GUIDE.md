# DayTradersPro Algorithm Creation Guide

## Table of Contents
1. [Overview](#overview)
2. [Algorithm Structure](#algorithm-structure)
3. [Creating Your First Algorithm](#creating-your-first-algorithm)
4. [Indicators](#indicators)
5. [Conditions](#conditions)
6. [Advanced Features](#advanced-features)
7. [Testing and Validation](#testing-and-validation)
8. [Best Practices](#best-practices)
9. [Examples](#examples)
10. [Troubleshooting](#troubleshooting)

## Overview

DayTradersPro's algorithm system allows you to create sophisticated trading strategies using a visual interface. Algorithms consist of:

- **Indicators**: Technical analysis tools (SMA, EMA, RSI, etc.)
- **Entry Conditions**: Rules that trigger trade entries
- **Exit Conditions**: Rules that trigger trade exits

## Algorithm Structure

Every algorithm has the following components:

```
Algorithm
├── Basic Information
│   ├── Name
│   ├── Description
│   └── Version
├── Indicators
│   ├── Indicator 1 (e.g., SMA_20)
│   ├── Indicator 2 (e.g., RSI_14)
│   └── ...
├── Entry Conditions
│   ├── Condition 1
│   ├── Condition 2 (optional)
│   └── ...
└── Exit Conditions
    ├── Condition 1
    ├── Condition 2 (optional)
    └── ...
```

## Creating Your First Algorithm

### Step 1: Navigate to Algorithm Editor
1. Go to the **Algorithms** page
2. Click **"Create New Algorithm"**
3. Fill in basic information:
   - **Name**: Give your algorithm a descriptive name
   - **Description**: Explain what your strategy does
   - **Version**: Start with "1.0"

### Step 2: Add Indicators
Indicators are the building blocks of your strategy. Click **"Add Indicator"** to add technical indicators:

1. **Name**: Unique identifier (e.g., "SMA_20", "RSI_14")
2. **Type**: Choose from available indicators
3. **Parameters**: Configure the indicator settings
4. **Description**: Optional explanation

### Step 3: Define Entry Conditions
Entry conditions determine when to enter trades. Click **"Add Condition"** in the Entry Conditions section:

1. **Condition Type**: Choose the type of condition
2. **Trading Side**: LONG, SHORT, or BOTH
3. **Parameters**: Configure condition-specific settings
4. **Description**: Explain what this condition checks

### Step 4: Define Exit Conditions
Exit conditions determine when to close trades. Similar to entry conditions but for exits.

### Step 5: Save and Test
1. Click **"Save Algorithm"**
2. Test with backtesting to validate performance

## Indicators

### Available Indicator Types

| Indicator | Description | Key Parameters |
|-----------|-------------|----------------|
| **SMA** | Simple Moving Average | `period` (default: 20) |
| **EMA** | Exponential Moving Average | `period` (default: 20) |
| **RSI** | Relative Strength Index | `period` (default: 14) |
| **MFI** | Money Flow Index | `period` (default: 14) |
| **MACD** | Moving Average Convergence Divergence | `fastPeriod` (12), `slowPeriod` (26), `signalPeriod` (9) |
| **ATR** | Average True Range | `period` (default: 14) |
| **VWAP** | Volume Weighted Average Price | No parameters |
| **SD** | Standard Deviation | `period` (default: 20), `source` |
| **DirectionMA** | Directional Moving Average | `period`, `method` |
| **Slope** | Slope of another indicator | `source`, `period` |
| **Difference** | Difference between two sources | `source1`, `source2` |
| **Strength** | Market strength indicator | `period`, `source` |

### Indicator Parameters

#### Common Parameters
- **period**: Number of bars to calculate over
- **source**: Price source (open, high, low, close, volume)

#### Price Sources
- `open`: Opening price
- `close`: Closing price (most common)
- `high`: High price
- `low`: Low price
- `volume`: Trading volume
- `typical`: (high + low + close) / 3
- `median`: (high + low) / 2
- `weighted`: (high + low + 2*close) / 4

### Example Indicators
```javascript
// 20-period Simple Moving Average
{
  name: "SMA_20",
  type: "SMA",
  parameters: { period: 20, source: "close" }
}

// 14-period RSI
{
  name: "RSI_14", 
  type: "RSI",
  parameters: { period: 14, source: "close" }
}

// MACD with custom periods
{
  name: "MACD_Custom",
  type: "MACD", 
  parameters: { 
    fastPeriod: 8, 
    slowPeriod: 21, 
    signalPeriod: 5,
    source: "close"
  }
}
```

## Conditions

### Condition Types

#### 1. Threshold
Compares a value against a fixed number.

**Parameters:**
- `source`: What to compare (indicator name or price)
- `operator`: Comparison operator (>, <, >=, <=, ==)
- `value`: Number to compare against

**Example:** RSI above 70
```javascript
{
  type: "threshold",
  parameters: {
    source: "RSI_14",
    operator: ">", 
    value: 70
  }
}
```

#### 2. Crossover
Detects when one line crosses above/below another.

**Parameters:**
- `source1`: First line (usually faster indicator)
- `source2`: Second line (usually slower indicator)  
- `direction`: "above", "below", or "any"

**Example:** Fast EMA crosses above Slow EMA
```javascript
{
  type: "crossover",
  parameters: {
    source1: "EMA_12",
    source2: "EMA_26",
    direction: "above"
  }
}
```

#### 3. Slope
Checks the direction/trend of an indicator.

**Parameters:**
- `source`: Indicator to check slope of
- `direction`: "up", "down", or "flat"
- `period`: Number of bars to calculate slope over

**Example:** EMA trending upward
```javascript
{
  type: "slope", 
  parameters: {
    source: "EMA_21",
    direction: "up",
    period: 5
  }
}
```

#### 4. Direction
Checks market direction based on an indicator.

**Parameters:**
- `source`: Indicator to check
- `direction`: "bullish", "bearish", or "neutral"

#### 5. Strength  
Measures market strength.

**Parameters:**
- `source`: Indicator to measure
- `operator`: Comparison operator
- `value`: Strength threshold (0-100)

#### 6. Divergence
Detects divergence between price and indicators.

**Parameters:**
- `priceSource`: Price data (high, low, close)
- `indicatorSource`: Indicator to compare against
- `divergenceType`: "bullish", "bearish", or "any"
- `lookbackPeriod`: How far back to look
- `minStrength`: Minimum divergence strength

### Trading Sides
- **BOTH**: Condition applies to both long and short trades
- **LONG**: Condition only applies to long (buy) trades  
- **SHORT**: Condition only applies to short (sell) trades

## Advanced Features

### Multiple Conditions
You can add multiple entry and exit conditions. By default:
- **Entry conditions** use AND logic (all must be true)
- **Exit conditions** use OR logic (any can trigger exit)

### Logical Operators
For complex logic, you can use:
- **AND**: All nested conditions must be true
- **OR**: Any nested condition can be true

### Condition Descriptions
Always add clear descriptions to your conditions. This helps with:
- Understanding your strategy later
- Debugging issues
- Sharing strategies with others

## Testing and Validation

### Backtesting
1. Save your algorithm
2. Go to **Backtesting** page
3. Select your algorithm
4. Choose date range and symbol
5. Run backtest to see performance

### Validation Checklist
- [ ] All indicators have unique names
- [ ] All conditions reference valid indicators/sources
- [ ] Entry and exit logic makes sense
- [ ] Algorithm has been backtested
- [ ] Performance meets expectations

## Best Practices

### Naming Conventions
- **Indicators**: Use descriptive names like "SMA_20", "RSI_14"
- **Algorithms**: Use clear, descriptive names
- **Descriptions**: Always explain what each component does

### Strategy Design
1. **Start Simple**: Begin with basic strategies
2. **Test Thoroughly**: Always backtest before live trading
3. **Document Everything**: Use descriptions liberally
4. **Avoid Over-Optimization**: Don't curve-fit to historical data
5. **Consider Risk**: Include proper exit conditions

### Performance Tips
- Use appropriate indicator periods for your timeframe
- Avoid too many conditions (can reduce trade frequency)
- Test on different market conditions
- Consider transaction costs in backtesting

### Common Mistakes to Avoid
- Forgetting exit conditions
- Using future data (look-ahead bias)
- Over-complicating strategies
- Not testing on out-of-sample data
- Ignoring risk management

## Examples

### Example 1: Simple Moving Average Crossover
**Strategy**: Buy when fast SMA crosses above slow SMA, sell when it crosses below.

**Indicators:**
- SMA_10: 10-period SMA
- SMA_20: 20-period SMA

**Entry Condition:**
- Type: Crossover
- Source1: SMA_10
- Source2: SMA_20  
- Direction: above
- Side: LONG

**Exit Condition:**
- Type: Crossover
- Source1: SMA_10
- Source2: SMA_20
- Direction: below
- Side: BOTH

### Example 2: RSI Mean Reversion
**Strategy**: Buy when RSI is oversold, sell when overbought.

**Indicators:**
- RSI_14: 14-period RSI

**Entry Condition:**
- Type: Threshold
- Source: RSI_14
- Operator: <
- Value: 30
- Side: LONG

**Exit Condition:**
- Type: Threshold  
- Source: RSI_14
- Operator: >
- Value: 70
- Side: BOTH

### Example 3: Multi-Indicator Strategy
**Strategy**: Combine EMA crossover with RSI confirmation.

**Indicators:**
- EMA_12: 12-period EMA
- EMA_26: 26-period EMA
- RSI_14: 14-period RSI

**Entry Conditions:**
1. EMA Crossover:
   - Type: Crossover
   - Source1: EMA_12
   - Source2: EMA_26
   - Direction: above
   - Side: LONG

2. RSI Confirmation:
   - Type: Threshold
   - Source: RSI_14
   - Operator: >
   - Value: 50
   - Side: LONG

**Exit Condition:**
- Type: Crossover
- Source1: EMA_12
- Source2: EMA_26
- Direction: below
- Side: BOTH

## Troubleshooting

### Common Issues

#### "Unknown indicator type" Error
- Check indicator type spelling
- Ensure indicator type is supported
- Verify indicator is properly configured

#### "Invalid condition structure" Error  
- Check all required parameters are filled
- Verify source references exist
- Ensure condition type is valid

#### No Trades Generated
- Check if conditions are too restrictive
- Verify entry and exit conditions don't conflict
- Test with different parameters or date ranges

#### Poor Backtest Performance
- Review strategy logic
- Check for over-optimization
- Consider transaction costs
- Test on different market conditions

### Getting Help
- Check the console for detailed error messages
- Review sample algorithms for reference
- Test individual components separately
- Use simple strategies first, then add complexity

---

*This guide covers the fundamentals of algorithm creation in DayTradersPro. For advanced features and updates, refer to the application documentation and release notes.*
