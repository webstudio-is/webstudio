import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createDiffPool } from "./diff-pool";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

test("compares images in reusable workers", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "visual-diff-pool-"));
  const pool = createDiffPool(2);
  try {
    const baselinePath = path.join(directory, "baseline.png");
    const currentPath = path.join(directory, "current.png");
    await Promise.all([
      writeFile(baselinePath, onePixelPng),
      writeFile(currentPath, onePixelPng),
    ]);
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        pool.run({
          baselinePath,
          currentPath,
          outputDir: directory,
          analyzeText: false,
          writeArtifacts: false,
        })
      )
    );
    assert.deepEqual(
      results.map(({ differentPixels }) => differentPixels),
      [0, 0, 0, 0]
    );
  } finally {
    await pool.close();
    await rm(directory, { recursive: true, force: true });
  }
});
