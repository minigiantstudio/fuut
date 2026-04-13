# Definition of Done (DoD)

A task is considered **done** when it meets all of the following criteria:

## 1. Implementation
-   Code matches the approved task scope and objective.
-   Follows the architectural boundaries and domain model.
-   Minimal and focused changes (no unrelated refactoring).

## 2. Quality & Standards
-   Conforms to `docs/engineering/coding-standards.md` (to be defined).
-   Typescript types are accurate and no `any` is used (unless explicitly approved).
-   Linting passes.
-   No secrets or sensitive data committed.

## 3. Testing
-   Unit tests cover the new/changed logic.
-   Relevant existing tests pass (no regressions).
-   Critical edge cases and error states are tested.

## 4. Documentation
-   New features are documented in relevant product/architecture files.
-   Code comments explain "why" (not "what").
-   PR description clearly summarizes changes and validation performed.

## 5. Review
-   Human architect or lead engineer review passed (for architecture or security-sensitive work).
-   All review comments addressed.

## 6. Verification
-   Functional verification performed by the engineer.
-   Visual verification matches the `lovable-handoff.md` intent (if UI-related).
