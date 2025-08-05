# DayTradersPro Server API Documentation

## Overview

The DayTradersPro server provides a comprehensive trading engine with algorithm execution, Project X API integration, and real-time data streaming. The server handles all trading operations independently and communicates with the Vue.js Electron client via REST API and WebSocket connections.

## Base URL

```
http://127.0.0.1:3587
```

**Note**: Server binds to `127.0.0.1` (localhost only) for security. Remote connections are not allowed.

## WebSocket Connection

```
ws://127.0.0.1:3587/socket.io/
```

The server uses Socket.IO for real-time communication with the client. Events are automatically pushed to connected clients for:
- Instance state changes
- Trading signals
- Log messages
- Market data updates
- Instance creation/deletion

## Dedicated Port Architecture

**Port 3587** is the **REQUIRED** dedicated port for DayTradersPro server communication. This design provides:

1. **No Configuration Required**: Clients can connect to `localhost:3587` without any setup
2. **Bootstrap Configuration**: All other settings are fetched from the server via API
3. **Consistent Connection**: Eliminates port conflicts and configuration complexity
4. **Service Discovery**: Clients automatically discover server capabilities via `/health` endpoint
5. **Strict Port Enforcement**: Server will **FAIL TO START** if port 3587 is not available
6. **No Port Override**: Environment variables cannot override the dedicated port requirement
7. **Localhost-Only Binding**: Server binds to 127.0.0.1 only, preventing remote administration

### Port Enforcement

The server enforces exclusive use of port 3587:

- **Startup Check**: Validates port and host availability before starting
- **No Fallback**: Will not attempt to use alternative ports or hosts
- **Clear Error Messages**: Provides specific guidance when port is unavailable
- **Duplicate Detection**: Prevents multiple server instances
- **Override Prevention**: Rejects any attempt to use different ports or hosts
- **Security Binding**: Only binds to 127.0.0.1 (localhost) to prevent remote access

## Authentication

Currently, the server operates without authentication for local development. Project X credentials are managed through the trading API endpoints.

## REST API Endpoints

### Available Route Groups

The server provides the following API route groups:

- `/health` - Server health check
- `/api/instances` - Trading instance management
- `/api/trading` - Trading engine and Project X integration
- `/api/data` - Data management (UI config, user settings, watchlists)
- `/api/algorithms` - Algorithm definitions
- `/api/config` - Application configuration
- `/api/historical` - Historical data management
- `/api/logs` - Server logging
- `/api/auth` - Authentication (Project X tokens)

### Health Check

#### GET /health
Get server health status and trading engine information.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-08-02T10:30:00.000Z",
  "version": "1.0.0",
  "tradingEngine": {
    "instanceCount": 3,
    "runningInstances": 1
  }
}
```

### Trading Engine Management

#### GET /api/trading/connection
Get client configuration (UI-relevant settings only).

**Response:**
```json
{
  "success": true,
  "config": {
    "server": {
      "port": 3587,
      "host": "127.0.0.1"
    },
    "trading": {
      "defaultCommission": 2.80,
      "simulationMode": true
    }
  }
}
```

#### GET /api/trading/server-status
Get comprehensive server status including Project X connection.

**Response:**
```json
{
  "success": true,
  "status": {
    "server": {
      "uptime": 3600,
      "version": "1.0.0",
      "port": 3587,
      "host": "127.0.0.1"
    },
    "projectX": {
      "configured": true,
      "connected": true,
      "authenticated": true,
      "lastError": null
    },
    "trading": {
      "instanceCount": 3,
      "runningInstances": 2,
      "simulationMode": true
    }
  }
}
```

**Note**: Connection configuration is managed server-side via `connection.json` file. Sensitive credentials are not exposed through API endpoints for security reasons.

#### POST /api/trading/test-connection
Test the Project X API connection.

**Response:**
```json
{
  "success": true,
  "message": "Connection successful"
}
```

#### GET /api/trading/accounts
Get available Project X trading accounts.

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": "123456789",
      "name": "Practice Account",
      "type": "PRACTICE",
      "balance": 50000.00
    }
  ]
}
```

