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

## High-priority pages (no media queries today)

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

## Medium-priority pages (some coverage, gaps remain)

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

## Low-priority / polish

### `pages/JobDetail.module.css` *(768px query; sidebar collapses fine)*
- `.title` — `--text-4xl` doesn't scale.

### `pages/Account.module.css` *(768px query; sidebar reflows)*
- Sidebar stays narrow on mid-size tablets; optional intermediate breakpoint.

### `pages/admin/AdminShell.module.css`
- `.headerInner` / `.main` — `max-width: 1200px` with `--space-6` padding; reduce padding on phones.

### `pages/admin/Users.module.css` *(768px query converts grid → column)*
- Table is dense between 640–768px; optional intermediate breakpoint.

### `pages/account/Profile.module.css` *(640px query for `.fieldGroup`)*
- `.card` — `padding: --space-8` not reduced on mobile; `.portraitSection` flex row doesn't stack.

### Components
- `components/SkillsEditor.module.css` — `.container { padding: --space-8 }` excessive on mobile.
- `components/ProjectMatches.module.css` — `.person` flex row doesn't stack (ellipsis truncation softens it).
- `components/NeedsDisplay`, `NeedsEditor`, `FilterSelect`, `ui/` — already column/wrap-based or have queries; no critical issues.

---

## Recurring fixes (apply across the app)

1. **Scale large titles** (`.title` at `--text-3xl`/`--text-4xl`) down at 640px.
2. **Trim oversized padding** (`--space-8` cards/containers) at 640px.
3. **Stack horizontal `flex` rows** with `justify-content: space-between` (card headers, meta rows, account/admin headers) at 640px.
4. **Replace fixed widths** (e.g. `.label { width: 100px }`) with stacked layouts on phones.
5. **Shrink grid minimums** (People grid `320px` → ~`260px`) so cards fit a 375px screen.
6. **Reconcile** PersonDetail's fixed action button vs. sticky sidebar.
