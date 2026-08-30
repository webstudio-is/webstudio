import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { browserTestPorts } from "../../scripts/vitest-browser-workspace";

const nodeTestGlob = "**/*.{server,node}.{test,spec}.{ts,tsx}";

const browserProject = ({
  name,
  include,
  exclude = [],
  port,
}: {
  name: string;
  include: string[];
  exclude?: string[];
  port: number;
}) => ({
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
      fileParallelism: false,
      api: { port },
      instances: [{ browser: "chromium" as const }],
    },
  },
});

export default defineConfig({
  optimizeDeps: {
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
    workspace: [
      browserProject({
        name: "builder-settings",
        include: [
          "app/builder/features/{settings-panel,style-panel}/**/*.{test,spec}.{ts,tsx}",
        ],
        port: browserTestPorts.builderSettings,
      }),
      browserProject({
        name: "builder-features",
        include: ["app/builder/features/**/*.{test,spec}.{ts,tsx}"],
        exclude: [
          "app/builder/features/{settings-panel,style-panel}/**/*.{test,spec}.{ts,tsx}",
        ],
        port: browserTestPorts.builderFeatures,
      }),
      browserProject({
        name: "builder-shared",
        include: [
          "app/builder/shared/**/*.{test,spec}.{ts,tsx}",
          "app/builder/*.{test,spec}.{ts,tsx}",
        ],
        port: browserTestPorts.builderShared,
      }),
      browserProject({
        name: "shared-heavy",
        include: [
          "app/shared/{copy-paste,instance-utils,sync}/**/*.{test,spec}.{ts,tsx}",
        ],
        port: browserTestPorts.builderSharedHeavy,
      }),
      browserProject({
        name: "shared",
        include: ["app/shared/**/*.{test,spec}.{ts,tsx}"],
        exclude: [
          "app/shared/{copy-paste,instance-utils,sync}/**/*.{test,spec}.{ts,tsx}",
        ],
        port: browserTestPorts.builderSharedGeneral,
      }),
      browserProject({
        name: "canvas-dashboard",
        include: ["app/{canvas,dashboard}/**/*.{test,spec}.{ts,tsx}"],
        port: browserTestPorts.builderCanvasDashboard,
      }),
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
