import { test, expect, MOCK_INVITE_CODE } from "./helpers/mock-routes";

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
    await codeInput.fill("ZZZZ"); // not MOCK_INVITE_CODE → mock returns []
    await page.getByRole("button", { name: /Join league/i }).click();
    await expect(page.getByText("Invalid code. Ask your admin.")).toBeVisible({ timeout: 10_000 });
  });

  test("valid invite code advances to email-verification step", async ({ page }) => {
    await page.goto("/");
    const codeInput = page.getByPlaceholder("CODE");
    await codeInput.fill(MOCK_INVITE_CODE);
    await page.getByRole("button", { name: /Join league/i }).click();
    // After valid code, the join flow now requires identity verification before
    // the nickname step — see Onboarding.tsx step "auth-email" (added when the
    // password-based auth gate landed). The mock returns MOCK_LEAGUE so the
    // leagueName below reflects the mocked league.
    await expect(page.getByPlaceholder("name@example.com")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Identity verification required to join Test League/i),
    ).toBeVisible();
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
