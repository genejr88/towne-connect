const express = require('express')
const prisma  = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/', requireAuth, async (req, res) => {
  const templates = await prisma.template.findMany({ orderBy: { sortOrder: 'asc' } })
  res.json({ success: true, data: templates })
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, body, sortOrder } = req.body
    if (!name || !body) return res.status(400).json({ success: false, error: 'Name and body required' })
    const t = await prisma.template.create({ data: { name, body, sortOrder: sortOrder || 0 } })
    res.json({ success: true, data: t })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, body, sortOrder } = req.body
    const data = {}
    if (name      !== undefined) data.name      = name
    if (body      !== undefined) data.body      = body
    if (sortOrder !== undefined) data.sortOrder = sortOrder
    const t = await prisma.template.update({ where: { id: req.params.id }, data })
    res.json({ success: true, data: t })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await prisma.template.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