#### GET /api/trading/contracts?query={symbol}
Search for trading contracts.

**Query Parameters:**
- `query` (optional): Symbol or contract name to search for

**Response:**
```json
{
  "success": true,
  "contracts": [
    {
      "id": "NQZ24",
      "symbol": "NQ",
      "name": "E-mini NASDAQ-100 Dec 2024",
      "tickSize": 0.25,
      "tickValue": 5.0
    }
  ]
}
```



#### GET /api/trading/status
Get overall trading engine status.

**Response:**
```json
{
  "success": true,
  "status": {
    "totalInstances": 5,
    "runningInstances": 2,
    "pausedInstances": 1,
    "stoppedInstances": 2,
    "totalPnL": 1250.75,
    "totalTrades": 45,
    "algorithms": 3
  }
}
```

### Algorithm Management

#### GET /api/algorithms
Get available trading algorithms.

**Response:**
```json
{
  "success": true,
  "algorithms": [
    {
      "name": "Simple-MA-Crossover",
      "description": "Simple moving average crossover strategy",
      "version": "1.0",
      "indicators": [...],
      "entryConditions": [...],
      "exitConditions": [...]
    }
  ]
}
```

### Trading Instance Management

#### GET /api/instances
Get all trading instances.

**Response:**
```json
{
  "success": true,
  "instances": [
    {
      "id": "uuid-1234",
      "name": "NQ Scalper",
      "symbol": "NQ",
      "status": "RUNNING",
      "totalPnL": 125.50,
      "currentPosition": {
        "side": "LONG",
        "quantity": 1,
        "entryPrice": 18500.25
      }
    }
  ]
}
```

#### GET /api/instances/{id}
Get a specific trading instance.

**Response:**
```json
{
  "success": true,
  "instance": {
    "id": "uuid-1234",
    "name": "NQ Scalper",
    "symbol": "NQ",
    "contractId": "NQZ24",
    "accountId": "123456789",
    "algorithmName": "Simple-MA-Crossover",
    "status": "RUNNING",
    "simulationMode": true,
    "startTime": "2024-08-02T10:00:00.000Z",
    "runningTime": 1800000,
    "currentPosition": {
      "side": "LONG",
      "quantity": 1,
      "entryPrice": 18500.25,
      "entryTime": "2024-08-02T10:15:00.000Z"
    },
    "totalPnL": 125.50,
    "unrealizedPnL": 25.00,
    "totalTrades": 5,
    "winningTrades": 3,
    "losingTrades": 2,
    "winRate": 60.0,
    "candleCount": 1200,
    "currentPrice": 18525.25,
    "lastUpdate": "2024-08-02T10:30:00.000Z"
  }
}
```

#### POST /api/instances
Create a new trading instance.

**Request Body:**
```json
{
  "name": "My Strategy",
  "symbol": "NQ",
  "contractId": "NQZ24",
  "accountId": "123456789",
  "algorithmName": "Simple-MA-Crossover",
  "simulationMode": true,
  "startingCapital": 10000,
  "commission": 2.80
}
```

**Response:**
```json
{
  "success": true,
  "instance": { /* instance object */ }
}
```

#### PUT /api/instances/{id}
Update a trading instance configuration.

**Request Body:** (partial update)
```json
{
  "name": "Updated Strategy Name",
  "simulationMode": false
}
```

#### DELETE /api/instances/{id}
Delete a trading instance.

**Response:**
```json
{
  "success": true,
  "message": "Instance deleted successfully"
}
```

### Instance Control

#### POST /api/instances/{id}/start
Start a trading instance.

#### POST /api/instances/{id}/stop
Stop a trading instance.

#### POST /api/instances/{id}/pause
Pause a trading instance.

#### POST /api/instances/{id}/resume
Resume a paused trading instance.

### Instance Data

