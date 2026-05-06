import { test, expect } from "./helpers/mock-routes";

test.describe("League creation flow (LEAGUE-01)", () => {
  test.fixme("step 1 shows 'Create a league' button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Create a league/i })).toBeVisible();
  });

  test.fixme("create flow: name → nickname → email → confirmation screen", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Create a league/i }).click();
    await page.getByPlaceholder(/league name/i).fill("My League");
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByPlaceholder(/nickname/i).fill("Tester");
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByPlaceholder(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: /create/i }).click();
    await expect(page.getByText(/XKQZ/)).toBeVisible({ timeout: 10_000 });
  });

  test.fixme("confirmation screen shows invite code prominently with share button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Create a league/i }).click();
    await page.getByPlaceholder(/league name/i).fill("My League");
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByPlaceholder(/nickname/i).fill("Tester");
    await page.getByRole("button", { name: /next/i }).click();
    await page.getByPlaceholder(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: /create/i }).click();
    await expect(page.getByText("XKQZ")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /share/i })).toBeVisible();
  });
});
