import assert from "node:assert/strict";
import test from "node:test";
import {
  VISUAL_DIFFERENCE_MARKER,
  classifyVisualTestRun,
  getStoryComparisons,
} from "./shared";

test("classifies common, added, and removed stories", () => {
  const comparisons = getStoryComparisons({
    baselineEntries: {
      shared: { id: "shared", title: "Shared", name: "Shared" },
      removed: { id: "removed", title: "Removed", name: "Removed" },
    },
    currentEntries: {
      shared: { id: "shared", title: "Shared", name: "Shared" },
      added: { id: "added", title: "Added", name: "Added" },
    },
  });

  assert.deepEqual(comparisons, [
    {
      baseline: undefined,
      current: { id: "added", title: "Added", name: "Added" },
      id: "added",
      status: "added",
    },
    {
      baseline: { id: "removed", title: "Removed", name: "Removed" },
      current: undefined,
      id: "removed",
      status: "removed",
    },
    {
      baseline: { id: "shared", title: "Shared", name: "Shared" },
      current: { id: "shared", title: "Shared", name: "Shared" },
      id: "shared",
      status: "comparable",
    },
  ]);
});

test("allows approval only when every failure is a visual difference", () => {
  const visualFailure = {
    suites: [
      {
        specs: [
          {
            tests: [
              {
                results: [
                  {
                    status: "failed",
                    errors: [
                      {
                        message: `${VISUAL_DIFFERENCE_MARKER}: button changed`,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  assert.equal(
    classifyVisualTestRun({ report: visualFailure, approved: false }),
    "visual-differences"
  );
  assert.equal(
    classifyVisualTestRun({ report: visualFailure, approved: true }),
    "approved"
  );

  const infrastructureFailure = structuredClone(visualFailure);
  infrastructureFailure.suites[0].specs[0].tests[0].results[0].errors = [
    { message: "Browser crashed" },
  ];

  assert.equal(
    classifyVisualTestRun({ report: infrastructureFailure, approved: true }),
    "test-failure"
  );
});

test("passes when the report contains no failed tests", () => {
  assert.equal(
    classifyVisualTestRun({ report: { suites: [] }, approved: false }),
    "passed"
  );
});

test("fails when Playwright reports an infrastructure error", () => {
  assert.equal(
    classifyVisualTestRun({
      report: {
        errors: [{ message: "Timed out waiting for the Storybook server" }],
        suites: [],
      },
      approved: true,
    }),
    "test-failure"
  );
});
