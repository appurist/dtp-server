<template>
  <div>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1 class="text-h4">Trading Instances</h1>

          <div class="d-flex align-center gap-3">
            <v-btn
              color="success"
              prepend-icon="mdi-plus"
              @click="showCreateDialog = true"
            >
              Add Instance
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Instances List -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-row align="center">
              <v-col>
                <span>Active Trading Instances</span>
              </v-col>
              <v-col cols="auto">
                <v-btn-toggle
                  v-model="statusFilter"
                  variant="outlined"
                  density="compact"
                  multiple
                >
                  <v-btn value="RUNNING" size="small">
                    <v-icon>mdi-play-circle</v-icon>
                    Running
                  </v-btn>
                  <v-btn value="STOPPED" size="small">
                    <v-icon>mdi-stop-circle</v-icon>
                    Stopped
                  </v-btn>
                  <v-btn value="PAUSED" size="small">
                    <v-icon>mdi-pause-circle</v-icon>
                    Paused
                  </v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="filteredInstances"
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

            <template #item.mode="{ item }">
              <v-chip
                :color="getAccountModeColor(item.accountName)"
                size="small"
                variant="outlined"
              >
                <v-icon
                  :icon="getAccountModeIcon(item.accountName)"
                  size="small"
                  class="me-1"
                />
                {{ getAccountModeText(item.accountName) }}
              </v-chip>
            </template>

            <template #item.position="{ item }">
              <v-chip
                v-if="item.currentPosition && item.currentPosition.side !== 'NONE'"
                :color="item.currentPosition.side === 'LONG' ? 'success' : 'error'"
                size="small"
                variant="flat"
              >
                {{ item.currentPosition.side }}
              </v-chip>
              <v-chip v-else size="small" variant="outlined" color="grey">
                No Position
              </v-chip>
            </template>

            <template #item.pnl="{ item }">
              <div v-if="item.totalPnL !== undefined">
                <div :class="item.totalPnL >= 0 ? 'text-success' : 'text-error'">
                  <v-icon
                    :icon="item.totalPnL >= 0 ? 'mdi-trending-up' : 'mdi-trending-down'"
                    size="small"
                    class="me-1"
                  />
                  ${{ item.totalPnL.toFixed(2) }}
                </div>
                <div class="text-caption text-grey">
                  {{ item.totalTrades || 0 }} trades
                </div>
              </div>
              <span v-else class="text-grey">-</span>
            </template>

            <template #item.uptime="{ item }">
              {{ formatUptime(item) }}
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex">
                <v-tooltip v-if="item.status === 'STOPPED'" text="Start Instance" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-play"
                      size="small"
                      variant="text"
                      color="success"
                      @click="startInstance(item)"
                    />
                  </template>
                </v-tooltip>

                <v-tooltip v-if="item.status === 'RUNNING'" text="Pause Instance" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-pause"
                      size="small"
                      variant="text"
                      color="warning"
                      @click="pauseInstance(item)"
                    />
                  </template>
                </v-tooltip>

                <v-tooltip v-if="item.status === 'PAUSED'" text="Resume Instance" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-play"
                      size="small"
                      variant="text"
                      color="success"
                      @click="resumeInstance(item)"
                    />
                  </template>
                </v-tooltip>

                <v-tooltip v-if="item.status !== 'STOPPED'" text="Stop Instance" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-stop"
                      size="small"
                      variant="text"
                      color="error"
                      @click="stopInstance(item)"
                    />
                  </template>
                </v-tooltip>

                <v-tooltip text="View Details" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-chart-line"
                      size="small"
                      variant="text"
                      color="primary"
                      @click="viewDetails(item)"
                    />
                  </template>
                </v-tooltip>

                <v-tooltip text="Delete Instance" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      @click="deleteInstance(item)"
                    />
                  </template>
                </v-tooltip>
              </div>
            </template>

            <template #no-data>
              <div class="text-center py-8">
                <v-icon size="64" color="grey-lighten-1">mdi-robot</v-icon>
                <p class="text-h6 mt-4 mb-2">No trading instances found</p>
                <p class="text-body-2 text-grey">
                  Add your first trading instance to start automated trading
                </p>
                <v-btn
                  color="success"
                  prepend-icon="mdi-plus"
                  class="mt-4"
                  @click="showCreateDialog = true"
                >
                  Add Instance
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create Instance Dialog -->
    <v-dialog
      v-model="showCreateDialog"
      max-width="600px"
      persistent
    >
      <v-card>
        <v-card-title>
          <span class="text-h5">Create Trading Instance</span>
        </v-card-title>

        <v-card-text>
          <v-form ref="instanceForm" v-model="formValid">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="instanceData.name"
                  label="Instance Name"
                  :rules="nameRules"
                  required
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="instanceData.symbol"
                  :items="symbols"
                  label="Symbol"
                  :rules="symbolRules"
                  required
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="instanceData.algorithmName"
                  :items="algorithmNames"
                  label="Algorithm"
                  :rules="algorithmRules"
                  required
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="instanceData.simulationMode"
                  label="Simulate all trades"
                  color="info"
                  :messages="instanceData.simulationMode ? 'Safe mode - no real money at risk' : 'Live trading - real money will be used'"
                />
              </v-col>
            </v-row>

            <v-row v-if="instanceData.simulationMode">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="instanceData.startingCapital"
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
                  v-model.number="instanceData.commission"
                  label="Commission per Trade"
                  type="number"
                  prefix="$"
                  :rules="commissionRules"
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="instanceData.autoStart"
                  label="Start immediately after creation"
                  color="success"
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
            @click="createInstance"
          >
            Create Instance
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
import { ref, computed, onMounted, watch } from 'vue'

