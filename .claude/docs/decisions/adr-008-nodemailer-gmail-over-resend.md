# ADR-008: Nodemailer/Gmail SMTP Over Resend

**Status:** Accepted (supersedes original plan)
**Date:** 2026-01-31
**Source:** `old-docs/project_overview.md` (original: Resend), implementation change

---

## Context

The original system plan specified Resend as the transactional email provider. During implementation, the decision was changed to Nodemailer with Gmail SMTP.

Options:

1. Resend (API-based email service, original plan)
2. Nodemailer with Gmail SMTP (direct SMTP via Google)
3. SendGrid, Mailgun, or other email API services

## Decision

Use Nodemailer with Gmail SMTP for all transactional email (magic links, need reminders).

**Implementation:**
- Nodemailer configured with Gmail SMTP credentials
- Plain text emails (no HTML templates)
- In development mode, emails are logged to console instead of sent

## Rationale

- Zero additional cost — Gmail SMTP is free within Google Workspace or personal Gmail limits
- No external API dependency — SMTP is a direct connection, no vendor SDK required
- Sufficient for the expected volume (hundreds of users, occasional magic links and reminders)
- Simpler setup than Resend for a single-developer project
- Nodemailer is mature, well-documented, and has no vendor lock-in

## Consequences

- Gmail SMTP has sending limits (~500/day for personal, ~2,000/day for Workspace) — sufficient at current scale
- No delivery analytics, bounce tracking, or reputation management (Resend provides these)
- If email volume grows significantly, migrating to a dedicated service will be necessary
- Gmail account credentials must be maintained and the account must remain active
- No branded HTML templates (plain text only) — acceptable for functional emails
