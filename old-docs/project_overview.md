You are building a **members-only, curated community directory for builders in Detroit**.

This is a **community artifact**, not a startup SaaS product.

The platform answers three questions:
1. Who is building here
2. What they are working on
3. How to view and contact them (external links only)

This is NOT:
- A social network
- A feed-driven product
- A messaging app
- A networking platform
- A generic job board

This IS:
- A high-signal reference layer
- A curated archive of people and projects
- A local, Detroit-first directory (Detroit forever, not a seed market)

### Core principles
- Members-only browsing
- Manual admin approval for all public profiles
- People and projects are first-class objects
- Jobs are tied to verified people
- External contact only (no DMs)
- Minimal automation, human judgment preferred
- Simple architecture, not over-engineered
- Built to age well

### Product philosophy
Think:
- Editorial
- Archival
- Calm authority
- Dense but readable
- Durable, not trendy

This should feel closer to a **design publication or field manual** than a tech dashboard.

### Aesthetic direction
- Premium, editorial, community artifact
- Dark ink background with light paper-like surfaces
- Hard square editorial portrait crops (no rounded avatars)
- Strong typography hierarchy
- No emojis
- No generic SaaS buttons
- Actions appear as text commands or inline controls

### Technology constraints
- Lightweight monolith
- Node.js + TypeScript
- Fastify backend
- Prisma + PostgreSQL
- Plain React + Vite (or Astro + React islands)
- Session-based auth (magic link email)
- Stripe for employer billing
- Resend for transactional email

Avoid:
- Next.js
- Microservices
- GraphQL
- Over-abstraction
- Premature optimization

You will receive further instructions to plan and implement this system.
Do not generate code yet.
