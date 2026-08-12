import { expect, test } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { compareVisualEntries, getVisualComparisons } from "./comparison";
import { createPng, writePng } from "./screenshot.test-utils";

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

test("rejects invalid comparison concurrency without image differences", async () => {
  await expect(
    compareVisualEntries({
      baselineEntries: [],
      currentEntries: [],
      baselinePaths: new Map(),
      currentPaths: new Map(),
      baselineErrors: new Map(),
      currentErrors: new Map(),
      artifactDirectory: "/unused",
      pixelThreshold: 0.1,
      maxMismatchPercentage: 0,
      concurrency: 0,
    })
  ).rejects.toThrow("Visual comparison concurrency must be a positive integer");
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

test("keeps diff artifacts inside the artifact directory", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "visual-comparison-"));
  const artifactDirectory = path.join(directory, "artifacts");
  try {
    const baselinePath = path.join(directory, "baseline.png");
    const currentPath = path.join(directory, "current.png");
    await Promise.all([
      writePng(baselinePath, createPng(10, 10, { r: 0, g: 0, b: 0 })),
      writePng(currentPath, createPng(10, 10, { r: 255, g: 255, b: 255 })),
    ]);
    const [comparison] = await compareVisualEntries({
      baselineEntries: [createEntry("../outside")],
      currentEntries: [createEntry("../outside")],
      baselinePaths: new Map([["../outside", baselinePath]]),
      currentPaths: new Map([["../outside", currentPath]]),
      baselineErrors: new Map(),
      currentErrors: new Map(),
      artifactDirectory,
      pixelThreshold: 0.1,
      maxMismatchPercentage: 0,
      concurrency: 1,
    });

    const relativeDiffPath = path.relative(
      artifactDirectory,
      comparison?.diffPath ?? ""
    );
    expect(relativeDiffPath.startsWith(`..${path.sep}`)).toBe(false);
    expect(path.isAbsolute(relativeDiffPath)).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
