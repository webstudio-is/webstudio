import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["webstudio", "browser", "development|production"],
  },
  ssr: {
    resolve: {
      conditions: ["webstudio", "node", "development|production"],
    },
  },
  test: {
    setupFiles: ["./src/test-setup.ts"],
    workspace: [
      {
        extends: "./vitest.config.ts",
        test: {
          include: ["**/*.browser.{test,spec}.ts"],
          name: "browser",
          browser: {
            provider: "playwright",
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: "./vitest.config.ts",
        test: {
          include: [
            "!**/*.browser.{test,spec}.ts",
            "**/*.{test,spec}.{ts,tsx}",
          ],
          name: "unit",
          environment: "jsdom",
        },
      },
    ],
  },
});
