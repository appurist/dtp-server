<template>
  <div>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <h1 class="text-h4">{{ isEditing ? 'Edit Algorithm' : 'Create Algorithm' }}</h1>
            <p class="text-body-2 text-medium-emphasis">
              {{ isEditing ? `Editing: ${algorithm.name}` : 'Create a new trading algorithm' }}
            </p>
          </div>
          <div class="d-flex gap-4">
            <v-btn
              color="grey"
              prepend-icon="mdi-arrow-left"
              @click="goBack"
            >
              Back
            </v-btn>
            <v-btn
              color="success"
              prepend-icon="mdi-content-save"
              :disabled="!isFormValid"
              :loading="saving"
              @click="saveAlgorithm"
            >
              Save Algorithm
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <!-- Basic Information -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Basic Information</v-card-title>
          <v-card-text>
            <v-form ref="basicForm" v-model="basicFormValid">
              <v-text-field
                v-model="algorithm.name"
                label="Algorithm Name"
                :rules="nameRules"
                required
                variant="outlined"
                class="mb-3"
              />

              <v-text-field
                v-model="algorithm.version"
                label="Version"
                :rules="versionRules"
                required
                variant="outlined"
                class="mb-3"
              />

              <v-textarea
                v-model="algorithm.description"
                label="Description"
                :rules="descriptionRules"
                required
                variant="outlined"
                rows="4"
                class="mb-3"
              />

              <v-switch
                v-model="algorithm.favorite"
                label="Mark as favorite"
                color="amber"
              />
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Indicators -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Indicators</span>
            <v-btn
              color="primary"
              size="small"
              prepend-icon="mdi-plus"
              @click="showAddIndicatorDialog = true"
            >
              Add
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div v-if="algorithm.indicators.length === 0" class="text-center py-4">
              <v-icon size="48" color="grey-lighten-1">mdi-chart-line</v-icon>
              <p class="text-body-2 text-medium-emphasis mt-2">No indicators added</p>
            </div>

            <v-list v-else density="compact">
              <v-list-item
                v-for="(indicator, index) in algorithm.indicators"
                :key="index"
                class="px-0"
              >
                <template #prepend>
                  <v-icon color="info">mdi-chart-line</v-icon>
                </template>

                <v-list-item-title>{{ indicator.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ indicator.type }} ({{ Object.keys(indicator.parameters || {}).length }} params)
                </v-list-item-subtitle>

                <template #append>
                  <v-btn
                    icon="mdi-pencil"
                    size="x-small"
                    variant="text"
                    @click="editIndicator(index)"
                  />
                  <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeIndicator(index)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Conditions -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Trading Conditions</v-card-title>
          <v-card-text>
            <v-tabs v-model="conditionsTab" density="compact">
              <v-tab value="entry">Entry</v-tab>
              <v-tab value="exit">Exit</v-tab>
            </v-tabs>

            <v-tabs-window v-model="conditionsTab" class="mt-4">
              <v-tabs-window-item value="entry">
                <div class="d-flex justify-space-between align-center mb-3">
                  <span class="text-subtitle-2">Entry Conditions</span>
                  <v-btn
                    color="success"
                    size="small"
                    prepend-icon="mdi-plus"
                    @click="addCondition('entry')"
                  >
                    Add
                  </v-btn>
                </div>

                <div v-if="algorithm.entryConditions.length === 0" class="text-center py-4">
                  <v-icon size="48" color="grey-lighten-1">mdi-login</v-icon>
                  <p class="text-body-2 text-medium-emphasis mt-2">No entry conditions</p>
                </div>

                <v-list v-else density="compact">
                  <v-list-item
                    v-for="(condition, index) in algorithm.entryConditions"
                    :key="index"
                    class="px-0"
                  >
                    <template #prepend>
                      <v-icon color="success">mdi-login</v-icon>
                    </template>

                    <v-list-item-title>{{ condition.type }}</v-list-item-title>
                    <v-list-item-subtitle>{{ condition.description || 'No description' }}</v-list-item-subtitle>

                    <template #append>
                      <v-btn
                        icon="mdi-pencil"
                        size="x-small"
                        variant="text"
                        @click="editCondition('entry', index)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        size="x-small"
                        variant="text"
                        color="error"
                        @click="removeCondition('entry', index)"
                      />
                    </template>
                  </v-list-item>
                </v-list>
              </v-tabs-window-item>

              <v-tabs-window-item value="exit">
                <div class="d-flex justify-space-between align-center mb-3">
                  <span class="text-subtitle-2">Exit Conditions</span>
                  <v-btn
                    color="success"
                    size="small"
                    prepend-icon="mdi-plus"
                    @click="addCondition('exit')"
                  >
                    Add
                  </v-btn>
                </div>

                <div v-if="algorithm.exitConditions.length === 0" class="text-center py-4">
                  <v-icon size="48" color="grey-lighten-1">mdi-logout</v-icon>
                  <p class="text-body-2 text-medium-emphasis mt-2">No exit conditions</p>
                </div>

                <v-list v-else density="compact">
                  <v-list-item
                    v-for="(condition, index) in algorithm.exitConditions"
                    :key="index"
                    class="px-0"
                  >
                    <template #prepend>
                      <v-icon color="error">mdi-logout</v-icon>
                    </template>

                    <v-list-item-title>{{ condition.type }}</v-list-item-title>
                    <v-list-item-subtitle>{{ condition.description || 'No description' }}</v-list-item-subtitle>

                    <template #append>
                      <v-btn
                        icon="mdi-pencil"
                        size="x-small"
                        variant="text"
                        @click="editCondition('exit', index)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        size="x-small"
                        variant="text"
                        color="error"
                        @click="removeCondition('exit', index)"
                      />
                    </template>
                  </v-list-item>
                </v-list>
              </v-tabs-window-item>
            </v-tabs-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Indicator Dialog -->
    <v-dialog v-model="showAddIndicatorDialog" max-width="600px">
      <v-card>
        <v-card-title>Add Indicator</v-card-title>
        <v-card-text>
          <v-form ref="indicatorForm" v-model="indicatorFormValid">
            <v-text-field
              v-model="newIndicator.name"
              label="Indicator Name"
              :rules="[v => !!v || 'Name is required']"
              required
              variant="outlined"
              class="mb-3"
            />

            <v-select
              v-model="newIndicator.type"
              label="Indicator Type"
              :items="indicatorTypes"
              :rules="[v => !!v || 'Type is required']"
              required
              variant="outlined"
              class="mb-3"
            />

            <v-textarea
              v-model="newIndicator.description"
              label="Description"
              variant="outlined"
              rows="2"
              class="mb-3"
            />

            <!-- Dynamic parameters based on indicator type -->
            <div v-if="newIndicator.type">
              <h4 class="text-subtitle-1 mb-3">Parameters</h4>

              <!-- Show message if no parameters -->
              <div v-if="Object.keys(newIndicator.parameters).length === 0" class="text-center py-4">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-information-outline</v-icon>
                <p class="text-body-2 text-medium-emphasis">
                  This indicator requires no parameters.
                </p>
              </div>

              <!-- Parameter fields -->
              <div v-else>
                <div v-for="(paramValue, paramKey) in newIndicator.parameters" :key="paramKey" class="mb-3">
                  <!-- Number parameters -->
                  <v-text-field
                    v-if="isNumberParameter(paramKey)"
                    v-model.number="newIndicator.parameters[paramKey]"
                    :label="formatParameterLabel(paramKey)"
                    type="number"
                    :rules="getParameterRules(paramKey)"
                    variant="outlined"
                  />

                  <!-- Select parameters -->
                  <v-select
                    v-else-if="isSelectParameter(paramKey)"
                    v-model="newIndicator.parameters[paramKey]"
                    :label="formatParameterLabel(paramKey)"
                    :items="getParameterOptions(paramKey)"
                    variant="outlined"
                  />

                  <!-- Text parameters -->
                  <v-text-field
                    v-else
                    v-model="newIndicator.parameters[paramKey]"
                    :label="formatParameterLabel(paramKey)"
                    variant="outlined"
                  />
                </div>
              </div>


            </div>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="warning"
            @click="cancelAddIndicator"
          >
            Cancel
          </v-btn>
          <v-btn
            color="success"
            variant="tonal"
            :disabled="!indicatorFormValid"
            @click="saveIndicator"
            prepend-icon="mdi-plus"
          >
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Condition Dialog -->
    <v-dialog v-model="showAddConditionDialog" max-width="700px">
      <v-card>
        <v-card-title>{{ editingCondition ? 'Edit' : 'Add' }} {{ conditionType }} Condition</v-card-title>
        <v-card-text>
          <v-form ref="conditionForm" v-model="conditionFormValid">
            <v-select
              v-model="newCondition.type"
              label="Condition Type"
              :items="conditionTypes"
              :rules="[v => !!v || 'Type is required']"
              required
              variant="outlined"
              class="mb-3"
            />

            <v-select
              v-model="newCondition.side"
              label="Trading Side"
              :items="tradingSides"
              :rules="[v => !!v || 'Side is required']"
              required
              variant="outlined"
              class="mb-3"
            />

            <v-textarea
              v-model="newCondition.description"
              label="Description"
              variant="outlined"
              rows="2"
              class="mb-3"
            />

            <!-- Dynamic parameters based on condition type -->
            <div v-if="newCondition.type">
              <h4 class="text-subtitle-1 mb-3">Parameters</h4>
              <div v-if="newCondition.type === 'crossover'">
                <v-select
                  v-model="newCondition.parameters.source1"
                  label="First Source"
                  :items="availableIndicators"
                  variant="outlined"
                  class="mb-3"
                />
                <v-select
                  v-model="newCondition.parameters.source2"
                  label="Second Source"
                  :items="availableIndicators"
                  variant="outlined"
                  class="mb-3"
                />
                <v-select
                  v-model="newCondition.parameters.direction"
                  label="Direction"
                  :items="['above', 'below']"
                  variant="outlined"
                />
              </div>
              <div v-else-if="newCondition.type === 'threshold'">
                <v-select
                  v-model="newCondition.parameters.source"
                  label="Source"
                  :items="availableIndicators"
                  variant="outlined"
                  class="mb-3"
                />
                <v-select
                  v-model="newCondition.parameters.operator"
                  label="Operator"
                  :items="['>', '<', '>=', '<=', '==']"
                  variant="outlined"
                  class="mb-3"
                />
                <v-text-field
                  v-model.number="newCondition.parameters.value"
                  label="Threshold Value"
                  type="number"
                  variant="outlined"
                />
              </div>
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancelAddCondition">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!conditionFormValid"
            @click="saveCondition"
          >
            {{ editingCondition ? 'Update' : 'Add' }} Condition
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
import { useRoute, useRouter } from 'vue-router'
import { TradingAlgorithm, IndicatorConfig, TradingCondition } from '@/models/TradingAlgorithm.js'
import { storageService } from '@/services/storage.js'
import { apiService } from '@/services/apiService.js'

