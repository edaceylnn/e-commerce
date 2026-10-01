import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

// The suite runs against its own dev server and database — it places real
// orders (the built-in payment simulator completes them), and those don't
// belong among the data you develop with. e2e/prepare-db.ts rebuilds the
// "<your database>_e2e" database before every run; invoices use the TST
// series; the build goes to .next-e2e so it doesn't clash with `npm run dev`.
const PORT = 3100;
const devDb = new URL(process.env.DATABASE_URL ?? "postgresql://localhost:5432/e_commerce");
const e2eDb = new URL(devDb);
e2eDb.pathname = `${devDb.pathname}_e2e`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx tsx e2e/prepare-db.ts && npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: e2eDb.toString(),
      INVOICE_SERIES: "TST",
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
