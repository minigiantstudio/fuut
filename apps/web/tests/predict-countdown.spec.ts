import { test, expect } from "./helpers/mock-routes";

test.describe("Prediction countdown UX (PREDICT-04)", () => {
  test.fixme("shows 'Locks in Xh Ym' label on OPEN match < 24h away", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Locks in/i)).toBeVisible({ timeout: 10_000 });
  });

  test.fixme("no countdown label on SAVED match rows", async ({ page }) => {
    await page.goto("/");
    const savedRow = page.locator("[data-status='saved']");
    await expect(savedRow.getByText(/Locks in/i)).not.toBeVisible();
  });

  test.fixme("no countdown label on LOCKED match rows", async ({ page }) => {
    await page.goto("/");
    const lockedRow = page.locator("[data-status='locked']");
    await expect(lockedRow.getByText(/Locks in/i)).not.toBeVisible();
  });
});
