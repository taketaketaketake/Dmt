# Implementation Plan: Reusable Course-Platform Template + Yard Line Deployment

> Turn the Dwimbs course platform into a fully reusable template (theme skin + course manifest + env vars + deploy), then replicate it for Yard Line at courses.yardlinechat.com.

---

## Status

**Current Phase:** Phase 1

---

## Phase Completion Rules

A phase may be marked COMPLETE only when:
1. All exit criteria are satisfied
2. All required validation commands have been executed successfully
3. A phase audit has passed (review the diff against the phase's deliverables; no stray scope)

**Validation is mandatory for phase completion.**

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

- `.claude/docs/plans/course-platform-template.md` — this plan verbatim (Status header maintained as phases complete).

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

- [ ] Local smoke with `BRAND_NAME="Yard Line" BRAND_THEME=yardline VITE_BRAND_THEME=yardline`: landing, login, courses pages render teal/stone skin; no unstyled/regressed tokens
- [ ] Local smoke with `BRAND_THEME=dynamichqi` and default: both render exactly as today
- [ ] `cd web && npm run build` succeeds

### Status: NOT STARTED

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

- [ ] `npm run seed:course -- prisma/courses/yard-line/<slug>.json` seeds cleanly against a local DB, and re-running is a no-op (idempotent)
- [ ] `GET /api/courses/public` locally omits the unpublished Yard Line course
- [ ] `cd server && npm test` green
- [ ] Playbook section reads as a complete standalone checklist

### Status: NOT STARTED

---

## PHASE 3 — Provision the Yard Line deployment

### Goal

Replicate the platform as a new Railway deployment serving courses.yardlinechat.com, per the §11 playbook.

### Deliverables

- Railway project `yardline`: Postgres plugin + service from this repo (nixpacks; `HOST=0.0.0.0`; `/health` check configured before cutover).
- Env: `BRAND_NAME="Yard Line"`, `BRAND_TAGLINE` (TBD with client), `BRAND_THEME=yardline`, `VITE_BRAND_NAME="Yard Line"`, `VITE_BRAND_THEME=yardline`, fresh `SESSION_SECRET`, `APP_URL=https://courses.yardlinechat.com`, shared `R2_*` (bucket `dmt-uploads`), shared `RESEND_API_KEY` + `EMAIL_FROM="Yard Line <noreply@dmtisreal.com>"` (launch shortcut — nurse-app's onthefloor.app Resend domain is NOT reusable), Stripe vars unset.
- Branding assets: upload `facility-family-frontend/public/yard-line-logo.png` (+ favicon) to R2 `courses/yard-line/branding/`; set `BRAND_LOGO_URL`/`BRAND_FAVICON_URL` + `VITE_LOGO_URL`/`VITE_FAVICON_URL`.
- `railway run npm run bootstrap:admin -- zach@takedetroit.com`
- `railway run npm run seed:course -- prisma/courses/yard-line/<slug>.json` (stays unpublished). No demo-content seeds.
- DNS: `courses.yardlinechat.com` as Railway custom domain; CNAME `courses` → Railway target in yardlinechat.com DNS (apex untouched); TLS cert issued.
- `.claude/docs/clients.md`: Yard Line registry row + notes (domain, Railway project, shared R2/Resend shortcuts, Stripe: off-platform SaaS fee, admin contact, Phase-2 backlog: client email domain, content arrival, publish).

### Exit Criteria

A phase may be marked COMPLETE only when:

- [ ] `GET https://courses.yardlinechat.com/api/tenant` returns Yard Line branding + `theme: "yardline"`
- [ ] Landing page renders teal/stone skin with "Yard Line" hero on the custom domain
- [ ] Magic-link login round-trip as zach@takedetroit.com succeeds; email arrives with Yard Line brand name from the shared sender
- [ ] Existing yardlinechat.com site unaffected (spot-check the live site)
- [ ] clients.md registry row committed

### Status: NOT STARTED

---

## PHASE 4 — Course content (blocked on client materials)

### Goal

Convert Yard Line's materials into the native course format and publish.

### Deliverables

- Lesson markdown converted from client materials; slides (if any) uploaded to R2 `courses/yard-line/` per `slideUrlPattern`; audio per lesson if provided.
- Knowledge checks + module quiz questions authored in the manifest (same process as Dwimbs commits `f550bc2`/`b53a7b6`).
- `isPublished: true`; re-run `seed:course` on the deployment.

### Exit Criteria

A phase may be marked COMPLETE only when:

- [ ] Client sign-off on content
- [ ] Full course flow E2E on courses.yardlinechat.com: lessons render, progress saves, knowledge checks give instant feedback, module quizzes grade with 2-attempt/70% rules
- [ ] `GET /api/courses/public` lists the published curriculum

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
2. Yard Line live at courses.yardlinechat.com: Yard Line branding and teal/amber/stone skin, admin bootstrapped, skeleton course ready for content.
3. The Dwimbs and Detroit deployments untouched and rendering exactly as before.
4. A registry (`clients.md`) accurately describing all three deployments and the repeatable path to client #4.
