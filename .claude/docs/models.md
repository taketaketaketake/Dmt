# Models

Canonical definitions of the system's domain objects, their states, and relationships.

Source of truth for schema: `server/prisma/schema.prisma`

---

## User

The identity record. Created on first magic-link login.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| email | string | Unique, login identifier |
| status | `pending` · `approved` · `suspended` | See state machine below |
| isEmployer | boolean | Granted/revoked by Stripe webhooks only |
| isAdmin | boolean | Manual database flag |
| stripeCustomerId | string? | Unique, set on first Stripe checkout |
| lastLoginAt | datetime? | Updated on session creation |

**State machine: `status`**

```
pending ──→ approved    (automatic when profile is approved)
approved ──→ suspended  (admin only)
suspended ──→ approved  (admin only)
```

Admin users cannot be suspended.

**Relations:** owns one Profile, many Sessions, many MagicLinkTokens, many UserFavorites, many ProjectFollows.

---

## Profile

A user's public-facing identity in the directory. One-to-one with User.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| userId | string | Unique FK → User |
| name | string | Display name |
| handle | string | Unique, matches `/^[a-z0-9_]{3,30}$/` |
| bio | string? | Free text |
| location | string? | Free text |
| portraitUrl | string? | Path to uploaded image |
| websiteUrl | string? | Validated URL |
| twitterHandle | string? | |
| linkedinUrl | string? | Validated URL |
| githubHandle | string? | |
| approvalStatus | enum | See state machine below |
| rejectionNote | string? | Admin-supplied on rejection |

**State machine: `approvalStatus`**

```
draft ──→ pending_review          (user submits)
rejected ──→ pending_review       (user resubmits, clears rejection note)
pending_review ──→ approved       (admin approves, sets user.status to approved)
pending_review ──→ rejected       (admin rejects, optionally sets rejection note)
approved ──→ pending_review       (automatic on major edit: name, handle, portraitUrl)
```

Minor edits (bio, location, social links) on an approved profile do not trigger re-approval.

**Relations:** belongs to User, has many ProfileCategories, has many Projects (as creator), has many ProjectCollaborators, has many Jobs, has many UserFavorites (as target).

---

## Project

Something a member is building. Belongs to a Profile.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| creatorId | string | FK → Profile |
| title | string | |
| description | string? | |
| status | `active` · `completed` · `archived` | `archived` = admin soft-delete |
| websiteUrl | string? | Validated URL |
| repoUrl | string? | Validated URL |

**Relations:** belongs to Profile (creator), has many ProjectCategories, ProjectCollaborators, ProjectFollows, ProjectNeeds.

---

## Job

An opportunity posted by an employer. Belongs to a Profile.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| posterId | string | FK → Profile |
| title | string | |
| companyName | string | |
| description | string? | |
| type | `full_time` · `part_time` · `contract` · `freelance` | |
| applyUrl | string | Validated URL |
| active | boolean | `false` = admin soft-delete |
| expiresAt | datetime | Must be in the future on create/update |

Default expiry: 30 days from creation.

**Relations:** belongs to Profile (poster).

---

## Category

A tag that can be applied to Profiles or Projects. Three types: `skill`, `industry`, `project_type`.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| name | string | Display label |
| slug | string | Unique, URL-safe |
| type | `skill` · `industry` · `project_type` | |

**Relations:** has many ProfileCategories, many ProjectCategories.

---

## Needs Taxonomy

A two-level system for projects to declare what they need. Categories contain options.

### NeedCategory

Top-level grouping (e.g. "Capital & Financial", "Talent & Team").

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| name | string | Display label |
| slug | string | Unique |
| sortOrder | int | Display ordering |
| active | boolean | Soft-disable |

### NeedOption

Specific need within a category (e.g. "Seeking pre-seed / seed funding").

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| categoryId | string | FK → NeedCategory |
| name | string | Display label |
| slug | string | Unique within category |
| sortOrder | int | Display ordering |
| active | boolean | Soft-disable |

### ProjectNeed

A project's selection within one category. Max 3 categories per project.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| projectId | string | FK → Project |
| categoryId | string | FK → NeedCategory |
| contextText | string? | Max 180 chars, no URLs |

Each project need has 1–2 selected options via the `ProjectNeedOption` join table.

Needs are replaced atomically — all existing needs are deleted and new ones created in a single transaction.

---

## Session

Server-side session record. Cookie holds the session ID (32-char nanoid).

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key (also the cookie value) |
| userId | string | FK → User |
| expiresAt | datetime | Sliding expiry, refreshed at half-life |

---

## MagicLinkToken

One-time-use email verification token.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| token | string | Unique, sent via email |
| userId | string | FK → User |
| expiresAt | datetime | Default 15 minutes |
| used | boolean | Set to true on verification, irreversible |

---

## User Signals

Private, non-social signals. No counts are exposed. No reverse lookups exist.

### UserFavorite

A user bookmarks a profile. Unique on `[userId, profileId]`. A user cannot favorite their own profile.

### ProjectFollow

A user follows a project. Unique on `[userId, projectId]`. A user cannot follow their own project.

---

## Relationship Diagram

```
User ──1:1──→ Profile ──1:N──→ Project ──1:N──→ ProjectNeed ──1:N──→ ProjectNeedOption
                │                  │                  │
                │                  │                  └──→ NeedCategory
                │                  │                           │
                │                  │                           └──1:N──→ NeedOption
                │                  │
                ├──1:N──→ Job      ├──N:M──→ Profile (collaborators)
                │                  ├──1:N──→ ProjectFollow ←── User
                └──1:N──→ UserFavorite ←── User
                │
                └──N:M──→ Category (via ProfileCategory / ProjectCategory)
```

---

## Cascade Rules

| When deleted | Cascades to |
|-------------|-------------|
| User | Sessions, MagicLinkTokens, UserFavorites, ProjectFollows |
| Profile | Projects, Jobs, UserFavorites (targeting that profile) |
| Project | ProjectFollows, ProjectNeeds, ProjectCollaborators |
| NeedCategory | **Restricted** — cannot delete if referenced by ProjectNeeds |
| NeedOption | **Restricted** — cannot delete if referenced by ProjectNeedOptions |
