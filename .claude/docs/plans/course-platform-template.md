# Implementation Plan: Reusable Course-Platform Template + Yard Line Deployment

> Turn the Dwimbs course platform into a fully reusable template (theme skin + course manifest + env vars + deploy), then replicate it for Yard Line at courses.yardlinechat.com.

---

## Status

**Current Phase:** Phase 3 (platform launch); Phase 4 is a separately blocked content milestone

**Platform template:** COMPLETE through Phase 2. **Yard Line deployment:** provisioned, not live on
the client domain until Phase 3's DNS and login checks pass. Phase 4 does not block completion of
the reusable-template/deployment work; it begins only after the client supplies and approves content.

---

## Phase Completion Rules

A phase may be marked COMPLETE only when:
1. All exit criteria are satisfied
2. All required validation commands have been executed successfully
3. A phase audit has passed (review the diff against the phase's deliverables; no stray scope)

**Validation is mandatory for phase completion.**

External dependencies do not count as completed work. A phase waiting on a client or DNS owner stays
IN PROGRESS/BLOCKED with the exact handoff recorded; the rest of the plan may still reach its own
explicit completion boundary.

---

## Context

The Option 2 multi-tenant hub build is **shelved** (too heavy for now). This plan stays on the proven one-repo/N-deploys bridge model (`.claude/docs/plans/multi-tenant-implementation.md` §11, as used for Dwimbs). Yard Line is client #2: same course experience as Dwimbs (native lessons, knowledge checks, graded module quizzes, progress), its own content and quizzes, teal/amber/stone branding.

Constraints and decisions:
- **Do not reuse Dwimbs lesson content** (S.I. Williams client IP per `.claude/docs/clients.md`). Yard Line materials arrive from the client later — seed a skeleton course with `isPublished: false`.
- Billing: Yard Line pays a SaaS fee off-platform — Stripe env stays unset (like Dwimbs).
- The existing yardlinechat.com site (Netlify SPA + nurse-app backend) is a different app and stays untouched; only a `courses` CNAME is added to its DNS.
- Already template, no work needed: env-driven branding (`BRAND_*`/`VITE_BRAND_*` → `GET /api/tenant` → `useBranding()`/`usePageTitle`), theme skins (`BRAND_THEME` → `data-theme` → `web/src/styles/themes.css`), manifest+markdown course pipeline (`server/prisma/seed-course.ts`, idempotent, progress-preserving), §11 provisioning playbook.
- Grep-verified: the ONLY hardcoded client-specific code is the public landing page title — `web/src/pages/FounderSeries.tsx:14` (`usePageTitle("Founder Education Series")`) and `:45` (`<h1>Founder Education Series</h1>`). Everything else on that page is generic copy or driven by `usePublicCourses()`.

---

## Stack

| Component | Purpose |
|-----------|---------|
| React + Vite (`web/`) | SPA; landing page, course player, theme skins via CSS variables |
| Fastify + Prisma/Postgres (`server/`) | API, auth (magic link), course delivery, quiz grading |
| Railway (nixpacks) | One service per client; migrations + taxonomy seeds run at boot (`nixpacks.toml:34`) |
| Cloudflare R2 (`dmt-uploads`) | Slide images, audio, branding assets under per-client `courses/<client>/` prefixes |
| Resend (`dmtisreal.com` sender) | Transactional email (shared launch shortcut; per-client domains are Phase 2 backlog) |

---

## PHASE −1 — Commit this plan to the repo

### Goal

Persist this phased plan as a tracked project document so phase status lives in the codebase, consistent with the existing `.claude/docs/plans/` convention.

### Deliverables

- `.claude/docs/plans/course-platform-template.md` — this tracked plan (status, evidence, and
  remaining handoffs maintained as phases progress).

### Exit Criteria

- [x] File committed on `main`

### Status: COMPLETE

---

## PHASE 0 — Generalize the landing page into a reusable component

### Goal

Remove the last client-specific hardcoding so the public landing page at `/` is 100% branding-driven, making the web app a true template.

### Deliverables

- Rename `web/src/pages/FounderSeries.tsx` → `CourseLanding.tsx` (component `CourseLandingPage`), plus `FounderSeries.module.css` → `CourseLanding.module.css` and `FounderSeries.test.tsx` → `CourseLanding.test.tsx` (use `git mv`).
- Branding-driven hero: `usePageTitle()` with no arg (defaults to `branding.name`); drop the eyebrow; `<h1>{branding.name}</h1>`; lede = `branding.tagline`.
- Update lazy import + route comment in `web/src/App.tsx:12,147-155`.
- Tests updated for branding-driven strings.
- Runbook note: Dwimbs renders equivalently with its existing `BRAND_NAME="Dwimbs Founder Education Series"`; optionally set Dwimbs `BRAND_TAGLINE` to the current lede text so nothing regresses visually.

### Exit Criteria

A phase may be marked COMPLETE only when:

- [x] `grep -ri "founder education series" web/src server/src` returns no code matches (comments about the route are fine to remove too)
- [x] `cd web && npm test` green — CourseLanding suite passes; the only failures (People/Projects `waitFor` timeouts) are pre-existing parallel-load flakiness, reproduced identically on the pre-change baseline and green in isolation
- [x] `cd web && npm run build` succeeds
- [x] Local smoke: default build renders branding fallback ("Social Network" + Detroit tagline, unit-tested); Dwimbs-style build (`VITE_BRAND_NAME="Dwimbs Founder Education Series"`, `VITE_BRAND_THEME=dynamichqi`) bakes the brand into bundle + `<title>` — hero renders it as H1

### Status: COMPLETE

---

## PHASE 1 — `yardline` theme skin

### Goal

Add the Yard Line visual skin (extracted from the live yardlinechat.com palette) as a selectable theme, proving the skin system is the per-client theming template.

### Deliverables

- `web/src/styles/themes.css`: new `:root[data-theme="yardline"]` block following the `dynamichqi` pattern (lines 14–63):
  - Ink scale → warm dark stone ramp anchored on `#1c1917` (stone-950/900/800 steps)
  - Paper `#faf9f7`; text-on-paper `#1c1917`; secondary text-on-paper ~stone-600
  - Accent teal `#0d9488`; accent-dim `rgba(13,148,136,.7)`; CTA bg teal-700 `#0f766e` with white text; amber `#b45309` in the secondary-accent slots (where dynamichqi maps gold-dim)
  - Fonts: system sans — no `--font-serif` override, **no `THEME_FONTS` entry** in `web/src/App.tsx`
  - Subtle rounding + the button/input radius rule, same as the dynamichqi block
- `server/src/lib/env.ts`: extend the `BRAND_THEME` allowed-values comment with `yardline`.

### Exit Criteria

A phase may be marked COMPLETE only when:

- [x] Local smoke with `BRAND_NAME="Yard Line" BRAND_THEME=yardline`: `GET /api/tenant` returns `theme: "yardline"`; every default token the app consumes is overridden in the yardline block (same token set as dynamichqi plus `--color-warning`), so no unstyled/regressed tokens
- [x] `BRAND_THEME=dynamichqi` and default unchanged: the diff is purely additive to `themes.css` — existing blocks untouched
- [x] `cd web && npm run build` succeeds (yardline block present in the CSS bundle)

### Status: COMPLETE

---

## PHASE 2 — Yard Line skeleton course + template playbook

### Goal

Stand up the Yard Line course structure (unpublished) so content drops in when the client delivers materials, and codify the "new course client" checklist so replication is a documented, repeatable exercise.

### Deliverables

- `server/prisma/courses/yard-line/<course-slug>.json` — same shape as `corporate-financial-education.json`: real slug/title (TBD with client), `isPublished: false`, 1–2 placeholder modules/lessons with `bodyFile` markdown (path convention consistent with how `seed-course.ts` resolves relative to the manifest), empty `checks`/`quiz`, `slideUrlPattern: "courses/yard-line/slide-{n}.jpg"`.
- Placeholder lesson markdown clearly marked as awaiting client materials.
- `.claude/docs/clients.md`: add a "Course client playbook" section (or extend the template comment): (1) theme skin block in themes.css, (2) course manifest + lessons dir, (3) §11 provisioning with the course-platform env set, (4) registry row.

### Exit Criteria

A phase may be marked COMPLETE only when:

- [x] From `server/`, `npm run seed:course -- prisma/courses/yard-line/yard-line-foundations.json` seeds cleanly against the local DB; re-run confirmed a no-op (1 course row, upserted in place). Working slug `yard-line-foundations` — TBD with client, noted in the manifest. Seeder gained optional `slides` (skeleton lessons have no deck; `LessonDeck` already handles empty `slideUrls`)
- [x] `GET /api/courses/public` locally omits the unpublished Yard Line course
- [x] `cd server && npm test` green (190 tests)
- [x] Playbook section ("Course client playbook" in clients.md) reads as a complete standalone checklist

### Status: COMPLETE

---

## PHASE 3 — Provision the Yard Line deployment

### Goal

Replicate the platform as a new Railway deployment serving courses.yardlinechat.com, per the §11 playbook.

### Deliverables

- Railway project `yardline`: Postgres plugin + service from this repo (nixpacks; `HOST=0.0.0.0`; `/health` check configured before cutover).
- Env: `BRAND_NAME="Yard Line"`, `BRAND_TAGLINE` (TBD with client), `BRAND_THEME=yardline`, `VITE_BRAND_NAME="Yard Line"`, `VITE_BRAND_THEME=yardline`, `REQUIRE_ACCESS_APPROVAL=false` (magic-link confirmation grants immediate course access), fresh `SESSION_SECRET`, `APP_URL=https://courses.yardlinechat.com`, shared `R2_*` (bucket `dmt-uploads`), shared `RESEND_API_KEY` + `EMAIL_FROM="Yard Line <noreply@dmtisreal.com>"` (launch shortcut — nurse-app's onthefloor.app Resend domain is NOT reusable), Stripe vars unset.
- Branding assets: upload `facility-family-frontend/public/yard-line-logo.png` (+ favicon) to R2 `courses/yard-line/branding/`; set `BRAND_LOGO_URL`/`BRAND_FAVICON_URL` + `VITE_LOGO_URL`/`VITE_FAVICON_URL`.
- From `server/`, with the Railway project/service/environment explicitly linked, run
  `railway run npm run bootstrap:admin -- zach@takedetroit.com` and
  `railway run npm run seed:course -- prisma/courses/yard-line/<slug>.json` (stays
  unpublished). No demo-content seeds. The nixpacks start command applies migrations and the
  idempotent needs/category taxonomy seeds on every deploy.
- DNS: `courses.yardlinechat.com` as Railway custom domain; add both Railway-provided records in
  yardlinechat.com DNS — CNAME `courses` → Railway target and the ownership-verification TXT record
  shown by Railway (apex untouched); wait for Railway verification and TLS issuance.
- `.claude/docs/clients.md`: Yard Line registry row + notes (domain, Railway project, shared R2/Resend shortcuts, Stripe: off-platform SaaS fee, admin contact, Phase-2 backlog: client email domain, content arrival, publish).

### Exit Criteria

A phase may be marked COMPLETE only when:

- [x] `GET /api/tenant` returns Yard Line branding + `theme: "yardline"` (verified on yardline-app-production.up.railway.app; custom-domain check pending DNS)
- [x] Landing page and tenant API serve successfully on the TLS-enabled custom domain with Yard
      Line branding and `theme: "yardline"` (verified after Railway activation on 2026-07-22)
- [ ] Magic-link login round-trip — email send verified via `POST /auth/login` (Resend, shared sender);
      complete this after the custom-domain certificate and routing are active
- [x] Existing yardlinechat.com site unaffected — apex still returned the Netlify site after the
      CNAME change (HTTP 200, verified 2026-07-22)
- [x] clients.md registry row committed

### DNS owner handoff and cutover checklist

The Cloudflare zone owner must perform the only remaining external mutation:

1. [x] Add CNAME `courses` → `1alu47lm.up.railway.app`, DNS-only (grey cloud), leaving every
   existing apex and `www` record unchanged. Verified publicly on 2026-07-22.
2. [x] Add the Railway-provided ownership-verification TXT record exactly as displayed under
   `yardline-app` → Settings → Public Networking → `courses.yardlinechat.com`. Railway requires
   both records; with only the CNAME it deliberately returns fallback 404 and does not issue the
   custom certificate. No candidate TXT record was publicly present on 2026-07-22.
3. In Railway, confirm `courses.yardlinechat.com` remains attached to `yardline-app` and wait
   until Railway reports the custom domain/TLS certificate active.
4. Verify independently:
   - `dig +short CNAME courses.yardlinechat.com` returns the Railway target.
   - `curl -fsS https://courses.yardlinechat.com/health` succeeds.
   - `curl -fsS https://courses.yardlinechat.com/api/tenant` returns Yard Line branding and
     `"theme":"yardline"`.
   - Open `/` in a private browser window and check the logo/favicon, Yard Line hero, teal/stone
     skin, no mixed-content errors, and a valid certificate.
5. Request a magic link for a real test inbox, open the received custom-domain URL, confirm the
   session cookie is accepted and the redirect lands on the authenticated app, then sign out.
   Email-send success alone is not an end-to-end login test.
6. Spot-check `https://yardlinechat.com` and its normal API-backed flow. If the custom subdomain
   fails, remove only the new `courses` CNAME; do not alter the apex/`www` records. Keep the Railway
   service URL available for diagnosis.

Record the completion date and tester in this phase and change the registry status from
`provisioning` to `live`. Do not publish the skeleton course as part of cutover.

Provisioning done 2026-07-22: Railway project `yardline` (Postgres + `yardline-app`, nixpacks, `/health` green), full env set (fresh `SESSION_SECRET`, shared R2/Resend, Stripe unset), branding assets on R2, admin bootstrapped (zach@takedetroit.com), skeleton course seeded (unpublished, `/api/courses/public` returns `[]`). Blocker found & fixed en route: `lesson_audio` migration ordering broke fresh-DB deploys (repaired by `20260722221654_lesson_audio_fresh_db_ordering`).

### Status: IN PROGRESS (domain/TLS live; awaiting one real-inbox magic-link E2E)

---

## PHASE 4 — Course content (blocked on client materials)

### Goal

Convert Yard Line's materials into the native course format and publish.

### Deliverables

- Written client approval to use the supplied materials, plus a source inventory mapping each
  document/deck/recording to its target module. Confirm the final course title, slug, tagline,
  audience, learning objectives, module order, passing score, and attempt policy before conversion.
- Replace every placeholder module/lesson; no "awaiting materials", placeholder description, or
  skeleton copy remains. If the client changes the working slug, delete the unpublished skeleton
  row before the first seed under the final slug so two courses are not left behind.
- Lesson markdown converted from client materials; images have useful alt text, heading order is
  logical, links work, and video/audio includes captions or a transcript. Slides (if any) upload to
  R2 `courses/yard-line/` per `slideUrlPattern`; audio per lesson if provided.
- Knowledge checks + module quiz questions authored in the manifest (same process as Dwimbs commits
  `f550bc2`/`b53a7b6`). Each graded question has one unambiguous answer and feedback; validate the
  requested policy against the platform's implemented 2-attempt/70% behavior before promising it.
- Client reviews a staging/unpublished rendering. After written sign-off, set `isPublished: true`
  and, from `server/` with the Yard Line Railway service explicitly linked, run
  `railway run npm run seed:course -- prisma/courses/yard-line/<final-slug>.json`.
- Update `.claude/docs/clients.md` with the final slug/title, module/lesson/asset counts, publication
  date, and any remaining launch shortcuts.

### Exit Criteria

A phase may be marked COMPLETE only when:

- [ ] Client sign-off on content
- [ ] Manifest parses and seeds idempotently locally; server tests and web build pass
- [ ] Unpublished staging QA passes at desktop and mobile widths, including keyboard navigation,
      images/audio, broken-link checks, knowledge checks, quizzes, and progress persistence
- [ ] Full course flow E2E on courses.yardlinechat.com: lessons render, progress saves, knowledge checks give instant feedback, module quizzes grade with 2-attempt/70% rules
- [ ] `GET /api/courses/public` lists the published curriculum
- [ ] A fresh non-admin test user can request a magic link, access the published course, finish a
      lesson, resume it, complete a module quiz, and sign out; admin verifies the resulting progress
- [ ] Registry/runbook reflects the final production state; test data is removed or explicitly kept

### Status: NOT STARTED (BLOCKED — awaiting client materials)

---

## Out of Scope (explicitly deferred)

- Option 2 shared-instance multi-tenancy (plan docs + ADR-009 unchanged; the bridge model continues; tenancy resumes when operating N deploys starts to hurt).
- Stripe/paid course access, per-client email sending domains, self-serve signup, course-authoring UI.
- Any Dwimbs/Detroit changes beyond the optional `BRAND_TAGLINE` note in Phase 0.

---

## End State

After completing all phases, you will have:

1. A course platform with zero client-specific code — new clients are theme skin + manifest + env vars + deploy, per a documented playbook.
2. At the Phase 3 completion boundary, Yard Line live at courses.yardlinechat.com: Yard Line branding
   and teal/amber/stone skin, admin bootstrapped, skeleton course safely unpublished and ready for
   content.
3. The Dwimbs and Detroit deployments untouched and rendering exactly as before.
4. A registry (`clients.md`) accurately describing all three deployments and the repeatable path to client #4.

Phase 4 adds the later content-launch end state: the client-approved Yard Line curriculum is
published and its complete learner journey has passed production E2E validation.
