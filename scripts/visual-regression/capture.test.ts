import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  captureStories,
  getInitialCaptureTarget,
  orderForGroupedConcurrency,
} from "./capture";
import type { VisualStoryEntry } from "./manifest";

const createEntry = (id: string): VisualStoryEntry => ({
  id,
  title: "Button",
  name: id,
  exportName: id,
  file: "button.stories.tsx",
  titlePrefix: "Design system",
});

test("orders contiguous stories into the same concurrent browser page", () => {
  assert.deepEqual(
    orderForGroupedConcurrency([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3),
    [0, 4, 7, 1, 5, 8, 2, 6, 9, 3]
  );
});

test("does not initialize a browser for cached removed stories", () => {
  assert.equal(
    getInitialCaptureTarget({
      baselineEntries: [createEntry("removed")],
      currentEntries: [],
      hasCachedBaseline: true,
    }),
    undefined
  );
});

test("captures stories independently and preserves individual errors", async (context) => {
  context.mock.method(console, "warn", () => {});
  const assetDirectory = await mkdtemp(path.join(tmpdir(), "visual-capture-"));
  try {
    const result = await captureStories({
      assetDirectory,
      browserPath: "/usr/bin/chromium",
      concurrency: 2,
      entries: [createEntry("success"), createEntry("failure")],
      port: 6101,
      target: "baseline",
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

    assert.equal(result.paths.has("success"), true);
    assert.equal(result.paths.has("failure"), false);
    assert.match(result.errors.get("failure") ?? "", /Story failed/);
  } finally {
    await rm(assetDirectory, { recursive: true, force: true });
  }
});

test("fails captures that do not produce screenshots", async (context) => {
  context.mock.method(console, "warn", () => {});
  const assetDirectory = await mkdtemp(path.join(tmpdir(), "visual-capture-"));
  try {
    const result = await captureStories({
      assetDirectory,
      browserPath: "/usr/bin/chromium",
      concurrency: 1,
      entries: [createEntry("missing")],
      port: 6101,
      target: "baseline",
      session: {
        async capturePage() {
          return {};
        },
      },
    });

    assert.equal(result.paths.size, 0);
    assert.match(result.errors.get("missing") ?? "", /ENOENT/);
  } finally {
    await rm(assetDirectory, { recursive: true, force: true });
  }
});