const route = useRoute()
const router = useRouter()

// Props
const algorithmId = route.params.id

// Data
const algorithm = ref(new TradingAlgorithm())
const isEditing = ref(false)
const saving = ref(false)
const basicFormValid = ref(false)
const conditionsTab = ref('entry')

// Indicator dialog
const showAddIndicatorDialog = ref(false)
const indicatorFormValid = ref(false)
const newIndicator = ref({
  name: '',
  type: '',
  description: '',
  parameters: {}
})


// Condition dialog
const showAddConditionDialog = ref(false)
const conditionFormValid = ref(false)
const conditionType = ref('entry')
const editingCondition = ref(false)
const editingConditionIndex = ref(-1)
const newCondition = ref({
  type: '',
  side: '',
  description: '',
  parameters: {}
})

// Messages
const showMessage = ref(false)
const message = ref('')
const messageColor = ref('success')

// Form validation rules
const nameRules = [
  v => !!v || 'Algorithm name is required',
  v => (v && v.length >= 3) || 'Name must be at least 3 characters',
  v => (v && v.length <= 50) || 'Name must be less than 50 characters'
]

const versionRules = [
  v => !!v || 'Version is required',
  v => /^\d+\.\d+$/.test(v) || 'Version must be in format X.Y (e.g., 1.0)'
]

