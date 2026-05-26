# Detroit Builders Directory

## Brand Guidelines

**Version:** 1.0

---

## 1. Brand Essence

### Identity

Detroit Builders Directory is a **curated archive**, not a social network. It documents real work and real people with the aesthetic of a well-edited publication.

### Core Attributes

- **Editorial** - Like a magazine, not a dashboard
- **Archival** - Built to last, not to trend
- **Trustworthy** - Human-curated, not algorithmically optimized
- **Dense** - Information-rich, not padded
- **Calm** - No notifications, no gamification, no noise

---

## 2. Visual Identity

### Color Palette

The palette is built on contrast: dark ink backgrounds with light paper surfaces.

#### Ink (Backgrounds)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-ink-deep` | `#0a0a0a` | Page background |
| `--color-ink` | `#141414` | Primary background |
| `--color-ink-light` | `#1f1f1f` | Elevated surfaces |
| `--color-ink-lighter` | `#2a2a2a` | Hover states |

#### Paper (Surfaces)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-paper` | `#f5f3f0` | Cards, forms, content areas |
| `--color-paper-dim` | `#e8e6e3` | Secondary paper surfaces |
| `--color-paper-dark` | `#d9d7d4` | Borders on paper |

#### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text-primary` | `#f5f3f0` | Primary text on ink |
| `--color-text-secondary` | `#a8a5a0` | Secondary text on ink |
| `--color-text-muted` | `#6b6965` | Tertiary/disabled text |
| `--color-text-on-paper` | `#1a1a1a` | Primary text on paper |
| `--color-text-on-paper-secondary` | `#4a4a4a` | Secondary text on paper |

#### Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | `#4a9f6e` | Success states |
| `--color-warning` | `#b7791f` | Warning states |
| `--color-error` | `#c53030` | Error states |

### Typography

#### Font Stack

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--font-mono: "SF Mono", "Fira Code", "Fira Mono", monospace;
```

Inter is the primary typeface. Use system fonts as fallback.

#### Type Scale

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 12px | Badges, metadata |
| `--text-sm` | 14px | Secondary text, labels |
| `--text-base` | 16px | Body text |
| `--text-lg` | 18px | Large body text |
| `--text-xl` | 20px | Section headers |
| `--text-2xl` | 24px | Page titles |
| `--text-3xl` | 30px | Hero text |
| `--text-4xl` | 36px | Display text |

#### Font Weights

| Token | Weight | Usage |
|-------|--------|-------|
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Emphasis, labels |
| `--font-semibold` | 600 | Headings |
| `--font-bold` | 700 | Strong emphasis |

#### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--tracking-tight` | -0.02em | Headlines |
| `--tracking-normal` | 0 | Body text |
| `--tracking-wide` | 0.025em | Buttons |
| `--tracking-wider` | 0.05em | Uppercase labels |

### Spacing

Based on an 8px unit system.

| Token | Size | Usage |
|-------|------|-------|
| `--space-1` | 4px | Tight gaps |
| `--space-2` | 8px | Small gaps |
| `--space-3` | 12px | Medium gaps |
| `--space-4` | 16px | Standard gaps |
| `--space-6` | 24px | Section gaps |
| `--space-8` | 32px | Large gaps |
| `--space-12` | 48px | Page sections |

### Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--max-width-content` | 1200px | Main content |
| `--max-width-narrow` | 720px | Forms, detail pages |
| `--header-height` | 64px | Fixed header |

---

## 3. Design Principles

### Hard Edges

No border radius. Elements have sharp, architectural edges.

```css
/* Correct */
border-radius: 0;

/* Avoid */
border-radius: 8px;
```

Exception: Small 2px radius (`--radius-sm`) for input focus states only.

### Square Images

All portraits and project images use 1:1 aspect ratio with `object-fit: cover`.

```css
aspect-ratio: 1 / 1;
object-fit: cover;
```

### Dense Layouts

Information should be dense but readable. Avoid excessive whitespace that makes users scroll unnecessarily.

### Minimal Animation

- Transitions: 150-200ms for hover states only
- No decorative animations
- No loading spinners with flair
- No parallax or scroll effects

```css
transition: opacity 150ms ease;
```

### Text Commands Over Buttons

Prefer underlined text links over chunky buttons. When buttons are necessary, they should be understated.

```css
/* Text command style */
font-size: var(--text-sm);
text-transform: uppercase;
letter-spacing: var(--tracking-wider);
text-decoration: underline;
text-underline-offset: 2px;
```

---

## 4. Component Patterns

### Cards

Cards use the paper color palette and contain content on ink backgrounds.

