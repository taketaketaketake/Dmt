# ADR-007: Two-Level Project Needs Taxonomy

**Status:** Accepted
**Date:** 2026-01-31
**Source:** `old-docs/PROJECT_NEEDS.md`

---

## Context

Projects in the directory needed a structured way to communicate what help they need. Options:

1. Free-text field ("What do you need?")
2. Flat tag list (predefined labels like "funding", "hiring", "mentorship")
3. Two-level taxonomy (categories containing specific options)

## Decision

A two-level taxonomy system: `NeedCategory → NeedOption`. Categories are broad groupings (e.g. "Capital & Financial"), options are specific needs within them (e.g. "Seeking pre-seed / seed funding").

**Constraints:**
- Maximum 3 categories per project
- 1–2 options per category
- Optional context text per category (max 180 characters, no URLs)
- Needs are replaced atomically — all existing needs are deleted and new ones created in a single transaction
- Taxonomy is admin-controlled (categories and options are seeded, not user-created)

**V1 taxonomy:** 8 categories, 40 options covering capital, people, product, design, go-to-market, legal/ops, resources, and visibility.

## Rationale

- Free text is unstructured and unsearchable — it becomes noise at scale
- Flat tags lack hierarchy — "seeking funding" and "seeking a co-founder" are fundamentally different categories of need
- Two levels provide enough structure for browsability without over-constraining
- The 3-category limit forces prioritization — projects must identify their top needs, not check everything
- Atomic replacement simplifies the update model (no partial edits, no merge conflicts)
- Admin-controlled taxonomy ensures consistency across all projects

## Consequences

- Adding new categories or options requires a database seed operation
- Categories and options cannot be deleted if referenced by active project needs (restrict delete)
- The 180-character context limit constrains explanation depth (by design — keeps it scannable)
- URL prohibition in context text prevents the needs section from becoming a link dump
- Stale needs are addressed via admin-triggered reminder emails (30-day threshold)
