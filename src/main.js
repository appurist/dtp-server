import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { createRouter, createWebHistory } from 'vue-router'

// Type declarations
import './types/electron.d.ts'

// Vuetify
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// App components
import App from './App.vue'
import { routes } from './router/routes.js'

// Services
import { storageService } from './services/storage.js'
import { tradingService } from './services/tradingService.js'
import { websocketService } from './services/websocketService.js'

// Create Vuetify theme
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#121212',
          surface: '#1E1E1E'
        }
      },
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107'
        }
      }
    }
  }
})

// Create router with history mode for Electron
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Create Pinia store
const pinia = createPinia()

// Initialize and mount app
async function initializeApp() {
  try {
    // Initialize storage service
    await storageService.initialize()

    // Initialize trading services
    console.log('Initializing trading services...')
    await tradingService.initialize()

    // WebSocket service is auto-initialized when imported
    console.log('Services initialized successfully')

    // Create and mount app
    const app = createApp(App)

    app.use(pinia)
    app.use(router)
    app.use(vuetify)

    // Global error handler
    app.config.errorHandler = (error, instance, info) => {
      console.error('Global error:', error, info)

      // Log to file if in Electron
      if (window.electronAPI) {
        window.electronAPI.appendLog('error', `${error.message} - ${info}`)
      }
    }

    app.mount('#app')
    console.log('DayTradersPro application initialized successfully')
  } catch (error) {
    console.error('Failed to initialize application:', error)
    document.body.innerHTML = `
      <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
        <h2>Application Initialization Error</h2>
        <p>Failed to initialize DayTradersPro: ${error.message}</p>
        <p>Please refresh the page or check the console for more details.</p>
      </div>
    `
  }
}

// Start the application
initializeApp()