#### GET /api/instances/{id}/chart-data?timeRange={minutes}
Get chart data for an instance.

**Query Parameters:**
- `timeRange` (optional): Time range in minutes to limit data

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "x": "2024-08-02T10:00:00.000Z",
      "o": 18500.00,
      "h": 18525.00,
      "l": 18495.00,
      "c": 18520.00,
      "v": 1250,
      "indicators": {
        "FastMA": 18515.25,
        "SlowMA": 18510.50,
        "RSI14": 65.5
      }
    }
  ]
}
```

#### GET /api/instances/{id}/logs?count={number}
Get log messages for an instance.

**Query Parameters:**
- `count` (optional): Number of log entries to return (default: 100)

**Response:**
```json
{
  "success": true,
  "logs": [
    "[2024-08-02T10:30:00.000Z] LONG ENTRY @ 18500.25 - FastMA crossed above SlowMA",
    "[2024-08-02T10:29:00.000Z] Calculating indicators..."
  ]
}
```

#### GET /api/instances/{id}/trades
Get trade history for an instance.

**Response:**
```json
{
  "success": true,
  "trades": [
    {
      "id": "trade-uuid",
      "entryTime": "2024-08-02T10:15:00.000Z",
      "exitTime": "2024-08-02T10:25:00.000Z",
      "side": "LONG",
      "entryPrice": 18500.25,
      "exitPrice": 18525.50,
      "quantity": 1,
      "pnL": 125.50,
      "commission": 2.80
    }
  ]
}
```

### Data Management

#### GET /api/data/ui-config
Get UI configuration (layouts, themes, preferences).

**Response:**
```json
{
  "success": true,
  "config": {
    "theme": "dark",
    "layout": "default",
    "chartSettings": {
      "timeframe": "1m",
      "indicators": [],
      "overlays": []
    },
    "dashboardLayout": {
      "instances": { "x": 0, "y": 0, "w": 6, "h": 4 },
      "charts": { "x": 6, "y": 0, "w": 6, "h": 8 },
      "logs": { "x": 0, "y": 4, "w": 6, "h": 4 },
      "performance": { "x": 0, "y": 8, "w": 12, "h": 4 }
    },
    "preferences": {
      "autoConnect": true,
      "showNotifications": true,
      "soundEnabled": true,
      "confirmActions": true
    }
  }
}
```

#### POST /api/data/ui-config
Update UI configuration.

**Request Body:**
```json
{
  "theme": "light",
  "preferences": {
    "autoConnect": false
  }
}
```

#### GET /api/data/user-settings
Get user settings (credentials, API endpoints, etc.).

**Response:**
```json
{
  "success": true,
  "settings": {
    "projectX": {
      "apiUrl": "https://api.topstepx.com",
      "websocketUrl": "wss://rtc.topstepx.com",
      "username": "",
      "rememberCredentials": false
    },
    "trading": {
      "defaultAccount": "",
      "defaultCommission": 2.80,
      "riskManagement": {
        "maxDailyLoss": 1000,
        "maxPositionSize": 5,
        "stopLossEnabled": true
      }
    },
    "notifications": {
      "email": "",
      "enableEmailAlerts": false,
      "enableDesktopNotifications": true,
      "alertOnSignals": true,
      "alertOnErrors": true
    }
  }
}
```

#### POST /api/data/user-settings
Update user settings.

#### GET /api/data/watchlists
Get saved watchlists.

**Response:**
```json
{
  "success": true,
  "watchlists": {
    "default": {
      "name": "Default",
      "symbols": ["NQ", "ES", "YM", "RTY"],
      "created": "2024-08-02T10:00:00.000Z"
    }
  }
}
```

#### POST /api/data/watchlists
Update watchlists.

#### GET /api/data/export
Export all user data.

**Response:**
```json
{
  "version": "1.0",
  "exportDate": "2024-08-02T10:30:00.000Z",
  "data": {
    "uiConfig": { /* UI configuration */ },
    "userSettings": { /* User settings */ },
    "watchlists": { /* Watchlists */ }
  }
}
```

### Configuration Management

#### GET /api/config
Get application configuration.

**Response:**
```json
{
  "success": true,
  "config": {
    "theme": "light",
    "defaultSymbol": "NQ",
    "defaultAccount": "",
    "backtestSettings": {
      "lagTicks": 1,
      "defaultStartDate": null,
      "defaultEndDate": null
    },
    "chartSettings": {
      "candlestickHeight": 400,
      "indicatorHeight": 300,
      "showVolume": true
    },
    "tradingSettings": {
      "confirmOrders": true,
      "maxPositionSize": 10,
      "riskPerTrade": 0.02
    },
    "uiSettings": {
      "autoRefresh": true,
      "refreshInterval": 5000,
      "showNotifications": true
    }
  }
}
```

#### POST /api/config
Update application configuration.

**Request Body:**
```json
{
  "theme": "dark",
  "defaultSymbol": "ES"
}
```

### Historical Data Management

#### GET /api/historical/stats
Get storage statistics for historical data.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalFiles": 150,
    "totalSize": "2.5 GB",
    "symbols": ["NQ", "ES", "YM"],
    "dateRange": {
      "earliest": "2024-01-01",
      "latest": "2024-08-02"
    }
  }
}
```

