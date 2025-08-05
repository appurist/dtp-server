<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-row align="center" no-gutters>
              <v-col>
                <h2 class="text-h5">Trading Chart</h2>
              </v-col>
              <v-col cols="auto">
                <v-btn-group variant="outlined" density="compact">
                  <v-btn
                    v-for="timeframe in timeframes"
                    :key="timeframe.value"
                    :color="selectedTimeframe === timeframe.value ? 'primary' : ''"
                    @click="selectedTimeframe = timeframe.value"
                    size="small"
                  >
                    {{ timeframe.label }}
                  </v-btn>
                </v-btn-group>
              </v-col>
            </v-row>
          </v-card-title>

          <v-card-text class="pa-2">
            <!-- Contract Selection -->
            <v-row class="mb-3">
              <v-col cols="12" sm="4">
                <v-select
                  v-model="selectedContract"
                  :items="contracts"
                  item-title="name"
                  item-value="id"
                  label="Contract"
                  density="compact"
                  @update:model-value="loadChart"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="barsToLoad"
                  label="Bars to Load"
                  type="number"
                  min="50"
                  max="2000"
                  density="compact"
                  @blur="loadChart"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-btn
                  :color="isConnected ? 'error' : 'success'"
                  :loading="connecting"
                  @click="toggleConnection"
                  block
                >
                  {{ isConnected ? 'Disconnect' : 'Connect Live Data' }}
                </v-btn>
              </v-col>
            </v-row>

            <!-- Chart Container -->
            <div
              ref="chartContainer"
              class="chart-container"
              :style="{ height: chartHeight + 'px' }"
            />

            <!-- Chart Controls -->
            <v-row class="mt-2">
              <v-col cols="12" sm="6">
                <v-slider
                  v-model="chartHeight"
                  :min="300"
                  :max="800"
                  label="Chart Height"
                  thumb-label
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-switch
                  v-model="showVolume"
                  label="Show Volume"
                  color="primary"
                  density="compact"
                  @update:model-value="updateChart"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Market Data Info -->
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Market Data</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>Last Price</v-list-item-title>
                <v-list-item-subtitle>{{ lastPrice || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Change</v-list-item-title>
                <v-list-item-subtitle :class="priceChangeColor">
                  {{ priceChange || 'N/A' }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Volume</v-list-item-title>
                <v-list-item-subtitle>{{ volume || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Connection Status</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip
                    :color="isConnected ? 'success' : 'error'"
                    size="small"
                    variant="outlined"
                  >
                    {{ isConnected ? 'Connected' : 'Disconnected' }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Chart Statistics</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>Bars Loaded</v-list-item-title>
                <v-list-item-subtitle>{{ chartStats.barsLoaded }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Date Range</v-list-item-title>
                <v-list-item-subtitle>{{ chartStats.dateRange }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>High</v-list-item-title>
                <v-list-item-subtitle>{{ chartStats.high }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Low</v-list-item-title>
                <v-list-item-subtitle>{{ chartStats.low }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Error/Success Messages -->
    <v-snackbar v-model="showMessage" :color="messageColor" timeout="3000">
      {{ message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts'
import { useConnectionStore } from '@/stores/connection'
import { storageService } from '@/services/storage'
import { tradingService } from '@/services/tradingService'

const connectionStore = useConnectionStore()

// Chart state
const chartContainer = ref(null)
const chart = ref(null)
const candlestickSeries = ref(null)
const volumeSeries = ref(null)

// UI state
const selectedContract = ref('MES')
const selectedTimeframe = ref('5m')
const barsToLoad = ref(200)
const chartHeight = ref(500)
const showVolume = ref(true)
const isConnected = ref(false)
const connecting = ref(false)

// Market data
const lastPrice = ref(null)
const priceChange = ref(null)
const volume = ref(null)

// Messages
const showMessage = ref(false)
const message = ref('')
const messageColor = ref('success')

// Available contracts (will be loaded from API)
const contracts = ref([
  { id: 'MES', name: 'E-mini S&P 500 (MES)' },
  { id: 'MNQ', name: 'Micro E-mini NASDAQ-100 (MNQ)' },
  { id: 'MYM', name: 'Micro E-mini Dow (MYM)' },
  { id: 'ES', name: 'E-mini S&P 500 (ES)' },
  { id: 'NQ', name: 'E-mini NASDAQ-100 (NQ)' },
  { id: 'YM', name: 'E-mini Dow (YM)' }
])

// Timeframes
const timeframes = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1D', value: '1D' }
]

// Chart statistics
const chartStats = computed(() => {
  if (!chart.value || !candlestickSeries.value) {
    return {
      barsLoaded: 0,
      dateRange: 'N/A',
      high: 'N/A',
      low: 'N/A'
    }
  }

  // This would be calculated from actual chart data
  return {
    barsLoaded: barsToLoad.value,
    dateRange: 'Last 200 bars',
    high: '4,580.25',
    low: '4,520.75'
  }
})

// Price change color
const priceChangeColor = computed(() => {
  if (!priceChange.value) return ''
  return priceChange.value.startsWith('+') ? 'text-success' : 'text-error'
})

// Methods
const loadContracts = async () => {
  try {
    const contractSymbols = ['MES', 'MNQ', 'MYM', 'ES', 'NQ', 'YM']
    const loadedContracts = []

    for (const symbol of contractSymbols) {
      try {
        const searchResults = await tradingService.searchContracts(symbol)
        if (searchResults && searchResults.length > 0) {
          const contract = searchResults[0] // Take the first result
          loadedContracts.push({
            id: symbol,
            name: contract.description || contract.name || `${symbol} Contract`,
            contractId: contract.id
          })
        } else {
          // Fallback if no results
          loadedContracts.push({
            id: symbol,
            name: `${symbol} Contract`,
            contractId: null
          })
        }
      } catch (error) {
        console.error(`Error loading contract ${symbol}:`, error)
        // Fallback for individual contract errors
        loadedContracts.push({
          id: symbol,
          name: `${symbol} Contract`,
          contractId: null
        })
      }
    }

    contracts.value = loadedContracts
  } catch (error) {
    console.error('Error loading contracts:', error)
    // Keep the default loading contracts if API fails
  }
}

const initializeChart = async () => {
  if (!chartContainer.value) {
    console.error('Chart container not found')
    return
  }

  try {
    console.log('Creating chart with container:', chartContainer.value)
    console.log('createChart function:', typeof createChart)

    chart.value = createChart(chartContainer.value, {
      width: chartContainer.value.clientWidth,
      height: chartHeight.value,
      layout: {
        background: { color: 'transparent' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#485c7b',
      },
      timeScale: {
        borderColor: '#485c7b',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    // Ensure chart is properly initialized before adding series
    if (!chart.value || typeof chart.value.addSeries !== 'function') {
      throw new Error('Chart not properly initialized')
    }

    // Add candlestick series
    candlestickSeries.value = chart.value.addSeries(CandlestickSeries, {
      upColor: '#4bffb5',
      downColor: '#ff4976',
      borderDownColor: '#ff4976',
      borderUpColor: '#4bffb5',
      wickDownColor: '#ff4976',
      wickUpColor: '#4bffb5',
    })

    // Add volume series if enabled
    if (showVolume.value) {
      volumeSeries.value = chart.value.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })
    }

    // Configure price scales
    chart.value.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.2,
      },
    })

    if (showVolume.value) {
      chart.value.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })
    }

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (chart.value && chartContainer.value) {
        chart.value.applyOptions({
          width: chartContainer.value.clientWidth,
          height: chartHeight.value,
        })
      }
    })
    resizeObserver.observe(chartContainer.value)

    await loadChart()
    await storageService.appendLog('chart', 'Chart initialized successfully')
  } catch (error) {
    console.error('Error initializing chart:', error)
    showErrorMessage('Failed to initialize chart')
  }
}

const loadChart = async () => {
  if (!candlestickSeries.value) return

  try {
    // Generate mock data for now
    const mockData = generateMockData(barsToLoad.value)

    candlestickSeries.value.setData(mockData.candles)

    if (volumeSeries.value && showVolume.value) {
      volumeSeries.value.setData(mockData.volume)
    }

    // Update market data
    if (mockData.candles.length > 0) {
      const lastBar = mockData.candles[mockData.candles.length - 1]
      lastPrice.value = lastBar.close.toFixed(2)
      const change = lastBar.close - lastBar.open
      priceChange.value = (change >= 0 ? '+' : '') + change.toFixed(2)
      volume.value = mockData.volume[mockData.volume.length - 1]?.value || 0
    }

    showSuccessMessage(`Loaded ${mockData.candles.length} bars for ${selectedContract.value}`)
    await storageService.appendLog('chart', `Chart data loaded: ${selectedContract.value}, ${barsToLoad.value} bars`)
  } catch (error) {
    console.error('Error loading chart data:', error)
    showErrorMessage('Failed to load chart data')
  }
}

const updateChart = async () => {
  if (!chart.value) return

  if (showVolume.value && !volumeSeries.value) {
    volumeSeries.value = chart.value.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    // Configure the volume price scale to be smaller
    const volumePriceScale = chart.value.priceScale('volume')
    volumePriceScale.applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    })

    // Reload chart data to populate the volume series
    await loadChart()
  } else if (!showVolume.value && volumeSeries.value) {
    chart.value.removeSeries(volumeSeries.value)
    volumeSeries.value = null
  }

  if (chart.value && chartContainer.value) {
    chart.value.applyOptions({
      height: chartHeight.value,
    })
  }
}

const toggleConnection = async () => {
  connecting.value = true

  try {
    if (isConnected.value) {
      await connectionStore.disconnectMarketData()
      isConnected.value = false
      showSuccessMessage('Disconnected from live data')
    } else {
      const success = await connectionStore.connectMarketData(
        selectedContract.value,
        handleLiveData
      )
      isConnected.value = success
      if (success) {
        showSuccessMessage('Connected to live data')
      } else {
        showErrorMessage('Failed to connect to live data')
      }
    }
  } catch (error) {
    console.error('Connection toggle error:', error)
    showErrorMessage('Connection error: ' + error.message)
  } finally {
    connecting.value = false
  }
}

const handleLiveData = (trades) => {
  if (!candlestickSeries.value || !trades || trades.length === 0) return

  // Update chart with live trade data
  trades.forEach(trade => {
    lastPrice.value = trade.price.toFixed(2)
    volume.value = trade.size

    // In a real implementation, you'd update the current bar or add new bars
    // For now, just update the display values
  })
}

const generateMockData = (count) => {
  const candles = []
  const volume = []
  let currentPrice = selectedContract.value === 'MES' ? 4550 :
                   selectedContract.value === 'MNQ' ? 15000 : 35000

  const now = new Date()
  const timeframeMinutes = selectedTimeframe.value === '1m' ? 1 :
                          selectedTimeframe.value === '5m' ? 5 :
                          selectedTimeframe.value === '15m' ? 15 :
                          selectedTimeframe.value === '1h' ? 60 :
                          selectedTimeframe.value === '4h' ? 240 : 1440

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * timeframeMinutes * 60 * 1000)
    const open = currentPrice
    const change = (Math.random() - 0.5) * 20
    const high = open + Math.abs(change) + Math.random() * 10
    const low = open - Math.abs(change) - Math.random() * 10
    const close = open + change

    candles.push({
      time: Math.floor(time.getTime() / 1000),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
    })

    volume.push({
      time: Math.floor(time.getTime() / 1000),
      value: Math.floor(Math.random() * 1000) + 100,
      color: close >= open ? '#4bffb5' : '#ff4976'
    })

    currentPrice = close
  }

  return { candles, volume }
}

const showSuccessMessage = (msg) => {
  message.value = msg
  messageColor.value = 'success'
  showMessage.value = true
}

const showErrorMessage = (msg) => {
  message.value = msg
  messageColor.value = 'error'
  showMessage.value = true
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  // TODO: Fix contract loading API endpoint
  // await loadContracts()
  await initializeChart()
})

onUnmounted(() => {
  if (isConnected.value) {
    connectionStore.disconnectMarketData()
  }
  if (chart.value) {
    chart.value.remove()
  }
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  background: #1e1e1e;
  border-radius: 4px;
}
</style>
