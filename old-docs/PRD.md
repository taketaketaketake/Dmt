# Detroit Builders Directory

## Product Requirements Document (PRD)

**Version:** v1.1 (Built & Operational)

---

## 1. Overview

### Product Name

Detroit Builders Directory

### Summary

A members-only, curated directory of builders in Detroit that documents who is building, what they are working on, and how to contact them.

This is a community artifact, not a social network or SaaS product.
It prioritizes trust, clarity, and real work over growth mechanics.

---

## 2. Problem Statement

Detroit has many capable builders working across software, AI, hardware, and automation, but:

- There is no trusted, local map of who is actually building
- Existing platforms optimize for networking, self-promotion, or recruiting noise
- Builders lack a calm, credible place to present real work
- Employers struggle to find serious, local practitioners without spam

The result is fragmented visibility and low-signal discovery.

---

## 3. Goals & Non-Goals

### Goals

- Provide a high-signal directory of Detroit builders
- Make real projects legible and browsable
- Enable ethical hiring without recruiter spam
- Preserve human judgment via manual approval
- Feel durable, editorial, and non-gamified
- Be operable by a small admin team

### Non-Goals (Explicit)

This product will not include:

- Social feeds, likes, or public follower counts
- Direct messaging or chat
- Public browsing (members-only)
- Recommendation algorithms
- User analytics dashboards
- Growth loops, virality, or gamification
- Generic job board mechanics
- Automated moderation

---

## 4. Target Users

### Primary Users

**Builders / Founders**

- Software engineers
- AI practitioners
- Hardware / robotics builders
- Technical founders

### Secondary Users

**Employers**

- Hiring managers
- Founders hiring locally
- Small teams seeking collaborators

**Admins**

- Platform operators responsible for:
  - Approvals
  - Moderation
  - Trust enforcement

---

## 5. Access & Trust Model

### Membership

- Anyone may request access
- All profiles require manual admin approval
- Browsing is restricted to approved members

### User States

- `pending` – signed up, awaiting approval
- `approved` – full access
- `suspended` – disabled by admin

### Capabilities (Additive)

- `isEmployer` – granted via active Stripe subscription
- `isAdmin` – manually assigned

Roles are capabilities, not identities.

---

## 6. Core Domain Objects

### User

Authentication and account state.

### Profile (Trust Boundary)

- One per user
- Requires admin approval
- Public representation of a builder
- Contains:
  - Name
  - Bio
  - Portrait
  - External links
  - Approval status

### Project

- First-class object
- Created by approved profiles
- No approval workflow
- Represents real work
- Inherits visibility from creator's profile

### Job

- Posted by verified people (employers)
- Requires active subscription
- No applications or messaging
- External apply link only

### Private Signals

- Favorites (People)
- Follows (Projects)

These are private bookmarks:

- No public counts
- No reverse lookup
- No feed generation

---

## 7. Key User Flows

### Builder Flow

1. Sign up via magic link
2. Create profile draft
3. Submit for approval
4. Admin approves (with note)
5. Once approved:
   - Browse directory
   - Create projects
   - Favorite people
   - Follow projects

### Employer Flow

1. Approved member subscribes via Stripe
2. Gains employer capability
3. Creates and manages job postings
4. Jobs visible to approved members only

### Admin Flow

1. Review pending profiles
2. Approve or reject with context
3. Moderate users, projects, and jobs
4. Suspend or reinstate accounts

---

## 8. Functional Requirements

### Authentication

- Passwordless magic link login
- Server-side sessions
- HttpOnly cookies

### Profiles

- Draft → Pending → Approved / Rejected
- Rejection includes admin note
- Approved profiles become directory-visible

#### Profile Editing Rules

- **Draft / Rejected**: Fully editable
- **Pending Review**: Locked (no edits allowed)
- **Approved**: Editable with restrictions
  - **Minor edits** (no re-approval): bio, location, website, social links
  - **Major edits** (triggers re-approval): name, handle, portrait

This allows approved members to keep their profiles current while preserving trust boundaries on identity-related fields.

### Projects

- CRUD for owners
- Visible only if creator profile is approved
- Admin can archive (soft delete)

### Jobs

- CRUD for employers
- Visibility gated to approved members
- Auto-expiry (default 30 days)
- Existing jobs persist after subscription lapse

### Favorites & Follows

- Add/remove
- Private lists
- Filtered if target becomes unapproved

### Image Uploads

- Profile portraits, project images
- JPEG/PNG/WebP only
- Max size enforced
- Square editorial crops

### Admin Controls

- Approval queue
- User suspension / reinstatement
- Soft deletion of projects and jobs
- No bulk actions

---

## 9. UX & Design Requirements

### Visual Principles

- Editorial, archival feel
- Dark ink background, paper-like surfaces
- Strong typography hierarchy
- Hard square image crops
- Dense but readable layouts

### Explicit UX Constraints

- No emojis
- No generic SaaS buttons
- No gamification
- No decorative animation
- Function over flourish

---

## 10. Technical Requirements

### Stack

- **Backend:** Node.js + TypeScript + Fastify
- **Database:** PostgreSQL + Prisma
- **Frontend:** React + Vite
- **Auth:** Magic link + server sessions
- **Email:** Resend
- **Billing:** Stripe
- **Storage:** Local or object storage (v1)

### Architecture

- Single monolithic service
- No microservices
- No background workers
- No queues

### Deployment

- Managed Postgres
- Single web + API deployment
- Prisma migrations as source of truth

---

## 11. Security & Compliance

- Session-based auth
- Role and capability checks on all routes
- Admin actions gated and confirmed
- No sensitive data logged
- Stripe webhooks verified

---

## 12. Success Criteria (v1)

The product is successful if:

- A small group of builders actively maintain profiles
- Employers post legitimate jobs
- Admins can moderate without friction
- The system runs without constant intervention
- No pressure emerges to add social features

---

## 13. Out of Scope (Deferred)

Intentionally deferred until real usage demands them:

- Categories & taxonomy
- Search
- Pagination
- Analytics dashboards
- Public access
- Mobile app
- Notifications center

---

## 14. Current Status

- ✅ Backend complete
- ✅ Frontend complete
- ✅ Admin UI complete
- ✅ Monetization live
- ✅ Launch-ready for curated beta

---

## 15. Product Philosophy (Non-Negotiable)

This platform exists to document real work and real people, not to optimize engagement.

If a feature:

- increases noise
- incentivizes performance
- or erodes trust

…it should not be built.

---

*End of PRD*
