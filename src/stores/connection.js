import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tradingService } from '@/services/tradingService'
import { storageService } from '@/services/storage'

export const useConnectionStore = defineStore('connection', () => {
  // State - just credential storage
  const credentials = ref({
    username: '',
    apiKey: '',
    apiEndpoint: 'https://api.topstepx.com',
    signalRMarketHub: 'wss://rtc.topstepx.com/hubs/market',
    signalRUserHub: 'wss://rtc.topstepx.com/hubs/user'
  })

  const lastError = ref(null)

  // Computed - get status from trading service
  const status = computed(() => {
    const tradingStatus = tradingService.getConnectionStatus()
    return {
      authenticated: tradingStatus.authenticated,
      marketData: tradingStatus.connected,
      tokenExpiry: null, // No longer relevant - server manages tokens
      hasCredentials: true // Always true - server manages credentials
    }
  })

  // Actions
  const initialize = async () => {
    console.log('🔧 Connection store initialized (server-managed credentials)')

    // Credentials are now managed server-side in connection.json
    // No client-side initialization needed
    credentials.value = {
      username: '',
      apiKey: '',
      apiEndpoint: 'https://api.topstepx.com',
      signalRMarketHub: 'wss://rtc.topstepx.com/hubs/market',
      signalRUserHub: 'wss://rtc.topstepx.com/hubs/user'
    }
  }

  const saveCredentials = async (newCredentials) => {
    console.log('⚠️ saveCredentials called - credentials are now managed server-side')
    console.log('📋 Update credentials in server/connection.json file instead')

    // Update local state for UI display only (not used for authentication)
    credentials.value = { ...credentials.value, ...newCredentials }

    return true
  }

  const testConnection = async () => {
    try {
      // Test connection to DayTradersPro server
      return await tradingService.checkServerConnection()
    } catch (error) {
      console.error('Connection test failed:', error)
      return { success: false, message: `Connection test failed: ${error.message}` }
    }
  }

  return {
    // State
    credentials,
    lastError,

    // Computed
    status,

    // Actions
    initialize,
    saveCredentials,
    testConnection
  }
})
