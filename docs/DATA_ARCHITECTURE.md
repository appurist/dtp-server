# DayTradersPro Data Storage Architecture

## Overview

DayTradersPro uses a **server-centric data architecture** where all persistent data is stored and managed by the Node.js server. The Vue.js Electron client connects to the server via a **dedicated port (3587)** and bootstraps all configuration from the server.

## Dedicated Port Architecture

### Port 3587 - DayTradersPro Server
- **Purpose**: Dedicated port for DayTradersPro server communication
- **Benefits**:
  - No client configuration required
  - Eliminates port conflicts
  - Consistent connection endpoint
  - Bootstrap configuration from server
  - Service discovery via `/health` endpoint

### Connection Flow
1. Client connects to `localhost:3587`
2. Client calls `/health` to discover server capabilities
3. Client calls `/api/trading/connection` to bootstrap configuration
4. Client establishes WebSocket connection for real-time updates
5. All subsequent communication uses server-provided settings

## Server-Side Data Storage

### Location: Configurable Data Directory

**Default Paths:**
- **Development:** `./data` (relative to server directory)
- **Production:** `~/Desktop/DayTradersPro` (user's desktop)
- **Configurable:** Via `DATA_PATH` environment variable

| File/Directory | Purpose | Content | Management |
|---|---|---|---|
| **`connection.json`** | Server connection settings | Project X credentials, API URLs, server config | Server auto-loads on startup |
| **`instances.json`** | Trading instance configurations | Instance settings, algorithm assignments | Auto-saved when instances change |
| **`algorithms/`** | Algorithm definitions | JSON files with trading strategies | Loaded on server startup |
| **`ui-config.json`** | UI layout and preferences | Dashboard layouts, themes, chart settings | Saved via `/api/data/ui-config` |
| **`user-settings.json`** | User preferences | Notification settings, risk management | Saved via `/api/data/user-settings` |
| **`watchlists.json`** | Symbol watchlists | Saved symbol lists and categories | Saved via `/api/data/watchlists` |
| **`historical/`** | Historical data cache | Cached market data for backtesting | Auto-managed by trading engine |
| **`logs/`** | Application logs | Server and trading activity logs | Auto-rotated by server |

## Data Management Principles

### 1. Server-Managed Configuration
- **Connection settings**: Stored in `connection.json`, managed by server
- **Auto-connection**: Server automatically connects to Project X on startup
- **No client credentials**: Client never stores or manages Project X credentials
- **Bootstrap discovery**: Client discovers all settings from server

### 2. Persistent Trading State
- **Instance persistence**: Trading instances survive server restarts
- **Algorithm library**: Pre-defined strategies loaded from `algorithms/` directory
- **Real-time state**: Instance states maintained in memory and persisted to disk
- **Historical data**: Cached for performance and offline analysis

### 3. Client-Server Separation
- **Server independence**: Server operates independently of client connections
- **Real-time sync**: WebSocket provides live updates to connected clients
- **Stateless client**: Client maintains minimal temporary state
- **Configuration sync**: UI preferences synchronized with server

## Configuration Files

### connection.json
```json
{
  "projectX": {
    "apiUrl": "https://api.topstepx.com",
    "websocketUrl": "wss://rtc.topstepx.com",
    "username": "your_username",
    "apiKey": "API key token",
    "autoConnect": true
  },
  "server": {
    "port": 3587,
    "corsOrigins": ["http://localhost:5173", "http://localhost:5174"]
  },
  "trading": {
    "defaultCommission": 2.80,
    "simulationMode": true
  }
}
```

### instances.json
```json
{
  "instances": [
    {
      "id": "uuid-1234",
      "name": "NQ Scalper",
      "symbol": "NQ",
      "algorithmName": "Simple-MA-Crossover",
      "simulationMode": true
    }
  ],
  "lastSaved": "2024-08-02T06:45:00.000Z"
}
```

## API Endpoints for Data Management

### Server Configuration
- `GET /api/trading/connection` - Get server configuration (without sensitive data)
- `GET /api/trading/server-status` - Get comprehensive server status including Project X connection
- `POST /api/trading/test-connection` - Test Project X API connection

**Note:** Project X credentials are managed server-side via `connection.json` file. No API endpoints expose or modify credentials for security reasons.

### UI Data
- `GET /api/data/ui-config` - Get UI configuration
- `POST /api/data/ui-config` - Save UI configuration
- `GET /api/data/user-settings` - Get user settings
- `POST /api/data/user-settings` - Save user settings
- `GET /api/data/watchlists` - Get watchlists
- `POST /api/data/watchlists` - Save watchlists

### Data Management
- `GET /api/data/export` - Export all user data
- `POST /api/data/import` - Import user data
- `DELETE /api/data/reset` - Reset all data to defaults

## Security Considerations

### Credential Storage
- **Server-side only**: Project X credentials stored only on server
- **Encrypted storage**: Passwords encrypted in `connection.json`
- **No client exposure**: Client never receives or stores credentials
- **Local network only**: Server binds to localhost by default

### Data Protection
- **File permissions**: Data files protected by OS file permissions
- **Local storage**: All data stored locally, no cloud dependencies
- **Backup friendly**: JSON format allows easy backup and migration
- **Version control safe**: Sensitive data excluded from git

## Client Bootstrap Process

### 1. Service Discovery
```javascript
// Client discovers server automatically
const bootstrap = await bootstrapService.bootstrap()
// Returns: server capabilities, configuration, connection info
```

### 2. Configuration Loading
```javascript
// Client loads all settings from server
const config = await apiService.getUIConfig()
const settings = await apiService.getUserSettings()
```

### 3. Real-time Connection
```javascript
// WebSocket connection for live updates
websocketService.connect() // Uses server URL from bootstrap
```

## Migration and Backup

### Export Data
```bash
curl http://localhost:3587/api/data/export > backup.json
```

### Import Data
```bash
curl -X POST -H "Content-Type: application/json" \
  -d @backup.json http://localhost:3587/api/data/import
```

### Manual Backup
Simply copy the entire `dtp/server/data/` directory to preserve all configurations and data.

## Development vs Production

### Development
- **Port:** 3587 (dedicated, enforced)
- **Data path:** `./data` (relative to server directory)
- **CORS:** Allows localhost origins (`http://localhost:5173`, `http://localhost:5174`)
- **Logging:** Console output + file logging
- **Rate limiting:** 1000 requests per 15 minutes

### Production
- **Port:** 3587 (same dedicated port, no override allowed)
- **Data path:** `~/Desktop/DayTradersPro` or configurable via `DATA_PATH` environment variable
- **CORS:** Restricted to configured origins
- **Logging:** File-based with rotation in `data/logs/`
- **Rate limiting:** 100 requests per 15 minutes

This architecture ensures **zero configuration** for clients while maintaining **complete server autonomy** and **persistent trading operations**.
