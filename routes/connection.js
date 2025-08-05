import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { homedir } from 'os'

const router = express.Router()

// Use the same path as the auth route - Desktop/DayTradersPro/connection.json
const getConnectionFilePath = () => {
  return path.join(homedir(), 'Desktop', 'DayTradersPro', 'connection.json')
}

// Get connection settings
router.get('/connection-settings', async (req, res) => {
  try {
    const settingsFile = getConnectionFilePath()
    const data = await fs.readFile(settingsFile, 'utf8')
    const settings = JSON.parse(data)
    // Don't send sensitive data like API key in full
    res.json({
      ...settings,
      apiKey: settings.apiKey ? '***' : ''
    })
  } catch (error) {
    res.json({
      username: '',
      apiKey: '',
      apiEndpoint: 'https://api.topstepx.com',
      signalRMarketHub: 'https://rtc.topstepx.com/hubs/market',
      signalRUserHub: 'https://rtc.topstepx.com/hubs/user'
    })
  }
})

// Save connection settings
router.post('/connection-settings', async (req, res) => {
  try {
    const settingsFile = getConnectionFilePath()
    // Ensure the directory exists
    await fs.mkdir(path.dirname(settingsFile), { recursive: true })
    await fs.writeFile(settingsFile, JSON.stringify(req.body, null, 2))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
