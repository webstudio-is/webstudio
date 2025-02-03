import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    workspace: [
      {
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
      // For unknown reason lines below hangs the test
      //      {
      //        test: {
      //          include: ["**/*.{test,spec}.ts"],
      //          exclude: ["**/*.browser.{test,spec}.ts"],
      //          name: "unit",
      //          environment: "node",
      //        },
      //      },
    ],
  },
  server: {
    watch: {
      ignored: [],
    },
  },
});
