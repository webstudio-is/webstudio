import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  captureStoryPairs,
  getInitialCaptureTarget,
  getStoryCaptureOptions,
} from "./capture";
import type { VisualStoryEntry } from "./manifest";

const createEntry = (id: string): VisualStoryEntry => ({
  id,
  title: id,
  name: id,
  exportName: id,
  file: `${id}.stories.tsx`,
  titlePrefix: "Tests",
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

test("waits for asynchronous canvas paints before capturing", () => {
  assert.equal(
    getStoryCaptureOptions({
      browserPath: "/browser",
      entry: createEntry("canvas"),
      output: "/canvas.png",
      port: 6101,
    }).waitForTimeout,
    250
  );
});

test("recaptures baseline and current stories on the same browser page", async () => {
  const assetDirectory = await mkdtemp(path.join(tmpdir(), "visual-pairs-"));
  const calls: string[][] = [];
  try {
    const result = await captureStoryPairs({
      assetDirectory,
      browserPath: "/browser",
      pairs: [
        {
          baseline: createEntry("button"),
          current: createEntry("button"),
        },
      ],
      baselinePort: 6101,
      currentPort: 6102,
      session: {
        async capturePage(options, { concurrency }) {
          assert.equal(concurrency, 1);
          calls.push(options.map(({ url }) => url));
          await Promise.all(
            options.map(({ output }) => writeFile(output, "screenshot"))
          );
        },
      },
    });

    assert.deepEqual(calls, [
      ["http://127.0.0.1:6102/", "http://127.0.0.1:6101/"],
    ]);
    assert.equal(result.current.paths.has("button"), true);
    assert.equal(result.baseline.paths.has("button"), true);
  } finally {
    await rm(assetDirectory, { recursive: true, force: true });
  }
});
