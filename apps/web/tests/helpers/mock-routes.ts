import type { Page } from "@playwright/test";
import { test as base, expect } from "@playwright/test";

const SUPABASE_URL = "https://hqixsfarkhrwfaqvnvzi.supabase.co";

export const MOCK_INVITE_CODE = "TEST1";
export const MOCK_LEAGUE = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  name: "Test League",
};

async function setupSupabaseMocks(page: Page) {
  // Generic REST fallback — return empty array for any unhandled REST call
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Auth endpoints — simulate no active session
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/token")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: null, session: null }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: null, session: null }),
      });
    }
  });

  // Specific: invite-code RPC (registered last = highest priority in Playwright)
  await page.route(
    `${SUPABASE_URL}/rest/v1/rpc/lookup_league_by_invite_code`,
    async (route) => {
      const body = route.request().postDataJSON() as { p_code: string } | null;
      const isValid = body?.p_code === MOCK_INVITE_CODE;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(isValid ? [MOCK_LEAGUE] : []),
      });
    }
  );
}

export const test = base.extend<{ mockSupabase: void }>({
  mockSupabase: [
    async ({ page }, use) => {
      await setupSupabaseMocks(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
