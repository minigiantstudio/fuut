# Capability Matrix

This document maps roles and agents to tasks and responsibilities.

## Roles & Agents

| Role | Human Responsibility | Agent Purpose |
| :--- | :--- | :--- |
| **Architect** | High-level system design, ADRs, task breakdown. | Assist with document structure, consistency, and constraints. |
| **Frontend Engineer** | UI implementation, UX intent preservation. | Generate components, CSS, and client-side logic from specs. |
| **Backend Engineer** | Server-side logic, data modeling, API contracts. | Implement services, database interactions, and business rules. |
| **Test Engineer** | Testing strategy, coverage enforcement. | Generate unit/integration tests and verify regressions. |
| **Reviewer** | Quality gate, security audit, architecture check. | Identify policy violations and potential code issues. |

## Task Ownership (Example)

| Task Type | Owner | Validation |
| :--- | :--- | :--- |
| **Architecture / ADR** | Human Architect | Human Review |
| **Component UI** | Frontend Agent | Unit Tests + Visual Check |
| **Business Logic** | Backend Agent | Unit Tests + Contract Tests |
| **Security / Auth** | Human Engineer | Human Review + Security Scan |
| **Infrastructure / CI** | Human Architect | Successful Deployment |
