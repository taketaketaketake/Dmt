# Client Deployment Registry

One row per running deployment (multi-tenant plan §11, step 6). Keep this current — it is
the seed data for the eventual `Tenant` table backfill when Option 2 (shared instance)
begins, and the checklist of what to patch when rolling out fixes across deployments.

| Client | Domain | Compute | Database | Stripe account | Storage | Email domain | Admin contact | Live since |
|--------|--------|---------|----------|----------------|---------|--------------|---------------|------------|
| _(default / Detroit)_ | dmt-app-production.up.railway.app | Railway `dmt-app-production` | Railway Postgres | Own (operator) | R2 `dmt-uploads` | dmtisreal.com (Resend) | zach@takedetroit.com | 2025 |
| Dwimbs | dwimbs-app-production.up.railway.app | Railway project `dwimbs-founder-education`, service `dwimbs-app` | Railway Postgres (same project) | None (billing disabled) | R2 `dmt-uploads` (shared, `courses/` prefix) | dmtisreal.com (Resend, shared) | zach@takedetroit.com (interim) | 2026-07 |

## Per-client notes

### Default (Detroit)

The original community. Brand: placeholder "Social Network". Runs on the operator's own
Stripe/R2/Resend accounts.

### Dwimbs (Founder Education Series)

- **Status:** live (launched 2026-07-19)
- **Brand:** "Dwimbs Founder Education Series" via env; no logo/favicon yet.
  Theme: `BRAND_THEME=dynamichqi` + `VITE_BRAND_THEME=dynamichqi` (set 2026-07-22) —
  DynamicHQI navy/gold skin from `web/src/styles/themes.css`, matching dynamichqi.com
- **Content:** "Corporate Financial Education for Founders" course — 7 modules, 12 lessons,
  118 slides (JPEG, 1600px) at `courses/corporate-financial-education/` in the shared R2
  bucket. Source deck: S.I. Williams Wealth Management (client IP — do not reuse).
- **Provisioned:** Railway CLI. Admins: zach@takedetroit.com (operator), plus client team
  lauryn@, jorge@, sherilyn@ @dynamichqi.com (added 2026-07-19)
- **Launch shortcuts in effect (all reversible):** Railway subdomain (no custom domain yet),
  shared Resend/dmtisreal.com sender, shared R2 bucket, Stripe skipped
- **Demo content seeded (2026-07-19):** 6 people / 4 projects / 4 jobs, founder-themed, via
  `npm run seed:demo`. All demo users are on `@demo.example.com` — purge with
  `DELETE FROM "User" WHERE email LIKE '%@demo.example.com'` (cascades) before real members
  arrive, or leave until the client asks.
- **Native content (shipped 2026-07-19):** all 12 lessons render native markdown (converted
  from the deck, sources in `server/prisma/courses/lessons/*.md`), with original slides as
  a collapsible fallback. The P&L lesson embeds the interactive breakeven calculator
  (`:::calculator breakeven` marker). Knowledge-check UI ships with instant feedback and
  soft-gated completion — renders as soon as `checks` land in the manifest.
- **Audio narration (READY — client recording scheduled):** `Lesson.audioUrl` + player are
  live. When recordings arrive: one file per lesson (m4a/mp3), upload to R2 under
  `courses/corporate-financial-education/audio/<lesson>.m4a`, set `audioUrl` on each
  manifest lesson (key relative to R2 public URL), re-run `seed:course`. Ask the client to
  record **per lesson** (12 files), not per slide — the native pages are one continuous
  read. The old deck embeds ~100 per-slide .m4a files; superseded by the new recordings.
- **Landing page (template refactor, 2026-07-22):** the public `/` page is now the generic
  `CourseLandingPage` — hero renders `branding.name` as the H1 and `branding.tagline` as the
  lede (no more hardcoded "Founder Education Series"). Dwimbs renders equivalently via its
  existing `BRAND_NAME="Dwimbs Founder Education Series"`. Optionally set
  `BRAND_TAGLINE`/`VITE_BRAND_TAGLINE` to the previous lede — "A guided, self-paced
  curriculum for people starting something — narrated lessons, real examples, and knowledge
  checks that make the ideas stick." — so the hero copy doesn't regress to the Detroit
  default tagline.
