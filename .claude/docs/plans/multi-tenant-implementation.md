# Implementation Plan: Multi-Tenant White-Label

**Companion to:** [ADR-009](../decisions/adr-009-multi-tenant-whitelabel.md)
**Status:** Draft — not started
**Date:** 2026-06-02
**Revised:** 2026-07-19 — robustness review: fixed the ALS hook pattern (§4), added composite-FK isolation (§2e), negative caching (§4), per-tenant email branding (§6), interim webhook handling (§7), and the Option 1 playbook (§11)

This is the concrete build plan for Option 2 (shared-instance, row-level multi-tenancy). It assumes the branding layer and interim deployment-per-client bridge from the ADR ship first; this document covers the irreversible part — the data model, tenant resolution, and isolation enforcement.

The three pieces the request asked for are sections **2 (schema diff)**, **4 (tenant-resolution hook)**, and **5 (Prisma isolation extension)**. The rest is the supporting work that makes those three safe.

> **Standing up a client deployment now?** Sections 1–10 are the *target* architecture and none of them is a prerequisite. Use the deployment-per-client playbook in **§11**.

---

## 1. Tiers of data

Before any code, classify every model. The enforcement strategy differs per tier.

| Tier | Models | tenantId | Why |
|------|--------|----------|-----|
| **Root entities** | `User`, `Session`, `MagicLinkToken`, `Profile`, `Project`, `Job`, `UserFavorite`, `ProjectFollow`, `ProjectNeed` | `String` (NOT NULL) | Independently queryable; isolation enforced directly by the extension |
| **Junctions** | `ProfileCategory`, `ProjectCategory`, `ProjectCollaborator`, `ProfileSkill`, `ProjectNeedOption` | `String` (NOT NULL, denormalized) | Composite-PK children. Denormalize tenantId for defense-in-depth so the extension can enforce on direct access, not just via parent |
| **Shared taxonomy** | `Category`, `NeedCategory`, `NeedOption` | none (global) | Platform-default vocabulary shared by all tenants. **Exempt** from the extension |

Decision (per [ADR-009](../decisions/adr-009-multi-tenant-whitelabel.md) and the "no shortcuts" project rule): denormalize `tenantId` onto junctions too. The alternative — protecting junctions only transitively through their parent FK — leaves a direct-query hole that one careless `prisma.profileSkill.findMany()` would open. Denormalization costs a column and a backfill; it buys uniform, single-surface enforcement — and it is what makes the database-level composite-FK enforcement in §2e possible.

Taxonomy stays global for now (`NeedOption` powers cross-tenant matching vocabulary). Per-tenant taxonomy is deferred; when needed, add a **nullable** `tenantId` where `null` = platform-default and the extension reads `tenantId IN (current, NULL)`.

---

## 2. Schema diff

### 2a. New model

```prisma
model Tenant {
  id           String   @id @default(cuid())
  slug         String   @unique          // subdomain: speaker-a.platform.com
  name         String                    // "Speaker A's Community"
  status       TenantStatus @default(active)

  // Branding (served by GET /api/tenant, injected as CSS vars on the SPA)
  displayName  String                    // replaces hardcoded "Detroit Directory"
  logoUrl      String?
  primaryColor String?                   // hex, drives --color-* tokens
  customDomain String?  @unique          // optional vanity domain → maps to this tenant

  // Billing (Stripe Connect — see ADR-009)
  stripeAccountId String? @unique        // connected account; employer revenue lands here

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  users          User[]
  sessions       Session[]
  magicLinkTokens MagicLinkToken[]
  profiles       Profile[]
  projects       Project[]
  jobs           Job[]
  favorites      UserFavorite[]
  projectFollows ProjectFollow[]
  projectNeeds   ProjectNeed[]

  // No @@index on slug/customDomain — @unique already creates those indexes.
  // Junctions carry tenantId as a plain column (§2c), so no back-relations
  // for them are needed here.
}

enum TenantStatus {
  active
  suspended
}
```

### 2b. Root entities — add `tenantId` + relation, change uniqueness

`User` is representative. The pattern repeats for every root model.

