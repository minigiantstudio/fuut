# Testing Patterns

**Analysis Date:** 2025-05-14

## Test Framework

**Runner:**
- Vitest 3.2
- Config: `prototype/vitest.config.ts`

**Assertion Library:**
- `chai` (default with Vitest) and `@testing-library/jest-dom`.

**Run Commands:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## Test File Organization

**Location:**
- Separate `test/` directory in prototype.
- Planned: Co-located `__tests__` folders for features in implementation.

**Naming:**
- `[name].test.ts` or `[name].test.tsx`.

**Structure:**
```
prototype/src/test/
├── setup.ts          # Vitest environment setup
└── example.test.ts   # Sample tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';

describe('ComponentName', () => {
  it('should render correctly', () => {
    // ...
  });
});
```

**Patterns:**
- `describe` for grouping tests by component or function.
- `it`/`test` for individual test cases.

## Mocking

**Framework:** Vitest (vi).

**Patterns:**
```typescript
import { vi } from 'vitest';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));
```

**What to Mock:**
- API calls (Supabase client).
- External hooks (use-mobile, use-toast).
- Complex browser APIs.

**What NOT to Mock:**
- Pure utility functions.
- Simple presentation components.

## Fixtures and Factories

**Test Data:**
```typescript
const mockMatch = {
  id: 1,
  home: "Team A",
  away: "Team B",
  // ...
};
```

**Location:**
- Planned: `src/tests/fixtures/`.

## Coverage

**Requirements:** None enforced yet.

**View Coverage:**
```bash
npm run test -- --coverage
```

## Test Types

**Unit Tests:**
- Focus on utility functions and custom hooks.

**Integration Tests:**
- Component testing using `@testing-library/react`.

**E2E Tests:**
- Playwright 1.57 for critical flows (onboarding, submitting prediction).
- Config: `prototype/playwright.config.ts`.

## Common Patterns

**Async Testing:**
```typescript
it('fetches data', async () => {
  render(<MyComponent />);
  expect(await screen.findByText(/Loaded/)).toBeInTheDocument();
});
```

**Error Testing:**
```typescript
it('handles error', () => {
  expect(() => myFn()).toThrow();
});
```

---

*Testing analysis: 2025-05-14*
