<template>
  <div>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-1">Trading Accounts</h1>
      </v-col>
    </v-row>

    <!-- Accounts Overview -->
    <v-row class="my-1">
      <v-col cols="12" class="py-1">
        <v-card>
          <v-card-title>
            <v-row align="center" no-gutters>
              <v-col>Accounts Overview</v-col>
              <v-col cols="auto">
                <v-btn
                  color="primary"
                  :loading="loading"
                  @click="refreshAccounts"
                >
                  <v-icon start>mdi-refresh</v-icon>
                  Refresh
                </v-btn>
              </v-col>
            </v-row>
          </v-card-title>

          <v-card-text>
            <v-data-table
              :headers="accountHeaders"
              :items="accounts"
              :loading="loading"
              item-key="id"
              class="elevation-1"
              :items-per-page="-1"
              hide-default-footer
              @click:row="selectAccount"
              :no-data-text="accounts.length === 0 && !loading ? 'No accounts found. Please check your ProjectX connection and credentials.' : 'Loading accounts...'"
            >
              <template v-slot:item.balance="{ item }">
                <span class="font-weight-bold">
                  ${{ formatCurrency(item.balance) }}
                </span>
              </template>

              <template v-slot:item.dailyPnL="{ item }">
                <span :class="getPnLColor(item.dailyPnL || 0)" class="font-weight-bold">
                  ${{ formatCurrency(Math.abs(item.dailyPnL || 0)) }}
                  {{ (item.dailyPnL || 0) >= 0 ? '↑' : '↓' }}
                </span>
              </template>

              <template v-slot:item.status="{ item }">
                <v-chip
                  :color="getStatusColor(item.status)"
                  size="small"
                  variant="outlined"
                >
                  {{ item.status }}
                </v-chip>
              </template>

              <template v-slot:item.type="{ item }">
                <v-chip
                  :color="getAccountTypeColor(item)"
                  size="small"
                  variant="outlined"
                >
                  <v-icon
                    :icon="getAccountTypeIcon(item)"
                    size="small"
                    class="me-1"
                  />
                  {{ getAccountTypeText(item) }}
                </v-chip>
              </template>

              <template v-slot:item.actions="{ item }">
                <div class="d-flex">
                  <v-tooltip text="View Account Details" location="top">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-eye"
                        size="small"
                        variant="text"
                        color="primary"
                        @click.stop="viewAccountDetails(item)"
                      />
                    </template>
                  </v-tooltip>

                  <v-tooltip text="View Performance" location="top">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-chart-line"
                        size="small"
                        variant="text"
                        color="primary"
                        @click.stop="viewAccountPerformance(item)"
                      />
                    </template>
                  </v-tooltip>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Selected Account Details -->
    <v-row v-if="selectedAccount" class="my-1">
      <v-col cols="12" class="py-1">
        <v-card>
          <v-card-title>
            Account Details - {{ selectedAccount.name }}
          </v-card-title>

          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <h3 class="text-h6 mb-3">Account Information</h3>
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title>Account ID</v-list-item-title>
                    <v-list-item-subtitle>{{ selectedAccount.id }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Account Name</v-list-item-title>
                    <v-list-item-subtitle>{{ selectedAccount.name }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Account Type</v-list-item-title>
                    <v-list-item-subtitle>{{ selectedAccount.type }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Status</v-list-item-title>
                    <v-list-item-subtitle>
                      <v-chip
                        :color="getStatusColor(selectedAccount.status)"
                        size="small"
                        variant="outlined"
                      >
                        {{ selectedAccount.status }}
                      </v-chip>
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>

              <v-col cols="12" md="6">
                <h3 class="text-h6 mb-3">Balance Information</h3>
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title>Current Balance</v-list-item-title>
                    <v-list-item-subtitle class="font-weight-bold text-h6">
                      ${{ formatCurrency(selectedAccount.balance) }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Available Margin</v-list-item-title>
                    <v-list-item-subtitle>
                      ${{ formatCurrency(selectedAccount.availableMargin || selectedAccount.balance * 0.8) }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Used Margin</v-list-item-title>
                    <v-list-item-subtitle>
                      ${{ formatCurrency(selectedAccount.usedMargin || 0) }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>P&L Today</v-list-item-title>
                    <v-list-item-subtitle :class="getPnLColor(selectedAccount.dailyPnL || 0)">
                      ${{ formatCurrency(Math.abs(selectedAccount.dailyPnL || 0)) }}
                      {{ (selectedAccount.dailyPnL || 0) >= 0 ? '↑' : '↓' }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Account Actions -->
            <v-row>
              <v-col cols="12">
                <h3 class="text-h6 mb-3">Account Actions</h3>
                <v-btn-group variant="outlined">
                  <v-btn @click="viewPositions(selectedAccount)">
                    <v-icon start>mdi-format-list-bulleted</v-icon>
                    View Positions
                  </v-btn>
                  <v-btn @click="viewOrders(selectedAccount)">
                    <v-icon start>mdi-receipt</v-icon>
                    View Orders
                  </v-btn>
                  <v-btn @click="viewTransactions(selectedAccount)">
                    <v-icon start>mdi-bank-transfer</v-icon>
                    Transactions
                  </v-btn>
                  <v-btn @click="generateReport(selectedAccount)">
                    <v-icon start>mdi-file-chart</v-icon>
                    Generate Report
                  </v-btn>
                </v-btn-group>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>



    <!-- Success/Error Messages -->
    <v-snackbar v-model="showMessage" :color="messageColor" timeout="3000">
      {{ message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { storageService } from '@/services/storage'
import { tradingService } from '@/services/tradingService'

const connectionStore = useConnectionStore()

// State
const accounts = ref([])
const selectedAccount = ref(null)
const loading = ref(false)

// Messages
const showMessage = ref(false)
const message = ref('')
const messageColor = ref('success')

// Table headers
const accountHeaders = [
  { title: 'Account ID', key: 'id', sortable: true },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Balance', key: 'balance', sortable: true },
  { title: 'P&L Today', key: 'dailyPnL', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Computed properties - removed unused ones

// Methods
const loadAccounts = async (forceRefresh = false) => {
  loading.value = true
  try {
    let accountsLoaded = false

    // Try to load from ProjectX if connected
    console.log('Connection authenticated:', connectionStore.isAuthenticated)
    console.log('Force refresh:', forceRefresh)
    console.log('Should refresh:', shouldRefreshAccounts())

    if (connectionStore.isAuthenticated && (forceRefresh || shouldRefreshAccounts())) {
      try {
        await storageService.appendLog('accounts', 'Loading accounts from ProjectX API')
        console.log('Calling ProjectX getAccounts()...')
        const projectXAccounts = await tradingService.getAccounts()
        console.log('ProjectX accounts response:', projectXAccounts)

        if (projectXAccounts && (Array.isArray(projectXAccounts) ? projectXAccounts.length > 0 : true)) {
          // Transform ProjectX account data to our format
          const transformedAccounts = Array.isArray(projectXAccounts)
            ? projectXAccounts.map(transformProjectXAccount)
            : [transformProjectXAccount(projectXAccounts)]

          accounts.value = transformedAccounts
          console.log('Transformed accounts:', accounts.value)

          // Accounts are now managed server-side - no client caching needed
          console.log(`[Accounts] Loaded ${accounts.value.length} accounts from server`)

          accountsLoaded = true
          await storageService.appendLog('accounts', `Loaded ${accounts.value.length} accounts from ProjectX`)
        }
      } catch (error) {
        console.error('Error loading from ProjectX:', error)
        await storageService.appendLog('accounts', `ProjectX load failed: ${error.message}`)

        // If this was a forced refresh, show the error to the user
        if (forceRefresh) {
          showErrorMessage(`ProjectX API error: ${error.message}`)
        }
        // Fall back to cached data
      }
    } else {
      console.log('Skipping ProjectX API call - not authenticated or cache is fresh')
      await storageService.appendLog('accounts', 'Skipping ProjectX API call - not authenticated or cache is fresh')
    }

    // No client-side caching - accounts are managed server-side
    if (!accountsLoaded) {
      accounts.value = []
      console.log('[Accounts] No accounts loaded from server')
    }

  } catch (error) {
    console.error('Error loading accounts:', error)
    showErrorMessage('Failed to load accounts: ' + error.message)
    await storageService.appendLog('accounts', `Load error: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const shouldRefreshAccounts = () => {
  // Always refresh from server - no client-side caching
  return true
}

const transformProjectXAccount = (projectXAccount) => {
  // Debug: Log the raw account data to see what fields are available
  console.log('Raw ProjectX account data:', projectXAccount)

  const accountName = projectXAccount.accountName || projectXAccount.name || `Account ${projectXAccount.accountId || projectXAccount.id}`

  // Transform ProjectX account format to our internal format
  return {
    id: projectXAccount.accountId || projectXAccount.id,
    name: accountName,
    balance: parseFloat(projectXAccount.balance || projectXAccount.netLiquidation || 0),
    // Status mapping - check various possible status fields
    status: projectXAccount.isActive === true ? 'Active' :
            projectXAccount.isActive === false ? 'Inactive' :
            projectXAccount.status === 'ACTIVE' ? 'Active' :
            projectXAccount.status === 'INACTIVE' ? 'Inactive' :
            projectXAccount.canTrade === true ? 'Active' :
            projectXAccount.canTrade === false ? 'Inactive' :
            projectXAccount.status || 'Unknown',
    // Type based on account name pattern (PRACTICE vs REAL)
    type: accountName.startsWith('PRACTICE') ? 'Practice' : 'Real',
    availableMargin: parseFloat(projectXAccount.availableFunds || projectXAccount.availableMargin || 0),
    usedMargin: parseFloat(projectXAccount.usedMargin || projectXAccount.maintenanceMargin || 0),
    dailyPnL: parseFloat(projectXAccount.dailyPnL || projectXAccount.unrealizedPnL || 0),
    // Additional ProjectX specific fields
    currency: projectXAccount.currency || 'USD',
    lastUpdated: new Date().toISOString(),
    source: 'projectx'
  }
}





const refreshAccounts = async () => {
  await loadAccounts(true) // Force refresh from server

  const finalCount = accounts.value.length
  if (finalCount > 0) {
    showSuccessMessage(`Accounts refreshed from server (${finalCount} accounts)`)
  } else {
    showErrorMessage('No accounts found on server')
  }
}

const selectAccount = (event, { item }) => {
  selectedAccount.value = item
  console.log(`[Accounts] Selected account: ${item.id}`)
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const getStatusColor = (status) => {
  switch (status) {
    case 'Active': return 'success'
    case 'Inactive': return 'error'
    case 'Suspended': return 'warning'
    default: return 'grey'
  }
}

const getPnLColor = (pnl) => {
  return pnl >= 0 ? 'text-success' : 'text-error'
}

const getAccountTypeColor = (account) => {
  return account.type === 'Practice' ? 'info' : 'warning'
}

const getAccountTypeIcon = (account) => {
  return account.type === 'Practice' ? 'mdi-school' : 'mdi-currency-usd'
}

const getAccountTypeText = (account) => {
  // Use the type field which is now set based on account name pattern
  return account.type === 'Practice' ? 'PRACTICE' : 'REAL'
}



const viewAccountDetails = (account) => {
  selectedAccount.value = account
  showSuccessMessage(`Viewing details for ${account.name}`)
}

const viewAccountPerformance = (account) => {
  // Navigate to performance view or show performance dialog
  showSuccessMessage(`Performance view for ${account.name} - Coming soon`)
}

const viewPositions = (account) => {
  showSuccessMessage(`Positions for ${account.name} - Coming soon`)
}

const viewOrders = (account) => {
  showSuccessMessage(`Orders for ${account.name} - Coming soon`)
}

const viewTransactions = (account) => {
  showSuccessMessage(`Transactions for ${account.name} - Coming soon`)
}

const generateReport = (account) => {
  showSuccessMessage(`Generating report for ${account.name} - Coming soon`)
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

// Watch for connection changes to refresh accounts
watch(
  () => connectionStore.isAuthenticated,
  async (newValue, oldValue) => {
    if (newValue && !oldValue) {
      // Just connected - refresh accounts
      console.log('[Accounts] Connection established - refreshing accounts')
      await loadAccounts(true)
    } else if (!newValue && oldValue) {
      // Just disconnected
      console.log('[Accounts] Connection lost')
    }
  }
)

// Lifecycle
onMounted(async () => {
  // Load accounts from server
  await loadAccounts()
})
</script>

<style scoped>
.v-data-table >>> tbody tr {
  cursor: pointer;
}

.v-data-table >>> tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

/* Ensure scrollbar only shows when needed */
:deep(.v-main) {
  overflow-y: auto !important;
}
</style>
