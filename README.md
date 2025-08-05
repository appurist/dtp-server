# DayTradersPro - Desktop Application

A professional desktop trading application built with Electron, Vue.js, and Vuetify for algorithmic trading and market analysis.

## Features

- **Real-time Trading Dashboard** - Monitor market data and trading positions
- **Algorithm Management** - Create, test, and deploy trading algorithms
- **Instance Control** - Manage multiple trading instances
- **Historical Data Analysis** - Backtest strategies with historical market data
- **Connection Management** - Connect to various trading platforms and data feeds
- **Theme Support** - Light and dark theme options
- **Settings Management** - Configurable application settings with import/export

## Technology Stack

- **Electron** - Cross-platform desktop application framework
- **Vue.js 3** - Progressive JavaScript framework with Composition API
- **Vuetify 3** - Material Design component framework
- **Vite** - Fast build tool and development server
- **Pinia** - State management for Vue.js
- **Vue Router** - Client-side routing

## Project Structure

```
dtp/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.js     # Main Electron entry point
│   │   └── preload.js  # Preload script for secure IPC
│   └── renderer/       # Vue.js renderer process
│       ├── components/ # Reusable Vue components
│       ├── views/      # Page components
│       ├── stores/     # Pinia state stores
│       ├── services/   # Business logic services
│       ├── styles/     # SCSS stylesheets
│       ├── App.vue     # Root Vue component
│       └── main.js     # Vue app entry point
├── dist/               # Built application files
├── package.json        # Node.js dependencies and scripts
└── vite.config.js      # Vite configuration
```

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Navigate to the dtp directory:
   ```bash
   cd dtp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Commands

- **Start development server:**
  ```bash
  npm run dev
  ```
  This starts both the Vite dev server and Electron in development mode with hot reload.

- **Build for production:**
  ```bash
  npm run build
  ```

- **Package the application:**
  ```bash
  npm run dist
  ```

### Development Workflow

1. The development server runs on `http://localhost:5173`
2. Electron automatically opens and loads the Vue application
3. Hot module replacement (HMR) is enabled for fast development
4. DevTools are available in development mode

## Key Components

### Main Application (App.vue)
- Navigation drawer with menu items
- Theme toggle functionality
- Connection status indicator
- Main content area with router view

### Views
- **Dashboard** - Trading overview and key metrics
- **Trading** - Real-time trading interface
- **Instances** - Manage trading algorithm instances
- **Algorithms** - Algorithm development and testing
- **Backtests** - Historical strategy testing
- **Historical Data** - Market data management
- **Settings** - Application configuration

### Services
- **Storage Service** - Local data persistence and file operations
- **Connection Store** - Trading platform connection management

## Configuration

The application supports various configuration options:

- **Theme Settings** - Light/dark mode preference
- **Trading Settings** - Default symbols, accounts, risk parameters
- **Chart Settings** - Candlestick and indicator display options
- **UI Settings** - Auto-refresh intervals and notifications

Settings are automatically saved to local storage and can be imported/exported as JSON files.

## Building and Distribution

The application can be packaged for Windows, macOS, and Linux using Electron Builder:

```bash
npm run dist
```

This creates distributable packages in the `dist` directory.

## Contributing

1. Follow the existing code style and structure
2. Use Vue 3 Composition API for new components
3. Implement proper error handling and logging
4. Test theme switching and responsive design
5. Ensure Electron security best practices

## License

This is a private project from (daytraders.pro)[https://daytraders.pro] and is not open source.

Copyright 2025 by Appurist Software Inc. All rights reserved.
