const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

const SECRET = process.env.JWT_SECRET || 'towne-connect-secret'

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '30d' })
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user) return res.status(401).json({ success: false, error: 'User not found' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Admin only' })
  }
  next()
}

module.exports = { signToken, requireAuth, requireAdmin }
