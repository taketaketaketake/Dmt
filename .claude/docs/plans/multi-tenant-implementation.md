# Implementation Plan: Multi-Tenant White-Label

**Companion to:** [ADR-009](../decisions/adr-009-multi-tenant-whitelabel.md)
**Status:** Draft — not started
**Date:** 2026-06-02

This is the concrete build plan for Option 2 (shared-instance, row-level multi-tenancy). It assumes the branding layer and interim deployment-per-client bridge from the ADR ship first; this document covers the irreversible part — the data model, tenant resolution, and isolation enforcement.

The three pieces the request asked for are sections **2 (schema diff)**, **4 (tenant-resolution hook)**, and **5 (Prisma isolation extension)**. The rest is the supporting work that makes those three safe.

---

## 1. Tiers of data

Before any code, classify every model. The enforcement strategy differs per tier.

| Tier | Models | tenantId | Why |
|------|--------|----------|-----|
| **Root entities** | `User`, `Session`, `MagicLinkToken`, `Profile`, `Project`, `Job`, `UserFavorite`, `ProjectFollow`, `ProjectNeed` | `String` (NOT NULL) | Independently queryable; isolation enforced directly by the extension |
| **Junctions** | `ProfileCategory`, `ProjectCategory`, `ProjectCollaborator`, `ProfileSkill`, `ProjectNeedOption` | `String` (NOT NULL, denormalized) | Composite-PK children. Denormalize tenantId for defense-in-depth so the extension can enforce on direct access, not just via parent |
| **Shared taxonomy** | `Category`, `NeedCategory`, `NeedOption` | none (global) | Platform-default vocabulary shared by all tenants. **Exempt** from the extension |

Decision (per [ADR-009](../decisions/adr-009-multi-tenant-whitelabel.md) and the "no shortcuts" project rule): denormalize `tenantId` onto junctions too. The alternative — protecting junctions only transitively through their parent FK — leaves a direct-query hole that one careless `prisma.profileSkill.findMany()` would open. Denormalization costs a column and a backfill; it buys uniform, single-surface enforcement.

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

  @@index([slug])
  @@index([customDomain])
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

  tenant  Tenant     @relation(...)      // optional relation; index is what matters
  profile Profile    @relation(fields: [profileId], references: [id], onDelete: Cascade)
  option  NeedOption @relation(fields: [optionId], references: [id], onDelete: Restrict)

  @@id([profileId, optionId])
  @@index([tenantId])                    // NEW
  @@index([optionId])
}
```

Same treatment for `ProfileCategory`, `ProjectCategory`, `ProjectCollaborator`, `ProjectNeedOption`.

### 2d. Taxonomy — unchanged

`Category`, `NeedCategory`, `NeedOption` get **no** `tenantId` and are added to the extension's exempt list (§5).

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
7. Add the `@@index([tenantId])` indexes.

Both migrations are written by editing `schema.prisma` to the target state in two passes and using `prisma migrate dev --create-only` to generate the SQL, then hand-editing the backfill statements in. **Never** let Prisma auto-generate a `NOT NULL` add against a populated table — it will fail or default-fill incorrectly.

The seed (`seed-needs.ts`) and any fixtures must set `tenantId`.

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
const cache = new Map<string, { tenant: Tenant; at: number }>();

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

  if (tenant && tenant.status === "active") {
    cache.set(host, { tenant, at: now });
    return tenant;
  }
  return null;
}

export function invalidateTenantCache(host?: string): void {
  if (host) cache.delete(host);
  else cache.clear();
}
```

> The resolver itself calls `prisma.tenant.findUnique` — `Tenant` is on the extension's exempt list (§5), so this lookup is *not* tenant-scoped (it can't be; it's how we discover the tenant).

Wire it into `buildApp` in `server/src/app.ts`, **before** the route registrations and after the existing plugins. Critically, use `enterWith` so the store persists through every downstream hook and handler in the same async context:

