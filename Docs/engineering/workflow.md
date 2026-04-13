# AI-Assisted Product Delivery Workflow

## Purpose

This document defines the operating workflow for a designer, software architect, and software engineer working with AI assistance. The goal is to move from a functional prototype in Lovable to a production-ready implementation with clear ownership, guardrails, and review gates.

The workflow separates:
- **Design exploration** from **production implementation**
- **Architecture definition** from **feature execution**
- **AI acceleration** from **human accountability**

---

## Core Principles

1. Lovable is used for functional prototyping, not final production code.
2. The architect defines the system structure, project layout, documentation, and agent framework.
3. Engineers implement production code using agent assistance inside a controlled scope.
4. Every task must be small, explicit, and verifiable.
5. Prompts, policies, and task instructions are versioned in the repository.
6. Human review is mandatory for architecture changes, security-sensitive work, and final merge decisions.

---

## Roles and Responsibilities

### Designer
Owns:
- User flow exploration
- UI prototyping in Lovable
- Interaction validation
- Visual and UX intent
- Prototype handoff notes

Outputs:
- Functional prototype
- Screen inventory
- User flows
- UX notes
- Edge cases and states
- Design decisions that must be preserved

Does not own:
- Production architecture
- Repository structure
- Backend contracts
- Deployment decisions

### Software Architect
Owns:
- Initial codebase structure
- Project documentation structure
- Agent definitions and boundaries
- Domain model and system design
- Technical standards
- Architecture decisions and ADRs

Outputs:
- System overview
- Folder structure
- ADRs
- Capability matrix
- Agent specs
- Task decomposition strategy
- Engineering guardrails

Does not own:
- Large feature implementation
- Routine UI production work
- Day-to-day task execution

### Software Engineer
Owns:
- Production implementation
- Tests
- Code review responses
- Debugging
- Refactoring within scope
- Delivery of working increments

Outputs:
- Working code
- Tests
- PRs
- Validation evidence
- Implementation notes

Does not own:
- Architectural decisions outside scope
- Unbounded agent behavior
- Major product direction changes

---

## End-to-End Workflow

### Phase 1: Product Discovery
1. Define the business goal.
2. Identify the target user.
3. Document the success metric.
4. Agree on the minimum viable scope.
5. Confirm constraints, dependencies, and timeline.

### Phase 2: Design in Lovable
1. The designer creates a functional prototype in Lovable.
2. The prototype should validate user flows, layout, states, and interaction intent.
3. The designer documents what must be preserved and what can change.
4. The result is a prototype plus handoff notes, not production code.

### Phase 3: Architecture Translation
1. The architect reviews the prototype and product requirements.
2. The architect defines the domain model, modules, contracts, and boundaries.
3. The architect creates the initial repository structure.
4. The architect documents the agent framework, including roles, permissions, and limits.
5. The architect writes ADRs for important decisions.

### Phase 4: Task Preparation
1. The architect decomposes the work into small tasks.
2. Each task must be agent-ready and independently verifiable.
3. Every task includes:
   - Objective
   - Scope
   - Allowed files
   - Prohibited files
   - Constraints
   - Acceptance criteria
   - Validation steps

### Phase 5: Implementation
1. The engineer picks one task.
2. An agent assists with implementation within the task boundary.
3. The engineer reviews the output, corrects issues, and runs tests.
4. If the task touches architecture, security, or cross-cutting behavior, it requires human approval.
5. The task is only complete when validation passes.

### Phase 6: Review and Release
1. Run linting, unit tests, integration tests, and e2e tests as appropriate.
2. Verify the implementation still matches the Lovable prototype intent.
3. Review documentation updates.
4. Merge only after code review and validation.
5. Deploy with observability and rollback awareness.

---

## Repository Structure

```text
project/
├── README.md
├── CLAUDE.md
├── AGENTS.md
├── .ai/
│   ├── prompts/
│   │   ├── 00_system.md
│   │   ├── 01_architect.md
│   │   ├── 02_frontend.md
│   │   ├── 03_backend.md
│   │   ├── 04_tests.md
│   │   └── 05_review.md
│   ├── tasks/
│   │   ├── epic-001.md
│   │   ├── feat-001-login.md
│   │   └── feat-002-dashboard.md
│   └── policies/
│       ├── permissions.md
│       ├── coding-rules.md
│       └── security-rules.md
├── docs/
│   ├── product/
│   │   ├── vision.md
│   │   ├── requirements.md
│   │   ├── user-flows.md
│   │   └── lovable-handoff.md
│   ├── architecture/
│   │   ├── system-overview.md
│   │   ├── domain-model.md
│   │   ├── capability-matrix.md
│   │   └── adrs/
│   │       ├── 0001-stack-choice.md
│   │       ├── 0002-data-model.md
│   │       └── 0003-agent-pattern.md
│   ├── engineering/
│   │   ├── coding-standards.md
│   │   ├── testing-strategy.md
│   │   ├── release-process.md
│   │   └── definition-of-done.md
│   └── agents/
│       ├── supervisor.md
│       ├── frontend-agent.md
│       ├── backend-agent.md
│       ├── test-agent.md
│       └── review-agent.md
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── services/
│   ├── shared/
│   └── tests/
└── infra/
    ├── ci/
    ├── deploy/
    └── observability/
```

