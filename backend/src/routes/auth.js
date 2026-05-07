const express = require('express')
const bcrypt  = require('bcryptjs')
const prisma  = require('../lib/prisma')
const { signToken, requireAuth } = require('../middleware/auth')

const router = express.Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ success: false, error: 'Username and password required' })

  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    })
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, error: 'Invalid credentials' })

    const token = signToken(user)
    res.json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/me', requireAuth, (req, res) => {
  const { id, name, email, role } = req.user
  res.json({ success: true, data: { id, name, email, role } })
})

router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword)
    return res.status(400).json({ success: false, error: 'Both passwords required' })

  try {
    const ok = await bcrypt.compare(currentPassword, req.user.password)
    if (!ok) return res.status(400).json({ success: false, error: 'Current password incorrect' })

    const hash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
