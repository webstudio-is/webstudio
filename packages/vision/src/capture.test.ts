import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import type { BrowserScreenshotOptions } from "./screenshot-browser-cdp";
import { captureVisualEntries, orderForGroupedConcurrency } from "./capture";

const createCapture = (directory: string, id: string) => ({
  id,
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

test("rejects invalid capture concurrency", () => {
  expect(() => orderForGroupedConcurrency([0, 1], 0)).toThrow(
    "Capture concurrency must be a positive integer."
  );
  expect(() => orderForGroupedConcurrency([0, 1], 1.5)).toThrow(
    "Capture concurrency must be a positive integer."
  );
});

test("rejects duplicate capture identifiers", async () => {
  const assetDirectory = await mkdtemp(path.join(tmpdir(), "visual-capture-"));
  try {
    await expect(
      captureVisualEntries({
        captures: [
          createCapture(assetDirectory, "duplicate"),
          createCapture(assetDirectory, "duplicate"),
        ],
        concurrency: 1,
        session: {
          async capturePage() {
            throw new Error("Browser capture must not start");
          },
        },
      })
    ).rejects.toThrow('Duplicate visual capture id "duplicate".');
  } finally {
    await rm(assetDirectory, { recursive: true, force: true });
  }
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

test("uses the browser output as the only capture output path", async () => {
  const assetDirectory = await mkdtemp(path.join(tmpdir(), "visual-capture-"));
  try {
    const capture = {
      ...createCapture(assetDirectory, "expected"),
      output: path.join(assetDirectory, "stale.png"),
    };
    const result = await captureVisualEntries({
      captures: [capture],
      concurrency: 1,
      session: {
        async capturePage(options) {
          await writeFile(options[0]?.output ?? "", "screenshot");
          return {};
        },
      },
    });

    expect(result.paths).toEqual(
      new Map([["expected", capture.options.output]])
    );
    expect(result.errors.size).toEqual(0);
  } finally {
    await rm(assetDirectory, { recursive: true, force: true });
  }
});