```prisma
model User {
  id               String     @id @default(cuid())
  tenantId         String                              // NEW
  email            String                              // was @unique
  status           UserStatus @default(pending)
  isEmployer       Boolean    @default(false)
  isAdmin          Boolean    @default(false)          // now means TENANT admin
  stripeCustomerId String?    @unique                  // stays globally unique
  createdAt        DateTime   @default(now())
  lastLoginAt      DateTime?

  tenant          Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)  // NEW
  profile         Profile?
  sessions        Session[]
  magicLinkTokens MagicLinkToken[]
  favorites       UserFavorite[]
  projectFollows  ProjectFollow[]

  @@unique([tenantId, email])            // CHANGED: email unique per tenant, not globally
  @@unique([tenantId, id])               // NEW: composite-FK target — see §2e
  @@index([tenantId])                    // NEW
  @@index([status])
  @@index([stripeCustomerId])
}
```

Uniqueness changes across the schema:

| Model | Before | After |
|-------|--------|-------|
| `User.email` | `@unique` | `@@unique([tenantId, email])` |
| `Profile.userId` | `@unique` | stays `@unique` (a user has one profile; userId already tenant-bound) |
| `Profile.handle` | `@unique` | `@@unique([tenantId, handle])` |
| `UserFavorite` | `@@unique([userId, profileId])` | unchanged (userId is tenant-bound) — add `tenantId` column + index only |
| `ProjectFollow` | `@@unique([userId, projectId])` | unchanged — add `tenantId` column + index only |
| `ProjectNeed` | `@@unique([projectId, categoryId])` | unchanged — add `tenantId` column + index only |
| `MagicLinkToken.token` | `@unique` | stays `@unique` (random nanoid, globally unique is fine) |
| `Category.slug`, `NeedCategory.slug`, `NeedOption (categoryId,slug)` | unchanged | taxonomy stays global |

`isAdmin` keeps its name but its **meaning narrows to tenant admin**. The platform super-admin is a separate concept — see §6.

### 2c. Junctions — add denormalized `tenantId`

```prisma
model ProfileSkill {
  tenantId  String                       // NEW (denormalized from profile)
  profileId String
  optionId  String
  createdAt DateTime @default(now())

  // No Tenant relation on junctions — tenantId participates in the composite
  // FK below, and a second relation on the same column would conflict.
  // Composite FK (§2e): the DB itself rejects a profileId from another tenant.
  profile Profile    @relation(fields: [tenantId, profileId], references: [tenantId, id], onDelete: Cascade)
  option  NeedOption @relation(fields: [optionId], references: [id], onDelete: Restrict)

  @@id([profileId, optionId])
  @@index([tenantId])                    // NEW — the extension's filter path
  @@index([optionId])
}
```

Same treatment for `ProfileCategory`, `ProjectCategory`, `ProjectCollaborator`, `ProjectNeedOption`.

### 2d. Taxonomy — unchanged

`Category`, `NeedCategory`, `NeedOption` get **no** `tenantId` and are added to the extension's exempt list (§5).

### 2e. Composite FKs — cross-tenant references rejected by the database

The extension (§5) stamps `tenantId` on writes, but it cannot stop a write from *referencing* another tenant's row by id — e.g. creating a `ProjectCollaborator` whose `profileId` belongs to tenant B. The single-column FK would be satisfied, and the row's denormalized `tenantId` would silently contradict its parent's. Close this at the database layer: every FK between two tenant-owned models becomes a **composite FK** `(tenantId, <fk>)` → `(tenantId, id)`.

- Add `@@unique([tenantId, id])` to every referenced parent: `User`, `Profile`, `Project`, `Job`.
- Point each child/junction relation at it: `@relation(fields: [tenantId, profileId], references: [tenantId, id])` — see §2c.
- FKs into the shared taxonomy (`categoryId`, `optionId`) stay single-column; taxonomy has no tenant.

Applies to: `Session`, `MagicLinkToken`, `Profile` (→User), `Project`, `Job`, `UserFavorite` (→User, →Profile), `ProjectFollow` (→User, →Project), `ProjectNeed` (→Project), `ProjectCollaborator` (→Project, →Profile), and all §2c junctions. With this in place, cross-tenant stitching is a constraint violation no matter what any query, extension bug, or future code path does — the same "single auditable surface" argument as §5, but enforced by Postgres as an independent second layer.

---

## 3. Migration strategy

