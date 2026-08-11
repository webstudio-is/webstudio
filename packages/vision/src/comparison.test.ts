import { expect, test } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { compareVisualEntries, getVisualComparisons } from "./comparison";

const createEntry = (id: string) => ({ id, title: id, name: id });

test("classifies common, added, and removed visual entries", () => {
  expect(
    getVisualComparisons({
      baselineEntries: [createEntry("shared"), createEntry("removed")],
      currentEntries: [createEntry("shared"), createEntry("added")],
    })
  ).toEqual([
    {
      baseline: undefined,
      current: createEntry("added"),
      id: "added",
      status: "added",
    },
    {
      baseline: createEntry("removed"),
      current: undefined,
      id: "removed",
      status: "removed",
    },
    {
      baseline: createEntry("shared"),
      current: createEntry("shared"),
      id: "shared",
      status: "comparable",
    },
  ]);
});

test("rejects duplicate visual entry ids", () => {
  expect(() =>
    getVisualComparisons({
      baselineEntries: [createEntry("duplicate"), createEntry("duplicate")],
      currentEntries: [],
    })
  ).toThrowError('Duplicate baseline visual entry id: "duplicate"');
});

test("compares captured entries and preserves capture failures", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "visual-comparison-"));
  try {
    const shared = path.join(directory, "shared.png");
    await writeFile(
      shared,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      )
    );
    const comparisons = await compareVisualEntries({
      baselineEntries: [createEntry("shared"), createEntry("removed")],
      currentEntries: [
        createEntry("shared"),
        createEntry("added"),
        createEntry("failed"),
      ],
      baselinePaths: new Map([
        ["shared", shared],
        ["removed", shared],
      ]),
      currentPaths: new Map([
        ["shared", shared],
        ["added", shared],
      ]),
      baselineErrors: new Map(),
      currentErrors: new Map([["failed", "Story failed"]]),
      artifactDirectory: directory,
      pixelThreshold: 0.1,
      maxMismatchPercentage: 0.001,
      concurrency: 1,
    });

    expect(comparisons.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: "added", status: "added" },
      { id: "failed", status: "error" },
      { id: "removed", status: "removed" },
      { id: "shared", status: "unchanged" },
    ]);
    expect(comparisons[1]?.error).toEqual("Story failed");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
