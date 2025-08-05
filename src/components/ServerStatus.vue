<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2">mdi-server</v-icon>
      Server Status
      <v-spacer></v-spacer>
      <v-btn
        icon="mdi-refresh"
        size="small"
        variant="text"
        @click="refreshStatus"
        :loading="loading"
      ></v-btn>
    </v-card-title>

    <v-card-text>
      <v-row>
        <!-- Client Connection Status -->
        <v-col cols="12" md="6">
          <div class="text-subtitle-2 mb-2">Client Connection</div>
          <div class="d-flex align-center mb-2">
            <v-chip
              :color="clientStatus.api ? 'success' : 'error'"
              size="small"
              class="me-2"
            >
              <v-icon start>{{ clientStatus.api ? 'mdi-check' : 'mdi-close' }}</v-icon>
              API {{ clientStatus.api ? 'Connected' : 'Disconnected' }}
            </v-chip>
          </div>
          <div class="d-flex align-center mb-2">
            <v-chip
              :color="clientStatus.websocket ? 'success' : 'error'"
              size="small"
              class="me-2"
            >
              <v-icon start>{{ clientStatus.websocket ? 'mdi-check' : 'mdi-close' }}</v-icon>
              WebSocket {{ clientStatus.websocket ? 'Connected' : 'Disconnected' }}
            </v-chip>
          </div>
          <div class="text-caption text-medium-emphasis">
            Server: {{ serverInfo.host }}:{{ serverInfo.port }}
          </div>
        </v-col>

        <!-- Server Status -->
        <v-col cols="12" md="6">
          <div class="text-subtitle-2 mb-2">Server Status</div>
          <div class="d-flex align-center mb-2">
            <v-chip
              :color="serverStatus.running ? 'success' : 'error'"
              size="small"
              class="me-2"
            >
              <v-icon start>{{ serverStatus.running ? 'mdi-check' : 'mdi-close' }}</v-icon>
              {{ serverStatus.running ? 'Running' : 'Offline' }}
            </v-chip>
          </div>
          <div class="text-caption text-medium-emphasis" v-if="serverStatus.running">
            Uptime: {{ formatUptime(serverStatus.uptime) }} | Version: {{ serverStatus.version }}
          </div>
        </v-col>
      </v-row>

      <v-divider class="my-4"></v-divider>

      <v-row>
        <!-- Project X Connection -->
        <v-col cols="12" md="6">
          <div class="text-subtitle-2 mb-2">Project X Connection</div>
          <div class="d-flex align-center mb-2">
            <v-chip
              :color="projectXStatus.configured ? 'success' : 'warning'"
              size="small"
              class="me-2"
            >
              <v-icon start>{{ projectXStatus.configured ? 'mdi-check' : 'mdi-alert' }}</v-icon>
              {{ projectXStatus.configured ? 'Configured' : 'Not Configured' }}
            </v-chip>
          </div>
          <div class="d-flex align-center mb-2" v-if="projectXStatus.configured">
            <v-chip
              :color="projectXStatus.connected ? 'success' : 'error'"
              size="small"
              class="me-2"
            >
              <v-icon start>{{ projectXStatus.connected ? 'mdi-check' : 'mdi-close' }}</v-icon>
              {{ projectXStatus.connected ? 'Connected' : 'Disconnected' }}
            </v-chip>
          </div>
          <div class="text-caption text-error" v-if="projectXStatus.lastError">
            Error: {{ projectXStatus.lastError }}
          </div>
        </v-col>

        <!-- Trading Engine -->
        <v-col cols="12" md="6">
          <div class="text-subtitle-2 mb-2">Trading Engine</div>
          <div class="d-flex align-center mb-2">
            <v-chip
              :color="tradingStatus.simulationMode ? 'warning' : 'success'"
              size="small"
              class="me-2"
            >
              <v-icon start>{{ tradingStatus.simulationMode ? 'mdi-test-tube' : 'mdi-currency-usd' }}</v-icon>
              {{ tradingStatus.simulationMode ? 'Simulation' : 'Live Trading' }}
            </v-chip>
          </div>
          <div class="text-caption text-medium-emphasis">
            Instances: {{ tradingStatus.runningInstances }}/{{ tradingStatus.instanceCount }} running
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { apiService } from '@/services/apiService'
import { tradingService } from '@/services/tradingService'
import { websocketService } from '@/services/websocketService'

// State
const loading = ref(false)
const serverInfo = ref({
  host: '127.0.0.1',
  port: 3587
})

const clientStatus = ref({
  api: false,
  websocket: false
})

const serverStatus = ref({
  running: false,
  uptime: 0,
  version: '1.0.0'
})

const projectXStatus = ref({
  configured: false,
  connected: false,
  authenticated: false,
  lastError: null
})

const tradingStatus = ref({
  instanceCount: 0,
  runningInstances: 0,
  simulationMode: true
})

// Auto-refresh interval
let refreshInterval = null

// Methods
const updateClientStatus = () => {
  clientStatus.value = {
    api: tradingService.isConnected.value,
    websocket: websocketService.isConnected.value
  }
}

const refreshStatus = async () => {
  loading.value = true
  try {
    // Update client status
    updateClientStatus()

    // Get server status
    const response = await apiService.getServerStatus()
    if (response.success) {
      const status = response.status
      
      serverStatus.value = {
        running: true,
        uptime: status.server.uptime,
        version: status.server.version
      }

      serverInfo.value = {
        host: status.server.host,
        port: status.server.port
      }

      projectXStatus.value = {
        configured: status.projectX.configured,
        connected: status.projectX.connected,
        authenticated: status.projectX.authenticated,
        lastError: status.projectX.lastError
      }

      tradingStatus.value = {
        instanceCount: status.trading.instanceCount,
        runningInstances: status.trading.runningInstances,
        simulationMode: status.trading.simulationMode
      }
    }
  } catch (error) {
    console.error('Failed to get server status:', error)
    serverStatus.value.running = false
    projectXStatus.value = {
      configured: false,
      connected: false,
      authenticated: false,
      lastError: 'Server unreachable'
    }
  } finally {
    loading.value = false
  }
}

const formatUptime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

// Lifecycle
onMounted(async () => {
  await refreshStatus()
  
  // Set up auto-refresh every 30 seconds
  refreshInterval = setInterval(refreshStatus, 30000)
  
  // Listen for connection changes
  tradingService.connectionError.value && updateClientStatus()
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.v-chip {
  font-weight: 500;
}
</style>
