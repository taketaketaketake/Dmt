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
├── docker-compose.yml                  Postgres service with named volume
├── vision.md                           System intent and principles
├── PRD.md                              Product requirements
├── BRAND.md                            Visual identity and design guidelines
├── SYSTEM_SPEC.md                      Technical architecture
├── CLAUDE.md                           LLM contributor instructions
│
├── server/                             Fastify API server
│   ├── src/
│   │   ├── index.ts                    App entry — plugins, middleware, error handler, startup
│   │   ├── routes/
│   │   │   ├── auth.ts                 Magic link login, verify, logout
│   │   │   ├── profiles.ts            CRUD profiles, handle/search, approval submission
│   │   │   ├── projects.ts            CRUD projects for approved members
│   │   │   ├── jobs.ts                Job board — create, list, update (employer-only)
│   │   │   ├── needs.ts               Project needs taxonomy (categories + options)
│   │   │   ├── favorites.ts           User-to-profile favorites (private signal)
│   │   │   ├── follows.ts             User-to-project follows (private signal)
│   │   │   ├── uploads.ts             Image upload via @fastify/multipart
│   │   │   ├── billing.ts             Stripe checkout and portal sessions
│   │   │   ├── webhooks.ts            Stripe webhook handlers (idempotent)
│   │   │   ├── admin.ts               Approval queue, user management, cleanup tasks
│   │   │   └── api.ts                 Auth status and current user endpoint
│   │   ├── middleware/
│   │   │   └── auth.ts                requireAuth, requireApproved, requireEmployer, requireAdmin
│   │   ├── lib/
│   │   │   ├── session.ts             Session create/verify/delete, sliding expiry, cookies
│   │   │   ├── email.ts               Transactional emails via Nodemailer (Gmail SMTP)
│   │   │   ├── env.ts                 Environment variable validation
│   │   │   ├── errors.ts              AppError class, Prisma error detection
│   │   │   ├── pagination.ts          parsePagination, paginationMeta utilities
│   │   │   ├── sanitize.ts            Input sanitization per resource type
│   │   │   ├── stripe.ts              Stripe client instance
│   │   │   └── prisma.ts              Prisma client instance
│   │   └── types/
│   │       └── index.ts               Shared server types (AuthUser, Fastify augmentations)
│   └── prisma/
│       ├── schema.prisma              Data model — User, Profile, Project, Job, Needs, etc.
│       ├── migrations/                Migration history
│       ├── seed.ts                    Base data seeder
│       └── seed-needs.ts             Needs taxonomy seeder
│
└── web/                                React + Vite frontend
    ├── src/
    │   ├── main.tsx                   Entry point — ErrorBoundary, AuthProvider, App
    │   ├── App.tsx                    Router — public, authenticated, admin routes
    │   ├── lib/
    │   │   └── api.ts                API client (profiles, projects, jobs, favorites, follows, etc.)
    │   ├── contexts/
    │   │   └── AuthContext.tsx        Auth state, login/logout, session check
    │   ├── hooks/
    │   │   └── usePageTitle.ts       Document title management
    │   ├── data/
    │   │   ├── types.ts              Shared frontend types
    │   │   └── mock.ts               Mock data for development
    │   ├── components/
    │   │   ├── ErrorBoundary.tsx      Global error catch with recovery UI
    │   │   ├── layout/
    │   │   │   ├── Shell.tsx          Auth guard wrapper, header + main layout
    │   │   │   └── Header.tsx         Navigation bar
    │   │   ├── ui/
    │   │   │   ├── Portrait.tsx       Profile image with initial fallback
    │   │   │   ├── Badge.tsx          Status/type badges
    │   │   │   └── Card.tsx           Content card container
    │   │   ├── NeedsDisplay/         Read-only needs view for project pages
    │   │   └── NeedsEditor/          Needs selection UI for project owners
    │   ├── pages/
    │   │   ├── Login.tsx              Magic link sign-in
    │   │   ├── NotFound.tsx           404 page
    │   │   ├── People.tsx             People directory listing
    │   │   ├── PersonDetail.tsx       Individual profile view + favorite toggle
    │   │   ├── Projects.tsx           Projects directory listing
    │   │   ├── ProjectDetail.tsx      Individual project view + follow toggle
    │   │   ├── Jobs.tsx               Job board listing
    │   │   ├── JobDetail.tsx          Individual job view
    │   │   ├── Account.tsx            Account layout with sub-navigation
    │   │   ├── account/
    │   │   │   ├── Profile.tsx        Edit own profile + portrait upload
    │   │   │   ├── MyProjects.tsx     Manage own projects + needs editor
    │   │   │   ├── MyJobs.tsx         Manage own job postings (employer)
    │   │   │   ├── Favorites.tsx      Saved people list
    │   │   │   ├── Following.tsx      Followed projects list
    │   │   │   └── Billing.tsx        Stripe subscription management
    │   │   └── admin/
    │   │       ├── AdminShell.tsx     Admin layout with auth guard
    │   │       ├── ApprovalQueue.tsx  Pending profiles list
    │   │       ├── ProfileReview.tsx  Approve/reject individual profile
    │   │       ├── Users.tsx          All users list
    │   │       └── UserDetail.tsx     User detail + suspend/reinstate
    │   └── styles/
    │       ├── variables.css          Design tokens (colors, typography, spacing)
    │       └── base.css               Global reset and base styles
    └── vite.config.ts                 Vite configuration
```

## Further reading

- [Vision](vision.md) — Why this exists, what it is, what it isn't
- [Product overview](project_overview.md) — Original product brief
- [Product requirements](PRD.md) — Detailed feature specs
- [Brand guidelines](BRAND.md) — Visual identity and design principles
- [System spec](SYSTEM_SPEC.md) — Technical architecture
- [Project needs](docs/PROJECT_NEEDS.md) — Needs taxonomy system