`tenantId` is `NOT NULL` on existing tables with existing rows — so it **cannot** be added in one step. Split into an expand → backfill → contract sequence across **two** Prisma migrations so production never sees a non-null column without data.

**Migration A — expand (all additive, nullable):**
1. `CREATE TABLE "Tenant"` + `TenantStatus` enum.
2. Insert the default tenant (the existing community):
   ```sql
   INSERT INTO "Tenant" (id, slug, name, "displayName", status, "createdAt", "updatedAt")
   VALUES ('tenant_detroit', 'detroit', 'Detroit Directory', 'Detroit Directory', 'active', now(), now());
   ```
3. Add `tenantId` as **nullable** to every root + junction table, with FK.
4. Backfill: `UPDATE "User" SET "tenantId" = 'tenant_detroit' WHERE "tenantId" IS NULL;` — repeat per table. Junctions backfill from their parent:
   ```sql
   UPDATE "ProfileSkill" ps SET "tenantId" = p."tenantId"
   FROM "Profile" p WHERE ps."profileId" = p.id;
   ```

**Migration B — contract (constraints):**
5. `ALTER COLUMN "tenantId" SET NOT NULL` on every table.
6. Drop old global uniques, add composites:
   ```sql
   DROP INDEX "User_email_key";
   CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", email);
   DROP INDEX "Profile_handle_key";
   CREATE UNIQUE INDEX "Profile_tenantId_handle_key" ON "Profile"("tenantId", handle);
   ```
7. Swap single-column FKs to composite FKs (§2e): add the `@@unique([tenantId, id])` parent indexes, then per child table drop the old FK and recreate as e.g. `FOREIGN KEY ("tenantId", "profileId") REFERENCES "Profile"("tenantId", id)`. Do this only after the backfill is verified — a mismatched row makes the constraint fail to apply, which is exactly the point.
8. Add the `@@index([tenantId])` indexes.

Both migrations are written by editing `schema.prisma` to the target state in two passes and using `prisma migrate dev --create-only` to generate the SQL, then hand-editing the backfill statements in. **Never** let Prisma auto-generate a `NOT NULL` add against a populated table — it will fail or default-fill incorrectly.

Seeds split by tier: `seed-needs.ts` touches only exempt taxonomy models and needs no change, but any seed that creates scoped rows (e.g. the example-jobs seed) must run inside `tenantContext.run({ tenantId }, ...)` or use the unscoped escape hatch (§5) — the fail-closed extension will otherwise throw. Fixtures must set `tenantId`.

---

## 4. Tenant-resolution hook

Resolve the tenant from the request host, attach it to the request, and put it into an `AsyncLocalStorage` store that the Prisma extension (§5) reads. Cache lookups so it's not a DB hit per request.

`server/src/lib/tenant-context.ts`:

```ts
import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantStore {
  tenantId: string;
}

// The extension reads from here; the hook writes to it per request.
export const tenantContext = new AsyncLocalStorage<TenantStore>();

export function currentTenantId(): string | undefined {
  return tenantContext.getStore()?.tenantId;
}
```

`server/src/lib/tenant-resolver.ts` — host → tenant with a small TTL cache:

```ts
import { prisma } from "./prisma.js";
import type { Tenant } from "@prisma/client";

const CACHE_TTL_MS = 60_000;
// Caches misses too (tenant: null) — otherwise every request with an unknown
// Host header is a guaranteed DB hit per request, a free DoS vector.
const cache = new Map<string, { tenant: Tenant | null; at: number }>();

/** Extract the tenant key from a host header: "speaker-a.platform.com:443" -> "speaker-a". */
function hostToSlug(host: string, rootDomain: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) return null; // marketing/root
  if (hostname.endsWith(`.${rootDomain}`)) return hostname.slice(0, -(rootDomain.length + 1));
  return null; // not a subdomain — caller falls back to customDomain lookup
}

export async function resolveTenant(host: string, rootDomain: string): Promise<Tenant | null> {
  const now = Date.now();
  const hit = cache.get(host);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.tenant;

  const slug = hostToSlug(host, rootDomain);
  const tenant = slug
    ? await prisma.tenant.findUnique({ where: { slug } })
    : await prisma.tenant.findUnique({ where: { customDomain: host.split(":")[0].toLowerCase() } });

  const resolved = tenant && tenant.status === "active" ? tenant : null;
  cache.set(host, { tenant: resolved, at: now });
  return resolved;
}

export function invalidateTenantCache(host?: string): void {
  if (host) cache.delete(host);
  else cache.clear();
}
```

