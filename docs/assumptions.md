# Assumptions

Explicit assumptions the system is built on. If any of these become false, the affected areas need reassessment.

---

## Infrastructure

- **Single server**: The application runs as a single Node.js process. There is no horizontal scaling, load balancing, or multi-region deployment.
- **Single database**: One PostgreSQL instance, co-located or network-adjacent to the application server.
- **Local filesystem storage**: Uploaded images are stored on the server's local disk under `uploads/`. This assumes persistent disk and a non-containerized deployment, or a volume mount if containerized.
- **No CDN**: Static assets and uploads are served directly by the application. No edge caching layer exists.
- **No background workers**: All work happens in the request cycle. There are no queues, cron jobs, or async task runners.

## Authentication

- **Email is the identity**: Users are identified by email address. No username/password, no OAuth, no SSO.
- **Magic links are sufficient**: Users have access to their email inbox and can receive links within 15 minutes.
- **One session per cookie**: The browser stores one session cookie. Multiple concurrent sessions from different devices are supported, but there is no session management UI.
- **Gmail SMTP is the email provider**: Transactional emails are sent via Nodemailer using Gmail SMTP credentials. This assumes the Gmail account stays active and within sending limits.

## Billing

- **Stripe manages all payment state**: The application does not store subscription plans, payment methods, or invoices. Stripe is the source of truth.
- **Webhooks are reliable**: Stripe will eventually deliver all webhook events. The system handles duplicates via idempotency checks but does not implement its own retry logic.
- **One product, one price**: There is a single employer subscription tier. No free trials, no multiple plans, no usage-based billing.

## Moderation

- **Manual admin review is scalable enough**: Every profile is reviewed by a human admin before approval. This assumes the submission volume is low enough for manual review to keep up.
- **One admin is sufficient**: The system supports multiple admins, but the workflow assumes a small number of reviewers without assignment, queuing, or conflict resolution.
- **No automated content moderation**: Beyond HTML stripping and URL validation, there is no spam detection, profanity filtering, or AI-based content review.

## Users

- **Small, local community**: The directory serves builders in Detroit. Expected user count is in the hundreds, not thousands.
- **Users have modern browsers**: The frontend targets evergreen browsers. No IE11, no legacy mobile browser support.
- **English only**: All content, UI, and communications are in English. No internationalization or localization.

## Data

- **No data export**: Users cannot export their data. There is no GDPR-style data portability feature.
- **No analytics**: The application does not collect usage analytics, page views, or behavioral data.
- **No search engine**: Profile and project search is basic string matching, not full-text search with ranking.
- **Cascading deletes are acceptable**: When a user or profile is deleted, all associated data is removed. There is no soft-delete or archival for user-initiated deletions.

## Deployment

- **Single environment**: Development runs locally, production runs on one server. There is no staging environment.
- **Manual deployment**: There is no CI/CD pipeline. Deployment is a manual process.
- **Docker for database only**: PostgreSQL runs in Docker. The application itself runs directly on Node.js.