const descriptionRules = [
  v => !!v || 'Description is required',
  v => (v && v.length >= 10) || 'Description must be at least 10 characters'
]

// Available options
const indicatorTypes = [
  'SMA', 'EMA', 'RSI', 'MACD', 'Bollinger Bands',
  'Stochastic', 'ATR', 'Volume', 'VWAP'
]

const conditionTypes = [
  'crossover', 'threshold', 'slope', 'divergence', 'pattern'
]

const tradingSides = [
  { title: 'Long', value: 'LONG' },
  { title: 'Short', value: 'SHORT' },
  { title: 'Both', value: 'BOTH' }
]

// Computed
const isFormValid = computed(() => {
  return basicFormValid.value &&
         algorithm.value.name &&
         algorithm.value.version &&
         algorithm.value.description
})

const availableIndicators = computed(() => {
  const indicators = algorithm.value.indicators.map(ind => ind.name)
  return ['median', 'close', 'open', 'high', 'low', 'volume', ...indicators]
})

// Parameter helper methods
const isNumberParameter = (paramKey) => {
  const numberParams = ['period', 'fastPeriod', 'slowPeriod', 'signalPeriod', 'kPeriod', 'dPeriod', 'stdDev', 'multiplier', 'length', 'periods']
  return numberParams.includes(paramKey)
}