---

## Document Definitions

### `docs/product/vision.md`
High-level product purpose, audience, and expected value.

### `docs/product/requirements.md`
Functional and non-functional requirements, assumptions, and constraints.

### `docs/product/user-flows.md`
Primary user journeys and edge cases.

### `docs/product/lovable-handoff.md`
Prototype link, screen inventory, UX decisions, states, and implementation notes.

### `docs/architecture/system-overview.md`
System goals, major modules, dependencies, and integration points.

### `docs/architecture/domain-model.md`
Core entities, relationships, lifecycle rules, and invariants.

### `docs/architecture/capability-matrix.md`
Mapping of tasks to humans, agents, tools, and validation requirements.

### `docs/architecture/adrs/*.md`
Short architecture decision records for important technical choices.

### `docs/engineering/coding-standards.md`
Code conventions, style rules, formatting, naming, and structure.

### `docs/engineering/testing-strategy.md`
Test types, coverage expectations, and validation sequence.

### `docs/engineering/release-process.md`
Branching, PR, merge, release, and rollback process.

### `docs/engineering/definition-of-done.md`
Checklist required before a task is considered complete.

### `docs/agents/*.md`
Prompt-like operational definitions for each agent role.

---

## Agent Model

### Supervisor Agent
Purpose:
- Break down work
- Assign tasks
- Validate readiness
- Enforce scope and quality gates

### Frontend Agent
Purpose:
- Build UI from approved specs
- Respect design intent
- Avoid architectural changes

### Backend Agent
Purpose:
- Implement server logic
- Respect contracts and invariants
- Avoid UI or architecture drift

### Test Agent
Purpose:
- Generate and maintain tests
- Identify coverage gaps
- Verify regressions and edge cases

### Review Agent
Purpose:
- Check for policy violations
- Enforce architecture rules
- Flag security, performance, and maintainability issues

---

## Task Template

```md
# Task: [task name]

## Objective
Describe the outcome in one sentence.

## Context
Provide the minimum required context.

## Scope
List what is included.

## Out of Scope
List what is explicitly excluded.

## Allowed Files
List the files or directories the agent may modify.

## Prohibited Files
List files that must not be changed.

## Constraints
List architecture, security, UX, or implementation constraints.

## Acceptance Criteria
List objective conditions that define success.

## Validation
List commands, tests, or checks to run.

## Notes
Include links to relevant docs, prototype references, or decisions.
```

---

## Prompt Template for Agents

```md
You are a specialized software agent working inside a controlled repository workflow.

Your job is to complete the assigned task only within the provided scope.

Rules:
- Do not modify files outside the allowed scope.
- Do not invent missing requirements.
- Ask for clarification when a decision blocks implementation.
- Preserve existing conventions unless the task explicitly changes them.
- Add or update tests when behavior changes.
- Keep changes minimal and focused.

Output format:
1. Summary of work done.
2. Files changed.
3. Validation performed.
4. Remaining risks or follow-ups.
```

---

## Handoff Rules

### Designer to Architect
The designer must provide:
- Prototype link
- Screen list
- User flow notes
- Edge cases
- Critical interactions
- UX decisions that must be preserved

### Architect to Engineer
The architect must provide:
- Blueprint
- Task breakdown
- Contracts
- Allowed scope
- Validation steps
- Agent instructions

### Engineer to Review
The engineer must provide:
- Implementation summary
- Diff scope
- Test results
- Open issues
- Any tradeoffs or assumptions

---

## Operating Rules

1. Keep tasks small and vertical.
2. Prefer explicit contracts over implicit understanding.
3. Version all prompts and policies.
4. Treat the prototype as UX reference, not source of truth for production code.
5. Use AI to accelerate execution, not to replace accountability.
6. Require human review for risk-heavy changes.
7. Update documentation as part of the same change when behavior or structure changes.

---

## Definition of Done

A task is done only when:
- Implementation matches the approved scope
- Tests pass
- Relevant docs are updated
- No policy or architecture rules are violated
- Reviewer approval is complete
- The result is ready to merge or deploy

---

## Recommended First Adoption Sequence

1. Create `docs/product/lovable-handoff.md`.
2. Create `docs/architecture/system-overview.md`.
3. Create `docs/architecture/capability-matrix.md`.
4. Create `docs/engineering/definition-of-done.md`.
5. Create `.ai/prompts/` and `.ai/policies/`.
6. Define the first 3–5 agent-ready tasks.
7. Pilot the workflow on one feature.
8. Refine the process after the first delivery cycle.