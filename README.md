# DayTradersPro Client

A professional Vue.js web application for algorithmic trading and market analysis.

## Features

- **Real-time Trading Dashboard** - Monitor market data and trading positions
- **Algorithm Management** - Create, test, and deploy trading algorithms
- **Instance Control** - Manage multiple trading instances
- **Historical Data Analysis** - Backtest strategies with historical market data
- **Connection Management** - Connect to various trading platforms and data feeds
- **Theme Support** - Light and dark theme options
- **Settings Management** - Configurable application settings

## Technology Stack

- **Vue.js 3** - Progressive JavaScript framework with Composition API
- **Vuetify 3** - Material Design component framework
- **Vite** - Fast build tool and development server
- **Pinia** - State management for Vue.js
- **Vue Router** - Official router for Vue.js
- **Chart.js** - Flexible JavaScript charting library

## Architecture

This is a **stateless Vue.js SPA** that communicates exclusively with the DayTradersPro server. All persistent data is managed server-side.

### Key Principles
- **No client-side storage** - All data managed by server
- **Server-centric authentication** - No credentials stored in client
- **Real-time communication** - WebSocket connection to server
- **Responsive design** - Works on desktop and mobile

## Development

### Prerequisites
- Node.js 18+
- pnpm

### Setup
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Development Server
The client runs on `http://localhost:5173` and connects to the DayTradersPro server on port 3587.

### Environment Variables
Create a `.env.development` file:
```
VITE_SERVER_URL=http://127.0.0.1:3587
VITE_NODE_ENV=development
VITE_DEBUG=true
```

## Project Structure

```
src/
├── components/     # Reusable Vue components
├── views/         # Page components
├── router/        # Vue Router configuration
├── services/      # API and service layer
├── stores/        # Pinia state management
├── types/         # TypeScript type definitions
└── data/          # Static data and configurations
```

## Server Communication

The client communicates with the DayTradersPro server via:
- **REST API** - For standard CRUD operations
- **WebSocket** - For real-time data updates
- **Server URL** - Configurable via environment variables

## License

MIT
