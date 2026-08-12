import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { hasPrivateStorySources } from "../../.storybook/story-settings";

test("detects private story sources relative to the repository root", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "visual-private-sources-"));
  const privateSources = path.join(
    root,
    "packages/sdk-components-animation/private-src"
  );
  try {
    assert.equal(hasPrivateStorySources(root), false);
    await mkdir(privateSources, { recursive: true });
    await writeFile(path.join(privateSources, "README.md"), "private");
    assert.equal(hasPrivateStorySources(root), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
