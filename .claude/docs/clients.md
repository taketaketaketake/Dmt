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
- **Brand:** "Dwimbs Founder Education Series" via env; no logo/favicon yet
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
- **Phase 2 backlog:** knowledge-check questions (email sent), custom domain, client's own
  email domain, possible AWS migration (client runs AWS infra), Cloudflare Stream if video
  lectures happen

<!-- Template for a new client:

### <Client name>

- **Status:** provisioning | live | suspended
- **Infra:** Railway | AWS (see aws-deployment-portability.md)
- **Brand env:** BRAND_NAME, VITE_BRAND_NAME, VITE_BRAND_TAGLINE, VITE_LOGO_URL, VITE_FAVICON_URL
- **Provisioned:** date; admin bootstrapped via `npm run bootstrap:admin -- <email>`
- **Quirks:** anything nonstandard about this deployment
-->