const isSelectParameter = (paramKey) => {
  const selectParams = ['source', 'maType', 'priceType']
  return selectParams.includes(paramKey)
}

const formatParameterLabel = (paramKey) => {
  const labels = {
    period: 'Period',
    fastPeriod: 'Fast Period',
    slowPeriod: 'Slow Period',
    signalPeriod: 'Signal Period',
    kPeriod: 'K Period',
    dPeriod: 'D Period',
    stdDev: 'Standard Deviations',
    multiplier: 'Multiplier',
    source: 'Source',
    maType: 'MA Type',
    priceType: 'Price Type',
    length: 'Length',
    periods: 'Periods'
  }
  return labels[paramKey] || paramKey.charAt(0).toUpperCase() + paramKey.slice(1)
}

const getParameterRules = (paramKey) => {
  if (isNumberParameter(paramKey)) {
    return [v => v > 0 || `${formatParameterLabel(paramKey)} must be greater than 0`]
  }
  return []
}

const getParameterOptions = (paramKey) => {
  const options = {
    source: ['median', 'open', 'high', 'low', 'close', 'volume', 'hl2', 'hlc3', 'ohlc4'],
    maType: ['SMA', 'EMA', 'WMA'],
    priceType: ['median', 'close', 'hl2', 'hlc3', 'ohlc4']
  }
  return options[paramKey] || []
}

// Methods
const goBack = () => {
  router.push('/algorithms')
}

