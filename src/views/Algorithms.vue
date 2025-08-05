<template>
  <div>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1 class="text-h4">Algorithm Management</h1>
          <v-btn
            color="success"
            prepend-icon="mdi-plus"
            @click="createNewAlgorithm"
          >
            Add Algorithm
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Algorithms List -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-row align="center">
              <v-col>
                <span>Trading Algorithms</span>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="searchQuery"
                  prepend-inner-icon="mdi-magnify"
                  label="Search algorithms..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
            </v-row>
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="filteredAlgorithms"
            :loading="loading"
            item-key="name"
            class="elevation-0"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.favorite="{ item }">
              <v-btn
                :icon="item.favorite ? 'mdi-star' : 'mdi-star-outline'"
                :color="item.favorite ? 'amber' : 'grey'"
                variant="text"
                size="small"
                @click="toggleFavorite(item)"
              />
            </template>

            <template #item.algorithm="{ item }">
              <div class="py-2">
                <div class="d-flex align-center mb-1">
                  <span class="text-subtitle-1 font-weight-medium">{{ item.name }}</span>
                  <v-chip size="x-small" color="primary" variant="outlined" class="mx-2">
                    v{{ item.version }}
                  </v-chip>
                  <v-spacer />
                  <span class="text-caption text-grey">{{ formatDate(item.lastModifiedTime) }}</span>
                </div>
                <div class="text-body-2 text-grey">{{ item.description }}</div>
              </div>
            </template>

            <template #item.indicators="{ item }">
              <div class="d-flex justify-center align-center" style="height: 100%;">
                <v-chip
                  size="x-small"
                  color="info"
                  variant="outlined"
                  class="text-caption px-2"
                  style="min-width: fit-content;"
                >
                  {{ item.indicators.length }} indicators
                </v-chip>
              </div>
            </template>

            <template #item.conditions="{ item }">
              <div class="d-flex flex-column align-center justify-center" style="height: 100%; gap: 2px;">
                <v-chip
                  size="x-small"
                  color="success"
                  variant="outlined"
                  class="text-caption px-2"
                  style="min-width: fit-content;"
                >
                  {{ item.entryConditions.length }} entry
                </v-chip>
                <v-chip
                  size="x-small"
                  color="warning"
                  variant="outlined"
                  class="text-caption px-2"
                  style="min-width: fit-content;"
                >
                  {{ item.exitConditions.length }} exit
                </v-chip>
              </div>
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex">
                <v-tooltip text="Edit Algorithm" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-pencil"
                      size="small"
                      variant="text"
                      color="primary"
                      @click="editAlgorithm(item)"
                    />
                  </template>
                </v-tooltip>

                <v-tooltip text="Clone Algorithm" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-content-copy"
                      size="small"
                      variant="text"
                      color="primary"
                      @click="cloneAlgorithm(item)"
                    />
                  </template>
                </v-tooltip>

                <v-tooltip text="Export Algorithm" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-export"
                      size="small"
                      variant="text"
                      color="info"
                      @click="exportAlgorithm(item)"
                    />
                  </template>
                </v-tooltip>

                <v-tooltip text="Delete Algorithm" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      @click="deleteAlgorithm(item)"
                    />
                  </template>
                </v-tooltip>
              </div>
            </template>

            <template #no-data>
              <div class="text-center py-8">
                <v-icon size="64" color="grey-lighten-1">mdi-chart-line</v-icon>
                <p class="text-h6 mt-4 mb-2">No algorithms found</p>
                <p class="text-body-2 text-grey">
                  Add your first trading algorithm to get started
                </p>
                <v-btn
                  color="success"
                  prepend-icon="mdi-plus"
                  class="mt-4"
                  @click="createNewAlgorithm"
                >
                  Add Algorithm
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create/Edit Algorithm Dialog -->
    <v-dialog
      v-model="showCreateDialog"
      max-width="800px"
      persistent
    >
      <v-card>
        <v-card-title>
          <span class="text-h5">
            {{ editingAlgorithm ? 'Edit Algorithm' : 'Create New Algorithm' }}
          </span>
        </v-card-title>

        <v-card-text>
          <v-form ref="algorithmForm" v-model="formValid">
            <v-row>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="algorithmData.name"
                  label="Algorithm Name"
                  :rules="nameRules"
                  required
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="algorithmData.version"
                  label="Version"
                  :rules="versionRules"
                  required
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="algorithmData.description"
                  label="Description"
                  :rules="descriptionRules"
                  required
                  variant="outlined"
                  rows="3"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="algorithmData.favorite"
                  label="Mark as favorite"
                  color="amber"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            text
            @click="cancelEdit"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!formValid"
            @click="saveAlgorithm"
          >
            {{ editingAlgorithm ? 'Update' : 'Create' }}
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { TradingAlgorithm } from '@/models/TradingAlgorithm.js'
import { getSampleAlgorithms } from '@/data/sampleAlgorithms.js'
import { apiService } from '@/services/apiService.js'

