# Coding Conventions

**Analysis Date:** 2025-05-14

## Naming Patterns

**Files:**
- PascalCase for React components: `prototype/src/components/AppLayout.tsx`.
- camelCase for hooks and utilities: `prototype/src/hooks/use-mobile.tsx`, `prototype/src/lib/utils.ts`.

**Functions:**
- camelCase for helper functions and functional components.
- `handle[Action]` for event handlers: `handleOnboardingComplete` in `prototype/src/pages/Index.tsx`.

**Variables:**
- camelCase for local variables and state.
- UPPER_SNAKE_CASE for constants: `SESSION_KEY` in `prototype/src/pages/Index.tsx`.

**Types:**
- PascalCase for Interfaces and Types: `interface Session` in `prototype/src/pages/Index.tsx`.

## Code Style

**Formatting:**
- Prettier (inferred from `eslint.config.js`).
- 2-space indentation.

**Linting:**
- ESLint with React and TypeScript plugins.
- Config file: `prototype/eslint.config.js`.

## Import Organization

**Order:**
1. React and third-party libraries.
2. Local components (`@/components/...`).
3. Local hooks/utilities.
4. CSS/Styles.

**Path Aliases:**
- `@/*` maps to `prototype/src/*` (as seen in imports).

## Error Handling

**Patterns:**
- Try-catch for synchronous logic (e.g., `localStorage` access).
- Error boundaries (Planned for production).
- Toast notifications for user-facing errors (using `sonner`).

## Logging

**Framework:** `console` for prototype.

**Patterns:**
- Log info on critical state transitions (e.g., onboarding completion).

## Comments

**When to Comment:**
- Explain complex logic or hacks.
- Document business rules not obvious from code.

**JSDoc/TSDoc:**
- Not widely used in prototype, but recommended for implemented services.

## Function Design

**Size:** Aim for small, single-responsibility components (e.g., `BottomNav.tsx`, `TopBar.tsx`).

**Parameters:** Prefer destructuring props in components.

**Return Values:** Return JSX for components; typed values/promises for hooks and services.

## Module Design

**Exports:** Default exports for components; named exports for utilities/types.

**Barrel Files:** Not used in prototype; consideration for `src/` implementation.

---

*Convention analysis: 2025-05-14*
