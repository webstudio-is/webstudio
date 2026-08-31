export const browserTestPorts = {
  builderSettings: 63401,
  builderFeatures: 63402,
  builderShared: 63403,
  builderSharedHeavy: 63404,
  builderSharedGeneral: 63405,
  builderCanvasDashboard: 63406,
  designSystem: 63407,
  queryBuilderReact: 63408,
  sdkComponentsAnimation: 63409,
  sdkComponentsReact: 63410,
  sdkComponentsReactRadix: 63411,
  sdkComponentsReactRouter: 63412,
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
