import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const nodeTestGlob = "**/*.{server,node}.{test,spec}.{ts,tsx}";

const browserProject = (
  group: "core" | "app",
  name: string,
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
  browserProject("core", "builder-settings", [
    "app/builder/features/{settings-panel,style-panel}/**/*.{test,spec}.{ts,tsx}",
  ]),
  browserProject(
    "core",
    "builder-features",
    ["app/builder/features/**/*.{test,spec}.{ts,tsx}"],
    [
      "app/builder/features/{settings-panel,style-panel}/**/*.{test,spec}.{ts,tsx}",
    ]
  ),
  browserProject("app", "builder-shared", [
    "app/builder/shared/**/*.{test,spec}.{ts,tsx}",
    "app/builder/*.{test,spec}.{ts,tsx}",
  ]),
  browserProject("app", "shared-heavy", [
    "app/shared/{copy-paste,instance-utils,sync}/**/*.{test,spec}.{ts,tsx}",
  ]),
  browserProject(
    "app",
    "shared",
    ["app/shared/**/*.{test,spec}.{ts,tsx}"],
    ["app/shared/{copy-paste,instance-utils,sync}/**/*.{test,spec}.{ts,tsx}"]
  ),
  browserProject("app", "canvas-dashboard", [
    "app/{canvas,dashboard}/**/*.{test,spec}.{ts,tsx}",
  ]),
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
