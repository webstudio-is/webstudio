import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { captureStories } from "./capture";
import type { VisualStoryEntry } from "./manifest";

const createEntry = (id: string): VisualStoryEntry => ({
  id,
  title: "Button",
  name: id,
  exportName: id,
  file: "button.stories.tsx",
  titlePrefix: "Design system",
});

test("captures stories independently and preserves individual errors", async () => {
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
