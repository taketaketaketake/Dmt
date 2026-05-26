# Markdown Glossary

This document defines the **purpose, contents, and update cadence** for every markdown file in the repository.

---

## docs/glossary/markdown-glossary.md

**Purpose**
Defines the authoritative contract for all markdown files in the repository.

This file determines:
- What documentation exists
- What each file is responsible for
- When updates are mandatory

**What Goes Inside**
- File- and folder-level documentation contracts
- Update triggers
- Enforcement rules
- Routing logic for documentation changes

**What Does NOT Go Inside**
- System architecture
- Design rationale
- Phase summaries
- ADR content

**Audience**
LLMs first. Humans second.

**Update Cadence**
Rare and deliberate.

**Update Triggers**
- New markdown files are added anywhere in the repo
- New documentation categories are introduced
- Enforcement gaps or ambiguity are discovered
- Repository structure changes in a way that affects documentation responsibility

---

## README.md

**Purpose**
High-level human and LLM entry point to the repository.

**What Goes Inside**
- What this repo is
- What problem it solves
- How to get started (very high level)
- Pointers to deeper docs (vision.md, architecture.md)

**What Does NOT Go Inside**
- Detailed architecture
- Design rationale
- Prompt text

**Audience**
Humans first, LLMs second.

**Update Cadence**
Infrequent. Updated when the repo's purpose materially changes.

**Update Triggers**
- A phase is marked complete in `implementation-plan.md`
- The repo's stated purpose changes
- New top-level directories are added
- Getting started instructions become invalid

---

## CLAUDE.md

**Purpose**
Persistent, high-signal context for Claude (and Claude-like LLMs).

**What Goes Inside**
- How Claude should reason about this repo
- Assumptions Claude should make
- Assumptions Claude should NOT make
- High-level system constraints
- Pointers to authoritative files

**What Does NOT Go Inside**
- Prompts
- Code
- Temporary instructions

**Audience**
LLMs only.

**Update Cadence**
Rare, deliberate updates. This is a "constitution," not a scratchpad.

**Update Triggers**
- A new system invariant is introduced
- Architectural boundaries are redefined
- A new authoritative file is added to the repo

---

## implementation-plan.md

**Purpose**
Step-by-step execution plan for building the system.

**What Goes Inside**
- Phased infrastructure setup
- Dependencies between phases
- Explicit "stop points" for review
- What success looks like per phase

**What Does NOT Go Inside**
- Design debates
- Architecture diagrams
- Prompts

**Audience**
Humans and LLMs executing work.

**Update Cadence**
Updated as phases are completed or re-planned.

**Update Triggers**
- A phase is completed (mark as done, update status)
- A phase's scope is revised
- A new phase is added
- Phase dependencies change

---

## docs/ (Authoritative Documentation)

### docs/vision.md

**Purpose**
Defines why the system exists and what it is ultimately trying to achieve.

**What Goes Inside**
- System intent
- Non-goals
- Core principles
- Design bias

**What Does NOT Go Inside**
- Implementation details
- File structure
- Prompts

**Audience**
Humans and LLMs equally.

**Update Cadence**
Very rare. Vision should be stable.

**Update Triggers**
- System intent is redefined by explicit decision
- Core principles are added or removed

### docs/architecture.md

**Purpose**
Explains how the system is structured at a conceptual level.

**What Goes Inside**
- Layered architecture
- Data flow
- Responsibility boundaries
- High-level diagrams (textual)

**What Does NOT Go Inside**
- Code
- Prompts
- Implementation minutiae

**Audience**
Humans and LLMs.

**Update Cadence**
Occasional, when architecture changes.

**Update Triggers**
- New infrastructure layer is added
- Responsibility boundaries change
- Data flow paths are modified
- New services or components are introduced

### docs/invariants.md

**Purpose**
Defines truths that must remain true for the system to be correct.

**What Goes Inside**
- Hard constraints
- Non-negotiable rules
- Safety guarantees

**What Does NOT Go Inside**
- Aspirational goals
- Temporary decisions

**Audience**
LLMs first, humans second.

**Update Cadence**
Extremely rare. Changes imply deep refactors.

**Update Triggers**
- A system invariant is violated by design
- New non-negotiable constraints are identified
- Safety guarantees are added or modified

### docs/models.md

**Purpose**
Canonical definitions of conceptual and data models.

**What Goes Inside**
- Mental models (Agent, Role, Directive,)
- Data model descriptions
- Relationships between concepts

**What Does NOT Go Inside**
- SQL schemas
- Code

**Audience**
LLMs and developers.

**Update Cadence**
Moderate, as models evolve.

**Update Triggers**
- Database schema changes
- New conceptual entities are introduced
- Relationships between models change
- Mental model definitions are refined

### docs/health-log.md

**Purpose**
Longitudinal record of codebase health assessments.

**What Goes Inside**
- Dated assessment entries with git SHA
- Dimensional ratings (architecture, code quality, etc.)
- Risks and recommended actions
- Executive summaries

**What Does NOT Go Inside**
- Detailed code analysis
- Implementation plans
- Phase completion records

**Audience**
Humans and LLMs reviewing project trajectory.

**Update Cadence**
Append-only. New entry per assessment.

**Update Triggers**
- User invokes `/health` or `codebase health check`
- Major milestone completed (optional)
- Before significant architectural changes (optional)

---

### docs/glossary.md

**Purpose**
Canonical definitions for terms and files.

**What Goes Inside**
- Term definitions
- File-level contracts (this document)

