import path from "node:path";
import type { BrowserScreenshotOptions } from "@webstudio-is/vision/browser";
import {
  captureVisualEntries,
  type VisualCaptureSession,
} from "@webstudio-is/vision/capture";
import { visualRegressionConfig } from "./config";
import type { VisualStoryEntry } from "./manifest";

const onBatchFailure = (error: unknown, count: number) => {
  console.warn(
    `Visual capture failed for ${count} stories; isolating the failure.`,
    error
  );
};

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
  waitForTimeout: visualRegressionConfig.capture.settleTime,
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
    onBatchFailure,
  });

export const captureStoryPairs = async ({
  assetDirectory,
  browserPath,
  pairs,
  baselinePort,
  currentPort,
  session,
}: {
  assetDirectory: string;
  browserPath: string;
  pairs: readonly {
    baseline: VisualStoryEntry;
    current: VisualStoryEntry;
  }[];
  baselinePort: number;
  currentPort: number;
  session: VisualCaptureSession | undefined;
}) => {
  const targets = new Map<
    string,
    { id: string; target: "baseline" | "current" }
  >();
  const captures = pairs.flatMap(({ baseline, current }) =>
    [
      { entry: current, port: currentPort, target: "current" as const },
      { entry: baseline, port: baselinePort, target: "baseline" as const },
    ].map(({ entry, port, target }) => {
      const captureId = `${target}:${entry.id}`;
      const output = path.join(assetDirectory, entry.id, `${target}.png`);
      targets.set(captureId, { id: entry.id, target });
      return {
        id: captureId,
        options: getStoryCaptureOptions({ browserPath, entry, output, port }),
      };
    })
  );
  const result = await captureVisualEntries({
    captures,
    concurrency: 1,
    session,
    onBatchFailure,
  });
  const capturesByTarget = {
    baseline: {
      paths: new Map<string, string>(),
      errors: new Map<string, string>(),
    },
    current: {
      paths: new Map<string, string>(),
      errors: new Map<string, string>(),
    },
  };
  for (const [captureId, { id, target }] of targets) {
    const capture = capturesByTarget[target];
    const capturePath = result.paths.get(captureId);
    if (capturePath !== undefined) {
      capture.paths.set(id, capturePath);
    }
    const error = result.errors.get(captureId);
    if (error !== undefined) {
      capture.errors.set(id, error);
    }
  }
  return capturesByTarget;
};
