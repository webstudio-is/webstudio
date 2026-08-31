const createBrowserWorkspace = () => [
  {
    extends: "./vitest.config.ts",
    test: {
      name: "browser",
      include: ["**/*.browser.{test,spec}.{ts,tsx}"],
      browser: {
        provider: "playwright" as const,
        enabled: true,
        headless: true,
        screenshotFailures: false,
        instances: [{ browser: "chromium" as const }],
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
      environment: "node" as const,
    },
  },
];

export const createBrowserTestConfig = () => ({
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
    workspace: createBrowserWorkspace(),
  },
});
