<template>
  <div>
    <v-card>
      <v-card-title>
        <v-icon class="mr-2">mdi-chart-line</v-icon>
        Trading Settings
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="formValid">
          <!-- Risk Management -->
          <v-row>
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">
                  <v-icon class="mr-2">mdi-shield-check</v-icon>
                  Risk Management
                </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.maxPositionSize"
                        label="Max Position Size"
                        type="number"
                        :rules="[rules.required, rules.positive]"
                        prepend-icon="mdi-scale-balance"
                        suffix="contracts"
                        hint="Maximum number of contracts per position"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.riskPerTrade"
                        label="Risk Per Trade"
                        type="number"
                        step="0.01"
                        :rules="[rules.required, rules.percentage]"
                        prepend-icon="mdi-percent"
                        suffix="%"
                        hint="Maximum risk per trade as percentage of account"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.maxDailyLoss"
                        label="Max Daily Loss"
                        type="number"
                        :rules="[rules.required, rules.positive]"
                        prepend-icon="mdi-trending-down"
                        prefix="$"
                        hint="Maximum daily loss limit"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Order Management -->
          <v-row class="mt-4">
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">
                  <v-icon class="mr-2">mdi-clipboard-list</v-icon>
                  Order Management
                </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-switch
                        v-model="settings.confirmOrders"
                        label="Confirm Orders"
                        color="primary"
                        hint="Require confirmation before placing orders"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-switch
                        v-model="settings.enableStopLoss"
                        label="Enable Stop Loss"
                        color="primary"
                        hint="Automatically set stop loss orders"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.defaultStopLoss"
                        label="Default Stop Loss"
                        type="number"
                        step="0.25"
                        :disabled="!settings.enableStopLoss"
                        :rules="settings.enableStopLoss ? [rules.required, rules.positive] : []"
                        prepend-icon="mdi-stop"
                        suffix="points"
                        hint="Default stop loss distance in points"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.defaultTakeProfit"
                        label="Default Take Profit"
                        type="number"
                        step="0.25"
                        :rules="[rules.positive]"
                        prepend-icon="mdi-target"
                        suffix="points"
                        hint="Default take profit distance in points"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-select
                        v-model="settings.orderType"
                        label="Default Order Type"
                        :items="orderTypes"
                        :rules="[rules.required]"
                        prepend-icon="mdi-format-list-bulleted"
                        hint="Default order type for new trades"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Algorithm Settings -->
          <v-row class="mt-4">
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">
                  <v-icon class="mr-2">mdi-robot</v-icon>
                  Algorithm Settings
                </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-switch
                        v-model="settings.enableAlgorithms"
                        label="Enable Algorithms"
                        color="primary"
                        hint="Allow automated trading algorithms"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-switch
                        v-model="settings.paperTradingMode"
                        label="Paper Trading Mode"
                        color="warning"
                        hint="Execute trades in simulation mode only"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.maxAlgorithmInstances"
                        label="Max Algorithm Instances"
                        type="number"
                        :disabled="!settings.enableAlgorithms"
                        :rules="settings.enableAlgorithms ? [rules.required, rules.positive] : []"
                        prepend-icon="mdi-counter"
                        hint="Maximum number of concurrent algorithm instances"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.algorithmTimeout"
                        label="Algorithm Timeout"
                        type="number"
                        :disabled="!settings.enableAlgorithms"
                        :rules="settings.enableAlgorithms ? [rules.required, rules.positive] : []"
                        prepend-icon="mdi-timer"
                        suffix="seconds"
                        hint="Timeout for algorithm execution"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-select
                        v-model="settings.defaultSymbol"
                        label="Default Symbol"
                        :items="symbols"
                        :rules="[rules.required]"
                        prepend-icon="mdi-chart-candlestick"
                        hint="Default trading symbol"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-btn
          color="secondary"
          variant="outlined"
          @click="resetToDefaults"
        >
          <v-icon start>mdi-restore</v-icon>
          Reset to Defaults
        </v-btn>

        <v-spacer />

        <v-btn
          color="primary"
          :disabled="!formValid || saving"
          :loading="saving"
          @click="saveSettings"
        >
          <v-icon start>mdi-content-save</v-icon>
          Save Settings
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-snackbar v-model="showSuccess" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>

    <v-snackbar v-model="showError" color="error" timeout="5000">
      {{ errorMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storageService } from '@/services/storage'

// Form state
const form = ref(null)
const formValid = ref(false)
const saving = ref(false)

// Default settings
const defaultSettings = {
  // Risk Management
  maxPositionSize: 10,
  riskPerTrade: 2.0,
  maxDailyLoss: 1000,

  // Order Management
  confirmOrders: true,
  enableStopLoss: true,
  defaultStopLoss: 10,
  defaultTakeProfit: 20,
  orderType: 'Market',

  // Algorithm Settings
  enableAlgorithms: false,
  paperTradingMode: true,
  maxAlgorithmInstances: 3,
  algorithmTimeout: 30,
  defaultSymbol: 'NQ'
}

// Settings
const settings = ref({ ...defaultSettings })

// Options
const orderTypes = [
  { title: 'Market', value: 'Market' },
  { title: 'Limit', value: 'Limit' },
  { title: 'Stop', value: 'Stop' },
  { title: 'Stop Limit', value: 'StopLimit' }
]

const symbols = [
  { title: 'NQ (Nasdaq 100)', value: 'NQ' },
  { title: 'ES (S&P 500)', value: 'ES' },
  { title: 'YM (Dow Jones)', value: 'YM' },
  { title: 'RTY (Russell 2000)', value: 'RTY' },
  { title: 'CL (Crude Oil)', value: 'CL' },
  { title: 'GC (Gold)', value: 'GC' }
]

// Messages
const showSuccess = ref(false)
const successMessage = ref('')
const showError = ref(false)
const errorMessage = ref('')

// Validation rules
const rules = {
  required: value => value !== null && value !== undefined && value !== '' || 'This field is required',
  positive: value => value > 0 || 'Must be greater than 0',
  percentage: value => value >= 0 && value <= 100 || 'Must be between 0 and 100'
}

// Load settings on mount
onMounted(async () => {
  await loadSettings()
})

const loadSettings = async () => {
  try {
    // Trading settings are now client-side UI preferences
const saved = storageService.getLocal('tradingSettings', {})
    settings.value = { ...defaultSettings, ...saved }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
}

const resetToDefaults = () => {
  settings.value = { ...defaultSettings }
  successMessage.value = 'Settings reset to defaults'
  showSuccess.value = true
}

const saveSettings = async () => {
  if (!form.value?.validate()) {
    return
  }

  saving.value = true
  try {
    storageService.setLocal('tradingSettings', settings.value)
    successMessage.value = 'Trading settings saved successfully'
    showSuccess.value = true
  } catch (error) {
    console.error('Error saving settings:', error)
    errorMessage.value = error.message || 'Failed to save settings'
    showError.value = true
  } finally {
    saving.value = false
  }
}
</script>
