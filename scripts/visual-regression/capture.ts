import path from "node:path";
import type { BrowserScreenshotOptions } from "@webstudio-is/vision/browser";
import {
  captureVisualEntries,
  type VisualCaptureSession,
} from "@webstudio-is/vision/capture";
import { visualRegressionConfig } from "./config";
import type { VisualStoryEntry } from "./manifest";

export const getInitialCaptureTarget = ({
  baselineEntries,
  currentEntries,
  hasCachedBaseline,
}: {
  baselineEntries: readonly VisualStoryEntry[];
  currentEntries: readonly VisualStoryEntry[];
  hasCachedBaseline: boolean;
}) => {
  const currentEntry = currentEntries[0];
  if (currentEntry !== undefined) {
    return { entry: currentEntry, target: "current" as const };
  }
  const baselineEntry = baselineEntries[0];
  if (hasCachedBaseline === false && baselineEntry !== undefined) {
    return { entry: baselineEntry, target: "baseline" as const };
  }
};

export const getStoryCaptureOptions = ({
  browserPath,
  entry,
  output,
  port,
}: {
  browserPath: string;
  entry: VisualStoryEntry;
  output: string;
  port: number;
}): BrowserScreenshotOptions => ({
  browserPath,
  output,
  ...visualRegressionConfig.capture.viewport,
  fullPage: true,
  includeElementGeometry: false,
  url: new URL("/", `http://127.0.0.1:${port}`).href,
  uid: process.getuid?.(),
  disableSandbox: process.env.GITHUB_ACTIONS === "true",
  waitUntil: "load",
  prepareExpression: `window.renderVisualStory(${JSON.stringify({
    file: entry.file,
    exportName: entry.exportName,
    title: entry.title,
  })}).catch(window.showVisualError)`,
  waitForSelector: "#visual-ready, #visual-error",
  failForSelector: "#visual-error",
  waitForTimeout: 0,
  finalizeExpression: "window.finishVisualStory()",
  timeout: visualRegressionConfig.capture.timeout,
  format: "png",
  scale: 1,
});

export const captureStories = async ({
  assetDirectory,
  browserPath,
  concurrency,
  entries,
  port,
  target,
  session,
}: {
  assetDirectory: string;
  browserPath: string;
  concurrency: number;
  entries: readonly VisualStoryEntry[];
  port: number;
  target: "baseline" | "current";
  session: VisualCaptureSession | undefined;
}) =>
  captureVisualEntries({
    captures: entries.map((entry) => {
      const output = path.join(assetDirectory, entry.id, `${target}.png`);
      return {
        id: entry.id,
        options: getStoryCaptureOptions({ browserPath, entry, output, port }),
      };
    }),
    concurrency,
    session,
    onBatchFailure(error, count) {
      console.warn(
        `Visual capture failed for ${count} stories; isolating the failure.`,
        error
      );
    },
  });
