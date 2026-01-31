# ADR-003: Manual Approval Over Automated Moderation

**Status:** Accepted
**Date:** 2026-01-31
**Source:** `old-docs/project_overview.md`, `old-docs/PRD.md`

---

## Context

The directory needs a trust mechanism to ensure only legitimate builders appear in listings. Options:

1. Open registration (anyone can join, no review)
2. Automated moderation (spam filters, AI review, keyword blocking)
3. Manual admin approval (human reviews every profile)

## Decision

Every profile requires manual admin approval before it becomes visible. There is no automated content moderation beyond HTML tag stripping and URL validation.

**Approval state machine:**
- `draft → pending_review` (user submits)
- `pending_review → approved` (admin approves)
- `pending_review → rejected` (admin rejects with note)
- `rejected → pending_review` (user resubmits)
- `approved → pending_review` (automatic on major edit: name, handle, portrait)

**Projects do not require approval.** They inherit visibility from their creator's approved profile. Abuse is handled reactively via admin removal.

## Rationale

- The directory is a curated archive — human judgment is the product, not a bottleneck
- Expected submission volume is low enough for manual review
- Automated moderation adds complexity and false positives without improving trust
- Admin rejection includes a note, allowing dialogue with submitters
- Re-approval on identity-field changes preserves trust without blocking minor updates

## Consequences

- Admin capacity is a scaling constraint (acceptable at current scale)
- No review SLA — pending profiles wait for admin availability
- No assignment or queuing system for multiple reviewers
- Projects can contain low-quality content (mitigated by reactive moderation)
