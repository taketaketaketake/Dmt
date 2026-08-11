# Implementation Plan: DynamicHQI Founders Education (standalone site on AWS)

> Extract a course + member-directory snapshot of this platform into a standalone repo,
> containerize it, stand it up in DYNAMICHQI's own AWS account on a fresh database, and
> decommission the Railway deployment as a clean break.

---

## Status

**Current Phase:** Phase 0 preconditions and the final AWS-backed Phase 1 validation gates are
blocked on commercial terms and client AWS/service accounts.

The standalone Phase 1 repository has been extracted and locally validated at
`/Users/Zach/Github_Projects/dynamichqi-course` (single root commit `8c9d837`, "Extract DynamicHQI
founders education app"). It is **local only — no git remote is configured yet**; pushing it to the
DYNAMICHQI org is a Phase 5 deliverable and must not happen before the Phase 0 license terms are
settled.

Nothing has been deployed into the client's AWS account because the license terms and working IAM
access are not yet settled. The configured `default` AWS profile currently fails
`sts:GetCallerIdentity` with `InvalidClientTokenId` — which is exactly the failure Phase 0's
credential check exists to surface, and it blocks Phase 2 entirely.

---

## Phase Completion Rules

A phase may be marked COMPLETE only when:
1. All exit criteria are satisfied
2. All required validation commands have been executed successfully
3. A phase audit has passed (review the diff against the phase's deliverables; no stray scope)

**Validation is mandatory for phase completion.**

External dependencies do not count as completed work. A phase waiting on the client, a DNS owner, or
an AWS provisioning step stays IN PROGRESS/BLOCKED with the exact handoff recorded.

---

## Context

### There is no "Dwimbs code" in this repo

`grep -ri dwimbs` across all source returns zero hits — only `.claude/docs/clients.md` and
`.claude/docs/plans/course-platform-template.md`. Dwimbs is *this repo*, deployed to a second
Railway service with different env vars, a `dynamichqi` theme skin, and its own course manifest.
Yard Line runs the identical template.

So "extract Dwimbs" means **extract a course + directory subset of this platform**, then deploy the
result as a standalone site for one client. Yard Line and Detroit stay on this repo, unchanged.

### Decisions taken

| Decision | Choice | Consequence |
|---|---|---|
| Nature of the split | Client fork, not a product line | Yard Line stays here; the extracted repo is a one-off snapshot, not a maintained upstream |
| Ongoing support | **Clean break** — point-in-time snapshot | No upstream link. Security fixes made here never reach them. Must be stated in the contract |
| Hosting | **DYNAMICHQI's own AWS account** | You build and deploy directly into their account. There is no infrastructure transfer at the end — it was never yours |
| Packaging | **Dockerfile** (replaces nixpacks) | Portable build artifact; required by the client's AWS standards. Written in the fork only — see "Why the Dockerfile lives in the fork" |
| **Profiles** | **Kept in full** — profiles, skills, categories, favorites, member directory | The approval flow, the post-login redirect chain, and the admin review queue all survive intact. This is the single largest simplification in the plan — see below |
| **Live data** | **None to preserve** — the Railway database is entirely test users and test data | Fresh RDS, `0_init` runs clean, seed the course. No dump, no restore, no migration-history conversion, no maintenance window |
| Removed surface | Projects, jobs, project-follows, Stripe billing | The only deletions. Everything else is repackaging |
| Railway | **Decommissioned** after cutover | Kept running until AWS is verified; it is the rollback |

### Two decisions that removed most of this plan's risk

**Keeping profiles deletes all the net-new code.** An earlier version of this plan dropped `Profile`,
which broke member approval — the only transition to `approved` is `POST /admin/profiles/:id/approve`
(`server/src/routes/admin.ts:111`), and it updates profile and user in one transaction. Removing it
would have stranded every new signup, forcing a net-new user-level approval queue, a net-new admin
page, and an unresolved rejection-semantics problem (`UserStatus` has no `rejected` value; only
`ProfileApprovalStatus` does). All of that is now moot. The approval flow ships as-is.

It also saves the post-login redirect chain. That chain has three hops —
`server/src/routes/auth.ts:105` → `web/src/App.tsx:153` → `components/layout/RequireApproved.tsx:18`
— and every destination (`/`, `/people`, `/account`) survives this extraction. Nothing to redefine.

**The database is test data only, so there is nothing to migrate.** The previous plan's largest
section was a rehearsed `pg_dump` → restore → `_prisma_migrations` conversion, carrying a write
freeze, a documented irreversible operation, and a soak period gated on data integrity. With no real
members and no real progress to preserve, the fork simply runs its squashed `0_init` against an empty
RDS instance and seeds. **`0_init` genuinely executes rather than being resolved-as-applied**, which
also means a future migration that adds an enum value has no special constraint.

Sequencing principle:

**Build the new thing beside the old one, verify it fully, cut over by DNS, decommission last.**

### Persistent storage strategy (AWS)

Two stateful things. Neither may live on the container filesystem — the app already refuses to boot
in production without object storage configured (`server/src/lib/env.ts:101`), precisely so uploads
don't land on ephemeral disk.

| State | AWS service | Notes |
|---|---|---|
| Application database — users, profiles, sessions, taxonomy, course content, lesson progress, quiz attempts | **RDS PostgreSQL 16** | `DATABASE_URL` only. RDS enforces TLS: append `?sslmode=require`. Automated backups + PITR enabled; retention agreed in Phase 0. Starts empty |
| Uploads — member portraits, course slides, lesson audio, branding images | **Private S3 bucket behind CloudFront** | `lib/storage.ts` already speaks the S3 API via `@aws-sdk/client-s3`; see the generalization in Phase 1. `R2_PUBLIC_URL` becomes the CloudFront domain. **Not a public bucket** — see below |
| Everything else | — | Stateless. Containers are disposable; the local-disk upload fallback (`routes/uploads.ts:68`) is dev-only and unreachable in production |

Migrations run at container start, so the task needs RDS reachability before its health check can
pass — see the App Runner caveat in Phase 1.

**Object storage is private-behind-CloudFront by default, not public-bucket.** The bucket blocks all
public access and CloudFront reaches it through origin access control. This is the standard AWS
architecture and it is the default here regardless of what the client's org guardrails permit:

- It gives a custom domain and caching, which a raw bucket URL does not.
- It removes the misconfigured-public-bucket failure mode entirely.
- It sidesteps the **S3 static website endpoint, which is HTTP-only** and would produce
  mixed-content failures on an HTTPS site. (The REST endpoint,
  `bucket.s3.<region>.amazonaws.com`, does serve HTTPS — so a public bucket is not automatically a
  mixed-content problem — but the website endpoint is a trap worth naming, and CloudFront avoids the
  question.)

A public bucket is acceptable only as a deliberate, recorded exception. Assume CloudFront.

### What the fork keeps

**Course platform.** `routes/courses.ts` (606 LOC), `prisma/seed-course.ts`, models `Course` /
`CourseModule` / `Lesson` / `LessonProgress` / `KnowledgeCheck` / `QuizQuestion` / `QuizAttempt`, web
`CourseLanding` / `Courses` / `CourseDetail` / `Lesson` / `ModuleQuiz` + `components/course/*`.

**Profiles and member directory.** `routes/profiles.ts` (all nine endpoints, including the list and
detail views), `routes/favorites.ts`, `routes/categories.ts`, `routes/needs.ts`, models `Profile` /
`ProfileCategory` / `Category` / `ProfileSkill` / `NeedCategory` / `NeedOption` / `UserFavorite`, web
`People` / `PersonDetail` / `account/Profile` / `account/Favorites`, admin `ApprovalQueue` /
`ProfileReview` / `Users` / `UserDetail`, and `components/{FilterSelect,SkillsEditor}`.

**Shared core.** Magic-link auth, sessions, `middleware/auth.ts`, `lib/email.ts`, `lib/storage.ts`,
`routes/tenant.ts` + branding + `themes.css`, `routes/uploads.ts`, admin user management,
`lib/env.ts`, the Vitest harness.

**Seeds.** `bootstrap-admin.ts`, `seed-course.ts`, and — because the taxonomy is retained —
`seed-needs.ts` and `seed-categories.ts`. Both stay in the container start command.

### What the fork removes

`routes/{projects,jobs,follows,billing,webhooks}.ts`, `lib/stripe.ts`, models `Project` /
`ProjectCategory` / `ProjectCollaborator` / `ProjectFollow` / `ProjectNeed` / `ProjectNeedOption` /
`Job`, web `Projects` / `ProjectDetail` / `Jobs` / `JobDetail` / `account/{MyProjects,MyJobs,Billing,
Following}`, admin `JobQueue`, and `components/{NeedsDisplay,NeedsEditor,ProjectMatches}`. Seeds
`seed-demo.ts`, `seed-jobs.ts`, `seed.ts`.

### Findings that shape the work

- **Skills drag in the needs taxonomy.** `ProfileSkill.optionId` → `NeedOption`
  (`schema.prisma:343-354`), so keeping profile skills keeps `NeedCategory` + `NeedOption` and
  `seed-needs.ts`. Likewise `ProfileCategory` → `Category` keeps `seed-categories.ts`. This is the
  opposite of the previous plan, which deleted both seeds and therefore had to rewrite the start
  command; here `nixpacks.toml:34`'s seed sequence carries over into the Docker entrypoint unchanged.
- **`NeedOption.offerable` is what makes the taxonomy dual-purpose.** It marks which options a person
  can offer as a skill versus which are demand-only for projects. With projects gone, the demand side
  has no consumer — the flag stays (it drives the skills picker) but the supply↔demand matching in
  `ProjectMatches` goes with projects.
- **`NeedOption` deletion is `onDelete: Restrict` from `ProfileSkill`.** Re-seeding the taxonomy must
  stay upsert-based, as it already is, or a reseed against populated profiles will error.
- **Favorites are profile-only.** `UserFavorite` references `User` and `Profile`, never `Project`
  (`schema.prisma:269-281`), so it comes across with no project dependency. `ProjectFollow` is the
  one that goes.
- **Dropping `Project` and `Job` prunes three `Profile` relation fields** — `projectsCreated`,
  `projectCollaborations`, `jobsPosted` — plus `favoritedBy` stays. Because the database starts
  empty, these are clean schema deletions with no orphan-column consideration at all.
- **`stripeCustomerId` and `isEmployer` come off `User` entirely.** The previous plan left them as
  inert orphan columns because the live database was being adopted; on a fresh database they simply
  never exist.
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
- **The shared web layer is where dead code hides.** `web/src/lib/api.ts` (654 LOC) and
  `web/src/hooks/queries.ts` (479 LOC) carry the request functions, query keys, hooks, and response
  types for every feature. Deleting only the project and job *pages* leaves their API layer compiling
  and shipping.
- **`.claude/docs/clients.md` must not ship.** It contains Yard Line's domain, Railway project names,
  R2 prefixes, and every launch shortcut across all three deployments.
- **No `LICENSE` file exists in this repo.** The code grant is currently undefined.

### Why the Dockerfile lives in the fork, not here

Railway **prefers a Dockerfile over nixpacks whenever one exists in the repo**. Adding one to this
repo would silently change the build for Detroit and Yard Line, both of which are live and neither of
which asked for it. The fork has no such constraint — it deletes `nixpacks.toml` and `railway.json`
outright. Do not "prepare" the Dockerfile upstream first.

---

## Stack (the fork, on AWS)

| Component | Purpose |
|-----------|---------|
| React + Vite (`web/`) | SPA; landing page, member directory, profiles, course player, `dynamichqi` theme skin. Built into the image, served by the API process |
| Fastify + Prisma (`server/`) | API, magic-link auth, profiles + approval, course delivery, quiz grading, static SPA serving |
| **Docker** | Multi-stage build replacing nixpacks. The only build artifact |
| **AWS App Runner** (recommended) or **ECS Fargate + ALB** | Compute. App Runner is closest to the Railway experience; ECS if the client mandates VPC placement. Decided in Phase 0 |
| **Amazon RDS PostgreSQL 16** | Database, starting empty. `DATABASE_URL` with `?sslmode=require` |
| **Private S3 + CloudFront** | Member portraits, slide images, lesson audio, branding assets. Origin access control; no public bucket |
| **Amazon ECR** | Image registry |
| **AWS Secrets Manager** (or App Runner/ECS secret refs) | `SESSION_SECRET`, `DATABASE_URL`, API keys |
| Resend, or **Amazon SES** if the client mandates AWS-native | Transactional email. Decided in Phase 0 |

---

## PHASE 0 — Preconditions (commercial + client AWS accounts)

### Goal

Settle the terms of the code grant, choose the AWS shape, and obtain the client-account access that
Phases 2–4 write to. Nothing here is code, and no deployment can start without it.

### Deliverables

- **License terms for the code grant, agreed in writing.** DYNAMICHQI receives a working platform
  functionally close to what Yard Line pays for — and with profiles retained, closer than the
  course-only fork would have been. What they may do with it — use, modify, resell, sublicense —
  must be explicit.
- **Written acknowledgement of the clean break**: the snapshot is unsupported, and fixes made in this
  repo (e.g. `be4bbf4` scanner-safe magic links) will not reach them.
- **Written confirmation that the Railway database holds no data worth keeping.** The entire
  simplification of Phases 2 and 4 rests on this. Get it from the client in writing rather than
  inferring it, and spot-check the production database's `User`, `Profile`, and `LessonProgress` row
  counts to corroborate. If real accounts turn up, the dump/restore/history-conversion work returns
  and this plan needs rewriting before Phase 4.
- **Compute target chosen and recorded here: App Runner or ECS Fargate.** Recommend App Runner unless
  the client has existing ECS/VPC standards. This decides the Phase 4 deploy mechanics and whether an
  ALB, VPC connector, and target groups are in scope.
- **AWS access into DYNAMICHQI's account**: an IAM role or user scoped to ECR push, App Runner/ECS,
  RDS, S3, CloudFront, and Secrets Manager. Confirm the region, the account ID, and any SCP/guardrail
  constraints — in particular whether CloudFront distributions, origin access control, and RDS
  instance classes are permitted, and whether a VPC and subnets already exist that the compute target
  must be placed in.

  **Verify the credentials work, without provisioning the real infrastructure.** Phase 2 owns
  provisioning; Phase 0 owns proving you can. Confirm the caller identity, then create and immediately
  delete a scratch ECR repository. That is a genuine push-path permission test — an IAM policy that
  reads correctly and an API call that actually succeeds are different things, and the difference is
  what Phase 0 exists to surface. Do not defer this to a policy review on paper.
- **Email decision**: Resend (works fine from AWS, keeps `lib/email.ts` unchanged) or SES (needs a
  small provider adapter — treat as added Phase 1 scope if chosen). If Resend, the client's sending
  domain must be verified; DNS records go in the Squarespace zone, which is authoritative per
  `clients.md`.
- **Backup policy agreed**: RDS automated backup retention and whether PITR is required. This matters
  more than it did when a dump existed — after launch, RDS backups are the only copy of real data.
- **Directory launch state decided**: the member directory ships with whatever profiles exist, which
  on day one is none. Confirm whether the client wants seeded placeholder profiles, an empty-state
  design, or the directory hidden until a threshold of members join.
- **DNS cutover mechanics for `course.dynamichqi.com` confirmed**: it currently points at Railway in
  the client's Squarespace zone. Record who can change it, and the TTL — lower it at least one TTL
  period before Phase 4 so cutover and rollback are both fast.

### Exit Criteria

- [ ] Signed/written license terms on file, and the `LICENSE` text chosen
- [ ] Clean-break/no-support term acknowledged in writing
- [ ] **Written confirmation that no production data needs preserving**, corroborated by row counts
- [ ] Compute target (App Runner vs ECS Fargate) chosen and recorded above with reasoning
- [ ] Caller identity confirmed in the client account, and a scratch ECR repository created and
      deleted successfully — real API calls, not a policy review. **No production infrastructure is
      provisioned in this phase**; the real ECR push and RDS connection are Phase 2 exit criteria
- [ ] Region, account ID, VPC/subnet constraints, and any org guardrails affecting CloudFront, RDS
      instance classes, or networking recorded
- [ ] Email provider decided; if Resend, client domain verified and a test send succeeds
- [ ] RDS backup retention / PITR policy agreed
- [ ] Empty-directory launch behavior decided
- [ ] DNS ownership confirmed and TTL for `course.dynamichqi.com` lowered

### Status: NOT STARTED (BLOCKED — commercial terms)

---

## PHASE 1 — Build the extracted repo

### Goal

Produce a standalone, containerized repo that builds and tests green, containing no project/job/
billing code and no other client's material.

### Deliverables

**Extraction**

- **New repo, single initial commit, no imported history.** A clean break must not carry this repo's
  commit log — it contains Yard Line's provisioning details and anything that ever passed through a
  commit. Do not use `git filter-repo`.
- Delete the removed server surface: `routes/{projects,jobs,follows,billing,webhooks}.ts`,
  `lib/stripe.ts`, their tests, and their registrations in `server/src/app.ts`.
- Delete the removed web surface: `pages/{Projects,ProjectDetail,Jobs,JobDetail}`,
  `pages/account/{MyProjects,MyJobs,Billing,Following}`, `components/{NeedsDisplay,NeedsEditor,
  ProjectMatches}`, admin `JobQueue`, their tests, and their routes + lazy imports in
  `web/src/App.tsx`. `/account` keeps `Profile` and `Favorites`, so the shell survives — verify its
  nav renders correctly with two children instead of six.
- **Prune the shared web layer**, not just pages: remove project/job/billing/follow request functions,
  query keys, hooks, and response types from `web/src/lib/api.ts` and `web/src/hooks/queries.ts`, and
  the corresponding nav links in `components/layout/Header.tsx`. Profile, skills, category, favorite,
  and course code all stays.
- Prune `schema.prisma`: drop `Project`, `ProjectCategory`, `ProjectCollaborator`, `ProjectFollow`,
  `ProjectNeed`, `ProjectNeedOption`, `Job`, their enums, the `projectsCreated` /
  `projectCollaborations` / `jobsPosted` relation fields on `Profile`, the `projectFollows` field on
  `User`, and `stripeCustomerId` + `isEmployer` on `User`. Keep `Profile`, `ProfileCategory`,
  `Category`, `ProfileSkill`, `NeedCategory`, `NeedOption`, `UserFavorite`, and all seven course
  models. Keep `NeedOption.offerable` — it drives the skills picker.
- Squash `server/prisma/migrations/` (7 migrations) into a single `0_init` generated from the pruned
  schema. **On a fresh database this actually runs**, unlike the resolve-as-applied approach the
  previous plan needed, so no special constraints apply to future migrations.
- Delete seeds `seed-demo.ts`, `seed-jobs.ts`, `seed.ts` and their `package.json` scripts. **Keep
  `seed-needs.ts` and `seed-categories.ts`** — the taxonomy they populate is still in use — along with
  `bootstrap-admin.ts` and `seed-course.ts`. Audit `seed-needs.ts` and `seed-categories.ts` for
  Detroit-specific vocabulary and adjust for the client's audience.
- Strip Stripe env from `lib/env.ts` and `.env.example`.
- **Strip other clients' material**: delete `prisma/courses/yard-line/`, the `:root[data-theme=
  "yardline"]` blocks from `web/src/styles/themes.css` (lines 70–121), and `.claude/docs/` in its
  entirety. Keep only the `dynamichqi` theme.
- Add the agreed `LICENSE` and a `README.md` written for DYNAMICHQI's engineers: local setup, env var
  reference, the seed workflow, Docker build/run, AWS deploy, and how to add lesson content.

**What explicitly does NOT change**

Called out because an earlier version of this plan changed all of it, and the diff should show no
churn here:

- The approval flow. `POST /admin/profiles/:id/approve` and `/reject` stay as they are, along with
  `ApprovalQueue` and `ProfileReview`. No user-level approval queue is built.
- The post-login redirect chain. `auth.ts:105` → `/`, `App.tsx:153` → `/people`,
  `RequireApproved.tsx:18` → `/account` all still resolve. No "awaiting approval" page is needed.
- `UserStatus`. Rejection already works through `ProfileApprovalStatus`, which has a real `rejected`
  value, so there is no rejection-semantics question to settle.

**Net-new: containerize (replaces nixpacks)**

- **Delete `nixpacks.toml` and `railway.json`.** They describe a platform the fork does not use.
- Keep `docker-compose.yml` for local Postgres, updated to a client-appropriate database name.
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
    client, `prisma/` (migrations + retained seeds), and `tsx`, which the entrypoint needs to run them.
  - Run as a non-root user. `EXPOSE` the port. **`HOST` must be `0.0.0.0`** — the default is
    `localhost`, which makes the container unreachable and the health check fail.
  - `HEALTHCHECK` against `/health`.
- Add a `.dockerignore` (`node_modules`, `dist`, `dist-ssr`, `.env`, `.git`, `uploads`).
- **Entrypoint mirrors the current start command**: `prisma migrate deploy`, then `seed-needs.ts`,
  then `seed-categories.ts`, then `node dist/index.js`. Both seeds are idempotent upserts, which is
  what makes running them on every boot safe. Record the autoscaling caveat: every task runs migrate
  and both seeds on start. Prisma takes a Postgres advisory lock so concurrent migrations serialize,
  but this adds startup latency. If the client objects, the alternative is a separate one-off task run
  before the service deploy — decide in Phase 4, not here.
- Verify locally: `docker build` succeeds and the container serves the SPA, `/health`, `/api/tenant`,
  and the directory against the compose Postgres.

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

- The existing profile, approval, skills, category, favorite, and course suites must stay green —
  they are the regression surface for "we didn't break what we kept."
- Covering the storage client construction: endpoint-set and endpoint-unset both produce a usable
  client and the expected public URL.

### Exit Criteria

- [x] `grep -ri "yard\s*line\|yardline\|detroit\|takedetroit\|dmtisreal" .` returns no hits in the fork
- [x] `grep -rn "project\|job\|stripe\|billing\|follow" server/src web/src -i` returns no references
      to the removed features (the word "project" in course prose excepted). **Must cover `web/src`,
      not just `server/src`** — `lib/api.ts`, `hooks/queries.ts`, and `components/layout` are where
      dead code survives a pages-only deletion
- [x] `grep -rn "/projects\|/jobs\|/account/billing\|/account/following" web/src` returns nothing
- [x] `grep -rn "nixpacks\|railway" .` returns nothing
- [x] `cd server && npm test` green
- [x] `cd web && npm test` green and `npm run build` succeeds
- [x] `cd web && npx tsc --noEmit` clean, and the built bundle contains no project/job route chunks
- [x] `npx prisma validate` passes and `0_init` **applies** cleanly to an empty database (it runs, not
      resolves)
- [x] `docker build` succeeds; the image runs against the compose Postgres and serves `/health`,
      `/api/tenant` (correct branding + `theme: "dynamichqi"`), the SPA at `/`, and `/people` — **the
      SPA specifically, since a wrong image layout yields a working API with no UI**
- [x] Entrypoint verified end to end on an empty database: migrate → seed-needs → seed-categories →
      listen, with no errors, and a second container start is a clean no-op (idempotency proven, not
      assumed)
- [x] Branding build args verified: the rendered H1 changes when `VITE_BRAND_NAME` changes at build
      time, and does **not** change when set only at runtime
- [x] Container reachable from outside itself (`HOST=0.0.0.0` proven, not assumed)
- [ ] Storage generalization verified against a real S3 bucket: upload succeeds and the returned
      public URL resolves
- [ ] Full local smoke on a fresh DB: bootstrap an admin, seed the course, request a magic link,
      follow it, create a profile with skills and categories, see it queued for review, approve it in
      `ApprovalQueue`/`ProfileReview`, then browse `/people`, filter by skill, favorite a profile, and
      complete a lesson and a module quiz — with `REQUIRE_ACCESS_APPROVAL` both unset and `false`
- [x] Reject path smoke: a rejected profile's owner sees the rejection note and cannot reach gated
      routes
- [ ] Portrait upload writes to S3 and renders on the profile and in the directory

### Status: IN PROGRESS

Implementation and local validation are complete; the real-S3 upload/portrait gates and Phase 0
client access remain blocked.

Local evidence is recorded in the fork at `docs/phase-1-validation.md`. Server tests (138), web tests
(42), TypeScript/build checks, a fresh `0_init` migration, two idempotent container starts, branding
build-argument behavior, both access-approval modes, approval/rejection workflows, directory skills,
favorites, lesson progress, and a passing module quiz have been exercised. A real client-account S3
upload, CloudFront URL resolution, and portrait rendering remain untestable until Phase 0 supplies
working AWS access. The agreed `LICENSE` also remains intentionally absent until the commercial terms
are provided.

---

## PHASE 2 — Provision AWS and deploy to a temporary hostname

### Goal

Stand up the client's AWS infrastructure and get the image running on it, reachable at a temporary
hostname, with the course seeded — so that Phase 3 has a real deployment to configure and test.

The deployment is created **here**, not at cutover. Phase 3 verifies assets and email against a
running service; Phase 4 does the final verification pass and moves DNS. Nothing in Phases 2–4 touches
Railway, which keeps serving `course.dynamichqi.com` throughout.

### Deliverables

**Infrastructure**

- ECR repository; push the Phase 1 image. This is the first real push — Phase 0 only proved the
  credentials on a scratch repo.
- RDS PostgreSQL 16 instance with the agreed backup retention/PITR, TLS enforced, reachable from the
  compute target. It starts empty.
- **Private S3 bucket with all public access blocked, behind a CloudFront distribution using origin
  access control.** A public bucket is an exception requiring a recorded reason, not the default.
- Secrets Manager entries for `DATABASE_URL`, `SESSION_SECRET`, storage credentials, and the email
  API key. **Generate a new `SESSION_SECRET`** — do not carry the Railway one across; it has been held
  by the operator, and there is no reason to inherit it when there are no sessions to preserve.

**Deployment**

- Confirm `0_init` applies to the real RDS instance over TLS and both taxonomy seeds run, before the
  service is wired up. Doing this first means a failure here is a database problem, not a
  service-configuration problem.
- Create the App Runner service (or ECS service + ALB) from the ECR image, with the Phase 0 compute
  target's configuration and secrets wired in. It comes up on a temporary AWS-provided hostname.
- `APP_URL` points at that temporary hostname for now. **Do not set it to
  `course.dynamichqi.com`** — per the standing ordering rule in `clients.md`, never point `APP_URL`
  at a domain before it resolves to that deployment. Magic links are built from `APP_URL`, so a
  premature value sends testers to Railway.
- `npm run bootstrap:admin` for the client's first admin account, and `npm run seed:course` to load
  the founders education content. Phase 3 verifies slides against seeded lessons, so the content must
  exist before it.

### Exit Criteria

- [ ] ECR, RDS, private S3 + CloudFront, and Secrets Manager provisioned in the client account
- [ ] Bucket has public access fully blocked; CloudFront serves it via origin access control over
      HTTPS. Any deviation recorded here with its reason
- [ ] New `SESSION_SECRET` generated and stored in Secrets Manager; never the Railway value
- [ ] `0_init` applies to RDS over TLS (`?sslmode=require` confirmed working, not assumed) and
      `prisma migrate status` is clean
- [ ] `seed-needs` and `seed-categories` complete against RDS; taxonomy row counts match the local run
- [ ] Service running on the temporary hostname: `GET /health` green through the AWS health check,
      `GET /api/tenant` returns the client's branding and `theme: "dynamichqi"`, and the SPA loads
- [ ] Deploy logs show migrate applying nothing on restart and both seeds completing idempotently —
      no crash-loop
- [ ] Admin bootstrapped and able to sign in; course seeded and all 7 modules / 12 lessons present
- [ ] `APP_URL` is the temporary hostname, not the custom domain
- [ ] **The live Railway deployment was not touched** — its env vars and deployment history are
      unchanged since the phase began

### Status: NOT STARTED (BLOCKED — Phase 0 AWS access)

---

## PHASE 3 — Point the AWS deployment at client-owned services

### Goal

Ensure the new deployment — running since Phase 2 on its temporary hostname — depends on no
operator-owned account. **The live Railway deployment keeps using the shared accounts until it is
decommissioned** — it is the rollback and must stay working.

### Deliverables

- Copy `courses/corporate-financial-education/**` (118 slides at 1600px, plus audio if the client
  recordings have landed) from `dmt-uploads` (R2) to the client's S3 bucket, preserving the key layout.
  Member portraits are not copied — there are none worth keeping, and new uploads land in S3 natively.
- Point the AWS deployment's storage env at the client bucket (+ CloudFront public URL).
- Configure email on the AWS deployment: the client's verified Resend domain, or SES per the Phase 0
  decision.
- Do **not** change the Railway service's env vars. `APP_URL` stays on the temporary hostname set in
  Phase 2 until Phase 4's cutover.

### Exit Criteria

- [ ] Every slide in every lesson loads on the AWS deployment from the client bucket (spot-check
      first, middle, last lesson) with no mixed-content or 403 errors
- [ ] A test portrait upload writes to the client bucket and renders
- [ ] Magic-link email from the AWS deployment arrives from the client's domain and completes a login
      against the temporary hostname
- [ ] No AWS env var references `dmt-uploads` or the shared Resend sender
- [ ] Railway env vars verified unchanged and the Railway deployment still healthy

### Status: NOT STARTED (BLOCKED — Phase 0 client accounts, Phase 2 deployment)

---

## PHASE 4 — Verify and cut over DNS

### Goal

Verify the running AWS deployment end to end on its temporary hostname, then move
`course.dynamichqi.com` to it — with Railway still live behind you.

The service has been running since Phase 2 and pointing at client-owned storage and email since
Phase 3. This phase adds no infrastructure; it decides whether what exists is good enough to receive
the domain.

### Deliverables

Steps, in order:

1. **Re-confirm the "no real data" premise, immediately before cutover.** Phase 0 established it,
   possibly weeks earlier. Re-run the `User`, `Profile`, and `LessonProgress` row counts against the
   Railway production database now. Cutover discards whatever is in there — if the client has started
   using the site in the interim, real accounts exist and this plan's central assumption has expired.
   Stop and re-plan the data migration rather than proceeding.
2. Full verification pass on the temporary hostname (below).
3. Set `APP_URL` to `https://course.dynamichqi.com`, redeploy, and **then** move DNS. Magic links are
   built from `APP_URL`, so a link issued before this step points at the old host.
4. Watch logs and health for the agreed soak period before Phase 5.

Also decide here, per the Phase 1 caveat: keep migrate + seeds in the entrypoint, or split them into a
separate one-off task run before the service deploy. Record the decision.

### Rollback: clean only until the first real signup

DNS rollback is not free, and an earlier draft of this plan wrongly said it was. That was true at the
instant of cutover and false shortly after: once the domain points at AWS, real members sign up, get
approved, and start lessons **in RDS**. Pointing DNS back at Railway would leave that data behind on a
database nobody is serving, and Railway would greet those members as strangers.

So the rollback policy is time-boxed, not open-ended:

- **Before the first real signup on AWS** — rollback is a DNS change and costs nothing. Confirm by
  querying RDS for users created after cutover.
- **After the first real signup** — rollback means data loss, so the default becomes **roll forward**:
  fix on AWS rather than retreat to Railway. An RDS snapshot, not Railway, is the recovery artifact
  from this point on.
- Agree an explicit **rollback window** with the client before cutover — a stated number of hours
  during which retreating to Railway is still on the table — and decide what happens to signups made
  inside it. The two honest options are to accept losing them (viable only if the window is short and
  announced) or to pause signups for its duration.
- Take an **RDS snapshot immediately before the DNS move**, so there is a clean pre-launch restore
  point for the roll-forward path.

The soak period exists to catch failures inside the window, not to accumulate data that makes the
window meaningless. Keep it short enough that the two remain compatible.

### Exit Criteria

- [ ] **Railway row counts re-checked immediately before cutover and still zero real accounts** — the
      Phase 0 confirmation re-verified, not assumed to have held
- [ ] Rollback window agreed with the client, in hours, with signup handling inside it decided
- [ ] RDS snapshot taken immediately before the DNS move
- [ ] `GET /health` green through the AWS health check (App Runner or ALB target group)
- [ ] `GET /api/tenant` returns the client's branding, `theme: "dynamichqi"`, and
      `requiresAccessApproval: true`
- [ ] Landing page renders `BRAND_NAME` as H1 with the navy/gold skin
- [ ] Magic-link login E2E to a real inbox: a **new** signup is created pending, builds a profile, and
      is held at the approval gate; an **approved** member reaches `/people` and `/courses`. The
      deployment runs with approval on, so immediate access is not the correct expectation for a
      first-time user
- [ ] No redirect loop and no 404 at any hop of `/auth/verify` → `/` → gate → `/people`
- [ ] Member directory works end to end: profile creation with skills and categories, admin approval,
      appearance in `/people`, skill and category filtering, profile detail, favoriting
- [ ] Portrait upload writes to S3 and renders in both the directory and the profile
- [ ] All 7 modules / 12 lessons render; native markdown, the breakeven calculator, and the deck
      fallback all work
- [ ] A knowledge check gives instant feedback; a module quiz grades under the 2-attempt / 70% rules
- [ ] Admin: users list, user detail, suspend/reinstate, approval queue, and profile review all work
- [ ] No 404s or dead links to removed project/job/billing routes anywhere in the shipped UI
- [ ] `APP_URL` updated and redeployed **before** the DNS change; a magic link issued after cutover
      contains the custom domain
- [ ] DNS moved; `https://course.dynamichqi.com/health` green on AWS with a valid certificate
- [ ] Railway still running and healthy as rollback, unchanged
- [ ] Soak period completed with no errors in logs
- [ ] Rollback window closed, and the point at which retreat stopped being viable — the first real
      signup on AWS — recorded here with its timestamp

### Status: NOT STARTED

---

## PHASE 5 — Handover and Railway decommission

### Goal

Hand over the repo and the operational knowledge, then shut down the Railway deployment.

There is no infrastructure transfer in this phase — the AWS account was the client's from Phase 2
onward.

### Deliverables

- Push the fork to the DYNAMICHQI GitHub organization; grant their team admin.
- Hand over the ops runbook: Docker build (including the `VITE_*` build args), ECR push, App
  Runner/ECS deploy, RDS connection and backup policy, S3/CloudFront asset layout, the email API key,
  the admin bootstrap procedure, the `seed:course` content workflow, how the taxonomy seeds work and
  when to re-run them, and how to add lesson content.
- Confirm every secret lives in the client's Secrets Manager and no operator-held credential is still
  in use by the running service.
- Remove or reassign your operator admin account per the agreement.
- Remove your IAM access to the client AWS account once they confirm they can deploy unaided.
- **Decommission Railway last**: delete the `dwimbs-app` service and its Postgres, and remove the
  Dwimbs custom domain. Do this only after the soak period passes and the client has confirmed
  acceptance in writing.

### Exit Criteria

- [ ] Repo lives in the DYNAMICHQI org with their team as admins
- [ ] Runbook delivered and acknowledged
- [ ] Client engineer independently builds the image and deploys it end to end, unaided
- [ ] A client admin completes a magic-link login on `course.dynamichqi.com` and approves a real signup
- [ ] No operator-held credential is referenced by the running service
- [ ] Operator admin account removed or explicitly retained by agreement
- [ ] Operator IAM access to the client AWS account removed
- [ ] Client acceptance in writing
- [ ] Railway `dwimbs-app` service and its Postgres deleted

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
  low-risk, and the prerequisite for any future AWS client. **Do not port the Dockerfile** without its
  own rollout — Railway prefers it over nixpacks and it would change the Detroit and Yard Line builds.

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
| **The "no real data" premise turns out to be wrong** | This is now the plan's central assumption and its biggest single risk — every simplification in Phases 2 and 4 depends on it. Phase 0 requires written client confirmation plus corroborating row counts. If real accounts exist, the dump → restore → `_prisma_migrations` conversion work returns and this plan must be rewritten before Phase 4 |
| **The premise holds in Phase 0 but expires before Phase 4** | The client may start using the Railway site during the weeks between confirmation and cutover, and cutover discards whatever is there. Phase 4 step 1 re-runs the row counts immediately before the DNS move and stops if they are non-zero — a one-off Phase 0 check is not sufficient |
| Rolling back after cutover loses members created on AWS | Phase 4 replaces "rollback is free" with a time-boxed policy: DNS retreat only until the first real signup, roll-forward after, an agreed rollback window with signup handling decided, and an RDS snapshot taken before the DNS move as the recovery artifact |
| Public bucket misconfigured, or served over an HTTP-only S3 website endpoint | Private bucket with public access blocked, behind CloudFront with origin access control, is the default rather than the fallback; a public bucket requires a recorded exception |
| Phase 0 blocked on infrastructure it cannot yet reach | Phase 0 verifies credentials with a scratch ECR repo created and deleted; the real push and RDS connection are Phase 2 exit criteria, after provisioning |
| Dockerfile diverges from the nixpacks build and breaks in a way only prod reveals | Phase 1 exit criteria verify the image locally against the SPA specifically, the entrypoint's migrate+seed sequence, the branding build args, `HOST=0.0.0.0`, and openssl/Prisma — the failure modes a passing `docker build` does not catch |
| Adding a Dockerfile silently changes Detroit and Yard Line builds | The Dockerfile is written only in the fork, never upstream; Phase 6 explicitly declines to port it without its own rollout |
| Deleting projects/jobs breaks retained profile code through shared relations | The pruned relation fields are enumerated in Phase 1; `prisma validate`, `tsc --noEmit`, and the retained profile/skill/favorite test suites are the check |
| Taxonomy seeds fail or duplicate on repeated container starts | Both are upsert-based; Phase 1 proves idempotency by starting a second container and diffing row counts, rather than assuming it |
| Re-seeding the taxonomy errors against populated profiles | `ProfileSkill` → `NeedOption` is `onDelete: Restrict`, so seeds must stay upsert-only — never delete-and-recreate. Noted in the runbook |
| Directory ships empty and reads as broken | Phase 0 decides the empty-state behavior deliberately (seed placeholders, empty-state design, or hide until a threshold) |
| Migrations and seeds on every autoscaled task add latency | Prisma's advisory lock serializes migrations; Phase 4 decides explicitly whether to split them into a separate one-off task |
| Client org guardrails block CloudFront, RDS instance classes, or require VPC placement | Surfaced in Phase 0 before any provisioning, alongside the compute-target decision that depends on them |
| Magic links issued with the wrong host at cutover | `APP_URL` is updated and redeployed before the DNS move, and a post-cutover link is inspected as an exit criterion |
| Pages-only deletion leaves dead code shipping | Phase 1 exit greps cover `web/src`, plus `tsc --noEmit` and a bundle check |
| Undefined license lets the client resell your platform against Yard Line | Phase 0 blocks all client-facing work until terms are written. Retaining profiles makes the fork closer to Yard Line's product, which raises the stakes on this |
| Another client's data leaks in the fork | Phase 1 exit criteria greps for it; `.claude/docs/` deleted wholesale |
| Clean break leaves them unpatched on a future auth bug | Acknowledged in writing in Phase 0; not a technical mitigation |
| Railway deleted too early, removing the rollback | Phase 5 gates decommissioning on a completed soak and written client acceptance |

---

## Out of Scope (explicitly deferred)

- Any shared/upstream relationship between the fork and this repo — the break is clean by decision.
- Migrating anything from the Railway database. It is test data and is discarded.
- Multi-AZ, multi-region, or autoscaling design beyond the defaults of the chosen compute target.
- Infrastructure-as-code (Terraform/CDK) for the AWS resources. Phase 2 provisions them directly and
  documents them; converting to IaC is the client's work under the clean break.
- CI/CD for the fork. The runbook covers manual build-and-deploy; wiring GitHub Actions to ECR is
  theirs to add.
- Running Railway and AWS in parallel as a steady state. Railway exists only as rollback and is
  deleted in Phase 5.
- Rebuilding the supply↔demand matching that `ProjectMatches` provided. Skills are retained as
  profile metadata and directory filters; without projects there is no demand side to match against.
- Extracting a reusable course-platform product for your own use. Yard Line continues on this repo.
- Any change to the Detroit or Yard Line deployments before Phase 6.

---

## End State

1. DYNAMICHQI owns a standalone, containerized repo — no project, job, or billing code, no other
   client's material, licensed on agreed terms — running in their own AWS account.
2. `course.dynamichqi.com` serves the founders education course plus a member directory with
   profiles, skills, categories, and favorites, on the client's own App Runner/ECS, RDS, S3, and
   sending domain.
3. Member approval works exactly as it does here, through the existing profile review queue.
4. The Railway `dwimbs-app` service is deleted; no operator-owned account serves any part of the
   client's product.
5. This repo keeps Detroit and Yard Line running unchanged, no longer holds the client's course
   content, and `clients.md` truthfully describes two deployments instead of three.
