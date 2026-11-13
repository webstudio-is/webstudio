import assert from "node:assert/strict";
import test from "node:test";
import {
  formatVisualRegressionDiagnostics,
  getIsolatedVerificationServers,
  getStoryPairs,
} from "./run-utils";

const createEntry = (id: string) => ({ id, file: `${id}.stories.tsx` });

test("pairs only the requested story ids when manifest sizes differ", () => {
  const shared = createEntry("shared");
  assert.deepEqual(
    getStoryPairs({
      ids: ["shared"],
      baselineEntries: {
        removed: createEntry("removed"),
        shared,
      },
      currentEntries: {
        added: createEntry("added"),
        shared,
      },
    }),
    [{ baseline: shared, current: shared }]
  );
});

test("rejects a requested story without the same id on both sides", () => {
  assert.throws(
    () =>
      getStoryPairs({
        ids: ["shared"],
        baselineEntries: { shared: createEntry("different") },
        currentEntries: { shared: createEntry("shared") },
      }),
    /baseline manifest entry for shared has id different/
  );
});

test("uses equivalent isolated story bundles when verifying a cached baseline", () => {
  assert.deepEqual(
    getIsolatedVerificationServers({
      repositoryRoot: "/current",
      checkout: "/baseline",
      baselineBundleDirectory: "/baseline-bundle",
      currentBundleDirectory: "/current-bundle",
      baselinePort: 6101,
      currentPort: 6102,
      pairs: [
        {
          baseline: {
            id: "button",
            file: "button.baseline.stories.tsx",
          },
          current: { id: "button", file: "button.current.stories.tsx" },
        },
      ],
    }),
    [
      {
        root: "/baseline",
        port: 6101,
        outputDirectory: "/baseline-bundle",
        storyFiles: ["button.baseline.stories.tsx"],
      },
      {
        root: "/current",
        port: 6102,
        outputDirectory: "/current-bundle",
        storyFiles: ["button.current.stories.tsx"],
      },
    ]
  );
});

test("formats actionable visual differences for CI logs", () => {
  assert.deepEqual(
    formatVisualRegressionDiagnostics({
      baselineLabel: "base-sha",
      currentLabel: "head-sha",
      durationMs: 100,
      errors: [],
      comparisons: [
        {
          id: "design-system-color-picker--color-picker",
          title: "Design system/Color Picker",
          name: "Color Picker",
          file: "packages/design-system/src/components/color-picker.stories.tsx",
          status: "changed",
          differentPixels: 387,
          mismatchPercentage: 0.03779296875,
          regions: [
            {
              bounds: { x: 288, y: 128, width: 1, height: 87 },
              pixelCount: 87,
              averageColor: {
                delta: { r: -33, g: -31, b: -25 },
                dominantChange: {
                  channel: "red",
                  direction: "decrease",
                  magnitude: 33,
                },
              },
            },
          ],
          warnings: ["ocr_unavailable"],
          baselinePath: "assets/color-picker/baseline.png",
          currentPath: "assets/color-picker/current.png",
          diffPath: "assets/color-picker/diff.png",
        },
      ],
    }),
    [
      "Visual regression diagnostics:",
      "- changed design-system-color-picker--color-picker (Design system/Color Picker / Color Picker) file=packages/design-system/src/components/color-picker.stories.tsx: 387 pixels, 0.0378% mismatch",
      "  regions: x=288 y=128 width=1 height=87 pixels=87",
      "  warnings: ocr_unavailable",
      "  artifacts: baseline=assets/color-picker/baseline.png current=assets/color-picker/current.png diff=assets/color-picker/diff.png",
    ]
  );
});