> The resolver itself calls `prisma.tenant.findUnique` — `Tenant` is on the extension's exempt list (§5), so this lookup is *not* tenant-scoped (it can't be; it's how we discover the tenant).

Wire it into `buildApp` in `server/src/app.ts`, **before** the route registrations and after the existing plugins.

> **Do not use `enterWith` here.** `AsyncLocalStorage.enterWith()` inside an `async` Fastify hook binds the store to the hook function's own async scope; when the hook's promise resolves, Fastify resumes the request in the *parent* context and the store is gone — every scoped query then throws "Tenant context missing". Use the callback-style hook below instead: `done()` is invoked *inside* `tenantContext.run()`, so all remaining hooks, the route handler, and the Prisma extension execute within the store. (This is the same pattern `@fastify/request-context` uses internally; §9 includes a propagation test so a regression here fails loudly in CI.)

```ts
import { tenantContext } from "./lib/tenant-context.js";
import { resolveTenant } from "./lib/tenant-resolver.js";

// ... inside buildApp, before "// Routes"

// Paths that are not tenant-scoped: health, Stripe webhooks (resolved by Connect
// account id, not host), and the public tenant-branding endpoint resolves itself.
const TENANT_EXEMPT_PREFIXES = ["/health", "/webhooks"];

app.addHook("onRequest", (request, reply, done) => {
  if (TENANT_EXEMPT_PREFIXES.some((p) => request.url.startsWith(p))) return done();

  const host = request.headers.host ?? "";
  resolveTenant(host, env.ROOT_DOMAIN)
    .then((tenant) => {
      if (!tenant) {
        reply.status(404).send({ error: "Unknown tenant", code: "TENANT_NOT_FOUND" });
        return; // reply sent — per Fastify hook semantics, done() is NOT called
      }
      request.tenant = tenant;
      // done() runs inside run(), so the rest of the request inherits the store.
      tenantContext.run({ tenantId: tenant.id }, done);
    })
    .catch((err) => done(err));
});
```

Augment the Fastify type (extend `server/src/types/index.ts`):

```ts
import type { Tenant } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
    tenant?: Tenant;   // NEW
  }
}
```

Add `ROOT_DOMAIN` to `env.ts` (e.g. `platform.com`; in dev, `lvh.me` resolves `*.lvh.me` → 127.0.0.1, which is ideal for local subdomain testing).

**Ordering & edge notes:**

- Fastify runs `onRequest` hooks in registration order, and a hook only applies to routes registered *after* it in the same scope. Register tenant resolution before every route registration — including `fastifyStatic` (`app.ts:131`) if SPA assets should 404 on unknown hosts. Leaving static registered first keeps assets tenant-exempt, which is acceptable (the bundle is identical across tenants) — but decide explicitly, don't inherit it from registration order by accident.
- Decide what the **root domain** serves. With unknown-host → 404, `platform.com` itself serves nothing; map it to a marketing/landing route, a redirect, or the super-admin surface (§6) — don't leave it accidental.
- Tenant **suspension** propagates only after the cache TTL (≤60s). Have the super-admin suspend route call `invalidateTenantCache()` for immediate effect.
- Session cookies must stay **host-only** (never set `Domain=.platform.com`) so a cookie minted on one subdomain is not even presented to another; the §6 tenantId assertion remains as the backstop.

---

## 5. Prisma isolation extension

The single enforcement surface. It reads `currentTenantId()` from the ALS store and injects the filter into every query against a scoped model — so routes physically cannot forget to filter.

`server/src/lib/prisma.ts` (replace the bare client export):

