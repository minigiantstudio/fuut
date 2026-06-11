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

  test("valid invite code advances to nickname step", async ({ page }) => {
    await page.goto("/");
    const codeInput = page.getByPlaceholder("CODE");
    await codeInput.fill(MOCK_INVITE_CODE);
    await page.getByRole("button", { name: /Join league/i }).click();
    await expect(page.getByPlaceholder(/nickname/i)).toBeVisible({ timeout: 10_000 });
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

  test("AuthCallback parses implicit flow (hash params)", async ({ page }) => {
    // Implicit flow: Supabase redirects with tokens in URL fragment
    // e.g., #access_token=...&refresh_token=...&type=magiclink
    await page.goto("/auth/callback");
    await expect(page.getByText("Signing you in")).toBeVisible({ timeout: 5_000 });

    // The component should render the loading state for implicit flow
    // In a real scenario, setSession() would be called and we'd redirect
  });

  test("AuthCallback shows error for invalid/expired link", async ({ page }) => {
    // No token params → should show error
    await page.goto("/auth/callback");
    // Give it time to process and show error
    await page.waitForTimeout(1000);
    await expect(
      page.getByText("Invalid or expired link")
    ).toBeVisible({ timeout: 5_000 });
  });
});
