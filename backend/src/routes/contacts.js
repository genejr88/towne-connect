const express = require('express')
const prisma  = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/contacts
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search } = req.query
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : {}

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 1,
        },
      },
    })
    res.json({ success: true, data: contacts })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PUT /api/contacts/:id  — update name, email, notes
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, email, notes } = req.body
    const data = {}
    if (name  !== undefined) data.name  = name  || null
    if (email !== undefined) data.email = email || null
    if (notes !== undefined) data.notes = notes || null

    const contact = await prisma.contact.update({ where: { id: req.params.id }, data })
    res.json({ success: true, data: contact })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