```ts
import { PrismaClient } from "@prisma/client";
import { currentTenantId } from "./tenant-context.js";

// Models NOT scoped by tenant: the Tenant table itself + shared taxonomy.
const EXEMPT_MODELS = new Set(["Tenant", "Category", "NeedCategory", "NeedOption"]);

// Operations that take a `where` we can constrain.
const WHERE_OPS = new Set([
  "findFirst", "findFirstOrThrow", "findMany",
  "updateMany", "deleteMany", "count", "aggregate", "groupBy",
]);

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof makeClient> | undefined };

function makeClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (EXEMPT_MODELS.has(model)) return query(args);

          const tenantId = currentTenantId();
          if (!tenantId) {
            // No tenant in context = either a bug or an intentional unscoped path.
            // Fail closed: unscoped access to scoped models is forbidden.
            throw new Error(`Tenant context missing for ${model}.${operation}`);
          }

          // Reads/bulk writes: AND a tenantId filter into the where clause.
          if (WHERE_OPS.has(operation)) {
            args.where = { AND: [args.where ?? {}, { tenantId }] };
            return query(args);
          }

          // findUnique(OrThrow): unique lookups can't take a non-unique field in `where`,
          // so downgrade to findFirst and re-add the tenant filter. Callers get the same
          // single-record semantics but with isolation enforced.
          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            args.where = { AND: [args.where, { tenantId }] };
            // @ts-expect-error operation narrowing — runtime swap to the firstable variant
            return query({ ...args, __op: operation }); // see note below
          }

          // Writes that create rows: stamp tenantId onto data.
          if (operation === "create") {
            args.data = { ...args.data, tenantId };
            return query(args);
          }
          if (operation === "createMany") {
            const rows = Array.isArray(args.data) ? args.data : [args.data];
            args.data = rows.map((r: object) => ({ ...r, tenantId }));
            return query(args);
          }
          if (operation === "upsert") {
            args.where = { AND: [args.where, { tenantId }] };
            args.create = { ...args.create, tenantId };
            return query(args);
          }

          // update/delete by unique id: scope the where.
          if (operation === "update" || operation === "delete") {
            args.where = { AND: [args.where, { tenantId }] };
            return query(args);
          }

          return query(args);
        },
      },
    },
  });
}
```

**The `findUnique` caveat (read this).** Prisma's `findUnique` rejects a `where` containing non-unique fields, so you cannot simply `AND` a `tenantId` into it. Two clean resolutions, pick one project-wide:

- **(preferred) Make the uniques composite** so the natural lookups already include `tenantId` — e.g. query `profile.findUnique({ where: { tenantId_handle: { tenantId, handle } } })`. With the composite uniques from §2b, most `findUnique`s become tenant-safe *by key shape*, and the extension only needs to assert the key contains the right tenantId.
- **(fallback) Convert `findUnique` → `findFirst` in the extension.** The `query()` callback can't change the operation, so instead expose a thin repository helper (`db.findByIdScoped(model, id)`) that calls `findFirst({ where: { id, tenantId } })`, and lint-ban raw `findUnique` on scoped models.

The pseudo-`__op` line above is illustrative only — implement via one of the two real options. This is the single trickiest part of the whole project and deserves its own spike + test before relying on it.

**Escape hatch.** The platform super-admin and the tenant resolver need unscoped access. Provide an explicit `runUnscoped(fn)` that runs `fn` inside `tenantContext.run({ tenantId: SYSTEM }, ...)` — or expose `base` (the un-extended client) under a clearly named `prismaUnsafe` export used only in `tenant-resolver.ts`, webhooks, and super-admin routes. Every use is grep-auditable.

**Surfaces the extension cannot see.** Three query shapes never reach `$allOperations` for the affected model — audit for them per §8:

- **Nested relation writes** — `profile.update({ data: { skills: { create: ... } } })` runs the extension for `Profile`, not `ProfileSkill`; the nested row gets no `tenantId` and dies on the NOT NULL constraint. That fails closed, but confusingly — keep writes top-level. (Verified 2026-07-19: current routes already do — all writes are top-level `create`/`createMany`, including inside `$transaction` callbacks, which the extension *does* cover.)
- **Raw SQL** — `$queryRaw` / `$executeRaw` bypass extensions entirely. The only current use is the health check's `SELECT 1` (`app.ts:236`), which is fine; lint-ban raw queries in route code.
- **Relation `connect` / FK stitching** — stamping `tenantId` on a create cannot stop it from *referencing* another tenant's row. That hole is closed at the database layer by the composite FKs in §2e, not by this extension.

---

## 6. Auth & session changes