const router = useRouter()

// Data
const algorithms = ref([])
const loading = ref(false)
const searchQuery = ref('')

// Dialog state
const showCreateDialog = ref(false)
const editingAlgorithm = ref(null)
const formValid = ref(false)

// Form data
const algorithmData = ref({
  name: '',
  description: '',
  version: '1.0',
  favorite: false
})

// Messages
const showMessage = ref(false)
const message = ref('')
const messageColor = ref('success')

// Table headers
const headers = [
  { title: '', key: 'favorite', sortable: false, width: '60px' },
  { title: 'Algorithm', key: 'algorithm', sortable: false },
  { title: 'Indicators', key: 'indicators', sortable: false, width: '100px' },
  { title: 'Conditions', key: 'conditions', sortable: false, width: '120px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '160px' }
]

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
  v => (v && v.length >= 10) || 'Description must be at least 10 characters',
  v => (v && v.length <= 500) || 'Description must be less than 500 characters'
]

// Computed
const filteredAlgorithms = computed(() => {
  let filtered = algorithms.value

  // Apply search filter if query exists
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = algorithms.value.filter(algo =>
      algo.name.toLowerCase().includes(query) ||
      algo.description.toLowerCase().includes(query)
    )
  }

  // Sort: favorites first, then by algorithm name
  return filtered.sort((a, b) => {
    // Primary sort: favorites first
    if (a.favorite && !b.favorite) return -1
    if (!a.favorite && b.favorite) return 1

    // Secondary sort: algorithm name (case-insensitive)
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  })
})

