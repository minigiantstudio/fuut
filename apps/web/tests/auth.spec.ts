import { test, expect } from "@playwright/test";

test.describe("Onboarding & auth", () => {
  test("landing page shows invite-code entry", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Fuut 2026")).toBeVisible();
    await expect(page.getByPlaceholder("CODE")).toBeVisible();
    await expect(page.getByRole("button", { name: /Join league/i })).toBeVisible();
  });

  test("invalid invite code surfaces an error", async ({ page }) => {
    await page.goto("/");
    const codeInput = page.getByPlaceholder("CODE");
    await codeInput.fill("ZZZZ");
    await page.getByRole("button", { name: /Join league/i }).click();
    await expect(page.getByText("Invalid code. Ask your admin.")).toBeVisible({ timeout: 10_000 });
  });

  test('"I played before" reveals the recovery flow', async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /I played before/i }).click();
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByPlaceholder("your@email.com")).toBeVisible();
  });

  test("no spurious session on first visit: landing survives reload unchanged", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder("CODE")).toBeVisible();
    await page.reload();
    await expect(page.getByPlaceholder("CODE")).toBeVisible();
    const supabaseKeys = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((k) => k.includes("supabase"))
    );
    expect(supabaseKeys).toEqual([]);
  });
});
