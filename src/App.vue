<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawer"
      app
      clipped
      :rail="miniVariant"
    >
      <v-list>
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :to="item.to"
          router
          exact
        >
          <template v-slot:prepend>
            <v-icon>{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app clipped-left>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-btn icon @click.stop="miniVariant = !miniVariant">
        <v-icon>{{ miniVariant ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
      </v-btn>

      <v-toolbar-title>DayTradersPro</v-toolbar-title>

      <v-spacer />

      <!-- Connection Status -->
      <v-chip
        :color="connectionStatus.color"
        :variant="connectionStatus.variant"
        size="small"
        class="mr-2"
      >
        <v-icon start>{{ connectionStatus.icon }}</v-icon>
        {{ connectionStatus.text }}
      </v-chip>

      <!-- Theme Toggle -->
      <v-btn icon @click="toggleTheme">
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <router-view />
      </v-container>
    </v-main>

    <!-- Status Bar -->
    <v-footer app>
      <v-row no-gutters align="center">
        <v-col>
          <span class="text-caption">
            Data Path: {{ dataPath || 'Loading...' }}
          </span>
        </v-col>
        <v-col cols="auto">
          <span class="text-caption">
            {{ new Date().toLocaleString() }}
          </span>
        </v-col>
      </v-row>
    </v-footer>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import { useConnectionStore } from '@/stores/connection'
import { storageService } from '@/services/storage'

const theme = useTheme()
const connectionStore = useConnectionStore()

// UI State
const drawer = ref(true)
const miniVariant = ref(false)
const dataPath = ref('')

// Theme
const isDark = computed(() => theme.global.current.value.dark)

const toggleTheme = () => {
  const newTheme = isDark.value ? 'light' : 'dark'
  theme.change(newTheme)
  storageService.setLocal('theme', newTheme)
}

// Menu Items
const menuItems = [
  {
    icon: 'mdi-view-dashboard',
    title: 'Dashboard',
    to: '/'
  },
  {
    icon: 'mdi-play-circle',
    title: 'Instances',
    to: '/instances'
  },
  {
    icon: 'mdi-robot',
    title: 'Algorithms',
    to: '/algorithms'
  },
  {
    icon: 'mdi-history',
    title: 'Backtesting',
    to: '/backtesting'
  },
  {
    icon: 'mdi-account-multiple',
    title: 'Accounts',
    to: '/accounts'
  },
  {
    icon: 'mdi-chart-line',
    title: 'Chart',
    to: '/chart'
  },
  {
    icon: 'mdi-cog',
    title: 'Settings',
    to: '/settings'
  }
]

// Connection Status
const connectionStatus = computed(() => {
  const status = connectionStore.status

  if (status.authenticated && status.marketData === 'Connected') {
    return {
      color: 'success',
      variant: 'flat',
      icon: 'mdi-check-circle',
      text: 'Connected'
    }
  } else if (status.authenticated) {
    return {
      color: 'success',
      variant: 'outlined',
      icon: 'mdi-check-circle',
      text: 'Authenticated'
    }
  } else {
    return {
      color: 'error',
      variant: 'outlined',
      icon: 'mdi-close-circle',
      text: 'Disconnected'
    }
  }
})

// Initialize app
onMounted(async () => {
  try {
    // Load saved theme or default to dark
    const savedTheme = storageService.getLocal('theme', 'dark')
    theme.change(savedTheme)

    // Get data path
    if (window.electronAPI) {
      try {
        dataPath.value = await storageService.getDataPath()
      } catch (error) {
        console.error('Error getting data path:', error)
        dataPath.value = 'File System'
      }
    } else {
      dataPath.value = 'Browser Mode (No Persistent Storage)'
    }

    // Initialize connection store
    await connectionStore.initialize()

    // Log app startup
    await storageService.appendLog('app', 'DayTradersPro started')
  } catch (error) {
    console.error('App initialization error:', error)
    await storageService.appendLog('error', `App initialization failed: ${error.message}`)
  }
})
</script>

<style>
/* Global styles - set body scrollbar to auto and background image */
body {
  overflow-y: auto !important;
  background-image: url('/background.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

/* Ensure Vuetify app container is transparent to show background */
.v-application {
  background: transparent !important;
}

/* Make main content area semi-transparent for better readability */
/* Light mode: Use light gray overlay to show background and improve card contrast */
.v-main {
  background: rgba(192, 192, 192, 0.85) !important;
}

/* Dark theme adjustments */
.v-theme--dark .v-main {
  background: rgba(18, 18, 18, 0.85) !important;
}
</style>

<style scoped>
.v-footer {
  padding: 8px 16px;
}
</style>
