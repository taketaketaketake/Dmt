# ADR-004: Private Signals, Not Social Features

**Status:** Accepted
**Date:** 2026-01-31
**Source:** `old-docs/SYSTEM_SPEC.md`, `old-docs/PRD.md`

---

## Context

Users want to bookmark people and track projects they care about. The question is whether these signals should be social (visible to others) or private (personal bookmarks).

Options:

1. Public social signals (follower counts, "who favorited you", feed generation)
2. Private bookmarks (only the owner sees their list)
3. No signals at all (users manage this externally)

## Decision

Favorites (people) and follows (projects) are private bookmarks. They are never exposed to other users.

**What exists:**
- `UserFavorite` — a user bookmarks a profile
- `ProjectFollow` — a user follows a project
- Users can list their own favorites and follows
- Toggle actions on detail pages

**What does not exist and will not be built:**
- Public follower/favorite counts
- "Who favorited you" or "who follows this" endpoints
- Social graph queries
- Feed generation from follows
- Notifications based on follows
- Recommendation algorithms using signal data

## Rationale

- The platform is a directory, not a social network — this is a core product principle
- Public counts create incentive to optimize for popularity rather than real work
- Reverse lookups ("who favorited you") create social pressure
- Feed generation from follows would transform the product into something it explicitly is not
- Private signals provide utility (personal organization) without social dynamics

## Consequences

- Users cannot discover who is interested in their work (by design)
- No network effects from social signals
- Signal data is simple and cheap to store (no aggregation, no caching)
- No "trending" or "popular" features are possible
- A user cannot favorite their own profile or follow their own project
