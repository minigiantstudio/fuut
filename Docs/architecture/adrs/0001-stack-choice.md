# ADR 0001: Stack Choice

## Status
Proposed

## Context
Fuut needs to be a fast, scalable, and mobile-first PWA for the 2026 FIFA World Cup. The development team wants to minimize infrastructure management and maximize delivery speed.

## Decision
-   **Frontend**: React (TypeScript) for the client-side PWA.
-   **Backend**: **Supabase** (PostgreSQL, Auth, Functions, Storage) for the initial version.
-   **Styling**: Vanilla CSS (to achieve the retro/pixel-art aesthetic).

## Rationale
-   **Supabase** provides a complete backend-as-a-service (BaaS) that significantly reduces development time for features like authentication, database management, and row-level security.
-   **React** is a mature, widely used frontend library with a strong ecosystem of PWA tools and libraries.
-   **Vanilla CSS** offers the most granular control over styling, which is essential for the custom retro/pixel-art design.

## Consequences
-   **Vendor Lock-in**: We will be dependent on Supabase for the initial version. However, since Supabase is built on open-source PostgreSQL, migration to another PostgreSQL-based platform is possible.
-   **Learning Curve**: The team will need to become proficient with Supabase-specific features like Row Level Security (RLS) and Edge Functions.
-   **Speed**: Initial development and deployment will be significantly faster than building a custom backend from scratch.
