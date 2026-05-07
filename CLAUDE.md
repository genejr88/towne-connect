# Towne Connect — Project Context

## What This App Is
Customer messaging hub for Towne Body Shop. One shared Twilio SMS number — staff send/receive texts with customers, track conversation history, leave internal notes, and link conversations to ROs from towne-parts.

## Stack
- **Backend**: Node.js + Express, Prisma ORM, PostgreSQL (Railway)
- **Frontend**: React + Vite + Tailwind CSS + TanStack Query + Framer Motion
- **SMS**: Twilio (inbound webhook + outbound API)
- **Deployed**: Railway — `connect.towneapps.com`
- **Monorepo**: `backend/` and `frontend/` as separate packages

## Key Env Vars
| Var | Description |
|-----|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Railway) |
| `JWT_SECRET` | Secret for signing JWTs |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (starts with AC...) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio number in E.164 format (+15551234567) |
| `APP_URL` | Public URL for Twilio webhook validation (https://connect.towneapps.com) |
| `TOWNE_PARTS_URL` | URL of towne-parts backend (https://...) |
| `TOWNE_PARTS_API_KEY` | Shared secret key for connect → towne-parts API calls |

## Towne-Parts Integration
The connect backend calls `GET {TOWNE_PARTS_URL}/api/connect/ros?search=` with header `Authorization: Bearer {TOWNE_PARTS_API_KEY}`. The towne-parts backend must have `CONNECT_API_KEY` set to the same value.

## Twilio Webhook
Set webhook URL in Twilio console to: `https://connect.towneapps.com/api/webhooks/twilio`
Method: HTTP POST

## Deployment
- Railway Railpack, same as towne-parts/towne-rental
- Migration runs on start: `npx prisma migrate deploy && node prisma/seed.js && node src/index.js`
- Default admin: `gene` / `TowneConnect1`

## Database Models
- `User` — staff accounts
- `Contact` — customer phone + name (auto-created on first text)
- `Conversation` — thread per contact (status: OPEN/RESOLVED, unread count, linked RO)
- `Message` — individual SMS (INBOUND/OUTBOUND, twilioSid for dedup)
- `Note` — internal staff notes on a conversation (never texted)
- `Template` — quick-reply message templates with {name} placeholder
