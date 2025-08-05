<template>
  <div>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1 class="text-h4">Backtesting</h1>
          <v-btn
            color="success"
            prepend-icon="mdi-plus"
            @click="showCreateDialog = true"
          >
            Add Backtest
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Backtests List -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-row align="center">
              <v-col>
                <span>Backtest Results</span>
              </v-col>
              <v-col cols="auto">
                <v-btn-toggle
                  v-model="statusFilter"
                  variant="outlined"
                  density="compact"
                  multiple
                >
                  <v-btn value="COMPLETED" size="small">
                    <v-icon>mdi-check-circle</v-icon>
                    Completed
                  </v-btn>
                  <v-btn value="RUNNING" size="small">
                    <v-icon>mdi-play-circle</v-icon>
                    Running
                  </v-btn>
                  <v-btn value="FAILED" size="small">
                    <v-icon>mdi-alert-circle</v-icon>
                    Failed
                  </v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="filteredBacktests"
            :loading="loading"
            item-key="id"
            class="elevation-0"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status)"
                size="small"
                variant="flat"
              >
                <v-icon
                  :icon="getStatusIcon(item.status)"
                  size="small"
                  class="me-1"
                />
                {{ item.status }}
              </v-chip>
            </template>

            <template #item.progress="{ item }">
              <div v-if="item.status === 'RUNNING'" class="d-flex align-center">
                <v-progress-linear
                  :model-value="item.progress"
                  height="6"
                  color="primary"
                  class="me-2"
                  style="min-width: 100px"
                />
                <span class="text-caption">{{ Math.round(item.progress) }}%</span>
              </div>
              <span v-else class="text-grey">-</span>
            </template>

            <template #item.performance="{ item }">
              <div v-if="item.results">
                <div class="d-flex align-center">
                  <v-icon
                    :icon="item.results.totalPnL >= 0 ? 'mdi-trending-up' : 'mdi-trending-down'"
                    :color="item.results.totalPnL >= 0 ? 'success' : 'error'"
                    size="small"
                    class="me-1"
                  />
                  <span :class="item.results.totalPnL >= 0 ? 'text-success' : 'text-error'">
                    ${{ item.results.totalPnL.toFixed(2) }}
                  </span>
                </div>
                <div class="text-caption text-grey">
                  {{ item.results.winRate.toFixed(1) }}% win rate
                </div>
              </div>
              <span v-else class="text-grey">-</span>
            </template>

            <template #item.duration="{ item }">
              {{ formatDuration(item) }}
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex gap-1">
                <v-btn
                  v-if="item.status === 'RUNNING'"
                  icon="mdi-stop"
                  size="small"
                  variant="text"
                  color="warning"
                  @click="stopBacktest(item)"
                />
                <v-btn
                  v-if="item.status === 'COMPLETED'"
                  icon="mdi-chart-line"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="viewResults(item)"
                />
                <v-btn
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="cloneBacktest(item)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="deleteBacktest(item)"
                />
              </div>
            </template>

            <template #no-data>
              <div class="text-center py-8">
                <v-icon size="64" color="grey-lighten-1">mdi-chart-timeline-variant</v-icon>
                <p class="text-h6 mt-4 mb-2">No backtests found</p>
                <p class="text-body-2 text-grey">
                  Run your first backtest to analyze algorithm performance
                </p>
                <v-btn
                  color="success"
                  prepend-icon="mdi-plus"
                  class="mt-4"
                  @click="showCreateDialog = true"
                >
                  Add Backtest
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create Backtest Dialog -->
    <v-dialog
      v-model="showCreateDialog"
      max-width="600px"
      persistent
    >
      <v-card>
        <v-card-title>
          <span class="text-h5">Create New Backtest</span>
        </v-card-title>

        <v-card-text>
          <v-form ref="backtestForm" v-model="formValid">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="backtestData.name"
                  label="Backtest Name"
                  :rules="nameRules"
                  required
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="backtestData.symbol"
                  :items="symbols"
                  label="Symbol"
                  :rules="symbolRules"
                  required
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="backtestData.algorithmName"
                  :items="algorithmNames"
                  label="Algorithm"
                  :rules="algorithmRules"
                  required
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="backtestData.startDate"
                  label="Start Date"
                  type="date"
                  :rules="startDateRules"
                  required
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="backtestData.endDate"
                  label="End Date"
                  type="date"
                  :rules="endDateRules"
                  required
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="backtestData.startingCapital"
                  label="Starting Capital"
                  type="number"
                  prefix="$"
                  :rules="capitalRules"
                  required
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="backtestData.commission"
                  label="Commission per Trade"
                  type="number"
                  prefix="$"
                  :rules="commissionRules"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            text
            @click="cancelCreate"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!formValid"
            :loading="creating"
            @click="createBacktest"
          >
            Run Backtest
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Results Dialog -->
    <v-dialog
      v-model="showResultsDialog"
      max-width="1200px"
    >
      <v-card v-if="selectedBacktest">
        <v-card-title>
          <span class="text-h5">{{ selectedBacktest.name }} - Results</span>
        </v-card-title>

        <v-card-text>
          <v-row v-if="selectedBacktest.results">
            <!-- Performance Summary -->
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title>Performance Summary</v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="6" md="3">
                      <div class="text-center">
                        <div class="text-h4" :class="selectedBacktest.results.totalPnL >= 0 ? 'text-success' : 'text-error'">
                          ${{ selectedBacktest.results.totalPnL.toFixed(2) }}
                        </div>
                        <div class="text-caption text-grey">Total P&L</div>
                      </div>
                    </v-col>
                    <v-col cols="6" md="3">
                      <div class="text-center">
                        <div class="text-h4 text-primary">
                          {{ selectedBacktest.results.winRate.toFixed(1) }}%
                        </div>
                        <div class="text-caption text-grey">Win Rate</div>
                      </div>
                    </v-col>
                    <v-col cols="6" md="3">
                      <div class="text-center">
                        <div class="text-h4 text-info">
                          {{ selectedBacktest.results.totalTrades }}
                        </div>
                        <div class="text-caption text-grey">Total Trades</div>
                      </div>
                    </v-col>
                    <v-col cols="6" md="3">
                      <div class="text-center">
                        <div class="text-h4 text-warning">
                          {{ selectedBacktest.results.profitFactor.toFixed(2) }}
                        </div>
                        <div class="text-caption text-grey">Profit Factor</div>
                      </div>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Detailed Metrics -->
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Trade Statistics</v-card-title>
                <v-card-text>
                  <v-list density="compact">
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="success">mdi-trending-up</v-icon>
                      </template>
                      <v-list-item-title>Winning Trades</v-list-item-title>
                      <template #append>
                        <span>{{ selectedBacktest.results.winningTrades }}</span>
                      </template>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="error">mdi-trending-down</v-icon>
                      </template>
                      <v-list-item-title>Losing Trades</v-list-item-title>
                      <template #append>
                        <span>{{ selectedBacktest.results.losingTrades }}</span>
                      </template>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="primary">mdi-calculator</v-icon>
                      </template>
                      <v-list-item-title>Average P&L</v-list-item-title>
                      <template #append>
                        <span>${{ selectedBacktest.results.averagePnL.toFixed(2) }}</span>
                      </template>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="success">mdi-arrow-up-bold</v-icon>
                      </template>
                      <v-list-item-title>Average Win</v-list-item-title>
                      <template #append>
                        <span>${{ selectedBacktest.results.averageWin.toFixed(2) }}</span>
                      </template>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="error">mdi-arrow-down-bold</v-icon>
                      </template>
                      <v-list-item-title>Average Loss</v-list-item-title>
                      <template #append>
                        <span>${{ selectedBacktest.results.averageLoss.toFixed(2) }}</span>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Risk Metrics</v-card-title>
                <v-card-text>
                  <v-list density="compact">
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="warning">mdi-trending-down</v-icon>
                      </template>
                      <v-list-item-title>Max Drawdown</v-list-item-title>
                      <template #append>
                        <span>${{ selectedBacktest.results.maxDrawdown.toFixed(2) }}</span>
                      </template>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="warning">mdi-percent</v-icon>
                      </template>
                      <v-list-item-title>Max Drawdown %</v-list-item-title>
                      <template #append>
                        <span>{{ selectedBacktest.results.maxDrawdownPercent.toFixed(2) }}%</span>
                      </template>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="info">mdi-trophy</v-icon>
                      </template>
                      <v-list-item-title>Largest Win</v-list-item-title>
                      <template #append>
                        <span>${{ selectedBacktest.results.largestWin.toFixed(2) }}</span>
                      </template>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="error">mdi-alert</v-icon>
                      </template>
                      <v-list-item-title>Largest Loss</v-list-item-title>
                      <template #append>
                        <span>${{ selectedBacktest.results.largestLoss.toFixed(2) }}</span>
                      </template>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="primary">mdi-cash</v-icon>
                      </template>
                      <v-list-item-title>Total Commission</v-list-item-title>
                      <template #append>
                        <span>${{ selectedBacktest.results.totalCommission.toFixed(2) }}</span>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            text
            @click="showResultsDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success/Error Messages -->
    <v-snackbar
      v-model="showMessage"
      :color="messageColor"
      :timeout="3000"
    >
      {{ message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { BacktestingService } from '@/services/backtesting.js'
import { apiService } from '@/services/apiService.js'
import { storageService } from '@/services/storage.js'

// Services
const backtestingService = new BacktestingService()

// Data
const backtests = ref([])
const loading = ref(false)
const creating = ref(false)
const statusFilter = ref(['COMPLETED', 'RUNNING', 'FAILED'])

// Dialog state
const showCreateDialog = ref(false)
const showResultsDialog = ref(false)
const selectedBacktest = ref(null)
const formValid = ref(false)

// Form data
const backtestData = ref({
  name: '',
  symbol: 'MES',
  algorithmName: '',
  startDate: '',
  endDate: '',
  startingCapital: 10000,
  commission: 2.50
})

// Messages
const showMessage = ref(false)
const message = ref('')
const messageColor = ref('success')

// Options
const symbols = ['MES', 'MNQ', 'MYM', 'ES', 'NQ', 'YM']
const algorithmNames = ref([])

// Table headers
const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Symbol', key: 'symbol', sortable: true },
  { title: 'Algorithm', key: 'algorithmName', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Progress', key: 'progress', sortable: false },
  { title: 'Performance', key: 'performance', sortable: false },
  { title: 'Duration', key: 'duration', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '150px' }
]

// Form validation rules
const nameRules = [
  v => !!v || 'Backtest name is required',
  v => (v && v.length >= 3) || 'Name must be at least 3 characters'
]

const symbolRules = [
  v => !!v || 'Symbol is required'
]

const algorithmRules = [
  v => !!v || 'Algorithm is required'
]

const startDateRules = [
  v => !!v || 'Start date is required',
  v => new Date(v) <= new Date() || 'Start date cannot be in the future'
]

const endDateRules = [
  v => !!v || 'End date is required',
  v => new Date(v) <= new Date() || 'End date cannot be in the future',
  v => !backtestData.value.startDate || new Date(v) > new Date(backtestData.value.startDate) || 'End date must be after start date'
]

const capitalRules = [
  v => v !== null && v !== undefined && v !== '' || 'Starting capital is required',
  v => v > 0 || 'Starting capital must be greater than 0'
]

const commissionRules = [
  v => v >= 0 || 'Commission cannot be negative'
]

// Computed
const filteredBacktests = computed(() => {
  return backtests.value.filter(backtest =>
    statusFilter.value.includes(backtest.status)
  )
})

// Methods
const loadBacktests = async () => {
  loading.value = true
  try {
    const allBacktests = backtestingService.getAllBacktests()
    backtests.value = allBacktests

    await storageService.appendLog('backtesting', `Loaded ${backtests.value.length} backtests`)
  } catch (error) {
    console.error('Error loading backtests:', error)
    showErrorMessage('Failed to load backtests')
  } finally {
    loading.value = false
  }
}

const loadAlgorithms = async () => {
  try {
    const result = await apiService.getAlgorithms()
    if (result.success) {
      algorithmNames.value = result.algorithms.map(algo => algo.name)
    } else {
      console.error('Failed to load algorithms:', result.error)
      algorithmNames.value = []
    }
  } catch (error) {
    console.error('Error loading algorithms:', error)
    algorithmNames.value = []
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'COMPLETED': return 'success'
    case 'RUNNING': return 'primary'
    case 'FAILED': return 'error'
    case 'STOPPED': return 'warning'
    default: return 'grey'
  }
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'COMPLETED': return 'mdi-check-circle'
    case 'RUNNING': return 'mdi-play-circle'
    case 'FAILED': return 'mdi-alert-circle'
    case 'STOPPED': return 'mdi-stop-circle'
    default: return 'mdi-help-circle'
  }
}

const formatDuration = (backtest) => {
  if (!backtest.startedAt) return '-'

  const start = new Date(backtest.startedAt)
  const end = backtest.completedAt ? new Date(backtest.completedAt) : new Date()
  const duration = end - start

  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

const createBacktest = async () => {
  creating.value = true
  try {
    // Get the selected algorithm from storage
    const result = await storageService.listAlgorithms()
    if (!result.success) {
      throw new Error('Failed to load algorithms')
    }

    const algorithm = result.algorithms.find(a => a.name === backtestData.value.algorithmName)
    if (!algorithm) {
      throw new Error('Selected algorithm not found')
    }

    // Create and run the backtest
    const backtest = await backtestingService.runQuickBacktest(
      {
        name: backtestData.value.name,
        symbol: backtestData.value.symbol,
        algorithmName: backtestData.value.algorithmName,
        startDate: backtestData.value.startDate,
        endDate: backtestData.value.endDate,
        startingCapital: backtestData.value.startingCapital,
        commission: backtestData.value.commission
      },
      algorithm,
      (progress) => {
        // Update progress in real-time
        const index = backtests.value.findIndex(b => b.id === progress.id)
        if (index > -1) {
          backtests.value[index] = progress
        }
      },
      (completed) => {
        // Backtest completed
        const index = backtests.value.findIndex(b => b.id === completed.id)
        if (index > -1) {
          backtests.value[index] = completed
        }
        showSuccessMessage(`Backtest completed: ${completed.name}`)
      }
    )

    backtests.value.push(backtest)
    showSuccessMessage(`Backtest started: ${backtest.name}`)
    cancelCreate()

  } catch (error) {
    console.error('Error creating backtest:', error)
    showErrorMessage(`Failed to create backtest: ${error.message}`)
  } finally {
    creating.value = false
  }
}

const stopBacktest = async (backtest) => {
  try {
    const stopped = backtestingService.stopBacktest(backtest.id)
    if (stopped) {
      showSuccessMessage(`Backtest stopped: ${backtest.name}`)
      await loadBacktests()
    }
  } catch (error) {
    console.error('Error stopping backtest:', error)
    showErrorMessage('Failed to stop backtest')
  }
}

const viewResults = (backtest) => {
  selectedBacktest.value = backtest
  showResultsDialog.value = true
}

const cloneBacktest = (backtest) => {
  backtestData.value = {
    name: `${backtest.name} (Copy)`,
    symbol: backtest.symbol,
    algorithmName: backtest.algorithmName,
    startDate: backtest.startDate,
    endDate: backtest.endDate,
    startingCapital: backtest.startingCapital,
    commission: backtest.commission
  }
  showCreateDialog.value = true
}

const deleteBacktest = async (backtest) => {
  if (confirm(`Are you sure you want to delete "${backtest.name}"?`)) {
    try {
      backtestingService.deleteBacktest(backtest.id)
      await loadBacktests()
      showSuccessMessage(`Backtest deleted: ${backtest.name}`)
    } catch (error) {
      console.error('Error deleting backtest:', error)
      showErrorMessage('Failed to delete backtest')
    }
  }
}

const cancelCreate = () => {
  showCreateDialog.value = false
  backtestData.value = {
    name: '',
    symbol: 'MES',
    algorithmName: '',
    startDate: '',
    endDate: '',
    startingCapital: 10000,
    commission: 2.50
  }
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

// Set default dates
const setDefaultDates = () => {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 3) // 3 months ago

  backtestData.value.endDate = end.toISOString().split('T')[0]
  backtestData.value.startDate = start.toISOString().split('T')[0]
}

// Lifecycle
onMounted(() => {
  loadAlgorithms()
  loadBacktests()
  setDefaultDates()
})
</script>
