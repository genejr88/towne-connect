const express = require('express')
const axios   = require('axios')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// Proxy to towne-parts backend — returns RO list with customer info (no parts data)
// GET /api/parts/ros?search=
router.get('/ros', requireAuth, async (req, res) => {
  const partsUrl = process.env.TOWNE_PARTS_URL
  const apiKey   = process.env.TOWNE_PARTS_API_KEY

  if (!partsUrl) {
    return res.status(503).json({ success: false, error: 'Towne-Parts integration not configured' })
  }

  try {
    const response = await axios.get(`${partsUrl}/api/connect/ros`, {
      params: { search: req.query.search || '' },
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 5000,
    })
    res.json(response.data)
  } catch (err) {
    console.error('Towne-Parts proxy error:', err.message)
    res.status(502).json({ success: false, error: 'Could not reach Towne-Parts' })
  }
})

module.exports = router
