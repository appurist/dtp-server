import express from 'express'
const router = express.Router()

// Mock accounts data - replace with actual ProjectX API integration
const mockAccounts = [
  {
    id: 'ACC001',
    name: 'Trading Account 1',
    balance: 50000,
    status: 'Active',
    type: 'Live'
  },
  {
    id: 'ACC002',
    name: 'Demo Account',
    balance: 100000,
    status: 'Active',
    type: 'Demo'
  }
]

// Get all accounts
router.get('/', async (req, res) => {
  try {
    // TODO: Replace with actual ProjectX API call
    // const accounts = await projectXService.getAccounts()
    res.json(mockAccounts)
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    res.status(500).json({ error: 'Failed to fetch accounts' })
  }
})

export default router
