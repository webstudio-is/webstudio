import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  restoreScreenshotCache,
  writeScreenshotCache,
} from "./screenshot-cache";

test("reuses screenshots only when the requested cache is complete", async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "visual-screenshot-cache-")
  );
  try {
    const source = path.join(temporaryDirectory, "source.png");
    const cache = path.join(temporaryDirectory, "cache");
    const assets = path.join(temporaryDirectory, "assets");
    await writeFile(source, "screenshot");
    await writeScreenshotCache({
      directory: cache,
      paths: new Map([["button--default", source]]),
    });

    assert.equal(
      await readFile(path.join(cache, "button--default.png"), "utf8"),
      "screenshot"
    );
    const restoredPath = path.join(assets, "button--default", "baseline.png");
    assert.deepEqual(
      await restoreScreenshotCache({
        assetDirectory: assets,
        directory: cache,
        storyIds: ["button--default"],
      }),
      new Map([["button--default", restoredPath]])
    );
    assert.equal(await readFile(restoredPath, "utf8"), "screenshot");
    assert.equal(
      await restoreScreenshotCache({
        assetDirectory: assets,
        directory: cache,
        storyIds: ["button--default", "button--secondary"],
      }),
      undefined
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
