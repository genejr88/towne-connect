const express = require('express')
const prisma  = require('../lib/prisma')
const { validateWebhook } = require('../lib/twilio')

const router = express.Router()

// Twilio sends form-encoded data, so we need raw body for signature validation
// POST /api/webhooks/twilio
router.post('/twilio', express.urlencoded({ extended: false }), async (req, res) => {
  // Validate Twilio signature in production
  if (!validateWebhook(req)) {
    return res.status(403).send('Forbidden')
  }

  const { From, Body, MessageSid } = req.body
  if (!From || !Body) {
    return res.status(200).set('Content-Type', 'text/xml').send('<Response/>')
  }

  try {
    const phone = From.trim()
    const body  = Body.trim()

    // Find or create contact
    let contact = await prisma.contact.findUnique({ where: { phone } })
    if (!contact) {
      contact = await prisma.contact.create({ data: { phone } })
    }

    // Find open conversation or create one
    let conv = await prisma.conversation.findFirst({
      where: { contactId: contact.id, status: 'OPEN' },
    })
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { contactId: contact.id, status: 'OPEN' },
      })
    }

    // Store message (avoid duplicates via twilioSid)
    const existing = MessageSid
      ? await prisma.message.findUnique({ where: { twilioSid: MessageSid } })
      : null

    if (!existing) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          body,
          direction: 'INBOUND',
          status: 'RECEIVED',
          twilioSid: MessageSid || null,
        },
      })
    }

    // Update conversation
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        unreadCount: { increment: 1 },
        lastMessageAt: new Date(),
        lastMessagePreview: body.slice(0, 80),
        status: 'OPEN',
      },
    })

    // Return empty TwiML (no auto-reply)
    res.status(200).set('Content-Type', 'text/xml').send('<Response/>')
  } catch (err) {
    console.error('Twilio webhook error:', err)
    res.status(200).set('Content-Type', 'text/xml').send('<Response/>')
  }
})

module.exports = router