```css
background-color: var(--color-paper);
padding: var(--space-6);
/* No border-radius */
/* No box-shadow */
```

### Buttons

#### Primary Button (on paper)

```css
background-color: var(--color-text-on-paper);
color: var(--color-paper);
font-size: var(--text-sm);
font-weight: var(--font-medium);
letter-spacing: var(--tracking-wide);
text-transform: uppercase;
padding: var(--space-3) var(--space-6);
border: none;
```

#### Secondary Button (on paper)

```css
background-color: transparent;
color: var(--color-text-on-paper);
border: 1px solid var(--color-border-on-paper);
/* Same typography as primary */
```

#### Danger Button

```css
background-color: #c53030;
color: white;
/* Same typography as primary */
```

### Form Inputs

```css
background-color: white;
border: 1px solid var(--color-border-on-paper);
color: var(--color-text-on-paper);
padding: var(--space-3) var(--space-4);
font-size: var(--text-base);
```

### Badges / Status Labels

```css
font-size: var(--text-xs);
font-weight: var(--font-medium);
letter-spacing: var(--tracking-wider);
text-transform: uppercase;
padding: var(--space-1) var(--space-2);
border: 1px solid var(--color-border);
```

### Links

```css
color: inherit;
text-decoration: underline;
text-underline-offset: 2px;
```

Hover state: `opacity: 0.7`

---

## 5. Voice & Tone

### Writing Style

- **Concise** - Say it in fewer words
- **Direct** - No hedging or corporate speak
- **Professional** - Not casual, not stuffy
- **Informative** - Substance over style

### Examples

| Avoid | Prefer |
|-------|--------|
| "Your profile has been successfully submitted for review!" | "Profile submitted for review" |
| "Oops! Something went wrong." | "Failed to save changes" |
| "We're so excited to have you!" | "Welcome to the directory" |
| "Click here to learn more" | "View documentation" |

### Capitalization

- **Page titles**: Sentence case ("Approval queue")
- **Buttons**: Uppercase ("SUBMIT FOR REVIEW")
- **Labels**: Sentence case ("Email address")
- **Status badges**: Uppercase ("PENDING")

---

## 6. Explicit Constraints

### Never Use

- Emojis anywhere in the interface
- Rounded corners (except 2px on focus states)
- Drop shadows
- Gradient backgrounds
- Decorative icons
- Loading spinners with animation beyond simple rotation
- Success/error toast notifications with icons
- Confetti or celebration animations
- Social proof ("Join 500+ builders!")
- Urgency language ("Limited time!")
- Generic stock photography

### Avoid

- More than 3 font weights on a single page
- More than 2 type sizes in close proximity
- Centered text (except for empty states)
- Full-width buttons
- Modals (prefer inline forms)
- Carousels or sliders
- Infinite scroll
- Skeleton loaders (prefer simple "Loading..." text)

---

## 7. Accessibility

### Color Contrast

All text meets WCAG AA contrast requirements:
- Primary text on ink: 13.5:1
- Secondary text on ink: 7.2:1
- Text on paper: 12.6:1

### Focus States

All interactive elements must have visible focus states:

```css
outline: 2px solid var(--color-text-primary);
outline-offset: 2px;
```

### Motion

Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
```

---

## 8. File Structure

```
web/src/styles/
  variables.css    # Design tokens
  base.css         # Foundation styles

web/src/components/
  ui/              # Reusable UI components
    Card.tsx
    Portrait.tsx
    Badge.tsx
  layout/          # Layout components
    Shell.tsx
    Header.tsx

web/src/pages/
  *.module.css     # Page-specific styles
```

### CSS Naming

Use CSS Modules with descriptive class names:

```css
/* Good */
.profileCard { }
.profileCard .name { }
.profileCard .handle { }

/* Avoid */
.card1 { }
.blue-text { }
.mt-4 { }  /* Use tokens instead */
```

---

## 9. Implementation Checklist

When building a new page or component:

- [ ] Uses only colors from the token palette
- [ ] Uses only font sizes from the type scale
- [ ] Uses only spacing values from the spacing scale
- [ ] No border-radius (except --radius-sm for inputs)
- [ ] No box-shadows
- [ ] No emojis
- [ ] Images are square (1:1) where applicable
- [ ] Buttons use uppercase + tracking-wide
- [ ] Links use underline + opacity hover
- [ ] Error states use --color-error (#c53030)
- [ ] Warning states use --color-warning (#b7791f)
- [ ] Focus states are visible
- [ ] Text is left-aligned (not centered)
- [ ] Dense layout without excessive whitespace

---

*End of Brand Guidelines*
