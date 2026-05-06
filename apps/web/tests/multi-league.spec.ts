import { test, expect } from "./helpers/mock-routes";

test.describe("Multi-league support (LEAGUE-02)", () => {
  test.fixme("authenticated user at /join/:code sees add-league prompt, not redirect", async ({ page }) => {
    // Simulate authenticated session via localStorage before navigation
    await page.goto("/");
    await expect(page.getByText(/Add.*league/i)).toBeVisible({ timeout: 10_000 });
  });

  test.fixme("league switcher in TopBar shows all user leagues", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Test League/i })).toBeVisible({ timeout: 10_000 });
  });

  test.fixme("selecting a different league in switcher updates active context", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Test League/i }).click();
    await expect(page.getByText(/Second League/i)).toBeVisible({ timeout: 10_000 });
  });
});

// Smoke tests: PREDICT-01/02/03 must survive the SessionContext multi-league refactor.
// The mock returns a league_members array (2 memberships). These stubs verify that
// PredictTab renders correctly when SessionContext provides a leagues[] array.
test.describe("PredictTab renders after SessionContext multi-league refactor (PREDICT-01/02/03)", () => {
  test.fixme("PredictTab container is visible after session loads with multi-league array", async ({ page }) => {
    // mock-routes.ts returns league_members array with 2 memberships.
    // SessionContext resolves active league from array[0]; PredictTab must still mount.
    await page.goto("/");
    await expect(page.locator('[data-testid="predict-tab"]')).toBeVisible({ timeout: 10_000 });
  });

  test.fixme("match list renders inside PredictTab (PREDICT-01 — view upcoming matches)", async ({ page }) => {
    await page.goto("/");
    // PredictTab must render match rows; session.leagueId must resolve from leagues[0]
    await expect(page.locator('[data-testid="predict-tab"]')).toBeVisible({ timeout: 10_000 });
    // At least one match row should be present (mocked via rest/v1/matches* route)
    await expect(page.locator('[data-testid="match-row"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test.fixme("prediction upsert still works after refactor (PREDICT-02/03)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="predict-tab"]')).toBeVisible({ timeout: 10_000 });
    // Attempt to interact with a prediction input — confirms upsert path is reachable
    const firstInput = page.locator('[data-testid="score-input-home"]').first();
    await expect(firstInput).toBeVisible({ timeout: 10_000 });
  });
});
