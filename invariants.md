# Invariants

Hard constraints that must remain true for the system to be correct. If any of these are violated, the system is in a broken state.

## Identity

- One user has at most one profile. `Profile.userId` is unique.
- One profile has exactly one handle. `Profile.handle` is globally unique.
- One user has at most one Stripe customer. `User.stripeCustomerId` is unique.
- A user cannot favorite the same profile twice. `UserFavorite[userId, profileId]` is unique.
- A user cannot follow the same project twice. `ProjectFollow[userId, projectId]` is unique.
- A project has at most one need entry per category. `ProjectNeed[projectId, categoryId]` is unique.

## Authentication

- Sessions are identified by a 32-character nanoid stored in an httpOnly, sameSite lax cookie.
- JavaScript cannot read the session cookie. `httpOnly` is always true.
- The cookie is HTTPS-only in production. `secure` is true when `NODE_ENV === "production"`.
- Magic link tokens are one-time use. Once verified, `used` is set to true and the token cannot be used again.
- Magic link tokens expire after `MAGIC_LINK_EXPIRY_MINUTES` (default: 15).
- Sessions expire after `SESSION_MAX_AGE_DAYS` (default: 30). When less than half the max age remains, the expiry is refreshed on the next authenticated request.
- Expired sessions are deleted on access.

## Authorization

These are the access rules. They are enforced in middleware, before any route handler runs.

| Guard | Requires | Failure |
|-------|----------|---------|
| `requireAuth` | Valid, non-expired session | 401 |
| `requireApproved` | `user.status === "approved"` | 403 |
| `requireEmployer` | Auth + approved + `user.isEmployer === true` | 403 |
| `requireAdmin` | Auth + `user.isAdmin === true` | 403 |

Guards compose. `requireEmployer` implies auth and approved. `requireAdmin` implies auth but does not require approved status.

## Profile approval

Profiles have four states: `draft`, `pending_review`, `approved`, `rejected`.

Allowed transitions:

- `draft → pending_review` (user submits)
- `rejected → pending_review` (user resubmits, clears rejection note)
- `pending_review → approved` (admin approves, also sets `user.status` to `approved`)
- `pending_review → rejected` (admin rejects, optionally sets rejection note)
- `approved → pending_review` (automatic on major edit: name, handle, or portraitUrl change)

Forbidden states:

- A profile in `pending_review` cannot be edited.
- A profile already `pending_review` or `approved` cannot be submitted.
- Only an admin can move a profile from `pending_review` to `approved` or `rejected`.

Minor edits (bio, location, social links) on an approved profile do not trigger re-approval.

## User status

Users have three states: `pending`, `approved`, `suspended`.

- `pending → approved` happens automatically when a profile is approved.
- `approved → suspended` is admin-only.
- `suspended → approved` is admin-only.
- Admin users cannot be suspended. The system rejects the request.

## Visibility

These rules determine what data is returned to non-owner, non-admin users:

- **Profiles**: Only profiles with `approvalStatus === "approved"` appear in listings or are viewable by other members. Owners can always view their own profile.
- **Projects**: Only projects whose creator has `approvalStatus === "approved"` are visible. Projects inherit visibility from their creator.
- **Jobs**: Only jobs where `active === true`, `expiresAt > now`, and `poster.approvalStatus === "approved"` appear in listings. Single job view returns 404 if poster is not approved.
- **Favorites**: Private. Only the owning user can list their own favorites. No counts are exposed. No "who favorited you" endpoint exists.
- **Follows**: Private. Only the owning user can list their own follows. No counts are exposed. No "who follows this" endpoint exists.

A user cannot favorite their own profile. A user cannot follow their own project.

## Billing

- `isEmployer` is granted only by a Stripe `checkout.session.completed` webhook. It cannot be set manually through the API.
- `isEmployer` is revoked by `customer.subscription.deleted` or `invoice.payment_failed` webhooks. Revocation is immediate, no grace period.
- All webhook handlers are idempotent. They check current state before writing. Duplicate events do not cause duplicate updates.
- A Stripe customer is created on first checkout if none exists. The customer ID is stored on the user and never changes.

## Jobs

- Posting a job requires `isEmployer === true` and an approved profile.
- `expiresAt` must be in the future, both on create and update. Past dates are rejected.
- Default expiry is 30 days from creation.
- Only the job owner can update a job. Only the owner or an admin can delete a job.
- Admin deletion is a soft delete (`active: false`). Owner deletion is a hard delete.

## Project needs

- A project can have at most 3 need categories.
- Each category must have 1 or 2 options selected.
- Context text is limited to 180 characters and cannot contain URLs.
- Needs are replaced atomically — all existing needs are deleted and new ones created in a single transaction.
- Only the project owner can set needs.

## Input safety

- All user-submitted text has HTML tags stripped, whitespace collapsed, and is trimmed.
- All user-submitted URLs must use `http:` or `https:` protocol. Other protocols are rejected.
- Upload filenames are never derived from user input. The filename is `{type}-{nanoid(12)}{ext}` where the extension comes from a validated MIME type map, not the original filename.
- Allowed upload types: `image/jpeg`, `image/png`, `image/webp`. Maximum size: 5MB.
- Profile handles must match `/^[a-z0-9_]{3,30}$/`.
- Need context text cannot contain URLs (pattern-matched and rejected).

## Rate limiting

- Global rate limit: 100 requests per minute per IP address.
- `/health` is exempt from rate limiting.
- JSON request body limit: 1MB.
- File upload limit: 5MB, 1 file per request.

## Data integrity

- Deleting a user cascades to: sessions, magic link tokens, favorites, follows.
- Deleting a profile cascades to: projects, jobs, favorites referencing that profile.
- Deleting a project cascades to: follows, needs, collaborators.
- `NeedCategory` and `NeedOption` cannot be deleted if referenced by project needs (restrict).
- Admin project removal is a soft delete (status set to `archived`). Admin job removal is a soft delete (`active` set to `false`).
