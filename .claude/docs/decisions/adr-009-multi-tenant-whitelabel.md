# ADR-009: Multi-Tenant White-Label Architecture

**Status:** Proposed
**Date:** 2026-06-02
**Source:** Product direction — sell packaged instances to third parties (e.g. a motivational speaker who gates access and sources her own employers)

---

## Context

The platform is currently a single global community: one database pool with no notion of ownership above the individual user. Profiles, projects, jobs, and the needs taxonomy are all global; there is one admin view, one hardcoded brand ("Detroit Directory"), one domain, and one Stripe account. See [ADR-001](adr-001-monolith-architecture.md) (monolith), [ADR-002](adr-002-magic-link-authentication.md) (auth), [ADR-003](adr-003-manual-approval-over-automated-moderation.md) (manual approval), and [ADR-006](adr-006-stripe-controlled-employer-capability.md) (Stripe-gated employers).

We want to sell the platform to clients who each run their own gated community: the client controls who is admitted and sources their own employers for their own job board. Client A's members and jobs must not be visible to Client B.

**This is not the same as the role system we already have.** The existing `isAdmin` / `isEmployer` / `status` flags are *role-based access control* (RBAC) — a **vertical** axis describing *what a person may do* within a single community (member → employer → admin). Multi-tenancy is a **horizontal** axis describing *which community the data belongs to*. They are orthogonal: every tenant has its own full set of members, employers, and admins.

The reason the current system can look multi-tenant is that there is exactly one community, so "admin of the community" and "admin of the platform" happen to be the same person. The moment a second client exists, that conflation breaks: a client admin must moderate only their own community, and nothing in the current model can express "their" data versus another client's — there is no `tenantId`, and `email`/`handle` are globally unique, so a person cannot even exist in two communities at once. RBAC is preserved by this ADR (the three roles become *per-tenant* roles); tenancy is the new axis being added, plus a platform super-admin above all tenants.

Three structural options were considered:

1. **Deployment per client** — a separate database, process, subdomain, and Stripe account per client. No schema changes; branding moves to config. Cheapest to first revenue, but operationally linear (N clients = N databases to patch and migrate) and does not scale past a handful of clients.
2. **Shared-instance, true multi-tenancy** — one deployment serving all clients, with a `Tenant` that owns data and a `tenantId` scoping every row. Subdomain resolves the tenant; each client gets a tenant-scoped admin.
3. **Branding-only skin** — shared data, per-domain theming only. Rejected: it cannot satisfy the core requirement (clients gating their own access and owning their own employers requires data ownership, not just a skin).

## Decision

Adopt **Option 2: shared-instance, row-level multi-tenancy** as the target architecture, with **Option 1 (deployment-per-client) as the interim bridge** for the first 1–5 clients while Option 2 is built. The branding layer is built first and is forward-compatible with both.

**Tenancy model:**

- Introduce a `Tenant` model (id, slug, name, status, branding config, Stripe account reference).
- Add a non-null `tenantId` foreign key to every tenant-owned model: `User`, `Profile`, `Project`, `Job`, `Session`, `MagicLinkToken`, `UserFavorite`, `ProjectFollow`, `ProjectCollaborator`, `ProjectNeed`.
- The needs taxonomy (`NeedCategory`, `NeedOption`) starts as **shared/global** (a `tenantId` of `null` means platform-default); per-tenant taxonomy is deferred until a client requires it.
- Uniqueness constraints that were global become per-tenant composite keys: `Profile.handle` → `(tenantId, handle)`, `User.email` → `(tenantId, email)`. A person may exist independently in two tenants.

**Tenant resolution:**

- Tenant is resolved from the request host (subdomain `client.platform.com`, with a custom-domain mapping table for later). A Fastify `onRequest` hook attaches the resolved `tenant` to the request and rejects unknown hosts.
- Sessions are bound to a tenant; a session cookie issued for one tenant is invalid on another.

**Data isolation enforcement:**

- A Prisma client extension (or middleware) injects `tenantId` into every `where` and `create` automatically, so isolation does not depend on each route remembering to filter. Routes that must cross tenants (none expected for client traffic) use an explicit escape hatch.
- Tenant-scoped queries are the default; the global platform-admin path is the only exception.

**Roles:**

- Existing per-user flags (`isAdmin`, `isEmployer`, `status`) become tenant-scoped.
- Add a **platform super-admin** role (the operator) that can provision tenants and act across them. Tenant admins (e.g. the speaker) only see and moderate their own tenant — reusing the existing approval queues from [ADR-003](adr-003-manual-approval-over-automated-moderation.md), now filtered by `tenantId`.

**Branding:**

- Per-tenant branding (name, logo, color tokens, fonts) stored on `Tenant` and served by a public `GET /api/tenant` endpoint resolved by host. The SPA fetches it on boot and injects CSS custom properties at runtime, replacing the hardcoded values in `web/src/styles/variables.css` and the hardcoded name in `Header.tsx`.

**Billing:**

- Move to **Stripe Connect** so each tenant's employer revenue flows to the tenant's own Stripe account, with a platform fee. The webhook-driven `isEmployer` capability from [ADR-006](adr-006-stripe-controlled-employer-capability.md) is preserved but scoped per tenant. (Until Connect lands, the interim deployment-per-client model gives each client a separate Stripe account natively.)

## Rationale

- Row-level tenancy in a shared instance keeps the single-process operational model of [ADR-001](adr-001-monolith-architecture.md) intact — one deploy, one database, one migration path — which a solo operator can sustain. Schema-per-tenant or database-per-tenant would multiply migration and connection overhead.
- Enforcing isolation in a Prisma extension rather than per-route makes data leakage a single auditable surface instead of a property every one of ~100 queries must independently get right. This is the highest-risk part of multi-tenancy and deserves a central guarantee.
- Composite uniqueness lets the same email/handle exist across tenants, which is required if a person belongs to more than one client community.
- Starting branding-first and bridging with deployment-per-client lets us sell to the first client without waiting on the full isolation build, while ensuring that work is not throwaway.
- Stripe Connect matches the business model (clients monetize their own employers) and keeps us out of the flow-of-funds compliance burden of pooling their revenue.

## Consequences

- **Migration is the hard part.** Every existing row must be backfilled to a default "Detroit Directory" tenant; the `tenantId` columns ship nullable, backfill, then flip to non-null. Existing global unique constraints must be dropped and recreated as composite.
- **Every route and query must be audited** during the cutover. Until the Prisma extension is in place and verified, cross-tenant data leakage is a live security risk. The test suite must gain explicit isolation tests (Client A cannot read/write Client B).
- **Auth changes are user-visible:** sessions become tenant-bound, so a user logging into the wrong subdomain is rejected. Magic-link tokens carry tenant context.
- **Admin UX forks:** tenant admins get the existing queues scoped to their tenant; a new platform super-admin surface is required for provisioning and cross-tenant operations.
- **Local filesystem uploads no longer suffice cleanly** — uploads must be namespaced per tenant (already moving to R2 per project memory), and the static `/uploads/` path must enforce tenant ownership.
- **Estimated effort:** ~6–10 weeks for production-quality isolation, on top of ~2–3 weeks for the branding layer that ships first.
- **Reversibility:** the branding layer and the interim deployment-per-client model are independently shippable and low-risk. The row-level tenancy migration is the irreversible commitment and should not begin until a second paying client validates demand.
- This ADR supersedes the single-tenant assumptions embedded in [ADR-001](adr-001-monolith-architecture.md) and [ADR-006](adr-006-stripe-controlled-employer-capability.md) without replacing those decisions; both remain accepted, now scoped per tenant.
