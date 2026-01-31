# Stubs

Tracks features and integrations that are stubbed, deferred, or intentionally absent. When a stub is replaced with a real implementation, move it to the "Resolved" section.

---

## Active Stubs

### Cloud storage (R2 / S3)

**Location:** `server/src/routes/uploads.ts`
**Current behavior:** Files are written to the local filesystem under `uploads/`.
**Why stubbed:** Local storage is sufficient for initial launch on a single server. Cloud storage (Cloudflare R2 recommended) is needed before containerized or multi-server deployment.
**Replacement trigger:** Moving to a container-based deployment or needing a CDN for images.

### Full-text search

**Location:** `server/src/routes/profiles.ts`, `server/src/routes/projects.ts`
**Current behavior:** Search uses basic SQL `LIKE` / `contains` queries.
**Why stubbed:** Adequate for a directory with hundreds of entries. Not performant or relevant-ranked at scale.
**Replacement trigger:** Search quality complaints or dataset exceeding ~1,000 profiles.

### CI/CD pipeline

**Location:** N/A (does not exist)
**Current behavior:** Deployment is manual.
**Why stubbed:** Single developer, single server. Automation overhead not justified yet.
**Replacement trigger:** Multiple contributors, frequent deployments, or need for staging environment.

### Staging environment

**Location:** N/A (does not exist)
**Current behavior:** Development and production only.
**Why stubbed:** Small team, low traffic, manual QA is sufficient.
**Replacement trigger:** Need to test Stripe webhooks, email flows, or schema migrations without affecting production.

### Email templates

**Location:** `server/src/lib/email.ts`
**Current behavior:** Magic link emails are plain text.
**Why stubbed:** Functional and deliverable. Branded HTML templates are a polish item.
**Replacement trigger:** Brand/design pass or user feedback about email quality.

### Project images

**Location:** `server/prisma/schema.prisma` (Project model)
**Current behavior:** Projects have no image field. Only profiles support portrait uploads.
**Why stubbed:** Not part of MVP scope.
**Replacement trigger:** User request or product decision to add project imagery.

### Data export

**Location:** N/A (does not exist)
**Current behavior:** No user data export capability.
**Why stubbed:** Small community, no regulatory requirement yet.
**Replacement trigger:** GDPR compliance needs or user requests.

### Rate limiting per-endpoint

**Location:** `server/src/index.ts`
**Current behavior:** Global rate limit (100 req/min/IP) only. No per-endpoint limits.
**Why stubbed:** Global limit is sufficient at current scale.
**Replacement trigger:** Abuse patterns targeting specific endpoints (e.g. login, uploads).

---

## Resolved

_No stubs have been resolved yet._
