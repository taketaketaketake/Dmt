# Client Deployment Registry

One row per running deployment (multi-tenant plan §11, step 6). Keep this current — it is
the seed data for the eventual `Tenant` table backfill when Option 2 (shared instance)
begins, and the checklist of what to patch when rolling out fixes across deployments.

| Client | Domain | Compute | Database | Stripe account | Storage | Email domain | Admin contact | Live since |
|--------|--------|---------|----------|----------------|---------|--------------|---------------|------------|
| _(default / Detroit)_ | dmt-app-production.up.railway.app | Railway `dmt-app-production` | Railway Postgres | Own (operator) | R2 `dmt-uploads` | dmtisreal.com (Resend) | zach@takedetroit.com | 2025 |

## Per-client notes

### Default (Detroit)

The original community. Brand: placeholder "Social Network". Runs on the operator's own
Stripe/R2/Resend accounts.

<!-- Template for a new client:

### <Client name>

- **Status:** provisioning | live | suspended
- **Infra:** Railway | AWS (see aws-deployment-portability.md)
- **Brand env:** BRAND_NAME, VITE_BRAND_NAME, VITE_BRAND_TAGLINE, VITE_LOGO_URL, VITE_FAVICON_URL
- **Provisioned:** date; admin bootstrapped via `npm run bootstrap:admin -- <email>`
- **Quirks:** anything nonstandard about this deployment
-->
