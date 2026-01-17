We are proceeding to implementation.

You must base your work on the previously provided architecture plan,
with the following **explicit corrections**:

### Corrections to apply
1. There is NO public browsing.
   - Login / entry page is allowed.
   - All meaningful content requires approved membership.

2. Profiles require admin approval.
   - Projects do NOT require admin approval in v1.
   - Projects inherit trust from approved profiles.

3. Roles are NOT exclusive.
   - Users can have multiple roles.
   - Employer capability is granted via Stripe entitlement.
   - Admin is an orthogonal role.

4. Favoriting people and following projects ARE allowed.
   - These are private signals.
   - They do not form a public social graph.

5. Basic search IS allowed.
   - Postgres full-text search only.
   - No external search service.
   - No ranking optimization.

---

## Your task

Produce a **concrete, step-by-step implementation plan** suitable for a solo developer.

### Required sections

1. Repository structure
   - Backend (Fastify)
   - Frontend (React + Vite)
   - Shared utilities

2. Database schema (conceptual, but specific)
   - Tables
   - Enums
   - Relationships
   - Indexes
   - Many-to-many join tables where required

3. API design
   - Auth
   - Profiles
   - Projects
   - Jobs
   - Categories
   - Admin
   - Billing (Stripe)

4. Frontend build order
   - Which pages to build first
   - Which pages depend on others
   - What can be stubbed

5. Authentication & authorization
   - Session model
   - Approval gates
   - Role + entitlement checks

6. Integrations
   - Resend: when emails are sent and why
   - Stripe: checkout, webhooks, entitlement sync

7. Testing strategy
   - Unit testing (target 85% coverage)
   - What must be tested first
   - What can wait

8. Definition of “done” for v1
   - Clear, objective criteria
   - No aspirational language

### Constraints
- Keep the system boring and readable
- No over-abstraction
- No premature optimization
- No feature invention beyond the plan
- Ask before making assumptions

Do NOT write code yet.
Return only the implementation plan.
