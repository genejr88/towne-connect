require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth',          require('./routes/auth'))
app.use('/api/conversations', require('./routes/conversations'))
app.use('/api/contacts',      require('./routes/contacts'))
app.use('/api/templates',     require('./routes/templates'))
app.use('/api/users',         require('./routes/users'))
app.use('/api/webhooks',      require('./routes/webhooks'))
app.use('/api/parts',         require('./routes/parts'))

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'towne-connect' }))

const PORT = process.env.PORT || 3003
app.listen(PORT, () => console.log(`Towne Connect API running on port ${PORT}`))
