# ADR-005: Editorial Design Language

**Status:** Accepted
**Date:** 2026-01-31
**Source:** `old-docs/BRAND.md`, `old-docs/project_overview.md`

---

## Context

The visual identity needed to differentiate this from generic SaaS dashboards and social platforms. The product is a curated archive — the design should reflect that.

## Decision

An editorial, archival aesthetic inspired by design publications and field manuals rather than tech products.

**Core visual rules:**
- Dark ink backgrounds (`#0a0a0a` to `#2a2a2a`) with light paper surfaces (`#f5f3f0`)
- Hard square edges — no border-radius (exception: 2px on input focus states)
- Square 1:1 image crops with `object-fit: cover`
- Inter as the primary typeface
- Strong typography hierarchy with uppercase tracking for buttons and labels
- Text commands and underlined links over chunky buttons
- Dense, information-rich layouts
- 8px spacing unit system

**Explicitly forbidden:**
- Emojis anywhere in the interface
- Rounded corners, drop shadows, gradients
- Decorative icons or animations
- Confetti, celebration animations, social proof language
- Carousels, infinite scroll, skeleton loaders
- Centered text (except empty states)
- More than 3 font weights per page

**Tone of voice:**
- Concise, direct, professional
- "Profile submitted for review" not "Your profile has been successfully submitted for review!"
- "Failed to save changes" not "Oops! Something went wrong."

## Rationale

- A directory of builders should feel credible and durable, not trendy
- Editorial aesthetics age well — SaaS conventions date quickly
- Dense layouts respect the user's time and screen space
- Hard edges and high contrast create visual authority
- Minimal animation reduces distraction and improves accessibility
- The design constraints prevent feature creep through UI — if it can't be expressed within these rules, it probably shouldn't be built

## Consequences

- Higher design discipline required for every new component
- Some users may expect conventional SaaS patterns (rounded buttons, modals, toasts)
- The aesthetic is polarizing by design — this is acceptable for a curated community
- WCAG AA contrast requirements are met or exceeded across the palette
