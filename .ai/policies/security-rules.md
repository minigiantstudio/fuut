# Security Rules

This policy defines the security standards for the Fuut project.

## General
-   **No Secrets**: Do not commit API keys, database credentials, or sensitive environmental variables.
-   **Credential Management**: Use `.env` files (ignored by git) or secure vault systems for local development.
-   **Data Sensitivity**: Minimize collection of PII (Personally Identifiable Information).

## Backend (Supabase)
-   **Row Level Security (RLS)**: **REQUIRED** for all tables. No direct access to sensitive data from the frontend.
-   **Service Role**: Never use the `service_role` key on the client side.
-   **Auth**: Use Supabase Auth for all authenticated actions.
-   **Inputs**: Validate and sanitize all user-provided data.

## Frontend
-   **XSS Protection**: Sanitize any user-generated content before rendering.
-   **CSRF Protection**: Leverage built-in protection from frameworks.
-   **Session Security**: Use secure, HTTP-only cookies where applicable.
-   **API Access**: Never expose internal implementation details in API calls.

## Communication
-   **Encryption**: Use HTTPS for all data transmission.
-   **Reporting**: Report any potential security issues directly to the Human Architect.