#### GET /api/historical/:symbol/dates
Get available data dates for a symbol.

**Response:**
```json
{
  "success": true,
  "symbol": "NQ",
  "dates": ["2024-08-01", "2024-08-02"]
}
```

#### GET /api/historical/:symbol?startDate={date}&endDate={date}
Get historical data for a symbol and date range.

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD format)
- `endDate`: End date (YYYY-MM-DD format)

**Response:**
```json
{
  "success": true,
  "symbol": "NQ",
  "data": [
    {
      "timestamp": "2024-08-02T09:30:00.000Z",
      "open": 18500.00,
      "high": 18525.00,
      "low": 18495.00,
      "close": 18520.00,
      "volume": 1250
    }
  ]
}
```

#### DELETE /api/historical/:symbol?date={date}
Delete historical data for a symbol and date.

**Query Parameters:**
- `date`: Date to delete (YYYY-MM-DD format)

### Logging

#### GET /api/logs?limit={number}&level={level}
Get recent log entries.

**Query Parameters:**
- `limit` (optional): Number of log entries to return (default: 100)
- `level` (optional): Log level filter

**Response:**
```json
{
  "success": true,
  "logs": [
    "[2024-08-02T10:30:00.000Z] INFO: Server started successfully",
    "[2024-08-02T10:29:00.000Z] DEBUG: Loading configuration..."
  ],
  "count": 2
}
```

#### POST /api/logs/cleanup
Clean up old log files.

**Request Body:**
```json
{
  "daysToKeep": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up 5 old log files",
  "deletedCount": 5
}
```

### Authentication

