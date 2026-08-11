# Implementation Plan: DynamicHQI Founders Education (standalone course site on AWS)

> Extract a course-only snapshot of this platform into a standalone repo, containerize it, stand it
> up in DYNAMICHQI's own AWS account with their data migrated in, and decommission the Railway
> deployment as a clean break.

---

## Status

**Current Phase:** Phase 0 (preconditions — blocked on commercial terms and client AWS/service accounts)

No code work has started. Phase 1 can proceed in parallel with Phase 0, but nothing may be deployed
into the client's AWS account until Phase 0's license terms and IAM access are settled.

---

## Phase Completion Rules

A phase may be marked COMPLETE only when:
1. All exit criteria are satisfied
2. All required validation commands have been executed successfully
3. A phase audit has passed (review the diff against the phase's deliverables; no stray scope)

**Validation is mandatory for phase completion.**

External dependencies do not count as completed work. A phase waiting on the client, a DNS owner, or
an AWS account provisioning step stays IN PROGRESS/BLOCKED with the exact handoff recorded.

---

## Context

### There is no "Dwimbs code" in this repo

`grep -ri dwimbs` across all source returns zero hits — only `.claude/docs/clients.md` and
`.claude/docs/plans/course-platform-template.md`. Dwimbs is *this repo*, deployed to a second
Railway service with different env vars, a `dynamichqi` theme skin, and its own course manifest.
Yard Line runs the identical template.

So "extract Dwimbs" means **extract the course platform from the community platform**, then deploy
the result as a standalone site for one client. Yard Line and Detroit stay on this repo, unchanged.

### Decisions taken

| Decision | Choice | Consequence |
|---|---|---|
| Nature of the split | Client fork, not a product line | Yard Line stays here; the extracted repo is a one-off snapshot, not a maintained upstream |
| Ongoing support | **Clean break** — point-in-time snapshot | No upstream link. Security fixes made here never reach them. Must be stated in the contract |
| Hosting | **DYNAMICHQI's own AWS account** | You build and deploy directly into their account. There is no infrastructure transfer at the end — it was never yours |
| Packaging | **Dockerfile** (replaces nixpacks) | Portable build artifact; required by the client's AWS standards. Written in the fork, never in this repo — see "Why the Dockerfile lives in the fork" |
| Live data | **Preserved** — real members + lesson progress since 2026-07 | `pg_dump` from Railway Postgres, restore into RDS |
| Railway | **Decommissioned** after cutover | Kept running and untouched until AWS is verified; it is the rollback |

### Why this shape is far safer than the Railway-transfer plan it replaces

The previous version of this plan transferred the running Railway project in place, which forced an
**irreversible `_prisma_migrations` rewrite on live production** inside a hard maintenance window —
the single highest-risk step in the whole handover.

Moving to AWS removes it. The database is restored from a dump into a *new* RDS instance, so the
migration-history conversion happens on a throwaway copy that can be rebuilt from the dump any number
of times. **The live Railway deployment is never modified at any point in this plan.** Cutover is a
DNS change, and rollback is pointing DNS back.

This is the sequencing principle now:

**Build the new thing beside the old one, verify it fully, cut over by DNS, decommission last.**

### Persistent storage strategy (AWS)

Two stateful things. Neither may live on the container filesystem — the app already refuses to boot
in production without object storage configured (`server/src/lib/env.ts:101`), precisely so uploads
don't land on ephemeral disk.

| State | AWS service | Notes |
|---|---|---|
| Application database — users, sessions, course content, lesson progress, quiz attempts | **RDS PostgreSQL 16** | `DATABASE_URL` only. RDS enforces TLS: append `?sslmode=require`. Automated backups + PITR enabled; retention agreed in Phase 0 |
| User/course asset uploads — slides, lesson audio, branding images | **S3** (+ CloudFront) | `lib/storage.ts` already speaks the S3 API via `@aws-sdk/client-s3`; see the generalization in Phase 1. `R2_PUBLIC_URL` becomes the CloudFront domain or S3 website URL |
| Everything else | — | Stateless. Containers are disposable; the local-disk upload fallback (`routes/uploads.ts:68`) is dev-only and unreachable in production |

Migrations run at container start, so the task needs RDS reachability before its health check can
pass — see the App Runner caveat in Phase 1.

### Findings that shape the work

- **The approval flow is coupled to `Profile`.** Dwimbs runs with `REQUIRE_ACCESS_APPROVAL` unset
  (defaults `true`), so `server/src/routes/auth.ts:61` creates new users as `status: "pending"`. The
  only transition to `approved` is `POST /admin/profiles/:id/approve`
  (`server/src/routes/admin.ts:111`), which updates profile and user in one transaction. Admin has
  `suspend`/`reinstate` for users but **no user-level approve**. Deleting `Profile` without replacing
  this strands every new signup. This is the one part of the extraction that is net-new code rather
  than deletion — see Phase 1.
- **The post-login redirect chain has three hops, not one.** Fixing `web/src/pages/Login.tsx:20`
  alone is insufficient. With `REQUIRE_ACCESS_APPROVAL` on, `server/src/routes/auth.ts:105` redirects
  to `/`; `web/src/App.tsx:153` then sends authenticated users to `/people`; and
  `components/layout/RequireApproved.tsx:18` sends *un*approved users to `/account`. All three
  destinations are deleted by this extraction. Every hop must be redefined — see Phase 1.
- **`reject` has no database transition.** `UserStatus` is only `pending | approved | suspended`
  (`server/prisma/schema.prisma:14`); `rejected` exists solely on `ProfileApprovalStatus`, which is
  being deleted. Rejection semantics must be chosen explicitly — see Phase 1.
- **The build is nixpacks-only today.** `nixpacks.toml` + `railway.json` are the entire deploy
  definition; `docker-compose.yml` is a dev-only Postgres 16 on host port 5438 and does **not**
  containerize the app. There is no portable build artifact, so the Dockerfile is net-new work.
- **The frontend is served by the API process, from a sibling path.** `server/src/index.ts:32`
  resolves the SPA at `process.cwd()/../web/dist`. Any image layout must preserve the
  `server/` + `web/dist` sibling structure with `WORKDIR /app/server`, or production serves a bare
  API with no UI and a 404 handler that cannot find `index.html`.
- **The SPA's branding vars are build-time, not runtime.** `VITE_BRAND_NAME`, `VITE_BRAND_TAGLINE`,
  `VITE_BRAND_THEME`, `VITE_LOGO_URL` are inlined by Vite during `npm --prefix web run build`. They
  must be Docker **build args**; setting them as task environment variables does nothing. (The server
  reads its own `BRAND_*` vars at runtime via `GET /api/tenant` — the two sets must agree.)
- **`prisma migrate deploy` runs before the server process** (`nixpacks.toml:34`), ahead of
  `node dist/index.js`. That ordering carries into the Docker entrypoint, and it interacts with
  autoscaling — see the Phase 1 caveat.
- **Object storage is nearly portable already.** `lib/storage.ts:15-17` hardcodes `region: "auto"`
  and the R2 account endpoint; everything else is env-driven. Making endpoint/region configurable is
  ~10 lines. See `.claude/docs/aws-deployment-portability.md` for the full gap analysis.
- **The shared web layer is not community-free.** `web/src/lib/api.ts` (654 LOC) and
  `web/src/hooks/queries.ts` (479 LOC) carry ~135 and ~155 community-referencing lines respectively,
  plus `components/layout/Header.tsx` nav links. Deleting only pages leaves this dead code compiling
  and shipping.
- **`stripeCustomerId` and `isEmployer`** on `User` are nullable / defaulted, so they can be dropped
  from the Prisma model and left as inert orphan columns — no destructive migration on live data.
- **`.claude/docs/clients.md` must not ship.** It contains Yard Line's domain, Railway project names,
  R2 prefixes, and every launch shortcut across all three deployments.
- **No `LICENSE` file exists in this repo.** The code grant is currently undefined.

### Why the Dockerfile lives in the fork, not here

Railway **prefers a Dockerfile over nixpacks whenever one exists in the repo**. Adding one to this
repo would silently change the build for Detroit and Yard Line, both of which are live and neither of
which asked for it. The fork has no such constraint — it deletes `nixpacks.toml` and `railway.json`
outright. Do not "prepare" the Dockerfile upstream first.

### Course-platform surface (kept)

`routes/courses.ts` (606 LOC), `prisma/seed-course.ts`, models `Course` / `CourseModule` / `Lesson` /
`LessonProgress` / `KnowledgeCheck` / `QuizQuestion` / `QuizAttempt`, web `CourseLanding` / `Courses`
/ `CourseDetail` / `Lesson` / `ModuleQuiz` + `components/course/*`.

### Shared core (kept, duplicated into the fork)

Magic-link auth, sessions, `middleware/auth.ts`, `lib/email.ts`, `lib/storage.ts`, `routes/tenant.ts`
+ branding + `themes.css`, admin user management, `lib/env.ts`, the Vitest harness.

### Community surface (removed, ~2,900 LOC server)

`routes/{profiles,projects,jobs,needs,categories,favorites,follows,billing,webhooks}.ts`,
`lib/stripe.ts`, models `Profile` / `ProfileCategory` / `Project` / `ProjectCategory` /
`ProjectCollaborator` / `Job` / `Category` / `UserFavorite` / `ProjectFollow` / `NeedCategory` /
`NeedOption` / `ProfileSkill` / `ProjectNeed` / `ProjectNeedOption`, web `People` / `PersonDetail` /
`Projects` / `ProjectDetail` / `Jobs` / `JobDetail` / `account/*`, `components/{FilterSelect,
NeedsDisplay,NeedsEditor,ProjectMatches,SkillsEditor}`, admin `ApprovalQueue` / `ProfileReview` /
`JobQueue`.

---

## Stack (the fork, on AWS)

| Component | Purpose |
|-----------|---------|
| React + Vite (`web/`) | SPA; landing page, course player, `dynamichqi` theme skin. Built into the image, served by the API process |
| Fastify + Prisma (`server/`) | API, magic-link auth, course delivery, quiz grading, static SPA serving |
| **Docker** | Multi-stage build replacing nixpacks. The only build artifact |
| **AWS App Runner** (recommended) or **ECS Fargate + ALB** | Compute. App Runner is closest to the Railway experience; ECS if the client mandates VPC placement. Decided in Phase 0 |
| **Amazon RDS PostgreSQL 16** | Database. `DATABASE_URL` with `?sslmode=require` |
| **Amazon S3** (+ CloudFront) | Slide images, lesson audio, branding assets |
| **Amazon ECR** | Image registry |
| **AWS Secrets Manager** (or App Runner/ECS secret refs) | `SESSION_SECRET`, `DATABASE_URL`, API keys |
| Resend, or **Amazon SES** if the client mandates AWS-native | Transactional email. Decided in Phase 0 |

---

## PHASE 0 — Preconditions (commercial + client AWS accounts)

### Goal

Settle the terms of the code grant, choose the AWS shape, and obtain the client-account access that
Phases 2–4 write to. Nothing here is code, and no deployment can start without it.

### Deliverables

- **License terms for the code grant, agreed in writing.** DYNAMICHQI receives a working course
  platform functionally identical to what Yard Line pays for. What they may do with it — use, modify,
  resell, sublicense — must be explicit. Add the agreed `LICENSE` to the fork in Phase 1.
- **Written acknowledgement of the clean break**: the snapshot is unsupported, and fixes made in this
  repo (e.g. `be4bbf4` scanner-safe magic links) will not reach them.
- **Compute target chosen and recorded here: App Runner or ECS Fargate.** Recommend App Runner unless
  the client has existing ECS/VPC standards. This decides the Phase 4 deploy mechanics and whether an
  ALB, VPC connector, and target groups are in scope.
- **AWS access into DYNAMICHQI's account**: an IAM role or user scoped to ECR push, App Runner/ECS,
  RDS, S3, CloudFront, and Secrets Manager. Confirm the region and any SCP/guardrail constraints
  (some org policies block public S3 buckets outright, which changes the CloudFront design).
- **Email decision**: Resend (works fine from AWS, keeps `lib/email.ts` unchanged) or SES (needs a
  small provider adapter — treat as added Phase 1 scope if chosen). If Resend, the client's sending
  domain must be verified; DNS records go in the Squarespace zone, which is authoritative per
  `clients.md`.
- **Backup policy agreed**: RDS automated backup retention and whether PITR is required.
- **DNS cutover mechanics for `course.dynamichqi.com` confirmed**: it currently points at Railway in
  the client's Squarespace zone. Record who can change it, and the TTL — lower it at least one TTL
  period before Phase 4 so cutover and rollback are both fast.

### Exit Criteria

- [ ] Signed/written license terms on file, and the `LICENSE` text chosen
- [ ] Clean-break/no-support term acknowledged in writing
- [ ] Compute target (App Runner vs ECS Fargate) chosen and recorded above with reasoning
- [ ] AWS access into the client account verified: a test ECR push and a test RDS connection both succeed
- [ ] Region and any org guardrails affecting public buckets / networking recorded
- [ ] Email provider decided; if Resend, client domain verified and a test send succeeds
- [ ] RDS backup retention / PITR policy agreed
- [ ] DNS ownership confirmed and TTL for `course.dynamichqi.com` lowered

### Status: NOT STARTED (BLOCKED — commercial terms)

---

## PHASE 1 — Build the extracted repo

### Goal

Produce a standalone, course-only, containerized repo that builds and tests green, containing no
community code and no other client's material.

### Deliverables

**Extraction**

- **New repo, single initial commit, no imported history.** A clean break must not carry this repo's
  commit log — it contains the full community codebase, Yard Line's provisioning details, and
  anything that ever passed through a commit. Do not use `git filter-repo`.
- Delete the community server surface: `routes/{profiles,projects,jobs,needs,categories,favorites,
  follows,billing,webhooks}.ts`, `lib/stripe.ts`, their tests, and their registrations in
  `server/src/app.ts`.
- Delete the community web surface: `pages/{People,PersonDetail,Projects,ProjectDetail,Jobs,
  JobDetail}`, `pages/account/*`, `components/{FilterSelect,NeedsDisplay,NeedsEditor,ProjectMatches,
  SkillsEditor}`, admin `{ApprovalQueue,ProfileReview,JobQueue}`, their tests, and their routes +
  lazy imports in `web/src/App.tsx`. Resolve what remains of `/account` — with profile, projects,
  jobs, favorites, following, and billing all gone, the shell has no children.
- **Prune the shared web layer**, not just pages: `web/src/lib/api.ts` and `web/src/hooks/queries.ts`
  (community request functions, query keys, hooks, and response types), `contexts`/auth types
  carrying `Profile`, and `components/layout/{Header,Shell}` plus their tests.
- Prune `schema.prisma` to `User`, `Session`, `MagicLinkToken` + the 7 course models. Drop
  `stripeCustomerId` and `isEmployer` from `User` (they remain as inert orphan columns in the
  migrated DB). Drop the now-unused enums.
- Squash `server/prisma/migrations/` (7 migrations) into a single `0_init` generated from the pruned
  schema.
- Delete community seeds: `seed-demo.ts`, `seed-jobs.ts`, `seed-needs.ts`, `seed-categories.ts`,
  `seed.ts`, and their `package.json` scripts. Keep `bootstrap-admin.ts` and `seed-course.ts`.
- Strip community env from `lib/env.ts` (Stripe vars) and the `.env.example`.
- **Strip other clients' material**: delete `prisma/courses/yard-line/`, the `:root[data-theme=
  "yardline"]` blocks from `web/src/styles/themes.css` (lines 70–121), and `.claude/docs/` in its
  entirety. Keep only the `dynamichqi` theme.
- Add the agreed `LICENSE` and a `README.md` written for DYNAMICHQI's engineers: local setup, env var
  reference, `seed:course` workflow, Docker build/run, AWS deploy, and how to add lesson content.

**Net-new: user-level access approval**

Replace the profile-based queue so `REQUIRE_ACCESS_APPROVAL=true` still works:

- `GET /admin/users/pending`, `POST /admin/users/:id/approve`, `POST /admin/users/:id/reject` in
  `routes/admin.ts`, alongside the existing `suspend`/`reinstate`.
- An admin pending-users page replacing `ApprovalQueue`/`ProfileReview`.
- Reuse `sendProfileApprovedEmail` / `sendProfileRejectedEmail` from `lib/email.ts`, retitled for
  account rather than profile review.
- **Rejection semantics — a pre-implementation gate.** `UserStatus` has no `rejected` value. This is
  currently an open decision, and **Phase 1 may not be marked COMPLETE while it remains one.** Pick
  one behavior, then make the route, the admin UI wording, the re-registration policy, and
  `reinstate` all agree with it. A half-settled design here ships a queue whose button text promises
  something the database does not do.

  Default recommendation: **map reject → `suspended`**, because `requireApproved()` already 403s on
  `suspended` and it needs no schema change. The alternative — adding `rejected` to the enum — cannot
  ride in `0_init`, which is resolved-as-applied and never executes, so it requires a second
  genuinely-running migration.

  The four answers that must agree, whichever is chosen:

  | Question | Under reject → `suspended` |
  |---|---|
  | Route behavior | `POST /admin/users/:id/reject` sets `suspended` and deletes the user's `Session` + `MagicLinkToken` rows (do not rely on expiry) |
  | Admin UI wording | Cannot say "Rejected" if the stored state is Suspended and the list filters on it — either relabel the action, or render suspended-via-reject distinctly and accept that the two are indistinguishable after the fact |
  | Re-registration | `routes/auth.ts:61` sets `status` only on user *creation*, so a rejected address requesting a new link is **not** reset to pending — they stay locked out silently. Confirm that is intended, and decide what the login page tells them |
  | Reinstate | `POST /admin/users/:id/reinstate` sets `approved`, which would promote a rejected user straight past review. Either block reinstate for reject-suspended users or accept it as the deliberate undo |

  The reinstate collision is the sharpest consequence: with one `suspended` state, "unsuspend a
  misbehaving member" and "undo a rejection" become the same button with different intended outcomes.
  If that is unacceptable, the enum-value route is the honest choice despite the extra migration.

**Net-new: redefine the full post-login redirect chain**

All three hops point at deleted routes:

- `server/src/routes/auth.ts:105` — approval-enabled logins redirect to `/`. Point approved users at
  `/courses`.
- `web/src/App.tsx:153` — the authenticated `/` redirect targets `/people`. Change to `/courses`.
- `web/src/pages/Login.tsx:20` — already-authenticated visitors are sent to `/people`. Change to
  `/courses`.
- `components/layout/RequireApproved.tsx:18` — unapproved users are sent to `/account`, which this
  phase deletes. Needs a real destination: add a minimal "awaiting approval" page (it is the only
  thing a pending member can see) and point the gate at it. Update its doc comment, which still
  describes `POST /admin/profiles/:id/approve`.
- `pages/NotFound.tsx` and `components/layout/Header.tsx` nav — remove `/people`, `/projects`,
  `/jobs` links; resolve or remove `/account`.

**Net-new: containerize (replaces nixpacks)**

- **Delete `nixpacks.toml` and `railway.json`.** They describe a platform the fork does not use, and
  `nixpacks.toml:34` invokes two seeds this phase deletes.
- Keep `docker-compose.yml` for local Postgres, updated to a course-only database name.
- **Add a multi-stage `Dockerfile`** replicating the current build faithfully:
  - Base on a Node 22 image that ships **openssl** — Prisma's query engine requires it at build and
    runtime. This is the most common cause of a working nixpacks build failing in a slim/alpine image.
  - Install with `--include=dev` in the build stage: `typescript`, `vite`, and the `prisma` CLI are
    needed to build, and `NODE_ENV=production` would otherwise make npm omit them.
  - Build order: `npm --prefix web run build` → `prisma generate` → `npm --prefix server run build`.
  - **Declare `ARG VITE_BRAND_NAME / VITE_BRAND_TAGLINE / VITE_BRAND_THEME / VITE_LOGO_URL` and set
    them before the web build.** They are inlined at build time; passing them at runtime does nothing.
  - **Preserve the sibling layout**: `/app/server` and `/app/web/dist`, with `WORKDIR /app/server`,
    because `server/src/index.ts:32` resolves the SPA at `process.cwd()/../web/dist`.
  - Runtime stage carries production `node_modules`, `server/dist`, `web/dist`, the generated Prisma
    client, `prisma/` (migrations + `seed-course.ts`), and `tsx` if the entrypoint invokes it.
  - Run as a non-root user. `EXPOSE` the port. **`HOST` must be `0.0.0.0`** — the default is
    `localhost`, which makes the container unreachable and the health check fail.
  - `HEALTHCHECK` against `/health`.
- Add a `.dockerignore` (`node_modules`, `dist`, `dist-ssr`, `.env`, `.git`, `uploads`).
- **Entrypoint runs `prisma migrate deploy` before `node dist/index.js`**, as nixpacks did. Record the
  autoscaling caveat: every task runs it on start. Prisma takes a Postgres advisory lock so concurrent
  runs serialize rather than corrupt, but under App Runner/ECS scale-out this adds startup latency and
  couples deploys to schema changes. If the client objects, the alternative is a separate one-off
  migration task run before the service deploy — decide in Phase 4, not here.
- Verify locally: `docker build` succeeds and the container serves the SPA, `/health`, and
  `/api/tenant` against the compose Postgres.

**Net-new: real-S3 object storage**

- Generalize `lib/storage.ts:13-24`, which hardcodes `region: "auto"` and the R2 account endpoint.
  Add `S3_REGION` and an optional `S3_ENDPOINT`: endpoint unset → real AWS S3 in the given region;
  endpoint set → R2/MinIO. Keep the public-URL behavior as-is — `R2_PUBLIC_URL` already accepts a
  CloudFront domain.
- Rename the `R2_*` env vars to provider-neutral names (`STORAGE_*`) in the fork, updating
  `lib/env.ts`, its production fail-fast guard (`env.ts:101`), and `.env.example`. The fork has no
  deployed instances to migrate, so this is free here and confusing later.
- Note in the README that RDS requires `?sslmode=require` on `DATABASE_URL`.

**Tests**

- Covering pending → approved, pending → rejected (with session invalidation), that a pending user is
  still refused by `authAndApproved()`, and that a pending user's redirect target renders.
- Covering the storage client construction: endpoint-set and endpoint-unset both produce a usable
  client and the expected public URL.

### Exit Criteria

- [ ] `grep -ri "yard\s*line\|yardline\|detroit\|takedetroit\|dmtisreal" .` returns no hits in the fork
- [ ] `grep -rn "profile\|project\|job\|stripe\|favorite\|follow\|need\|skill\|categor" server/src
      web/src -i` returns no community references (course/lesson code and the word "project" in prose
      excepted). **Must cover `web/src`, not just `server/src`** — `lib/api.ts`, `hooks/queries.ts`,
      `contexts`, and `components/layout` are where dead community code survives a pages-only deletion
- [ ] `grep -rn "/people\|/projects\|/jobs\|/account" web/src` returns nothing outside deliberate redirects
- [ ] `grep -rn "nixpacks\|railway" .` returns nothing
- [ ] `cd server && npm test` green
- [ ] `cd web && npm test` green and `npm run build` succeeds
- [ ] `cd web && npx tsc --noEmit` clean, and the built bundle contains no community route chunks
- [ ] `npx prisma validate` passes and `0_init` applies cleanly to an empty database
- [ ] `docker build` succeeds; the image runs against the compose Postgres and serves `/health`,
      `/api/tenant` (correct branding + `theme: "dynamichqi"`), and the SPA at `/` — **the SPA
      specifically, since a wrong image layout yields a working API with no UI**
- [ ] Branding build args verified: the rendered H1 changes when `VITE_BRAND_NAME` changes at build
      time, and does **not** change when set only at runtime
- [ ] Container reachable from outside itself (`HOST=0.0.0.0` proven, not assumed)
- [ ] Storage generalization verified against a real S3 bucket: upload succeeds and the returned
      public URL resolves
- [ ] Local smoke on a fresh DB: bootstrap an admin, seed the course, request a magic link, follow it,
      land on the awaiting-approval page (not a 404 or a redirect loop), approve from the admin page,
      then reach `/courses` — with `REQUIRE_ACCESS_APPROVAL` both unset and `false`
- [ ] **Rejection design settled**, not deferred: one behavior chosen and recorded, and the route,
      admin UI wording, re-registration policy, and `reinstate` behavior all verified consistent with
      it. Phase 1 is not COMPLETE while any of the four disagree
- [ ] Reject path smoke: a rejected user's session is invalidated, they cannot reach `/courses`, and
      requesting a fresh magic link does the documented thing rather than an undocumented one

### Status: NOT STARTED

---

## PHASE 2 — Provision AWS and rehearse the data migration

### Goal

Stand up the client's AWS infrastructure and prove the Railway database restores into RDS with its
migration history converted and no data loss — all on a copy, with the live deployment untouched.

### Provisioning deliverables

- ECR repository; push the Phase 1 image.
- RDS PostgreSQL 16 instance with the agreed backup retention/PITR, TLS enforced, reachable from the
  compute target.
- S3 bucket for course assets with public read (or origin-access-controlled behind CloudFront if org
  guardrails block public buckets — decided in Phase 0), plus CloudFront distribution if used.
- Secrets Manager entries for `DATABASE_URL`, `SESSION_SECRET`, storage credentials, and the email
  API key. **Generate a new `SESSION_SECRET`** — do not carry the Railway one across; it has been held
  by the operator. This logs every member out once at cutover; that is deliberate and the client must
  be told so they can warn members.

### Migration-history strategy

Two viable approaches. Rehearse **A**; fall back to **B** if the rehearsal is not clean.

**Option A — convert the history (default).** After restoring the dump into RDS, replace the seven
DMT rows in `_prisma_migrations` with a single `0_init` row, so the database history exactly matches
the fork's `migrations/` directory. Clean repo and clean `migrate status` for the client.

1. `CREATE TABLE _prisma_migrations_pre_fork AS SELECT * FROM _prisma_migrations;`
2. `DELETE FROM _prisma_migrations;`
3. `npx prisma migrate resolve --applied 0_init` — this recomputes the checksum from the fork's own
   migration file, which is why it is used instead of a hand-written `INSERT`.

Deleting *before* resolving is what makes the history match; resolving alone leaves eight rows.

**Unlike the superseded Railway-transfer plan, this runs against RDS, not production.** If it goes
wrong, drop the database and restore the dump again. There is no maintenance window and no
irreversible operation.

**Option B — inherit the seven migrations verbatim (fallback).** Ship the fork with the existing
`migrations/` directory untouched. Day-one `migrate deploy` is a genuine no-op because all seven are
already applied. Costs: the client inherits migration files that create community tables their schema
no longer models, and any fresh database (a staging clone, a future rebuild) comes up with ~14 orphan
tables.

Option A is the better product and is now cheap. Record the choice and the reasoning here.

### Migration deliverables

- `pg_dump` of the Railway Dwimbs production database, stored outside the repo. This is the rollback
  artifact for every later phase — take it here and again immediately before Phase 4's final sync.
- Restore into RDS, then a **full rehearsal of the chosen strategy end to end**, with every command
  and its output recorded verbatim in this plan so Phase 4 is a transcript replay and not an
  improvisation.
- **Empirical answers, written down** — do not assume Prisma's behavior:
  - Does `migrate deploy` succeed, warn, or fail when the database holds applied migrations absent
    from the local directory? (Decides whether the naive resolve-only approach was ever viable.)
  - What exactly does `migrate status` print before and after the conversion?
  - Does `migrate deploy` behave differently on the very next deploy versus a subsequent one?
- A written record of which orphan tables remain (`Profile`, `Project`, `Job`, `Category`, and the
  rest) and the confirmation that no code path reads them.
- Verification that admin user deletion still behaves: `Session` and `MagicLinkToken` are
  `onDelete: Cascade`, but `Profile`'s FK to `User` survives in the DB after the model leaves the
  schema — confirm its `onDelete` and that deleting a user with a legacy profile row does not error.
- **A documented, repeatable restore procedure**, since Phase 4 re-runs it against a final dump taken
  at cutover. Anything hand-typed here becomes a script.

### Exit Criteria

- [ ] ECR, RDS, S3/CloudFront, and Secrets Manager provisioned in the client account
- [ ] New `SESSION_SECRET` generated and stored in Secrets Manager; never the Railway value
- [ ] Strategy A or B chosen, recorded above with reasoning
- [ ] Full rehearsal on the RDS-restored dump completed, with commands and outputs transcribed
- [ ] After conversion, `_prisma_migrations` contains exactly the rows the fork's `migrations/`
      directory expects — one row for A, seven for B — verified by direct `SELECT`, not inference
- [ ] `prisma migrate status` reports the database up to date with **no** "found in the database but
      not in the local migrations directory" warnings
- [ ] `prisma migrate deploy` applies nothing and exits 0
- [ ] The three empirical questions above are answered in writing
- [ ] App boots against RDS over TLS (`?sslmode=require` confirmed working, not assumed)
- [ ] A real member's lesson progress and quiz attempts render correctly and match pre-migration row counts
- [ ] An existing approved member can still authenticate; an existing pending member appears in the
      new user approval queue
- [ ] Deleting a test user with a legacy `Profile` row succeeds
- [ ] Restore + conversion procedure is scripted and re-run at least twice from scratch with identical results
- [ ] **The live Railway deployment was not modified** — confirmed by checking its env vars and
      deployment history are unchanged since the phase began

### Status: NOT STARTED (BLOCKED — Phase 0 AWS access)

---

## PHASE 3 — Migrate assets and email to client-owned services

### Goal

Point the new AWS deployment at the client's own object storage and sending domain, so nothing it
serves depends on operator-owned accounts. **The live Railway deployment keeps using the shared
accounts until it is decommissioned** — it is the rollback and must stay working.

### Deliverables

- Copy `courses/corporate-financial-education/**` (118 slides at 1600px, plus audio if the client
  recordings have landed) from `dmt-uploads` (R2) to the client's S3 bucket, preserving the key layout.
- Point the AWS deployment's storage env at the client bucket (+ CloudFront public URL); verify slides
  and audio load from the new origin.
- Configure email on the AWS deployment: the client's verified Resend domain, or SES per the Phase 0
  decision. Verify a magic link round-trips to a real inbox and renders correctly.
- Do **not** change the Railway service's env vars. Do **not** repoint `APP_URL` at
  `course.dynamichqi.com` on AWS until Phase 4's cutover — per the standing ordering rule in
  `clients.md`, never point `APP_URL` at a domain before it resolves to that deployment. Use a
  temporary App Runner/ALB hostname until then.

### Exit Criteria

- [ ] Every slide in every lesson loads on the AWS deployment from the client bucket (spot-check
      first, middle, last lesson) with no mixed-content or 403 errors
- [ ] Magic-link email from the AWS deployment arrives from the client's domain and completes a login
      against the temporary hostname
- [ ] No AWS env var references `dmt-uploads` or the shared Resend sender
- [ ] Railway env vars verified unchanged and the Railway deployment still healthy

### Status: NOT STARTED (BLOCKED — Phase 0 client accounts)

---

## PHASE 4 — Deploy, verify, and cut over DNS

### Goal

Run the forked, containerized codebase on AWS with the real data, verify it fully on a temporary
hostname, then move `course.dynamichqi.com` to it — with Railway still live behind you.

### Deliverables

**Order is load-bearing. Convert the migration history BEFORE the service starts, never after.**

The entrypoint runs `prisma migrate deploy` before the server process exists. If the service is
started against a restored-but-unconverted database, that command finds `0_init` pending against a
database that already has every table, fails on the first `CREATE TABLE`, and the task crash-loops.

Steps, in this order:

1. **Freeze writes on Railway** for the cutover window — the simplest form is a short announced
   maintenance period; members logging in or completing lessons during the final sync would have
   that progress lost. Record the chosen mechanism and its duration.
2. Final `pg_dump` from Railway.
3. Restore into RDS and replay the Phase 2 conversion transcript exactly (under Option B, the
   conversion step is empty).
4. `SELECT migration_name FROM _prisma_migrations` and confirm the rows match the fork's
   `migrations/` directory exactly. Then verify `npx prisma migrate status` is clean.
5. **Then** deploy the image to App Runner/ECS. Its boot-time `migrate deploy` is now a no-op.
6. Full verification pass on the temporary hostname (below).
7. Set `APP_URL` to `https://course.dynamichqi.com`, redeploy, and **then** move DNS. Magic links are
   built from `APP_URL`, so a link issued before this step points at the old host.
8. Watch logs and health for an agreed soak period before Phase 5.

**Rollback is DNS.** Point `course.dynamichqi.com` back at Railway, which has been running untouched
throughout. Members lose only what they did on AWS during the soak — bounded by the soak length,
which is why the soak comes before decommissioning rather than after.

Also decide here, per the Phase 1 caveat: keep `migrate deploy` in the entrypoint, or split it into a
separate one-off migration task run before the service deploy. Record the decision.

### Exit Criteria

- [ ] Write freeze announced and in effect for the sync window; mechanism and duration recorded
- [ ] Final `pg_dump` taken and stored outside the repo
- [ ] Migration-history conversion executed against RDS **before** the service starts, replaying the
      Phase 2 transcript
- [ ] `_prisma_migrations` rows match the fork's `migrations/` directory exactly, verified by
      `SELECT`; `migrate status` clean with no "not in the local migrations directory" warnings
- [ ] Deploy logs show `migrate deploy` applying nothing and the server reaching listen — no crash-loop
- [ ] `GET /health` green through the AWS health check (App Runner or ALB target group)
- [ ] `GET /api/tenant` returns Dwimbs branding, `theme: "dynamichqi"`, and `requiresAccessApproval: true`
- [ ] Landing page renders `BRAND_NAME` as H1 with the navy/gold skin
- [ ] Magic-link login E2E to a real inbox: an **approved** member lands on `/courses`; a **new**
      signup lands on the awaiting-approval page. Dwimbs runs with approval on, so "lands on
      `/courses`" is not the correct expectation for a first-time user
- [ ] No redirect loop and no 404 at any hop of `/auth/verify` → `/` → gate
- [ ] All 7 modules / 12 lessons render; native markdown, the breakeven calculator, and the deck
      fallback all work
- [ ] An existing member's progress is intact; a knowledge check gives instant feedback; a module quiz
      grades under the 2-attempt / 70% rules
- [ ] Admin: users list loads, pending queue approves a real test signup, suspend/reinstate work
- [ ] No 404s or dead links to removed community routes anywhere in the shipped UI
- [ ] `APP_URL` updated and redeployed **before** the DNS change; a magic link issued after cutover
      contains the custom domain
- [ ] DNS moved; `https://course.dynamichqi.com/health` green on AWS with a valid certificate
- [ ] Railway still running and healthy as rollback, unchanged
- [ ] Soak period completed with no errors in logs

### Status: NOT STARTED

---

## PHASE 5 — Handover and Railway decommission

### Goal

Hand over the repo and the operational knowledge, then shut down the Railway deployment.

There is no infrastructure transfer in this phase — the AWS account was the client's from Phase 2
onward. That is the main simplification over the superseded Railway-transfer plan.

### Deliverables

- Push the fork to the DYNAMICHQI GitHub organization; grant their team admin.
- Hand over the ops runbook: Docker build (including the `VITE_*` build args), ECR push, App
  Runner/ECS deploy, RDS connection and backup policy, S3/CloudFront asset layout, the email API key,
  the admin bootstrap procedure, the `seed:course` content workflow, and how to add lesson content.
- Confirm every secret lives in the client's Secrets Manager and no operator-held credential is still
  in use by the running service.
- Remove or reassign your operator admin account per the agreement.
- Remove your IAM access to the client AWS account once they confirm they can deploy unaided.
- Hand the final `pg_dump` to the client as their own backup.
- **Decommission Railway last**: delete the `dwimbs-app` service and its Postgres, and remove the
  Dwimbs custom domain. Do this only after the soak period passes and the client has confirmed
  acceptance in writing — it is the point of no return for rollback.

### Exit Criteria

- [ ] Repo lives in the DYNAMICHQI org with their team as admins
- [ ] Runbook delivered and acknowledged
- [ ] Client engineer independently builds the image and deploys it end to end, unaided
- [ ] A client admin completes a magic-link login on `course.dynamichqi.com`
- [ ] No operator-held credential is referenced by the running service
- [ ] Operator admin account removed or explicitly retained by agreement
- [ ] Operator IAM access to the client AWS account removed
- [ ] Client acceptance in writing
- [ ] Railway `dwimbs-app` service and its Postgres deleted; final dump handed over first
- [ ] Client notified that the `SESSION_SECRET` change logged all members out at cutover

### Status: NOT STARTED

---

## PHASE 6 — Clean up this repo

### Goal

Remove what you no longer have a reason to hold, and make the registry truthful.

### Deliverables

- **Delete the S.I. Williams course content**: `server/prisma/courses/corporate-financial-education
  .json` and `server/prisma/courses/lessons/*.md`. This is the client's IP, `clients.md` already flags
  it as do-not-reuse, and after handover there is no reason to retain a copy.
- Delete the `dynamichqi` theme block from `web/src/styles/themes.css` if no other deployment uses it
  (Detroit is default, Yard Line is `yardline` — verify before removing).
- `clients.md`: change the Dwimbs row to handed-over with the date, note that it now runs on the
  client's AWS rather than your Railway, keep a short historical note, and strike Dwimbs from the
  "patch across deployments" checklist.
- `course-platform-template.md`: note that Dwimbs is no longer a deployment of this repo, so its
  references to Dwimbs as a live template instance stay accurate as history only.
- `aws-deployment-portability.md`: fold back what the fork actually proved — the working Dockerfile
  shape, the storage generalization, and any AWS gotchas found. It was a gap analysis; after this
  work it can be a record of a completed port, which is what makes the next AWS client cheap.
- Consider whether removing Dwimbs as a reference deployment changes the Yard Line plan's assumptions.
- Consider whether to port the storage generalization back into this repo. It is provider-neutral,
  low-risk, and the prerequisite for any future AWS client. **Do not port the Dockerfile** without
  its own rollout — Railway prefers it over nixpacks and it would change the Detroit and Yard Line
  builds.

### Exit Criteria

- [ ] `grep -ri "dwimbs\|s\.i\. williams\|corporate-financial-education" .` returns only historical
      references in `clients.md` and the plan docs
- [ ] `cd server && npm test` and `cd web && npm test` still green after content removal
- [ ] Detroit and Yard Line deployments verified unaffected (`/api/tenant` on each)
- [ ] `clients.md` accurately describes the two remaining deployments
- [ ] `aws-deployment-portability.md` updated with what the port actually required

### Status: NOT STARTED

---

## Risks

| Risk | Mitigation |
|---|---|
| Data loss migrating Railway → RDS | The live Railway DB is never modified; it is dumped, not moved. Full rehearsal in Phase 2 against a restored copy, restore procedure scripted and re-run twice, final dump taken at cutover, Railway kept live through the soak |
| Writes during the final sync are lost | Phase 4 step 1 declares an explicit write freeze with a recorded mechanism and duration, rather than assuming a quiet window |
| Approval flow gap strands new signups | Phase 1 builds user-level approve/reject with tests before anything deploys |
| Starting the service before converting the history crash-loops the task | Phase 4 fixes the order explicitly: restore, convert, verify rows by `SELECT` + clean `migrate status`, then deploy. The entrypoint migrates before the server starts, so there is no post-deploy recovery |
| Dockerfile diverges from the nixpacks build and breaks in a way only prod reveals | Phase 1 exit criteria verify the image locally against the SPA specifically, the branding build args, `HOST=0.0.0.0`, and openssl/Prisma — the four failure modes that a passing `docker build` does not catch |
| Adding a Dockerfile silently changes Detroit and Yard Line builds | The Dockerfile is written only in the fork, never upstream; Phase 6 explicitly declines to port it without its own rollout |
| `reject` with no enum value ships as a silent no-op or a crash | Settled-design gate blocks Phase 1 completion until route, UI wording, re-registration, and reinstate agree; `0_init` is resolved-not-run, so a new enum value needs a second real migration |
| History conversion leaves the DB and `migrations/` divergent | Phase 2 verifies row-for-row by `SELECT` and requires a warning-free `migrate status`; Option B is a documented fallback that needs no conversion at all |
| Migrations on every autoscaled task add latency or contend | Prisma's advisory lock serializes them; Phase 4 decides explicitly whether to split migration into a separate one-off task |
| Client org guardrails block the public asset bucket | Surfaced in Phase 0 before any provisioning, with CloudFront + origin access control as the documented alternative |
| Magic links issued with the wrong host at cutover | `APP_URL` is updated and redeployed before the DNS move, and a post-cutover link is inspected as an exit criterion |
| Pages-only deletion leaves dead community code shipping | Phase 1 exit greps cover `web/src`, plus `tsc --noEmit` and a bundle check |
| Undefined license lets the client resell your platform against Yard Line | Phase 0 blocks all client-facing work until terms are written |
| Another client's data leaks in the fork | Phase 1 exit criteria greps for it; `.claude/docs/` deleted wholesale |
| Clean break leaves them unpatched on a future auth bug | Acknowledged in writing in Phase 0; not a technical mitigation |
| Railway deleted too early, removing the rollback | Phase 5 gates decommissioning on a completed soak and written client acceptance |

---

## Out of Scope (explicitly deferred)

- Any shared/upstream relationship between the fork and this repo — the break is clean by decision.
- Multi-AZ, multi-region, or autoscaling design beyond the defaults of the chosen compute target.
  The current deployment serves a small cohort; sizing is the client's to grow.
- Infrastructure-as-code (Terraform/CDK) for the AWS resources. Phase 2 provisions them directly and
  documents them; converting to IaC is the client's work under the clean break.
- CI/CD for the fork. The runbook covers manual build-and-deploy; wiring GitHub Actions to ECR is
  theirs to add.
- Running Railway and AWS in parallel as a steady state. Railway exists only as rollback and is
  deleted in Phase 5.
- Dropping the orphan community tables from the migrated database — inert, and destructive to remove.
- Extracting a reusable course-platform product for your own use. Yard Line continues on this repo.
- Any change to the Detroit or Yard Line deployments before Phase 6.

---

## End State

1. DYNAMICHQI owns a standalone, containerized course-platform repo — no community code, no other
   client's material, licensed on agreed terms — running in their own AWS account.
2. `course.dynamichqi.com` serves the same course experience on the client's own App Runner/ECS, RDS,
   S3, and sending domain, with all member accounts and lesson progress preserved.
3. Access approval works without `Profile`, via a user-level admin queue.
4. The Railway `dwimbs-app` service is deleted; no operator-owned account serves any part of the
   client's product.
5. This repo keeps Detroit and Yard Line running unchanged, no longer holds the client's course
   content, and `clients.md` truthfully describes two deployments instead of three.
