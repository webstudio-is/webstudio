import path from "node:path";
import { defineConfig } from "@playwright/test";

const baselineDirectory = process.env.VISUAL_BASELINE_STORYBOOK_DIRECTORY;
const currentDirectory = process.env.VISUAL_CURRENT_STORYBOOK_DIRECTORY;

if (baselineDirectory === undefined || currentDirectory === undefined) {
  throw new Error(
    "VISUAL_BASELINE_STORYBOOK_DIRECTORY and VISUAL_CURRENT_STORYBOOK_DIRECTORY are required"
  );
}

const outputRoot = path.resolve(".visual-regression");

export default defineConfig({
  testDir: ".",
  testMatch: "stories.spec.ts",
  outputDir: path.join(outputRoot, "test-results"),
  snapshotPathTemplate: path.join(outputRoot, "expected", "{arg}{ext}"),
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 0,
      scale: "css",
      threshold: 0.1,
    },
  },
  reporter: [
    ["line"],
    ["html", { outputFolder: path.join(outputRoot, "report"), open: "never" }],
    ["json", { outputFile: path.join(outputRoot, "results.json") }],
  ],
  use: {
    colorScheme: "light",
    deviceScaleFactor: 1,
    locale: "en-US",
    serviceWorkers: "block",
    timezoneId: "UTC",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
  },
  webServer: [
    {
      command: "pnpm exec tsx scripts/visual-regression/serve.ts",
      env: {
        ...process.env,
        VISUAL_STORYBOOK_DIRECTORY: baselineDirectory,
        VISUAL_STORYBOOK_PORT: "6101",
      },
      url: "http://127.0.0.1:6101/index.json",
      reuseExistingServer: false,
    },
    {
      command: "pnpm exec tsx scripts/visual-regression/serve.ts",
      env: {
        ...process.env,
        VISUAL_STORYBOOK_DIRECTORY: currentDirectory,
        VISUAL_STORYBOOK_PORT: "6102",
      },
      url: "http://127.0.0.1:6102/index.json",
      reuseExistingServer: false,
    },
  ],
});
