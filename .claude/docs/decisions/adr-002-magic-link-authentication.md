# ADR-002: Magic Link Authentication

**Status:** Accepted
**Date:** 2026-01-31
**Source:** `old-docs/project_overview.md`, `old-docs/PRD.md`

---

## Context

The system needs authentication for a members-only directory. Options considered:

1. Username/password with email verification
2. OAuth (Google, GitHub)
3. Magic link (passwordless email)

## Decision

Passwordless magic link login. A user enters their email, receives a one-time link, clicks it, and gets a server-side session stored in an httpOnly cookie.

**Implementation:**
- Tokens are one-time use, expire after 15 minutes
- Sessions are server-side (stored in PostgreSQL), expire after 30 days
- Sliding expiry refreshes the session at half-life
- Cookie is httpOnly, sameSite lax, secure in production
- sameSite is `lax` (not `strict`) because the magic link itself is a cross-site navigation from the user's email client

**Explicitly rejected:**
- Passwords (friction, password management burden, breach liability)
- OAuth (adds external identity provider dependency, not all users have GitHub/Google)
- JWT tokens (stateless tokens can't be revoked server-side)

## Rationale

- Minimizes user friction — no password to remember or manage
- No password storage means no credential breach risk
- Email is already the identity — magic links leverage this directly
- Server-side sessions allow immediate revocation (logout, suspension)
- Small user base means email delivery volume is well within Gmail SMTP limits

## Consequences

- Users must have email access to log in (acceptable for this audience)
- Login is slower than password entry (email delivery delay)
- Email deliverability is a dependency (mitigated by using Gmail SMTP)
- No "remember me" beyond the 30-day session window
- Multiple devices each get independent sessions
