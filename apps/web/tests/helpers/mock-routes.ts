import type { Page } from "@playwright/test";
import { test as base, expect } from "@playwright/test";

const SUPABASE_URL = "https://hqixsfarkhrwfaqvnvzi.supabase.co";

export const MOCK_INVITE_CODE = "TEST1";
export const MOCK_LEAGUE = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  name: "Test League",
};

export const MOCK_LEAGUE_2 = {
  id: "bbbb-0000-0000-0000-000000000002",
  name: "Second League",
  invite_code: "XKQZ",
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

  // Mock: create_league RPC
  await page.route(
    `${SUPABASE_URL}/rest/v1/rpc/create_league`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: MOCK_LEAGUE_2.id, invite_code: MOCK_LEAGUE_2.invite_code }]),
      });
    }
  );

  // Mock: regenerate_invite_code RPC
  await page.route(
    `${SUPABASE_URL}/rest/v1/rpc/regenerate_invite_code`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ invite_code: "ABCD" }]),
      });
    }
  );

  // Mock: leagues REST endpoint (for LeagueTab invite code display)
  await page.route(
    `${SUPABASE_URL}/rest/v1/leagues*`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: MOCK_LEAGUE.id, name: MOCK_LEAGUE.name, invite_code: MOCK_INVITE_CODE }]),
      });
    }
  );

  // Mock: league_members array query (multi-league — returns 2 memberships)
  await page.route(
    `${SUPABASE_URL}/rest/v1/league_members*`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "mem-1", league_id: MOCK_LEAGUE.id, user_id: "user-1", role: "admin", joined_at: "2026-01-01T00:00:00Z",
            leagues: { id: MOCK_LEAGUE.id, name: MOCK_LEAGUE.name } },
          { id: "mem-2", league_id: MOCK_LEAGUE_2.id, user_id: "user-1", role: "member", joined_at: "2026-02-01T00:00:00Z",
            leagues: { id: MOCK_LEAGUE_2.id, name: MOCK_LEAGUE_2.name } },
        ]),
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
