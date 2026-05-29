import { defineConfig, devices } from "@playwright/test";

const PORT = 8080;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun --bun vite",
    // Force the test web server to talk to the remote Supabase URL that
    // tests/helpers/mock-routes.ts intercepts. Without this, vite loads
    // apps/web/.env.local (which devs typically point at localhost), the
    // mocks never match the call URL, and the join flow hits real Supabase.
    // Shell-provided env wins over .env.local per Vite precedence rules.
    env: {
      VITE_SUPABASE_URL: "https://hqixsfarkhrwfaqvnvzi.supabase.co",
      VITE_SUPABASE_ANON_KEY: "sb_publishable_dwriXdrqrgTQFf5qtlLkEQ_B7WRtOjL",
    },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
