import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { getScreenshotRuntimeHash } from "./runtime-hash";

const writeRuntimeFixture = async (root: string) => {
  const files = {
    ".storybook/preview.tsx": "export default {};",
    ".storybook/story-settings.ts": "export const settings = {};",
    ".storybook/story-sources.json": "[]",
    "packages/vision/src/capture.ts": "export const capture = true;",
    "scripts/visual-regression/capture.ts": "export const capture = true;",
    "pnpm-lock.yaml": "lockfileVersion: '9.0'",
  };
  await Promise.all(
    Object.entries(files).map(async ([file, contents]) => {
      const absolutePath = path.join(root, file);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, contents);
    })
  );
};

test("hashes the complete screenshot runtime without a file manifest", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "visual-runtime-hash-"));
  try {
    await writeRuntimeFixture(root);
    const initial = await getScreenshotRuntimeHash({
      root,
      browserVersion: "Chromium 1",
    });

    await writeFile(
      path.join(root, "scripts/visual-regression/new-runtime-module.ts"),
      "export const runtime = true;"
    );
    const runtimeChanged = await getScreenshotRuntimeHash({
      root,
      browserVersion: "Chromium 1",
    });
    assert.notEqual(runtimeChanged, initial);

    await writeFile(
      path.join(root, "packages/vision/src/new-capture-module.ts"),
      "export const capture = true;"
    );
    const visionChanged = await getScreenshotRuntimeHash({
      root,
      browserVersion: "Chromium 1",
    });
    assert.notEqual(visionChanged, runtimeChanged);

    await writeFile(
      path.join(root, "scripts/visual-regression/runtime.test.ts"),
      "throw new Error('test only');"
    );
    await writeFile(
      path.join(root, "scripts/visual-regression/README.md"),
      "Documentation only."
    );
    await writeFile(path.join(root, "unrelated.ts"), "export const value = 1;");
    const unrelatedChanged = await getScreenshotRuntimeHash({
      root,
      browserVersion: "Chromium 1",
    });
    assert.equal(unrelatedChanged, visionChanged);

    const browserChanged = await getScreenshotRuntimeHash({
      root,
      browserVersion: "Chromium 2",
    });
    assert.notEqual(browserChanged, unrelatedChanged);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