import { storageService } from '@/services/storage.js'
import { apiService } from '@/services/apiService.js'
import { instanceManagerService } from '@/services/instanceManager.js'
import { tradingService } from '@/services/tradingService.js'
import { useConnectionStore } from '@/stores/connection'
import { v4 as uuidv4 } from 'uuid'

// Commission fee defaults by symbol (TopstepX rates)
// Handles both standard CME symbols and TopstepX API symbolId formats
const COMMISSION_FEES = {
  // CME Equity Futures - Mini contracts
  'ES': 2.80,   'EES': 2.80,   // E-mini S&P 500
  'NQ': 2.80,   'ENQ': 2.80,   // E-mini NASDAQ 100
  'YM': 2.80,   'EYM': 2.80,   // Mini-DOW
  'RTY': 2.80,  'ERTY': 2.80,  // E-mini Russell 2000

  // CME Equity Futures - Micro contracts
  'MES': 0.74,  // Micro E-mini S&P
  'MNQ': 0.74,  // Micro E-mini NASDAQ 100
  'MYM': 0.74,  // Micro Mini-DOW
  'M2K': 0.74,  // Micro E-mini Russell 2000

  // CME NYMEX Futures
  'CL': 3.04,   'ECL': 3.04,   // Crude Oil
  'MCL': 1.04,  // Micro Crude Oil
  'NG': 3.20,   'ENG': 3.20,   // Natural Gas
  'QG': 1.04,   'EQG': 1.04,   // E-mini Natural Gas

  // CME Foreign Exchange Futures
  '6E': 3.24,   'E6E': 3.24,   // Euro FX
  '6C': 3.24,   'E6C': 3.24,   // Canadian Dollar
  '6J': 3.24,   'E6J': 3.24,   // Japanese Yen
  'M6E': 0.52,  // Micro EUR/USD

  // CME COMEX Futures
  'GC': 3.24,   'EGC': 3.24,   // Gold
  'MGC': 1.24,  // Micro Gold
  'SI': 3.24,   'ESI': 3.24,   // Silver
  'SIL': 2.04,  // Micro Silver
  'HG': 3.24,   'EHG': 3.24,   // Copper
  'MHG': 1.24,  // Micro Copper

  // Default fallback
  'DEFAULT': 2.80
}

// Helper function to get commission fee
const getCommissionFee = (symbol) => {
  // Remove common prefixes and suffixes for lookup
  const cleanSymbol = symbol
    .replace(/^F\.US\./, '')  // Remove TopstepX API prefix
    .replace(/\.[UZH]\d+$/, '') // Remove contract month suffix
    .toUpperCase()

  return COMMISSION_FEES[cleanSymbol] || COMMISSION_FEES['DEFAULT']
}

// Trading Instance Model
class TradingInstance {
  constructor(data = {}) {
    this.id = data.id || uuidv4()
    this.name = data.name || ''
    this.symbol = data.symbol || ''
    this.algorithmName = data.algorithmName || ''
    this.accountName = data.accountName || 'PRACTICE123456789' // Default to practice account
    this.status = data.status || 'STOPPED' // RUNNING, STOPPED, PAUSED
    this.simulationMode = data.simulationMode !== undefined ? data.simulationMode : true
    this.startingCapital = data.startingCapital || 10000
    this.commission = data.commission || 2.80
    this.createdAt = data.createdAt || new Date().toISOString()
    this.startedAt = data.startedAt || null
    this.stoppedAt = data.stoppedAt || null
    this.currentPosition = data.currentPosition || { side: 'NONE', quantity: 0, entryPrice: 0 }
    this.totalPnL = data.totalPnL || 0
    this.totalTrades = data.totalTrades || 0
    this.lastSignalTime = data.lastSignalTime || null
  }
}