**Audience**
LLMs first.

**Update Cadence**
Append-only where possible.

**Update Triggers**
- New terms are introduced to the system
- Existing term definitions are clarified or corrected

---

## docs/decisions/ (Architecture Decision Records — ADRs)

**Note on ADR Coverage**

All files under `docs/decisions/` follow the same contract:
- Immutable after acceptance
- Never edited retroactively
- Superseded only by new ADRs

This glossary does not list individual ADR files exhaustively.
The presence of additional ADRs (e.g., ADR-003, ADR-004, ADR-005) is expected and does not require glossary updates beyond this section.

### adr-template.md

**Purpose**
Schema that Claude must instantiate when generating ADRs at phase completion.

This is NOT an ADR itself. It defines the required structure for all ADRs.

**What Goes Inside**
- Section headings with placeholder guidance
- Required fields (Status, Date, Phase, Context, Decisions, etc.)
- Formatting examples
- Constraints on what each section must contain

**What Does NOT Go Inside**
- Actual decisions
- Phase-specific content
- Implementation details

**Audience**
LLMs (mandatory enforcement during phase completion).

**Update Cadence**
Extremely rare.

**Update Triggers**
- ADR structure requirements change
- New mandatory sections are identified
- Phase completion protocol changes

---

### assumptions.md

**Purpose**
Explicit assumptions the system is built on.

**What Goes Inside**
- Environmental assumptions
- Organizational assumptions
- Technical assumptions

**Audience**
LLMs.

**Update Cadence**
Only when assumptions change.

**Update Triggers**
- Environmental assumptions are invalidated
- New technical constraints are discovered
- Organizational context changes

### boundaries.md

**Purpose**
Defines what the system will never do.

**What Goes Inside**
- Out-of-scope behaviors
- Forbidden actions

**Audience**
LLMs.

**Update Cadence**
Rare.

**Update Triggers**
- New out-of-scope behaviors are identified
- Forbidden actions are added based on incidents or reviews

---

## skills/ (LLM-Enforced Procedures)

**Purpose**
Defines deterministic, procedural behaviors that an LLM must follow.

Skills are not prompts, suggestions, or examples.
They are **enforcement mechanisms** expressed as markdown.

**What Goes Inside**
- Step-by-step procedures
- Preconditions and postconditions
- Required inputs and outputs
- Deterministic pass/fail criteria
- Explicit refusal conditions

**What Does NOT Go Inside**
- Reasoning or analysis
- Flexible guidance
- Business logic
- Code

**Audience**
LLMs only.

**Update Cadence**
Rare. Skills define system behavior and must be stable.

**Update Triggers**
- A new enforced procedure is introduced
- An existing enforcement mechanism changes
- A skill is promoted from advisory to mandatory

### skills/llm/codebase-health.md

**Purpose**
Defines the procedure for performing structured codebase health assessments.

**What Goes Inside**
- Assessment dimensions and criteria
- Output format specification
- Procedure steps
- Constraints on reporting

**What Does NOT Go Inside**
- Actual assessment results (those go in `docs/health-log.md`)
- Phase-specific logic
- Business metrics

**Audience**
Claude (optional invocation).

**Update Cadence**
Rare.

**Update Triggers**
- Assessment dimensions change
- Output format changes
- New health metrics are introduced

---

## Documentation Update Protocol (Authoritative)

This section defines the procedure an LLM must follow after completing an implementation phase.

**Step 1: Identify Completed Work**
- Determine what infrastructure, schemas, or components were added or modified.
- Note any new files, directories, or capabilities introduced.

**Step 2: Consult This Glossary**
- For each markdown file entry in this glossary, check its **Update Triggers**.
- If any trigger matches the completed work, that file requires an update.
- If no triggers match, that file must NOT be edited.

**Step 3: Update Matched Files**
- Edit only the files whose triggers matched.
- Ensure edits reflect the new system reality, not speculation.
- Do not add content that anticipates future phases.

**Step 4: Update Phase-Tracking Files**
- `README.md`: Update if the repo's capabilities or getting-started instructions changed.
- `implementation-plan.md`: Mark the completed phase as done. Update status and any revised scope.

**Step 5: Do Not Edit Unmatched Files**
- Files without matching triggers must remain unchanged.
- Do not "clean up" or "improve" documentation outside of matched triggers.

**Routing Summary**

| Change Type                        | Files to Update                              |
|------------------------------------|----------------------------------------------|
| Phase completed                    | `implementation-plan.md`, `README.md`        |
| Database schema changed            | `docs/models.md`                             |
| New infrastructure layer added     | `docs/architecture.md`                       |
| New invariant introduced           | `docs/invariants.md`                         |
| New term introduced                | `docs/glossary/glossary.md`                  |
| New markdown file added            | `docs/glossary/markdown-glossary.md`         |
| Architectural decision made        | New ADR in `docs/decisions/`                 |
| Role responsibilities changed      | `ai/runtime/roles/*.md`                      |
| Directive schema changed           | `ai/runtime/contracts/directive.md`          |
| Operational / personal reference added | `docs/glossary/markdown-glossary.md`     |
| New stub/NoOp created              | `docs/stubs.md`                              |
| Stub replaced with real impl       | `docs/stubs.md`                              |
| Interface/Protocol changed         | `docs/contracts.md`                          |

---

## Final Note (Important)

This file is not documentation. It is a **contract**.

Every markdown file in this repository has a defined purpose.
If a file drifts from its purpose, it must be corrected or split.