#### POST /api/auth/token
Get authentication token for Project X API.

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-08-03T10:30:00.000Z"
}
```

## WebSocket Events

### Client → Server Events

- `connect`: Establish connection
- `disconnect`: Close connection

### Server → Client Events

- `instanceStates`: Initial state of all instances (sent on connect)
- `instanceStateChanged`: Instance state update
- `instanceSignal`: Trading signal generated
- `instanceLog`: New log message
- `instanceDataUpdate`: Market data update
- `instanceCreated`: New instance created
- `instanceDeleted`: Instance deleted

### Event Data Formats

#### instanceStateChanged
```json
{
  "instanceId": "uuid-1234",
  "state": { /* complete instance state object */ }
}
```

#### instanceSignal
```json
{
  "instanceId": "uuid-1234",
  "type": "ENTRY",
  "side": "LONG",
  "price": 18500.25,
  "timestamp": "2024-08-02T10:15:00.000Z",
  "signal": "LONG ENTRY @ 18500.25 - FastMA crossed above SlowMA",
  "pnL": 125.50,
  "trade": { /* trade object for EXIT signals */ }
}
```

#### instanceDataUpdate
```json
{
  "instanceId": "uuid-1234",
  "candle": {
    "timestamp": "2024-08-02T10:30:00.000Z",
    "open": 18520.00,
    "high": 18525.00,
    "low": 18515.00,
    "close": 18522.50,
    "volume": 150
  },
  "isNewCandle": true
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (instance/resource not found)
- `500`: Internal Server Error (server-side error)

## Data Storage Architecture

### Server-Side Storage (`dtp/server/data/`)

| File/Directory | Purpose | Content |
|---|---|---|
| `connection.json` | Server connection settings | Project X credentials, API URLs, server config |
| `instances.json` | Trading instance configurations | Instance settings, algorithm assignments |
| `algorithms/` | Algorithm definitions | JSON files with trading strategy definitions |
| `ui-config.json` | UI layout and preferences | Dashboard layouts, themes, chart settings |
| `user-settings.json` | User preferences | Notification settings, risk management |
| `watchlists.json` | Symbol watchlists | Saved symbol lists and categories |
| `historical/` | Historical data cache | Cached market data for backtesting |
| `logs/` | Application logs | Server and trading activity logs |
| `config.json` | Application configuration | General app settings and preferences |

### Client-Side Storage (Temporary)

- **localStorage**: Temporary UI state, session data
- **No persistent connection data**: All connection settings managed server-side

### Configuration Management

1. **Server manages its own connections**: `connection.json` contains Project X credentials
2. **Auto-connection**: Server can automatically connect to Project X on startup
3. **Client UI independence**: No connection settings in client UI
4. **Secure storage**: Sensitive data stored server-side only
5. **Configuration API**: RESTful endpoints for updating server settings

## Troubleshooting

### Port 3587 Already in Use

If you see this error:
```
❌ FATAL: Port 3587 is already in use
   DayTradersPro requires exclusive access to port 3587
```

**Solutions:**
1. **Check for existing DayTradersPro server**: Another instance may already be running
2. **Find what's using the port**:
   - Windows: `netstat -ano | findstr :3587`
   - Linux/Mac: `lsof -i :3587`
3. **Stop the conflicting service**: Kill the process using port 3587
4. **Restart DayTradersPro server**: Try starting again

### Port Override Rejected

If you see this error:
```
❌ DayTradersPro server MUST run on port 3587
   Current configuration attempts to use port 8080
```

**Solutions:**
1. **Remove PORT environment variable**: Unset any PORT override
2. **Check .env files**: Remove PORT settings from configuration files
3. **Use dedicated port**: DayTradersPro requires port 3587 exclusively

### Host Override Rejected (Security)

If you see this error:
```
❌ DayTradersPro server MUST bind to localhost only (127.0.0.1)
   Current configuration attempts to bind to 0.0.0.0
   This is a security restriction to prevent remote administration
```

**Solutions:**
1. **Remove HOST environment variable**: Unset any HOST override
2. **Security by design**: Server only accepts localhost connections
3. **No remote access**: This restriction prevents unauthorized remote administration

### Server Won't Start

**Common issues:**
- Port 3587 is occupied by another service
- Insufficient permissions to bind to the port
- Firewall blocking the port
- Another DayTradersPro instance already running

**Diagnostic steps:**
1. Check server logs for specific error messages
2. Verify port availability with `netstat` or `lsof`
3. Check firewall settings
4. Ensure no other DayTradersPro processes are running

## Architecture Notes

1. **No Proxy**: All Project X API communications originate from the server
2. **Electron Support**: API designed to work with Electron-based Vue.js client
3. **Real-time Updates**: WebSocket connection provides live updates for charts and trading activity
4. **Independent Operation**: Server runs trading algorithms independently of client connections
5. **Persistent Storage**: All configurations and data are persisted server-side
6. **Centralized Configuration**: Server manages all connection and trading settings
7. **Strict Port Enforcement**: Server will fail to start if port 3587 is not available