// Stores
const connectionStore = useConnectionStore()

// Data
const instances = ref([])
const loading = ref(false)
const creating = ref(false)
const statusFilter = ref(['RUNNING', 'STOPPED', 'PAUSED'])

// Dialog state
const showCreateDialog = ref(false)
const formValid = ref(false)

// Form data
const instanceData = ref({
  name: '',
  symbol: 'MES',
  algorithmName: '',
  simulationMode: true,
  startingCapital: 10000,
  commission: getCommissionFee('MES'), // Auto-set based on default symbol
  autoStart: false
})

// Messages
const showMessage = ref(false)
const message = ref('')
const messageColor = ref('success')

// Options
const symbols = ['MES', 'MNQ', 'MYM', 'ES', 'NQ', 'YM', 'CL', 'MCL', 'NG', 'GC', 'MGC', 'SI', 'HG', '6E', '6C', '6J']
const algorithmNames = ref([])

// Table headers
const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Symbol', key: 'symbol', sortable: true },
  { title: 'Algorithm', key: 'algorithmName', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Mode', key: 'mode', sortable: false },
  { title: 'Position', key: 'position', sortable: false },
  { title: 'P&L', key: 'pnl', sortable: false },
  { title: 'Uptime', key: 'uptime', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, width: '200px' }
]

// Form validation rules
const nameRules = [
  v => !!v || 'Instance name is required',
  v => (v && v.length >= 1) || 'Name must be at least 1 character'
]

const symbolRules = [
  v => !!v || 'Symbol is required'
]

const algorithmRules = [
  v => !!v || 'Algorithm is required'
]

const capitalRules = [
  v => v !== null && v !== undefined && v !== '' || 'Starting capital is required',
  v => v > 0 || 'Starting capital must be greater than 0'
]

const commissionRules = [
  v => v >= 0 || 'Commission cannot be negative'
]

// Computed
const filteredInstances = computed(() => {
  return instances.value.filter(instance =>
    statusFilter.value.includes(instance.status)
  )
})

// Methods
const loadInstances = async () => {
  loading.value = true
  try {
    const result = await apiService.getInstances()
    if (result.success) {
      instances.value = result.instances.map(data => new TradingInstance(data))
      await storageService.appendLog('instances', `Loaded ${instances.value.length} trading instances`)
    } else {
      console.error('Failed to load instances:', result.error)
      showErrorMessage('Failed to load trading instances')
    }
  } catch (error) {
    console.error('Error loading instances:', error)
    showErrorMessage('Failed to load trading instances')
  } finally {
    loading.value = false
  }
}

const loadAlgorithms = async () => {
  try {
    console.log('Loading algorithms from server...')
    const result = await apiService.getAlgorithms()
    console.log('Algorithm load result:', result)

    if (result.success && result.algorithms && result.algorithms.length > 0) {
      algorithmNames.value = result.algorithms.map(algo => algo.name)
      console.log('Loaded algorithm names:', algorithmNames.value)
      await storageService.appendLog('algorithms', `Loaded ${algorithmNames.value.length} algorithms from server`)
    } else {
      console.warn('No algorithms found on server, using fallback list')
      // Fallback algorithm names
      algorithmNames.value = ['MACD Momentum', 'Momentum Strategy', 'RSI Mean Reversion', 'SMA Crossover', 'Trend-Persistence']
      await storageService.appendLog('algorithms', `Using fallback algorithms: ${algorithmNames.value.length} algorithms`)
    }
  } catch (error) {
    console.error('Error loading algorithms:', error)
    // Fallback on error
    algorithmNames.value = ['MACD Momentum', 'Momentum Strategy', 'RSI Mean Reversion', 'SMA Crossover', 'Trend-Persistence']
    await storageService.appendLog('algorithms', `Algorithm load failed, using fallback: ${error.message}`)
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'RUNNING': return 'success'
    case 'STARTING': return 'info'
    case 'STOPPED': return 'error'
    case 'PAUSED': return 'warning'
    default: return 'grey'
  }
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'RUNNING': return 'mdi-play-circle'
    case 'STARTING': return 'mdi-loading'
    case 'STOPPED': return 'mdi-stop-circle'
    case 'PAUSED': return 'mdi-pause-circle'
    default: return 'mdi-help-circle'
  }
}

