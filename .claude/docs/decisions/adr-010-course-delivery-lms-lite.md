# ADR-010: Course Delivery (LMS-Lite) for White-Label Clients

**Status:** Accepted
**Date:** 2026-07-19
**Source:** First white-label client (financial-education firm) needs to deliver their course — "Corporate Financial Education for Founders," a 118-slide deck in 6 modules / ~14 topics — through their gated instance. Hard constraint: **launch within one week.** The client requires the course to be *interactive*, not a static slide dump.

---

## Context

The platform ([ADR-009](adr-009-multi-tenant-whitelabel.md)) is a gated community: manual admission, member profiles, projects, jobs. It has no notion of instructional content. The client's course material exists as a PowerPoint deck with a genuine course structure (per-topic learning objectives and summaries) but **no assessments** — any quizzes/checks must be authored from scratch by the client.

The platform's existing shell already covers most of what an LMS needs around the edges: gated enrollment (admission = enrollment), magic-link auth, admin moderation, Stripe billing, R2 object storage, per-client branding. What's missing is the middle: lessons, a player, progress, and interactivity.

The one-week deadline is the dominant force. A solo operator cannot build a general LMS in a week; the decision below is shaped by what can be cut while still being honestly "interactive."

Options considered:

1. **Third-party LMS** (Teachable/Thinkific/TalentLMS) linked from the platform. Fastest to content-live, but breaks the white-label promise the client is paying for: second login (no SSO achievable in a week), separate branding surface, member/progress data held outside the platform, recurring per-client SaaS cost. It also undercuts the product thesis — we are selling *the platform*.
2. **Embedded slides** (Google Slides/Canva iframe, or a PDF). Near-zero build, but fails the interactivity requirement outright: no progress, no checks, and the client's copyrighted content sits on a third-party host.
3. **Full LMS subsystem** (authoring UI, quiz engine, grading, certificates, video pipeline). The "right" long-term shape; not buildable in a week.
4. **Minimal first-class course subsystem in the monolith** — courses as data, a lesson player, progress tracking, and lightweight knowledge checks; authoring deferred to a seed script instead of a UI.

## Decision

Adopt **Option 4: LMS-lite inside the monolith**, with these boundaries:

**Data model:** `Course → CourseModule → Lesson`, plus `LessonProgress` (per user: completed, last position) and `KnowledgeCheck` (per lesson: ordered multiple-choice questions, options and correct answer stored as JSON). All tables follow the same patterns as existing models and will take `tenantId` like everything else when Option 2 tenancy lands (they join the root-entity tier in the implementation plan §1).

**Content format:** lessons render **slide images** (deck exported to per-slide images, stored in R2, referenced by slide-range per lesson) in a simple player with prev/next navigation, plus optional markdown body text. This turns the existing deck into web-native lessons with zero new infrastructure.

**Interactivity (v1 definition):** per-lesson completion + resume position, with module/course progress visible to the member. **Knowledge checks are phase 2** (decided 2026-07-19): the client has no quiz questions prepared this week, so v1 launches with progress tracking only. The `KnowledgeCheck` schema ships in v1 regardless — empty — so phase 2 is a content load plus the check UI, no migration. Checks, when they land: end-of-lesson multiple choice, instant right/wrong feedback, soft-gating "mark complete"; not graded beyond pass/attempt counts.

**Video hosting/streaming:** **Cloudflare Stream** is the designated video path — the player supports a Stream embed as an alternative lesson body from day one, but v1 launches with slide-image lessons only (no course videos exist yet). Rationale for Stream over the alternatives: we are already on Cloudflare (R2); Stream provides adaptive HLS, thumbnails, and **signed playback URLs** (course content stays gated — a bare R2-hosted MP4 URL is shareable and undermines the paid course; YouTube-unlisted leaks and carries foreign branding; Mux is equivalent but a new vendor relationship and pricier at this scale). Cost is usage-based (~$5/1,000 min stored, ~$1/1,000 min delivered) and billed per client deployment.

**Authoring: none in v1.** This is the single biggest cut and the main thing that makes one week feasible. Courses are loaded by a **seed script** from a JSON manifest (module/lesson titles, slide ranges, knowledge-check questions). The operator runs content changes; the client emails edits. An authoring UI is explicitly future work.

**Access:** any approved member of the deployment sees the course (admission *is* enrollment). No per-course purchases, drip scheduling, cohorts, or completion certificates in v1.

## Rationale

- The monolith build keeps auth, branding, progress data, and the member experience in one place — the entire reason a client buys a white-label instance instead of a Teachable account.
- Slide-images-as-lessons converts the client's existing asset directly into launchable content; nothing blocks on video production.
- Deferring authoring to a seed script trades operator convenience (cheap, recoverable later) for a week of schedule (unrecoverable) — the correct direction for this deadline.
- Choosing Stream now, even though v1 ships without video, means the lesson model and player are built with the video case in the schema from the start — no migration when the client records lectures.

## Consequences

- **Scope cuts are explicit and client-facing:** no authoring UI, no graded quizzes, no certificates, no discussion threads, no drip/cohorts, no per-course billing, no SCORM/xAPI. The client must sign off on the v1 "interactive" definition (progress + knowledge checks) up front; that conversation is the first task, not the last.
- **Knowledge-check questions are requested from the client with no launch dependency** (they do not exist in the deck). Phase 2 ships whenever the questions arrive; the empty schema is already live.
- **Content prep is operator work:** exporting 118 slides to images, uploading to R2, writing the course manifest. Budget roughly a day.
- **New recurring cost per client** once video lands (Stream usage), which belongs in the client's deployment pricing.
- **Copyright:** course content is the client's IP (© S.I. Williams Wealth Management); it lives in their deployment's bucket and must not be reused as platform demo content.
- **Launch infrastructure is Railway** (decided 2026-07-19) — the client's AWS requirement is deferred; a later migration follows [aws-deployment-portability.md](../aws-deployment-portability.md) if still required.
- Rough build sequence for the week: schema + seed (day 1), lesson player + progress API (days 2–3), mobile pass + deploy + content load (day 4–5), buffer/client review (days 6–7). Knowledge-check UI moves to phase 2. Provisioning of the Railway deployment (plan §11) runs in parallel and is a prerequisite for launch.
- This ADR extends, not changes, [ADR-009](adr-009-multi-tenant-whitelabel.md): courses are another tenant-owned surface. When Option 2 begins, the four new tables get `tenantId` treatment identical to `Project`/`Job`.