const saveAlgorithm = async () => {
  saving.value = true
  try {
    algorithm.value.lastModifiedTime = new Date().toISOString()
    if (!isEditing.value) {
      algorithm.value.createdTime = new Date().toISOString()
    }

    await storageService.saveAlgorithm(algorithm.value)

    showSuccessMessage(`Algorithm ${isEditing.value ? 'updated' : 'created'}: ${algorithm.value.name}`)
    await storageService.appendLog('algorithms', `${isEditing.value ? 'Updated' : 'Created'} algorithm: ${algorithm.value.name}`)

    // Navigate back to algorithms list after a short delay
    setTimeout(() => {
      router.push('/algorithms')
    }, 1500)
  } catch (error) {
    console.error('Error saving algorithm:', error)
    showErrorMessage('Failed to save algorithm')
  } finally {
    saving.value = false
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

// Indicator methods
const saveIndicator = () => {
  if (!indicatorFormValid.value) return

  // Set default parameters based on type
  if (!newIndicator.value.parameters.period &&
      (newIndicator.value.type === 'SMA' || newIndicator.value.type === 'EMA' || newIndicator.value.type === 'RSI')) {
    newIndicator.value.parameters.period = 14
  }
  if (!newIndicator.value.parameters.source &&
      (newIndicator.value.type === 'SMA' || newIndicator.value.type === 'EMA')) {
    newIndicator.value.parameters.source = 'close'
  }
  if (!newIndicator.value.parameters.stdDev && newIndicator.value.type === 'Bollinger Bands') {
    newIndicator.value.parameters.stdDev = 2
  }

  const indicator = new IndicatorConfig({
    name: newIndicator.value.name,
    type: newIndicator.value.type,
    description: newIndicator.value.description,
    parameters: { ...newIndicator.value.parameters }
  })

  algorithm.value.indicators.push(indicator)
  showSuccessMessage(`Indicator added: ${indicator.name}`)
  cancelAddIndicator()
}

const cancelAddIndicator = () => {
  showAddIndicatorDialog.value = false
  newIndicator.value = {
    name: '',
    type: '',
    description: '',
    parameters: {}
  }
}

const editIndicator = (index) => {
  // TODO: Implement indicator editing
  showInfoMessage('Indicator editing coming soon')
}

const removeIndicator = (index) => {
  const indicator = algorithm.value.indicators[index]
  algorithm.value.indicators.splice(index, 1)
  showSuccessMessage(`Indicator removed: ${indicator.name}`)
}

// Condition methods
const addCondition = (type) => {
  conditionType.value = type
  showAddConditionDialog.value = true
}

const saveCondition = () => {
  if (!conditionFormValid.value) return

  const condition = new TradingCondition({
    type: newCondition.value.type,
    side: newCondition.value.side,
    description: newCondition.value.description,
    parameters: { ...newCondition.value.parameters }
  })

  if (editingCondition.value) {
    // Update existing condition
    const conditions = conditionType.value === 'entry' ? algorithm.value.entryConditions : algorithm.value.exitConditions
    conditions[editingConditionIndex.value] = condition
    showSuccessMessage(`${conditionType.value} condition updated: ${condition.type}`)
  } else {
    // Add new condition
    if (conditionType.value === 'entry') {
      algorithm.value.entryConditions.push(condition)
    } else {
      algorithm.value.exitConditions.push(condition)
    }
    showSuccessMessage(`${conditionType.value} condition added: ${condition.type}`)
  }

  cancelAddCondition()
}

const cancelAddCondition = () => {
  showAddConditionDialog.value = false
  editingCondition.value = false
  editingConditionIndex.value = -1
  newCondition.value = {
    type: '',
    side: '',
    description: '',
    parameters: {}
  }
}

const editCondition = (type, index) => {
  const conditions = type === 'entry' ? algorithm.value.entryConditions : algorithm.value.exitConditions
  const condition = conditions[index]

  // Set editing mode
  editingCondition.value = true
  editingConditionIndex.value = index
  conditionType.value = type

  // Populate form with existing condition data
  newCondition.value = {
    type: condition.type,
    side: condition.side,
    description: condition.description,
    parameters: { ...condition.parameters }
  }

  showAddConditionDialog.value = true
}

const removeCondition = (type, index) => {
  if (type === 'entry') {
    const condition = algorithm.value.entryConditions[index]
    algorithm.value.entryConditions.splice(index, 1)
    showSuccessMessage(`Entry condition removed: ${condition.type}`)
  } else {
    const condition = algorithm.value.exitConditions[index]
    algorithm.value.exitConditions.splice(index, 1)
    showSuccessMessage(`Exit condition removed: ${condition.type}`)
  }
}

// Watchers
watch(() => newIndicator.value.type, (newType) => {
  // Reset parameters when indicator type changes
  newIndicator.value.parameters = {}

  // Set default parameters based on type
  switch (newType) {
    case 'SMA':
    case 'EMA':
      newIndicator.value.parameters = { period: 14, source: 'median' }
      break
    case 'RSI':
      newIndicator.value.parameters = { period: 14 }
      break
    case 'Bollinger Bands':
      newIndicator.value.parameters = { period: 20, stdDev: 2 }
      break
    case 'MACD':
      newIndicator.value.parameters = { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
      break
    case 'Stochastic':
      newIndicator.value.parameters = { kPeriod: 14, dPeriod: 3 }
      break
    case 'ATR':
      newIndicator.value.parameters = { period: 14 }
      break
    case 'Volume':
    case 'VWAP':
      // These indicators don't require parameters
      newIndicator.value.parameters = {}
      break
    default:
      // For unknown indicators, start with empty parameters
      newIndicator.value.parameters = {}
      break
  }
})

watch(() => newCondition.value.type, (newType) => {
  // Reset parameters when condition type changes
  newCondition.value.parameters = {}

  // Set default parameters based on type
  switch (newType) {
    case 'crossover':
      newCondition.value.parameters = { source1: '', source2: '', direction: 'above' }
      break
    case 'threshold':
      newCondition.value.parameters = { source: '', operator: '>', value: 0 }
      break
    case 'slope':
      newCondition.value.parameters = { source: '', direction: 'up', periods: 3 }
      break
  }
})

// Lifecycle
onMounted(async () => {
  if (algorithmId && algorithmId !== 'new') {
    // Load existing algorithm
    try {
      const result = await apiService.getAlgorithm(algorithmId)
      if (result.success) {
        algorithm.value = new TradingAlgorithm(result.algorithm)
        isEditing.value = true
      } else {
        showErrorMessage('Algorithm not found')
        router.push('/algorithms')
      }
    } catch (error) {
      console.error('Error loading algorithm:', error)
      showErrorMessage('Failed to load algorithm')
      router.push('/algorithms')
    }
  } else {
    // Create new algorithm
    algorithm.value = new TradingAlgorithm({
      name: '',
      description: '',
      version: '1.0',
      favorite: false,
      indicators: [],
      entryConditions: [],
      exitConditions: []
    })
  }
})
</script>
