import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { browserTestPorts } from "../../scripts/vitest-browser-workspace";

const nodeTestGlob = "**/*.{server,node}.{test,spec}.{ts,tsx}";

const browserProject = (
  name: string,
  include: string[],
  exclude: string[] = []
) => ({
  extends: "./vitest.config.ts",
  test: {
    name: `browser-${name}`,
    include,
    exclude: [nodeTestGlob, ...exclude],
    browser: {
      provider: "playwright" as const,
      enabled: true,
      headless: true,
      screenshotFailures: false,
      api: { port: browserTestPorts.builder },
      instances: [{ browser: "chromium" as const }],
    },
  },
});

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
    workspace: [
      browserProject("builder-settings", [
        "app/builder/features/{settings-panel,style-panel}/**/*.{test,spec}.{ts,tsx}",
      ]),
      browserProject(
        "builder-features",
        ["app/builder/features/**/*.{test,spec}.{ts,tsx}"],
        [
          "app/builder/features/{settings-panel,style-panel}/**/*.{test,spec}.{ts,tsx}",
        ]
      ),
      browserProject("builder-shared", [
        "app/builder/shared/**/*.{test,spec}.{ts,tsx}",
        "app/builder/*.{test,spec}.{ts,tsx}",
      ]),
      browserProject("shared-heavy", [
        "app/shared/{copy-paste,instance-utils,sync}/**/*.{test,spec}.{ts,tsx}",
      ]),
      browserProject(
        "shared",
        ["app/shared/**/*.{test,spec}.{ts,tsx}"],
        [
          "app/shared/{copy-paste,instance-utils,sync}/**/*.{test,spec}.{ts,tsx}",
        ]
      ),
      browserProject("canvas-dashboard", [
        "app/{canvas,dashboard}/**/*.{test,spec}.{ts,tsx}",
      ]),
      {
        extends: "./vitest.config.ts",
        test: {
          name: "server",
          include: [nodeTestGlob],
          environment: "node",
        },
      },
    ],
  },
});