- **Phase 2 backlog:** knowledge-check questions (email sent), custom domain, client's own
  email domain, possible AWS migration (client runs AWS infra), Cloudflare Stream if video
  lectures happen

## Course client playbook

The repeatable path for standing up a new white-label course client (bridge model:
one repo, N deploys — multi-tenant plan §11). A new client is a theme skin + a course
manifest + env vars + a deploy; zero client-specific code.

### 1. Theme skin (`web/src/styles/themes.css`)

- Add a `:root[data-theme="<client>"]` block following the existing `dynamichqi` /
  `yardline` pattern: override the ink scale, paper, text, accent, CTA, and border
  tokens with the client's palette; add the button/input `border-radius` rule if the
  brand uses rounding.
- Custom fonts only if the brand requires them: set `--font-serif`/`--font-heading`
  in the block and add a `THEME_FONTS` entry in `web/src/App.tsx` (skip both for
  system-sans brands like yardline).
- Document the new value in the `BRAND_THEME` comment in `server/src/lib/env.ts` and
  the theme comment in `web/src/config/branding.ts`.

### 2. Course manifest + lessons

- Create `server/prisma/courses/<client>/<course-slug>.json` (shape: see
  `corporate-financial-education.json` and the `CourseManifest` types in
  `server/prisma/seed-course.ts`). `bodyFile` paths resolve relative to the manifest,
  so lessons live in `server/prisma/courses/<client>/lessons/*.md`.
- `slideUrlPattern: "courses/<client>/slide-{n}.jpg"`; omit `slides` on lessons with
  no deck. Slides/audio upload to R2 `dmt-uploads` under the `courses/<client>/`
  prefix (or the client's own bucket).
- Before client materials arrive: seed a skeleton with `isPublished: false` and
  clearly-marked placeholder lessons (see `courses/yard-line/`). The seeder is
  idempotent and progress-preserving — re-run `npm run seed:course -- <manifest>`
  after every content edit. Note: courses upsert by slug; if the slug changes,
  delete the old Course row before re-seeding.

### 3. Provision the deployment (multi-tenant plan §11 checklist)

Follow §11 steps 1–5 (Railway service + Postgres, migrations, `bootstrap:admin`,
DNS, email round-trip check) with the course-platform env set:

- `BRAND_NAME`, `BRAND_TAGLINE`, `BRAND_THEME=<client>`, `BRAND_LOGO_URL`,
  `BRAND_FAVICON_URL` (runtime, served by `GET /api/tenant`)
- `VITE_BRAND_NAME`, `VITE_BRAND_TAGLINE`, `VITE_BRAND_THEME=<client>`,
  `VITE_LOGO_URL` (build-time first-paint fallback — must match the runtime values)
- Fresh `SESSION_SECRET` (never shared), `APP_URL=https://<domain>`
- `R2_*` (shared `dmt-uploads` at launch), `RESEND_API_KEY` +
  `EMAIL_FROM="<Brand> <noreply@dmtisreal.com>"` (shared-sender launch shortcut;
  client's own domain is backlog), Stripe vars unset when billing is off-platform
- `railway run npm run seed:course -- prisma/courses/<client>/<slug>.json`
- No demo-content seeds unless the client wants sample data

### 4. Registry

Add the client's row to the table at the top of this file plus a per-client notes
section (use the template below), including any launch shortcuts in effect and the
Phase-2 backlog (custom email domain, content arrival, publish, etc.).

<!-- Template for a new client:

### <Client name>

- **Status:** provisioning | live | suspended
- **Infra:** Railway | AWS (see aws-deployment-portability.md)
- **Brand env:** BRAND_NAME, VITE_BRAND_NAME, VITE_BRAND_TAGLINE, VITE_LOGO_URL, VITE_FAVICON_URL
- **Provisioned:** date; admin bootstrapped via `npm run bootstrap:admin -- <email>`
- **Quirks:** anything nonstandard about this deployment
-->
