import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readStoryManifest, readStorySources } from "./manifest";
import { classifyVisualTestRun } from "./shared";
import type { ScreenshotComparisonReport } from "@webstudio-is/vision/report";

const createReport = (
  status: ScreenshotComparisonReport["comparisons"][number]["status"]
): ScreenshotComparisonReport => ({
  baselineLabel: "base",
  currentLabel: "current",
  durationMs: 100,
  comparisons: [{ id: "button", title: "Button", name: "Primary", status }],
  errors: [],
});

test("allows approval only for visual differences", () => {
  assert.equal(
    classifyVisualTestRun({ report: createReport("changed"), approved: false }),
    "visual-differences"
  );
  assert.equal(
    classifyVisualTestRun({ report: createReport("added"), approved: true }),
    "approved"
  );
  assert.equal(
    classifyVisualTestRun({
      report: createReport("unchanged"),
      approved: false,
    }),
    "passed"
  );
  assert.equal(
    classifyVisualTestRun({ report: createReport("error"), approved: true }),
    "test-failure"
  );
});

test("does not approve infrastructure failures", () => {
  const report = { ...createReport("unchanged"), errors: ["Browser crashed"] };
  assert.equal(
    classifyVisualTestRun({ report, approved: true }),
    "test-failure"
  );
});

test("fails when no stories were compared", () => {
  assert.equal(
    classifyVisualTestRun({
      report: {
        baselineLabel: "base",
        currentLabel: "current",
        durationMs: 100,
        comparisons: [],
        errors: [],
      },
      approved: false,
    }),
    "test-failure"
  );
});

test("indexes portable CSF stories with Storybook-compatible ids", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "visual-manifest-"));
  const file = path.join(root, "apps/builder/example.stories.tsx");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    `export default { title: "Controls/Button" };
export const Primary = () => null;
export const WithIcon = { render: () => null, name: "With icon" };
`
  );
  try {
    const manifest = await readStoryManifest({
      root,
      storySources: [
        {
          directory: "../apps/builder",
          files: "**/*.stories.tsx",
          titlePrefix: "Builder",
        },
      ],
    });
    assert.deepEqual(Object.keys(manifest), [
      "builder-controls-button--primary",
      "builder-controls-button--with-icon",
    ]);
    assert.equal(
      manifest["builder-controls-button--primary"]?.exportName,
      "Primary"
    );
    assert.equal(
      manifest["builder-controls-button--with-icon"]?.name,
      "With icon"
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reads story source configuration from each revision", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "visual-sources-"));
  const baseline = path.join(root, "baseline");
  const current = path.join(root, "current");
  await Promise.all(
    [
      [baseline, "Baseline"],
      [current, "Current"],
    ].map(async ([directory, titlePrefix]) => {
      const storybook = path.join(directory, ".storybook");
      await mkdir(storybook, { recursive: true });
      await writeFile(
        path.join(storybook, "story-sources.json"),
        JSON.stringify([
          {
            directory: "../stories",
            files: "**/*.stories.tsx",
            titlePrefix,
          },
        ])
      );
    })
  );
  try {
    const [baselineSources, currentSources] = await Promise.all([
      readStorySources(baseline),
      readStorySources(current),
    ]);
    assert.equal(baselineSources?.[0]?.titlePrefix, "Baseline");
    assert.equal(currentSources?.[0]?.titlePrefix, "Current");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
