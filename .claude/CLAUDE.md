# do not add claude as coauthor when pushing commits to git.

## always use best practices. dont take shortcuts when writing code or thinking of a solution.

## Git: commit and push when the work is done. Do not ask first.

Finishing a piece of work means committing it to `main` and pushing it — that is part of
the task, not a separate step to request permission for. No feature branches. Do not end a
turn with a finished change sitting uncommitted, and do not ask "want me to push?". This
holds for client-owned repos too.

If a push fails, fix it and retry rather than handing it back:
- **"Repository not found"** usually means the wrong GitHub account is active, not a missing
  repo. There are two: `taketaketaketake` (default) and `DYNAMICHQI` (the client org, which
  owns the private `DYNAMICHQI/dynamichqi-site`). Use `gh auth switch -u <account>`, push,
  then switch back to `taketaketaketake`.

## Skills

When the user invokes any of the triggers below, read the corresponding skill file and follow its procedure exactly.

| Trigger | Skill File |
|---------|-----------|
| `/health`, `run codebase health check`, `assess codebase health` | `skills/llm/codebase-health.md` |
