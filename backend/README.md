# Dating App — Backend

Node.js + Express + PostgreSQL (Prisma) + Socket.IO backend.

## What's implemented so far

- **Auth**: register, login, JWT, `/api/auth/me`
- **Dating core**: `/api/discover` (browse candidates), `/api/swipe`, `/api/matches` — matching creates a conversation automatically
- **Chat**: REST endpoints + real-time Socket.IO (`send_message`, `typing`, `join_conversation` events), 1-on-1 and group chats
- **Timeline/Posts**: global feed, per-user timeline, image upload (Cloudinary), likes, comments
- **Notifications**: created on match, message, and post like (DB table — polling/socket push wired in)
- **Blocking/reporting**: schema in place, routes to add next

## Not yet built (next steps)

- Voice/video calls (planned: WebRTC signaling over the existing Socket.IO connection)
- Communities/"Pages" (schema exists as `Community`/`CommunityMember`, routes not written yet)
- Report/block routes (schema exists, controllers not written yet)
- Frontend (React)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL**
   Easiest for deployment: create a free Postgres instance on [Neon](https://neon.tech) or [Railway](https://railway.app) — you'll get a `DATABASE_URL` connection string immediately.

3. **Environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in `DATABASE_URL` and `JWT_SECRET` (any long random string). Cloudinary keys are needed for image upload — sign up free at [cloudinary.com](https://cloudinary.com), keys are on your dashboard.

4. **Run migrations**
   ```bash
   npx prisma migrate dev --name init
   ```
   This creates all tables from `prisma/schema.prisma`.

5. **Run the server**
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:4000`. Check `http://localhost:4000/health`.

## Deploying

- **Render or Railway** both work well for this. Set the same env vars there as in `.env`.
- Run `npx prisma migrate deploy` (not `migrate dev`) as part of your deploy/build step.
- Point `CLIENT_URL` at your deployed frontend URL once that exists, so CORS isn't wide open in production.

## API quick reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account |
| POST | `/api/auth/login` | – | Get JWT |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/discover` | ✓ | Candidates to swipe on |
| POST | `/api/swipe` | ✓ | `{ swipedId, direction: LIKE\|PASS }` |
| GET | `/api/matches` | ✓ | Your matches |
| GET | `/api/conversations` | ✓ | Your chats |
| GET | `/api/conversations/:id/messages` | ✓ | Message history |
| POST | `/api/conversations/:id/messages` | ✓ | Send message (REST fallback) |
| POST | `/api/conversations/group` | ✓ | `{ name, participantIds }` |
| GET | `/api/posts` | ✓ | Global timeline feed |
| GET | `/api/posts/user/:userId` | ✓ | One user's timeline |
| POST | `/api/posts` | ✓ | multipart: `content`, `image` |
| POST | `/api/posts/:id/like` | ✓ | Toggle like |
| POST | `/api/posts/:id/comments` | ✓ | `{ content }` |

**Socket.IO** (connect with `auth: { token }`): emits `send_message`, `typing`, `join_conversation`; listens for `new_message`, `user_typing`, `notification`.
