export const browserTestPorts = {
  builder: 63401,
  designSystem: 63402,
  queryBuilderReact: 63403,
  sdkComponentsAnimation: 63404,
  sdkComponentsReact: 63405,
  sdkComponentsReactRadix: 63406,
  sdkComponentsReactRouter: 63407,
} as const;

const createBrowserWorkspace = (port: number) => [
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
        api: { port },
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

export const createBrowserTestConfig = (port: number) => ({
  optimizeDeps: {
    entries: ["**/*.browser.{test,spec}.{ts,tsx}"],
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
    workspace: createBrowserWorkspace(port),
  },
});
