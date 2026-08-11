import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import type { BrowserScreenshotOptions } from "./screenshot-browser-cdp";
import { captureVisualEntries, orderForGroupedConcurrency } from "./capture";

const createCapture = (directory: string, id: string) => ({
  id,
  output: path.join(directory, `${id}.png`),
  options: {
    browserPath: "/usr/bin/chromium",
    output: path.join(directory, `${id}.png`),
    width: 1280,
    height: 800,
    url: "http://127.0.0.1",
    waitUntil: "load",
    waitForTimeout: 0,
    timeout: 1000,
  } satisfies BrowserScreenshotOptions,
});

test("orders contiguous stories into the same concurrent browser page", () => {
  expect(orderForGroupedConcurrency([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3)).toEqual(
    [0, 4, 7, 1, 5, 8, 2, 6, 9, 3]
  );
});

test("captures entries independently and preserves individual errors", async () => {
  const assetDirectory = await mkdtemp(path.join(tmpdir(), "visual-capture-"));
  try {
    const result = await captureVisualEntries({
      captures: [
        createCapture(assetDirectory, "success"),
        createCapture(assetDirectory, "failure"),
      ],
      concurrency: 2,
      session: {
        async capturePage(options) {
          if (options.some(({ output }) => output.includes("failure"))) {
            throw new Error("Story failed");
          }
          await Promise.all(
            options.map(({ output }) => writeFile(output, "screenshot"))
          );
          return {};
        },
      },
    });

    expect(result.paths.has("success")).toEqual(true);
    expect(result.paths.has("failure")).toEqual(false);
    expect(result.errors.get("failure") ?? "").toMatch(/Story failed/);
  } finally {
    await rm(assetDirectory, { recursive: true, force: true });
  }
});

test("fails captures that do not produce screenshots", async () => {
  const assetDirectory = await mkdtemp(path.join(tmpdir(), "visual-capture-"));
  try {
    const result = await captureVisualEntries({
      captures: [createCapture(assetDirectory, "missing")],
      concurrency: 1,
      session: {
        async capturePage() {
          return {};
        },
      },
    });

    expect(result.paths.size).toEqual(0);
    expect(result.errors.get("missing") ?? "").toMatch(/ENOENT/);
  } finally {
    await rm(assetDirectory, { recursive: true, force: true });
  }
});
