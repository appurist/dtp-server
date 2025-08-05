<template>
  <div>
    <v-row>
      <v-col cols="12">
        <p class="text-body-1 text-center">
          Configure your user application preferences.
        </p>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="8">
        <!-- Appearance Settings -->
        <v-card class="mb-4">
          <v-card-title>Appearance</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <v-select v-model="settings.theme" :items="themeOptions" label="Theme" prepend-icon="mdi-palette"
                  @update:model-value="updateTheme" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-switch v-model="settings.compactMode" label="Compact Mode" color="primary"
                  @update:model-value="saveSettings" />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Data & Storage Settings -->
        <v-card class="mb-4">
          <v-card-title>Data & Storage</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <div class="mb-3">
                  <strong>Data Directory:</strong>
                  <div class="text-caption">{{ dataPath || 'Loading...' }}</div>
                </div>
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field v-model="settings.maxLogFiles" label="Max Log Files" type="number" min="1" max="100"
                  prepend-icon="mdi-file-document" @blur="saveSettings" />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field v-model="settings.maxLogSizeMB" label="Max Log Size (MB)" type="number" min="1" max="1000"
                  prepend-icon="mdi-harddisk" @blur="saveSettings" />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-switch v-model="settings.enableDebugLogging" label="Enable Debug Logging" color="primary"
                  @update:model-value="saveSettings" />
                <div class="text-caption">
                  Enables detailed logging for troubleshooting (may impact performance)
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Trading Settings -->
        <v-card class="mb-4">
          <v-card-title>Trading</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="settings.defaultContractSize" label="Default Contract Size" type="number" min="1"
                  prepend-icon="mdi-chart-line" @blur="saveSettings" />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field v-model="settings.maxPositionSize" label="Max Position Size" type="number" min="1"
                  prepend-icon="mdi-shield-check" @blur="saveSettings" />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-switch v-model="settings.confirmOrders" label="Confirm Orders Before Placing" color="primary"
                  @update:model-value="saveSettings" />
              </v-col>

              <v-col cols="12">
                <v-switch v-model="settings.enableSafetyLimits" label="Enable Safety Limits" color="primary"
                  @update:model-value="saveSettings" />
                <div class="text-caption">
                  Prevents orders that exceed configured risk limits
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Performance Settings -->
        <v-card>
          <v-card-title>Performance</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="settings.chartUpdateInterval" label="Chart Update Interval (ms)" type="number"
                  min="100" max="5000" prepend-icon="mdi-timer" @blur="saveSettings" />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field v-model="settings.maxChartBars" label="Max Chart Bars" type="number" min="100" max="10000"
                  prepend-icon="mdi-chart-bar" @blur="saveSettings" />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-switch v-model="settings.enableHardwareAcceleration" label="Enable Hardware Acceleration"
                  color="primary" @update:model-value="saveSettings" />
                <div class="text-caption">
                  Uses GPU for better chart rendering performance
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <!-- Actions Card -->
        <v-card class="mb-4">
          <v-card-title>Actions</v-card-title>
          <v-card-text>
            <v-row class="justify-space-between mt-1 mb-3">
              <v-btn color="primary" class="" @click="exportSettings">
                <v-icon start>mdi-export</v-icon>
                Export
              </v-btn>

              <v-btn color="secondary" class="" @click="importSettings">
                <v-icon start>mdi-import</v-icon>
                Import
              </v-btn>

              <v-btn color="warning" class="" @click="resetSettings">
                <v-icon start>mdi-restore</v-icon>
                Reset to Defaults
              </v-btn>
            </v-row>

            <v-row class="justify-space-between">
              <v-btn block color="error" @click="clearAllData">
                <v-icon start>mdi-delete</v-icon>
                Clear All Data
              </v-btn>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Storage Info Card -->
        <v-card>
          <v-card-title>Storage Information</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>Storage Type</v-list-item-title>
                <v-list-item-subtitle>{{ storageInfo.type }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <v-list-item-title>Settings Size</v-list-item-title>
                <v-list-item-subtitle>{{ storageInfo.settingsSize }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <v-list-item-title>Total Items</v-list-item-title>
                <v-list-item-subtitle>{{ storageInfo.totalItems }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="400">
      <v-card>
        <v-card-title>{{ confirmDialog.title }}</v-card-title>
        <v-card-text>{{ confirmDialog.message }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showConfirmDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDialog.action">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success/Error Messages -->
    <v-snackbar v-model="showMessage" :color="messageColor" timeout="3000">
      {{ message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import { storageService } from '@/services/storage'

const theme = useTheme()

// Default settings
const defaultSettings = {
  theme: 'dark',
  compactMode: false,
  maxLogFiles: 10,
  maxLogSizeMB: 50,
  enableDebugLogging: false,
  defaultContractSize: 1,
  maxPositionSize: 10,
  confirmOrders: true,
  enableSafetyLimits: true,
  chartUpdateInterval: 250,
  maxChartBars: 1000,
  enableHardwareAcceleration: true
}

// State
const settings = ref({ ...defaultSettings })
const dataPath = ref('')
const showConfirmDialog = ref(false)
const confirmDialog = ref({ title: '', message: '', action: null })
const showMessage = ref(false)
const message = ref('')
const messageColor = ref('success')

// Theme options
const themeOptions = [
  { title: 'Dark', value: 'dark' },
  { title: 'Light', value: 'light' }
]

// Storage info
const storageInfo = computed(() => {
  // Storage keys are for UI information display only
const keys = storageService.getLocal('__keys__', [])
  const settingsStr = JSON.stringify(settings.value)

  return {
    type: window.electronAPI ? 'File System + localStorage' : 'localStorage only',
    settingsSize: `${Math.round(settingsStr.length / 1024 * 100) / 100} KB`,
    totalItems: keys.length
  }
})

// Methods
const loadSettings = () => {
  // App settings are client-side UI preferences
const saved = storageService.getLocal('appSettings', {})
  settings.value = { ...defaultSettings, ...saved }
}

const saveSettings = () => {
  storageService.setLocal('appSettings', settings.value)
  showSuccessMessage('Settings saved successfully')
}

const updateTheme = (newTheme) => {
  theme.change(newTheme)
  storageService.setLocal('theme', newTheme)
  saveSettings()
}

const exportSettings = async () => {
  try {
    const data = {
      settings: settings.value,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }

    if (window.electronAPI) {
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: 'daytraders-pro-settings.json',
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      })

      if (!result.canceled) {
        await storageService.writeFile(result.filePath, JSON.stringify(data, null, 2))
        showSuccessMessage('Settings exported successfully')
      }
    } else {
      // Web fallback - download as file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'daytraders-pro-settings.json'
      a.click()
      URL.revokeObjectURL(url)
      showSuccessMessage('Settings exported successfully')
    }
  } catch (error) {
    console.error('Export error:', error)
    showErrorMessage('Failed to export settings')
  }
}

const importSettings = async () => {
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.showOpenDialog({
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const fileResult = await storageService.readFile(result.filePaths[0])
        if (fileResult.success) {
          const data = JSON.parse(fileResult.content)
          if (data.settings) {
            settings.value = { ...defaultSettings, ...data.settings }
            saveSettings()
            updateTheme(settings.value.theme)
            showSuccessMessage('Settings imported successfully')
          }
        }
      }
    } else {
      // Web fallback - file input
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              const data = JSON.parse(e.target.result)
              if (data.settings) {
                settings.value = { ...defaultSettings, ...data.settings }
                saveSettings()
                updateTheme(settings.value.theme)
                showSuccessMessage('Settings imported successfully')
              }
            } catch (error) {
              showErrorMessage('Invalid settings file')
            }
          }
          reader.readAsText(file)
        }
      }
      input.click()
    }
  } catch (error) {
    console.error('Import error:', error)
    showErrorMessage('Failed to import settings')
  }
}

const resetSettings = () => {
  confirmDialog.value = {
    title: 'Reset Settings',
    message: 'Are you sure you want to reset all settings to defaults? This cannot be undone.',
    action: () => {
      settings.value = { ...defaultSettings }
      saveSettings()
      updateTheme(settings.value.theme)
      showConfirmDialog.value = false
      showSuccessMessage('Settings reset to defaults')
    }
  }
  showConfirmDialog.value = true
}

const clearAllData = () => {
  confirmDialog.value = {
    title: 'Clear All Data',
    message: 'Are you sure you want to clear ALL application data? This will remove settings, algorithms, instances, and logs. This cannot be undone.',
    action: async () => {
      try {
        storageService.clearLocal()
        settings.value = { ...defaultSettings }
        showConfirmDialog.value = false
        showSuccessMessage('All data cleared successfully')

        // Log the action
        await storageService.appendLog('app', 'All application data cleared by user')
      } catch (error) {
        console.error('Clear data error:', error)
        showErrorMessage('Failed to clear all data')
      }
    }
  }
  showConfirmDialog.value = true
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

// Initialize
onMounted(async () => {
  loadSettings()

  if (window.electronAPI) {
    dataPath.value = await storageService.getDataPath()
  }
})
</script>
