# Permissions Policy

This policy defines what actions agents and humans are allowed to perform in the Fuut repository.

## Agent Permissions

| Resource | Action | Constraint |
| :--- | :--- | :--- |
| **docs/** | Write | Only for task-related documentation updates. |
| **src/** | Write | Only within the allowed task scope. |
| **infra/** | Read | No modification unless explicitly requested for CI/CD tasks. |
| **.ai/tasks/** | Write | For creating or updating tasks (Supervisor only). |
| **.ai/prompts/** | Read | No modification by agents. |
| **.ai/policies/** | Read | No modification by agents. |

## Human Permissions

| Resource | Action | Constraint |
| :--- | :--- | :--- |
| **docs/** | Write | Full access for architectural changes and policy updates. |
| **src/** | Write | Full access for manual implementation and review corrections. |
| **infra/** | Write | Full access for infrastructure and deployment changes. |
| **.ai/** | Write | Full access for managing agent prompts, policies, and tasks. |

## Sensitive Data
-   **NEVER** commit secrets, API keys, or personal identifiable information (PII).
-   **NEVER** modify `.env` files or system configuration folders via agents.
