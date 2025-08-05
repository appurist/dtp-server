<template>
  <div>
    <v-card>
      <v-card-title>
        <v-icon class="mr-2">mdi-speedometer</v-icon>
        Performance Settings
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="formValid">
          <!-- Data Management -->
          <v-row>
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">
                  <v-icon class="mr-2">mdi-database</v-icon>
                  Data Management
                </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.maxHistoricalDays"
                        label="Max Historical Days"
                        type="number"
                        :rules="[rules.required, rules.positive]"
                        prepend-icon="mdi-calendar-range"
                        suffix="days"
                        hint="Maximum days of historical data to keep"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.dataCleanupInterval"
                        label="Cleanup Interval"
                        type="number"
                        :rules="[rules.required, rules.positive]"
                        prepend-icon="mdi-broom"
                        suffix="hours"
                        hint="How often to clean up old data"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.maxLogFiles"
                        label="Max Log Files"
                        type="number"
                        :rules="[rules.required, rules.positive]"
                        prepend-icon="mdi-file-document-multiple"
                        suffix="files"
                        hint="Maximum number of log files to keep"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- UI Performance -->
          <v-row class="mt-4">
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">
                  <v-icon class="mr-2">mdi-monitor</v-icon>
                  UI Performance
                </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-switch
                        v-model="settings.autoRefresh"
                        label="Auto Refresh"
                        color="primary"
                        hint="Automatically refresh data displays"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-switch
                        v-model="settings.enableAnimations"
                        label="Enable Animations"
                        color="primary"
                        hint="Enable UI animations and transitions"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.refreshInterval"
                        label="Refresh Interval"
                        type="number"
                        :disabled="!settings.autoRefresh"
                        :rules="settings.autoRefresh ? [rules.required, rules.positive] : []"
                        prepend-icon="mdi-refresh"
                        suffix="ms"
                        hint="Data refresh interval in milliseconds"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.maxChartPoints"
                        label="Max Chart Points"
                        type="number"
                        :rules="[rules.required, rules.positive]"
                        prepend-icon="mdi-chart-line"
                        suffix="points"
                        hint="Maximum data points to display on charts"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.tablePageSize"
                        label="Table Page Size"
                        type="number"
                        :rules="[rules.required, rules.positive]"
                        prepend-icon="mdi-table"
                        suffix="rows"
                        hint="Number of rows per page in data tables"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Memory Management -->
          <v-row class="mt-4">
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">
                  <v-icon class="mr-2">mdi-memory</v-icon>
                  Memory Management
                </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-switch
                        v-model="settings.enableMemoryOptimization"
                        label="Memory Optimization"
                        color="primary"
                        hint="Enable automatic memory optimization"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-switch
                        v-model="settings.enableGarbageCollection"
                        label="Garbage Collection"
                        color="primary"
                        hint="Enable periodic garbage collection"
                        persistent-hint
                      />
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.memoryThreshold"
                        label="Memory Threshold"
                        type="number"
                        :disabled="!settings.enableMemoryOptimization"
                        :rules="settings.enableMemoryOptimization ? [rules.required, rules.positive] : []"
                        prepend-icon="mdi-gauge"
                        suffix="MB"
                        hint="Memory usage threshold for optimization"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="settings.gcInterval"
                        label="GC Interval"
                        type="number"
                        :disabled="!settings.enableGarbageCollection"
                        :rules="settings.enableGarbageCollection ? [rules.required, rules.positive] : []"
                        prepend-icon="mdi-timer"
                        suffix="minutes"
                        hint="Garbage collection interval"
                        persistent-hint
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-select
                        v-model="settings.performanceMode"
                        label="Performance Mode"
                        :items="performanceModes"
                        :rules="[rules.required]"
                        prepend-icon="mdi-rocket"
                        hint="Overall performance optimization level"
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
  // Data Management
  maxHistoricalDays: 30,
  dataCleanupInterval: 24,
  maxLogFiles: 10,

  // UI Performance
  autoRefresh: true,
  enableAnimations: true,
  refreshInterval: 5000,
  maxChartPoints: 1000,
  tablePageSize: 50,

  // Memory Management
  enableMemoryOptimization: true,
  enableGarbageCollection: true,
  memoryThreshold: 512,
  gcInterval: 15,
  performanceMode: 'balanced'
}

// Settings
const settings = ref({ ...defaultSettings })

// Options
const performanceModes = [
  { title: 'High Performance', value: 'high' },
  { title: 'Balanced', value: 'balanced' },
  { title: 'Power Saver', value: 'power_saver' }
]

// Messages
const showSuccess = ref(false)
const successMessage = ref('')
const showError = ref(false)
const errorMessage = ref('')

// Validation rules
const rules = {
  required: value => value !== null && value !== undefined && value !== '' || 'This field is required',
  positive: value => value > 0 || 'Must be greater than 0'
}

// Load settings on mount
onMounted(async () => {
  await loadSettings()
})

const loadSettings = async () => {
  try {
    // Performance settings are now client-side UI preferences
const saved = storageService.getLocal('performanceSettings', {})
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
    storageService.setLocal('performanceSettings', settings.value)
    successMessage.value = 'Performance settings saved successfully'
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
