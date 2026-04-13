# Task: feat-001-setup.md

## Objective
Initialize the React (TypeScript) and Supabase development environment.

## Context
Fuut needs a foundational project setup using the chosen stack (React + TypeScript + Supabase).

## Scope
-   Initialize `package.json` with essential dependencies:
    -   `react`, `react-dom`, `typescript`
    -   `@supabase/supabase-js`
    -   `lucide-react` (for icons)
    -   `vitest` (for testing)
-   Create a basic `vite.config.ts` for development.
-   Set up `tsconfig.json` and basic project configuration.
-   Create a minimal `src/main.tsx` and `src/App.tsx`.

## Out of Scope
-   Any functional features (Leagues, Predictions).
-   Advanced styling or retro-theming.
-   Integration with a live Supabase project (local setup only).

## Allowed Files
-   `package.json`
-   `tsconfig.json`
-   `vite.config.ts`
-   `src/main.tsx`
-   `src/App.tsx`
-   `.gitignore`
-   `README.md`

## Prohibited Files
-   Files outside the project root or `src/`.

## Constraints
-   Use **React 18+** and **Vite**.
-   Strict TypeScript rules.
-   Clean, modular component structure.

## Acceptance Criteria
-   `npm install` completes successfully.
-   `npm run dev` starts a local development server.
-   Vite renders the initial `App` component.
-   Typescript types are valid.

## Validation
-   `npm run lint` (once added).
-   `npm run test` (with a dummy test).
-   Visual check of the Vite dev server output.
