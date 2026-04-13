# Coding Rules

This policy defines the technical standards for the Fuut project.

## General
-   **Language**: TypeScript (unless specified otherwise).
-   **Formatting**: Use standard formatting (e.g., Prettier).
-   **Linting**: Use recommended linting rules (e.g., ESLint).
-   **Structure**: Follow the modular layout in `src/`.

## Frontend
-   **Styling**: Prefer **Vanilla CSS** for retro/pixel-art elements.
-   **Components**: Use functional components with hooks.
-   **State**: Leverage Supabase Auth for session management.
-   **Performance**: Minimize re-renders and use standard React optimization techniques.

## Backend (Supabase)
-   **Data Access**: Use the official Supabase client (`@supabase/supabase-js`).
-   **Security**: Implement Row Level Security (RLS) for all tables.
-   **Logic**: Keep business rules in Edge Functions or Database Functions where appropriate.
-   **Schema**: Use clear, consistent naming conventions for tables and columns.

## Testing
-   **Framework**: Jest and React Testing Library for frontend.
-   **Coverage**: Target high coverage for business logic and core features.
-   **Regression**: Every bug fix must include a regression test.