- **Session is tenant-bound.** Add `tenantId` to `Session` (done in §2). In `getUserFromSession`, after loading the session, the caller (`requireAuth`) must assert `session.tenantId === request.tenant.id` and 401 otherwise — a cookie minted on tenant A is invalid on tenant B.
- **`AuthUser` gains `tenantId`** (`server/src/types/index.ts`), populated in `getUserFromSession` (`server/src/lib/session.ts:108`).
- **Magic-link issuance** (`createMagicLinkToken`, `verifyMagicLinkToken`) must stamp and create sessions with `tenantId`. Since the extension auto-injects `tenantId` on `create`, and these run inside a request with tenant context, much of this is automatic — but the cross-tenant assertion on verify is explicit.
- **Transactional email must carry tenant branding.** `server/src/lib/email.ts` hardcodes the platform name in the magic-link subject and heading, the profile-review subject, and the approval "Welcome to …" heading; the sender is a single global `EMAIL_FROM` (`env.ts:35`). The magic-link email *is* the auth front door — a white-label client's members must never receive platform-branded mail. Add `emailFrom` to `Tenant`, thread `tenant.displayName` through every template, and treat per-tenant sending domains as a separate Resend/DNS work item.
- **Roles:** `requireAdmin` now gates the **tenant** admin. Add a new `requireSuperAdmin` that checks a separate `SuperAdmin` table (or a `User.isSuperAdmin` flag scoped to the platform-owner tenant) and runs its handlers via the unscoped escape hatch. The admin routes in `server/src/routes/admin.ts` split: per-tenant moderation queues stay (now auto-scoped); tenant provisioning moves to a new `/platform` route group behind `requireSuperAdmin`.

The composite middleware factories in `server/src/middleware/auth.ts` (`authAndApproved`, `authAndEmployer`, `authAndAdmin`) keep their signatures — they get tenant-safe for free because the queries underneath are now scoped.

---

## 7. Billing (Stripe Connect)

- Each `Tenant` gets a connected account (`Tenant.stripeAccountId`). Employer checkouts use `on_behalf_of` / `application_fee_amount` so the tenant receives funds and you take a platform fee.
- Webhooks (`/webhooks`, tenant-exempt) resolve the tenant from the event's connected `account` id, then run handlers inside `tenantContext.run({ tenantId })` so the `isEmployer` toggle from [ADR-006](../decisions/adr-006-stripe-controlled-employer-capability.md) writes to the right tenant.
- Until Connect lands, the interim deployment-per-client model gives each client a native separate Stripe account — no Connect needed for the first clients.
- **Interim shared-instance state** (extension on, Connect not yet): `/webhooks` is tenant-exempt, so handlers run with no tenant context and every `User` write would hit the fail-closed extension and throw. Resolve the tenant from the event's `stripeCustomerId` — kept globally unique in §2b for exactly this reason — then wrap the handler in `tenantContext.run({ tenantId }, ...)`.

---

## 8. Route audit

With the extension in place, isolation is enforced centrally — but audit anyway:
- Grep for every `prisma.<model>.findUnique` on scoped models; convert per §5.
- Grep for any use of `prismaUnsafe` / the escape hatch — each must be justified.
- Confirm no route passes a client-supplied `tenantId`. The extension always overrides from context; reject or ignore any `tenantId` in request bodies.
- Grep for nested relation writes (`create:` / `connect:` / `connectOrCreate:` inside a `data:` block) and for `$queryRaw` / `$executeRaw` — the extension never sees these (§5).
- Uploads (`/api/uploads`): namespace stored objects per tenant (`uploads/<tenantId>/...`) and check tenant ownership on the static `/uploads/` path (or move fully to R2 with keyed prefixes per the project memory).

---

## 9. Testing

