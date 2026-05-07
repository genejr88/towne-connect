const express = require('express')
const bcrypt  = require('bcryptjs')
const prisma  = require('../lib/prisma')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, username: true, role: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  res.json({ success: true, data: users })
})

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, username, password, role } = req.body
  if (!name || !email || !username || !password)
    return res.status(400).json({ success: false, error: 'name, email, username, password required' })
  try {
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), username, password: hash, role: role || 'USER' },
      select: { id: true, name: true, email: true, username: true, role: true },
    })
    res.json({ success: true, data: user })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Email or username already exists' })
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, username, role, password } = req.body
  try {
    const data = {}
    if (name     !== undefined) data.name     = name
    if (email    !== undefined) data.email    = email.toLowerCase()
    if (username !== undefined) data.username = username
    if (role     !== undefined) data.role     = role
    if (password) data.password = await bcrypt.hash(password, 10)

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, username: true, role: true },
    })
    res.json({ success: true, data: user })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ success: false, error: "Can't delete yourself" })
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