const getAccountModeColor = (accountName) => {
  return accountName && accountName.startsWith('PRACTICE') ? 'info' : 'warning'
}

const getAccountModeIcon = (accountName) => {
  return accountName && accountName.startsWith('PRACTICE') ? 'mdi-school' : 'mdi-currency-usd'
}

const getAccountModeText = (accountName) => {
  return accountName && accountName.startsWith('PRACTICE') ? 'PRACTICE' : 'REAL'
}

const formatUptime = (instance) => {
  if (!instance.startedAt || instance.status === 'STOPPED') return '-'

  const start = new Date(instance.startedAt)
  const end = instance.stoppedAt ? new Date(instance.stoppedAt) : new Date()
  const duration = end - start

  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

const createInstance = async () => {
  creating.value = true
  try {
    const newInstance = new TradingInstance({
      name: instanceData.value.name,
      symbol: instanceData.value.symbol,
      algorithmName: instanceData.value.algorithmName,
      simulationMode: instanceData.value.simulationMode,
      startingCapital: instanceData.value.startingCapital,
      commission: instanceData.value.commission
    })

    if (instanceData.value.autoStart) {
      newInstance.status = 'RUNNING'
      newInstance.startedAt = new Date().toISOString()
    }

    // Save to server
    await apiService.updateInstance(newInstance.id, newInstance)

    instances.value.push(newInstance)
    showSuccessMessage(`Trading instance created: ${newInstance.name}`)

    await storageService.appendLog('instances', `Created instance: ${newInstance.name}`)

    if (instanceData.value.autoStart) {
      showSuccessMessage(`Instance started: ${newInstance.name}`)
      await storageService.appendLog('instances', `Started instance: ${newInstance.name}`)
    }

    cancelCreate()

  } catch (error) {
    console.error('Error creating instance:', error)
    showErrorMessage(`Failed to create instance: ${error.message}`)
  } finally {
    creating.value = false
  }
}

const startInstance = async (instance) => {
  try {
    // Check if ProjectX connection is available, try to connect if possible
    console.log('Starting instance - checking connection status...')
    console.log('isConnected:', tradingService.isConnected.value)
    console.log('canConnect:', true) // Server manages connection

    if (!tradingService.isConnected.value) {
      // Server manages connection - just test server connectivity
      try {
        console.log('Attempting to authenticate...')
        showInfoMessage('Authenticating with ProjectX...')
        const testResult = await connectionStore.testConnection()
        console.log('Test connection result:', testResult)
        if (!testResult.success) {
          throw new Error(testResult.message)
        }
      } catch (authError) {
        console.error('Authentication failed:', authError)
        showErrorMessage(`Authentication failed: ${authError.message}. Please check your connection settings.`)
        return
      }
    } else {
      console.log('Already connected, proceeding with instance start')
    }

    // Update status to starting
    instance.status = 'STARTING'
    await apiService.updateInstance(instance.id, instance)

    // Load the algorithm from server
    const algorithmResult = await apiService.getAlgorithm(instance.algorithmName)
    if (!algorithmResult.success) {
      throw new Error(`Failed to load algorithm: ${instance.algorithmName}`)
    }

    // Create instance configuration for the manager
    const instanceConfig = {
      id: instance.id,
      name: instance.name,
      symbol: instance.symbol,
      algorithmName: instance.algorithmName,
      simulationMode: instance.simulationMode,
      startingCapital: instance.startingCapital,
      commission: instance.commission
    }

    // Start the instance using the instance manager
    const managedInstance = await instanceManagerService.createInstance(instanceConfig)
    const success = await instanceManagerService.startInstance(managedInstance.id, algorithmResult.algorithm)

    if (success) {
      // Update our local instance
      instance.status = 'RUNNING'
      instance.startedAt = new Date().toISOString()
      instance.stoppedAt = null

      // Save to server
      await apiService.updateInstance(instance.id, instance)

      showSuccessMessage(`Instance started: ${instance.name}`)
      await storageService.appendLog('instances', `Started instance: ${instance.name}`)
    } else {
      throw new Error('Failed to start instance in manager')
    }
  } catch (error) {
    console.error('Error starting instance:', error)
    instance.status = 'STOPPED'
    await apiService.updateInstance(instance.id, instance)
    showErrorMessage(`Failed to start instance: ${error.message}`)
  }
}

const pauseInstance = async (instance) => {
  try {
    // Pause the managed instance
    const success = await instanceManagerService.pauseInstance(instance.id)

    if (success) {
      instance.status = 'PAUSED'

      // Save to server
      await apiService.updateInstance(instance.id, instance)

      showSuccessMessage(`Instance paused: ${instance.name}`)
      await storageService.appendLog('instances', `Paused instance: ${instance.name}`)
    } else {
      throw new Error('Failed to pause managed instance')
    }
  } catch (error) {
    console.error('Error pausing instance:', error)
    showErrorMessage(`Failed to pause instance: ${error.message}`)
  }
}

const resumeInstance = async (instance) => {
  try {
    // Resume the managed instance
    const success = await instanceManagerService.resumeInstance(instance.id)

    if (success) {
      instance.status = 'RUNNING'

      // Save to server
      await apiService.updateInstance(instance.id, instance)

      showSuccessMessage(`Instance resumed: ${instance.name}`)
      await storageService.appendLog('instances', `Resumed instance: ${instance.name}`)
    } else {
      throw new Error('Failed to resume managed instance')
    }
  } catch (error) {
    console.error('Error resuming instance:', error)
    showErrorMessage(`Failed to resume instance: ${error.message}`)
  }
}

const stopInstance = async (instance) => {
  try {
    // Stop the managed instance first
    const success = await instanceManagerService.stopInstance(instance.id)

    if (success) {
      // Update our local instance
      instance.status = 'STOPPED'
      instance.stoppedAt = new Date().toISOString()

      // Close any open positions in simulation mode
      if (instance.simulationMode && instance.currentPosition && instance.currentPosition.side !== 'NONE') {
        instance.currentPosition = { side: 'NONE', quantity: 0, entryPrice: 0 }
      }

      // Save to server
      await apiService.updateInstance(instance.id, instance)

      const message = instance.simulationMode && instance.currentPosition && instance.currentPosition.side === 'NONE'
        ? `Instance stopped and position closed: ${instance.name}`
        : `Instance stopped: ${instance.name}`

      showSuccessMessage(message)
      await storageService.appendLog('instances', `Stopped instance: ${instance.name}`)
    } else {
      throw new Error('Failed to stop managed instance')
    }
  } catch (error) {
    console.error('Error stopping instance:', error)
    // Force stop the local instance even if manager fails
    instance.status = 'STOPPED'
    instance.stoppedAt = new Date().toISOString()
    await apiService.updateInstance(instance.id, instance)
    showErrorMessage(`Failed to stop instance cleanly: ${error.message}`)
  }
}

const viewDetails = (instance) => {
  // TODO: Navigate to instance detail view
  console.log('View instance details:', instance.name)
  showInfoMessage(`Viewing details for: ${instance.name}`)
}

const deleteInstance = async (instance) => {
  if (instance.status === 'RUNNING' || instance.status === 'STARTING') {
    showErrorMessage('Cannot delete a running or starting instance. Stop it first.')
    return
  }

  if (confirm(`Are you sure you want to delete "${instance.name}"?`)) {
    try {
      // Remove from instance manager if it exists
      instanceManagerService.removeInstance(instance.id)

      // Delete from server
      const result = await apiService.deleteInstance(instance.id)
      if (result.success) {
        // Remove from local array
        const index = instances.value.findIndex(i => i.id === instance.id)
        if (index > -1) {
          instances.value.splice(index, 1)
          showSuccessMessage(`Instance deleted: ${instance.name}`)
          await storageService.appendLog('instances', `Deleted instance: ${instance.name}`)
        }
      } else {
        throw new Error(result.error || 'Failed to delete instance from server')
      }
    } catch (error) {
      console.error('Error deleting instance:', error)
      showErrorMessage('Failed to delete instance')
    }
  }
}

const cancelCreate = () => {
  showCreateDialog.value = false
  instanceData.value = {
    name: '',
    symbol: 'MES',
    algorithmName: '',
    simulationMode: true,
    startingCapital: 10000,
    commission: getCommissionFee('MES'), // Auto-set based on default symbol
    autoStart: false
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

const showInfoMessage = (msg) => {
  message.value = msg
  messageColor.value = 'info'
  showMessage.value = true
}

// Watchers
watch(() => instanceData.value.symbol, (newSymbol) => {
  if (newSymbol) {
    instanceData.value.commission = getCommissionFee(newSymbol)
  }
})

// Lifecycle
onMounted(async () => {
  try {
    // Initialize instance manager service
    await instanceManagerService.initialize()

    // Load data
    await loadAlgorithms()
    await loadInstances()
  } catch (error) {
    console.error('Error initializing instances view:', error)
    showErrorMessage('Failed to initialize instance management')
  }
})
</script>
