# ADR-001: Monolith Architecture

**Status:** Accepted
**Date:** 2026-01-31
**Source:** `old-docs/project_overview.md`, `old-docs/SYSTEM_SPEC.md`

---

## Context

The system needed an architecture that could be built and operated by a single developer for a small, local community (hundreds of users). The options were:

1. Microservices (separate auth, profiles, jobs, billing services)
2. Serverless functions (Vercel/Cloudflare Workers per endpoint)
3. Monolithic server (single process handling everything)

## Decision

Single Fastify server running as one Node.js process. No service mesh, no message queues, no background workers, no serverless functions.

**Stack chosen:**
- Fastify (Node.js + TypeScript) for the API
- React + Vite as a static SPA served by the same server in production
- PostgreSQL via Prisma as the single database
- No CDN, no edge compute, no caching layer

**Explicitly rejected:**
- Next.js
- Microservices
- GraphQL
- Background job queues
- External search services (Algolia, Elasticsearch)

## Rationale

- The expected user base is small (hundreds, not thousands)
- A single developer operates the system — operational complexity must be minimal
- All work fits in the request cycle at this scale
- Fewer moving parts means fewer failure modes
- Prisma migrations as single source of truth for schema
- If background workers are needed later, they can be added to the same codebase

## Consequences

- Horizontal scaling requires rearchitecting (acceptable given expected scale)
- Long-running tasks block the event loop (none exist currently)
- Deployment is simple: one process, one database
- No inter-service communication overhead
- Local filesystem storage works (single server assumption)
