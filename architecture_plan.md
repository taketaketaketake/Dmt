Using the project context provided, produce a **clear, minimal plan** for building this platform.

Your task:
- Outline the system at a high level
- Define domain boundaries
- Define data models conceptually (no code yet)
- Define frontend page structure
- Define backend responsibilities
- Identify what is explicitly out of scope

### Required sections

1. System overview
   - What runs where
   - What talks to what

2. Core domain objects
   - User
   - Profile
   - Project
   - Job
   - Category
   - Role / permission

3. User states and roles
   - Pending
   - Approved
   - Suspended
   - Member
   - Employer
   - Admin

4. Frontend page map
   - List every page
   - Brief description of each
   - What data each page needs

5. Backend responsibilities
   - Authentication
   - Authorization
   - Approval workflow
   - CRUD boundaries
   - Billing enforcement

6. Explicit non-goals
   - Features that should NOT be built
   - Patterns to avoid

### Constraints
- Keep it simple
- Favor readability over cleverness
- No microservices
- No speculative features
- No client-side state libraries unless strictly necessary

Do NOT write code yet.
Return a structured plan only.
