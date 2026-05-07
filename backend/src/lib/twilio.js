const twilio = require('twilio')

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken  = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

let client = null

function getClient() {
  if (!client) {
    if (!accountSid || !authToken) throw new Error('Twilio credentials not configured')
    client = twilio(accountSid, authToken)
  }
  return client
}

async function sendSMS(to, body) {
  const c = getClient()
  return c.messages.create({ from: fromNumber, to, body })
}

function validateWebhook(req) {
  if (process.env.NODE_ENV !== 'production') return true
  const signature = req.headers['x-twilio-signature']
  const url = `${process.env.APP_URL}/api/webhooks/twilio`
  return twilio.validateRequest(authToken, signature, url, req.body)
}

module.exports = { sendSMS, validateWebhook, fromNumber }
