# System Overview: Fuut

## Goal
A scalable, mobile-first PWA for FIFA World Cup 2026 predictions.

## Architecture Pattern
-   **Client**: PWA using [React/Angular] with TypeScript and Vanilla CSS (retro-themed).
-   **Server**: [Node.js/Python] REST API.
-   **Database**: [PostgreSQL/MongoDB] for persistence of leagues, users, predictions, and match results.
-   **Real-time (Optional)**: WebSockets or polling for live score updates/leaderboard changes.

## Modules
1.  **League Engine**: Handles creation, membership, and invite logic.
2.  **Prediction Engine**: Manages score submissions and closes predictions at the deadline.
3.  **Scoring Engine**: Logic to calculate points based on results and rules.
4.  **Leaderboard Engine**: Real-time or batch calculation of rankings.
5.  **Match Data Service**: Source of truth for FIFA 2026 schedule and results.

## Key Boundaries
-   **Anonymous vs Registered**: Prediction logic must handle both types of users seamlessly.
-   **Match Deadlines**: Critical business rule enforced at the API level.

## External Integrations
-   **FIFA API (TBD)**: Potential source for real-time match results.
-   **Auth Provider**: Minimal auth for league admins.
