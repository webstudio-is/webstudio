import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import type { BrowserScreenshotOptions } from "@webstudio-is/project-build/vision";
import type { VisualStoryEntry } from "./manifest";

const viewport = { width: 1280, height: 800 };

export const orderForGroupedConcurrency = <Value>(
  values: readonly Value[],
  concurrency: number
) => {
  // The browser session assigns options to pages round-robin. Interleave
  // contiguous groups so related stories share one page and its module cache.
  const groupCount = Math.min(concurrency, values.length);
  if (groupCount < 2) {
    return [...values];
  }
  const minimumGroupSize = Math.floor(values.length / groupCount);
  const maximumGroupSize = Math.ceil(values.length / groupCount);
  const largerGroupCount = values.length % groupCount;
  let start = 0;
  const groups = Array.from({ length: groupCount }, (_, index) => {
    const size = minimumGroupSize + (index < largerGroupCount ? 1 : 0);
    const group = values.slice(start, start + size);
    start += size;
    return group;
  });
  const ordered: Value[] = [];
  for (let index = 0; index < maximumGroupSize; index += 1) {
    for (const group of groups) {
      const value = group[index];
      if (value !== undefined) {
        ordered.push(value);
      }
    }
  }
  return ordered;
};

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
  session: {
    capturePage: (
      options: readonly BrowserScreenshotOptions[],
      sessionOptions: { concurrency: number }
    ) => Promise<unknown>;
  };
}) => {
  const paths = new Map<string, string>();
  const errors = new Map<string, string>();
  const captures = orderForGroupedConcurrency(
    await Promise.all(
      entries.map(async (entry) => {
        const output = path.join(assetDirectory, entry.id, `${target}.png`);
        await mkdir(path.dirname(output), { recursive: true });
        return {
          entry,
          options: getCaptureOptions({ browserPath, entry, output, port }),
          output,
        };
      })
    ),
    concurrency
  );
  const captureBatch = async (batch: typeof captures): Promise<void> => {
    try {
      await session.capturePage(
        batch.map(({ options }) => options),
        { concurrency }
      );
      await Promise.all(batch.map(({ output }) => access(output)));
      for (const { entry, output } of batch) {
        paths.set(entry.id, output);
      }
      return;
    } catch (error) {
      console.warn(
        `Visual capture failed for ${batch.length} stories; isolating the failure.`,
        error
      );
      if (batch.length === 1) {
        const capture = batch[0];
        if (capture !== undefined) {
          errors.set(
            capture.entry.id,
            error instanceof Error
              ? (error.stack ?? error.message)
              : String(error)
          );
        }
        return;
      }
    }
    const middle = Math.ceil(batch.length / 2);
    await captureBatch(batch.slice(0, middle));
    await captureBatch(batch.slice(middle));
  };
  await captureBatch(captures);
  return { paths, errors };
};

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
