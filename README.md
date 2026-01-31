# Detroit Builders Directory

A curated, members-only archive of builders in Detroit. People submit profiles, an admin reviews and approves them, and the community gets a browsable directory of who's building what in the city.

This is not a social network. There are no public follower counts, no feeds, no algorithmic ranking. It's a simple directory with a human gatekeeper.

## What it does

- **People directory** — Approved members have public profiles with bio, links, and portrait
- **Project showcase** — Members list what they're working on, what they need, and how to get involved
- **Job board** — Employers (paid via Stripe) post opportunities visible to approved members
- **Admin approval** — Every profile is manually reviewed before it goes live

## Tech stack

| Layer | Tech |
|-------|------|
| Backend | Fastify, TypeScript, Node.js |
| Frontend | React, Vite, TypeScript, CSS Modules |
| Database | PostgreSQL, Prisma ORM |
| Auth | Magic link email (Nodemailer / Gmail SMTP) |
| Payments | Stripe (employer subscriptions) |
| Storage | Local filesystem (uploads/) |

## Getting started

### Prerequisites

- Node.js 20+
- Docker (for Postgres)

### 1. Start the database

```sh
docker compose up -d
```

### 2. Install dependencies

```sh
cd server && npm install
cd ../web && npm install
```

### 3. Configure environment

```sh
cp server/.env.example server/.env
```

Fill in your Stripe keys, SMTP credentials, and session secret.

### 4. Run migrations

```sh
cd server && npx prisma migrate dev
```

### 5. Start dev servers

```sh
# Terminal 1
cd server && npm run dev

# Terminal 2
cd web && npm run dev
```

## Project structure

```
server/          Fastify API server
  src/
    routes/      API endpoints
    middleware/   Auth guards
    lib/         Shared utilities (session, email, pagination)
  prisma/        Schema and migrations
web/             React frontend
  src/
    pages/       Route-level components
    components/  Shared UI components
    lib/         API client
    contexts/    Auth context
```

## Further reading

- [Product overview](project_overview.md) — Vision and philosophy
- [Product requirements](PRD.md) — Detailed feature specs
- [Brand guidelines](BRAND.md) — Visual identity and design principles
- [System spec](SYSTEM_SPEC.md) — Technical architecture
- [Project needs](docs/PROJECT_NEEDS.md) — Needs taxonomy system