This is where the irreversible risk is bought down. Add to the Vitest server suite:
- **Isolation matrix:** seed two tenants; for every route, assert tenant A's session cannot read or mutate tenant B's rows (expect 404/403, never B's data).
- **Extension unit tests:** each operation (`findMany`, `findUnique`, `create`, `createMany`, `upsert`, `update`, `delete`, `count`, `aggregate`) injects/asserts tenantId; exempt models pass through untouched; missing context throws.
- **Context propagation:** an injected request must observe the ALS store inside the route handler — assert `currentTenantId()` matches the host's tenant. This is the regression test for the §4 hook pattern; the broken `enterWith` variant fails it immediately.
- **Resolver tests:** subdomain, custom domain, root domain (404), unknown host (404), suspended tenant (404), cache hit/invalidation, negative-cache hit for unknown hosts.
- **Session cross-tenant:** a session cookie from tenant A presented on tenant B → 401.
- Update `buildTestApp()` and existing fixtures to set tenant context (wrap injected requests with a default tenant host header, e.g. `host: "detroit.lvh.me"`).

Per the project memory, server tests use `app.inject()` + `vitest-mock-extended`; the isolation matrix is the one place worth using a **real** test database (Postgres in CI) rather than mocks, because the whole point is verifying actual query behavior.

---

## 10. Rollout order

1. Branding layer + `GET /api/tenant` (ships independently; forward-compatible).
2. Schema Migration A (expand + backfill) — deploy, verify backfill, no behavior change yet.
3. Add `tenant-context`, `tenant-resolver`, the resolution hook, and `ROOT_DOMAIN` — but leave the extension **off**; verify `request.tenant` resolves correctly in prod logs.
4. Add the Prisma extension behind a flag; run the full isolation test matrix in CI against a real DB.
5. Schema Migration B (NOT NULL + composite uniques).
6. Turn the extension on; split admin → tenant-admin vs. `/platform` super-admin.
7. Stripe Connect.
8. Onboard the second tenant (the first real validation that walls hold).

Steps 1–4 are reversible. Step 5 onward is the committed path — do not start it until a second paying client justifies it (per [ADR-009](../decisions/adr-009-multi-tenant-whitelabel.md) Consequences).

---

## 11. Interim bridge playbook: deployment-per-client (Option 1)

This is what actually ships for the first clients — including the client deployment being prepared as of July 2026. None of §§1–10 is a prerequisite.

### Principles

- **One repo, N deploys — never fork.** Each client is a separate Railway service + separate Postgres running the same codebase, differing only in environment variables. A code fork starts diverging the day it is created and makes the §10 migration to shared-instance tenancy harder; N deploys of one repo are operationally identical for the client and preserve a single migration path.
- **Branding moves to config first.** The hardcoded brand strings catalogued in [branding-name-locations.md](../branding-name-locations.md) — `Header.tsx` logo text, `Login.tsx` heading/tagline, `index.html` title, the email subjects/headings in `email.ts`, the `EMAIL_FROM` default in `env.ts` — become a small config module read from env: `BRAND_NAME`, `BRAND_TAGLINE`, `LOGO_URL`, `EMAIL_FROM`. This is §10 step 1 in its Option 1 form: the same values later move onto the `Tenant` row, so nothing is throwaway, and each new client becomes a pure env-var exercise instead of a find-and-replace.

> Client requires AWS instead of Railway? See [aws-deployment-portability.md](../aws-deployment-portability.md) — the checklist below maps to App Runner/ECS + RDS + S3 with two code changes (storage endpoint config, Dockerfile).

### Per-client provisioning checklist

1. **Railway:** new service from the same repo (nixpacks build) + new Postgres. Apply the known gotchas: `HOST=0.0.0.0`, `--include=dev` install, health check configured before cutover.
2. **Database:** run migrations against the fresh DB; run `seed-needs.ts` (shared taxonomy). Do **not** run demo-content seeds (example jobs) unless the client wants sample data.
3. **First admin:** bootstrap the client owner's user with `isAdmin = true`, `status = approved` (one-off script or SQL) so the approval queue has an operator.
4. **Env:** brand config vars (above); freshly generated cookie/session secrets — never shared across clients; the client's own Stripe keys + webhook secret; R2 bucket (or key prefix) for uploads; Resend key with the client's verified sending domain; production `EMAIL_FROM`.
5. **DNS:** client subdomain or custom domain → the Railway service; verify magic-link email delivery end-to-end before handing over.
6. **Registry:** record the deployment in a per-client registry doc — domain, Railway service, database, Stripe account, R2 bucket, admin contact. This list is the seed data for the eventual `Tenant` table backfill (§3).

### What Option 1 deliberately does not solve

Cross-client discovery, centralized taxonomy updates (each DB re-seeds independently), and a single platform-admin surface. Those are the Option 2 payoffs. When operating more than ~5 clients this way starts to hurt, that is the trigger to begin §10.
