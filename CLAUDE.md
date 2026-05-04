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

## When checks pass — prompt to open a PR

Once a plan is implemented and **all the checks below are green**, the agent
must surface a one-line offer to open the PR. Do not silently move on to the
next plan, and do not open the PR autonomously without confirming first
(the dev may want to amend, squash, or run additional manual UAT).

The "checks" gate, in order:
1. Tests pass — `bunx playwright test` and any plan-specific test commands.
2. Type-check passes — `bunx tsc --noEmit` in every workspace touched.
3. Lint passes — `bun run lint` in every workspace touched.
4. Manual UAT items in the plan are either verified or explicitly deferred.
5. The plan's `SUMMARY.md` exists and accurately reflects what shipped.

When all five are green, prompt with something like:

> ✅ Plan `XX-YY` checks all pass. Want me to push `phase-XX-YY` and open the PR?

If the dev confirms, draft the PR with:

- **Title:** `feat(<phase-plan>): <one-line outcome>` — e.g.
  `feat(02-league-prediction-01): create-league flow with shareable invite code`.
  Mirror the lead commit's Conventional Commit scope.
- **Body** (sections, in this order):
  - **Summary** — 3–6 bullets of what changed and why. Pull from
    `<XX>-<YY>-SUMMARY.md::Key Files Created/Modified` and the goal.
  - **Test plan** — bulleted checklist of what was run (paste the green test
    output one-liner) plus any manual UAT steps. Mark each `[x]` if verified.
  - **Bugs found and fixed** (if any) — short list with file paths, mirroring
    the SUMMARY's "Bugs Found and Fixed" section.
  - **Follow-ups** — surface anything the SUMMARY tracked as deferred so the
    reviewer knows what's *not* in this PR.
  - Close with the standard `🤖 Generated with [Claude Code]…` footer.

Use `gh pr create` if available; otherwise push the branch and surface the
`https://github.com/<owner>/<repo>/compare/main...phase-XX-YY` URL with the
title and body ready to paste.

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
