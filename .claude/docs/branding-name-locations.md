# Platform Name / Branding Locations

The platform name is currently the **placeholder "Social Network"** (was "Detroit Directory").
This is temporary until a real business name is chosen. When the real name lands, change it
in every spot below.

> The literal brand string lives in only a handful of files. Everything else (sample data,
> domains, repo name) is NOT branding and should be left alone — see "Do NOT change" below.

## Where the name appears

### Frontend (user-facing UI)
| File | What | Notes |
|------|------|-------|
| `web/src/components/layout/Header.tsx` | Nav logo / brand text | The `<Link to="/">` label |
| `web/src/pages/Login.tsx` | Login page `<h1>` heading | See tagline note below |
| `web/index.html` | Browser tab `<title>` | Was the generic "web" before the rename |
| `web/src/styles/variables.css` | Design-system header comment | Cosmetic only |

### Backend (transactional emails)
| File | What | Notes |
|------|------|-------|
| `server/src/lib/email.ts` | Email subjects + headings | Magic-link sign-in subject + `<h1>`, profile-review subject, approval "Welcome to …" heading |
| `server/src/lib/env.ts` | Default `EMAIL_FROM` sender name | Fallback used when env var is unset |
| `server/.env` | `EMAIL_FROM` value | Local/dev sender name |

## How to update (next time)

1. Search for the current name across source:
   ```bash
   grep -rniI "social network" web/src web/index.html server/src server/.env | grep -v node_modules
   ```
   (Swap `"social network"` for whatever the current placeholder is.)
2. Replace each occurrence with the new name in the files listed above.
3. Update the **Login tagline** if desired — see below.
4. Update **production `EMAIL_FROM`** in the Railway dashboard (see "Outside the codebase").
5. Update this doc's placeholder name reference.

## Special cases / judgement calls

- **Login tagline** — `web/src/pages/Login.tsx` (around line 67-68) reads
  *"A curated archive of builders in Detroit."* This references the **city**, not the brand
  name, so it was intentionally left unchanged during the rename. Decide per new brand whether
  to reword it (e.g. drop "in Detroit").

## Outside the codebase (can't be changed by editing files)

- **Production `EMAIL_FROM`** — live emails use the `EMAIL_FROM` set in **Railway's environment
  variables**, not `server/.env`. Update it in the Railway dashboard for real outgoing emails
  to show the new name.
- Domains (`dmtisreal.com`, `takedetroit.com`), the Railway service name, and the git repo
  name are infrastructure, not display branding — change only if you actually want to migrate
  them.

## Do NOT change (not branding)

- `web/src/data/mock.ts` — "Detroit Harvest", "Adaptive Detroit", etc. are **fake sample
  company names** in mock data, not the platform brand.
- Any `*.test.ts(x)` fixtures / seed data referencing Detroit as sample content.
- Email/domain addresses unless you're deliberately migrating domains.
