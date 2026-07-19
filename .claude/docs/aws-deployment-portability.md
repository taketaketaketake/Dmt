# AWS Deployment Portability

**Date:** 2026-07-19
**Context:** Client deployments run on the operator's Railway by default (multi-tenant plan
§11), but at least one prospective client runs on AWS infrastructure. This documents the gap
analysis: what already ports, what needs work, and the open questions to ask the client.

The codebase is 12-factor — all external services arrive via env vars — so portability is
mostly a packaging problem, not an architecture problem.

## Gap analysis

| Concern | Status | Work needed |
|---------|--------|-------------|
| Object storage | ✅ Nearly free | `server/src/lib/storage.ts` already uses `@aws-sdk/client-s3`; R2 is consumed through the S3-compatible API. Only the endpoint (`https://{account}.r2.cloudflarestorage.com`) and `region: "auto"` are hardcoded. Make endpoint/region configurable: endpoint unset → real S3 in the given region; endpoint set → R2 (or MinIO, etc.). Public URL is already env-driven (`R2_PUBLIC_URL`) — works with an S3 website URL or CloudFront domain. ~10 lines. |
| Compute | ⚠️ Needs a Dockerfile | No Railway-specific files exist in the repo (nixpacks auto-detects), but there's no portable build artifact either. A Dockerfile replicating the build (install incl. dev deps → `prisma generate` → build web + server → start) runs on App Runner / ECS Fargate / Elastic Beanstalk / EC2. |
| Database | ✅ Zero code changes | `DATABASE_URL` → RDS Postgres; Prisma migrations identical. Wrinkle: RDS typically enforces TLS — append `?sslmode=require` to the URL. |
| Email | ❓ Client-dependent | Resend is external SaaS and works fine *from* AWS. Only if the client mandates AWS-native services does this need an SES adapter in `server/src/lib/email.ts` (small provider abstraction). |
| Stripe, sessions, magic links, branding config | ✅ Provider-agnostic | Nothing to do. Branding is env-driven per [branding-name-locations.md](branding-name-locations.md). |
| Health checks | ✅ Exists | The health endpoint (added for Railway cutover) slots directly into ALB / App Runner health checks. |

## Recommended AWS shape

- **App Runner** — closest to the Railway experience (point at an image, autoscaling and
  health checks built in). Recommended unless the client has existing ECS/VPC standards.
- **ECS Fargate + ALB** — if the client mandates VPC placement or has existing ECS tooling.
- **RDS Postgres** for the database; **S3** for uploads (+ CloudFront in front of the public
  bucket URL if they want a CDN/custom domain).

## Dockerfile caution

Railway **prefers a Dockerfile over nixpacks when one exists in the repo** — adding one
changes the existing Railway build for every deployment, not just AWS ones. It must
faithfully replicate the current nixpacks behavior (notably `npm install --include=dev` and
the prod static-serving path) and be verified carefully, since testing happens on prod
(see railway-deploy notes). Treat the Dockerfile as its own change with its own rollout,
separate from the storage generalization.

## Suggested order of work

1. **Storage endpoint generalization** — safe, additive, no behavior change for existing
   R2 deployments. Do this regardless of any specific client.
2. **Dockerfile** — with a careful Railway verification pass (deploy, health check, uploads,
   magic-link email) before handing it to a client's AWS team.
3. **SES adapter** — only if a client's answer to the email question below requires it.

## Questions to ask an AWS-infrastructure client

1. Is **Resend** acceptable for transactional email, or do you require **SES**?
2. Is **Stripe** acceptable for billing? (No AWS-native equivalent; a hard requirement.)
3. Who operates the deployment — us in their account, or their team from our image/runbook?
4. VPC/compliance constraints that rule out App Runner (forces ECS Fargate)?
5. Who owns DNS for the app domain, and can they verify the email sending domain?

## Not portability blockers

- The multi-tenant plan's Option 2 (shared instance) is unaffected — an AWS client on
  deployment-per-client stays on their own stack until/unless they migrate onto the shared
  platform.
- `HOST=0.0.0.0` / `PORT` are already env-driven and work on any platform.
