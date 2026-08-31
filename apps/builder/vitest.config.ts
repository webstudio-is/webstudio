import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { browserTestPorts } from "../../scripts/vitest-browser-workspace";

const nodeTestGlob = "**/*.{server,node}.{test,spec}.{ts,tsx}";

const browserProject = (
  group: "core" | "app",
  name: string,
  port: number,
  include: string[],
  exclude: string[] = []
) => ({
  extends: "./vitest.config.ts",
  test: {
    name: `${group}-browser-${name}`,
    include,
    exclude: [nodeTestGlob, ...exclude],
    browser: {
      provider: "playwright" as const,
      enabled: true,
      headless: true,
      screenshotFailures: false,
      api: { port },
      instances: [{ browser: "chromium" as const }],
    },
  },
});

const serverProject = {
  extends: "./vitest.config.ts",
  test: {
    name: "core-server",
    include: [nodeTestGlob],
    environment: "node",
  },
};

const projects = [
  serverProject,
  browserProject("core", "builder-settings", browserTestPorts.builderSettings, [
    "app/builder/features/{settings-panel,style-panel}/**/*.{test,spec}.{ts,tsx}",
  ]),
  browserProject(
    "core",
    "builder-features",
    browserTestPorts.builderFeatures,
    ["app/builder/features/**/*.{test,spec}.{ts,tsx}"],
    [
      "app/builder/features/{settings-panel,style-panel}/**/*.{test,spec}.{ts,tsx}",
    ]
  ),
  browserProject("app", "builder-shared", browserTestPorts.builderShared, [
    "app/builder/shared/**/*.{test,spec}.{ts,tsx}",
    "app/builder/*.{test,spec}.{ts,tsx}",
  ]),
  browserProject("app", "shared-heavy", browserTestPorts.builderSharedHeavy, [
    "app/shared/{copy-paste,instance-utils,sync}/**/*.{test,spec}.{ts,tsx}",
  ]),
  browserProject(
    "app",
    "shared",
    browserTestPorts.builderSharedGeneral,
    ["app/shared/**/*.{test,spec}.{ts,tsx}"],
    ["app/shared/{copy-paste,instance-utils,sync}/**/*.{test,spec}.{ts,tsx}"]
  ),
  browserProject(
    "app",
    "canvas-dashboard",
    browserTestPorts.builderCanvasDashboard,
    ["app/{canvas,dashboard}/**/*.{test,spec}.{ts,tsx}"]
  ),
];

export default defineConfig({
  optimizeDeps: {
    entries: ["app/**/*.{test,spec}.{ts,tsx}"],
    include: [
      "react/jsx-dev-runtime",
      "react-router-dom",
      "css.escape",
      "@lexical/react/LexicalComposer",
      "@lexical/react/LexicalContentEditable",
      "@lexical/react/LexicalErrorBoundary",
      "@lexical/react/LexicalHistoryPlugin",
      "@lexical/react/LexicalLinkPlugin",
      "@lexical/react/LexicalRichTextPlugin",
    ],
  },
  resolve: {
    alias: [
      {
        find: "~",
        replacement: resolve("app"),
      },
    ],
    conditions: ["webstudio", "browser", "development|production"],
  },
  ssr: {
    resolve: {
      conditions: ["webstudio", "node", "development|production"],
    },
  },
  test: {
    silent: "passed-only",
    workspace: projects,
  },
});
