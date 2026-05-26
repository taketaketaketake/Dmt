# Architecture

## System shape

A monolithic client-server application. One backend process, one frontend build, one database. No service mesh, no message queues, no background workers.

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│                  React SPA (Vite)                    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS (JSON API + cookies)
┌──────────────────────▼──────────────────────────────┐
│                  Fastify Server                      │
│                                                      │
│   ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│   │   Routes   │  │ Middleware  │  │     Lib      │  │
│   │            │  │            │  │              │  │
│   │ profiles   │  │ requireAuth│  │ session      │  │
│   │ projects   │  │ requireApp │  │ email        │  │
│   │ jobs       │  │ requireEmp │  │ sanitize     │  │
│   │ needs      │  │ requireAdm │  │ pagination   │  │
│   │ favorites  │  └────────────┘  │ errors       │  │
│   │ follows    │                  └──────────────┘  │
│   │ auth       │                                     │
│   │ billing    │                                     │
│   │ webhooks   │                                     │
│   │ uploads    │                                     │
│   │ admin      │                                     │
│   └────────────┘                                     │
└───────┬──────────────────┬──────────────────┬───────┘
        │ Prisma           │ SMTP             │ HTTPS
┌───────▼───────┐  ┌───────▼───────┐  ┌──────▼───────┐
│  PostgreSQL   │  │   Gmail SMTP  │  │    Stripe    │
│               │  │  (Nodemailer) │  │              │
│ Users         │  │ Magic links   │  │ Checkout     │
│ Profiles      │  │ Approvals     │  │ Portal       │
│ Projects      │  │ Rejections    │  │ Webhooks ──► │
│ Jobs          │  │ Reminders     │  │  (inbound)   │
│ Sessions      │  └───────────────┘  └──────────────┘
│ Needs         │
│ Favorites     │
│ Follows       │
└───────────────┘
```

## Layers

The backend has three conceptual layers. There is no formal abstraction between them — Fastify routes call Prisma directly. This is intentional. The system is small enough that an ORM query in a route handler is clearer than a service layer indirection.

### Routes

HTTP handlers grouped by domain. Each route file owns its own validation, authorization, and response shaping. Routes are the outer boundary of the system — they receive untrusted input and return shaped JSON.

### Middleware

Authorization functions that gate access before route handlers run. They compose: `requireAuth` checks for a valid session, `requireApproved` checks account status, `requireEmployer` checks the Stripe-controlled flag, `requireAdmin` checks the admin flag. These stack — an admin employer passes all checks.

### Lib

Shared capabilities that routes depend on. Session management, email sending, input sanitization, pagination, error classification. These are stateless functions, not services. They don't know about HTTP.

## Data flow

### Authentication (magic link)

```
User enters email
  → POST /auth/login
  → Server creates MagicLinkToken, sends email
  → User clicks link in email
  → GET /auth/verify?token=xxx
  → Server verifies token, creates Session, sets httpOnly cookie
  → Redirect to app
  → All subsequent requests carry session cookie
  → Middleware resolves cookie → session → user on each request
```

Sessions use sliding expiry. When less than half the max age remains, the expiry is refreshed on the next authenticated request. Active users stay logged in; inactive sessions expire naturally.

### Profile approval

```
User creates/edits profile
  → Profile saved as draft
  → User submits for review (status: pending_review)
  → Admin sees profile in approval queue
  → Admin approves or rejects
  → If approved: profile visible in directory, user status set to approved
  → If rejected: user notified with optional note, can resubmit
```

Projects do not require approval. They inherit visibility from their creator's profile — if the creator is approved, their projects are visible. Abuse is handled reactively through admin moderation.

### Employer billing

```
User clicks "Subscribe as employer"
  → POST /billing/checkout
  → Server creates Stripe Checkout session
  → User redirected to Stripe
  → User completes payment
  → Stripe sends checkout.session.completed webhook
  → Server sets user.isEmployer = true (idempotent)
  → User can now post jobs

Subscription canceled or payment fails:
  → Stripe sends webhook
  → Server sets user.isEmployer = false (idempotent)
  → Existing jobs remain but user can't create new ones
```

Webhook handlers check current state before writing to prevent duplicate updates on retries.

### Private signals (favorites and follows)

```
User favorites a person or follows a project
  → Optimistic UI update (instant feedback)
  → POST /api/favorites/:id or /api/follows/:id
  → If request fails: UI reverts, error message shown temporarily
  → Signals are private — no public counts, no "who favorited you"
  → Listed only in the user's own account pages
```

These are personal bookmarks, not social features. There is no social graph, no feed generation, no notification on follow.

## Request lifecycle

Every API request follows the same path:

```
Request arrives
  → Rate limiter (global: 100/min, stricter on sensitive endpoints)
  → Content type parser (JSON with raw body preserved, or multipart)
  → Route matched
  → Pre-handler middleware (auth, approval, employer, admin checks)
  → Route handler (validation, business logic, database, response)
  → If error: global error handler classifies and responds
      → AppError: structured client error
      → Prisma error: mapped to 409/404/500
      → Validation error: 400
      → Unknown: 500 (details hidden in production)
  → Response sent with security headers (Helmet CSP, CORS, etc.)
```

## Responsibility boundaries

| Concern | Owner |
|---------|-------|
| Who can access what | Middleware (auth.ts) |
| What data looks like | Prisma schema |
| What input is safe | Sanitization lib + route-level validation |
| What the user sees | React pages (each page owns its data fetching) |
| What happens on payment events | Webhook route (idempotent handlers) |
| What gets sent by email | Email lib (templates are inline, not external) |
| What the admin controls | Admin routes (approval, moderation, cleanup) |

## Frontend structure

The frontend is a single-page application with client-side routing. There is no server-side rendering. Pages fetch their own data on mount — there is no global store or cache layer.

```
ErrorBoundary
  └── AuthProvider (session state, login/logout)
       └── BrowserRouter
            ├── /login          Public
            ├── Shell            Auth guard (redirects to /login if unauthenticated)
            │   ├── /people     Directory pages (read-only for approved members)
            │   ├── /projects
            │   ├── /jobs
            │   └── /account    Account pages (own data management)
            ├── AdminShell       Admin guard (redirects if not admin)
            │   ├── /admin/queue
            │   └── /admin/users
            └── *               404 page
```

Each page component is self-contained: it fetches data, manages loading/error states, and renders. There are no shared data-fetching hooks or global state beyond auth context.

## What is deliberately absent

- **No service layer.** Routes call Prisma directly. Adding a service layer would be premature abstraction for a system this size.
- **No caching layer.** The dataset is small. Postgres handles the load. If needed later, add HTTP caching headers or a Redis layer.
- **No background jobs.** Admin cleanup tasks (session pruning, need reminders) are triggered via admin endpoints, callable from a cron job.
- **No SSR.** The frontend is a static build. In production, Fastify serves the built files and falls back to index.html for client-side routing.
- **No external search.** Filtering uses Postgres indexes and exact matches. This is a small directory, not a search product.
- **No CDN.** Images are served from the local filesystem via Fastify static. Cloud storage (e.g., Cloudflare R2) is the next step if needed.
