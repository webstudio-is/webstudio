import path from "node:path";
import type { BrowserScreenshotOptions } from "@webstudio-is/vision/browser";
import {
  captureVisualEntries,
  type VisualCaptureSession,
} from "@webstudio-is/vision/capture";
import type { VisualStoryEntry } from "./manifest";

const viewport = { width: 1280, height: 800 };

const getCaptureOptions = ({
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
  ...viewport,
  fullPage: true,
  includeElementGeometry: false,
  url: new URL("/__visual/", `http://127.0.0.1:${port}`).href,
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
  timeout: 90_000,
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
        options: getCaptureOptions({ browserPath, entry, output, port }),
        output,
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

export const createCaptureSessionOptions = ({
  browserPath,
  entry,
  output,
  port,
}: {
  browserPath: string;
  entry: VisualStoryEntry;
  output: string;
  port: number;
}) => getCaptureOptions({ browserPath, entry, output, port });
