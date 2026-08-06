# Implementation Plan: Dwimbs Handover (course-only fork → DYNAMICHQI)

> Extract a course-only snapshot of this platform into a standalone repo, sever every shared
> account, and transfer the running Dwimbs deployment to DYNAMICHQI as a clean break.

---

## Status

**Current Phase:** Phase 0 (preconditions — blocked on commercial terms and client accounts)

No code work has started. Phases 1–2 can proceed in parallel with Phase 0, but nothing may touch
the live Dwimbs deployment until Phase 0's license terms are settled.

---

## Phase Completion Rules

A phase may be marked COMPLETE only when:
1. All exit criteria are satisfied
2. All required validation commands have been executed successfully
3. A phase audit has passed (review the diff against the phase's deliverables; no stray scope)

**Validation is mandatory for phase completion.**

External dependencies do not count as completed work. A phase waiting on the client, a DNS owner, or
an account transfer stays IN PROGRESS/BLOCKED with the exact handoff recorded.

---

## Context

### There is no "Dwimbs code" in this repo

`grep -ri dwimbs` across all source returns zero hits — only `.claude/docs/clients.md` and
`.claude/docs/plans/course-platform-template.md`. Dwimbs is *this repo*, deployed to a second
Railway service with different env vars, a `dynamichqi` theme skin, and its own course manifest.
Yard Line runs the identical template.

So "extract Dwimbs" means **extract the course platform from the community platform**, then hand
the result to one client. Yard Line and Detroit stay on this repo, unchanged.

### Decisions taken

| Decision | Choice | Consequence |
|---|---|---|
| Nature of the split | Client fork, not a product line | Yard Line stays here; the extracted repo is a one-off snapshot, not a maintained upstream |
| Ongoing support | **Clean break** — point-in-time snapshot | No upstream link. Security fixes made here never reach them. Must be stated in the contract |
| Hosting | **Transfer the Railway project** to a DYNAMICHQI account | DB survives in place, which is what makes an in-place history conversion necessary at all |
| Live data | **Preserved** — real members + lesson progress since 2026-07 | Requires an explicit migration-history conversion on the live DB (Phase 2 picks the strategy), not a fresh DB |

### Sequencing principle

**Cut over while you still own it, then transfer a working thing.** Every risky step — new
migration-history conversion, new R2 bucket, new Resend sender, extracted code — happens on infrastructure
you control and can roll back. The Railway project transfer is the *last* technical step, not the
first.

### Findings that shape the work

- **The approval flow is coupled to `Profile`.** Dwimbs runs with `REQUIRE_ACCESS_APPROVAL` unset
  (defaults `true`), so `server/src/routes/auth.ts:61` creates new users as `status: "pending"`.
  The only transition to `approved` is `POST /admin/profiles/:id/approve`
  (`server/src/routes/admin.ts:111`), which updates profile and user in one transaction. Admin has
  `suspend`/`reinstate` for users but **no user-level approve**. Deleting `Profile` without
  replacing this strands every new signup. This is the one part of the extraction that is net-new
  code rather than deletion — see Phase 1.
- **The post-login redirect chain has three hops, not one.** Fixing `web/src/pages/Login.tsx:20`
  alone is insufficient. With `REQUIRE_ACCESS_APPROVAL` on, `server/src/routes/auth.ts:105`
  redirects to `/`; `web/src/App.tsx:153` then sends authenticated users to `/people`; and
  `components/layout/RequireApproved.tsx:18` sends *un*approved users to `/account`. All three
  destinations are deleted by this extraction. Every hop must be redefined — see Phase 1.
- **`reject` has no database transition.** `UserStatus` is only `pending | approved | suspended`
  (`server/prisma/schema.prisma:14`); `rejected` exists solely on `ProfileApprovalStatus`, which is
  being deleted. Rejection semantics must be chosen explicitly — see Phase 1.
- **`migrate resolve` does not rebase the history.** `prisma migrate resolve --applied 0_init`
  *inserts* one row into `_prisma_migrations`; it does not delete the seven existing rows. Left
  alone, the live database claims eight applied migrations while the fork's `migrations/` directory
  contains one, and `prisma migrate status` reports the seven as "found in the database but not in
  the local migrations directory" — it will not be clean. Converting the history is therefore an
  explicit, transactional step, not a side effect of resolving. Whether `migrate deploy` *tolerates*
  the divergence is an empirical question, and the plan must not depend on the answer — see Phase 2.
- **The Railway start command migrates before the server boots.** `nixpacks.toml:34` runs
  `prisma migrate deploy && tsx prisma/seed-needs.ts && tsx prisma/seed-categories.ts` ahead of
  `node dist/index.js`. Deploying the fork without first converting the history means `migrate
  deploy` tries to create tables that already exist and the container crash-loops. The same line
  invokes two seeds the fork deletes. Both are ordering constraints on Phase 4.
- **The shared web layer is not community-free.** `web/src/lib/api.ts` (654 LOC) and
  `web/src/hooks/queries.ts` (479 LOC) carry ~135 and ~155 community-referencing lines
  respectively, plus `components/layout/Header.tsx` nav links. Deleting only pages leaves this dead
  code compiling and shipping.
- **`stripeCustomerId` and `isEmployer`** on `User` are nullable / defaulted, so they can be dropped
  from the Prisma model and left as inert orphan columns — no destructive migration on live data.
- **`.claude/docs/clients.md` must not ship.** It contains Yard Line's domain, Railway project
  names, R2 prefixes, and every launch shortcut across all three deployments.
- **No `LICENSE` file exists in this repo.** The code grant is currently undefined.

### Course-platform surface (kept)

`routes/courses.ts` (606 LOC), `prisma/seed-course.ts`, models `Course` / `CourseModule` / `Lesson`
/ `LessonProgress` / `KnowledgeCheck` / `QuizQuestion` / `QuizAttempt`, web `CourseLanding` /
`Courses` / `CourseDetail` / `Lesson` / `ModuleQuiz` + `components/course/*`.

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

## Stack (unchanged in the fork)

| Component | Purpose |
|-----------|---------|
| React + Vite (`web/`) | SPA; landing page, course player, `dynamichqi` theme skin |
| Fastify + Prisma/Postgres (`server/`) | API, magic-link auth, course delivery, quiz grading |
| Railway (nixpacks) | Single service; migrations run at boot (`nixpacks.toml`) |
| Cloudflare R2 (client's own bucket) | Slide images, audio, branding assets |
| Resend (client's own domain) | Transactional email |

---

## PHASE 0 — Preconditions (commercial + client accounts)

### Goal

Settle the terms of the code grant and stand up the client-owned accounts that Phase 3 writes to.
Nothing here is code, and Phase 3 cannot start without it.

### Deliverables

- **License terms for the code grant, agreed in writing.** DYNAMICHQI receives a working course
  platform functionally identical to what Yard Line pays for. What they may do with it — use,
  modify, resell, sublicense — must be explicit. Add the agreed `LICENSE` to the fork in Phase 1.
- **Written acknowledgement of the clean break**: the snapshot is unsupported, and fixes made in
  this repo (e.g. `be4bbf4` scanner-safe magic links) will not reach them.
- DYNAMICHQI Railway account with billing configured, ready to receive a project transfer.
- Client Resend account with their sending domain verified (DNS records in the Squarespace zone —
  the authoritative zone per `clients.md`).
- Client R2 or S3 bucket with public read for course assets, plus credentials.
- Confirm Railway's project-transfer behavior preserves custom domains and env vars, or record the
  manual re-add steps for `course.dynamichqi.com`.

### Exit Criteria

- [ ] Signed/written license terms on file, and the `LICENSE` text chosen
- [ ] Clean-break/no-support term acknowledged in writing
- [ ] Client Railway account confirmed able to accept a transfer
- [ ] Client Resend domain verified; a test send succeeds
- [ ] Client bucket reachable with the supplied credentials
- [ ] Railway transfer behavior for domains + env vars confirmed and recorded here

### Status: NOT STARTED (BLOCKED — commercial terms)

---

## PHASE 1 — Build the extracted repo

### Goal

Produce a standalone, course-only repo that builds and tests green, containing no community code and
no other client's material.

### Deliverables

- **New repo, single initial commit, no imported history.** A clean break must not carry this
  repo's commit log — it contains the full community codebase, Yard Line's provisioning details, and
  anything that ever passed through a commit. Do not use `git filter-repo`.
- Delete the community server surface: `routes/{profiles,projects,jobs,needs,categories,favorites,
  follows,billing,webhooks}.ts`, `lib/stripe.ts`, their tests, and their registrations in
  `server/src/app.ts`.
- Delete the community web surface: `pages/{People,PersonDetail,Projects,ProjectDetail,Jobs,
  JobDetail}`, `pages/account/*`, `components/{FilterSelect,NeedsDisplay,NeedsEditor,ProjectMatches,
  SkillsEditor}`, admin `{ApprovalQueue,ProfileReview,JobQueue}`, their tests, and their routes +
  lazy imports in `web/src/App.tsx`. Resolve what remains of `/account` — with profile, projects,
  jobs, favorites, following, and billing all gone, the shell has no children.
- **Net-new: user-level access approval.** Replace the profile-based queue so
  `REQUIRE_ACCESS_APPROVAL=true` still works:
  - `GET /admin/users/pending`, `POST /admin/users/:id/approve`, `POST /admin/users/:id/reject`
    in `routes/admin.ts`, alongside the existing `suspend`/`reinstate`.
  - An admin pending-users page replacing `ApprovalQueue`/`ProfileReview`.
  - Reuse `sendProfileApprovedEmail` / `sendProfileRejectedEmail` from `lib/email.ts`, retitled for
    account rather than profile review.
  - **Rejection semantics — a pre-implementation gate.** `UserStatus` has no `rejected` value.
    This is currently an open decision, and **Phase 1 may not be marked COMPLETE while it remains
    one.** Pick one behavior, then make the route, the admin UI wording, the re-registration policy,
    and `reinstate` all agree with it. A half-settled design here ships a queue whose button text
    promises something the database does not do.

    Default recommendation: **map reject → `suspended`**, because `requireApproved()` already 403s
    on `suspended` and it needs no schema change. The alternative — adding `rejected` to the enum —
    cannot ride in `0_init`, which is resolved-as-applied and never executes, so it requires a
    second genuinely-running migration.

    The four answers that must agree, whichever is chosen:

    | Question | Under reject → `suspended` |
    |---|---|
    | Route behavior | `POST /admin/users/:id/reject` sets `suspended` and deletes the user's `Session` + `MagicLinkToken` rows (do not rely on expiry) |
    | Admin UI wording | Cannot say "Rejected" if the stored state is Suspended and the list filters on it — either relabel the action, or render suspended-via-reject distinctly and accept that the two are indistinguishable after the fact |
    | Re-registration | `routes/auth.ts:61` sets `status` only on user *creation*, so a rejected address requesting a new link is **not** reset to pending — they stay locked out silently. Confirm that is intended, and decide what the login page tells them |
    | Reinstate | `POST /admin/users/:id/reinstate` sets `approved`, which would promote a rejected user straight past review. Either block reinstate for reject-suspended users or accept it as the deliberate undo |

    The reinstate collision is the sharpest consequence: with one `suspended` state, "unsuspend a
    misbehaving member" and "undo a rejection" become the same button with different intended
    outcomes. If that is unacceptable, the enum-value route is the honest choice despite the extra
    migration.
- **Net-new: redefine the full post-login redirect chain.** All three hops point at deleted routes:
  - `server/src/routes/auth.ts:105` — approval-enabled logins redirect to `/`. Point approved users
    at `/courses`.
  - `web/src/App.tsx:153` — the authenticated `/` redirect targets `/people`. Change to `/courses`.
  - `web/src/pages/Login.tsx:20` — already-authenticated visitors are sent to `/people`. Change to
    `/courses`.
  - `components/layout/RequireApproved.tsx:18` — unapproved users are sent to `/account`, which
    this phase deletes. Needs a real destination: add a minimal "awaiting approval" page (it is the
    only thing a pending member can see) and point the gate at it. Update its doc comment, which
    still describes `POST /admin/profiles/:id/approve`.
  - `pages/NotFound.tsx` and `components/layout/Header.tsx` nav — remove `/people`, `/projects`,
    `/jobs` links; resolve or remove `/account`.
- **Prune the shared web layer**, not just pages: `web/src/lib/api.ts` and `web/src/hooks/
  queries.ts` (community request functions, query keys, hooks, and response types),
  `contexts`/auth types carrying `Profile`, and `components/layout/{Header,Shell}` plus their tests.
- Tests covering pending → approved, pending → rejected (with session invalidation), that a pending
  user is still refused by `authAndApproved()`, and that a pending user's redirect target renders.
- Prune `schema.prisma` to `User`, `Session`, `MagicLinkToken` + the 7 course models. Drop
  `stripeCustomerId` and `isEmployer` from `User` (they remain as inert orphan columns in the live
  DB). Drop the now-unused enums.
- Squash `server/prisma/migrations/` (7 migrations) into a single `0_init` generated from the pruned
  schema.
- Delete community seeds: `seed-demo.ts`, `seed-jobs.ts`, `seed-needs.ts`, `seed-categories.ts`,
  `seed.ts`, and their `package.json` scripts. Keep `bootstrap-admin.ts` and `seed-course.ts`.
  **`nixpacks.toml:34` must be rewritten** — it invokes both deleted seeds, so the fork crash-loops
  on boot until they are removed from the start command.
- Strip community env from `lib/env.ts` (Stripe vars) and the `.env.example`.
- **Strip other clients' material**: delete `prisma/courses/yard-line/`, the `:root[data-theme=
  "yardline"]` blocks from `web/src/styles/themes.css` (lines 70–121), and `.claude/docs/` in its
  entirety. Keep only the `dynamichqi` theme.
- Add the agreed `LICENSE` and a `README.md` written for DYNAMICHQI's engineers: local setup, env
  var reference, `seed:course` workflow, deploy, and how to add lesson content.

### Exit Criteria

- [ ] `grep -ri "yard\s*line\|yardline\|detroit\|takedetroit\|dmtisreal" .` returns no hits in the
      fork
- [ ] `grep -rn "profile\|project\|job\|stripe\|favorite\|follow\|need\|skill\|categor" server/src
      web/src -i` returns no community references (course/lesson code and the word "project" in
      prose excepted). **Must cover `web/src`, not just `server/src`** — `lib/api.ts`,
      `hooks/queries.ts`, `contexts`, and `components/layout` are where dead community code
      survives a pages-only deletion
- [ ] `grep -rn "/people\|/projects\|/jobs\|/account" web/src` returns nothing outside deliberate
      redirects
- [ ] `cd server && npm test` green
- [ ] `cd web && npm test` green and `npm run build` succeeds
- [ ] `cd web && npx tsc --noEmit` clean, and the built bundle contains no community route chunks
- [ ] `npx prisma validate` passes and `0_init` applies cleanly to an empty database
- [ ] Local smoke on a fresh DB: bootstrap an admin, seed the course, request a magic link, follow
      it, land on the awaiting-approval page (not a 404 or a redirect loop), approve from the admin
      page, then reach `/courses` — with `REQUIRE_ACCESS_APPROVAL` both unset and `false`
- [ ] **Rejection design settled**, not deferred: one behavior chosen and recorded, and the route,
      admin UI wording, re-registration policy, and `reinstate` behavior all verified consistent
      with it. Phase 1 is not COMPLETE while any of the four disagree
- [ ] Reject path smoke: a rejected user's session is invalidated, they cannot reach `/courses`, and
      requesting a fresh magic link does the documented thing rather than an undocumented one

### Status: NOT STARTED

---

## PHASE 2 — Choose and rehearse the migration-history conversion

### Goal

Choose a migration-history strategy, then prove it adopts the live Dwimbs database without data
loss — entirely offline, before anything touches production.

### Decide the strategy first

Two viable approaches. Rehearse **A**; fall back to **B** if the rehearsal is not clean.

**Option A — convert the history (default).** Replace the seven DMT rows in `_prisma_migrations`
with a single `0_init` row, so the database history exactly matches the fork's `migrations/`
directory. Clean repo and clean `migrate status` for the client, at the cost of one irreversible
metadata rewrite on live production.

Sequence, all inside one transaction except the resolve:

1. `CREATE TABLE _prisma_migrations_pre_fork AS SELECT * FROM _prisma_migrations;`
2. `DELETE FROM _prisma_migrations;`
3. Commit, then `npx prisma migrate resolve --applied 0_init` — this recomputes the checksum from
   the fork's own migration file, which is why it is used instead of a hand-written `INSERT`.

Deleting *before* resolving is what makes the history match; resolving alone leaves eight rows.

**Option B — inherit the seven migrations verbatim (fallback).** Ship the fork with the existing
`migrations/` directory untouched and add future migrations on top. Day-one `migrate deploy` is a
genuine no-op because all seven are already applied, so **production needs no metadata surgery at
all** — the single highest-risk step in this plan disappears. Costs: the client inherits migration
files that create community tables their schema no longer models, and any fresh database (a staging
clone, a future rebuild) comes up with ~14 orphan tables.

Option A is the better product; Option B removes the only irreversible operation. Record the choice
and the reasoning here before Phase 4.

### Deliverables

- `pg_dump` of the Dwimbs production database, stored outside the repo. This is the rollback
  artifact for every later phase — take it before Phase 3 and again before Phase 4.
- Local restore of that dump, then a **full rehearsal of the chosen strategy end to end**, with
  every command and its output recorded verbatim in this plan so Phase 4 is a transcript replay and
  not an improvisation.
- **Empirical answers, written down** — do not assume Prisma's behavior in any of these:
  - Does `migrate deploy` succeed, warn, or fail when the database holds applied migrations absent
    from the local directory? (This is the Option A step-2 question, and it decides whether the
    naive resolve-only approach was ever viable.)
  - What exactly does `migrate status` print before and after the conversion?
  - Does `migrate deploy` behave differently on the very next deploy versus a subsequent one?
- A written record of which orphan tables remain (`Profile`, `Project`, `Job`, `Category`, and the
  rest) and the confirmation that no code path reads them.
- Verification that admin user deletion still behaves: `Session` and `MagicLinkToken` are
  `onDelete: Cascade`, but `Profile`'s FK to `User` survives in the DB after the model leaves the
  schema — confirm its `onDelete` and that deleting a user with a legacy profile row does not error.

### Exit Criteria

- [ ] Strategy A or B chosen, recorded above with reasoning
- [ ] Full rehearsal on the restored prod dump completed, with commands and outputs transcribed
- [ ] After conversion, `_prisma_migrations` contains exactly the rows the fork's `migrations/`
      directory expects — one row for A, seven for B — verified by direct `SELECT`, not inference
- [ ] `prisma migrate status` reports the database up to date with **no** "found in the database but
      not in the local migrations directory" warnings
- [ ] `prisma migrate deploy` applies nothing and exits 0
- [ ] The three empirical questions above are answered in writing
- [ ] App boots against the restored DB
- [ ] A real member's lesson progress and quiz attempts render correctly and match pre-migration
      row counts
- [ ] An existing approved member can still authenticate; an existing pending member appears in the
      new user approval queue
- [ ] Deleting a test user with a legacy `Profile` row succeeds
- [ ] **Rollback rehearsed from the converted state**, not from an untouched dump: starting from a
      database that has already had its history converted, restore and confirm the original DMT
      build runs against it again. Under Option A this requires restoring `_prisma_migrations` (from
      `_prisma_migrations_pre_fork` or the dump); confirm that a partial rollback — schema restored,
      migration table not — is detected rather than silently limping

### Status: NOT STARTED

---

## PHASE 3 — Sever shared accounts (still on your Railway)

### Goal

Move Dwimbs off every shared account while you still control the deployment, verifying each cutover
independently. Handing over source code while continuing to serve their assets and mail from your
accounts is not a handover.

### Deliverables

- Copy `courses/corporate-financial-education/**` (118 slides at 1600px, plus audio if the client
  recordings have landed) from `dmt-uploads` to the client bucket, preserving the key layout.
- Repoint `R2_*` env on `dwimbs-app` to the client bucket; verify slides and audio load.
- Repoint `RESEND_API_KEY` and `EMAIL_FROM` to the client's verified domain; verify a magic link
  round-trips to a real inbox and renders correctly.
- Do **not** rotate `SESSION_SECRET` here — that is a Phase 5 step, deliberately timed.
- Do **not** change `APP_URL`. `course.dynamichqi.com` is already in the client's Squarespace zone
  and needs no DNS work. Per the standing ordering rule in `clients.md`, never point `APP_URL` at a
  domain before it resolves.

### Exit Criteria

- [ ] Fresh `pg_dump` taken immediately before this phase
- [ ] Every slide in every lesson loads from the client bucket (spot-check first, middle, last
      lesson) with no mixed-content or 403 errors
- [ ] Magic-link email arrives from the client's domain and completes a login
- [ ] `dmt-uploads` and the shared Resend sender are no longer referenced by any Dwimbs env var
- [ ] `clients.md` Dwimbs launch-shortcuts list updated — shared R2 and shared sender struck

### Status: NOT STARTED (BLOCKED — Phase 0 client accounts)

---

## PHASE 4 — Deploy the extracted code to the existing service

### Goal

Run the forked, course-only codebase on the live Dwimbs deployment while it is still yours to roll
back.

### Deliverables

**Order is load-bearing. Convert the migration history BEFORE deploying, never after.**

`nixpacks.toml:34` runs `prisma migrate deploy` as the first thing in the start command, before the
server process exists. If the fork is deployed first, that command finds `0_init` pending against a
database that already has every table, fails on the first `CREATE TABLE`, and the container
crash-loops — there is no running instance on which to then run the resolve.

Steps, in this order:

1. Fresh `pg_dump` (rollback artifact).
2. Execute the migration-history conversion chosen and rehearsed in Phase 2, replaying that
   transcript exactly. Under Option A that is: archive `_prisma_migrations` to
   `_prisma_migrations_pre_fork`, `DELETE` its rows, then `npx prisma migrate resolve --applied
   0_init` from the fork's `server/` against the production `DATABASE_URL`. Under Option B this
   step is empty.
3. `SELECT migration_name FROM _prisma_migrations` and confirm the rows match the fork's
   `migrations/` directory exactly. Then verify `npx prisma migrate status` is clean.
4. **Then** `railway up` the fork to `dwimbs-app`. Its boot-time `migrate deploy` is now a no-op.

**Under Option A, steps 2–4 are a hard maintenance window, not merely a short one.** Between the
`DELETE` and the new deploy, the running DMT build sees an empty migration table: if it restarts for
any reason it will try to replay all seven migrations against a fully-populated schema, fail on the
first `CREATE TABLE`, and crash-loop. That is an outage, not data loss, and it is recovered by
completing step 4 or by restoring the archive table — but it means the old build must not be
allowed to reboot mid-window. Confirm no Railway healthcheck-driven restart or redeploy can fire
during it. (This supersedes an earlier draft of this plan that described the old build as merely
"tolerating an extra row" — that was true of resolve-only, which does not actually convert the
history.)

Other deliverables:

- Confirm the rewritten start command from Phase 1 no longer invokes `seed-needs` / `seed-categories`
  before this deploy — those files do not exist in the fork and would fail the same way.
- Full production verification pass (below).
- Rollback path (Option A): restore `_prisma_migrations` from `_prisma_migrations_pre_fork` — or the
  whole database from the Phase 4 dump — and redeploy the current DMT build. Restoring the migration
  table is **required**, not optional: the old build cannot run against a converted history. Option B
  has no migration rollback because it made no migration change.
- Drop `_prisma_migrations_pre_fork` only after Phase 5 verification passes; it is the cheapest
  rollback artifact and costs nothing to keep until then.

### Exit Criteria

- [ ] Fresh `pg_dump` taken immediately before deploy
- [ ] Migration-history conversion executed against production **before** `railway up`, replaying
      the Phase 2 transcript
- [ ] `_prisma_migrations` rows match the fork's `migrations/` directory exactly, verified by
      `SELECT`; `migrate status` clean with no "not in the local migrations directory" warnings
- [ ] `_prisma_migrations_pre_fork` archive exists and was captured before the `DELETE`
- [ ] No restart or redeploy of the old build occurred during the window
- [ ] Deploy logs show `migrate deploy` applying nothing and the server reaching listen — no
      crash-loop
- [ ] `GET /health` green
- [ ] `GET /api/tenant` returns Dwimbs branding, `theme: "dynamichqi"`, and
      `requiresAccessApproval: true`
- [ ] Landing page renders `BRAND_NAME` as H1 with the navy/gold skin
- [ ] Magic-link login E2E to a real inbox: an **approved** member lands on `/courses`; a **new**
      signup lands on the awaiting-approval page. Dwimbs runs with approval on, so "lands on
      `/courses`" is not the correct expectation for a first-time user
- [ ] No redirect loop and no 404 at any hop of `/auth/verify` → `/` → gate
- [ ] All 7 modules / 12 lessons render; native markdown, the breakeven calculator, and the deck
      fallback all work
- [ ] An existing member's progress is intact; a knowledge check gives instant feedback; a module
      quiz grades under the 2-attempt / 70% rules
- [ ] Admin: users list loads, pending queue approves a real test signup, suspend/reinstate work
- [ ] No 404s or dead links to removed community routes anywhere in the shipped UI

### Status: NOT STARTED

---

## PHASE 5 — Transfer

### Goal

Hand over ownership of both the repo and the running deployment.

### Deliverables

- Push the fork to the DYNAMICHQI GitHub organization; grant their team admin.
- Transfer the Railway project `dwimbs-founder-education` (service + Postgres) to the client's
  Railway account. Re-attach `course.dynamichqi.com` and re-add env vars if the transfer does not
  carry them (per the Phase 0 finding).
- **Rotate `SESSION_SECRET`** — you have held the old one. This logs every member out once; do it
  deliberately at handover and tell the client so they can warn members.
- Hand over credentials and the ops runbook: R2 keys, Resend key, admin bootstrap procedure, the
  `seed:course` content workflow, and the custom-domain gotchas from `clients.md`
  (never pass `--port 3000`; read DNS records from the dashboard, not the CLI).
- Remove or reassign your operator admin account per the agreement.
- Final `pg_dump` handed to the client as their own backup.

### Exit Criteria

- [ ] Repo lives in the DYNAMICHQI org with their team as admins
- [ ] Railway project owned by the client's account and billing to them
- [ ] `https://course.dynamichqi.com/health` and `/api/tenant` green post-transfer
- [ ] A client admin completes a magic-link login on the transferred deployment
- [ ] `SESSION_SECRET` rotated; client notified of the forced re-login
- [ ] Runbook delivered and acknowledged
- [ ] Operator admin account removed or explicitly retained by agreement

### Status: NOT STARTED

---

## PHASE 6 — Clean up this repo

### Goal

Remove what you no longer have a reason to hold, and make the registry truthful.

### Deliverables

- **Delete the S.I. Williams course content**: `server/prisma/courses/corporate-financial-education
  .json` and `server/prisma/courses/lessons/*.md`. This is the client's IP, `clients.md` already
  flags it as do-not-reuse, and after handover there is no reason to retain a copy.
- Delete the `dynamichqi` theme block from `web/src/styles/themes.css` if no other deployment uses
  it (Detroit is default, Yard Line is `yardline` — verify before removing).
- `clients.md`: change the Dwimbs row to handed-over with the date, keep a short historical note,
  and strike Dwimbs from the "patch across deployments" checklist.
- `course-platform-template.md`: note that Dwimbs is no longer a deployment of this repo, so its
  references to Dwimbs as a live template instance stay accurate as history only.
- Consider whether removing Dwimbs as a reference deployment changes the Yard Line plan's
  assumptions.

### Exit Criteria

- [ ] `grep -ri "dwimbs\|s\.i\. williams\|corporate-financial-education" .` returns only historical
      references in `clients.md` and the plan docs
- [ ] `cd server && npm test` and `cd web && npm test` still green after content removal
- [ ] Detroit and Yard Line deployments verified unaffected (`/api/tenant` on each)
- [ ] `clients.md` accurately describes the two remaining deployments

### Status: NOT STARTED

---

## Risks

| Risk | Mitigation |
|---|---|
| Migration-history conversion destroys live member data | Full `pg_dump` before Phases 3, 4, and 5, plus the `_prisma_migrations_pre_fork` archive; the whole conversion rehearsed offline in Phase 2 first and replayed from a transcript |
| Approval flow gap strands new signups | Phase 1 builds user-level approve/reject with tests before anything deploys |
| Deploying before converting the history crash-loops the service | Phase 4 fixes the order explicitly: convert against prod, verify rows by `SELECT` + clean `migrate status`, then `railway up`. `nixpacks.toml:34` migrates before the server starts, so there is no post-deploy recovery |
| `reject` with no enum value ships as a silent no-op or a crash | Settled-design gate blocks Phase 1 completion until route, UI wording, re-registration, and reinstate agree; `0_init` is resolved-not-run, so a new enum value needs a second real migration |
| History conversion leaves the DB and `migrations/` divergent | Phase 2 verifies row-for-row by `SELECT` and requires a warning-free `migrate status`; Option B is a documented fallback that needs no conversion at all |
| Old build reboots mid-window and crash-loops | Option A's window is declared a hard maintenance window; confirm no healthcheck restart can fire, and keep `_prisma_migrations_pre_fork` as the fast recovery |
| Pages-only deletion leaves dead community code shipping | Phase 1 exit greps cover `web/src`, plus `tsc --noEmit` and a bundle check |
| Undefined license lets the client resell your platform against Yard Line | Phase 0 blocks all client-facing work until terms are written |
| Another client's data leaks in the fork | Phase 1 exit criteria greps for it; `.claude/docs/` deleted wholesale |
| Railway transfer drops the custom domain or env | Confirmed in Phase 0; manual re-add steps recorded before the transfer |
| Clean break leaves them unpatched on a future auth bug | Acknowledged in writing in Phase 0; not a technical mitigation |

---

## Out of Scope (explicitly deferred)

- Any shared/upstream relationship between the fork and this repo — the break is clean by decision.
- AWS migration. The client runs AWS infra and `clients.md` references an
  `aws-deployment-portability.md` that **does not exist**; if they later move off Railway, that is
  their work under the clean break.
- Extracting a reusable course-platform product for your own use. Yard Line continues on this repo.
- Dropping the orphan community tables from the Dwimbs database — inert, and destructive to remove.
- Any change to the Detroit or Yard Line deployments before Phase 6.

---

## End State

1. DYNAMICHQI owns a standalone course-platform repo — no community code, no other client's
   material, licensed on agreed terms — and the Railway project running it.
2. `course.dynamichqi.com` serves the same course experience on the client's own R2, Resend, Railway,
   and Postgres, with all member accounts and lesson progress preserved.
3. Access approval works without `Profile`, via a user-level admin queue.
4. This repo keeps Detroit and Yard Line running unchanged, no longer holds the client's course
   content, and `clients.md` truthfully describes two deployments instead of three.
