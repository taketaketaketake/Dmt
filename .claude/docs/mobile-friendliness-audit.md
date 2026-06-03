# Mobile-Friendliness Audit

A page-by-page list of layouts and sections that need refactoring to work well on
phones. The global navbar (`components/layout/Header`) was already made
mobile-friendly with a hamburger menu and is **not** listed here.

## Conventions in this codebase

- CSS modules + design tokens in `web/src/styles/variables.css`.
- Existing responsive breakpoints: **768px** (tablet) and **640px** (phone).
- Common fixes referenced below:
  - **Stack:** change a horizontal `flex` row to `flex-direction: column` at the breakpoint.
  - **Collapse grid:** change multi-column `grid-template-columns` to `1fr`.
  - **Scale title:** add a smaller `font-size` for large headings on phones.
  - **Trim padding:** reduce large card/container padding (e.g. `--space-8` → `--space-4`).

---

> **Status:** ✅ All sections complete — refactored 2026-06-02. High, medium, and
> low-priority pages now carry `640px` (and where relevant `768px`) media queries,
> including the PersonDetail fixed-button vs. sticky-sidebar bug fix. A few
> low-priority items were already mobile-safe and were intentionally left as-is
> (see notes in the low-priority section).

## High-priority pages (✅ done — refactored 2026-06-02)

### `pages/Jobs.tsx` + `Jobs.module.css`
- `.card` — `flex; justify-content: space-between` breaks when a job title is long. **Stack** at 640px.
- `.cardMeta` — `flex-shrink: 0` badge has no room next to long titles.
- `.title` — `--text-3xl` (30px) doesn't scale; **scale title** at 640px.

### `pages/Login.tsx` + `Login.module.css`
- `.card` — `padding: --space-8` (32px) is too large on small phones; **trim padding**.
- `.page` — `padding: --space-6` excessive on very small screens.
- `.title` — `--text-3xl` doesn't scale; **scale title**.

### `pages/account/Billing.module.css`
- `.status` — `flex; justify-content: space-between` should **stack** at 640px.
- Buttons (`.portalButton`, `.subscribeButton`) have no mobile sizing.

### `pages/account/Favorites.module.css`
- `.card` — `flex; align-items: center; justify-content: space-between` breaks with long text; **stack** at 640px.

### `pages/account/Following.module.css`
- `.card` — `flex; justify-content: space-between` breaks with long project titles; **stack** at 640px.
- `.projectHeader` — `flex` row crowds on small screens.

### `pages/admin/ApprovalQueue.module.css`
- `.card` — `flex; align-items: center` breaks with long name/handle; **stack** at 640px.
- `.cardMeta` — `email` and `date` compete for space; wrap awkwardly.

### `pages/admin/UserDetail.module.css`
- `.row` — `flex` with `.label { width: 100px }` (fixed) is cramped; **stack** at 640px.
- `.listItem` — `flex; justify-content: space-between` breaks with long titles.

### `pages/admin/JobQueue.module.css`
- `.card` — `flex; align-items: flex-start` breaks with long job title; **stack** at 640px.
- `.cardMeta` / `.actions` — wrap awkwardly; buttons may shrink too far.

---

## Medium-priority pages (✅ done — refactored 2026-06-02)

### `pages/People.tsx` + `People.module.css` *(has 640px query for `.search`)*
- `.grid` — `repeat(auto-fill, minmax(320px, 1fr))` cards are too wide; only 1 fits on a 375px screen. Lower the min to ~260px on phones.
- `.title` — `--text-3xl` doesn't scale.

### `pages/Projects.tsx` + `Projects.module.css` *(has 640px query for `.search`)*
- `.cardHeader` — `flex; justify-content: space-between` breaks with long titles; **stack** at 640px.
- `.title` — `--text-3xl` doesn't scale.

### `pages/ProjectDetail.tsx` + `ProjectDetail.module.css` *(has 768px query; sidebar collapses fine)*
- `.titleRow` — `flex` row doesn't reflow; **stack** at 640px.
- `.title` — `--text-4xl` (36px) doesn't scale.

### `pages/PersonDetail.tsx` + `PersonDetail.module.css` *(has 768px query)*
- `.actionButton` becomes `position: fixed; bottom: 0` on mobile while `.sidebar` is `position: sticky` — the two conflict/overlap. Reconcile the fixed button vs. sticky sidebar.
- `.title` — `--text-2xl` doesn't scale.

### `pages/account/MyProjects.module.css` *(has 640px query for `.fieldGroup`)*
- `.header` — `flex; justify-content: space-between` doesn't reflow; **stack** at 640px.
- `.formCard` — `padding: --space-8` too large; **trim padding**.

### `pages/account/MyJobs.module.css` *(has 640px query for `.fieldGroup`)*
- `.card` — `flex; justify-content: space-between` breaks with long titles; **stack** at 640px.
- `.header` — doesn't reflow.
- `.formCard` — `padding: --space-8` too large; **trim padding**.

### `pages/admin/ProfileReview.module.css` *(has 640px query for `.profileCard`)*
- `.actions` — `flex; justify-content: flex-end` crowds buttons; stack/full-width on phones.
- `.userRow` — `.label { width: 100px }` fixed width is cramped.

---

## Low-priority / polish (✅ done — refactored 2026-06-02)

### `pages/JobDetail.module.css` *(768px query; sidebar collapses fine)*
- ✅ `.title` 4xl→3xl and `.company` xl→lg at 640px.

### `pages/admin/AdminShell.module.css`
- ✅ `.headerInner` wraps, `.tabs` get their own full-width scrollable row, and `.headerInner`/`.main` padding trimmed at 640px.

### `pages/account/Profile.module.css` *(640px query for `.fieldGroup`)*
- ✅ `.card` padding 8→5 and `.portraitSection` spacing trimmed at 640px. (`.portraitSection` was already `flex-direction: column`, so no stacking change was needed.)

### `components/SkillsEditor.module.css`
- ✅ `.container` padding 8→5 at 640px.

### Already fine — no change made (avoiding no-op media queries)
- `pages/Account.module.css` — already reflows to a single column at 768px; the 200px sidebar on mid-size tablets is acceptable.
- `pages/admin/Users.module.css` — the 768px query already converts the table to stacked rows for everything ≤768px, so there is no dense 640–768px gap.
- `components/ProjectMatches.module.css` — `.person` is a small avatar + name row; `.personSkills` already truncates with ellipsis and `.personInfo` has `min-width: 0`, so it holds up on phones.
- `components/NeedsDisplay`, `NeedsEditor`, `FilterSelect`, `ui/` — already column/wrap-based or have queries; no critical issues.

---

## Recurring fixes (apply across the app)

1. **Scale large titles** (`.title` at `--text-3xl`/`--text-4xl`) down at 640px.
2. **Trim oversized padding** (`--space-8` cards/containers) at 640px.
3. **Stack horizontal `flex` rows** with `justify-content: space-between` (card headers, meta rows, account/admin headers) at 640px.
4. **Replace fixed widths** (e.g. `.label { width: 100px }`) with stacked layouts on phones.
5. **Shrink grid minimums** (People grid `320px` → ~`260px`) so cards fit a 375px screen.
6. **Reconcile** PersonDetail's fixed action button vs. sticky sidebar.
