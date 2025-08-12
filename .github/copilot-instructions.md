# Copilot Instructions for DayTradersPro Server

## Overview
The DayTradersPro server is a trading engine designed to manage trading algorithms, backtests, and live trading instances. It is built using Node.js and Express, with a modular architecture that separates concerns into services, routes, and models.

### Key Components
1. **Services**: Core business logic resides here. Examples include:
   - `tradingInstanceManager.js`: Manages trading instances and algorithms.
   - `backtesting.js`: Handles backtest execution and results.
   - `algorithmEngine.js`: Processes trading algorithms.

2. **Routes**: API endpoints for interacting with the server. Examples include:
   - `routes/backtests.js`: Endpoints for managing backtests.
   - `routes/instances.js`: Endpoints for trading instances.

3. **Models**: Data structures and logic for domain entities. Examples include:
   - `models/BacktestInstance.js`: Represents a backtest.
   - `models/TradingAlgorithm.js`: Represents a trading algorithm.

4. **Data**: Stores algorithm definitions and configuration files.
   - `data/algorithms/`: Contains JSON files defining trading algorithms.
   - `data/backtest-results.json`: Stores backtest results.

### Data Flow
- **Backtests**: Historical data is processed by the `backtesting.js` service, which uses the `algorithmEngine.js` to evaluate trading algorithms.
- **Algorithms**: Defined in JSON files and dynamically loaded by the `tradingInstanceManager.js`.
- **Instances**: Managed by the `tradingInstanceManager.js`, which tracks their state and lifecycle.

## Developer Workflows

### Running the Server
- Use `pnpm dev` to start the server in development mode.
- Ensure the `.env` file is correctly configured, especially `DATA_PATH` for data storage.

### Debugging
- Add logging in services like `backtesting.js` to debug issues (e.g., indicator values, condition evaluations).
- Check the `data/backtest-results.json` file for persisted backtest data.

### Testing Backtests
- Backtests are executed via the `/api/backtests/runs` endpoint.
- Use the `Simple-Trend-Following.json` algorithm in `data/algorithms/` as a reference for creating new algorithms.

## Project-Specific Conventions
- **Dynamic Loading**: Algorithms are dynamically loaded from the `data/algorithms/` directory using the `getOrLoadAlgorithm` method in `tradingInstanceManager.js`.
- **Path Handling**: Paths starting with `~/` are resolved to the user's home directory using `process.env.HOME` or `process.env.USERPROFILE`.
- **Singletons**: Services like `tradingInstanceManager` are implemented as singletons with proxy methods.

## External Dependencies
- **Socket.IO**: Used for real-time communication with clients.
- **Express**: Serves as the web framework for API endpoints.
- **Node.js**: Core runtime for the server.

## Key Files
- `src/services/tradingInstanceManager.js`: Manages trading algorithms and instances.
- `src/services/backtesting.js`: Handles backtest execution.
- `src/routes/backtests.js`: API routes for backtests.
- `data/algorithms/Simple-Trend-Following.json`: Example algorithm definition.

## Common Issues
- **No Trades in Backtests**: Add logging in `backtesting.js` to debug indicator values and condition evaluations.
- **Path Resolution Errors**: Ensure `DATA_PATH` is correctly set in `.env` and paths starting with `~/` are resolved properly.
- **Missing Methods**: Ensure proxy methods in `tradingInstanceManager` include all required methods (e.g., `getOrLoadAlgorithm`).

Feel free to update this document as the project evolves.