```ts
import { tenantContext } from "./lib/tenant-context.js";
import { resolveTenant } from "./lib/tenant-resolver.js";

// ... inside buildApp, before "// Routes"

// Paths that are not tenant-scoped: health, Stripe webhooks (resolved by Connect
// account id, not host), and the public tenant-branding endpoint resolves itself.
const TENANT_EXEMPT_PREFIXES = ["/health", "/webhooks"];

app.addHook("onRequest", async (request, reply) => {
  if (TENANT_EXEMPT_PREFIXES.some((p) => request.url.startsWith(p))) return;

  const host = request.headers.host ?? "";
  const tenant = await resolveTenant(host, env.ROOT_DOMAIN);

  if (!tenant) {
    return reply.status(404).send({ error: "Unknown tenant", code: "TENANT_NOT_FOUND" });
  }

  request.tenant = tenant;
  // Persist for the rest of THIS request's async chain (handlers + Prisma extension).
  tenantContext.enterWith({ tenantId: tenant.id });
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

**Ordering note:** this hook must be registered before the existing `onRequest` logging hook is fine either way, but it must run before any route handler. Fastify runs `onRequest` hooks in registration order, so register tenant resolution first.

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

---

## 6. Auth & session changes

- **Session is tenant-bound.** Add `tenantId` to `Session` (done in §2). In `getUserFromSession`, after loading the session, the caller (`requireAuth`) must assert `session.tenantId === request.tenant.id` and 401 otherwise — a cookie minted on tenant A is invalid on tenant B.
- **`AuthUser` gains `tenantId`** (`server/src/types/index.ts`), populated in `getUserFromSession` (`server/src/lib/session.ts:108`).
- **Magic-link issuance** (`createMagicLinkToken`, `verifyMagicLinkToken`) must stamp and create sessions with `tenantId`. Since the extension auto-injects `tenantId` on `create`, and these run inside a request with tenant context, much of this is automatic — but the cross-tenant assertion on verify is explicit.
- **Roles:** `requireAdmin` now gates the **tenant** admin. Add a new `requireSuperAdmin` that checks a separate `SuperAdmin` table (or a `User.isSuperAdmin` flag scoped to the platform-owner tenant) and runs its handlers via the unscoped escape hatch. The admin routes in `server/src/routes/admin.ts` split: per-tenant moderation queues stay (now auto-scoped); tenant provisioning moves to a new `/platform` route group behind `requireSuperAdmin`.

The composite middleware factories in `server/src/middleware/auth.ts` (`authAndApproved`, `authAndEmployer`, `authAndAdmin`) keep their signatures — they get tenant-safe for free because the queries underneath are now scoped.

---

## 7. Billing (Stripe Connect)

- Each `Tenant` gets a connected account (`Tenant.stripeAccountId`). Employer checkouts use `on_behalf_of` / `application_fee_amount` so the tenant receives funds and you take a platform fee.
- Webhooks (`/webhooks`, tenant-exempt) resolve the tenant from the event's connected `account` id, then run handlers inside `tenantContext.run({ tenantId })` so the `isEmployer` toggle from [ADR-006](../decisions/adr-006-stripe-controlled-employer-capability.md) writes to the right tenant.
- Until Connect lands, the interim deployment-per-client model gives each client a native separate Stripe account — no Connect needed for the first clients.

---

## 8. Route audit

With the extension in place, isolation is enforced centrally — but audit anyway:
- Grep for every `prisma.<model>.findUnique` on scoped models; convert per §5.
- Grep for any use of `prismaUnsafe` / the escape hatch — each must be justified.
- Confirm no route passes a client-supplied `tenantId`. The extension always overrides from context; reject or ignore any `tenantId` in request bodies.
- Uploads (`/api/uploads`): namespace stored objects per tenant (`uploads/<tenantId>/...`) and check tenant ownership on the static `/uploads/` path (or move fully to R2 with keyed prefixes per the project memory).

---

## 9. Testing

This is where the irreversible risk is bought down. Add to the Vitest server suite:
- **Isolation matrix:** seed two tenants; for every route, assert tenant A's session cannot read or mutate tenant B's rows (expect 404/403, never B's data).
- **Extension unit tests:** each operation (`findMany`, `findUnique`, `create`, `createMany`, `upsert`, `update`, `delete`, `count`, `aggregate`) injects/asserts tenantId; exempt models pass through untouched; missing context throws.
- **Resolver tests:** subdomain, custom domain, root domain (404), unknown host (404), suspended tenant (404), cache hit/invalidation.
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
