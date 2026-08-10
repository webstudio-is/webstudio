import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { BrowserScreenshotOptions } from "@webstudio-is/project-build/vision";
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
  finalizeExpression: `(async () => {
    document.activeElement?.blur();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  })()`,
  timeout: 30_000,
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
  const captures = await Promise.all(
    entries.map(async (entry) => {
      const output = path.join(assetDirectory, entry.id, `${target}.png`);
      await mkdir(path.dirname(output), { recursive: true });
      return {
        entry,
        options: getCaptureOptions({ browserPath, entry, output, port }),
        output,
      };
    })
  );
  const captureBatch = async (batch: typeof captures): Promise<void> => {
    try {
      await session.capturePage(
        batch.map(({ options }) => options),
        { concurrency }
      );
      for (const { entry, output } of batch) {
        paths.set(entry.id, output);
      }
      return;
    } catch (error) {
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
    await Promise.all([
      captureBatch(batch.slice(0, middle)),
      captureBatch(batch.slice(middle)),
    ]);
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
