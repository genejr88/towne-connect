const express = require('express')
const prisma  = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { sendSMS } = require('../lib/twilio')

const router = express.Router()

const CONV_INCLUDE = {
  contact: true,
  messages: {
    orderBy: { createdAt: 'asc' },
    include: { sentBy: { select: { id: true, name: true } } },
  },
  notes: {
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, name: true } } },
  },
}

// Format phone for E.164
function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

// GET /api/conversations
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query
    const where = {}

    if (status) where.status = status
    if (search) {
      const term = search.trim()
      where.OR = [
        { contact: { name: { contains: term, mode: 'insensitive' } } },
        { contact: { phone: { contains: term } } },
        { linkedRoNumber: { contains: term } },
        { linkedCustomerName: { contains: term, mode: 'insensitive' } },
      ]
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: { contact: true },
      orderBy: [{ unreadCount: 'desc' }, { lastMessageAt: 'desc' }],
    })

    res.json({ success: true, data: conversations })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/conversations/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: CONV_INCLUDE,
    })
    if (!conv) return res.status(404).json({ success: false, error: 'Not found' })

    // Mark as read
    if (conv.unreadCount > 0) {
      await prisma.conversation.update({
        where: { id: req.params.id },
        data: { unreadCount: 0 },
      })
      conv.unreadCount = 0
    }

    res.json({ success: true, data: conv })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PUT /api/conversations/:id  — update status, link RO, rename contact
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { status, linkedRoId, linkedRoNumber, linkedCustomerName, linkedVehicle } = req.body
    const data = {}
    if (status !== undefined)             data.status             = status
    if (linkedRoId !== undefined)         data.linkedRoId         = linkedRoId
    if (linkedRoNumber !== undefined)     data.linkedRoNumber     = linkedRoNumber
    if (linkedCustomerName !== undefined) data.linkedCustomerName = linkedCustomerName
    if (linkedVehicle !== undefined)      data.linkedVehicle      = linkedVehicle

    const conv = await prisma.conversation.update({
      where: { id: req.params.id },
      data,
      include: { contact: true },
    })
    res.json({ success: true, data: conv })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/conversations  — start new conversation (by phone number)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { phone, name } = req.body
    if (!phone) return res.status(400).json({ success: false, error: 'Phone is required' })

    const e164 = formatPhone(phone)

    // Find or create contact
    let contact = await prisma.contact.findUnique({ where: { phone: e164 } })
    if (!contact) {
      contact = await prisma.contact.create({ data: { phone: e164, name: name || null } })
    } else if (name && !contact.name) {
      contact = await prisma.contact.update({ where: { id: contact.id }, data: { name } })
    }

    // Find existing open conversation or create new
    let conv = await prisma.conversation.findFirst({
      where: { contactId: contact.id, status: 'OPEN' },
      include: { contact: true },
    })

    if (!conv) {
      conv = await prisma.conversation.create({
        data: { contactId: contact.id, status: 'OPEN' },
        include: { contact: true },
      })
    }

    res.json({ success: true, data: conv })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/conversations/:id/messages  — send a message
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { body } = req.body
    if (!body?.trim()) return res.status(400).json({ success: false, error: 'Message body required' })

    const conv = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: { contact: true },
    })
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' })

    // Send via Twilio
    let twilioSid = null
    let status = 'SENT'
    try {
      const result = await sendSMS(conv.contact.phone, body.trim())
      twilioSid = result.sid
    } catch (twilioErr) {
      console.error('Twilio send error:', twilioErr.message)
      status = 'FAILED'
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        body: body.trim(),
        direction: 'OUTBOUND',
        status,
        twilioSid,
        sentById: req.user.id,
      },
      include: { sentBy: { select: { id: true, name: true } } },
    })

    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: body.trim().slice(0, 80),
        status: 'OPEN',
      },
    })

    res.json({ success: true, data: message })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/conversations/:id/notes  — add internal note
router.post('/:id/notes', requireAuth, async (req, res) => {
  try {
    const { body } = req.body
    if (!body?.trim()) return res.status(400).json({ success: false, error: 'Note body required' })

    const note = await prisma.note.create({
      data: {
        conversationId: req.params.id,
        body: body.trim(),
        createdById: req.user.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    })
    res.json({ success: true, data: note })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE /api/conversations/:id/notes/:noteId
router.delete('/:id/notes/:noteId', requireAuth, async (req, res) => {
  try {
    await prisma.note.delete({ where: { id: req.params.noteId } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
