<template>
  <div>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">DayTradersPro Dashboard</h1>
      </v-col>
    </v-row>

    <!-- Server Status -->
    <v-row>
      <v-col cols="12">
        <ServerStatus />
      </v-col>
    </v-row>

    <!-- Connection Status Card -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-connection</v-icon>
            Connection Status
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6">
                <v-chip
                  :color="tradingService.isAuthenticated ? 'success' : 'error'"
                  variant="outlined"
                  class="mb-2"
                >
                  <v-icon start>
                    {{ tradingService.isAuthenticated ? 'mdi-check-circle' : 'mdi-close-circle' }}
                  </v-icon>
                  {{ tradingService.isAuthenticated ? 'Authenticated' : 'Not Authenticated' }}
                </v-chip>
              </v-col>
              <v-col cols="6">
                <v-chip
                  :color="websocketService.isConnected ? 'success' : 'warning'"
                  variant="outlined"
                  class="mb-2"
                >
                  <v-icon start>
                    {{ websocketService.isConnected ? 'mdi-wifi' : 'mdi-wifi-off' }}
                  </v-icon>
                  {{ websocketService.isConnected ? 'Server Connected' : 'Server Disconnected' }}
                </v-chip>
              </v-col>
            </v-row>

            <div v-if="tradingService.credentials?.username" class="mt-2">
              <strong>User:</strong> {{ tradingService.credentials.username }}
            </div>

            <div v-if="tradingService.serverStatus" class="mt-1">
              <strong>Server Status:</strong> {{ tradingService.serverStatus }}
            </div>

            <v-alert
              v-if="hasConnectionError"
              type="error"
              variant="outlined"
              class="mt-3"
              closable
              @click:close="tradingService.connectionError = null"
            >
              {{ connectionErrorMessage }}
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn
              v-if="!tradingService.isAuthenticated"
              color="primary"
              @click="testConnection"
            >
              Test Connection
            </v-btn>
            <v-btn
              v-else
              color="error"
              @click="disconnect"
            >
              Disconnect
            </v-btn>
            <v-btn
              color="secondary"
              to="/connection"
            >
              Settings
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- System Info Card -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-information</v-icon>
            System Information
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>Platform</v-list-item-title>
                <v-list-item-subtitle>{{ systemInfo.platform }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Environment</v-list-item-title>
                <v-list-item-subtitle>{{ systemInfo.environment }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="systemInfo.dataPath">
                <v-list-item-title>Data Directory</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">{{ systemInfo.dataPath }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Storage Type</v-list-item-title>
                <v-list-item-subtitle>{{ systemInfo.storageType }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Actions -->
    <v-row class="mt-4">
      <v-col cols="12">
        <h2 class="text-h5 mb-3">Quick Actions</h2>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="text-center" hover @click="$router.push('/chart')">
          <v-card-text>
            <v-icon size="48" color="primary" class="mb-2">mdi-chart-line</v-icon>
            <div class="text-h6">Open Chart</div>
            <div class="text-caption">View market data and charts</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="text-center" hover @click="$router.push('/algorithms')">
          <v-card-text>
            <v-icon size="48" color="success" class="mb-2">mdi-robot</v-icon>
            <div class="text-h6">Algorithms</div>
            <div class="text-caption">Manage trading algorithms</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="text-center" hover @click="$router.push('/instances')">
          <v-card-text>
            <v-icon size="48" color="warning" class="mb-2">mdi-play-circle</v-icon>
            <div class="text-h6">Instances</div>
            <div class="text-caption">Live trading instances</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="text-center" hover @click="$router.push('/backtesting')">
          <v-card-text>
            <v-icon size="48" color="info" class="mb-2">mdi-history</v-icon>
            <div class="text-h6">Backtesting</div>
            <div class="text-caption">Test algorithm performance</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { storageService } from '@/services/storage'
import { tradingService } from '@/services/tradingService'
import { websocketService } from '@/services/websocketService'
import ServerStatus from '@/components/ServerStatus.vue'

// System information
const systemInfo = ref({
  platform: 'Unknown',
  environment: 'Web',
  dataPath: null,
  storageType: 'localStorage'
})

// Computed properties
const hasConnectionError = computed(() => {
  const error = tradingService.connectionError.value
  return error && String(error).trim().length > 0
})

const connectionErrorMessage = computed(() => {
  const error = tradingService.connectionError.value
  if (!error) return ''
  const errorStr = String(error).trim()
  return errorStr || 'Connection error occurred (no details available)'
})

// Methods
const testConnection = async () => {
  try {
    console.log('[Dashboard] Testing connection...')
    const result = await tradingService.checkServerConnection()
    console.log('[Dashboard] Connection test result:', result)
  } catch (error) {
    console.error('Connection test failed:', error)
  }
}

const clearError = () => {
  console.log('[Dashboard] Clearing connection error:', tradingService.connectionError.value)
  tradingService.connectionError.value = null
}

const disconnect = async () => {
  await tradingService.disconnect()
}

// Initialize
onMounted(async () => {
  try {
    // Get system info
    if (window.electronAPI) {
      systemInfo.value.platform = window.electronAPI.platform || 'Unknown'
      systemInfo.value.environment = 'Electron Desktop App'
      systemInfo.value.dataPath = await storageService.getDataPath()
      systemInfo.value.storageType = 'File System + localStorage'
    } else {
      systemInfo.value.platform = navigator.platform || 'Web Browser'
      systemInfo.value.environment = 'Web Application'
      systemInfo.value.storageType = 'localStorage only'
    }

    await storageService.appendLog('dashboard', 'Dashboard loaded')
  } catch (error) {
    console.error('Dashboard initialization error:', error)
  }
})
</script>

<style scoped>
.v-card {
  transition: transform 0.2s;
}

.v-card:hover {
  transform: translateY(-2px);
}
</style>
