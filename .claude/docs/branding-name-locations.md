# Platform Branding Configuration

Branding is **env-driven** (extracted 2026-07-19 per the
[multi-tenant plan §11](plans/multi-tenant-implementation.md)). The default brand is the
**placeholder "Social Network"** until a real business name is chosen. Changing the brand —
for a rename or a per-client deployment — is now an env-var exercise; no source edits needed.

## The config surfaces

| Surface | File | Env vars |
|---------|------|----------|
| SPA (build-time) | `web/src/config/branding.ts` | `VITE_BRAND_NAME`, `VITE_BRAND_TAGLINE`, `VITE_LOGO_URL` |
| Browser tab `<title>` | `web/vite.config.ts` (`html-brand` plugin → `%BRAND_NAME%` in `index.html`) | `VITE_BRAND_NAME` |
| Server emails | `server/src/lib/env.ts` → used by `email.ts` | `BRAND_NAME`, `EMAIL_FROM` |

Consumers: `Header.tsx` (brand text, or `<img>` when `VITE_LOGO_URL` is set), `Login.tsx`
(heading + tagline), `usePageTitle.ts` (per-page document titles), and the email subjects /
headings + default sender name on the server.

The **default values** ("Social Network" / the Detroit tagline) live as fallbacks in
`web/src/config/branding.ts`, `web/vite.config.ts` (must match — see comment there), and
`server/src/lib/env.ts`. A permanent platform rename means updating those three fallbacks;
a client deployment just sets the env vars and touches no code.

## How to brand a deployment (or rename)

1. **Server env:** set `BRAND_NAME` and `EMAIL_FROM` (Resend-verified domain).
2. **Web build env:** set `VITE_BRAND_NAME`, optionally `VITE_BRAND_TAGLINE` and
   `VITE_LOGO_URL`. These are **build-time** — on Railway they must be present in the
   service's build environment, and a redeploy is required to take effect.
3. For a permanent rename (not a client deploy): also update the three fallback defaults
   listed above and this doc.

## Special cases / judgement calls

- **Tagline** — the default *"A curated archive of builders in Detroit"* references the
  **city**, not the brand. Override per client via `VITE_BRAND_TAGLINE`; reword the default
  when a real platform name lands.
- **Favicon** — still the Vite default (`web/public/vite.svg` via `index.html`); per-client
  favicons are not yet configurable.

## Outside the codebase

- Production env lives in the **Railway dashboard** — `BRAND_NAME`, `EMAIL_FROM`, and the
  `VITE_*` vars per service. `server/.env` only affects local dev.
- Domains (`dmtisreal.com`, `takedetroit.com`), the Railway service name, and the git repo
  name are infrastructure, not display branding — change only if you actually want to
  migrate them.

## Do NOT change (not branding)

- `web/src/data/mock.ts` — "Detroit Harvest", "Adaptive Detroit", etc. are **fake sample
  company names** in mock data, not the platform brand.
- Any `*.test.ts(x)` fixtures / seed data referencing Detroit as sample content.
- Email/domain addresses unless you're deliberately migrating domains.
