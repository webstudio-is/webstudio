import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
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

    expect(
      await readFile(path.join(cache, "button--default.png"), "utf8")
    ).toEqual("screenshot");
    const restoredPath = path.join(assets, "button--default", "baseline.png");
    expect(
      await restoreScreenshotCache({
        directory: cache,
        ids: ["button--default"],
        getOutputPath: (id) => path.join(assets, id, "baseline.png"),
      })
    ).toEqual(new Map([["button--default", restoredPath]]));
    expect(await readFile(restoredPath, "utf8")).toEqual("screenshot");
    expect(
      await restoreScreenshotCache({
        directory: cache,
        ids: ["button--default", "button--secondary"],
        getOutputPath: (id) => path.join(assets, id, "baseline.png"),
      })
    ).toBeUndefined();
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
