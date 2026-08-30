import { defineConfig } from "@playwright/test";
import {
  browserContextOptions,
  builderUrl,
  getBrowserLaunchOptions,
} from "./e2e/test";

const testTimeout =
  Number.parseInt(process.env.E2E_TEST_TIMEOUT_MS ?? "", 10) || 120_000;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/e2e",
  timeout: testTimeout,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: process.env.CI !== undefined,
  retries: 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    ...browserContextOptions,
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    launchOptions: getBrowserLaunchOptions(),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /setup\.ts/,
    },
    {
      name: "chromium",
      testMatch: /tests\/.*\.e2e\.ts/,
      dependencies: ["setup"],
      use: { browserName: "chromium" },
    },
  ],
  webServer:
    process.env.E2E_BUILDER_URL === undefined
      ? {
          command:
            "pnpm exec tsx --conditions=webstudio ./e2e/serve-built-remix.ts",
          url: builderUrl,
          reuseExistingServer: false,
          ignoreHTTPSErrors: true,
          timeout: 60_000,
          stdout: "pipe",
          stderr: "pipe",
        }
      : undefined,
});
