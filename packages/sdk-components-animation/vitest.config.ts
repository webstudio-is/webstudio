import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    workspace: [
      {
        extends: "./vitest.config.ts",
        test: {
          include: ["**/*.browser.{test,spec}.ts"],
          name: "browser",
          browser: {
            provider: "playwright", // or 'webdriverio'
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: "chromium" }, { browser: "firefox" }],
          },
        },
      },
      {
        extends: "./vitest.config.ts",
        test: {
          include: ["!**/*.browser.{test,spec}.ts", "**/*.{test,spec}.ts"],

          name: "unit",
          environment: "node",
        },
      },
    ],
  },
  server: {
    watch: {
      ignored: [],
    },
  },
});
