# Claude / agent rules for the Fuut repo

## Branch naming

All implementation branches follow `phase-XX-YY`, where:
- `XX` = the two-digit phase number from `.planning/ROADMAP.md`
- `YY` = the two-digit plan number from `.planning/phases/<phase>/<XX>-<YY>-PLAN.md`

Examples: `phase-01-04`, `phase-02-01`, `phase-02-02`.

This mirrors the commit-message scope convention already in use
(`feat(01-foundation-04): ...`, `fix(api): ...`, etc.).

## Before creating a phase branch — check for an existing one

When starting work on a plan, do **not** immediately create a new branch.
First check whether a branch already exists for that plan, locally or on the remote:

```bash
git fetch --prune
git branch -a --list "phase-XX-YY*" "origin/phase-XX-YY*"
```

Then:

- **A branch already exists (local or remote):** check it out and continue from
  there. Do not create a parallel `phase-XX-YY-2` or rename. Multiple devs / agents
  collaborate on the *same* phase branch — rebase/merge as needed, but do not fork.
  ```bash
  # if it's only on origin
  git checkout -b phase-XX-YY origin/phase-XX-YY
  # if it's local
  git checkout phase-XX-YY
  ```
- **No branch exists yet:** create it from the latest `main`.
  ```bash
  git checkout main && git pull
  git checkout -b phase-XX-YY
  ```

The same rule applies to *planning* work: if `.planning/phases/<phase>/` doesn't
yet exist and someone is about to run `/gsd-plan-phase`, check for a phase
planning branch (e.g. `phase-XX-plan`) before opening a new one.

## Closing out a plan — open the PR proactively

Once a plan's verification checks pass, **prompt the dev (or open the PR
directly if running autonomously)** — don't wait to be asked. "Verification
checks pass" means *all* of:

- All tasks in `<XX>-<YY>-PLAN.md` are done
- E2E tests pass (`bunx playwright test` from `apps/web` is green)
- Type-check passes (`bunx tsc --noEmit` in every touched workspace)
- Lint passes (`bun run lint --workspaces --if-present`)
- The build runs clean if relevant (`bun run build --workspaces --if-present`)
- `<XX>-<YY>-SUMMARY.md` is written and reflects what actually shipped
- `.planning/STATE.md` is refreshed with the new progress + decisions + todos

When all of that is true, push the branch and offer to create the PR.
Use the existing commit-message scope as the title prefix.

**PR title:** `feat(<phase>-<plan>): <one-line summary of what shipped>`
(use `fix(...)`, `docs(...)`, `chore(...)` if more apt than `feat`).

**PR body template:**

```markdown
## Summary
- <bullet 1: the most user-visible change>
- <bullet 2: …>
- <bullet 3: notable refactors or fixes that came along for the ride>

## Test plan
- [x] `bunx playwright test` — N/N passing
- [x] `bunx tsc --noEmit` — clean in apps/web and apps/api
- [x] Manual end-to-end: <one-line of the human path that was walked>
- [x] <any other check from PLAN.md verification block>

## Follow-ups (tracked in STATE.md, not in this PR)
- <pull from STATE.md todos that are out of scope here>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

The Summary section should pull from the SUMMARY.md "Key Files Created/Modified"
and "Bugs Found and Fixed" sections, condensed. The Test plan section should pull
from the PLAN.md `<verification>` block plus anything actually exercised by hand.
Don't fabricate test results — only check a box if you ran the check.

When you tell the dev "all checks pass, ready to PR?" include a concrete title
and body draft so they can `/y` and ship without retyping anything.

## Commit message convention

Conventional Commits, scoped by phase-plan:

- `feat(01-foundation-04): …` — new feature in plan 01-04
- `fix(api): …` — fix that isn't tied to a single plan
- `docs(01-foundation): …` — docs for the phase
- `chore: …` — repo-level chores

## Package manager

This repo uses **bun** for installs and dev scripts. The committed lockfile is
`bun.lock` at the root. `npm install` will work but will fight the bun lockfile;
prefer `bun install` and `bun run <script>`.

For Vite specifically, prefer `bun --bun vite` over `bun run dev` to ensure
the runtime is bun (avoids a Node x64 / bun arm64 native-binary mismatch on
some macOS machines).

## Where the source of truth lives

- **What to build, in what order:** `.planning/ROADMAP.md`
- **Current snapshot of progress, decisions, todos:** `.planning/STATE.md`
- **Per-plan executable spec:** `.planning/phases/<phase>/<XX>-<YY>-PLAN.md`
- **Per-plan completion record:** `.planning/phases/<phase>/<XX>-<YY>-SUMMARY.md`

A plan is only "done" when its `SUMMARY.md` exists and the corresponding code,
tests, and docs are in `main`.