// Methods
const loadAlgorithms = async () => {
  loading.value = true
  try {
    // Load algorithms from server
    const response = await apiService.getAlgorithms()

    if (response.success && response.algorithms && response.algorithms.length > 0) {
      algorithms.value = response.algorithms.map(algo => ({
        ...algo,
        favorite: algo.favorite || false,
        lastModifiedTime: algo.lastModifiedTime || new Date().toISOString()
      }))
      console.log(`[Algorithms] Loaded ${algorithms.value.length} algorithms from server`)
    } else {
      // Fall back to sample algorithms if no server algorithms
      const sampleAlgorithms = getSampleAlgorithms()
      algorithms.value = sampleAlgorithms.map(algo => ({
        ...algo,
        favorite: false,
        lastModifiedTime: algo.lastModifiedTime || new Date().toISOString()
      }))
      console.log(`[Algorithms] Loaded ${algorithms.value.length} sample algorithms (server had none)`)
    }
  } catch (error) {
    console.error('Error loading algorithms:', error)

    // Fall back to sample algorithms on error
    const sampleAlgorithms = getSampleAlgorithms()
    algorithms.value = sampleAlgorithms.map(algo => ({
      ...algo,
      favorite: false,
      lastModifiedTime: algo.lastModifiedTime || new Date().toISOString()
    }))

    showErrorMessage('Failed to load algorithms from server - showing sample algorithms')
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const toggleFavorite = async (algorithm) => {
  try {
    algorithm.favorite = !algorithm.favorite
    algorithm.lastModifiedTime = new Date().toISOString()

    // Note: Favorite status is now stored in memory only
    // Server-side persistence can be added later if needed
    console.log(`[Algorithms] Toggled favorite for ${algorithm.name}: ${algorithm.favorite}`)

    showSuccessMessage(`Algorithm ${algorithm.favorite ? 'added to' : 'removed from'} favorites`)
  } catch (error) {
    console.error('Error updating favorite:', error)
    showErrorMessage('Failed to update favorite status')
  }
}

const editAlgorithm = (algorithm) => {
  // Navigate to algorithm editor
  router.push(`/algorithms/${algorithm.name}`)
}

const createNewAlgorithm = () => {
  // Navigate to algorithm editor for new algorithm
  router.push('/algorithms/new')
}

const cloneAlgorithm = async (algorithm) => {
  try {
    // Create a deep copy of the algorithm
    const cloned = new TradingAlgorithm({
      ...algorithm,
      name: `${algorithm.name} (Copy)`,
      version: '1.0',
      favorite: false,
      createdTime: new Date().toISOString(),
      lastModifiedTime: new Date().toISOString()
    })

    // Note: Cloned algorithm stored in memory only
    // Server-side persistence can be added later if needed
    console.log(`[Algorithms] Cloned algorithm: ${cloned.name}`)

    algorithms.value.push(cloned)
    showSuccessMessage(`Algorithm cloned: ${cloned.name}`)
  } catch (error) {
    console.error('Error cloning algorithm:', error)
    showErrorMessage('Failed to clone algorithm')
  }
}

const deleteAlgorithm = async (algorithm) => {
  if (confirm(`Are you sure you want to delete "${algorithm.name}"?`)) {
    try {
      // Remove from local array (memory only)
      const index = algorithms.value.findIndex(a => a.name === algorithm.name)
      if (index > -1) {
        algorithms.value.splice(index, 1)
        showSuccessMessage(`Algorithm deleted: ${algorithm.name}`)
        console.log(`[Algorithms] Deleted algorithm: ${algorithm.name}`)
      }
    } catch (error) {
      console.error('Error deleting algorithm:', error)
      showErrorMessage('Failed to delete algorithm')
    }
  }
}

const saveAlgorithm = async () => {
  try {
    if (editingAlgorithm.value) {
      // Update existing algorithm
      const oldName = editingAlgorithm.value.name
      editingAlgorithm.value.name = algorithmData.value.name
      editingAlgorithm.value.description = algorithmData.value.description
      editingAlgorithm.value.version = algorithmData.value.version
      editingAlgorithm.value.favorite = algorithmData.value.favorite
      editingAlgorithm.value.lastModifiedTime = new Date().toISOString()

      // Note: Algorithm changes stored in memory only
      // Server-side persistence can be added later if needed
      console.log(`[Algorithms] Updated algorithm: ${algorithmData.value.name}`)

      showSuccessMessage(`Algorithm updated: ${algorithmData.value.name}`)
    } else {
      // Create new algorithm
      const newAlgorithm = new TradingAlgorithm({
        name: algorithmData.value.name,
        description: algorithmData.value.description,
        version: algorithmData.value.version,
        favorite: algorithmData.value.favorite,
        indicators: [],
        entryConditions: [],
        exitConditions: [],
        createdTime: new Date().toISOString(),
        lastModifiedTime: new Date().toISOString()
      })

      // Note: New algorithm stored in memory only
      // Server-side persistence can be added later if needed
      console.log(`[Algorithms] Created algorithm: ${algorithmData.value.name}`)

      algorithms.value.push(newAlgorithm)
      showSuccessMessage(`Algorithm created: ${algorithmData.value.name}`)
    }

    cancelEdit()
  } catch (error) {
    console.error('Error saving algorithm:', error)
    showErrorMessage('Failed to save algorithm')
  }
}

const cancelEdit = () => {
  showCreateDialog.value = false
  editingAlgorithm.value = null
  algorithmData.value = {
    name: '',
    description: '',
    version: '1.0',
    favorite: false
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

// Export functionality
const exportAlgorithm = async (algorithm) => {
  try {
    const algorithmJson = JSON.stringify(algorithm, null, 2)

    if (window.electronAPI) {
      // Use Electron file dialog
      const result = await window.electronAPI.showSaveDialog({
        title: 'Export Algorithm',
        defaultPath: `${algorithm.name}.json`,
        filters: [
          { name: 'Algorithm Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result.canceled) {
        await window.electronAPI.writeFile(result.filePath.replace(await window.electronAPI.getDataPath() + '/', ''), algorithmJson)
        showSuccessMessage(`Algorithm exported: ${algorithm.name}`)
        console.log(`[Algorithms] Exported algorithm: ${algorithm.name}`)
      }
    } else {
      // Web version - download file
      const blob = new Blob([algorithmJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${algorithm.name}.json`
      a.click()
      URL.revokeObjectURL(url)
      showSuccessMessage(`Algorithm exported: ${algorithm.name}`)
    }
  } catch (error) {
    console.error('Error exporting algorithm:', error)
    showErrorMessage('Failed to export algorithm')
  }
}

// Lifecycle
onMounted(() => {
  loadAlgorithms()
})
</script>
