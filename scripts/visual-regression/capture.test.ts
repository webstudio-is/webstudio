import assert from "node:assert/strict";
import test from "node:test";
import { getInitialCaptureTarget } from "./capture";
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
