# ADR-006: Stripe-Controlled Employer Capability

**Status:** Accepted
**Date:** 2026-01-31
**Source:** `old-docs/PRD.md`, `old-docs/SYSTEM_SPEC.md`

---

## Context

Employers pay to post jobs. The system needs to track who has an active subscription and gate job posting accordingly. Options:

1. Manual admin flag (admin marks users as employers)
2. Application-managed billing (store plan/payment state locally, sync with Stripe)
3. Stripe webhook-driven capability (Stripe is the source of truth, webhooks toggle the flag)

## Decision

The `isEmployer` boolean on the User model is controlled exclusively by Stripe webhooks. It cannot be set manually through the API.

**Grant:** `checkout.session.completed` webhook sets `isEmployer = true`
**Revoke:** `customer.subscription.deleted` or `invoice.payment_failed` webhook sets `isEmployer = false`

**Implementation details:**
- A Stripe customer is created on first checkout if none exists
- The customer ID is stored on the user and never changes
- All webhook handlers are idempotent (check current state before writing)
- Revocation is immediate — no grace period
- A single employer subscription tier (one product, one price)

## Rationale

- Stripe as source of truth eliminates state synchronization bugs
- Webhook-driven means no polling or scheduled jobs
- Idempotent handlers safely absorb duplicate webhook deliveries
- No grace period simplifies the model (Stripe handles dunning and retry logic)
- Single tier avoids plan comparison complexity

## Consequences

- Admins cannot manually grant employer status (by design — prevents billing bypass)
- If webhooks fail, employer status may lag (mitigated by Stripe's retry mechanism)
- No local record of subscription details, invoices, or payment methods
- Testing requires Stripe test mode or webhook simulation
- Existing jobs persist after subscription lapse (they just can't create new ones)
