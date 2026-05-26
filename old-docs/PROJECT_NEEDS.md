# Project Needs Feature

## Overview

The Project Needs feature allows founders to communicate what kind of help they need with their projects. It uses a two-level taxonomy system (categories → options) that is admin-controlled and consistent across all projects.

## Data Model

### Taxonomy (Admin-controlled)

- **NeedCategory**: Top-level categories like "Capital & Financial", "People & Partners"
- **NeedOption**: Specific options within each category like "Seeking pre-seed/seed funding"

### Project Needs (User-controlled)

- **ProjectNeed**: Links a project to a category with optional context text
- **ProjectNeedOption**: Links a project need to specific options

## V1 Taxonomy

The initial taxonomy includes 8 categories with 40 total options:

| Category | Options |
|----------|---------|
| Capital & Financial | 6 options (funding, angels, VCs, grants, revenue, pricing) |
| People & Partners | 6 options (co-founders, advisors, employees) |
| Product & Engineering | 6 options (architecture, MVP, AI/ML, data, security, hardware) |
| Design & UX | 4 options (UX feedback, brand, design systems, prototyping) |
| Go-to-Market & Growth | 5 options (customer discovery, marketing, distribution, sales, community) |
| Legal, Ops & Business Setup | 5 options (incorporation, IP, contracts, accounting, operations) |
| Resources & Access | 5 options (equipment, manufacturing, workspace, data, beta users) |
| Visibility & Exposure | 3 options (press, speaking, showcase) |

## API Endpoints

### GET /api/needs/taxonomy

Returns the full taxonomy (categories and options). Public endpoint.

```json
{
  "categories": [
    {
      "id": "...",
      "name": "Capital & Financial",
      "slug": "capital-financial",
      "sortOrder": 0,
      "options": [
        {
          "id": "...",
          "name": "Seeking pre-seed / seed funding",
          "slug": "seeking-preseed-seed",
          "sortOrder": 0
        }
      ]
    }
  ]
}
```

### GET /api/projects/:id/needs

Returns the needs for a specific project. Requires authentication.

```json
{
  "needs": [
    {
      "categoryId": "...",
      "category": { "id": "...", "name": "...", "slug": "..." },
      "optionIds": ["...", "..."],
      "options": [{ "id": "...", "name": "...", "slug": "..." }],
      "contextText": "Optional context",
      "updatedAt": "2024-01-15T..."
    }
  ]
}
```

### PUT /api/projects/:id/needs

Atomically replaces all needs for a project. Owner only.

**Request:**
```json
{
  "needs": [
    {
      "categoryId": "...",
      "optionIds": ["...", "..."],
      "contextText": "Optional context"
    }
  ]
}
```

**Validation Rules:**
- Maximum 3 categories per project
- Maximum 2 options per category
- At least 1 option required per category
- Context text max 180 characters
- No URLs allowed in context text

### POST /admin/tasks/send-need-reminders

Admin endpoint to trigger reminder emails for stale project needs.

**Logic:**
- Finds projects where:
  - Project is active
  - Creator's profile is approved
  - Has at least one need
  - Most recent need update is 30+ days old
  - Haven't received a reminder in last 30 days (or never)
- Sends reminder email for each eligible project
- Updates `needsReminderSentAt` only after successful send

## Frontend Components

### NeedsEditor

Located at `web/src/components/NeedsEditor/`

Collapsible editor for managing project needs. Used in MyProjects page.

Features:
- Load taxonomy on first expand
- Add/remove categories (max 3)
- Toggle options per category (max 2)
- Context text input with character counter
- URL detection in context
- Atomic save

### NeedsDisplay

Located at `web/src/components/NeedsDisplay/`

Read-only display of project needs. Used in ProjectDetail page.

Features:
- Shows categories with selected options
- Shows context text if present
- Hidden if no needs set

## Seeding the Taxonomy

Run the seed script to populate or update the taxonomy:

```bash
cd server
npx tsx prisma/seed-needs.ts
```

The script is idempotent - safe to run multiple times.

## Email Templates

### Need Reminder Email

Sent when a project's needs haven't been updated in 30+ days.

- Subject: "Update your needs for {projectTitle}"
- Includes project name and link to update needs
- Dev mode: prints to console instead of sending

## Schema Changes

Added to `Project` model:
- `needsReminderSentAt DateTime?` - Tracks last reminder sent

New models:
- `NeedCategory` - Taxonomy categories
- `NeedOption` - Taxonomy options
- `ProjectNeed` - Project-category associations
- `ProjectNeedOption` - Project need-option associations
