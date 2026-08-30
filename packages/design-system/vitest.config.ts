import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: {
    include: ["react/jsx-dev-runtime"],
  },
  resolve: {
    conditions: ["webstudio", "browser", "development|production"],
  },
  ssr: {
    resolve: {
      conditions: ["webstudio", "node", "development|production"],
    },
  },
  test: {
    workspace: [
      {
        extends: "./vitest.config.ts",
        test: {
          name: "browser",
          include: ["**/*.browser.{test,spec}.{ts,tsx}"],
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
          name: "unit",
          include: [
            "!**/*.browser.{test,spec}.{ts,tsx}",
            "**/*.{test,spec}.{ts,tsx}",
          ],
          environment: "node",
        },
      },
    ],
  },
});
